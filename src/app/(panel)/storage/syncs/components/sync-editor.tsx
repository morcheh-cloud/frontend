"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowDownUp,
  ChevronLeft,
  Info,
  type LucideIcon,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  AddButton,
  Callout,
  EndRow,
  FieldError,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import {
  type EndDraft,
  EndPicker,
  type Role,
} from "@/app/(panel)/cronjobs/components/end-picker"
import { browserZone } from "@/app/(panel)/cronjobs/components/meta"
import { ScheduleField } from "@/app/(panel)/cronjobs/components/schedule-field"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import {
  type Builder,
  fromBuilder,
  toBuilder,
} from "@/app/(panel)/servers/[id]/cron/components/schedule"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useAuth } from "@/components/auth/auth"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { storagesQuery } from "@/components/panel/problems"
import { useWorkspace } from "@/components/panel/workspace"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, api, fieldErrors } from "@/lib/api"
import type { Storage, StorageSync, StorageSyncBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import { syncKeys, useCreateSync, useStorageSync, useUpdateSync } from "../api"
import {
  type Engine,
  engineMeta,
  existingMeta,
  kindMeta,
  type Mode,
  modeMeta,
  newSyncParams,
  type SyncKind,
  syncHref,
  type Trigger,
  triggerMeta,
} from "./meta"
import { useStorageLevelOf, useSyncCan } from "./permissions"

type Existing = keyof typeof existingMeta

type Draft = {
  kind: SyncKind
  name: string
  source: EndDraft | null
  dest: EndDraft | null
  engine: Engine
  mode: Mode
  trigger: Trigger
  cron: string
  builder: Builder
  timezone: string
  interval: string
  excludes: string
  existing: Existing
  verify: boolean
  deleteSource: boolean
  settle: string
  delay: string
  rSync: boolean
  rBandwidth: string
  rDeletes: boolean
  rExisting: boolean
  rEndpoint: string
  paused: boolean
}

type ErrorKey =
  | "name"
  | "source"
  | "dest"
  | "engine"
  | "mode"
  | "cron"
  | "interval"
  | "settle"
  | "delay"
  | "bandwidth"
  | "endpoint"
  | "deleteSource"
  | "excludes"
type Errors = Partial<Record<ErrorKey, string>>

const DEFAULT_CRON = "0 2 * * *"

const endOf = (e: StorageSync["source"]): EndDraft => ({
  storage_id: e.storage_id,
  name: e.name,
  path: e.path,
  missing: e.missing,
})

const fromSaved = (s: StorageSync): Draft => {
  const r = s.options.replication
  const cron = s.cron || DEFAULT_CRON
  return {
    kind: s.kind,
    name: s.name,
    source: endOf(s.source),
    dest: endOf(s.dest),
    engine: s.engine,
    mode: s.mode,
    trigger: s.trigger,
    cron,
    builder: toBuilder(cron),
    timezone: s.timezone || browserZone(),
    interval: String(s.interval_minutes || 15),
    excludes: (s.options.excludes ?? []).join("\n"),
    existing: (s.options.existing as Existing) || "changed",
    verify: !!s.options.verify,
    deleteSource: !!s.options.delete_source,
    settle: String(s.options.settle_minutes ?? 0),
    delay: String(s.options.delete_delay_hours ?? 0),
    rSync: !!r?.sync,
    rBandwidth: String(r?.bandwidth_mbps ?? 0),
    rDeletes: !!r?.deletes,
    rExisting: r ? !!r.existing : true,
    rEndpoint: r?.target_endpoint ?? "",
    paused: s.paused,
  }
}

const fresh = (p: {
  kind: SyncKind | null
  source: string | null
  dest: string | null
}): Draft => ({
  kind: p.kind ?? "sync",
  name: "",
  source: p.source ? { storage_id: p.source, name: "", path: "/" } : null,
  dest: p.dest ? { storage_id: p.dest, name: "", path: "/" } : null,
  engine: "morche",
  mode: "update",
  trigger: "interval",
  cron: DEFAULT_CRON,
  builder: toBuilder(DEFAULT_CRON),
  timezone: browserZone(),
  interval: "15",
  excludes: "",
  existing: "changed",
  verify: true,
  deleteSource: false,
  settle: "0",
  delay: "0",
  rSync: false,
  rBandwidth: "0",
  rDeletes: true,
  rExisting: true,
  rEndpoint: "",
  paused: false,
})

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

const num = (v: string) => Number(v.trim() || "0")

const minio = (st?: Storage) => st?.protocol === "s3" && st.provider === "minio"

// The object prefix a path names inside its bucket ("" = the bucket itself),
// or null when the path doesn't reach a bucket yet.
function prefixIn(st: Storage | undefined, path: string): string | null {
  if (!st) return null
  const parts = path.split("/").filter(Boolean)
  if (st.bucket) return parts.join("/")
  if (parts.length === 0) return null
  return parts.slice(1).join("/")
}

// The engine the body says: replication only while both ends are MinIO.
const engineOf = (d: Draft, both: boolean): Engine =>
  d.kind === "sync" && both ? d.engine : "morche"

function toBody(d: Draft, both: boolean): StorageSyncBody {
  const engine = engineOf(d, both)
  const base = {
    kind: d.kind,
    name: d.name.trim(),
    source_storage_id: d.source?.storage_id ?? "",
    source_path: d.source?.path ?? "/",
    dest_storage_id: d.dest?.storage_id ?? "",
    dest_path: d.dest?.path ?? "/",
    engine,
  }
  if (d.kind === "migrate") {
    return {
      ...base,
      options: {
        excludes: lines(d.excludes),
        existing: d.existing,
        verify: d.verify || d.deleteSource,
        delete_source: d.deleteSource,
      },
    }
  }
  if (engine === "replication") {
    return {
      ...base,
      paused: d.paused,
      options: {
        replication: {
          sync: d.rSync,
          bandwidth_mbps: num(d.rBandwidth),
          deletes: d.rDeletes,
          existing: d.rExisting,
          target_endpoint: d.rEndpoint.trim(),
        },
      },
    }
  }
  return {
    ...base,
    mode: d.mode,
    trigger: d.trigger,
    paused: d.paused,
    ...(d.trigger === "schedule" && {
      cron: d.cron.trim(),
      timezone: d.timezone,
    }),
    ...(d.trigger === "interval" && { interval_minutes: num(d.interval) }),
    options: {
      excludes: lines(d.excludes),
      existing: d.existing,
      settle_minutes: num(d.settle),
      delete_delay_hours: d.mode === "mirror" ? num(d.delay) : 0,
    },
  }
}

const sameBody = (a: Draft, b: Draft, both: boolean) =>
  JSON.stringify(toBody(a, both)) === JSON.stringify(toBody(b, both))

// Backend field → the editor's error slot.
function errorKey(field: string): ErrorKey | undefined {
  if (field === "name") return "name"
  if (field.startsWith("source")) return "source"
  if (field.startsWith("dest")) return "dest"
  if (field === "engine") return "engine"
  if (field === "mode") return "mode"
  if (field === "cron" || field === "timezone" || field === "trigger")
    return "cron"
  if (field === "interval_minutes") return "interval"
  if (field === "options.settle_minutes") return "settle"
  if (field === "options.delete_delay_hours") return "delay"
  if (field === "options.delete_source") return "deleteSource"
  if (field.startsWith("options.excludes")) return "excludes"
  if (field === "options.replication.bandwidth_mbps") return "bandwidth"
  if (field === "options.replication.target_endpoint") return "endpoint"
  return undefined
}

// /storage/syncs/[id]/edit reads its id from the route.
export function SyncEditorFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <SyncEditor id={id} />
}

