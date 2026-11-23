"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ArrowRightLeft,
  ChevronLeft,
  CircleAlert,
  Info,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  FieldError,
  Section,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { browserZone, cronText } from "@/app/(panel)/cronjobs/components/meta"
import {
  Choice,
  ScheduleField,
} from "@/app/(panel)/cronjobs/components/schedule-field"
import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import {
  type Builder,
  fromBuilder,
  toBuilder,
} from "@/app/(panel)/servers/[id]/cron/components/schedule"
import { useServers } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import {
  AsideCard,
  EditorLoading,
  EditorPage,
  SummaryList,
} from "@/components/editor-page"
import { Field } from "@/components/field"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { databasesQuery } from "@/components/panel/problems"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { ApiError, fieldErrors } from "@/lib/api"
import type {
  Database,
  DatabaseSync,
  DatabaseSyncBody,
  Table,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useDatabase,
  useDatabaseSync,
  useRunSync,
  useSaveSync,
  useSyncTables,
} from "../../../api"
import { searchEngine } from "../../../components/meta"
import { useDatabaseCan } from "../../../components/permissions"
import { LOCAL_RUNNER } from "../backups/meta"
import {
  conflictLabels,
  count,
  errorLabels,
  modeMeta,
  noKeyLabels,
  type SyncMode,
  syncModes,
  syncsHref,
  triggerText,
} from "./meta"

const LOCAL = "local"

type PairDraft = { to: string; track: string }

type Draft = {
  name: string
  mode: SyncMode
  source: string
  sourceName: string
  target: string
  targetName: string
  // Picked tables (tables / incremental), by "schema.name".
  pairs: Record<string, PairDraft>
  exclude: string[]
  insert: boolean
  update: boolean
  remove: boolean
  create: boolean
  conflict: string
  newerColumn: string
  onError: string
  noKey: string
  fullEvery: string
  batch: string
  sourceRunner: string
  targetRunner: string
  trigger: "manual" | "interval" | "schedule"
  interval: string
  cron: string
  builder: Builder
  timezone: string
  confirm: string
}

type Errors = Partial<
  Record<
    | "name"
    | "mode"
    | "source"
    | "target"
    | "pairs"
    | "what"
    | "conflict"
    | "onError"
    | "noKey"
    | "runner"
    | "when"
    | "confirm",
    string
  >
>

const refKey = (r: { name: string; schema?: string }) =>
  r.schema ? `${r.schema}.${r.name}` : r.name

const fromSaved = (s: DatabaseSync): Draft => {
  const o = s.options ?? {}
  return {
    name: s.name,
    mode: s.mode,
    source: s.source.database_id,
    sourceName: s.source.name,
    target: s.target.database_id,
    targetName: s.target.name,
    pairs: Object.fromEntries(
      (o.pairs ?? []).map((p) => [
        refKey(p.from),
        {
          to: refKey(p.to) === refKey(p.from) ? "" : refKey(p.to),
          track: p.track ?? "",
        },
      ]),
    ),
    exclude: o.exclude ?? [],
    insert: o.insert ?? true,
    update: (o.conflict ?? "overwrite") !== "keep_target",
    remove: !!o.delete,
    create: o.create ?? true,
    conflict:
      o.conflict && o.conflict !== "keep_target" ? o.conflict : "overwrite",
    newerColumn: o.newer_column ?? "",
    onError: o.on_error || "skip",
    noKey: o.no_key || "skip",
    fullEvery: String(o.full_every_hours ?? 24),
    batch: o.batch ? String(o.batch) : "",
    sourceRunner: o.source_runner || LOCAL,
    targetRunner: o.target_runner || LOCAL,
    trigger: s.trigger,
    interval: String(s.interval_minutes || 15),
    cron: s.cron || "0 3 * * *",
    builder: toBuilder(s.cron || "0 3 * * *"),
    timezone: s.timezone || browserZone(),
    confirm: "",
  }
}

const fresh = (db: Database): Draft => ({
  name: "",
  mode: ["mongodb", "elasticsearch", "meilisearch"].includes(db.engine)
    ? "replace"
    : "tables",
  source: db.id,
  sourceName: db.dbname,
  target: "",
  targetName: "",
  pairs: {},
  exclude: [],
  insert: true,
  update: true,
  remove: false,
  create: true,
  conflict: "overwrite",
  newerColumn: "",
  onError: "skip",
  noKey: "skip",
  fullEvery: "24",
  batch: "",
  sourceRunner: LOCAL,
  targetRunner: LOCAL,
  trigger: "manual",
  interval: "15",
  cron: "0 3 * * *",
  builder: toBuilder("0 3 * * *"),
  timezone: browserZone(),
  confirm: "",
})

