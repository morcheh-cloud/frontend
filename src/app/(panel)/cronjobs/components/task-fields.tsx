"use client"

import { useQuery } from "@tanstack/react-query"
import { Info, Plus, TriangleAlert } from "lucide-react"
import Link from "next/link"

import { usePlaybooks, usePreview } from "@/app/(panel)/ansible/api"
import {
  emptyPick,
  HostPreview,
  type Picked,
  pickedCount,
  TargetPicker,
  toSelection,
} from "@/app/(panel)/ansible/components/run-layer"
import { backupKeys } from "@/app/(panel)/databases/api"
import { useDatabaseCan } from "@/app/(panel)/databases/components/permissions"
import { useScripts } from "@/app/(panel)/scripts/api"
import { CodeEditor } from "@/app/(panel)/scripts/components/code-editor"
import {
  type Interpreter,
  interpreterLabels,
  type RunAs,
  runAsHints,
} from "@/app/(panel)/scripts/components/meta"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { ServerChecklist } from "@/app/(panel)/servers/components/server-checklist"
import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import { Field } from "@/components/field"
import { databasesQuery } from "@/components/panel/problems"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import type {
  AnsibleOptions,
  Schedule,
  ScheduleService,
  ScheduleTask,
  Server,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { Callout, FieldError, Section, ToggleRow } from "./editor-parts"
import {
  type Action,
  ActionIcon,
  actionGroups,
  actionMeta,
  refName,
  serviceVerbs,
} from "./meta"

type ServiceAction = ScheduleService["action"]

// Everything the non-copy actions need. Only the job's own action is sent,
// so switching back and forth keeps what was typed.
export type TaskDraft = {
  // Script, service and reboot run on these (id → name).
  servers: Map<string, string>
  scriptKind: "saved" | "command"
  scriptId: string
  // A saved script's parameters.
  values: Record<string, string>
  cmdName: string
  content: string
  interpreter: Interpreter
  runAs: RunAs
  // Minutes; blank = the default 10.
  timeout: string
  // KEY=value lines, for a typed command.
  env: string
  playbookId: string
  picked: Picked
  // Kept as saved, so an edit made here never drops options set elsewhere.
  ansibleOptions: AnsibleOptions
  unit: string
  serviceAction: ServiceAction
  force: boolean
  onlyIfRequired: boolean
  skipIfLoggedIn: boolean
  message: string
  url: string
  fileName: string
  overwrite: boolean
  databaseId: string
  planId: string
}

export const freshTask = (): TaskDraft => ({
  servers: new Map(),
  scriptKind: "saved",
  scriptId: "",
  values: {},
  cmdName: "",
  content: "",
  interpreter: "bash",
  runAs: "user",
  timeout: "",
  env: "",
  playbookId: "",
  picked: emptyPick(),
  ansibleOptions: {},
  unit: "",
  serviceAction: "restart",
  force: false,
  onlyIfRequired: true,
  skipIfLoggedIn: true,
  message: "",
  url: "",
  fileName: "",
  overwrite: true,
  databaseId: "",
  planId: "",
})

export function taskFromSaved(s: Schedule): TaskDraft {
  const t = s.task ?? {}
  const d = freshTask()
  const named = (ids: string[] | undefined) =>
    new Map((ids ?? []).map((id) => [id, refName(s.refs, "server", id)]))
  const sc = t.script
  if (sc) {
    d.servers = named(sc.server_ids)
    if (sc.script_id) {
      d.scriptId = sc.script_id
      d.values = { ...(sc.env ?? {}) }
    } else {
      d.scriptKind = "command"
      d.cmdName = sc.name ?? ""
      d.content = sc.content ?? ""
      d.interpreter = sc.interpreter ?? "bash"
      d.runAs = sc.run_as ?? "user"
      d.timeout = sc.timeout_seconds
        ? String(Math.max(1, Math.round(sc.timeout_seconds / 60)))
        : ""
      d.env = Object.entries(sc.env ?? {})
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    }
  }
  const an = t.ansible
  if (an) {
    d.playbookId = an.playbook_id
    d.ansibleOptions = an.options ?? {}
    const sel = an.selection
    d.picked = {
      all: !!sel.all,
      servers: named(sel.server_ids),
      tags: sel.tags ?? [],
      folders: sel.folder_ids ?? [],
    }
  }
  const sv = t.service
  if (sv) {
    d.servers = named(sv.server_ids)
    d.unit = sv.unit
    d.serviceAction = sv.action
    d.force = !!sv.force
  }
  const rb = t.reboot
  if (rb) {
    d.servers = named(rb.server_ids)
    d.onlyIfRequired = !!rb.only_if_required
    d.skipIfLoggedIn = !!rb.skip_if_logged_in
    d.message = rb.message ?? ""
  }
  const f = t.fetch
  if (f) {
    d.url = f.url
    d.fileName = f.name ?? ""
    d.overwrite = !!f.overwrite
  }
  const v = t.verify
  if (v) {
    d.databaseId = v.database_id
    d.planId = v.plan_id ?? ""
  }
  return d
}

const envKey = /^[A-Za-z_][A-Za-z0-9_]*$/

// KEY=value lines → env, or the first bad line.
function parseEnv(text: string): Record<string, string> | string {
  const env: Record<string, string> = {}
  for (const raw of text.split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    const key = eq > 0 ? line.slice(0, eq).trim() : ""
    if (!envKey.test(key)) return line
    env[key] = line.slice(eq + 1)
  }
  return env
}

const firstLine = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#!"))
    ?.slice(0, 100) ?? ""

// What's sent as `task` for the action (nothing for the copy actions).
export function toTask(action: Action, t: TaskDraft): ScheduleTask | undefined {
  const ids = [...t.servers.keys()]
  switch (action) {
    case "script": {
      if (t.scriptKind === "saved") {
        const env = Object.fromEntries(
          Object.entries(t.values).filter(([, v]) => v !== ""),
        )
        return {
          script: { server_ids: ids, script_id: t.scriptId || undefined, env },
        }
      }
      const env = parseEnv(t.env)
      const minutes = Number(t.timeout)
      return {
        script: {
          server_ids: ids,
          name: t.cmdName.trim() || firstLine(t.content) || "Command",
          content: t.content,
          interpreter: t.interpreter,
          run_as: t.runAs,
          timeout_seconds:
            t.timeout.trim() && minutes > 0 ? Math.round(minutes * 60) : 0,
          env: typeof env === "string" ? {} : env,
        },
      }
    }
    case "ansible":
      return {
        ansible: {
          playbook_id: t.playbookId,
          selection: toSelection(t.picked),
          options: t.ansibleOptions,
        },
      }
    case "service":
      return {
        service: {
          server_ids: ids,
          unit: t.unit.trim(),
          action: t.serviceAction,
          force: t.serviceAction === "stop" && t.force,
        },
      }
    case "reboot":
      return {
        reboot: {
          server_ids: ids,
          only_if_required: t.onlyIfRequired,
          skip_if_logged_in: t.skipIfLoggedIn,
          message: t.message.trim(),
        },
      }
    case "fetch":
      return {
        fetch: {
          url: t.url.trim(),
          name: t.fileName.trim(),
          overwrite: t.overwrite,
        },
      }
    case "verify-backup":
      return {
        verify: {
          database_id: t.databaseId,
          plan_id: t.planId || undefined,
        },
      }
  }
  return undefined
}

export type TaskKey =
  | "servers"
  | "script"
  | "values"
  | "content"
  | "timeout"
  | "env"
  | "playbook"
  | "targets"
  | "unit"
  | "force"
  | "message"
  | "url"
  | "fileName"
  | "database"
  | "plan"

export type TaskErrors = Partial<Record<TaskKey, string>>

const unitRe = /^[A-Za-z0-9@._:\\-]+$/

export function checkTask(
  action: Action,
  t: TaskDraft,
  params: { name: string; label?: string; required?: boolean }[] = [],
): TaskErrors {
  const e: TaskErrors = {}
  const needServers = action === "script" || action === "service"
  if ((needServers || action === "reboot") && t.servers.size === 0) {
    e.servers = "Choose at least one server"
  }
  switch (action) {
    case "script":
      if (t.scriptKind === "saved") {
        if (!t.scriptId) e.script = "Choose a script"
        const missing = params.find(
          (p) => p.required && !t.values[p.name]?.trim(),
        )
        if (missing) e.values = `Fill in ${missing.label || missing.name}`
      } else {
        if (!t.content.trim()) e.content = "Type what to run"
        const m = Number(t.timeout)
        if (t.timeout.trim() && (!Number.isFinite(m) || m <= 0 || m > 1440)) {
          e.timeout = "Minutes, from 1 to 1440"
        }
        const env = parseEnv(t.env)
        if (typeof env === "string") e.env = `Not KEY=value: ${env}`
      }
      break
    case "ansible":
      if (!t.playbookId) e.playbook = "Choose a playbook"
      if (pickedCount(t.picked) === 0) e.targets = "Choose where it runs"
      break
    case "service":
      if (!unitRe.test(t.unit.trim())) e.unit = "Enter a service name"
      break
    case "reboot":
      if (t.servers.size > 50) e.servers = "Up to 50 servers"
      break
    case "fetch":
      if (!/^https?:\/\/[^/\s]/i.test(t.url.trim())) {
        e.url = "Enter a full http:// or https:// address"
      }
      if (/[/\0]/.test(t.fileName) || [".", ".."].includes(t.fileName.trim())) {
        e.fileName = "Just a file name, without /"
      }
      break
    case "verify-backup":
      if (!t.databaseId) e.database = "Choose a database"
      break
  }
  return e
}

// A backend field error under task.* → the field that shows it.
export function taskErrorKey(action: Action, field: string): TaskKey | null {
  if (!field.startsWith("task")) return null
  const rest = field.replace(/^task\.[a-z]+\.?/, "")
  const pairs: [string, TaskKey][] = [
    ["server_ids", "servers"],
    ["selection", "targets"],
    ["playbook_id", "playbook"],
    ["script_id", "script"],
    ["content", "content"],
    ["timeout_seconds", "timeout"],
    ["env", action === "script" ? "values" : "env"],
    ["unit", "unit"],
    ["force", "force"],
    ["message", "message"],
    ["url", "url"],
    ["name", action === "fetch" ? "fileName" : "content"],
    ["database_id", "database"],
    ["plan_id", "plan"],
  ]
  for (const [prefix, key] of pairs) if (rest.startsWith(prefix)) return key
  const whole: Partial<Record<Action, TaskKey>> = {
    script: "script",
    ansible: "targets",
    service: "unit",
    reboot: "servers",
    fetch: "url",
    "verify-backup": "database",
  }
  return whole[action] ?? null
}

// Who the job runs as, in the access it needs for this action.
export const accessText: Record<Action, string> = {
  sync: "Operator on the source, Engineer on every destination",
  archive: "Engineer on the folder's server and on every destination",
  fetch: "Engineer on every server it saves to",
  script: "Engineer on every server",
  ansible: "Owner on every server it runs on",
  service: "Operator on every server (Engineer to stop a protected one)",
  reboot: "Operator on every server",
  "verify-backup": "Operator on the database",
}

// ---- What it does ----

export function ActionPicker({
  value,
  onChange,
  phone,
}: {
  value: Action
  onChange: (a: Action) => void
  phone: boolean
}) {
  return (
    <fieldset className={cn("flex flex-col", phone ? "gap-4" : "gap-5")}>
      <legend className="sr-only">What it does</legend>
      {actionGroups.map((g) => (
        <div key={g.label} className="flex flex-col gap-2">
          <p className="font-label text-caption tracking-label text-ash uppercase">
            {g.label}
          </p>
          <div
            className={cn(
              phone
                ? "flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border"
                : "grid grid-cols-1 gap-2 sm:grid-cols-2",
            )}
          >
            {g.actions.map((a) => (
              <ActionOption
                key={a}
                action={a}
                checked={value === a}
                onChange={onChange}
                phone={phone}
              />
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  )
}

function ActionOption({
  action,
  checked,
  onChange,
  phone,
}: {
  action: Action
  checked: boolean
  onChange: (a: Action) => void
  phone: boolean
}) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center gap-3 px-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        phone
          ? "min-h-16 py-3 has-checked:bg-brand-soft"
          : "min-h-15 rounded-lg border border-border py-2.5 hover:bg-subtle has-checked:border-brand has-checked:bg-brand-soft",
      )}
    >
      <input
        type="radio"
        name="cronjob-action"
        value={action}
        checked={checked}
        onChange={() => onChange(action)}
        className="sr-only"
      />
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-has-checked:bg-background group-has-checked:text-brand-strong">
        <ActionIcon action={action} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium">
          {actionMeta[action].label}
        </span>
        <span className="block truncate text-caption text-muted-foreground">
          {actionMeta[action].short}
        </span>
      </span>
      <span
        aria-hidden
        className="size-4 shrink-0 rounded-full border border-input bg-background transition-[border-width,border-color] group-has-checked:border-[5px] group-has-checked:border-brand"
      />
    </label>
  )
}

type Props = {
  action: Action
  t: TaskDraft
  set: (patch: Partial<TaskDraft>) => void
  errors: TaskErrors
  phone: boolean
  ws: string
}

// The action's own sections of the editor (copy and archive have theirs in
// the editor itself).
export function TaskSections(props: Props) {
  switch (props.action) {
    case "script":
      return <ScriptSections {...props} />
    case "ansible":
      return <AnsibleSections {...props} />
    case "service":
      return <ServiceSections {...props} />
    case "reboot":
      return <RebootSections {...props} />
    case "fetch":
      return <FetchSection {...props} />
    case "verify-backup":
      return <VerifySection {...props} />
  }
  return null
}

function useCanPick(min: Level) {
  const { serverLevel } = useAccess()
  return (s: Pick<Server, "id" | "workspace_id">) =>
    atLeast(serverLevel(s.id, s.workspace_id), min)
}

function ServersSection({
  t,
  set,
  errors,
  phone,
  min,
  hint,
}: Props & { min: Level; hint: string }) {
  const canPick = useCanPick(min)
  return (
    <Section title="Servers" hint={hint} phone={phone}>
      <ServerChecklist
        value={t.servers}
        onChange={(servers) => set({ servers })}
        phone={phone}
        canPick={canPick}
      />
      <FieldError text={errors.servers} />
    </Section>
  )
}

function Choice({
  id,
  value,
  onChange,
  placeholder,
  items,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  items: { value: string; label: string; detail?: string }[]
}) {
  return (
    <Select
      items={[{ value: "", label: placeholder }, ...items]}
      value={value}
      onValueChange={(v) => v !== null && onChange(v)}
    >
      <SelectTrigger id={id} className="h-11 w-full md:h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="truncate">{o.label}</span>
            {o.detail && (
              <span className="ms-auto truncate text-caption text-ash">
                {o.detail}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NoneYet({
  text,
  href,
  label,
}: {
  text: string
  href: string
  label: string
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg bg-subtle p-3 text-body-sm text-muted-foreground">
      {text}
      <Button
        variant="outline"
        size="sm"
        className="max-md:h-11"
        render={<Link href={href} />}
        nativeButton={false}
      >
        <Plus />
        {label}
      </Button>
    </div>
  )
}

// ---- Script ----

function ScriptSections(props: Props) {
  const { t, set, errors, phone, ws } = props
  const scripts = useScripts(ws)
  const chosen = scripts.data?.find((s) => s.id === t.scriptId)
  const params = chosen?.params ?? []

  return (
    <>
      <Section
        title="Script"
        hint="A saved script is read again at each run, so edits to it count. Or type a command just for this job."
        phone={phone}
      >
        <div className="[scrollbar-width:none] overflow-x-auto">
          <Segmented
            label="Script"
            value={t.scriptKind}
            onChange={(scriptKind) => set({ scriptKind })}
            items={[
              { value: "saved", label: "Saved script" },
              { value: "command", label: "Type a command" },
            ]}
          />
        </div>
        {t.scriptKind === "saved" ? (
          scripts.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : scripts.data?.length === 0 ? (
            <NoneYet
              text="This workspace has no saved scripts yet."
              href="/scripts/new"
              label="New script"
            />
          ) : (
            <>
              <Field label="Script" error={errors.script}>
                {(p) => (
                  <Choice
                    id={p.id}
                    value={t.scriptId}
                    onChange={(scriptId) => {
                      const s = scripts.data?.find((x) => x.id === scriptId)
                      const values: Record<string, string> = {}
                      for (const prm of s?.params ?? []) {
                        values[prm.name] =
                          t.values[prm.name] ?? prm.default ?? ""
                      }
                      set({ scriptId, values })
                    }}
                    placeholder="Choose a script"
                    items={(scripts.data ?? []).map((s) => ({
                      value: s.id,
                      label: s.name,
                      detail: `${interpreterLabels[s.interpreter]} · ${s.run_as === "root" ? "root" : "login user"}`,
                    }))}
                  />
                )}
              </Field>
              {params.map((prm) => (
                <Field
                  key={prm.name}
                  label={`${prm.label || prm.name}${prm.required ? "" : " (optional)"}`}
                  hint={
                    <span className="font-mono">
                      ${prm.name}
                      {prm.default ? ` · default ${prm.default}` : ""}
                    </span>
                  }
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={t.values[prm.name] ?? ""}
                      onChange={(e) =>
                        set({
                          values: { ...t.values, [prm.name]: e.target.value },
                        })
                      }
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  )}
                </Field>
              ))}
              <FieldError text={errors.values} />
            </>
          )
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Interpreter"
                value={t.interpreter}
                onChange={(interpreter) => set({ interpreter })}
                items={(["bash", "sh", "python3"] as const).map((v) => ({
                  value: v,
                  label: interpreterLabels[v],
                }))}
              />
              <Segmented
                label="Run as"
                value={t.runAs}
                onChange={(runAs) => set({ runAs })}
                items={[
                  { value: "user", label: "Login user" },
                  { value: "root", label: "root" },
                ]}
              />
            </div>
            <div
              className={cn(
                "h-48 overflow-hidden rounded-lg border border-input",
                errors.content && "border-destructive",
              )}
            >
              <CodeEditor
                value={t.content}
                onChange={(content) => set({ content })}
                interpreter={t.interpreter}
              />
            </div>
            <p
              className={cn(
                "text-caption",
                errors.content ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {errors.content ?? runAsHints[t.runAs]}
            </p>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
              <Field label="Name (optional)" hint="How its runs are listed.">
                {(p) => (
                  <Input
                    {...p}
                    value={t.cmdName}
                    onChange={(e) => set({ cmdName: e.target.value })}
                    maxLength={100}
                    placeholder={firstLine(t.content) || "Command"}
                    className="placeholder:text-ash"
                  />
                )}
              </Field>
              <Field
                label="Time limit"
                hint="Minutes. Blank = 10."
                error={errors.timeout}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1440}
                    value={t.timeout}
                    onChange={(e) => set({ timeout: e.target.value })}
                    placeholder="10"
                    className="tabular-nums placeholder:text-ash"
                  />
                )}
              </Field>
            </div>
            <Field
              label="Variables (optional)"
              hint="One KEY=value per line, set in the command's environment."
              error={errors.env}
            >
              {(p) => (
                <Textarea
                  {...p}
                  value={t.env}
                  onChange={(e) => set({ env: e.target.value })}
                  rows={2}
                  placeholder="SITE=example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="font-mono placeholder:text-ash"
                />
              )}
            </Field>
          </>
        )}
      </Section>
      <ServersSection
        {...props}
        min="engineer"
        hint="It runs on these, 5 at a time, up to 200. Each needs your Engineer access."
      />
    </>
  )
}

// ---- Ansible ----

function AnsibleSections({ t, set, errors, phone, ws }: Props) {
  const playbooks = usePlaybooks(ws)
  const selection = toSelection(t.picked)
  const any = pickedCount(t.picked) > 0
  const preview = usePreview(ws, selection, any)
  const hosts = preview.data ?? []

  return (
    <>
      <Section
        title="Playbook"
        hint="Read again at each run, so edits to it count."
        phone={phone}
      >
        {playbooks.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : playbooks.data?.length === 0 ? (
          <NoneYet
            text="This workspace has no playbooks yet."
            href="/ansible/playbooks/new"
            label="New playbook"
          />
        ) : (
          <Field label="Playbook" error={errors.playbook}>
            {(p) => (
              <Choice
                id={p.id}
                value={t.playbookId}
                onChange={(playbookId) => set({ playbookId })}
                placeholder="Choose a playbook"
                items={(playbooks.data ?? []).map((pb) => ({
                  value: pb.id,
                  label: pb.name,
                }))}
              />
            )}
          </Field>
        )}
        <ToggleRow
          id="cronjob-ansible-check"
          label="Check mode"
          hint="Reports what it would change and changes nothing. Good for spotting drift."
          checked={!!t.ansibleOptions.check}
          onChange={(check) =>
            set({ ansibleOptions: { ...t.ansibleOptions, check } })
          }
        />
      </Section>
      <Section
        title="Servers"
        hint="Tags and folders are read at each run: a server tagged later is included. Every server needs your Owner access."
        phone={phone}
      >
        <TargetPicker
          picked={t.picked}
          onChange={(picked) => set({ picked })}
          phone={phone}
        />
        <FieldError text={errors.targets} />
        <HostPreview
          any={any}
          hosts={hosts}
          loading={preview.isPending && any}
          error={preview.error?.message}
          onLeaveOut={() =>
            set({
              picked: {
                ...emptyPick(),
                servers: new Map(
                  hosts
                    .filter((h) => !h.problem)
                    .map((h) => [h.server_id, h.name]),
                ),
              },
            })
          }
        />
      </Section>
    </>
  )
}

// ---- Service ----

const serviceHints: Record<ServiceAction, string> = {
  start: "Starts it where it's stopped; already running is fine.",
  stop: "Stops it until something starts it again.",
  restart: "Stops and starts it: a short gap in service.",
  reload:
    "Asks it to re-read its settings, without stopping. Not every service can.",
}

function ServiceSections(props: Props) {
  const { t, set, errors, phone } = props
  return (
    <>
      <Section
        title="Service"
        hint="A systemd unit, as on the server's Services tab."
        phone={phone}
      >
        <Field
          label="Service"
          hint="nginx, php8.3-fpm, docker… (.service is added when left out)."
          error={errors.unit}
        >
          {(p) => (
            <Input
              {...p}
              value={t.unit}
              onChange={(e) => set({ unit: e.target.value })}
              placeholder="nginx"
              maxLength={256}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono placeholder:text-ash"
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <div className="[scrollbar-width:none] overflow-x-auto">
            <Segmented
              label="Action"
              value={t.serviceAction}
              onChange={(serviceAction) => set({ serviceAction })}
              items={(["restart", "reload", "start", "stop"] as const).map(
                (v) => ({ value: v, label: serviceVerbs[v] }),
              )}
            />
          </div>
          <p className="text-caption text-muted-foreground">
            {serviceHints[t.serviceAction]}
          </p>
        </div>
        {t.serviceAction === "stop" && (
          <>
            <ToggleRow
              id="cronjob-service-force"
              label="Even if it's protected"
              hint="sshd, dbus, journald… keep the server reachable. Needs Engineer."
              checked={t.force}
              onChange={(force) => set({ force })}
            />
            <FieldError text={errors.force} />
          </>
        )}
      </Section>
      <ServersSection
        {...props}
        min={t.serviceAction === "stop" && t.force ? "engineer" : "operator"}
        hint="A server without this service is marked failed, the others go on."
      />
    </>
  )
}

// ---- Reboot ----

function RebootSections(props: Props) {
  const { t, set, errors, phone } = props
  return (
    <>
      <ServersSection
        {...props}
        min="operator"
        hint="Rebooted one at a time: the next waits until the last is back. Up to 50."
      />
      <Section title="Only when it's safe" phone={phone}>
        <ToggleRow
          id="cronjob-reboot-required"
          label="Only when a reboot is needed"
          hint="After a kernel or library update. The others are skipped."
          checked={t.onlyIfRequired}
          onChange={(onlyIfRequired) => set({ onlyIfRequired })}
        />
        <ToggleRow
          id="cronjob-reboot-logged-in"
          label="Not while someone is logged in"
          hint="A server with an open SSH session is skipped, and tried again next time."
          checked={t.skipIfLoggedIn}
          onChange={(skipIfLoggedIn) => set({ skipIfLoggedIn })}
        />
        <Field
          label="Message (optional)"
          hint="Shown to anyone logged in, just before."
          error={errors.message}
        >
          {(p) => (
            <Input
              {...p}
              value={t.message}
              onChange={(e) => set({ message: e.target.value })}
              maxLength={200}
              placeholder="Scheduled reboot by Morcheh"
              className="placeholder:text-ash"
            />
          )}
        </Field>
        <Callout icon={<TriangleAlert />} tone="warning">
          A server that doesn't come back within 15 minutes fails the run, and
          the servers after it aren't rebooted.
        </Callout>
      </Section>
    </>
  )
}

// ---- Fetch ----

function FetchSection({ t, set, errors, phone }: Props) {
  let fallback = "file name from the address"
  try {
    const last = new URL(t.url.trim()).pathname.split("/").pop()
    if (last) fallback = decodeURIComponent(last)
  } catch {}
  return (
    <Section
      title="Download"
      hint="Each server downloads it itself, so it must reach the address."
      phone={phone}
    >
      <Field label="Address" error={errors.url}>
        {(p) => (
          <Input
            {...p}
            type="url"
            inputMode="url"
            value={t.url}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://example.com/files/list.txt"
            maxLength={4096}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono placeholder:font-sans placeholder:text-ash"
          />
        )}
      </Field>
      <Field
        label="Save as (optional)"
        hint="Blank = the address's file name."
        error={errors.fileName}
      >
        {(p) => (
          <Input
            {...p}
            value={t.fileName}
            onChange={(e) => set({ fileName: e.target.value })}
            placeholder={fallback}
            maxLength={255}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono placeholder:font-sans placeholder:text-ash"
          />
        )}
      </Field>
      <ToggleRow
        id="cronjob-fetch-overwrite"
        label="Replace the file each time"
        hint="Off: a run fails where the file is already there."
        checked={t.overwrite}
        onChange={(overwrite) => set({ overwrite })}
      />
    </Section>
  )
}

// ---- Verify backups ----

function VerifySection({ t, set, errors, phone, ws }: Props) {
  const databases = useQuery(databasesQuery)
  const can = useDatabaseCan()
  const items = (databases.data?.items ?? []).filter(
    (d) => d.workspace_id === ws && can(d, "operator"),
  )
  const plans = useQuery({
    queryKey: backupKeys.plans(t.databaseId),
    queryFn: () => api.databaseBackups.listDatabaseBackupPlans(t.databaseId),
    select: (l) => l.items,
    enabled: !!t.databaseId,
  })
  return (
    <Section
      title="Backups"
      hint="Each copy of the latest backup is read back and its checksum compared, on every storage it's kept on. Nothing is restored."
      phone={phone}
    >
      {databases.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Field label="Database" error={errors.database}>
          {(p) => (
            <Choice
              id={p.id}
              value={t.databaseId}
              onChange={(databaseId) => set({ databaseId, planId: "" })}
              placeholder="Choose a database"
              items={items.map((d) => ({ value: d.id, label: d.name }))}
            />
          )}
        </Field>
      )}
      {t.databaseId && (
        <Field
          label="Plan"
          hint="Each plan's latest backup, or just one plan's."
          error={errors.plan}
        >
          {(p) => (
            <Choice
              id={p.id}
              value={t.planId}
              onChange={(planId) => set({ planId })}
              placeholder="Every plan"
              items={(plans.data ?? []).map((pl) => ({
                value: pl.id,
                label: pl.name,
              }))}
            />
          )}
        </Field>
      )}
      <Callout icon={<Info />}>
        A copy that doesn't read back intact fails the run, and the backup is
        marked on the database's Backups tab.
      </Callout>
    </Section>
  )
}