// /storage/syncs/new and /storage/syncs/[id]/edit.
export function SyncEditor({ id }: { id?: string }) {
  const phone = useIsPhone()
  const query = useStorageSync(id, { poll: false })
  if (phone === null) return null
  if (id && query.isPending) return <Loading phone={phone} />
  if (id && !query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={ArrowDownUp}
          title={gone ? "This sync isn't here" : "Couldn't load the sync"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/storage?tab=syncs" />}
              nativeButton={false}
            >
              Back to syncs
            </Button>
          }
        />
      </div>
    )
  }
  return (
    <Editor key={query.data?.id ?? "new"} saved={query.data} phone={phone} />
  )
}

function Editor({
  saved,
  phone,
}: {
  saved: StorageSync | undefined
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  const ws = saved?.workspace_id ?? workspace?.id ?? ""
  const can = useSyncCan(ws)
  const levelOf = useStorageLevelOf(ws)
  const { user } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()
  const storages = useQuery(storagesQuery)
  const storageOf = (id?: string) =>
    storages.data?.items.find((s) => s.id === id)

  const [prefill] = useQueryStates(newSyncParams)
  const [draft, setDraft] = useState<Draft>(() =>
    saved ? fromSaved(saved) : fresh(prefill),
  )
  const kind = draft.kind
  const listHref = `/storage?tab=${kind === "migrate" ? "migrations" : "syncs"}`
  const home = saved ? syncHref(saved.id) : listHref
  const back = useBack(home)
  const [revision, setRevision] = useState(saved?.updated_at)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState(false)
  const [conflict, setConflict] = useOpen("sync-conflict")
  const [picking, setPicking] = useOpen("sync-end-picker")
  const [role, setRole] = useState<Role>("source")

  const create = useCreateSync(ws)
  const update = useUpdateSync(saved?.id ?? "")
  const saving = create.isPending || update.isPending

  const src = storageOf(draft.source?.storage_id)
  const dst = storageOf(draft.dest?.storage_id)
  const both = minio(src) && minio(dst)
  const engine = engineOf(draft, both)
  const replication = engine === "replication"
  const dirty = saved ? !sameBody(draft, fromSaved(saved), both) : touched
  const noun = kindMeta[kind].label.toLowerCase()

  usePageCrumbs(
    saved
      ? [
          { href: syncHref(saved.id), label: saved.name },
          { href: `/storage/syncs/${saved.id}/edit`, label: "Edit" },
        ]
      : [{ href: "/storage/syncs/new", label: `New ${noun}` }],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>) => {
    setTouched(true)
    setDraft((d) => ({ ...d, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      for (const k of Object.keys(patch)) {
        if (k === "builder" || k === "timezone" || k === "trigger")
          delete next.cron
        if (k === "source" || k === "dest") {
          delete next.source
          delete next.dest
          delete next.engine
        }
        if (k === "rBandwidth") delete next.bandwidth
        if (k === "rEndpoint") delete next.endpoint
        delete next[k as ErrorKey]
      }
      return next
    })
  }

  // A prefilled end carries only its id: name it once the list is here.
  const named = (e: EndDraft | null) =>
    e && !e.name ? { ...e, name: storageOf(e.storage_id)?.name ?? "" } : e

  function pick(r: Role) {
    setRole(r)
    setPicking(true)
  }

  function onPick(end: EndDraft) {
    const other = role === "source" ? draft.dest : draft.source
    if (
      other &&
      other.storage_id === end.storage_id &&
      other.path === end.path
    ) {
      toast.error("That's the other end: pick another folder")
      return
    }
    set(role === "source" ? { source: end } : { dest: end })
  }

  // MinIO keeps object names as they are: the folder inside both buckets
  // must match.
  const srcPrefix = draft.source ? prefixIn(src, draft.source.path) : null
  const dstPrefix = draft.dest ? prefixIn(dst, draft.dest.path) : null
  const prefixFix =
    replication &&
    srcPrefix !== null &&
    dstPrefix !== null &&
    srcPrefix !== dstPrefix &&
    draft.dest &&
    dst
      ? (() => {
          const bucket = dst.bucket
            ? ""
            : draft.dest.path.split("/").filter(Boolean)[0]
          return `/${[bucket, srcPrefix].filter(Boolean).join("/")}`
        })()
      : null

  function check(): Errors {
    const e: Errors = {}
    if (!draft.name.trim()) e.name = "Give it a name"
    if (!draft.source) e.source = "Choose what to copy"
    if (!draft.dest) e.dest = "Choose where it goes"
    if (
      draft.source &&
      draft.dest &&
      draft.source.storage_id === draft.dest.storage_id
    ) {
      const a = draft.source.path.replace(/\/$/, "")
      const b = draft.dest.path.replace(/\/$/, "")
      if (a === b || b.startsWith(`${a}/`) || a.startsWith(`${b}/`) || !a || !b)
        e.dest =
          "On the same storage the two folders can't be inside one another"
    }
    if (dst?.read_only) e.dest = `${dst.name} is read-only in Morche`
    if (kind === "migrate" && draft.deleteSource && src?.read_only)
      e.deleteSource = `${src.name} is read-only, so nothing can be deleted from it`
    if (replication) {
      if (srcPrefix === null) e.source = "Pick a bucket, or a folder inside one"
      if (dstPrefix === null) e.dest = "Pick a bucket, or a folder inside one"
      else if (prefixFix)
        e.dest = `MinIO keeps object names as they are: use ${prefixFix}`
      const bw = num(draft.rBandwidth)
      if (!Number.isInteger(bw) || bw < 0 || bw > 100000)
        e.bandwidth = "A whole number from 0 to 100000"
    } else if (kind === "sync") {
      if (draft.mode === "mirror" && draft.dest?.path === "/")
        e.dest = "A mirror needs a folder, not the whole storage"
      if (draft.trigger === "schedule" && !draft.cron.trim())
        e.cron = "Enter a schedule"
      const every = num(draft.interval)
      if (
        draft.trigger === "interval" &&
        (!Number.isInteger(every) || every < 5 || every > 10080)
      )
        e.interval = "From 5 minutes to 10080 (a week)"
      const settle = num(draft.settle)
      if (!Number.isInteger(settle) || settle < 0 || settle > 1440)
        e.settle = "From 0 to 1440 minutes"
      const delay = num(draft.delay)
      if (
        draft.mode === "mirror" &&
        (!Number.isInteger(delay) || delay < 0 || delay > 8760)
      )
        e.delay = "From 0 to 8760 hours"
    }
    if (!replication && lines(draft.excludes).length > 100)
      e.excludes = "100 patterns at the most"
    return e
  }

  function save(opts?: { overwrite?: boolean }) {
    const e = check()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0] ?? "Check the form")
      return
    }
    const body = toBody(draft, both)
    const done = (s: StorageSync) => {
      setRevision(s.updated_at)
      setTouched(false)
      toast.success(saved ? "Saved" : `${s.name} created`)
      router.replace(syncHref(s.id))
    }
    const failed = (err: Error) => {
      if (err instanceof ApiError && err.status === 409 && saved) {
        setConflict(true)
        return
      }
      const mapped: Errors = {}
      for (const [k, v] of Object.entries(fieldErrors(err))) {
        const key = errorKey(k)
        if (key) mapped[key] = v
      }
      setErrors(mapped)
      toast.error(Object.values(mapped)[0] ?? err.message)
    }
    if (!saved) create.mutate(body, { onSuccess: done, onError: failed })
    else
      update.mutate(
        { ...body, revision: opts?.overwrite ? undefined : revision },
        { onSuccess: done, onError: failed },
      )
  }

  function loadTheirs() {
    setConflict(false)
    if (!saved) return
    api.storageSyncs.getStorageSync(saved.id).then(
      (s) => {
        qc.setQueryData(syncKeys.detail(s.id), s)
        setDraft(fromSaved(s))
        setRevision(s.updated_at)
        setErrors({})
      },
      (err: Error) => toast.error(err.message),
    )
  }

  if (!can.edit) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={ArrowDownUp}
          title="You can't change syncs here"
          body="Creating and editing syncs and migrations needs Engineer access to this workspace."
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href={home} />}
              nativeButton={false}
            >
              Back
            </Button>
          }
        />
      </div>
    )
  }

  // Access the ends need, shown before the backend refuses.
  const srcNeed =
    kind === "migrate" && draft.deleteSource ? "engineer" : "operator"
  const srcShort =
    draft.source && src && !levelOf(src.id, srcNeed)
      ? `You need ${srcNeed === "engineer" ? "Engineer" : "Operator"} access to ${src.name}${srcNeed === "engineer" ? " to delete from it" : ""}.`
      : undefined
  const dstShort =
    draft.dest && dst && !levelOf(dst.id, "engineer")
      ? `You need Engineer access to ${dst.name} to write to it.`
      : undefined
  const replicateShort =
    both && (!levelOf(src?.id, "owner") || !levelOf(dst?.id, "owner"))

  const runsAs =
    saved?.runs_as && saved.runs_as !== user.full_name
      ? `It runs with ${saved.runs_as}'s access now. Once you save, it runs with yours.`
      : "It runs with your access to both storages. If you lose it, it stops and says why."

  const title = draft.name.trim() || saved?.name || `New ${noun}`
  const KindIcon = kindMeta[kind].icon

  const optionsShown = !replication
  const sections = (
    <>
      {!saved && (
        <Section
          title="What it is"
          hint="Can't be changed once saved."
          phone={phone}
        >
          <Cards
            label="Kind"
            phone={phone}
            value={kind}
            onChange={(k) => set({ kind: k })}
            items={(["sync", "migrate"] as const).map((k) => ({
              value: k,
              icon: kindMeta[k].icon,
              label: kindMeta[k].label,
              text: kindMeta[k].text,
            }))}
          />
        </Section>
      )}

      <Section title="Name" phone={phone}>
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={
                kind === "migrate"
                  ? "Move to the new MinIO"
                  : "Photos to backup"
              }
              maxLength={100}
              className="placeholder:text-ash"
              enterKeyHint="next"
            />
          )}
        </Field>
      </Section>

      <Section
        title="From and to"
        hint={
          kind === "migrate"
            ? "Everything in the source folder is copied into the destination folder."
            : "The destination folder is kept up to date with the source folder."
        }
        phone={phone}
      >
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">Copy from</span>
          {draft.source ? (
            <EndRow
              end={named(draft.source) ?? draft.source}
              onChange={() => pick("source")}
              label="Change source"
            />
          ) : (
            <AddButton onClick={() => pick("source")}>Choose source</AddButton>
          )}
          <FieldError text={errors.source ?? srcShort} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">Copy to</span>
          {draft.dest ? (
            <EndRow
              end={named(draft.dest) ?? draft.dest}
              onChange={() => pick("destination")}
              label="Change destination"
            />
          ) : (
            <AddButton onClick={() => pick("destination")}>
              Choose destination
            </AddButton>
          )}
          <FieldError text={errors.dest ?? dstShort} />
          {prefixFix && (
            <Button
              variant="outline"
              className="h-11 self-start md:h-9"
              onClick={() =>
                draft.dest && set({ dest: { ...draft.dest, path: prefixFix } })
              }
            >
              Use {prefixFix}
            </Button>
          )}
        </div>
        {draft.source && draft.dest && (
          <Button
            variant="ghost"
            className="h-11 self-start text-muted-foreground md:h-8"
            onClick={() => set({ source: draft.dest, dest: draft.source })}
          >
            <ArrowDownUp />
            Swap them
          </Button>
        )}
      </Section>

      {kind === "sync" && both && (
        <Section
          title="Who copies"
          hint="Both ends are MinIO, so MinIO can copy by itself."
          phone={phone}
        >
          <Cards
            label="Engine"
            phone={phone}
            value={draft.engine}
            onChange={(engine) => set({ engine })}
            items={(["replication", "morche"] as const).map((e) => ({
              value: e,
              icon: engineMeta[e].icon,
              label: engineMeta[e].label,
              text: engineMeta[e].text,
              tag: e === "replication" ? "Fastest" : undefined,
              disabled: e === "replication" && replicateShort,
            }))}
          />
          {replicateShort && (
            <Callout icon={<Info />}>
              MinIO replication is set up on the storages themselves, so it
              needs Owner access to both.
            </Callout>
          )}
          <FieldError text={errors.engine} />
        </Section>
      )}

      {replication && (
        <Section
          title="Replication"
          hint="MinIO turns on versioning on both buckets and adds a rule to the source."
          phone={phone}
        >
          <ToggleRow
            id="r-existing"
            label="Copy what's already there"
            hint="Not only new writes: every object the bucket holds now."
            checked={draft.rExisting}
            onChange={(rExisting) => set({ rExisting })}
          />
          <ToggleRow
            id="r-deletes"
            label="Copy deletions"
            hint="Delete on the destination what's deleted on the source."
            checked={draft.rDeletes}
            onChange={(rDeletes) => set({ rDeletes })}
          />
          <ToggleRow
            id="r-sync"
            label="Wait for the copy"
            hint="Writes finish only once the destination has them: never behind, but slower."
            checked={draft.rSync}
            onChange={(rSync) => set({ rSync })}
          />
          <Field
            label="Speed limit"
            hint="Megabits per second. 0 = no limit."
            error={errors.bandwidth}
            className="w-48"
          >
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={0}
                max={100000}
                value={draft.rBandwidth}
                onChange={(e) => set({ rBandwidth: e.target.value })}
                className="tabular-nums"
              />
            )}
          </Field>
          <Field
            label="Destination address for MinIO"
            hint="Only when the source MinIO reaches the other one at a different address than Morche does (inside Docker, a private network…)."
            error={errors.endpoint}
          >
            {(p) => (
              <Input
                {...p}
                value={draft.rEndpoint}
                onChange={(e) => set({ rEndpoint: e.target.value })}
                placeholder={`Same as Morche uses${dst ? ` for ${dst.name}` : ""}`}
                maxLength={500}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono placeholder:font-sans placeholder:text-ash"
              />
            )}
          </Field>
          <ToggleRow
            id="r-paused"
            label="Turned on"
            hint="Off = the rule stays on the source but copies nothing."
            checked={!draft.paused}
            onChange={(on) => set({ paused: !on })}
          />
        </Section>
      )}

      {kind === "sync" && !replication && (
        <Section title="How" phone={phone}>
          <div className="flex flex-col gap-2">
            <div className="[scrollbar-width:none] overflow-x-auto">
              <Segmented
                label="Mode"
                items={(["update", "mirror"] as const).map((m) => ({
                  value: m,
                  label: modeMeta[m].label,
                }))}
                value={draft.mode}
                onChange={(mode) => set({ mode })}
              />
            </div>
            <p className="text-caption text-muted-foreground">
              {modeMeta[draft.mode].text}
            </p>
            <FieldError text={errors.mode} />
          </div>
          {draft.mode === "mirror" && (
            <>
              <Callout icon={<TriangleAlert />} tone="warning">
                Mirror deletes files in the destination folder that the source
                doesn't have. Point it at a folder that holds only this copy,
                and try a Test run first.
              </Callout>
              <Field
                label="Wait before deleting"
                hint="Hours a file gone from the source stays on the destination, so a mistake can be caught. 0 = delete at once."
                error={errors.delay}
                className="w-56"
              >
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={8760}
                    value={draft.delay}
                    onChange={(e) => set({ delay: e.target.value })}
                    className="tabular-nums"
                  />
                )}
              </Field>
            </>
          )}
        </Section>
      )}

      {kind === "sync" && !replication && (
        <Section title="When" phone={phone}>
          <Cards
            label="When"
            phone={phone}
            value={draft.trigger}
            onChange={(trigger) => set({ trigger })}
            items={(["interval", "schedule", "manual"] as const).map((t) => ({
              value: t,
              icon: triggerMeta[t].icon,
              label: triggerMeta[t].label,
              text: triggerMeta[t].text,
            }))}
          />
          {draft.trigger === "schedule" && (
            <ScheduleField
              builder={draft.builder}
              onChange={(builder) =>
                set({ builder, cron: fromBuilder(builder) })
              }
              timezone={draft.timezone}
              onTimezone={(timezone) => set({ timezone })}
              error={errors.cron}
              phone={phone}
            />
          )}
          {draft.trigger === "interval" && (
            <div className="flex flex-col gap-2">
              <Field
                label="Minutes between runs"
                hint="Counted from the end of the last run, so runs never pile up. 5 at the least."
                error={errors.interval}
                className="w-56"
              >
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={10080}
                    value={draft.interval}
                    onChange={(e) => set({ interval: e.target.value })}
                    className="tabular-nums"
                  />
                )}
              </Field>
              <div className="flex flex-wrap gap-2">
                {[5, 15, 60, 360, 1440].map((m) => (
                  <Button
                    key={m}
                    variant="outline"
                    size="sm"
                    aria-pressed={num(draft.interval) === m}
                    className="h-9 rounded-full aria-pressed:border-brand aria-pressed:text-brand md:h-7"
                    onClick={() => set({ interval: String(m) })}
                  >
                    {m < 60 ? `${m} min` : m < 1440 ? `${m / 60} h` : "1 day"}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <ToggleRow
            id="sync-on"
            label="Turned on"
            hint="Off = paused. Run now still works."
            checked={!draft.paused}
            onChange={(on) => set({ paused: !on })}
          />
        </Section>
      )}

      {kind === "migrate" && (
        <Section title="Safety" phone={phone}>
          <ToggleRow
            id="m-verify"
            label="Check every file"
            hint="After copying, every file is looked up on the destination and its size compared."
            checked={draft.verify || draft.deleteSource}
            disabled={draft.deleteSource}
            onChange={(verify) => set({ verify })}
          />
          <ToggleRow
            id="m-delete"
            label="Empty the source afterwards"
            hint="A real move: files that arrived and passed the check are deleted from the source."
            checked={draft.deleteSource}
            onChange={(deleteSource) => set({ deleteSource })}
          />
          <FieldError text={errors.deleteSource} />
          {draft.deleteSource && (
            <Callout icon={<TriangleAlert />} tone="warning">
              Files are deleted from {src?.name ?? "the source"} only after
              they're on {dst?.name ?? "the destination"} with the same size.
              Anything that fails stays where it is. Try a Test run first.
            </Callout>
          )}
        </Section>
      )}

      {optionsShown && (
        <Section title="Files" phone={phone}>
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium">
              Files already at the destination
            </span>
            <div className="[scrollbar-width:none] overflow-x-auto">
              <Segmented
                label="Files already at the destination"
                items={(["changed", "missing", "all"] as const).map((x) => ({
                  value: x,
                  label: existingMeta[x].label,
                }))}
                value={draft.existing}
                onChange={(existing) => set({ existing })}
              />
            </div>
            <p className="text-caption text-muted-foreground">
              {existingMeta[draft.existing].text}
            </p>
          </div>
          {kind === "sync" && (
            <Field
              label="Wait for new files to settle"
              hint="Minutes a file must stay unchanged before it's copied, so half-uploaded files are left for the next run. 0 = copy at once."
              error={errors.settle}
              className="w-56"
            >
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1440}
                  value={draft.settle}
                  onChange={(e) => set({ settle: e.target.value })}
                  className="tabular-nums"
                />
              )}
            </Field>
          )}
          <Field
            label="Leave out"
            hint="One pattern per line. Without a slash it matches a name at any depth (*.tmp, .cache); with one, a path from the source folder (logs/old)."
            error={errors.excludes}
          >
            {(p) => (
              <Textarea
                {...p}
                value={draft.excludes}
                onChange={(e) => set({ excludes: e.target.value })}
                placeholder="Nothing is left out"
                rows={3}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono placeholder:font-sans placeholder:text-ash"
              />
            )}
          </Field>
        </Section>
      )}

      <Section title="Access" phone={phone}>
        <Callout icon={<ShieldCheck />}>
          {replication
            ? "MinIO copies with its own credentials: the rule lives on the source bucket and keeps working even when Morche is down."
            : runsAs}
        </Callout>
      </Section>
    </>
  )

  const conflictDialog = (
    <ResponsiveDialog
      open={conflict}
      onOpenChange={setConflict}
      title={`Someone else saved this ${noun}`}
      footer={
        <>
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={loadTheirs}
          >
            Load theirs
          </Button>
          <Button
            variant="destructive"
            className="h-11 md:h-9"
            onClick={() => {
              setConflict(false)
              save({ overwrite: true })
            }}
          >
            Overwrite
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-muted-foreground">
        It changed after you opened it. Load their version (your changes go), or
        save yours over it.
      </p>
    </ResponsiveDialog>
  )

  const picker = (
    <EndPicker
      open={picking}
      onOpenChange={setPicking}
      role={role}
      storagesOnly
      need={
        role === "destination"
          ? "engineer"
          : kind === "migrate" && draft.deleteSource
            ? "engineer"
            : undefined
      }
      title={role === "source" ? "Copy from" : "Copy to"}
      description={
        role === "source"
          ? "A storage and the folder whose contents are copied."
          : "The folder the files go into. Missing folders are created."
      }
      value={(role === "source" ? draft.source : draft.dest) ?? undefined}
      onPick={onPick}
    />
  )

  const saveLabel = saving ? "Saving…" : saved ? "Save" : "Create"

  if (phone) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {saved ? `Edit ${noun}` : `New ${noun}`}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={saving || (!!saved && !dirty)}
            onClick={() => save()}
          >
            {saveLabel}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
        {picker}
        {conflictDialog}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 pt-5 pb-12">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            replication
              ? "bg-brand text-primary-foreground"
              : "bg-brand-soft text-brand-strong",
          )}
        >
          <KindIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">{title}</h1>
          <p className="truncate text-caption text-ash">
            {dirty
              ? "Unsaved changes"
              : saved
                ? `Saved ${timeAgo(saved.updated_at)}`
                : "Not saved yet"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            className="h-9"
            render={<Link href={home} />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button
            className="h-9"
            disabled={saving || (!!saved && !dirty)}
            onClick={() => save()}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
      <div className="grid max-w-5xl gap-6">{sections}</div>
      {picker}
      {conflictDialog}
    </div>
  )
}

