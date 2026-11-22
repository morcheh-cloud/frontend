"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ChevronLeft,
  CircleAlert,
  FolderSearch,
  HardDrive,
  History,
  Info,
  Server,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  FieldError,
  Section,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { browserZone } from "@/app/(panel)/cronjobs/components/meta"
import { Choice } from "@/app/(panel)/cronjobs/components/schedule-field"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { ProtocolTile } from "@/app/(panel)/storage/components/meta"
import { useDemo } from "@/components/demo/demo"
import {
  AsideCard,
  EditorLoading,
  EditorPage,
  SummaryList,
} from "@/components/editor-page"
import { Field } from "@/components/field"
import { FolderPicker } from "@/components/files/folder-picker"
import { storageLister } from "@/components/files/listers"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { storagesQuery } from "@/components/panel/problems"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  Database,
  PitrSettingsBody,
  PitrStatus,
  Storage,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useDatabase, usePitr, usePitrDetect, useSavePitr } from "../../../api"
import { useDatabaseCan } from "../../../components/permissions"
import {
  cronsOf,
  type FullEvery,
  type IncrEvery,
  incrLabels,
  type Plan,
  pitrHref,
  planOf,
  planText,
  slugOf,
  storageFit,
  weekdays,
} from "./meta"

type Draft = {
  storage: string
  folder: string
  plan: Plan
  timezone: string
  retention: string
  compress: string
  processes: string
  archiveTimeout: string
  encrypt: boolean
  replaceArchive: boolean
  enabled: boolean
}

type Errors = Partial<
  Record<"storage" | "folder" | "schedule" | "retention" | "encrypt", string>
>

const errorKey: Record<string, keyof Errors> = {
  storage_id: "storage",
  folder: "folder",
  full_cron: "schedule",
  diff_cron: "schedule",
  incr_cron: "schedule",
  timezone: "schedule",
  retention_full: "retention",
  encrypt: "encrypt",
}

const timeouts = [
  { value: "30", label: "30 seconds" },
  { value: "60", label: "1 minute (recommended)" },
  { value: "300", label: "5 minutes" },
  { value: "0", label: "Only when a WAL file is full (16 MB)" },
]

function fromStatus(s: PitrStatus, d: Database): Draft {
  const set = s.settings
  if (!set) {
    return {
      storage: "",
      folder: `/pgbackrest/${slugOf(d.name)}`,
      plan: planOf("0 1 * * 0", "0 1 * * 1,2,3,4,5,6", ""),
      timezone: browserZone(),
      retention: "2",
      compress: "3",
      processes: "2",
      archiveTimeout: "60",
      encrypt: true,
      replaceArchive: false,
      enabled: true,
    }
  }
  return {
    storage: set.storage_id,
    folder: set.folder,
    plan: planOf(set.full_cron, set.diff_cron, set.incr_cron),
    timezone: set.timezone || browserZone(),
    retention: String(set.retention_full),
    compress: String(set.compress_level),
    processes: String(set.process_max),
    archiveTimeout: String(set.archive_timeout),
    encrypt: set.encrypted,
    replaceArchive: false,
    enabled: set.enabled,
  }
}

// /databases/[id]/pitr/setup
export function PitrEditorFromRoute() {
  const { id } = useParams<{ id: string }>()
  const phone = useIsPhone()
  const database = useDatabase(id)
  const status = usePitr(id)
  if (phone === null) return null
  if (!database.data || !status.data) {
    const err = database.error ?? status.error
    if (err) {
      return (
        <div className="px-6 py-16 text-center">
          <p className="text-body font-medium">
            {err instanceof ApiError && [403, 404].includes(err.status)
              ? "This database isn't here"
              : "Couldn't load it"}
          </p>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {err.message}
          </p>
        </div>
      )
    }
    return phone ? (
      <Skeleton className="m-4 h-60 rounded-2xl" />
    ) : (
      <EditorLoading />
    )
  }
  return (
    <Editor
      key={status.data.settings ? "saved" : "new"}
      database={database.data}
      status={status.data}
      phone={phone}
    />
  )
}