const splitRef = (key: string) => {
  const i = key.indexOf(".")
  return i > 0
    ? { schema: key.slice(0, i), name: key.slice(i + 1) }
    : { name: key }
}

const isDestructive = (d: Draft) =>
  d.mode === "mirror" ||
  d.mode === "replace" ||
  (d.mode === "tables" && d.remove)

function toBody(d: Draft, saved?: DatabaseSync): DatabaseSyncBody {
  const rows = d.mode !== "replace"
  const pairs =
    d.mode === "tables" || d.mode === "incremental"
      ? Object.entries(d.pairs).map(([from, p]) => ({
          from: splitRef(from),
          to: splitRef(p.to.trim() || from),
          ...(d.mode === "incremental" ? { track: p.track } : {}),
        }))
      : undefined
  const conflict = d.mode === "tables" && !d.update ? "keep_target" : d.conflict
  return {
    name: d.name.trim(),
    mode: d.mode,
    source_database_id: d.source,
    source_name: d.sourceName.trim(),
    target_database_id: d.target,
    target_name: d.targetName.trim(),
    trigger: d.trigger,
    cron: d.trigger === "schedule" ? d.cron : undefined,
    timezone: d.trigger === "schedule" ? d.timezone : undefined,
    interval_minutes:
      d.trigger === "interval" ? Number(d.interval) || 0 : undefined,
    options: rows
      ? {
          pairs,
          exclude: d.mode === "mirror" ? d.exclude : undefined,
          insert: d.mode === "tables" ? d.insert : true,
          delete: d.mode === "tables" ? d.remove : d.mode === "mirror",
          create: d.create,
          conflict: d.mode === "mirror" ? "overwrite" : conflict,
          newer_column:
            conflict === "newer_wins" ? d.newerColumn.trim() : undefined,
          on_error: d.onError,
          no_key: d.noKey,
          full_every_hours:
            d.mode === "incremental" ? Number(d.fullEvery) || 0 : undefined,
          batch: Number(d.batch) || undefined,
        }
      : {
          source_runner: d.sourceRunner === LOCAL ? "" : d.sourceRunner,
          target_runner: d.targetRunner === LOCAL ? "" : d.targetRunner,
        },
    confirm: isDestructive(d) ? d.confirm : undefined,
    revision: saved?.updated_at,
  }
}

const errorKey = (field: string): keyof Errors | undefined => {
  if (field.startsWith("options.pairs")) return "pairs"
  if (field.startsWith("options.source_runner")) return "runner"
  if (field.startsWith("options.target_runner")) return "runner"
  const map: Record<string, keyof Errors> = {
    name: "name",
    mode: "mode",
    source_database_id: "source",
    source_name: "source",
    target_database_id: "target",
    target_name: "target",
    "options.insert": "what",
    "options.conflict": "conflict",
    "options.newer_column": "conflict",
    "options.on_error": "onError",
    "options.no_key": "noKey",
    cron: "when",
    timezone: "when",
    interval_minutes: "when",
    trigger: "when",
    confirm: "confirm",
  }
  return map[field]
}

export function SyncEditorFromRoute() {
  const { id, syncId } = useParams<{ id: string; syncId?: string }>()
  return <SyncEditor databaseId={id} syncId={syncId} />
}

function SyncEditor({
  databaseId,
  syncId,
}: {
  databaseId: string
  syncId?: string
}) {
  const phone = useIsPhone()
  const database = useDatabase(databaseId)
  const sync = useDatabaseSync(syncId)
  const home = syncsHref(databaseId)

  if (phone === null) return null
  const d = database.data
  if ((database.isPending || (syncId && sync.isPending)) && !d) {
    return <Loading phone={phone} />
  }
  if (syncId && sync.isPending) return <Loading phone={phone} />
  const failed = !d ? database.error : syncId && !sync.data ? sync.error : null
  if (!d || (syncId && !sync.data)) {
    const gone =
      failed instanceof ApiError && [403, 404].includes(failed.status)
    return (
      <Missing
        title={gone ? "This sync isn't here" : "Couldn't load the sync"}
        body={
          gone
            ? "It was deleted, or you don't have access to it."
            : failed?.message
        }
        href={home}
      />
    )
  }
  return (
    <Editor
      key={sync.data?.id ?? "new"}
      db={d}
      saved={sync.data}
      phone={phone}
    />
  )
}