// Radio cards: a row of tiles on desktop, stacked rows on phones.
function Cards<T extends string>({
  label,
  phone,
  value,
  onChange,
  items,
}: {
  label: string
  phone: boolean
  value: T
  onChange: (v: T) => void
  items: {
    value: T
    icon: LucideIcon
    label: string
    text: string
    tag?: ReactNode
    disabled?: boolean
  }[]
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid gap-2",
        !phone && "grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]",
      )}
    >
      {items.map((it) => {
        const on = it.value === value
        const Icon = it.icon
        return (
          // biome-ignore lint/a11y/useSemanticElements: a card, not a bare radio
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={it.disabled}
            onClick={() => onChange(it.value)}
            className={cn(
              "flex min-h-12 items-start gap-3 rounded-xl border p-3 text-start transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              on
                ? "border-brand bg-brand-soft/60"
                : "border-border hover:bg-subtle",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                on
                  ? "bg-brand text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-body-sm font-medium">
                {it.label}
                {it.tag && (
                  <span className="rounded-full bg-brand-soft px-2 py-px font-label text-[10px] tracking-label text-brand-strong uppercase">
                    {it.tag}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-caption text-muted-foreground">
                {it.text}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone ? "p-4" : "px-6 pt-6")}>
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-40 w-full max-w-5xl rounded-2xl" />
      <Skeleton className="h-40 w-full max-w-5xl rounded-2xl" />
    </div>
  )
}
