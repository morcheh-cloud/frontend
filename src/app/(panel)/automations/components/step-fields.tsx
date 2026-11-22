"use client"

import type { EditorView } from "@uiw/react-codemirror"
import { Info, Lock, Plus, X } from "lucide-react"
import { useRef } from "react"

import { useChannels } from "@/app/(panel)/alerts/api"
import { useCronjobs } from "@/app/(panel)/cronjobs/api"
import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Choice, NoneYet } from "@/app/(panel)/cronjobs/components/task-fields"
import { useScripts } from "@/app/(panel)/scripts/api"
import { CodeEditor } from "@/app/(panel)/scripts/components/code-editor"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { ServerChecklist } from "@/app/(panel)/servers/components/server-checklist"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { type Errors, newHeader, type StepDraft, stepErr } from "./draft"
import type { TriggerKind } from "./meta"
import {
  EnvChips,
  TemplateInput,
  TemplateTextarea,
  VarChips,
} from "./var-chips"

export type StepProps = {
  s: StepDraft
  set: (patch: Partial<StepDraft>) => void
  errors: Errors
  ws: string
  trigger: TriggerKind
  phone: boolean
  // Server names known so far (pickers add to it).
  names: Map<string, string>
  onNames: (names: Map<string, string>) => void
}

const err = (p: StepProps, field: string) => p.errors[stepErr(p.s.key, field)]

export function StepFields(p: StepProps) {
  switch (p.s.kind) {
    case "notify":
      return <NotifyFields {...p} />
    case "webhook":
      return <WebhookFields {...p} />
    case "script":
      return <ScriptFields {...p} />
    case "service":
      return <ServiceFields {...p} />
    case "check":
      return (
        <>
          <WhereField {...p} />
          <p className="text-caption text-muted-foreground">
            On a monitor's event (Monitor down…), it checks that monitor instead
            of a server.
          </p>
        </>
      )
    case "cronjob":
      return <CronjobFields {...p} />
    case "wait":
      return <WaitFields {...p} />
  }
  return null
}

// ---- notify ----

