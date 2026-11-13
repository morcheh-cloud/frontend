"use client"

import {
  ArchiveRestore,
  CircleAlert,
  Clock,
  Download,
  FileDown,
  HardDrive,
  Info,
  PackageCheck,
  Play,
  Shrink,
  Trash2,
} from "lucide-react"
import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react"
import { toast } from "sonner"

import {
  Facts,
  type Item,
  StateDot,
} from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { LogArchiveView, LogDatasetView } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  downloadUrl,
  useCompact,
  useDeleteArchive,
  useExportLogs,
  useLogOverview,
  usePutAway,
  useRestoreArchive,
  useRunPolicy,
  useSetHold,
} from "../api"
import {
  DEFAULT_FOLDER,
  formatCount,
  formatDay,
  formatStamp,
  heldText,
  kindLabel,
  stateMeta,
  windowLabel,
} from "./meta"
import { Chip, FieldError, PlacesEditor } from "./places"

type Window = { from: string; to: string }

type Actions = {
  details: (a: LogArchiveView) => void
  restore: (a: LogArchiveView) => void
  hold: (a: LogArchiveView) => void
  putAway: (a: LogArchiveView) => void
  remove: (a: LogArchiveView) => void
  exportLogs: (d: LogDatasetView, window?: Window) => void
  compact: (d: LogDatasetView) => void
  runNow: (d: LogDatasetView) => void
  running: string | null
}

const Ctx = createContext<Actions | null>(null)

export function useLogActions() {
  const a = useContext(Ctx)
  if (!a) throw new Error("useLogActions needs a <LogActionsProvider>")
  return a
}

export function LogActionsProvider({ children }: { children: ReactNode }) {
  const [archive, setArchive] = useState<LogArchiveView | null>(null)
  const [dataset, setDataset] = useState<LogDatasetView | null>(null)
  const [span, setSpan] = useState<Window | undefined>()
  // A fresh key per opening, so a form starts from scratch.
  const [nonce, setNonce] = useState(0)

  const [detailsOpen, setDetailsOpen] = useOpen("log-archive-details")
  const [restoreOpen, setRestoreOpen] = useOpen("log-archive-restore")
  const [holdOpen, setHoldOpen] = useOpen("log-archive-hold")
  const [awayOpen, setAwayOpen] = useOpen("log-archive-away")
  const [removeOpen, setRemoveOpen] = useOpen("log-archive-remove")
  const [exportOpen, setExportOpen] = useOpen("log-export")
  const [compactOpen, setCompactOpen] = useOpen("log-compact")

  const run = useRunPolicy()
  const putAway = usePutAway()
  const remove = useDeleteArchive()

  const withArchive = (open: (v: boolean) => void) => (a: LogArchiveView) => {
    setArchive(a)
    setNonce((n) => n + 1)
    open(true)
  }

  const actions: Actions = {
    details: withArchive(setDetailsOpen),
    restore: withArchive(setRestoreOpen),
    hold: withArchive(setHoldOpen),
    putAway: withArchive(setAwayOpen),
    remove: withArchive(setRemoveOpen),
    exportLogs: (d, w) => {
      setDataset(d)
      setSpan(w)
      setNonce((n) => n + 1)
      setExportOpen(true)
    },
    compact: (d) => {
      setDataset(d)
      setNonce((n) => n + 1)
      setCompactOpen(true)
    },
    runNow: (d) =>
      run.mutate(d.key, {
        onSuccess: () => toast(`Running the policy for ${d.title}`),
        onError: (err) => toast.error(err.message),
      }),
    running: run.isPending ? (run.variables ?? null) : null,
  }

  return (
    <Ctx.Provider value={actions}>
      {children}
      {archive && (
        <>
          <ArchiveDetails
            archive={archive}
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
          />
          <RestoreDialog
            key={`r${nonce}`}
            archive={archive}
            open={restoreOpen}
            onOpenChange={setRestoreOpen}
          />
          <HoldDialog
            key={`h${nonce}`}
            archive={archive}
            open={holdOpen}
            onOpenChange={setHoldOpen}
          />
          <ConfirmDialog
            open={awayOpen}
            onOpenChange={setAwayOpen}
            title="Put the rows away again?"
            description={`The ${formatCount(archive.restore.rows || archive.rows)} rows put back from ${windowLabel(archive.from, archive.to)} leave the database again. The file stays where it is.`}
            confirmLabel="Put away"
            destructive={false}
            pending={putAway.isPending}
            onConfirm={() =>
              putAway.mutate(archive.id, {
                onSuccess: () => setAwayOpen(false),
                onError: (err) => toast.error(err.message),
              })
            }
          />
          <ConfirmDialog
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            title="Delete this file?"
            description={
              archive.mode === "archive" && archive.state === "stored"
                ? `Every copy of ${archive.file_name} is deleted. Its ${formatCount(archive.rows)} rows are no longer in the database, so they're gone for good.`
                : `Every copy of ${archive.file_name} is deleted.`
            }
            confirmLabel="Delete"
            pending={remove.isPending}
            onConfirm={() =>
              remove.mutate(archive.id, {
                onSuccess: () => {
                  setRemoveOpen(false)
                  toast("File deleted")
                },
                onError: (err) => toast.error(err.message),
              })
            }
          />
        </>
      )}
      {dataset && (
        <>
          <ExportDialog
            key={`e${nonce}`}
            dataset={dataset}
            window={span}
            open={exportOpen}
            onOpenChange={setExportOpen}
          />
          <CompactDialog
            key={`c${nonce}`}
            dataset={dataset}
            open={compactOpen}
            onOpenChange={setCompactOpen}
          />
        </>
      )}
    </Ctx.Provider>
  )
}

