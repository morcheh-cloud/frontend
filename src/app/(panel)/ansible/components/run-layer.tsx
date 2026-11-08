"use client"

import {
  ChevronDown,
  Folder,
  Server as ServerIcon,
  Tag,
  TriangleAlert,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { type ReactNode, useEffect, useId, useMemo, useState } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useFacets, useFolders } from "@/app/(panel)/servers/api"
import {
  Checklist,
  ServerChecklist,
} from "@/app/(panel)/servers/components/server-checklist"
import { BottomSheet } from "@/components/bottom-sheet"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { ApiError } from "@/lib/api"
import type {
  AnsibleOptions,
  AnsibleSelection,
  Folder as FolderT,
  PreviewHost,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAnsibleStatus, usePlaybook, usePreview, useStartRun } from "../api"
import { YamlEditor, yamlProblems } from "./yaml-editor"

// What to run: a saved playbook, or text that isn't saved (a draft, or a
// past run's copy of a deleted playbook).
export type RunSource = {
  playbookId?: string
  name: string
  content?: string
  variables?: string
}

export type RunPreset = {
  selection?: AnsibleSelection
  options?: AnsibleOptions
  // Servers to start with, by name (a past run's, the server page's).
  servers?: { id: string; name: string }[]
}

export type Picked = {
  all: boolean
  servers: Map<string, string>
  tags: string[]
  folders: string[]
}

export const emptyPick = (): Picked => ({
  all: false,
  servers: new Map(),
  tags: [],
  folders: [],
})

export function toSelection(p: Picked): AnsibleSelection {
  if (p.all) return { all: true }
  return {
    server_ids: [...p.servers.keys()].sort(),
    tags: [...p.tags].sort(),
    folder_ids: [...p.folders].sort(),
  }
}

export function pickedCount(p: Picked) {
  return p.all ? 1 : p.servers.size + p.tags.length + p.folders.length
}

const splitList = (s: string) =>
  s
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)

