"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Archive,
  CalendarClock,
  CalendarRange,
  ChevronLeft,
  DatabaseBackup,
  Database as DatabaseIcon,
  Infinity as Forever,
  Info,
  Layers,
  ListChecks,
  Plus,
  RefreshCw,
  Regex,
  Settings2,
  X,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { usePreview } from "@/app/(panel)/cronjobs/api"
import {
  browserZone,
  cronText,
  formatInZone,
} from "@/app/(panel)/cronjobs/components/meta"
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
import { Field } from "@/components/field"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { storagesQuery } from "@/components/panel/problems"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { ApiError, fieldErrors } from "@/lib/api"
import type {
  BackupPlan,
  BackupPlanBody,
  Database,
  LocalTools,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useBackupOptions,
  useBackupPlan,
  useBackupPlans,
  useDatabase,
  useRunPlan,
  useSavePlan,
} from "../../../api"
import { useDatabaseCan } from "../../../components/permissions"
import {
  backupsHref,
  folderProblem,
  folderTokens,
  LOCAL_RUNNER,
  type Method,
  matching,
  methodText,
  patternProblem,
  presetOf,
  type Retention,
  resolveFolder,
  retentionText,
  type Selection,
  schedulePresets,
  selectionText,
  slug,
} from "./meta"

const MAX_STORAGES = 10

type Draft = {
  name: string
  selection: Selection
  targets: string[]
  pattern: string
  method: Method
  fullEvery: string
  storages: string[]
  runner: string
  folder: string
  // "" = only by hand.
  cron: string
  builder: Builder
  timezone: string
  retention: Retention
  keepDays: string
  gfsDaily: string
  gfsWeekly: string
  gfsMonthly: string
  ownLogin: boolean
  username: string
  password: string
  enabled: boolean
}

const fromSaved = (p: BackupPlan): Draft => ({
  name: p.name,
  selection: p.selection,
  targets: p.targets,
  pattern: p.pattern,
  method: p.method,
  fullEvery: String(p.full_every_days || 7),
  storages: p.storages.map((s) => s.id),
  runner: p.runner_server_id ?? "",
  folder: p.folder,
  cron: p.cron,
  builder: toBuilder(p.cron || "0 2 * * *"),
  timezone: p.timezone || browserZone(),
  retention: p.retention,
  keepDays: String(p.keep_days || 14),
  gfsDaily: String(p.gfs_daily),
  gfsWeekly: String(p.gfs_weekly),
  gfsMonthly: String(p.gfs_monthly),
  ownLogin: !!p.username,
  username: p.username,
  password: "",
  enabled: p.enabled,
})

const fresh = (name: string): Draft => ({
  name,
  selection: "all",
  targets: [],
  pattern: "",
  method: "full",
  fullEvery: "7",
  storages: [],
  runner: "",
  folder: "/backups/{year}-{month}-{day}",
  cron: "0 2 * * *",
  builder: toBuilder("0 2 * * *"),
  timezone: browserZone(),
  retention: "gfs",
  keepDays: "14",
  gfsDaily: "3",
  gfsWeekly: "4",
  gfsMonthly: "12",
  ownLogin: false,
  username: "",
  password: "",
  enabled: true,
})

// What the runner field says under it: for Morche's own machine, which
// tools it still lacks.
function runnerHint(runner: string, local?: LocalTools) {
  if (runner) {
    return "This server runs the dump: it needs the database's tools and a way to reach it."
  }
  if (local && !local.supported) return local.note
  if (local?.missing.length) {
    return `Morche's own machine runs it, but it lacks ${local.missing.join(", ")}. Install them there (the Docker image has them), or choose a server.`
  }
  return "Morche's own machine runs the dump, the same way it reaches the database to watch it."
}

const num = (s: string) => (s.trim() === "" ? Number.NaN : Number(s))

function toBody(d: Draft, db: Database): BackupPlanBody {
  return {
    name: d.name.trim(),
    selection: db.engine === "redis" ? "all" : d.selection,
    targets: d.selection === "selected" ? d.targets : [],
    pattern: d.selection === "pattern" ? d.pattern.trim() : "",
    method: d.method,
    full_every_days: num(d.fullEvery) || 7,
    storage_ids: d.storages,
    runner_server_id: db.server_id ? undefined : d.runner || undefined,
    folder: d.folder.trim(),
    cron: d.cron.trim(),
    timezone: d.timezone,
    enabled: d.enabled,
    retention: d.retention,
    keep_days: num(d.keepDays) || 14,
    gfs_daily: num(d.gfsDaily) || 0,
    gfs_weekly: num(d.gfsWeekly) || 0,
    gfs_monthly: num(d.gfsMonthly) || 0,
    username: d.ownLogin ? d.username.trim() : "",
    password: d.ownLogin ? d.password : "",
  }
}