// ---- Menus ----

export function useArchiveMenu(a: LogArchiveView): Item[][] {
  const act = useLogActions()
  const stored = a.copies.filter((c) => c.state === "stored")
  const busy = a.state === "running" || a.restore.state === "running"
  const held = a.restore.state === "held"
  return [
    [
      {
        key: "details",
        label: "Details",
        icon: <Info />,
        onSelect: () => act.details(a),
      },
      {
        key: "download",
        label: "Download",
        icon: <Download />,
        disabled: stored.length === 0,
        onSelect: () => {
          window.location.href = downloadUrl(a.id)
        },
      },
    ],
    [
      held
        ? {
            key: "away",
            label: "Put away now",
            icon: <PackageCheck />,
            disabled: busy,
            onSelect: () => act.putAway(a),
          }
        : {
            key: "restore",
            label: "Put back…",
            icon: <ArchiveRestore />,
            disabled: busy || a.state !== "stored" || stored.length === 0,
            onSelect: () => act.restore(a),
          },
      ...(held
        ? [
            {
              key: "hold",
              label: "Keep back longer…",
              icon: <Clock />,
              disabled: busy,
              onSelect: () => act.hold(a),
            },
          ]
        : []),
    ],
    [
      {
        key: "delete",
        label: "Delete",
        icon: <Trash2 />,
        destructive: true,
        disabled: busy || held,
        onSelect: () => act.remove(a),
      },
    ],
  ]
}

export function useDatasetMenu(d: LogDatasetView): Item[][] {
  const act = useLogActions()
  return [
    [
      {
        key: "run",
        label: "Run the policy now",
        icon: <Play />,
        disabled: !d.policy || act.running === d.key,
        onSelect: () => act.runNow(d),
      },
      {
        key: "export",
        label: "Export…",
        icon: <FileDown />,
        disabled: d.rows === 0,
        onSelect: () => act.exportLogs(d),
      },
      {
        key: "compact",
        label: "Free up space…",
        icon: <Shrink />,
        onSelect: () => act.compact(d),
      },
    ],
  ]
}

// ---- Archive details ----

export function archiveTone(a: LogArchiveView) {
  if (a.restore.state === "held")
    return { tone: "muted" as const, label: "Rows back" }
  if (a.restore.state === "running")
    return { tone: "muted" as const, label: "Putting back" }
  const s = stateMeta[a.state]
  const failed = a.copies.filter((c) => c.state === "failed").length
  if (a.state === "stored" && failed > 0)
    return { tone: "warning" as const, label: `${failed} copy failed` }
  return s
}