export function RunLayer({
  open,
  onOpenChange,
  source,
  preset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: RunSource | null
  preset?: RunPreset
}) {
  const phone = useIsPhone()
  const title = source ? `Run “${source.name}”` : "Run"
  const body = source && (
    <RunForm
      key={`${source.playbookId ?? source.name}-${open}`}
      source={source}
      preset={preset}
      phone={!!phone}
      onDone={() => onOpenChange(false)}
    />
  )

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        className="pb-[env(safe-area-inset-bottom)]"
      >
        {body}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>
            Choose the servers, check what will run, then start it.
          </SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

function RunForm({
  source,
  preset,
  phone,
  onDone,
}: {
  source: RunSource
  preset?: RunPreset
  phone: boolean
  onDone: () => void
}) {
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""
  const router = useRouter()
  const jobs = useJobActions()
  const status = useAnsibleStatus()
  const start = useStartRun(ws)
  // The saved variables, when the caller only knew the playbook's name.
  const saved = usePlaybook(
    source.variables === undefined && source.content === undefined
      ? source.playbookId
      : undefined,
  )

  const [picked, setPicked] = useState<Picked>(() => {
    const p = emptyPick()
    const s = preset?.selection
    if (s?.all) p.all = true
    for (const id of s?.server_ids ?? []) p.servers.set(id, "")
    p.tags = [...(s?.tags ?? [])]
    p.folders = [...(s?.folder_ids ?? [])]
    for (const s of preset?.servers ?? []) p.servers.set(s.id, s.name)
    return p
  })
  const o = preset?.options
  const [check, setCheck] = useState(!!o?.check)
  const [diff, setDiff] = useState(o?.diff ?? true)
  const [verbosity, setVerbosity] = useState(String(o?.verbosity ?? 0))
  const [tags, setTags] = useState((o?.tags ?? []).join(", "))
  const [skip, setSkip] = useState((o?.skip_tags ?? []).join(", "))
  const [limit, setLimit] = useState(o?.limit ?? "")
  const [forks, setForks] = useState(o?.forks ? String(o.forks) : "")
  const [vars, setVars] = useState<string | null>(
    o?.extra_vars ?? source.variables ?? null,
  )
  const extraVars = vars ?? saved.data?.variables ?? ""
  const varsProblem = yamlProblems(extraVars, "vars")[0]?.message

  // Preview the hosts once the picking settles.
  const selection = useMemo(() => toSelection(picked), [picked])
  const [settled, setSettled] = useState(selection)
  useEffect(() => {
    const t = setTimeout(() => setSettled(selection), 300)
    return () => clearTimeout(t)
  }, [selection])
  const any = pickedCount(picked) > 0
  const preview = usePreview(ws, settled, any)
  const hosts = any ? (preview.data ?? []) : []
  const bad = hosts.filter((h) => h.problem)
  const good = hosts.filter((h) => !h.problem)
  const stale = settled !== selection || preview.isFetching

  // Names for servers picked by id (a preset), from the preview.
  useEffect(() => {
    const missing = [...picked.servers].filter(([, n]) => !n)
    if (missing.length === 0 || !preview.data) return
    const names = new Map(preview.data.map((h) => [h.server_id, h.name]))
    if (!missing.some(([id]) => names.has(id))) return
    setPicked((p) => {
      const servers = new Map(p.servers)
      for (const [id] of missing) servers.set(id, names.get(id) ?? "")
      return { ...p, servers }
    })
  }, [preview.data, picked.servers])

  const leaveOut = () =>
    setPicked({
      ...emptyPick(),
      servers: new Map(good.map((h) => [h.server_id, h.name])),
    })

  const forksN = forks ? Number(forks) : undefined
  const forksBad =
    forksN !== undefined &&
    (!Number.isInteger(forksN) || forksN < 1 || forksN > 100)
  const blocked = status.data && !status.data.can_run ? status.data.problem : ""
  const canRun =
    !blocked &&
    !start.isPending &&
    !stale &&
    good.length > 0 &&
    bad.length === 0 &&
    !varsProblem &&
    !forksBad

  const run = () => {
    const options: AnsibleOptions = {
      check,
      diff,
      verbosity: Number(verbosity),
      tags: splitList(tags),
      skip_tags: splitList(skip),
      limit: limit.trim() || undefined,
      forks: forksN,
      extra_vars: extraVars.trim() ? extraVars : undefined,
    }
    start.mutate(
      {
        playbook_id:
          source.content === undefined ? source.playbookId : undefined,
        content: source.content,
        name: source.content !== undefined ? source.name : undefined,
        selection,
        options,
      },
      {
        onSuccess: ({ run, job }) => {
          jobs.track(job)
          onDone()
          router.push(`/ansible/runs/${run.id}`)
        },
        onError: (err) => toast.error((err as ApiError).message),
      },
    )
  }

  const runLabel = start.isPending
    ? "Starting…"
    : check
      ? `Dry run on ${good.length || ""} ${good.length === 1 ? "server" : "servers"}`
      : `Run on ${good.length || ""} ${good.length === 1 ? "server" : "servers"}`

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:px-6 md:py-5">
        {blocked && (
          <Callout warn title="Playbooks can't run right now">
            {blocked}
          </Callout>
        )}

        <Section title="Servers">
          <TargetPicker picked={picked} onChange={setPicked} phone={phone} />
        </Section>

        <Section
          title={
            any
              ? `In this run${hosts.length ? ` · ${good.length}` : ""}`
              : "In this run"
          }
          aside={stale && any ? "Checking…" : undefined}
        >
          <HostPreview
            any={any}
            hosts={hosts}
            loading={preview.isPending && any}
            error={preview.error?.message}
            onLeaveOut={
              good.length > 0 && bad.length > 0 ? leaveOut : undefined
            }
          />
        </Section>

        <Section title="Options">
          <div className="divide-y divide-border rounded-2xl border border-border">
            <ToggleRow
              label="Dry run (check mode)"
              hint="Reports what would change, changes nothing. Some tasks can't tell and are skipped."
              checked={check}
              onChange={setCheck}
            />
            <ToggleRow
              label="Show differences"
              hint="The lines each task changes (or would change) in files."
              checked={diff}
              onChange={setDiff}
            />
          </div>
          <Labeled
            label="Extra variables"
            hint={
              varsProblem ??
              "YAML, one “name: value” per line. They win over every other variable. Saved with the run, so keep secrets out."
            }
            error={!!varsProblem}
          >
            {(id) => (
              <div
                id={id}
                className="overflow-hidden rounded-lg border border-input"
              >
                <YamlEditor
                  kind="vars"
                  value={extraVars}
                  onChange={setVars}
                  height="128px"
                  placeholder="app_version: 1.4.2"
                />
              </div>
            )}
          </Labeled>
          <Collapsible>
            <CollapsibleTrigger className="group flex h-11 items-center gap-1 text-body-sm font-medium text-muted-foreground hover:text-foreground md:h-8">
              <ChevronDown className="size-4 transition-transform group-data-panel-open:rotate-180" />
              More options
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 grid gap-4 md:grid-cols-2">
              <Labeled label="Only tasks tagged" hint="Comma-separated tags">
                {(id) => (
                  <Input
                    id={id}
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="config, deploy"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                )}
              </Labeled>
              <Labeled label="Skip tasks tagged" hint="Comma-separated tags">
                {(id) => (
                  <Input
                    id={id}
                    value={skip}
                    onChange={(e) => setSkip(e.target.value)}
                    placeholder="slow"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                )}
              </Labeled>
              <Labeled
                label="Limit"
                hint="An Ansible host pattern to narrow it further, e.g. web:!web-2"
              >
                {(id) => (
                  <Input
                    id={id}
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                )}
              </Labeled>
              <Labeled
                label="Servers at once"
                hint={forksBad ? "A number from 1 to 100" : "Default 5"}
                error={forksBad}
              >
                {(id) => (
                  <Input
                    id={id}
                    value={forks}
                    onChange={(e) => setForks(e.target.value)}
                    inputMode="numeric"
                    placeholder="5"
                  />
                )}
              </Labeled>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-body-sm font-medium">
                  Detail in the output
                </span>
                <Segmented
                  label="Verbosity"
                  value={verbosity}
                  onChange={setVerbosity}
                  items={[
                    { value: "0", label: "Normal" },
                    { value: "1", label: "-v" },
                    { value: "2", label: "-vv" },
                    { value: "3", label: "-vvv" },
                    { value: "4", label: "-vvvv" },
                  ]}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Section>
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 md:px-6 md:py-4">
        {!phone && (
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button
          className="h-11 flex-1 md:ms-auto md:h-9 md:flex-none"
          disabled={!canRun}
          onClick={run}
        >
          {runLabel}
        </Button>
      </div>
    </>
  )
}

// ---- Picking servers ----

type PickTab = "servers" | "tags" | "folders" | "all"

export function TargetPicker({
  picked,
  onChange,
  phone,
}: {
  picked: Picked
  onChange: (p: Picked) => void
  phone: boolean
}) {
  const [tab, setTab] = useState<PickTab>(picked.all ? "all" : "servers")
  const facets = useFacets()
  const folders = useFolders()
  const folderNames = new Map((folders.data ?? []).map((f) => [f.id, f.name]))

  const chips: {
    key: string
    icon: ReactNode
    label: string
    remove: () => void
  }[] = []
  if (picked.all) {
    chips.push({
      key: "all",
      icon: <ServerIcon />,
      label: "Every server",
      remove: () => onChange({ ...picked, all: false }),
    })
  } else {
    for (const [id, name] of picked.servers) {
      chips.push({
        key: `s:${id}`,
        icon: <ServerIcon />,
        label: name || "Server",
        remove: () => {
          const servers = new Map(picked.servers)
          servers.delete(id)
          onChange({ ...picked, servers })
        },
      })
    }
    for (const t of picked.tags) {
      chips.push({
        key: `t:${t}`,
        icon: <Tag />,
        label: t,
        remove: () =>
          onChange({ ...picked, tags: picked.tags.filter((x) => x !== t) }),
      })
    }
    for (const f of picked.folders) {
      chips.push({
        key: `f:${f}`,
        icon: <Folder />,
        label: folderNames.get(f) ?? "Folder",
        remove: () =>
          onChange({
            ...picked,
            folders: picked.folders.filter((x) => x !== f),
          }),
      })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 no-scrollbar overflow-x-auto px-4 md:mx-0 md:px-0">
        <Segmented
          label="Pick by"
          value={tab}
          onChange={setTab}
          items={[
            { value: "servers", label: "Servers" },
            { value: "tags", label: "Tags" },
            { value: "folders", label: "Folders" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Picked">
          {chips.map((c) => (
            <li key={c.key}>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-soft ps-3 pe-1 text-body-sm text-brand-strong [&>svg]:size-3.5">
                {c.icon}
                <span className="max-w-48 truncate">{c.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${c.label}`}
                  onClick={c.remove}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-brand/10"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
          {chips.length > 1 && (
            <li>
              <button
                type="button"
                onClick={() => onChange(emptyPick())}
                className="h-8 px-2 text-body-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </li>
          )}
        </ul>
      )}

      <div className="rounded-2xl border border-border">
        {tab === "servers" && (
          <PickServers picked={picked} onChange={onChange} phone={phone} />
        )}
        {tab === "tags" && (
          <Checklist
            empty="No server has a tag yet."
            items={(facets.data?.tags ?? []).map((t) => ({
              id: t.value,
              label: t.value,
              meta: `${t.count} ${t.count === 1 ? "server" : "servers"}`,
            }))}
            checked={(id) => !picked.all && picked.tags.includes(id)}
            onToggle={(id, on) =>
              onChange({
                ...picked,
                all: false,
                tags: on
                  ? [...picked.tags, id]
                  : picked.tags.filter((t) => t !== id),
              })
            }
            loading={facets.isPending}
          />
        )}
        {tab === "folders" && (
          <Checklist
            empty="There are no folders yet."
            items={folderTree(folders.data ?? []).map(({ folder, depth }) => ({
              id: folder.id,
              label: folder.name,
              depth,
              meta: "With its subfolders",
            }))}
            checked={(id) => !picked.all && picked.folders.includes(id)}
            onToggle={(id, on) =>
              onChange({
                ...picked,
                all: false,
                folders: on
                  ? [...picked.folders, id]
                  : picked.folders.filter((f) => f !== id),
              })
            }
            loading={folders.isPending}
          />
        )}
        {tab === "all" && (
          <ToggleRow
            label="Every server in this workspace"
            hint={
              facets.data
                ? `${facets.data.total} ${facets.data.total === 1 ? "server" : "servers"}, including ones added later when this run is repeated.`
                : undefined
            }
            checked={picked.all}
            onChange={(all) => onChange({ ...emptyPick(), all })}
          />
        )}
      </div>
    </div>
  )
}

function PickServers({
  picked,
  onChange,
  phone,
}: {
  picked: Picked
  onChange: (p: Picked) => void
  phone: boolean
}) {
  return (
    <ServerChecklist
      value={picked.all ? new Map() : picked.servers}
      onChange={(servers) => onChange({ ...picked, all: false, servers })}
      phone={phone}
    />
  )
}

function folderTree(folders: FolderT[]) {
  const out: { folder: FolderT; depth: number }[] = []
  const walk = (parent: string | null, depth: number) => {
    for (const f of folders
      .filter((f) => f.parent_id === parent)
      .sort((a, b) => a.name.localeCompare(b.name))) {
      out.push({ folder: f, depth })
      walk(f.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

// ---- The hosts it will run on ----

export function HostPreview({
  any,
  hosts,
  loading,
  error,
  onLeaveOut,
}: {
  any: boolean
  hosts: PreviewHost[]
  loading: boolean
  error?: string
  onLeaveOut?: () => void
}) {
  if (!any) {
    return (
      <p className="text-body-sm text-muted-foreground">
        Pick servers, tags or folders above.
      </p>
    )
  }
  if (error)
    return (
      <Callout warn title="Couldn't check the servers">
        {error}
      </Callout>
    )
  if (loading) {
    return <p className="text-body-sm text-muted-foreground">Checking…</p>
  }
  if (hosts.length === 0) {
    return (
      <p className="text-body-sm text-muted-foreground">
        No server matches what you picked.
      </p>
    )
  }
  const bad = hosts.filter((h) => h.problem)
  return (
    <div className="flex flex-col gap-3">
      {bad.length > 0 && (
        <Callout
          warn
          title={`${bad.length} ${bad.length === 1 ? "server" : "servers"} can't be in this run`}
          action={
            onLeaveOut && (
              <Button variant="outline" size="sm" onClick={onLeaveOut}>
                Leave {bad.length === 1 ? "it" : "them"} out
              </Button>
            )
          }
        >
          A run starts only when every server can take part.
        </Callout>
      )}
      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-2xl border border-border">
        {[...bad, ...hosts.filter((h) => !h.problem)].map((h) => (
          <li key={h.server_id} className="flex flex-col gap-1 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="min-w-0 truncate text-body-sm font-medium">
                {h.name}
              </span>
              {h.inventory_name !== h.name && (
                <span className="truncate font-mono text-caption text-ash">
                  {h.inventory_name}
                </span>
              )}
              <span className="ms-auto shrink-0 text-caption text-ash">
                {h.host}
              </span>
            </div>
            {h.problem ? (
              <p className="flex gap-1.5 text-caption text-destructive">
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
                {h.problem}
              </p>
            ) : (
              h.groups.length > 0 && (
                <p className="flex flex-wrap gap-1">
                  {h.groups.map((g) => (
                    <span
                      key={g}
                      className="rounded-md bg-muted px-1.5 font-mono text-caption text-muted-foreground"
                    >
                      {g}
                    </span>
                  ))}
                </p>
              )
            )}
          </li>
        ))}
      </ul>
      <p className="text-caption text-ash">
        Groups come from each server’s tags and its OS (os_ubuntu…): use them in
        a play’s <span className="font-mono">hosts:</span>.
      </p>
    </div>
  )
}

// ---- Small pieces ----

function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-body font-medium">{title}</h3>
        {aside && <span className="text-caption text-ash">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className="flex min-h-14 cursor-pointer items-center gap-4 px-4 py-3"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-medium">{label}</span>
        {hint && (
          <span className="block text-caption text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
      />
    </label>
  )
}

function Labeled({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: boolean
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint && (
        <p
          className={cn(
            "text-caption",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

export function Callout({
  title,
  warn,
  action,
  children,
}: {
  title: string
  warn?: boolean
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <div
      role={warn ? "alert" : undefined}
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-subtle px-4 py-3 text-body-sm"
    >
      <TriangleAlert
        className={cn(
          "mt-0.5 size-4 shrink-0",
          warn ? "text-warning" : "text-ash",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {children && (
          <div className="break-words text-muted-foreground">{children}</div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