function Editor({
  database: db,
  status,
  phone,
}: {
  database: Database
  status: PitrStatus
  phone: boolean
}) {
  const router = useRouter()
  const can = useDatabaseCan()
  const owner = can(db, "owner")
  const demo = !!useDemo()
  const { track } = useJobActions()
  const back = useBack(pitrHref(db.id))
  useFollowWorkspace(db.workspace_id)
  usePageCrumbs([
    { href: `/databases/${db.id}`, label: db.name },
    { href: pitrHref(db.id), label: "Point in time" },
    {
      href: `/databases/${db.id}/pitr/setup`,
      label: status.settings ? "Settings" : "Set up",
    },
  ])

  const configured = !!status.settings
  const [draft, setDraft] = useState(() => fromStatus(status, db))
  const [start] = useState(draft)
  const [errors, setErrors] = useState<Errors>({})
  const dirty = JSON.stringify(draft) !== JSON.stringify(start)
  const set = (patch: Partial<Draft>, ...clear: (keyof Errors)[]) => {
    setDraft((d) => ({ ...d, ...patch }))
    if (clear.length)
      setErrors((e) => ({
        ...e,
        ...Object.fromEntries(clear.map((k) => [k, undefined])),
      }))
  }
  const setPlan = (patch: Partial<Plan>) =>
    set({ plan: { ...draft.plan, ...patch } }, "schedule")

  const storages = useQuery(storagesQuery)
  const detect = usePitrDetect(db.id, owner && status.supported)
  const save = useSavePitr(db.id)
  const list = (storages.data?.items ?? []).filter(
    (s) => s.workspace_id === db.workspace_id,
  )
  const storage = list.find((s) => s.id === draft.storage)
  const crons = cronsOf(draft.plan)
  const foreign = detect.data?.foreign_archive_command ?? false

  function check(): Errors {
    const e: Errors = {}
    if (!draft.storage) e.storage = "Pick where the backups go"
    else if (storage && storageFit(storage))
      e.storage = storageFit(storage) ?? ""
    const f = draft.folder.trim()
    if (!f.startsWith("/") || f.replace(/\/+/g, "/") === "/") {
      e.folder = "A folder of its own, like /pgbackrest/shop"
    } else if (
      storage?.protocol === "s3" &&
      !storage.bucket &&
      f.split("/").filter(Boolean).length < 1
    ) {
      e.folder = "Start with the bucket: /bucket/folder"
    }
    if (!crons.full) e.schedule = "Full backups need a schedule"
    const r = Number(draft.retention)
    if (!Number.isInteger(r) || r < 1 || r > 100)
      e.retention = "Between 1 and 100"
    return e
  }

  function submit() {
    const e = check()
    setErrors(e)
    if (Object.values(e).some(Boolean)) {
      toast.error(Object.values(e).find(Boolean) ?? "Check the form")
      return
    }
    if (foreign && !draft.replaceArchive && !configured) {
      toast.error(
        "PostgreSQL already archives its WAL somewhere: tick Replace it to go on.",
      )
      return
    }
    const body: PitrSettingsBody = {
      storage_id: draft.storage,
      folder: draft.folder.trim(),
      full_cron: crons.full,
      diff_cron: crons.diff,
      incr_cron: crons.incr,
      timezone: draft.timezone,
      retention_full: Number(draft.retention),
      compress_level: Number(draft.compress),
      process_max: Number(draft.processes),
      archive_timeout: Number(draft.archiveTimeout),
      encrypt: draft.encrypt,
      replace_archive_command: draft.replaceArchive,
      enabled: draft.enabled,
    }
    save.mutate(body, {
      onSuccess: (out) => {
        if (out.job) track(out.job)
        else toast.success("Saved")
        router.push(pitrHref(db.id))
      },
      onError: (err) => {
        const mapped: Errors = {}
        for (const [k, v] of Object.entries(fieldErrors(err))) {
          const key = errorKey[k]
          if (key && !mapped[key]) mapped[key] = v
        }
        setErrors(mapped)
        toast.error(Object.values(mapped)[0] ?? err.message)
      },
    })
  }

  if (demo) {
    return (
      <div className="px-6 py-16 text-center text-body-sm text-muted-foreground">
        Continuous backup can't be set up in the demo: it installs software and
        restarts PostgreSQL for everyone.
      </div>
    )
  }
  if (!owner) {
    return (
      <div className="px-6 py-16 text-center text-body-sm text-muted-foreground">
        Setting up continuous backup needs Owner access to {db.name} and
        Engineer access to its server.
      </div>
    )
  }

  const summaryRows: [string, ReactNode, boolean?][] = [
    ["Server", status.server_name || "Its server"],
    ["Stored on", storage ? storage.name : "Nothing picked yet"],
    ["Folder", draft.folder || "—", true],
    ["Schedule", planText(draft.plan)],
    [
      "Keeps",
      `${draft.retention} full backup${draft.retention === "1" ? "" : "s"} and everything since`,
    ],
    [
      "Most a quiet database can lose",
      timeouts
        .find((t) => t.value === draft.archiveTimeout)
        ?.label.replace(" (recommended)", "") ?? "—",
    ],
    ["Encrypted", draft.encrypt ? "Yes, AES-256" : "No"],
  ]

  const sections = (
    <>
      <ServerSection
        configured={configured}
        status={status}
        detect={detect}
        phone={phone}
        replace={draft.replaceArchive}
        onReplace={(replaceArchive) => set({ replaceArchive })}
      />

      <Section
        title="Where the backups go"
        hint="pgBackRest writes backups and every WAL file here, straight from the server."
        phone={phone}
      >
        <StoragePick
          storages={list}
          loading={storages.isPending}
          value={draft.storage}
          onChange={(id) => {
            const s = list.find((x) => x.id === id)
            const folder =
              s?.protocol === "s3" && !s.bucket && !configured
                ? `/pgbackrest/${slugOf(db.name)}`
                : draft.folder
            set({ storage: id, folder }, "storage")
          }}
          phone={phone}
        />
        <FieldError text={errors.storage} />
        <FolderField
          storage={storage}
          value={draft.folder}
          onChange={(folder) => set({ folder }, "folder")}
          error={errors.folder}
        />
        {storage && (
          <p className="text-caption text-muted-foreground">
            The server reaches the storage itself, at{" "}
            <span className="font-mono text-foreground">{storage.host}</span>
            {storage.port ? `:${storage.port}` : ""}: that address must work
            from {status.server_name || "the server"} too.
          </p>
        )}
      </Section>

      <Section
        title="Backups"
        hint="Full backups are the starting points; the smaller ones in between make a restore faster. Every change in between is in the WAL anyway."
        phone={phone}
      >
        <ScheduleControls plan={draft.plan} onChange={setPlan} phone={phone} />
        <Field label="Time zone">
          {(p) => (
            <Input
              {...p}
              value={draft.timezone}
              onChange={(e) => set({ timezone: e.target.value }, "schedule")}
              className="max-w-xs"
            />
          )}
        </Field>
        <FieldError text={errors.schedule} />
        <div className="flex min-h-11 items-start justify-between gap-4">
          <label htmlFor="pitr-enabled">
            <span className="block text-body-sm font-medium">
              Scheduled backups on
            </span>
            <span className="block text-caption text-muted-foreground">
              Off pauses the schedule. WAL archiving goes on either way.
            </span>
          </label>
          <Switch
            id="pitr-enabled"
            checked={draft.enabled}
            onCheckedChange={(enabled) => set({ enabled })}
          />
        </div>
      </Section>

      <Section
        title="How long to keep"
        hint="Each full backup kept, plus its smaller ones and the WAL after it, is one more stretch you can go back to."
        phone={phone}
      >
        <Field
          label="Full backups kept"
          hint={keepHint(draft.plan, Number(draft.retention) || 0)}
          error={errors.retention}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={draft.retention}
              onChange={(e) => set({ retention: e.target.value }, "retention")}
              className="w-28 tabular-nums"
            />
          )}
        </Field>
      </Section>

      <Section
        title="Safety"
        hint="What a sudden loss can cost, and who can read the backups."
        phone={phone}
      >
        <Field
          label="Archive at least every"
          hint="PostgreSQL sends a WAL file when it's full (16 MB) or after this long, whichever comes first. A quiet database can lose at most this much."
        >
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={draft.archiveTimeout}
              onChange={(archiveTimeout) => set({ archiveTimeout })}
              items={timeouts}
            />
          )}
        </Field>
        <div className="flex min-h-11 items-start justify-between gap-4">
          <label htmlFor="pitr-encrypt">
            <span className="block text-body-sm font-medium">
              Encrypt the backups
            </span>
            <span className="block text-caption text-muted-foreground">
              AES-256 with a passphrase Morche makes and keeps (you can see it
              from the tab's menu: keep a copy somewhere safe). It's fixed once
              the repository exists.
            </span>
          </label>
          <Switch
            id="pitr-encrypt"
            checked={draft.encrypt}
            onCheckedChange={(encrypt) => set({ encrypt }, "encrypt")}
          />
        </div>
        <FieldError text={errors.encrypt} />
      </Section>

      <Section
        title="Speed"
        hint="Higher values finish sooner and use more of the server."
        phone={phone}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Compression (zstd)"
            hint="3 is a good balance; higher makes smaller files and takes more CPU."
          >
            {(p) => (
              <Choice
                id={p.id}
                phone={phone}
                value={draft.compress}
                onChange={(compress) => set({ compress })}
                items={[1, 3, 6, 9].map((n) => ({
                  value: String(n),
                  label:
                    n === 1
                      ? "1 — fastest"
                      : n === 3
                        ? "3 — balanced"
                        : n === 9
                          ? "9 — smallest"
                          : String(n),
                }))}
              />
            )}
          </Field>
          <Field
            label="Processes"
            hint="Used for backups, restores and sending WAL. Half the server's cores at most."
          >
            {(p) => (
              <Choice
                id={p.id}
                phone={phone}
                value={draft.processes}
                onChange={(processes) => set({ processes })}
                items={[1, 2, 4, 8].map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
              />
            )}
          </Field>
        </div>
      </Section>
    </>
  )

  const saveLabel = save.isPending ? "Saving…" : configured ? "Save" : "Set up"
  const disabled = save.isPending || (configured && !dirty)

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
            {configured ? "Point in time settings" : "Set up point in time"}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={disabled}
            onClick={submit}
          >
            {saveLabel}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )
  }

  return (
    <EditorPage
      icon={<History />}
      title={
        configured ? "Point-in-time settings" : "Set up point-in-time recovery"
      }
      dirty={dirty}
      status={`${db.name} · ${dirty ? "Unsaved changes" : configured ? "Saved" : "Not set up yet"}`}
      onSave={disabled ? undefined : submit}
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
            render={<Link href={pitrHref(db.id)} />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button className="h-9" disabled={disabled} onClick={submit}>
            {saveLabel}
          </Button>
        </>
      }
    >
      {sections}
    </EditorPage>
  )
}