type Errors = Partial<
  Record<
    | "name"
    | "selection"
    | "targets"
    | "pattern"
    | "method"
    | "storages"
    | "runner"
    | "folder"
    | "cron"
    | "retention"
    | "username"
    | "password",
    string
  >
>

// Where each 422 location lands in the form.
const errorKey: Record<string, keyof Errors> = {
  name: "name",
  selection: "selection",
  targets: "targets",
  pattern: "pattern",
  method: "method",
  full_every_days: "method",
  storage_ids: "storages",
  runner_server_id: "runner",
  folder: "folder",
  cron: "cron",
  timezone: "cron",
  retention: "retention",
  keep_days: "retention",
  gfs_daily: "retention",
  gfs_weekly: "retention",
  gfs_monthly: "retention",
  username: "username",
  password: "password",
}

// /databases/[id]/backups/new and /databases/[id]/backups/plans/[planId].
export function PlanEditorFromRoute() {
  const { id, planId } = useParams<{ id: string; planId?: string }>()
  return <PlanEditor databaseId={id} planId={planId} />
}

function PlanEditor({
  databaseId,
  planId,
}: {
  databaseId: string
  planId?: string
}) {
  const phone = useIsPhone()
  const database = useDatabase(databaseId)
  const plan = useBackupPlan(planId)
  const plans = useBackupPlans(databaseId)
  const home = backupsHref(databaseId)

  if (phone === null) return null
  const d = database.data
  const loading =
    database.isPending || (planId && plan.isPending) || plans.isPending
  if (loading && !(d && (!planId || plan.data))) {
    return <Loading phone={phone} />
  }
  const failed = !d ? database.error : planId && !plan.data ? plan.error : null
  if (!d || (planId && !plan.data)) {
    const gone =
      failed instanceof ApiError && [403, 404].includes(failed.status)
    return (
      <Missing
        title={
          gone
            ? planId
              ? "This plan isn't here"
              : "This database isn't here"
            : "Couldn't load the plan"
        }
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
      key={plan.data?.id ?? "new"}
      database={d}
      saved={plan.data}
      count={plans.data?.length ?? 0}
      phone={phone}
    />
  )
}

function Editor({
  database: db,
  saved,
  count,
  phone,
}: {
  database: Database
  saved?: BackupPlan
  count: number
  phone: boolean
}) {
  const can = useDatabaseCan()
  const owner = can(db, "owner")
  const access = useAccess()
  const router = useRouter()
  const { track } = useJobActions()
  const home = backupsHref(db.id)
  const back = useBack(`/databases/${db.id}`)
  useFollowWorkspace(db.workspace_id)

  const options = useBackupOptions(db.id, owner)
  const storages = useQuery(storagesQuery)
  const servers = useServers({ limit: 500 })
  const save = useSavePlan(db.id)
  const run = useRunPlan()

  const [draft, setDraft] = useState<Draft>(() =>
    saved ? fromSaved(saved) : fresh(`Backup #${count + 1}`),
  )
  const [touched, setTouched] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [builderOpen, setBuilderOpen] = useState(
    () => !!saved?.cron && !presetOf(saved.cron),
  )
  const dirty = touched

  usePageCrumbs([
    { href: `/databases/${db.id}`, label: db.name },
    { href: home, label: "Backups" },
    saved
      ? {
          href: `/databases/${db.id}/backups/plans/${saved.id}`,
          label: saved.name,
        }
      : { href: `/databases/${db.id}/backups/new`, label: "New plan" },
  ])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (patch: Partial<Draft>, ...clear: (keyof Errors)[]) => {
    setTouched(true)
    setDraft((d) => ({ ...d, ...patch }))
    if (clear.length) {
      setErrors((e) => {
        const next = { ...e }
        for (const k of clear) delete next[k]
        return next
      })
    }
  }

  // Storages a plan can write to: in this workspace, not read-only, Engineer.
  const storageList = useMemo(
    () =>
      (storages.data?.items ?? []).filter(
        (s) =>
          draft.storages.includes(s.id) ||
          (s.workspace_id === db.workspace_id &&
            !s.read_only &&
            atLeast(access.storageLevel(s.id, s.workspace_id), "engineer")),
      ),
    [storages.data, draft.storages, db.workspace_id, access],
  )
  const storageName = (id: string) =>
    storages.data?.items.find((s) => s.id === id)?.name ??
    saved?.storages.find((s) => s.id === id)?.name ??
    "Removed storage"

  const runnerItems = (servers.data?.items ?? [])
    .filter(
      (s) =>
        s.id === draft.runner ||
        atLeast(access.serverLevel(s.id, s.workspace_id), "engineer"),
    )
    .map((s) => ({ value: s.id, label: s.name }))

  const opts = options.data
  const selections = opts?.selections ?? ["all", "selected", "pattern"]
  const databases = opts?.databases ?? []
  const incremental = opts?.incremental
  const local = opts?.local

  function check(): Errors {
    const e: Errors = {}
    if (!draft.name.trim()) e.name = "Give it a name"
    if (db.engine !== "redis") {
      if (draft.selection === "selected" && draft.targets.length === 0) {
        e.targets = "Pick at least one database"
      }
      if (draft.selection === "pattern") {
        const p = patternProblem(draft.pattern)
        if (p) e.pattern = p
      }
    }
    if (draft.method === "incremental") {
      const n = num(draft.fullEvery)
      if (!Number.isInteger(n) || n < 1 || n > 365) {
        e.method = "A full backup every 1 to 365 days"
      }
    }
    if (draft.storages.length === 0) e.storages = "Pick at least one storage"
    if (!db.server_id && !draft.runner && local && !local.supported) {
      e.runner = "Choose the server that runs it"
    }
    const f = folderProblem(draft.folder)
    if (f) e.folder = f
    if (draft.retention === "days") {
      const n = num(draft.keepDays)
      if (!Number.isInteger(n) || n < 1 || n > 3650) {
        e.retention = "Between 1 and 3650 days"
      }
    }
    if (draft.retention === "gfs") {
      const tiers = [draft.gfsDaily, draft.gfsWeekly, draft.gfsMonthly].map(
        (v) => num(v || "0"),
      )
      if (tiers.some((n) => !Number.isInteger(n) || n < 0 || n > 1000)) {
        e.retention = "Each tier is a whole number from 0 to 1000"
      }
    }
    if (draft.ownLogin && !draft.username.trim()) {
      e.username = "Enter the login"
    }
    if (draft.ownLogin && !saved?.has_password && !draft.password) {
      e.password = "Enter its password"
    }
    return e
  }

  function submit() {
    const e = check()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0] ?? "Check the form")
      return
    }
    save.mutate(
      { id: saved?.id, body: toBody(draft, db) },
      {
        onSuccess: (plan) => {
          setTouched(false)
          router.replace(home)
          if (saved) {
            toast.success("Plan saved")
            return
          }
          toast.success(`${plan.name} is ready`, {
            action: plan.problem
              ? undefined
              : {
                  label: "Back up now",
                  onClick: () =>
                    run.mutate(plan.id, {
                      onSuccess: (job) => track(job),
                      onError: (err) => toast.error(err.message),
                    }),
                },
          })
        },
        onError: (err) => {
          const fields = fieldErrors(err)
          const mapped: Errors = {}
          for (const [k, v] of Object.entries(fields)) {
            const key = errorKey[k.split(".")[0] ?? k]
            if (key && !mapped[key]) mapped[key] = v
          }
          setErrors(mapped)
          toast.error(Object.values(mapped)[0] ?? err.message)
        },
      },
    )
  }

  if (!owner) {
    return (
      <Missing
        title="You can't change backup plans here"
        body="Making and editing them needs Owner access to this database."
        href={home}
      />
    )
  }

  const now = new Date()
  const folderPreview =
    `${resolveFolder(draft.folder, now)}/${slug(db.name)}/`.replace(
      /\/{2,}/g,
      "/",
    )
  const scheduleLabel = scheduleText(draft.cron)
  const summary = [
    scheduleLabel,
    `→ ${
      draft.storages.length === 0
        ? "no storage yet"
        : draft.storages.map(storageName).join(", ")
    }`,
  ].join(" ")
  const summaryTail = [
    db.engine === "redis"
      ? "Everything"
      : draft.selection === "selected"
        ? `${draft.targets.length} database${draft.targets.length === 1 ? "" : "s"}`
        : selectionText({ ...draft, targets: draft.targets }, db.engine),
    draft.method === "incremental" ? "Incremental" : "",
    retentionText({
      retention: draft.retention,
      keep_days: num(draft.keepDays) || 0,
      gfs_daily: num(draft.gfsDaily) || 0,
      gfs_weekly: num(draft.gfsWeekly) || 0,
      gfs_monthly: num(draft.gfsMonthly) || 0,
    }),
  ]
    .filter(Boolean)
    .join(" · ")

  const sections = (
    <>
      <Section title="Name" phone={phone}>
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={draft.name}
              placeholder={`Backup #${count + 1}`}
              maxLength={100}
              enterKeyHint="next"
              onChange={(e) => set({ name: e.target.value }, "name")}
            />
          )}
        </Field>
      </Section>

      {db.engine !== "redis" && (
        <Section
          title="What to back up"
          hint="Each database is dumped to its own file."
          phone={phone}
        >
          <div className="grid gap-2 md:grid-cols-3">
            <OptionCard
              icon={<DatabaseIcon />}
              title="All databases"
              hint="Every one there is at run time, new ones included."
              selected={draft.selection === "all"}
              disabled={!selections.includes("all")}
              onSelect={() =>
                set({ selection: "all" }, "selection", "targets", "pattern")
              }
            />
            <OptionCard
              icon={<ListChecks />}
              title="Selected"
              hint="Only the ones you tick."
              selected={draft.selection === "selected"}
              disabled={!selections.includes("selected")}
              onSelect={() => set({ selection: "selected" }, "selection")}
            />
            <OptionCard
              icon={<Regex />}
              title="Pattern"
              hint="Names matching a regular expression."
              selected={draft.selection === "pattern"}
              disabled={!selections.includes("pattern")}
              onSelect={() => set({ selection: "pattern" }, "selection")}
            />
          </div>
          {opts?.selection_note && (
            <Note icon={<Info />}>{opts.selection_note}</Note>
          )}
          <FieldError text={errors.selection} />
          {draft.selection === "selected" && (
            <DatabasePicker
              names={databases}
              loading={options.isPending}
              listError={opts?.databases_error || options.error?.message}
              value={draft.targets}
              onChange={(targets) => set({ targets }, "targets")}
              onRefresh={() => void options.refetch()}
              refreshing={options.isFetching}
              error={errors.targets}
            />
          )}
          {draft.selection === "pattern" && (
            <PatternField
              value={draft.pattern}
              names={databases}
              onChange={(pattern) => set({ pattern }, "pattern")}
              error={errors.pattern}
            />
          )}
        </Section>
      )}

      <Section
        title="Backup type"
        hint="Incremental saves only what changed since the backup before."
        phone={phone}
      >
        <div className="grid gap-2 md:grid-cols-2">
          <OptionCard
            icon={<Archive />}
            title="Full"
            hint="A complete dump every time. Simplest to restore."
            selected={draft.method === "full"}
            onSelect={() => set({ method: "full" }, "method")}
          />
          <OptionCard
            icon={<Layers />}
            title="Incremental"
            hint={
              incremental?.supported
                ? "A full one, then only the changes. Smaller and faster."
                : "Not on this engine."
            }
            selected={draft.method === "incremental"}
            disabled={!incremental?.supported && draft.method !== "incremental"}
            onSelect={() => set({ method: "incremental" }, "method")}
          />
        </div>
        {incremental?.note && <Note icon={<Info />}>{incremental.note}</Note>}
        {draft.method === "incremental" && (
          <Field
            label="Start over with a full backup every"
            hint="A long chain is slower to restore and breaks if one link goes."
            className="w-64"
          >
            {(p) => (
              <div className="flex items-center gap-2">
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  value={draft.fullEvery}
                  onChange={(e) => set({ fullEvery: e.target.value }, "method")}
                  className="w-24 tabular-nums"
                />
                <span className="text-body-sm text-muted-foreground">days</span>
              </div>
            )}
          </Field>
        )}
        <FieldError text={errors.method} />
      </Section>

      <Section
        title="Where to store"
        hint="Dumped once, then uploaded to every storage you pick."
        phone={phone}
      >
        <StoragePicker
          items={storageList.map((s) => ({
            id: s.id,
            name: s.name,
            protocol: s.protocol,
          }))}
          missing={draft.storages.filter(
            (id) => !storages.data?.items.some((s) => s.id === id),
          )}
          name={storageName}
          loading={storages.isPending}
          refreshing={storages.isFetching}
          onRefresh={() => void storages.refetch()}
          value={draft.storages}
          onChange={(ids) => set({ storages: ids }, "storages")}
          error={errors.storages}
        />
        {!db.server_id && (
          <Field
            label="Run it from"
            error={errors.runner}
            hint={runnerHint(draft.runner, local)}
          >
            {(p) => (
              <Choice
                id={p.id}
                phone={phone}
                value={draft.runner}
                onChange={(v) => set({ runner: v }, "runner")}
                items={[
                  {
                    value: "",
                    label:
                      local && !local.supported
                        ? "Choose a server"
                        : LOCAL_RUNNER,
                  },
                  ...runnerItems,
                ]}
              />
            )}
          </Field>
        )}
      </Section>

      <Section
        title="Folder"
        hint="On every storage. Each database gets a folder of its own inside it."
        phone={phone}
      >
        <Field label="Path" error={errors.folder}>
          {(p) => (
            <div className="flex flex-col gap-2">
              <Input
                {...p}
                value={draft.folder}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono"
                onChange={(e) => set({ folder: e.target.value }, "folder")}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {folderTokens.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      set(
                        {
                          folder: `${draft.folder.replace(/\/$/, "")}${
                            draft.folder.endsWith("-") ? "" : "/"
                          }${t}`,
                        },
                        "folder",
                      )
                    }
                    className="h-9 rounded-full border border-border px-3 font-mono text-caption text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:h-7"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Field>
        {!folderProblem(draft.folder) && (
          <p className="text-caption break-all text-muted-foreground">
            → <span className="font-mono text-foreground">{folderPreview}</span>{" "}
            <span className="text-ash">(filled in for today)</span>
          </p>
        )}
      </Section>

      <Section title="When to run" phone={phone}>
        <ScheduleChoice
          draft={draft}
          phone={phone}
          builderOpen={builderOpen}
          onBuilder={setBuilderOpen}
          onChange={(patch) => set(patch, "cron")}
          error={errors.cron}
        />
        {draft.cron && (
          <div className="flex min-h-11 items-center justify-between gap-4">
            <label htmlFor="backup-plan-enabled">
              <span className="block text-body-sm font-medium">
                Run on schedule
              </span>
              <span className="block text-caption text-muted-foreground">
                Off = paused. Back up now still works.
              </span>
            </label>
            <Switch
              id="backup-plan-enabled"
              checked={draft.enabled}
              onCheckedChange={(enabled) => set({ enabled })}
            />
          </div>
        )}
      </Section>

      <Section
        title="How long to keep"
        hint="Old backups are deleted, files included, after a run that worked."
        phone={phone}
      >
        <div className="grid gap-2 md:grid-cols-3">
          <OptionCard
            icon={<CalendarClock />}
            title="Days"
            hint="Everything from the last N days."
            selected={draft.retention === "days"}
            onSelect={() => set({ retention: "days" }, "retention")}
          />
          <OptionCard
            icon={<CalendarRange />}
            title="GFS"
            hint="Daily, weekly and monthly tiers."
            selected={draft.retention === "gfs"}
            onSelect={() => set({ retention: "gfs" }, "retention")}
          />
          <OptionCard
            icon={<Forever />}
            title="Forever"
            hint="Nothing is deleted."
            selected={draft.retention === "forever"}
            onSelect={() => set({ retention: "forever" }, "retention")}
          />
        </div>
        {draft.retention === "days" && (
          <Field label="Keep backups for" className="w-64">
            {(p) => (
              <div className="flex items-center gap-2">
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={3650}
                  value={draft.keepDays}
                  onChange={(e) =>
                    set({ keepDays: e.target.value }, "retention")
                  }
                  className="w-24 tabular-nums"
                />
                <span className="text-body-sm text-muted-foreground">days</span>
              </div>
            )}
          </Field>
        )}
        {draft.retention === "gfs" && (
          <>
            <Note icon={<Info />}>
              Grandfather-Father-Son keeps a tiered set of backups across
              several time spans: the newest of each of the last few days, weeks
              and months. Set a tier to 0 to turn it off.{" "}
              <Link
                href="/help/databases#retention"
                className="text-brand hover:underline"
              >
                Docs
              </Link>
            </Note>
            <div className="grid grid-cols-3 gap-2">
              <TierCard
                id="gfs-daily"
                label="Daily"
                unit="days"
                value={draft.gfsDaily}
                onChange={(v) => set({ gfsDaily: v }, "retention")}
              />
              <TierCard
                id="gfs-weekly"
                label="Weekly"
                unit="weeks"
                value={draft.gfsWeekly}
                onChange={(v) => set({ gfsWeekly: v }, "retention")}
              />
              <TierCard
                id="gfs-monthly"
                label="Monthly"
                unit="months"
                value={draft.gfsMonthly}
                onChange={(v) => set({ gfsMonthly: v }, "retention")}
              />
            </div>
            <p className="text-caption text-ash">
              A backup that fits several tiers is kept once, so it counts once
              toward the storage's space.
            </p>
          </>
        )}
        {draft.retention === "forever" && (
          <Note icon={<Info />}>
            Nothing is deleted by Morche. Keep an eye on the storage's space.
          </Note>
        )}
        <FieldError text={errors.retention} />
        {draft.retention !== "forever" && (
          <p className="text-caption text-ash">
            The newest backup of each database is always kept, and so is
            everything a kept incremental builds on.
          </p>
        )}
      </Section>

      <Section title="Login" phone={phone}>
        <div className="flex min-h-11 items-start justify-between gap-4">
          <label htmlFor="backup-own-login">
            <span className="block text-body-sm font-medium">
              Use another login
            </span>
            <span className="block text-caption text-muted-foreground">
              Off = the login Morche monitors with. A dump has to read all the
              data, which a monitoring login usually can't.
            </span>
          </label>
          <Switch
            id="backup-own-login"
            checked={draft.ownLogin}
            onCheckedChange={(ownLogin) =>
              set({ ownLogin }, "username", "password")
            }
          />
        </div>
        {draft.ownLogin && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Username" error={errors.username}>
              {(p) => (
                <Input
                  {...p}
                  value={draft.username}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) =>
                    set({ username: e.target.value }, "username")
                  }
                />
              )}
            </Field>
            <Field
              label="Password"
              error={errors.password}
              hint={
                saved?.has_password ? "Blank = keep the saved one." : undefined
              }
            >
              {(p) => (
                <SecretInput
                  {...p}
                  value={draft.password}
                  autoComplete="new-password"
                  onChange={(e) =>
                    set({ password: e.target.value }, "password")
                  }
                />
              )}
            </Field>
          </div>
        )}
      </Section>

      <Section title="Summary" phone={phone}>
        <dl className="grid gap-x-6 gap-y-3 text-body-sm md:grid-cols-[10rem_minmax(0,1fr)]">
          <SummaryRow label="When">
            {scheduleLabel}
            {draft.cron && !draft.enabled && " (paused)"}
          </SummaryRow>
          <SummaryRow label="What">
            {db.engine === "redis"
              ? "Everything"
              : draft.selection === "selected"
                ? draft.targets.join(", ") || "Nothing picked yet"
                : selectionText(draft, db.engine)}
          </SummaryRow>
          <SummaryRow label="Type">
            {methodText({
              method: draft.method,
              full_every_days: num(draft.fullEvery) || 7,
            })}
          </SummaryRow>
          <SummaryRow label="Stored on">
            {draft.storages.length
              ? draft.storages.map(storageName).join(", ")
              : "Nothing picked yet"}
          </SummaryRow>
          <SummaryRow label="Folder" mono>
            {folderPreview}
          </SummaryRow>
          <SummaryRow label="Keeps">
            {retentionText({
              retention: draft.retention,
              keep_days: num(draft.keepDays) || 0,
              gfs_daily: num(draft.gfsDaily) || 0,
              gfs_weekly: num(draft.gfsWeekly) || 0,
              gfs_monthly: num(draft.gfsMonthly) || 0,
            })}
          </SummaryRow>
          <SummaryRow label="Runs on">
            {db.server_id
              ? "The server it's reached through"
              : draft.runner
                ? (runnerItems.find((r) => r.value === draft.runner)?.label ??
                  "A server")
                : LOCAL_RUNNER}
          </SummaryRow>
          <SummaryRow label="Runs as">
            {saved?.runs_as
              ? `${saved.runs_as} now; once you save, you`
              : "You: whoever saves it last"}
          </SummaryRow>
        </dl>
      </Section>
    </>
  )

  const saveLabel = save.isPending ? "Saving…" : saved ? "Save" : "Create plan"

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
            {saved ? "Edit plan" : "New plan"}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={save.isPending || (!!saved && !dirty)}
            onClick={submit}
          >
            {save.isPending ? "Saving…" : saved ? "Save" : "Create"}
          </Button>
        </header>
        <div className="border-b border-border px-4 py-3">
          <p className="text-body-sm">{summary}</p>
          <p className="text-caption text-muted-foreground">{summaryTail}</p>
        </div>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 pt-5 pb-12">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <DatabaseBackup className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">
            {draft.name.trim() || saved?.name || "New backup plan"}
          </h1>
          <p className="truncate text-caption text-ash">
            {db.name} ·{" "}
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
            disabled={save.isPending || (!!saved && !dirty)}
            onClick={submit}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
      <div className="max-w-5xl rounded-2xl border border-border bg-subtle px-5 py-3">
        <p className="text-body-sm">{summary}</p>
        <p className="text-caption text-muted-foreground">{summaryTail}</p>
      </div>
      <div className="grid max-w-5xl gap-6">{sections}</div>
    </div>
  )
}