function NotifyFields(p: StepProps) {
  const { s, set } = p
  const channels = useChannels(p.ws)
  const items = channels.data ?? []
  const on = new Set(s.channelIds)
  const toggle = (id: string, add: boolean) =>
    set({
      channelIds: items
        .map((c) => c.id)
        .filter((x) => (x === id ? add : on.has(x))),
    })
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="text-body-sm font-medium">Send to</p>
        {channels.isPending ? (
          <p className="text-caption text-ash">Loading channels…</p>
        ) : items.length === 0 ? (
          <NoneYet
            text="This workspace has no alert channels yet (email, Telegram, Slack…)."
            href="/alerts/channels/new"
            label="Add a channel"
          />
        ) : (
          <ul
            className={cn(
              "grid gap-2 sm:grid-cols-2",
              err(p, "channel_ids") && "rounded-xl ring-2 ring-destructive/30",
            )}
          >
            {items.map((c) => (
              <li key={c.id}>
                {/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox is a Base UI button inside */}
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2 hover:bg-subtle has-[[data-checked]]:border-brand/40 has-[[data-checked]]:bg-brand-soft/40 md:min-h-11">
                  <Checkbox
                    checked={on.has(c.id)}
                    onCheckedChange={(v) => toggle(c.id, !!v)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium">
                      {c.name}
                    </span>
                    <span className="block truncate text-caption text-ash">
                      {c.kind}
                      {c.is_default && " · default"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <FieldError text={err(p, "channel_ids")} />
      </div>
      <Field label="Title" hint="Blank = the event's title.">
        {(f) => (
          <TemplateInput
            {...f}
            id={`${s.key}-title`}
            value={s.title}
            onChange={(title) => set({ title })}
            placeholder="{{event.title}}"
          />
        )}
      </Field>
      <Field label="Message" hint="Blank = the event's text.">
        {(f) => (
          <TemplateTextarea
            {...f}
            id={`${s.key}-text`}
            value={s.text}
            onChange={(text) => set({ text })}
            placeholder="{{event.text}}"
          />
        )}
      </Field>
      <VarChips />
    </>
  )
}

// ---- webhook ----

function WebhookFields(p: StepProps) {
  const { s, set } = p
  const access = useAccess()
  const changedUrl = !!s.savedUrl && s.url.trim() !== s.savedUrl
  const setHeader = (key: string, patch: { name?: string; value?: string }) =>
    set({
      headers: s.headers.map((h) => (h.key === key ? { ...h, ...patch } : h)),
    })
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium">Request</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Segmented
            label="Method"
            items={[
              { value: "POST", label: "POST" },
              { value: "PUT", label: "PUT" },
              { value: "GET", label: "GET" },
            ]}
            value={s.method}
            onChange={(method) => set({ method })}
          />
          <Input
            aria-label="Address"
            aria-invalid={err(p, "url") ? true : undefined}
            value={s.url}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://hooks.example.com/morche"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 font-mono placeholder:font-sans placeholder:text-ash"
          />
        </div>
        <FieldError text={err(p, "url")} />
        <p className="text-caption text-muted-foreground">
          The address can't use {"{{…}}"}: put values in the body or a header.
          Morche adds X-Morche-Automation with the automation's id.
        </p>
      </div>
      {s.method !== "GET" && (
        <Field label="Body" hint="Blank = the whole event as JSON.">
          {(f) => (
            <TemplateTextarea
              {...f}
              id={`${s.key}-body`}
              value={s.body}
              onChange={(body) => set({ body })}
              rows={4}
              mono
              placeholder={'{"text": "{{event.title}}"}'}
            />
          )}
        </Field>
      )}
      {s.method !== "GET" && <VarChips />}
      <div className="flex flex-col gap-2">
        <span className="text-body-sm font-medium">Headers</span>
        {s.headers.map((h) => (
          <div key={h.key} className="flex items-start gap-2">
            <Input
              aria-label="Header name"
              value={h.name}
              onChange={(e) => setHeader(h.key, { name: e.target.value })}
              placeholder="Authorization"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-[40%] min-w-0 font-mono placeholder:font-sans placeholder:text-ash"
            />
            <div className="min-w-0 flex-1">
              <SecretInput
                aria-label={`${h.name || "Header"} value`}
                value={h.value}
                onChange={(e) => setHeader(h.key, { value: e.target.value })}
                placeholder={
                  h.saved && !changedUrl ? "Saved: blank keeps it" : "Value"
                }
                label="value"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 md:size-10"
              aria-label="Remove header"
              onClick={() =>
                set({ headers: s.headers.filter((x) => x.key !== h.key) })
              }
            >
              <X />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="self-start border-dashed max-md:h-11"
          onClick={() => set({ headers: [...s.headers, newHeader()] })}
        >
          <Plus />
          Add header
        </Button>
        <FieldError text={err(p, "headers")} />
        {changedUrl && s.headers.some((h) => h.saved) && (
          <Callout icon={<Info />} tone="warning">
            The address changed: saved header values stay only with the address
            they were for, so give them again.
          </Callout>
        )}
        <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          Values are stored encrypted and never shown again.
        </p>
      </div>
      {(access.admin || s.allowInternal) && (
        <ToggleRow
          id={`${s.key}-internal`}
          label="Allow a private address"
          hint="For an address inside your network (10.x, 192.168.x, localhost…). Only system admins can allow it."
          checked={s.allowInternal}
          disabled={!access.admin}
          onChange={(allowInternal) => set({ allowInternal })}
        />
      )}
      <FieldError text={err(p, "allow_internal")} />
    </>
  )
}

// ---- where a step acts ----

function WhereField(p: StepProps) {
  const { s, set } = p
  const { serverLevel } = useAccess()
  const need = s.kind === "check" ? "operator" : "engineer"
  const event = p.trigger !== "webhook"
  const value = new Map(s.serverIds.map((id) => [id, p.names.get(id) ?? ""]))
  return (
    <div className="flex flex-col gap-2">
      <span className="text-body-sm font-medium">Where</span>
      {event && (
        <Segmented
          label="Where"
          items={[
            { value: "event", label: "The event's server" },
            { value: "servers", label: "Chosen servers" },
          ]}
          value={s.on}
          onChange={(on) => set({ on })}
        />
      )}
      {s.on === "event" && event ? (
        <p className="text-caption text-muted-foreground">
          {p.trigger === "manual"
            ? "Run now asks which server the event is on."
            : "The server the event happened on (an alert's server, the server that went offline, a deploy's server). An event without one fails this step."}
        </p>
      ) : (
        <>
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-border",
              err(p, "server_ids") && "border-destructive/50",
            )}
          >
            <ServerChecklist
              value={value}
              onChange={(m) => {
                const names = new Map(p.names)
                for (const [id, name] of m) if (name) names.set(id, name)
                p.onNames(names)
                set({ serverIds: [...m.keys()] })
              }}
              phone={p.phone}
              canPick={(x) => atLeast(serverLevel(x.id, x.workspace_id), need)}
            />
          </div>
          <p className="text-caption text-muted-foreground">
            Only servers you have{" "}
            {need === "engineer" ? "Engineer" : "Operator"} access to are
            listed.
          </p>
        </>
      )}
      <FieldError text={err(p, "server_ids")} />
    </div>
  )
}

// ---- script ----

function ScriptFields(p: StepProps) {
  const { s, set } = p
  const scripts = useScripts(p.ws)
  const view = useRef<EditorView | null>(null)
  const all = scripts.data ?? []
  // Steps can't give parameter values: only scripts whose defaults do.
  const usable = all.filter(
    (x) => !(x.params ?? []).some((q) => q.required && !q.default),
  )
  const left = all.length - usable.length
  return (
    <>
      <Segmented
        label="What to run"
        items={[
          { value: "command", label: "A command" },
          { value: "saved", label: "A saved script" },
        ]}
        value={s.scriptMode}
        onChange={(scriptMode) => set({ scriptMode })}
      />
      {s.scriptMode === "saved" ? (
        <div className="flex flex-col gap-1.5">
          {all.length === 0 && !scripts.isPending ? (
            <NoneYet
              text="This workspace has no saved scripts yet."
              href="/scripts/new"
              label="New script"
            />
          ) : (
            <Choice
              id={`${s.key}-script`}
              value={s.scriptId}
              onChange={(scriptId) => set({ scriptId })}
              placeholder="Choose a script"
              items={usable.map((x) => ({
                value: x.id,
                label: x.name,
                detail: x.interpreter,
              }))}
            />
          )}
          <FieldError text={err(p, "script_id")} />
          <p className="text-caption text-muted-foreground">
            It runs as the script says (its interpreter, user and time limit),
            with its parameters' defaults.
            {left > 0 &&
              ` ${left} script${left === 1 ? " needs" : "s need"} a value for a parameter and can't be used here.`}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-body-sm font-medium">Command</span>
              <Segmented
                label="Interpreter"
                items={[
                  { value: "bash", label: "bash" },
                  { value: "sh", label: "sh" },
                  { value: "python3", label: "python3" },
                ]}
                value={s.interpreter}
                onChange={(interpreter) => set({ interpreter })}
              />
            </div>
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-input [contain:inline-size]",
                err(p, "command") && "border-destructive/50",
              )}
            >
              <CodeEditor
                value={s.command}
                onChange={(command) => set({ command })}
                interpreter={s.interpreter}
                height="11rem"
                onCreateEditor={(v) => {
                  view.current = v
                }}
              />
            </div>
            <FieldError text={err(p, "command")} />
            <EnvChips view={view} />
            <p className="text-caption text-muted-foreground">
              The event reaches it as environment variables (MORCHE_EVENT_TITLE,
              MORCHE_SERVER_NAME…), never spliced into the text, so an event
              can't change what runs. {"{{…}}"} isn't read here.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1">
              <ToggleRow
                id={`${s.key}-root`}
                label="Run as root"
                hint="With sudo -n: the login needs passwordless sudo."
                checked={s.asRoot}
                onChange={(asRoot) => set({ asRoot })}
              />
            </div>
            <Field
              label="Time limit"
              hint="Seconds. Blank = 600."
              error={err(p, "timeout_seconds")}
              className="sm:w-40"
            >
              {(f) => (
                <Input
                  {...f}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={86400}
                  value={s.timeout}
                  onChange={(e) => set({ timeout: e.target.value })}
                  placeholder="600"
                  className="tabular-nums placeholder:text-ash"
                />
              )}
            </Field>
          </div>
        </>
      )}
      <WhereField {...p} />
    </>
  )
}

// ---- service ----

function ServiceFields(p: StepProps) {
  const { s, set } = p
  const hook = p.trigger === "webhook"
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium">Do</span>
        <Segmented
          label="Action"
          items={[
            { value: "restart", label: "Restart" },
            { value: "start", label: "Start" },
            { value: "stop", label: "Stop" },
            { value: "reload", label: "Reload" },
          ]}
          value={s.action}
          onChange={(action) => set({ action })}
        />
      </div>
      <Field
        label="Service"
        error={err(p, "unit")}
        hint={
          hook
            ? "Name it: with an incoming URL, the request's data can't pick it."
            : "A unit name (nginx, docker.service), or from the event, e.g. {{data.detail}} for a failed-service alert."
        }
      >
        {(f) => (
          <TemplateInput
            {...f}
            id={`${s.key}-unit`}
            value={s.unit}
            onChange={(unit) => set({ unit })}
            placeholder="nginx.service"
            mono
          />
        )}
      </Field>
      <VarChips noData={hook} />
      <WhereField {...p} />
    </>
  )
}

// ---- cron job ----

function CronjobFields(p: StepProps) {
  const { s, set } = p
  const jobs = useCronjobs(p.ws)
  const items = jobs.data ?? []
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-body-sm font-medium">Cron job</span>
      {items.length === 0 && !jobs.isPending ? (
        <NoneYet
          text="This workspace has no cron jobs yet."
          href="/cronjobs/new"
          label="New cron job"
        />
      ) : (
        <Choice
          id={`${s.key}-cronjob`}
          value={s.scheduleId}
          onChange={(scheduleId) => set({ scheduleId })}
          placeholder="Choose a cron job"
          items={items.map((c) => ({
            value: c.id,
            label: c.name,
            detail: c.enabled ? undefined : "paused",
          }))}
        />
      )}
      <FieldError text={err(p, "schedule_id")} />
      <p className="text-caption text-muted-foreground">
        Same as its Run now (paused ones too); the step waits for it to end and
        fails when it fails.
      </p>
    </div>
  )
}

// ---- wait ----

const waits = [
  { value: "30", label: "30 s" },
  { value: "60", label: "1 min" },
  { value: "300", label: "5 min" },
  { value: "900", label: "15 min" },
]

function WaitFields(p: StepProps) {
  const { s, set } = p
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <Field
        label="Seconds"
        error={err(p, "seconds")}
        hint="1 to 3600."
        className="sm:w-40"
      >
        {(f) => (
          <Input
            {...f}
            type="number"
            inputMode="numeric"
            min={1}
            max={3600}
            value={s.seconds}
            onChange={(e) => set({ seconds: e.target.value })}
            className="tabular-nums"
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-1.5 sm:mb-6">
        {waits.map((w) => (
          <button
            key={w.value}
            type="button"
            aria-pressed={s.seconds === w.value}
            onClick={() => set({ seconds: w.value })}
            className="h-9 rounded-full border border-border px-3 text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand/40 aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:h-11"
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  )
}