function Editor({
  db,
  saved,
  phone,
}: {
  db: Database
  saved?: DatabaseSync
  phone: boolean
}) {
  const can = useDatabaseCan()
  const access = useAccess()
  const router = useRouter()
  const { track } = useJobActions()
  const home = syncsHref(db.id)
  const back = useBack(`/databases/${db.id}`)
  useFollowWorkspace(db.workspace_id)

  const all = useQuery(databasesQuery)
  const servers = useServers({ limit: 500 })
  const save = useSaveSync(db.workspace_id)
  const run = useRunSync()

  const [draft, setDraft] = useState<Draft>(() =>
    saved ? fromSaved(saved) : fresh(db),
  )
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  usePageCrumbs([
    { href: `/databases/${db.id}`, label: db.name },
    { href: home, label: "Syncs" },
    saved
      ? { href: `/databases/${db.id}/syncs/${saved.id}`, label: saved.name }
      : { href: `/databases/${db.id}/syncs/new`, label: "New sync" },
  ])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>, ...clear: (keyof Errors)[]) => {
    setDirty(true)
    setDraft((d) => ({ ...d, ...patch }))
    if (clear.length) {
      setErrors((e) => {
        const next = { ...e }
        for (const k of clear) delete next[k]
        return next
      })
    }
  }

  const dbs = all.data?.items ?? []
  const source = dbs.find((x) => x.id === draft.source) ?? db
  const target = dbs.find((x) => x.id === draft.target)
  const engineOf = source.engine
  const sources = dbs.filter(
    (x) =>
      x.id === draft.source ||
      (x.workspace_id === db.workspace_id &&
        [
          "postgres",
          "mysql",
          "mongodb",
          "clickhouse",
          "elasticsearch",
          "meilisearch",
        ].includes(x.engine) &&
        can(x, "operator")),
  )
  const rows = draft.mode !== "replace"
  const modes = syncModes.filter((m) => modeMeta[m].engines.includes(engineOf))

  const sourceList = useSyncTables(draft.source, "", !!draft.source)
  // Rows can also go to another engine (PostgreSQL or MySQL into
  // ClickHouse); a dump only into the same one.
  const rowsInto = sourceList.data?.rows_into ?? [engineOf]
  const targets = dbs.filter(
    (x) =>
      x.id === draft.target ||
      (x.workspace_id === db.workspace_id &&
        (x.engine === engineOf || (rows && rowsInto.includes(x.engine))) &&
        can(x, "owner")),
  )
  const targetList = useSyncTables(draft.target, "", !!draft.target)
  const tables = useSyncTables(
    draft.source,
    draft.sourceName,
    rows && !!draft.sourceName,
  )
  const tableList = tables.data?.tables ?? []

  const runnerItems = [
    { value: LOCAL, label: LOCAL_RUNNER },
    ...(servers.data?.items ?? [])
      .filter((s) =>
        atLeast(access.serverLevel(s.id, s.workspace_id), "engineer"),
      )
      .map((s) => ({ value: s.id, label: s.name })),
  ]

  function check(): Errors {
    const e: Errors = {}
    if (!draft.name.trim()) e.name = "Give it a name"
    if (!draft.sourceName.trim())
      e.source = `Pick the ${searchEngine(engineOf) ? "index" : "database"} to copy from`
    if (!draft.target) e.target = "Pick where it goes"
    else if (!draft.targetName.trim())
      e.target = `Name the target ${searchEngine(engineOf) ? "index" : "database"}`
    else if (
      draft.target === draft.source &&
      draft.targetName.trim() === draft.sourceName.trim()
    ) {
      e.target = "The source and the target are the same"
    }
    const picked = Object.entries(draft.pairs)
    if (
      (draft.mode === "tables" || draft.mode === "incremental") &&
      picked.length === 0
    ) {
      e.pairs = "Pick at least one table"
    }
    if (
      draft.mode === "incremental" &&
      picked.some(([, p]) => !p.track.trim())
    ) {
      e.pairs = "Each table needs a column that grows"
    }
    if (
      draft.mode === "tables" &&
      !draft.insert &&
      !draft.update &&
      !draft.remove
    ) {
      e.what = "With nothing to add, change or delete, it would do nothing"
    }
    if (
      rows &&
      draft.mode !== "mirror" &&
      draft.update &&
      draft.conflict === "newer_wins" &&
      !draft.newerColumn.trim()
    ) {
      e.conflict = "Name the column that says when a row changed"
    }
    if (draft.trigger === "interval") {
      const n = Number(draft.interval)
      if (!Number.isInteger(n) || n < 1) e.when = "At least every minute"
    }
    if (draft.trigger === "schedule" && !draft.cron) {
      e.when = "Pick a schedule"
    }
    if (needsConfirm && draft.confirm !== draft.targetName.trim()) {
      e.confirm = `Type ${draft.targetName.trim() || "the target's name"}`
    }
    return e
  }

  const destructive = isDestructive(draft)
  // Asked again only when the danger is new: like the backend.
  const needsConfirm =
    destructive &&
    (!saved ||
      !(
        saved.mode === "mirror" ||
        saved.mode === "replace" ||
        (saved.mode === "tables" && saved.options?.delete)
      ) ||
      saved.target.database_id !== draft.target ||
      saved.target.name !== draft.targetName.trim())

  function submit(thenCompare = false) {
    const e = check()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0] ?? "Check the form")
      return
    }
    save.mutate(
      { id: saved?.id, body: toBody(draft, saved) },
      {
        onSuccess: (s) => {
          setDirty(false)
          if (!thenCompare) {
            router.replace(home)
            toast.success(saved ? "Sync saved" : `${s.name} is ready`)
            return
          }
          run.mutate(
            { id: s.id, dry: true },
            {
              onSuccess: (r) => {
                track(r.job)
                router.replace(syncsHref(db.id, r.run.id))
              },
              onError: (err) => {
                toast.error(err.message)
                router.replace(home)
              },
            },
          )
        },
        onError: (err) => {
          const mapped: Errors = {}
          for (const [k, v] of Object.entries(fieldErrors(err))) {
            const key = errorKey(k)
            if (key && !mapped[key]) mapped[key] = v
          }
          setErrors(mapped)
          toast.error(Object.values(mapped)[0] ?? err.message)
        },
      },
    )
  }

  if (!can(db, "operator")) {
    return (
      <Missing
        title="You can't change syncs here"
        body="Making and editing them needs Operator access to the source and Owner access to the target."
        href={home}
      />
    )
  }

  const meta = modeMeta[draft.mode]
  const pickedCount = Object.keys(draft.pairs).length
  const whenText =
    draft.trigger === "schedule"
      ? cronText(draft.cron)
      : triggerText(
          {
            trigger: draft.trigger,
            cron: draft.cron,
            interval_minutes: Number(draft.interval) || 0,
          },
          cronText,
        )
  const summaryRows: [string, ReactNode, boolean?][] = [
    ["Kind", meta.label],
    [
      "From",
      draft.sourceName ? `${source.name} › ${draft.sourceName}` : "Not picked",
    ],
    [
      "To",
      target && draft.targetName
        ? `${target.name} › ${draft.targetName}`
        : "Not picked",
    ],
    [
      "What",
      draft.mode === "mirror"
        ? draft.exclude.length
          ? `Every table but ${draft.exclude.length}`
          : "Every table"
        : draft.mode === "replace"
          ? "The whole database"
          : `${pickedCount} table${pickedCount === 1 ? "" : "s"}`,
    ],
    ["When", whenText],
    [
      "Runs as",
      saved?.runs_as
        ? `${saved.runs_as} now; once you save, you`
        : "You: whoever saves it last",
    ],
  ]

  const togglePair = (key: string, on: boolean, t?: Table) =>
    set(
      {
        pairs: on
          ? {
              ...draft.pairs,
              [key]: { to: "", track: t ? guessTrack(t) : "" },
            }
          : Object.fromEntries(
              Object.entries(draft.pairs).filter(([k]) => k !== key),
            ),
      },
      "pairs",
    )

  const sections = (
    <>
      <Section
        title="Kind"
        hint="How the target is brought in line with the source."
        phone={phone}
      >
        <div className="grid gap-2 md:grid-cols-2">
          {syncModes.map((m) => {
            const M = modeMeta[m]
            const Icon = M.icon
            return (
              <OptionCard
                key={m}
                icon={<Icon />}
                title={M.label}
                hint={M.short}
                tag={M.destructive ? "Can delete" : undefined}
                selected={draft.mode === m}
                disabled={!modes.includes(m)}
                onSelect={() => set({ mode: m }, "mode", "pairs", "confirm")}
              />
            )
          })}
        </div>
        <Note icon={<Info />}>{meta.long}</Note>
        <FieldError text={errors.mode} />
      </Section>

      <Section title="From and to" phone={phone}>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start">
          <div className="grid min-w-0 gap-3">
            <Field label="Source">
              {(p) => (
                <Choice
                  id={p.id}
                  phone={phone}
                  value={draft.source}
                  onChange={(v) =>
                    set(
                      {
                        source: v,
                        sourceName: dbs.find((x) => x.id === v)?.dbname ?? "",
                        pairs: {},
                        exclude: [],
                        ...(dbs.find((x) => x.id === v)?.engine !==
                        target?.engine
                          ? { target: "", targetName: "" }
                          : {}),
                      },
                      "source",
                      "pairs",
                    )
                  }
                  items={sources.map((x) => ({ value: x.id, label: x.name }))}
                />
              )}
            </Field>
            <NameField
              label={searchEngine(engineOf) ? "Index on it" : "Database on it"}
              value={draft.sourceName}
              names={sourceList.data?.databases ?? []}
              loading={sourceList.isFetching}
              error={errors.source}
              onRefresh={() => void sourceList.refetch()}
              onChange={(v) =>
                set(
                  { sourceName: v, pairs: {}, exclude: [] },
                  "source",
                  "pairs",
                )
              }
            />
          </div>
          <span className="hidden size-10 items-center justify-center self-center rounded-full bg-muted text-muted-foreground md:flex">
            <ArrowRightLeft className="size-4" />
          </span>
          <div className="grid min-w-0 gap-3">
            <Field label="Target">
              {(p) =>
                targets.length === 0 ? (
                  <p
                    id={p.id}
                    className="rounded-lg border border-dashed border-border px-3 py-2.5 text-body-sm text-muted-foreground"
                  >
                    No other {engineOf} database you own here.
                  </p>
                ) : (
                  <Choice
                    id={p.id}
                    phone={phone}
                    value={draft.target || "-"}
                    onChange={(v) =>
                      set(
                        {
                          target: v,
                          targetName:
                            draft.targetName ||
                            dbs.find((x) => x.id === v)?.dbname ||
                            "",
                        },
                        "target",
                        "confirm",
                      )
                    }
                    items={[
                      ...(draft.target
                        ? []
                        : [{ value: "-", label: "Pick a database" }]),
                      ...targets.map((x) => ({ value: x.id, label: x.name })),
                    ]}
                  />
                )
              }
            </Field>
            <NameField
              label={searchEngine(engineOf) ? "Index on it" : "Database on it"}
              value={draft.targetName}
              names={targetList.data?.databases ?? []}
              loading={targetList.isFetching}
              error={errors.target}
              hint="A name that isn't there yet is created."
              onRefresh={() => void targetList.refetch()}
              onChange={(v) => set({ targetName: v }, "target", "confirm")}
            />
          </div>
        </div>
      </Section>

      {(draft.mode === "tables" || draft.mode === "incremental") && (
        <Section
          title="Tables"
          hint={
            draft.mode === "incremental"
              ? "Pick each table and the column that grows with new rows: an id or an updated_at time."
              : "Pick the tables to compare. A different target name copies into another table."
          }
          phone={phone}
        >
          <TablePicker
            loading={tables.isFetching}
            error={tables.error?.message}
            tables={tableList}
            needName={!draft.sourceName}
            onRefresh={() => void tables.refetch()}
            picked={draft.pairs}
            onToggle={togglePair}
            onAll={(on) =>
              set(
                {
                  pairs: on
                    ? Object.fromEntries(
                        tableList.map((t) => [
                          refKey(t),
                          draft.pairs[refKey(t)] ?? {
                            to: "",
                            track: guessTrack(t),
                          },
                        ]),
                      )
                    : {},
                },
                "pairs",
              )
            }
            onPair={(key, p) =>
              set(
                {
                  pairs: {
                    ...draft.pairs,
                    [key]: { ...draft.pairs[key], ...p },
                  },
                },
                "pairs",
              )
            }
            incremental={draft.mode === "incremental"}
          />
          <FieldError text={errors.pairs} />
        </Section>
      )}

      {draft.mode === "mirror" && (
        <Section
          title="Tables"
          hint="Every table is mirrored. Tick the ones to leave out."
          phone={phone}
        >
          <TablePicker
            loading={tables.isFetching}
            error={tables.error?.message}
            tables={tableList}
            needName={!draft.sourceName}
            onRefresh={() => void tables.refetch()}
            exclude={draft.exclude}
            onExclude={(exclude) => set({ exclude })}
          />
        </Section>
      )}

      {rows && (
        <Section
          title="Rows"
          hint="Rows are matched by their primary key (or a unique one)."
          phone={phone}
        >
          {draft.mode === "tables" && (
            <div className="grid gap-1">
              <SwitchRow
                id="sync-insert"
                label="Add new rows"
                hint="Rows on the source that the target doesn't have."
                checked={draft.insert}
                onChange={(insert) => set({ insert }, "what")}
              />
              <SwitchRow
                id="sync-update"
                label="Update rows that differ"
                hint="Off = the target's copy of a row is never touched."
                checked={draft.update}
                onChange={(update) => set({ update }, "what")}
              />
              <SwitchRow
                id="sync-delete"
                label="Delete extra rows"
                hint="Rows on the target the source doesn't have. Asks you to confirm."
                checked={draft.remove}
                onChange={(remove) => set({ remove }, "what", "confirm")}
              />
              <FieldError text={errors.what} />
            </div>
          )}
          {draft.mode !== "mirror" && draft.update && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="When a row differs" error={errors.conflict}>
                {(p) => (
                  <Choice
                    id={p.id}
                    phone={phone}
                    value={draft.conflict}
                    onChange={(conflict) => set({ conflict }, "conflict")}
                    items={Object.entries(conflictLabels)
                      .filter(([k]) => k !== "keep_target")
                      .map(([value, label]) => ({ value, label }))}
                  />
                )}
              </Field>
              {draft.conflict === "newer_wins" && (
                <Field
                  label="Column that says when it changed"
                  hint="Like updated_at. The later value wins."
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={draft.newerColumn}
                      placeholder="updated_at"
                      autoCapitalize="none"
                      spellCheck={false}
                      onChange={(e) =>
                        set({ newerColumn: e.target.value }, "conflict")
                      }
                    />
                  )}
                </Field>
              )}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="When the target refuses a row" error={errors.onError}>
              {(p) => (
                <Choice
                  id={p.id}
                  phone={phone}
                  value={draft.onError}
                  onChange={(onError) => set({ onError }, "onError")}
                  items={Object.entries(errorLabels).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              )}
            </Field>
            <Field
              label="A table without a key"
              hint="Rows can't be matched without one."
              error={errors.noKey}
            >
              {(p) => (
                <Choice
                  id={p.id}
                  phone={phone}
                  value={draft.noKey}
                  onChange={(noKey) => set({ noKey }, "noKey")}
                  items={Object.entries(noKeyLabels).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              )}
            </Field>
          </div>
          {draft.mode !== "mirror" && (
            <SwitchRow
              id="sync-create"
              label="Create missing tables"
              hint="A table that isn't on the target is made from the source's columns."
              checked={draft.create}
              onChange={(create) => set({ create })}
            />
          )}
          {draft.mode === "incremental" && (
            <Field
              label="Full check every (hours)"
              hint="Catches deleted and back-dated rows. 0 = never."
            >
              {(p) => (
                <Input
                  {...p}
                  value={draft.fullEvery}
                  inputMode="numeric"
                  className="md:max-w-40"
                  onChange={(e) => set({ fullEvery: e.target.value })}
                />
              )}
            </Field>
          )}
        </Section>
      )}

      {draft.mode === "replace" &&
        !searchEngine(engineOf) &&
        (!source.server_id || !target?.server_id) && (
          <Section
            title="Where it runs"
            hint="The dump and load tools run here. A database reached through a server always uses that server."
            phone={phone}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {!source.server_id && (
                <Field label="Dumps the source">
                  {(p) => (
                    <Choice
                      id={p.id}
                      phone={phone}
                      value={draft.sourceRunner}
                      onChange={(sourceRunner) =>
                        set({ sourceRunner }, "runner")
                      }
                      items={runnerItems}
                    />
                  )}
                </Field>
              )}
              {target && !target.server_id && (
                <Field label="Loads the target">
                  {(p) => (
                    <Choice
                      id={p.id}
                      phone={phone}
                      value={draft.targetRunner}
                      onChange={(targetRunner) =>
                        set({ targetRunner }, "runner")
                      }
                      items={runnerItems}
                    />
                  )}
                </Field>
              )}
            </div>
            <FieldError text={errors.runner} />
          </Section>
        )}

      <Section title="When" phone={phone}>
        <div className="grid gap-2 md:grid-cols-3">
          {(
            [
              ["manual", "By hand", "Only when you press Run."],
              [
                "interval",
                "Every few minutes",
                "Runs again N minutes after it ends.",
              ],
              ["schedule", "On a schedule", "At set times, like cron."],
            ] as const
          ).map(([v, title, hint]) => (
            <OptionCard
              key={v}
              title={title}
              hint={hint}
              selected={draft.trigger === v}
              onSelect={() => set({ trigger: v }, "when")}
            />
          ))}
        </div>
        {draft.trigger === "interval" && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Every (minutes)" error={errors.when}>
              {(p) => (
                <Input
                  {...p}
                  value={draft.interval}
                  inputMode="numeric"
                  className="w-32"
                  onChange={(e) => set({ interval: e.target.value }, "when")}
                />
              )}
            </Field>
            {[5, 15, 60, 360].map((m) => (
              <Button
                key={m}
                type="button"
                variant={draft.interval === String(m) ? "secondary" : "outline"}
                className="h-11 md:h-10"
                onClick={() => set({ interval: String(m) }, "when")}
              >
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </Button>
            ))}
          </div>
        )}
        {draft.trigger === "schedule" && (
          <ScheduleField
            builder={draft.builder}
            onChange={(builder) =>
              set({ builder, cron: fromBuilder(builder) }, "when")
            }
            timezone={draft.timezone}
            onTimezone={(timezone) => set({ timezone })}
            error={errors.when}
            phone={phone}
          />
        )}
      </Section>

      <Section title="Name" phone={phone}>
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={draft.name}
              placeholder={
                draft.sourceName && draft.targetName
                  ? `${draft.sourceName} to ${target?.name ?? "target"}`
                  : "Copy to staging"
              }
              maxLength={100}
              onChange={(e) => set({ name: e.target.value }, "name")}
            />
          )}
        </Field>
      </Section>

      {needsConfirm && (
        <Section title="Confirm" phone={phone}>
          <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="grid min-w-0 flex-1 gap-3">
              <p className="text-body-sm">
                {draft.mode === "replace"
                  ? "Each run drops the target database and loads it again."
                  : "Rows on the target that the source doesn't have are deleted."}{" "}
                Type{" "}
                <span className="font-mono">{draft.targetName || "…"}</span> to
                confirm.
              </p>
              <Input
                aria-label="Target database name"
                value={draft.confirm}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={errors.confirm ? true : undefined}
                onChange={(e) => set({ confirm: e.target.value }, "confirm")}
              />
              <FieldError text={errors.confirm} />
            </div>
          </div>
        </Section>
      )}
    </>
  )

  const busy = save.isPending || run.isPending
  const canSave = !busy && (!saved || dirty)

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
            {saved ? "Edit sync" : "New sync"}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={!canSave}
            onClick={() => submit()}
          >
            {save.isPending ? "Saving…" : saved ? "Save" : "Create"}
          </Button>
        </header>
        <div className="flex flex-col">{sections}</div>
        <div className="px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={busy}
            onClick={() => submit(true)}
          >
            Save and compare
          </Button>
        </div>
      </div>
    )
  }

  return (
    <EditorPage
      icon={<ArrowRightLeft />}
      title={draft.name.trim() || saved?.name || "New sync"}
      dirty={dirty}
      status={`${db.name} · ${
        dirty
          ? "Unsaved changes"
          : saved
            ? `Saved ${timeAgo(saved.updated_at)}`
            : "Not saved yet"
      }`}
      onSave={canSave ? () => submit() : undefined}
      aside={
        <AsideCard title="Summary">
          <SummaryList rows={summaryRows} />
        </AsideCard>
      }
      actions={
        <>
          <Button
            variant="outline"
            className="h-9"
            render={<Link href={home} />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="h-9"
            disabled={busy}
            title="Save, then see what it would change without writing anything"
            onClick={() => submit(true)}
          >
            Save and compare
          </Button>
          <Button className="h-9" disabled={!canSave} onClick={() => submit()}>
            {save.isPending ? "Saving…" : saved ? "Save" : "Create sync"}
          </Button>
        </>
      }
    >
      {sections}
    </EditorPage>
  )
}