function scheduleText(cron: string) {
  if (!cron) return "Only by hand"
  const preset = presetOf(cron)
  const text = cronText(cron)
  return preset ? `${text} (${preset.label})` : text
}

// A preset list for the usual schedules; the gear opens the full builder.
function ScheduleChoice({
  draft,
  phone,
  builderOpen,
  onBuilder,
  onChange,
  error,
}: {
  draft: Draft
  phone: boolean
  builderOpen: boolean
  onBuilder: (open: boolean) => void
  onChange: (patch: Partial<Draft>) => void
  error?: string
}) {
  const preset = presetOf(draft.cron)
  const value = !draft.cron ? "manual" : preset ? draft.cron : "custom"
  const items = [
    ...schedulePresets.map((p) => ({
      value: p.cron,
      label: `${p.label} — ${p.cron}`,
    })),
    {
      value: "custom",
      label: value === "custom" ? `Custom — ${draft.cron}` : "Custom…",
    },
    { value: "manual", label: "Only by hand" },
  ]
  const preview = usePreview(builderOpen ? "" : draft.cron, draft.timezone)
  const next = preview.data?.next?.[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <Field label="Schedule" className="min-w-0 flex-1">
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={value}
              onChange={(v) => {
                if (v === "manual") {
                  onChange({ cron: "" })
                  onBuilder(false)
                } else if (v === "custom") {
                  onChange({ cron: fromBuilder(draft.builder) || draft.cron })
                  onBuilder(true)
                } else {
                  onChange({ cron: v, builder: toBuilder(v) })
                }
              }}
              items={items}
            />
          )}
        </Field>
        {draft.cron && (
          <Button
            type="button"
            variant={builderOpen ? "secondary" : "outline"}
            size="icon"
            aria-label="Build a schedule"
            aria-pressed={builderOpen}
            title="Build a schedule"
            className="size-11 md:size-10"
            onClick={() => {
              if (!builderOpen) {
                onChange({ builder: toBuilder(draft.cron) })
              }
              onBuilder(!builderOpen)
            }}
          >
            <Settings2 />
          </Button>
        )}
      </div>
      {draft.cron && builderOpen && (
        <ScheduleField
          builder={draft.builder}
          onChange={(builder) =>
            onChange({ builder, cron: fromBuilder(builder) })
          }
          timezone={draft.timezone}
          onTimezone={(timezone) => onChange({ timezone })}
          error={error}
          phone={phone}
        />
      )}
      {draft.cron && !builderOpen && (
        <p className="text-caption text-muted-foreground">
          {cronText(draft.cron)} · {draft.timezone}
          {next && ` · next ${formatInZone(next, draft.timezone)}`}
        </p>
      )}
      {!builderOpen && <FieldError text={error} />}
      {!draft.cron && (
        <p className="text-caption text-muted-foreground">
          It runs only when someone presses Back up now.
        </p>
      )}
    </div>
  )
}