function keepHint(p: Plan, n: number) {
  if (p.custom || n < 1)
    return "Older full backups, and what only they need, are deleted."
  const days =
    p.fullEvery === "day" ? n : p.fullEvery === "week" ? n * 7 : n * 30
  return `With full backups ${p.fullEvery === "day" ? "daily" : p.fullEvery === "week" ? "weekly" : "monthly"}, you can go back about ${days} days${n > 1 ? "" : " (one full backup: the window restarts at each new one)"}.`
}

// What setting it up changes on the server, from a look at it first.
function ServerSection({
  configured,
  status,
  detect,
  phone,
  replace,
  onReplace,
}: {
  configured: boolean
  status: PitrStatus
  detect: ReturnType<typeof usePitrDetect>
  phone: boolean
  replace: boolean
  onReplace: (v: boolean) => void
}) {
  const c = detect.data?.cluster
  return (
    <Section
      title="What changes on the server"
      hint={`Morche connects to ${status.server_name || "the server"} over SSH as root and does this once.`}
      phone={phone}
    >
      {detect.isPending ? (
        <div className="grid gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-3/5" />
        </div>
      ) : detect.isError ? (
        <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-caption text-destructive">
          <CircleAlert className="mt-px size-4 shrink-0" />
          <span>
            Morche couldn't look at the server: {detect.error.message}
          </span>
        </p>
      ) : c ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Fact icon={<Server />}>PostgreSQL {c.version}</Fact>
            <Fact icon={<HardDrive />}>
              {formatSize(c.size_bytes)} of data · {formatSize(c.free_bytes)}{" "}
              free beside it
            </Fact>
            <Fact icon={<ShieldCheck />}>
              {c.pgbackrest
                ? `pgBackRest ${c.pgbackrest}`
                : "pgBackRest not installed"}
            </Fact>
          </div>
          {configured ? (
            <ol className="grid gap-2 text-body-sm">
              <Step>
                A new storage, folder, retention, compression or process count
                rewrites pgBackRest's config on the server (a new storage or
                folder starts a new repository and a new full backup).
              </Step>
              <Step>
                Schedule changes stay in Morche: nothing on the server.
              </Step>
            </ol>
          ) : (
            <ol className="grid gap-2 text-body-sm">
              {!c.pgbackrest && (
                <Step>
                  Installs pgBackRest with {c.package || "the package manager"}.
                </Step>
              )}
              <Step>
                Writes its own config to{" "}
                <code className="font-mono text-caption">
                  /etc/pgbackrest/morche.conf
                </code>{" "}
                (readable by postgres only) and creates the repository.
              </Step>
              <Step>
                Sets{" "}
                <code className="font-mono text-caption">archive_command</code>,{" "}
                <code className="font-mono text-caption">archive_mode</code> and{" "}
                <code className="font-mono text-caption">archive_timeout</code>{" "}
                with ALTER SYSTEM.
              </Step>
              {detect.data?.needs_restart ? (
                <Step tone="warning">
                  PostgreSQL then needs{" "}
                  <b className="font-medium">one restart</b> (archive_mode is
                  off). You choose when: right after, or at a quiet hour.
                </Step>
              ) : (
                <Step>No restart: archiving is already on.</Step>
              )}
              <Step>Takes the first full backup.</Step>
            </ol>
          )}
          {detect.data?.foreign_archive_command && (
            <Callout tone="warning" icon={<CircleAlert />}>
              <span className="block">
                PostgreSQL already sends its WAL somewhere:{" "}
                <code className="font-mono text-caption break-all">
                  {c.archive_command}
                </code>
                . That stops if Morche takes over.
              </span>
              <span className="mt-2 flex items-center gap-2">
                <Switch
                  id="pitr-replace"
                  checked={replace}
                  onCheckedChange={onReplace}
                />
                <label
                  htmlFor="pitr-replace"
                  className="text-body-sm text-foreground"
                >
                  Replace it
                </label>
              </span>
            </Callout>
          )}
          {detect.data?.warnings
            .filter(
              (w) =>
                !w.startsWith("PostgreSQL already sends") &&
                !w.startsWith("archive_mode is off") &&
                !w.includes("Morche installs it"),
            )
            .map((w) => (
              <Callout key={w} tone="warning" icon={<CircleAlert />}>
                {w}
              </Callout>
            ))}
        </>
      ) : null}
    </Section>
  )
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border px-3 text-caption text-muted-foreground [&>svg]:size-3.5">
      {icon}
      <span className="text-foreground">{children}</span>
    </span>
  )
}