// The usual column that grows: an identity/serial key, else a time column.
function guessTrack(t: Table) {
  const cols = t.columns
  const key = t.key.length === 1 ? cols.find((c) => c.name === t.key[0]) : null
  if (key && (key.identity || key.serial || key.kind === "number"))
    return key.name
  return (
    cols.find((c) =>
      /^(updated|modified|changed)_?(at|on|time)?$/i.test(c.name),
    )?.name ??
    cols.find((c) => /^(created)_?(at|on)?$/i.test(c.name))?.name ??
    ""
  )
}

function NameField({
  label,
  value,
  names,
  loading,
  error,
  hint,
  onRefresh,
  onChange,
}: {
  label: string
  value: string
  names: string[]
  loading: boolean
  error?: string
  hint?: string
  onRefresh: () => void
  onChange: (v: string) => void
}) {
  const listId = `sync-names-${label}-${names.length}`
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <div className="flex gap-2">
          <Input
            {...p}
            value={value}
            list={listId}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            placeholder={names[0] ?? "app"}
            onChange={(e) => onChange(e.target.value)}
          />
          <datalist id={listId}>
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0 md:size-10"
            aria-label="Read the list again"
            title="Read the list again"
            disabled={loading}
            onClick={onRefresh}
          >
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      )}
    </Field>
  )
}