// A big tappable choice, like a radio button with a body.
function OptionCard({
  icon,
  title,
  hint,
  selected,
  disabled,
  onSelect,
}: {
  icon: ReactNode
  title: string
  hint: string
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
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:size-4",
          selected && "bg-card text-brand-strong",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-body-sm font-medium",
            selected && "text-brand-strong",
          )}
        >
          {title}
        </span>
        <span className="block text-caption text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

function TierCard({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string
  label: string
  unit: string
  value: string
  onChange: (value: string) => void
}) {
  const n = Number(value) || 0
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-border p-3",
        n === 0 && "bg-subtle",
      )}
    >
      <label
        htmlFor={id}
        className="font-label text-caption tracking-label text-ash uppercase"
      >
        {label}
      </label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={1000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-subheading tabular-nums"
      />
      <span className="text-caption text-muted-foreground">
        {n === 0 ? "Off" : `Newest of the last ${n} ${unit}`}
      </span>
    </div>
  )
}

function Chip({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 max-w-full items-center gap-1.5 rounded-full border border-border px-3 text-body-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
    >
      {children}
    </button>
  )
}

function DatabasePicker({
  names,
  loading,
  listError,
  value,
  onChange,
  onRefresh,
  refreshing,
  error,
}: {
  names: string[]
  loading: boolean
  listError?: string
  value: string[]
  onChange: (value: string[]) => void
  onRefresh: () => void
  refreshing: boolean
  error?: string
}) {
  const [typed, setTyped] = useState("")
  // Picked names the server didn't list (dropped, or listing failed) stay.
  const all = [...names, ...value.filter((v) => !names.includes(v))]
  const toggle = (n: string) =>
    onChange(value.includes(n) ? value.filter((v) => v !== n) : [...value, n])
  const add = () => {
    const n = typed.trim()
    if (!n) return
    if (!value.includes(n)) onChange([...value, n])
    setTyped("")
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-sm font-medium">
          Databases{" "}
          <span className="font-normal text-muted-foreground">
            {value.length} picked
          </span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="List the databases again"
          title="List again"
          className="size-11 md:size-8"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={cn(refreshing && "animate-spin")} />
        </Button>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-full rounded-full" />
      ) : (
        all.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {all.map((n) => (
              <Chip
                key={n}
                selected={value.includes(n)}
                onClick={() => toggle(n)}
              >
                <span className="truncate">{n}</span>
              </Chip>
            ))}
          </div>
        )
      )}
      {listError && (
        <p className="text-caption text-muted-foreground">
          Couldn't list them: {listError} Type the names instead.
        </p>
      )}
      <div className="flex gap-2">
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Add a name by hand"
          aria-label="Database name"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          className="max-w-xs"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          disabled={!typed.trim()}
          onClick={add}
        >
          Add
        </Button>
      </div>
      <FieldError text={error} />
    </div>
  )
}