function Step({ children, tone }: { children: ReactNode; tone?: "warning" }) {
  return (
    <li className="flex gap-2.5">
      <span
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          tone === "warning" ? "bg-warning" : "bg-brand",
        )}
      />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

// Every storage of the workspace, the ones pgBackRest can't use greyed out
// with the reason.
function StoragePick({
  storages,
  loading,
  value,
  onChange,
  phone,
}: {
  storages: Storage[]
  loading: boolean
  value: string
  onChange: (id: string) => void
  phone: boolean
}) {
  if (loading) return <Skeleton className="h-24 rounded-2xl" />
  if (storages.length === 0) {
    return (
      <p className="text-body-sm text-muted-foreground">
        There's no storage in this workspace yet.{" "}
        <Link href="/storage/list" className="text-brand hover:underline">
          Add an S3 (HTTPS) or SFTP storage
        </Link>{" "}
        first.
      </p>
    )
  }
  const sorted = [...storages].sort(
    (a, b) => Number(!!storageFit(a)) - Number(!!storageFit(b)),
  )
  return (
    <div
      role="radiogroup"
      aria-label="Storage"
      className={cn("grid gap-2", !phone && "md:grid-cols-2 2xl:grid-cols-3")}
    >
      {sorted.map((s) => {
        const why = storageFit(s)
        const on = s.id === value
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={on}
            disabled={!!why}
            onClick={() => onChange(s.id)}
            className={cn(
              "flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 text-start transition-colors outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-55",
              on && "border-primary bg-brand-soft hover:bg-brand-soft",
            )}
          >
            <ProtocolTile protocol={s.protocol} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm font-medium">
                {s.name}
              </span>
              <span className="block truncate text-caption text-muted-foreground">
                {why ??
                  (s.bucket
                    ? `${s.protocol.toUpperCase()} · ${s.bucket}`
                    : s.host)}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FolderField({
  storage,
  value,
  onChange,
  error,
}: {
  storage?: Storage
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const [browse, setBrowse] = useOpen("pitr-folder")
  const [picked, setPicked] = useState("/")
  const bucketFirst = storage?.protocol === "s3" && !storage.bucket
  return (
    <>
      <Field
        label="Folder"
        hint={
          bucketFirst
            ? "Starts with the bucket (it must exist): /bucket/folder. One folder per database."
            : "A folder of its own for this database; pgBackRest makes it."
        }
        error={error}
      >
        {(f) => (
          <div className="flex gap-2">
            <Input
              {...f}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="/pgbackrest/shop"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 font-mono"
            />
            {storage && (
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 md:h-10"
                onClick={() => {
                  setPicked(
                    value.startsWith("/")
                      ? value.replace(/\/[^/]*$/, "") || "/"
                      : "/",
                  )
                  setBrowse(true)
                }}
              >
                <FolderSearch />
                Browse
              </Button>
            )}
          </div>
        )}
      </Field>
      {storage && (
        <ResponsiveDialog
          open={browse}
          onOpenChange={setBrowse}
          title="Pick the folder"
          description={`Folders on ${storage.name}. The database's own folder goes inside the one you pick.`}
          className="sm:max-w-lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setBrowse(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const leaf =
                    value.split("/").filter(Boolean).pop() ?? "pgbackrest"
                  onChange(`${picked.replace(/\/$/, "")}/${leaf}`)
                  setBrowse(false)
                }}
              >
                Use this folder
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <FolderPicker
              lister={storageLister(storage.id)}
              value={picked}
              onChange={setPicked}
              rootLabel={storage.name}
              className="max-h-80"
            />
            <p className="truncate text-caption text-muted-foreground">
              Picked:{" "}
              <span className="font-mono text-foreground">{picked}</span>
            </p>
          </div>
        </ResponsiveDialog>
      )}
    </>
  )
}

function ScheduleControls({
  plan: p,
  onChange,
  phone,
}: {
  plan: Plan
  onChange: (patch: Partial<Plan>) => void
  phone: boolean
}) {
  const crons = cronsOf(p)
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Schedule"
        value={p.custom ? "custom" : "simple"}
        onChange={(v) =>
          onChange(
            v === "custom"
              ? {
                  custom: true,
                  fullCron: crons.full,
                  diffCron: crons.diff,
                  incrCron: crons.incr,
                }
              : planOf(p.fullCron, p.diffCron, p.incrCron).custom
                ? { custom: false }
                : planOf(p.fullCron, p.diffCron, p.incrCron),
          )
        }
        items={[
          { value: "simple", label: "Simple" },
          { value: "custom", label: "Custom (cron)" },
        ]}
      />
      {p.custom ? (
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ["fullCron", "Full", "0 1 * * 0"],
              ["diffCron", "Differential (empty = none)", "0 1 * * 1-6"],
              ["incrCron", "Incremental (empty = none)", "30 */6 * * *"],
            ] as const
          ).map(([k, label, ph]) => (
            <Field key={k} label={label}>
              {(f) => (
                <Input
                  {...f}
                  value={p[k]}
                  onChange={(e) => onChange({ [k]: e.target.value })}
                  placeholder={ph}
                  className="font-mono"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              )}
            </Field>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Full backup">
              {(f) => (
                <Choice
                  id={f.id}
                  phone={phone}
                  value={p.fullEvery}
                  onChange={(v) => onChange({ fullEvery: v as FullEvery })}
                  items={[
                    { value: "week", label: "Every week" },
                    { value: "day", label: "Every day" },
                    { value: "month", label: "Every month (the 1st)" },
                  ]}
                />
              )}
            </Field>
            {p.fullEvery === "week" && (
              <Field label="On">
                {(f) => (
                  <Choice
                    id={f.id}
                    phone={phone}
                    value={String(p.fullDay)}
                    onChange={(v) => onChange({ fullDay: Number(v) })}
                    items={weekdays.map((d, i) => ({
                      value: String(i),
                      label: d,
                    }))}
                  />
                )}
              </Field>
            )}
            <Field label="At">
              {(f) => (
                <Input
                  {...f}
                  type="time"
                  value={p.time}
                  onChange={(e) =>
                    onChange({ time: e.target.value || "01:00" })
                  }
                  className="w-32"
                />
              )}
            </Field>
          </div>
          {p.fullEvery !== "day" && (
            <div className="flex min-h-11 items-start justify-between gap-4">
              <label htmlFor="pitr-diff">
                <span className="block text-body-sm font-medium">
                  Differential the other days, same time
                </span>
                <span className="block text-caption text-muted-foreground">
                  Small and quick; a restore then needs one full + one
                  differential + the WAL after it.
                </span>
              </label>
              <Switch
                id="pitr-diff"
                checked={p.diff}
                onCheckedChange={(diff) => onChange({ diff })}
              />
            </div>
          )}
          <Field
            label="Incremental"
            hint="Only what changed since the last backup. More often = less WAL to replay in a restore."
          >
            {(f) => (
              <Choice
                id={f.id}
                phone={phone}
                value={p.incr}
                onChange={(v) => onChange({ incr: v as IncrEvery })}
                items={(Object.keys(incrLabels) as IncrEvery[]).map((k) => ({
                  value: k,
                  label: incrLabels[k],
                }))}
              />
            )}
          </Field>
        </>
      )}
      <p className="flex items-start gap-1.5 text-caption text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {planText(p)}. Between backups, every change still reaches the storage
          as WAL, so you can go back to any second.
        </span>
      </p>
    </div>
  )
}