function TablePicker({
  loading,
  error,
  tables,
  needName,
  onRefresh,
  picked,
  onToggle,
  onAll,
  onPair,
  incremental,
  exclude,
  onExclude,
}: {
  loading: boolean
  error?: string
  tables: Table[]
  needName: boolean
  onRefresh: () => void
  picked?: Record<string, PairDraft>
  onToggle?: (key: string, on: boolean, t?: Table) => void
  onAll?: (on: boolean) => void
  onPair?: (key: string, p: Partial<PairDraft>) => void
  incremental?: boolean
  exclude?: string[]
  onExclude?: (v: string[]) => void
}) {
  const [q, setQ] = useState("")
  if (needName) {
    return (
      <p className="text-body-sm text-muted-foreground">
        Pick the source database first.
      </p>
    )
  }
  if (loading && tables.length === 0) {
    return (
      <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Reading the tables…
      </p>
    )
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 text-body-sm text-destructive">
        <CircleAlert className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">{error}</span>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Try again
        </Button>
      </div>
    )
  }
  const shown = tables.filter((t) =>
    refKey(t).toLowerCase().includes(q.trim().toLowerCase()),
  )
  const excluding = !!exclude
  const allOn = excluding
    ? exclude.length === 0
    : tables.length > 0 && tables.every((t) => picked?.[refKey(t)])

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${tables.length} tables`}
          className="h-9 min-w-0 flex-1 max-md:h-11"
          aria-label="Search tables"
        />
        {!excluding && (
          <Button
            variant="outline"
            className="h-9 max-md:h-11"
            onClick={() => onAll?.(!allOn)}
          >
            {allOn ? "Pick none" : "Pick all"}
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          className="size-9 max-md:size-11"
          aria-label="Read the tables again"
          onClick={onRefresh}
        >
          <RefreshCw className={cn(loading && "animate-spin")} />
        </Button>
      </div>
      <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto rounded-xl border border-border">
        {shown.length === 0 && (
          <li className="px-4 py-6 text-center text-body-sm text-muted-foreground">
            {tables.length === 0 ? "No tables in it yet." : "Nothing matches."}
          </li>
        )}
        {shown.map((t) => {
          const key = refKey(t)
          const on = excluding ? !exclude.includes(key) : !!picked?.[key]
          const pair = picked?.[key]
          return (
            <li key={key} className="grid min-w-0 gap-2 px-3 py-2.5">
              <label className="flex min-h-9 min-w-0 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-[var(--color-brand)]"
                  checked={on}
                  onChange={(e) =>
                    excluding
                      ? onExclude?.(
                          e.target.checked
                            ? exclude.filter((x) => x !== key)
                            : [...exclude, key],
                        )
                      : onToggle?.(key, e.target.checked, t)
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-body-sm">
                    {key}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {count(t.rows)} rows · {t.columns.length} columns
                    {t.key_from === "none"
                      ? " · no key"
                      : ` · key ${t.key.join(", ")}`}
                  </span>
                </span>
              </label>
              {pair && !excluding && (
                <div className="grid gap-2 ps-7 md:grid-cols-2">
                  <Input
                    value={pair.to}
                    placeholder={`Into ${key}`}
                    aria-label={`Target table for ${key}`}
                    autoCapitalize="none"
                    spellCheck={false}
                    className="h-9 max-md:h-11"
                    onChange={(e) => onPair?.(key, { to: e.target.value })}
                  />
                  {incremental && (
                    <select
                      aria-label={`Column that grows in ${key}`}
                      value={pair.track}
                      onChange={(e) => onPair?.(key, { track: e.target.value })}
                      className={cn(
                        "h-9 rounded-lg border border-input bg-card px-2 text-body-sm max-md:h-11",
                        !pair.track && "border-destructive",
                      )}
                    >
                      <option value="">Column that grows…</option>
                      {t.columns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex min-h-11 items-start justify-between gap-4 py-1">
      <label htmlFor={id}>
        <span className="block text-body-sm font-medium">{label}</span>
        <span className="block text-caption text-muted-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function OptionCard({
  icon,
  title,
  hint,
  tag,
  selected,
  disabled,
  onSelect,
}: {
  icon?: ReactNode
  title: string
  hint: string
  tag?: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 items-start gap-3 rounded-2xl border border-border bg-card p-4 text-start transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "hover:bg-subtle disabled:pointer-events-none disabled:opacity-50",
        "aria-pressed:border-primary aria-pressed:bg-brand-soft",
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:size-4",
            selected && "bg-card text-brand-strong",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "text-body-sm font-medium",
              selected && "text-brand-strong",
            )}
          >
            {title}
          </span>
          {tag && (
            <span className="rounded-full bg-destructive/10 px-2 text-caption text-destructive">
              {tag}
            </span>
          )}
        </span>
        <span className="block text-caption text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

function Note({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground [&>svg]:mt-px [&>svg]:size-4 [&>svg]:shrink-0">
      {icon}
      <p>{children}</p>
    </div>
  )
}

function Missing({
  title,
  body,
  href,
}: {
  title: string
  body?: string
  href: string
}) {
  return (
    <div className="px-4 pt-10 md:px-6">
      <Empty
        icon={ArrowRightLeft}
        title={title}
        body={body}
        action={
          <Button
            variant="outline"
            className="h-11 w-full md:h-9 md:w-auto"
            render={<Link href={href} />}
            nativeButton={false}
          >
            Back to syncs
          </Button>
        }
      />
    </div>
  )
}

function Loading({ phone }: { phone: boolean }) {
  if (!phone) return <EditorLoading />
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}