function PatternField({
  value,
  names,
  onChange,
  error,
}: {
  value: string
  names: string[]
  onChange: (value: string) => void
  error?: string
}) {
  const problem = value ? patternProblem(value) : ""
  const hits = value && !problem ? matching(value, names) : []
  return (
    <Field
      label="Pattern"
      error={error ?? (problem || undefined)}
      hint="A regular expression, matched against each name at run time. ^shop_ = names starting with shop_."
    >
      {(p) => (
        <div className="flex flex-col gap-2">
          <Input
            {...p}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="^shop_"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
          />
          {value && !problem && names.length > 0 && (
            <p className="text-caption text-muted-foreground">
              {hits.length === 0
                ? "Matches none of the databases there now."
                : `Matches ${hits.length} now: ${hits.slice(0, 8).join(", ")}${hits.length > 8 ? "…" : ""}`}
            </p>
          )}
        </div>
      )}
    </Field>
  )
}

function StoragePicker({
  items,
  missing,
  name,
  loading,
  refreshing,
  onRefresh,
  value,
  onChange,
  error,
}: {
  items: { id: string; name: string; protocol: string }[]
  missing: string[]
  name: (id: string) => string
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
  value: string[]
  onChange: (value: string[]) => void
  error?: string
}) {
  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    )
  const full = value.length >= MAX_STORAGES
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-sm font-medium">
          Storages{" "}
          <span className="font-normal text-muted-foreground">
            {value.length} of up to {MAX_STORAGES}
          </span>
        </span>
        <span className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Load the storages again"
            title="Load again"
            className="size-11 md:size-8"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Add a storage (opens in a new tab)"
            title="Add a storage (new tab)"
            className="size-11 md:size-8"
            onClick={() => window.open("/storage", "_blank", "noopener")}
          >
            <Plus />
          </Button>
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-full rounded-full" />
      ) : items.length === 0 && missing.length === 0 ? (
        <p className="text-caption text-muted-foreground">
          None you can write to in this workspace. Add one with +, then load
          them again.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => (
            <Chip
              key={s.id}
              selected={value.includes(s.id)}
              disabled={full && !value.includes(s.id)}
              onClick={() => toggle(s.id)}
            >
              <span className="truncate">{s.name}</span>
              <span className="font-label text-[10px] tracking-label uppercase opacity-70">
                {s.protocol}
              </span>
            </Chip>
          ))}
          {missing.map((id) => (
            <Chip key={id} selected onClick={() => toggle(id)}>
              <span className="truncate text-destructive">{name(id)}</span>
              <X className="size-3.5" />
            </Chip>
          ))}
        </div>
      )}
      <FieldError text={error} />
    </div>
  )
}

function SummaryRow({
  label,
  mono,
  children,
}: {
  label: string
  mono?: boolean
  children: ReactNode
}) {
  return (
    <>
      <dt className="text-caption text-ash md:text-body-sm">{label}</dt>
      <dd
        className={cn(
          "-mt-2 min-w-0 break-words md:mt-0",
          mono && "font-mono text-caption break-all md:text-body-sm",
        )}
      >
        {children}
      </dd>
    </>
  )
}

// A titled block: a card on desktop, a plain full-width group on phones.
function Section({
  title,
  hint,
  phone,
  children,
}: {
  title: string
  hint?: string
  phone: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border p-6 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8",
      )}
    >
      <div>
        <h2 className="text-body font-medium">{title}</h2>
        {hint && (
          <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
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

function FieldError({ text }: { text?: string }) {
  if (!text) return null
  return <p className="text-caption text-destructive">{text}</p>
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
        icon={DatabaseBackup}
        title={title}
        body={body}
        action={
          <Button
            variant="outline"
            className="h-11 w-full md:h-9 md:w-auto"
            render={<Link href={href} />}
            nativeButton={false}
          >
            Back to backups
          </Button>
        }
      />
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