function ArchiveDetails({
  archive: a,
  open,
  onOpenChange,
}: {
  archive: LogArchiveView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const act = useLogActions()
  const tone = archiveTone(a)
  const tables = Object.entries(a.tables ?? {})
  const held = heldText(a)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${a.dataset_title} · ${windowLabel(a.from, a.to)}`}
      className="sm:max-w-xl"
    >
      {/* min-w-0: long file names and paths wrap instead of widening the
          dialog body (a grid track sized to its widest unbroken word). */}
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-body-sm">
          <StateDot tone={tone.tone} label={tone.label} />
          <span className="text-muted-foreground">
            {kindLabel(a)} of {a.dataset_title}
          </span>
        </div>
        {a.error && (
          <p className="mx-2 flex gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-body-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {a.error}
          </p>
        )}
        {held && (
          <p className="mx-2 flex gap-2 rounded-lg bg-subtle px-3 py-2.5 text-body-sm">
            <ArchiveRestore className="mt-0.5 size-4 shrink-0 text-ash" />
            {held}. They're taken out again then; the file stays.
          </p>
        )}
        <Facts
          items={[
            { label: "File", value: a.file_name, wide: true, mono: true },
            { label: "Rows", value: formatCount(a.rows) },
            { label: "Size", value: formatSize(a.bytes) },
            { label: "Made", value: formatStamp(a.created_at) },
            { label: "By", value: a.created_by_name || "Schedule" },
            ...(a.expires_at
              ? [{ label: "Deleted on", value: formatDay(a.expires_at) }]
              : []),
            ...(a.note ? [{ label: "Note", value: a.note, wide: true }] : []),
            ...(a.restore.state === "done"
              ? [
                  {
                    label: "Put back",
                    value: `${formatCount(a.restore.rows)} missing rows, ${formatStamp(a.restore.at)}`,
                    wide: true,
                  },
                ]
              : []),
            ...(a.restore.error
              ? [
                  {
                    label: "Putting back failed",
                    value: a.restore.error,
                    wide: true,
                  },
                ]
              : []),
            ...(a.sha256
              ? [{ label: "SHA-256", value: a.sha256, wide: true, mono: true }]
              : []),
          ]}
        />

        <section className="px-2">
          <h3 className="text-body-sm font-medium">Copies</h3>
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
            {a.copies.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <HardDrive className="size-4 shrink-0 text-ash" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium">
                    {c.local
                      ? "Morche's disk"
                      : c.storage_name || "Removed storage"}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-caption break-all text-muted-foreground",
                      c.error && "font-sans break-words text-destructive",
                    )}
                  >
                    {c.error || c.path}
                  </p>
                </div>
                {c.state === "stored" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 md:size-8"
                    aria-label="Download this copy"
                    title="Download"
                    nativeButton={false}
                    render={<a href={downloadUrl(a.id, c.id)} download />}
                  >
                    <Download />
                  </Button>
                ) : (
                  <span className="text-caption text-muted-foreground">
                    {c.state === "pending" ? "Writing…" : "Failed"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {tables.length > 0 && (
          <section className="px-2">
            <h3 className="text-body-sm font-medium">Tables in the file</h3>
            <ul className="mt-2 flex flex-col gap-1 text-body-sm">
              {tables.map(([name, rows]) => (
                <li key={name} className="flex justify-between gap-4">
                  <span className="min-w-0 truncate font-mono text-caption">
                    {name}
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatCount(rows)} rows
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap gap-2 px-2 pb-1">
          {a.restore.state === "held" ? (
            <Button
              variant="outline"
              className="max-md:h-11"
              onClick={() => {
                onOpenChange(false)
                act.putAway(a)
              }}
            >
              <PackageCheck />
              Put away now
            </Button>
          ) : (
            <Button
              variant="outline"
              className="max-md:h-11"
              disabled={
                a.state !== "stored" ||
                a.restore.state === "running" ||
                !a.copies.some((c) => c.state === "stored")
              }
              onClick={() => {
                onOpenChange(false)
                act.restore(a)
              }}
            >
              <ArchiveRestore />
              Put back…
            </Button>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  )
}

// ---- Hold length ----

const holdChoices = [
  { days: 1, label: "1 day" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 0, label: "Until put away" },
]

function HoldPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (days: number) => void
}) {
  const id = useId()
  const custom = !holdChoices.some((c) => c.days === value)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {holdChoices.map((c) => (
          <Chip
            key={c.days}
            selected={value === c.days}
            onClick={() => onChange(c.days)}
          >
            {c.label}
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-2 text-body-sm">
        <label htmlFor={id} className="text-muted-foreground">
          Or a number of days
        </label>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={3650}
          value={custom ? value : ""}
          placeholder="14"
          className="w-24 tabular-nums"
          onChange={(e) => {
            const n = Math.min(3650, Math.max(0, Number(e.target.value) || 0))
            onChange(n)
          }}
        />
      </div>
    </div>
  )
}

function RestoreDialog({
  archive: a,
  open,
  onOpenChange,
}: {
  archive: LogArchiveView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [days, setDays] = useState(7)
  const restore = useRestoreArchive()
  const isArchive = a.mode === "archive"
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Put back ${windowLabel(a.from, a.to)}`}
      description={
        isArchive
          ? `${formatCount(a.rows)} rows of ${a.dataset_title} go back into the database, where every page shows them again.`
          : "Rows of this copy that are missing from the database go back in; rows still there are left as they are."
      }
      footer={
        <Button
          className="max-md:h-11"
          disabled={restore.isPending}
          onClick={() =>
            restore.mutate(
              { id: a.id, holdDays: isArchive ? days : 0 },
              {
                onSuccess: () => onOpenChange(false),
                onError: (err) => toast.error(err.message),
              },
            )
          }
        >
          <ArchiveRestore />
          {restore.isPending ? "Starting…" : "Put back"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 px-2 pb-2">
        {isArchive ? (
          <>
            <div>
              <p className="text-body-sm font-medium">Keep them back for</p>
              <p className="mt-0.5 text-caption text-muted-foreground">
                Then they're taken out of the database again by themselves. The
                file stays where it is either way, and the policy leaves these
                rows alone while they're back.
              </p>
            </div>
            <HoldPicker value={days} onChange={setDays} />
          </>
        ) : (
          <p className="text-caption text-muted-foreground">
            They stay like any other row: the policy and the built-in clean-up
            treat them as usual.
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}

function HoldDialog({
  archive: a,
  open,
  onOpenChange,
}: {
  archive: LogArchiveView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [days, setDays] = useState(30)
  const hold = useSetHold()
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keep the rows back longer"
      description={`${heldText(a) ?? ""}. Counted from now.`}
      footer={
        <Button
          className="max-md:h-11"
          disabled={hold.isPending}
          onClick={() =>
            hold.mutate(
              { id: a.id, days },
              {
                onSuccess: () => {
                  onOpenChange(false)
                  toast(
                    days
                      ? `Kept back for ${days} days`
                      : "Kept back until put away",
                  )
                },
                onError: (err) => toast.error(err.message),
              },
            )
          }
        >
          Save
        </Button>
      }
    >
      <div className="px-2 pb-2">
        <HoldPicker value={days} onChange={setDays} />
      </div>
    </ResponsiveDialog>
  )
}

// ---- Export ----

const pad = (n: number) => String(n).padStart(2, "0")
const dateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const startOf = (v: string) => {
  const [y, m, d] = v.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function ExportDialog({
  dataset: d,
  window: w,
  open,
  onOpenChange,
}: {
  dataset: LogDatasetView
  window?: Window
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const overview = useLogOverview()
  const [from, setFrom] = useState(() => {
    if (w) return dateInput(new Date(w.from))
    const x = new Date()
    x.setDate(x.getDate() - 30)
    return dateInput(x)
  })
  const [to, setTo] = useState(() =>
    dateInput(w ? new Date(new Date(w.to).getTime() - 1) : new Date()),
  )
  const [keepLocal, setKeepLocal] = useState(true)
  const [storageIds, setStorageIds] = useState<string[]>([])
  const [folder, setFolder] = useState("")
  const [note, setNote] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const exp = useExportLogs()

  const start = from ? startOf(from) : null
  const end = to ? startOf(to) : null
  if (end) end.setDate(end.getDate() + 1)
  const order =
    start && end && end <= start ? "The end comes before the start" : ""
  const nowhere = !keepLocal && storageIds.length === 0

  const submit = () => {
    if (!start || !end || order || nowhere) return
    setErrors({})
    exp.mutate(
      {
        key: d.key,
        body: {
          from: start.toISOString(),
          to: end.toISOString(),
          keep_local: keepLocal,
          storage_ids: storageIds,
          folder: storageIds.length
            ? folder.trim() || DEFAULT_FOLDER
            : undefined,
          note: note.trim() || undefined,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          const f = fieldErrors(err)
          if (Object.keys(f).length) setErrors(f)
          else toast.error(err.message)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Export ${d.title}`}
      description="A zip file of the rows in these days, for a report or to keep. Nothing leaves the database."
      className="sm:max-w-lg"
      footer={
        <Button
          className="max-md:h-11"
          disabled={exp.isPending || !start || !end || !!order || nowhere}
          onClick={submit}
        >
          <FileDown />
          {exp.isPending ? "Starting…" : "Export"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 px-2 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" error={errors.from}>
            {(p) => (
              <Input
                {...p}
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            )}
          </Field>
          <Field label="To (included)" error={errors.to || order}>
            {(p) => (
              <Input
                {...p}
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            )}
          </Field>
        </div>
        <PlacesEditor
          id="log-export"
          keepLocal={keepLocal}
          onKeepLocal={setKeepLocal}
          storageIds={storageIds}
          onStorages={setStorageIds}
          folder={folder}
          onFolder={setFolder}
          errors={errors}
          localDir={overview.data?.local_dir}
          localFree={overview.data?.local_free}
        />
        <Field
          label="Note"
          hint="Shown with the file, e.g. what the report is for."
          error={errors.note}
        >
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              maxLength={500}
              value={note}
              placeholder="Q3 audit for the security review"
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
        <FieldError text={errors[""]} />
      </div>
    </ResponsiveDialog>
  )
}

// ---- Compact ----

function CompactDialog({
  dataset: d,
  open,
  onOpenChange,
}: {
  dataset: LogDatasetView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [full, setFull] = useState(false)
  const compact = useCompact()
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Free up space in ${d.title}`}
      description={`Deleted rows leave space behind${d.dead_rows ? ` (${formatCount(d.dead_rows)} rows' worth now)` : ""}. Tidying lets it be reused.`}
      className="sm:max-w-lg"
      footer={
        <Button
          className="max-md:h-11"
          disabled={compact.isPending}
          onClick={() =>
            compact.mutate(
              { key: d.key, full },
              {
                onSuccess: () => onOpenChange(false),
                onError: (err) => toast.error(err.message),
              },
            )
          }
        >
          <Shrink />
          {compact.isPending
            ? "Starting…"
            : full
              ? "Shrink the tables"
              : "Tidy up"}
        </Button>
      }
    >
      <div className="flex flex-col gap-2 px-2 pb-2">
        <Option
          selected={!full}
          title="Tidy up"
          hint="Marks the space as free for new rows. Runs alongside everything else; the files on disk don't get smaller."
          onSelect={() => setFull(false)}
        />
        <Option
          selected={full}
          title="Shrink the tables"
          hint="Rewrites each table so the space goes back to the disk. The tables are locked while it runs: pages showing these logs wait, and new rows wait too."
          onSelect={() => setFull(true)}
        />
        {full && (
          <p className="mt-1 flex gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-caption">
            <CircleAlert className="mt-px size-4 shrink-0 text-warning" />
            Needs free disk space about the size of the biggest table (
            {formatSize(Math.max(0, ...d.tables.map((t) => t.bytes)))}). Pick a
            quiet hour.
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}

function Option({
  selected,
  title,
  hint,
  onSelect,
}: {
  selected: boolean
  title: string
  hint: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="flex min-h-11 flex-col rounded-2xl border border-border p-4 text-start outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-brand-soft"
    >
      <span
        className={cn(
          "text-body-sm font-medium",
          selected && "text-brand-strong",
        )}
      >
        {title}
      </span>
      <span className="mt-0.5 text-caption text-muted-foreground">{hint}</span>
    </button>
  )
}
