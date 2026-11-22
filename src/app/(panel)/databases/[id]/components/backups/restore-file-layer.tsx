"use client"

import {
  ArrowLeft,
  ChevronRight,
  FileArchive,
  FileWarning,
  FolderSearch,
  Loader2,
  Search,
  TriangleAlert,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Choice } from "@/app/(panel)/cronjobs/components/schedule-field"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useServers } from "@/app/(panel)/servers/api"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import {
  type Target,
  TargetLabel,
  useEndpoints,
} from "@/components/files/endpoints"
import { FilePicker } from "@/components/files/file-picker"
import { FolderPicker } from "@/components/files/folder-picker"
import { listerFor, storageLister } from "@/components/files/listers"
import { basename, dirname, formatModified } from "@/components/files/meta"
import type { FileEntry } from "@/components/files/source"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  LocalTools,
  RestoreFileBody,
  RestoreFileInfo,
  RestoreFileSource,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useBackupOptions,
  useRestoreFile,
  useRestoreFileInfo,
} from "../../../api"
import { useDashboard } from "../parts"
import { LOCAL_RUNNER } from "./meta"
import { RestoreJobs } from "./restore-layer"
import { TempDirField, tempDirProblem } from "./temp-dir-field"

type Mode = RestoreFileBody["mode"]
type Errors = Partial<
  Record<
    | "file"
    | "sourceName"
    | "name"
    | "confirm"
    | "safety"
    | "safetyStorage"
    | "safetyFolder"
    | "runner"
    | "login"
    | "tempDir",
    string
  >
>

const errorKey: Record<string, keyof Errors> = {
  source: "file",
  "source.path": "file",
  source_name: "sourceName",
  target_name: "name",
  confirm: "confirm",
  safety_backup: "safety",
  safety_storage_id: "safetyStorage",
  safety_folder: "safetyFolder",
  runner_server_id: "runner",
  username: "login",
  password: "login",
  temp_dir: "tempDir",
}

// The last place a file was taken from, so the next restore opens there.
const LAST = "morche.databases.restore-file.last"
type Last = { place: string; file: string }

function readLast(): Last | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(LAST) ?? "null")
    return v && typeof v.place === "string" && typeof v.file === "string"
      ? v
      : undefined
  } catch {
    return undefined
  }
}

function saveLast(v: Last) {
  try {
    localStorage.setItem(LAST, JSON.stringify(v))
  } catch {}
}

// Names that dumps usually carry. Only a hint: the backend reads the file.
const dumpName =
  /\.(sql|dump|pgdump|psql|bak|backup|archive|rdb|tar)(\.(gz|zst))?$|\.(gz|gzip|zst)$/i
const looksLikeDump = (e: FileEntry) => dumpName.test(e.name)

// "shop_2026-11-17T03-00.sql.gz" → "shop".
export function stemOf(file: string) {
  let s = basename(file)
  for (;;) {
    const next = s.replace(
      /\.(gz|gzip|zst|sql|dump|pgdump|psql|bak|backup|archive|tar)$/i,
      "",
    )
    if (next === s) break
    s = next
  }
  return s
    .replace(
      /[-_.]?\d{4}-?\d{2}-?\d{2}([T_-]?\d{2}[-:]?\d{2}([-:]?\d{2})?Z?)?$/i,
      "",
    )
    .replace(/[-_.]+$/, "")
}

const sourceOf = (t: Target, path: string): RestoreFileSource =>
  t.kind === "server" ? { server_id: t.id, path } : { storage_id: t.id, path }

function localHint(local?: LocalTools) {
  if (local && !local.supported) return local.note
  // The binlog reader only serves incremental backups, never a file restore.
  const missing = (local?.missing ?? []).filter((t) => !t.includes("binlog"))
  if (missing.length) {
    return `Morche's own machine lacks ${missing.join(", ")}. Install them there, or choose a server.`
  }
  return "Morche's own machine loads it, the same way it reaches the database to watch it."
}

// Restore a dump that sits on a server or a storage: one Morche didn't take,
// or one copied there by hand. Pick the place, browse to the file (it's read
// to tell what it is), then say where it goes.
export function RestoreFileLayer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { database: d, phone } = useDashboard()
  const [last] = useState(readLast)
  const { targets, loading, error } = useEndpoints()
  const places = targets.filter((t) => t.readable)
  const [placeId, setPlaceId] = useState(last?.place ?? "")
  const place = places.find((t) => t.id === placeId)
  const [file, setFile] = useState<string>()
  const [sourceName, setSourceName] = useState("")
  const [stage, setStage] = useState<"pick" | "form">("pick")

  const source = place && file ? sourceOf(place, file) : undefined
  const info = useRestoreFileInfo(d.id, source)
  const several =
    !!info.data && !info.data.named && info.data.databases.length > 1
  const ready =
    !!info.data &&
    !info.data.problem &&
    !info.isFetching &&
    (!several || !!sourceName)

  function choosePlace(id: string) {
    setPlaceId(id)
    setFile(undefined)
    setSourceName("")
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Restore from a file"
      description={
        stage === "pick"
          ? `A dump on a server or a storage, loaded into ${d.name}.`
          : undefined
      }
      className={stage === "pick" ? "sm:max-w-4xl" : "sm:max-w-xl"}
    >
      {stage === "pick" ? (
        <div className="flex min-w-0 flex-col gap-4">
          <div
            className={cn(
              "grid min-w-0 gap-4",
              phone
                ? "grid-cols-[minmax(0,1fr)]"
                : "h-[min(30rem,calc(100dvh-22rem))] min-h-72 grid-cols-[15rem_minmax(0,1fr)]",
            )}
          >
            {(!phone || !place) && (
              <Places
                places={places}
                loading={loading}
                error={error}
                value={placeId}
                onPick={choosePlace}
                phone={phone}
              />
            )}
            {place ? (
              <div className="flex min-h-0 min-w-0 flex-col gap-2">
                {phone && (
                  <button
                    type="button"
                    onClick={() => choosePlace("")}
                    className="-mx-2 flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-2 text-start hover:bg-subtle"
                  >
                    <ArrowLeft className="size-4 shrink-0 text-ash" />
                    <TargetLabel target={place} />
                  </button>
                )}
                <FilePicker
                  key={place.id}
                  lister={listerFor(place.endpoint)}
                  start={place.kind === "server" ? "" : "/"}
                  initialDir={
                    last?.place === place.id ? dirname(last.file) : undefined
                  }
                  value={file}
                  onPick={(p) => {
                    setFile(p)
                    setSourceName("")
                  }}
                  matches={looksLikeDump}
                  className={cn("min-h-0 flex-1", phone && "h-[55dvh]")}
                />
              </div>
            ) : (
              !phone && (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input p-6 text-center">
                  <FolderSearch className="size-6 text-ash" />
                  <p className="text-body-sm text-muted-foreground">
                    Choose the server or storage the file is on.
                  </p>
                </div>
              )
            )}
          </div>

          {place && file && (
            <FileCard
              info={info.data}
              loading={info.isFetching}
              error={info.error?.message}
              place={place}
              path={file}
            >
              {several && info.data && (
                <Field
                  label="Which database to take"
                  hint="The archive holds several. One goes back at a time."
                >
                  {(p) => (
                    <Choice
                      id={p.id}
                      phone={phone}
                      value={sourceName}
                      onChange={setSourceName}
                      items={[
                        ...(sourceName
                          ? []
                          : [{ value: "", label: "Choose one" }]),
                        ...info.data.databases.map((n) => ({
                          value: n,
                          label: n,
                        })),
                      ]}
                    />
                  )}
                </Field>
              )}
            </FileCard>
          )}

          <div className="flex gap-2 max-md:flex-col-reverse md:justify-end">
            <Button
              type="button"
              className="max-md:h-11"
              disabled={!ready}
              onClick={() => {
                if (place && file) saveLast({ place: place.id, file })
                setStage("form")
              }}
            >
              Continue
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : (
        place &&
        file &&
        info.data && (
          <RestoreFileForm
            place={place}
            info={info.data}
            sourceName={several ? sourceName : ""}
            onBack={() => setStage("pick")}
            onDone={() => onOpenChange(false)}
          />
        )
      )}
    </ResponsiveDialog>
  )
}

// The servers and storages this person can read files on.
function Places({
  places,
  loading,
  error,
  value,
  onPick,
  phone,
}: {
  places: Target[]
  loading: boolean
  error: Error | null
  value: string
  onPick: (id: string) => void
  phone: boolean
}) {
  const [q, setQ] = useState("")
  const needle = q.trim().toLowerCase()
  const shown = places.filter(
    (t) =>
      !needle ||
      t.name.toLowerCase().includes(needle) ||
      t.detail.toLowerCase().includes(needle),
  )
  const groups = [
    { label: "Storages", items: shown.filter((t) => t.kind === "storage") },
    { label: "Servers", items: shown.filter((t) => t.kind === "server") },
  ].filter((g) => g.items.length)

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <p className="text-body-sm font-medium">Where the file is</p>
      {places.length > 6 && (
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a server or storage"
            aria-label="Find a server or storage"
            className="ps-9 md:h-9"
          />
        </div>
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto rounded-lg border border-input",
          phone && "max-h-[60dvh]",
        )}
      >
        {loading ? (
          <div className="flex flex-col gap-3 p-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : error ? (
          <p className="p-3 text-body-sm text-destructive">{error.message}</p>
        ) : places.length === 0 ? (
          <p className="p-3 text-body-sm text-muted-foreground">
            You can't read files on any server or storage.
          </p>
        ) : groups.length === 0 ? (
          <p className="p-3 text-body-sm text-muted-foreground">
            Nothing matches “{q.trim()}”.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.label} role="radiogroup" aria-label={g.label}>
              <p className="sticky top-0 z-10 bg-subtle px-3 py-1.5 font-label text-caption tracking-label text-ash uppercase">
                {g.label}
              </p>
              <ul className="divide-y divide-border">
                {g.items.map((t) => {
                  const on = t.id === value
                  return (
                    <li key={t.id}>
                      {/* biome-ignore lint/a11y/useSemanticElements: rich options with two lines and an icon */}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onPick(t.id)}
                        className={cn(
                          "flex min-h-12 w-full min-w-0 items-center gap-3 px-3 py-2 text-start outline-none focus-visible:bg-muted max-md:min-h-14",
                          on
                            ? "bg-brand-soft [&_.text-ash]:text-brand-strong/70 [&_.text-muted-foreground]:text-brand-strong"
                            : "hover:bg-subtle",
                        )}
                      >
                        <TargetLabel target={{ ...t, readOnly: false }} />
                        {phone && (
                          <ChevronRight className="size-4 shrink-0 text-ash" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// What the picked file turned out to be.
function FileCard({
  info,
  loading,
  error,
  place,
  path,
  action,
  children,
}: {
  info?: RestoreFileInfo
  loading: boolean
  error?: string
  place: Target
  path: string
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  const bad = !!error || !!info?.problem
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl border p-4",
        bad ? "border-destructive/40" : "border-border bg-subtle",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            bad
              ? "bg-destructive/10 text-destructive"
              : "bg-brand-soft text-brand",
          )}
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : bad ? (
            <FileWarning className="size-5" />
          ) : (
            <FileArchive className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium" title={path}>
            {basename(path)}
          </p>
          <p className="truncate text-caption text-ash" title={path}>
            {place.name} · {dirname(path)}
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            {loading
              ? "Reading the file…"
              : error
                ? error
                : info
                  ? [
                      info.label || "Not a backup Morche knows",
                      formatSize(info.size),
                      info.modified && formatModified(info.modified),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : ""}
          </p>
        </div>
        {action}
      </div>
      {!loading && info && info.databases.length > 0 && !info.problem && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-caption">
          <span className="text-muted-foreground">
            {info.databases.length === 1 ? "Database" : "Databases"} in it:
          </span>
          {info.databases.slice(0, 12).map((n) => (
            <span
              key={n}
              className="max-w-full truncate rounded-full border border-border bg-card px-2 py-0.5 font-mono"
            >
              {n}
            </span>
          ))}
          {info.databases.length > 12 && (
            <span className="text-ash">+{info.databases.length - 12}</span>
          )}
        </div>
      )}
      {!loading && info?.problem && (
        <p className="text-body-sm text-destructive">{info.problem}</p>
      )}
      {!loading && !bad && children}
    </div>
  )
}

function RestoreFileForm({
  place,
  info,
  sourceName,
  onBack,
  onDone,
}: {
  place: Target
  info: RestoreFileInfo
  sourceName: string
  onBack: () => void
  onDone: () => void
}) {
  const { database: d, phone } = useDashboard()
  const access = useAccess()
  const { track } = useJobActions()
  const restore = useRestoreFile()
  const options = useBackupOptions(d.id, true)
  const servers = useServers({ limit: 500 })
  const { targets } = useEndpoints()
  const direct = !d.server_id

  const names = options.data?.databases ?? []
  const listed = options.isSuccess && !options.data.databases_error
  const fixed = info.named && info.databases.length === 1

  // A first guess: the name the file carries, else the file's own name when
  // such a database exists, else the one Morche watches.
  const stem = stemOf(info.path)
  const guess = fixed
    ? info.databases[0]
    : sourceName ||
      (names.includes(stem) || !d.dbname || !names.includes(d.dbname)
        ? stem
        : d.dbname)
  const [typed, setTyped] = useState<string>()
  const name = fixed ? info.databases[0] : (typed ?? guess)
  const exists = names.includes(name.trim())
  const [mode, setMode] = useState<Mode>("replace")
  const [modeTouched, setModeTouched] = useState(false)
  const effectiveMode: Mode =
    modeTouched || !listed ? mode : exists ? "replace" : "new"
  const replace = effectiveMode === "replace"
  const [confirm, setConfirm] = useState("")
  const [safety, setSafety] = useState(true)

  // Where the backup before goes: beside the file when it's on a storage
  // this person can write to, else a storage they choose.
  const writable = targets.filter((t) => t.kind === "storage" && !t.readOnly)
  const besideFile =
    place.kind === "storage" && writable.some((t) => t.id === place.id)
  const [safetyStorage, setSafetyStorage] = useState(
    besideFile ? "" : (writable[0]?.id ?? ""),
  )
  const safetyTarget = writable.find((t) => t.id === safetyStorage)
  const [safetyFolder, setSafetyFolder] = useState("")
  const [browse, setBrowse] = useState(false)

  const [runner, setRunner] = useState("")
  const [ownLogin, setOwnLogin] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [workers, setWorkers] = useState(4)
  const [tempDir, setTempDir] = useState("")
  const parallel = info.format === "pg_dir"
  // A ClickHouse file may be unpacked first (when tar can't stream it).
  const unpacks = parallel || info.format === "ch_tar"
  // Where it runs, to browse its folders ("" = Morche's own machine).
  const runsOn = servers.data?.items.find(
    (s) => s.id === (direct ? runner : d.server_id),
  )

  const runners = (servers.data?.items ?? [])
    .filter((s) =>
      atLeast(access.serverLevel(s.id, s.workspace_id), "engineer"),
    )
    .map((s) => ({ value: s.id, label: s.name }))

  function submit() {
    const target = name.trim()
    const e: Errors = {}
    if (!target) e.name = "Name the database"
    if (replace && confirm !== target) e.confirm = "Type the name exactly"
    if (replace && safety && !besideFile && !safetyStorage) {
      e.safetyStorage = "Choose a storage for the backup before"
    }
    if (
      replace &&
      safety &&
      safetyTarget?.buckets &&
      safetyFolder.split("/").filter(Boolean).length === 0
    ) {
      e.safetyFolder = "Choose a bucket, or a folder in one"
    }
    if (direct && !runner && options.data && !options.data.local.supported) {
      e.runner = "Choose a server"
    }
    if (ownLogin && !username.trim()) e.login = "Enter the login"
    const tmp = unpacks ? tempDirProblem(tempDir) : ""
    if (tmp) e.tempDir = tmp
    setErrors(e)
    if (Object.keys(e).length) return
    const body: RestoreFileBody = {
      source: sourceOf(place, info.path),
      ...(sourceName ? { source_name: sourceName } : {}),
      target_name: target,
      mode: effectiveMode,
      ...(replace ? { confirm, safety_backup: safety } : {}),
      ...(replace && safety && safetyStorage
        ? {
            safety_storage_id: safetyStorage,
            ...(safetyFolder.trim()
              ? { safety_folder: safetyFolder.trim() }
              : {}),
          }
        : {}),
      ...(direct && runner ? { runner_server_id: runner } : {}),
      ...(ownLogin ? { username: username.trim(), password } : {}),
      ...(parallel ? { workers } : {}),
      ...(unpacks && tempDir.trim() ? { temp_dir: tempDir.trim() } : {}),
    }
    restore.mutate(
      { id: d.id, body },
      {
        onSuccess: (job) => {
          track(job)
          onDone()
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
      },
    )
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <FileCard
        info={info}
        loading={false}
        error={errors.file}
        place={place}
        path={info.path}
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 max-md:h-11"
            onClick={onBack}
          >
            Change
          </Button>
        }
      >
        {sourceName && (
          <p className="text-caption text-muted-foreground">
            Taking <span className="font-mono">{sourceName}</span> from it.
          </p>
        )}
      </FileCard>

      <Field
        label="Restore into"
        error={errors.name}
        hint={
          fixed
            ? `This file names its database, so it can only go back to ${info.databases[0]}.`
            : listed
              ? exists
                ? "A database with this name exists."
                : "No database has this name yet."
              : undefined
        }
      >
        {(p) => (
          <Input
            {...p}
            value={name}
            readOnly={fixed}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
            onChange={(e) => {
              setTyped(e.target.value)
              setConfirm("")
              setErrors((x) => ({ ...x, name: undefined }))
            }}
          />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-body-sm font-medium">How</span>
        <Segmented
          label="How"
          items={[
            { value: "replace", label: "Replace it" },
            { value: "new", label: "As a new database" },
          ]}
          value={effectiveMode}
          onChange={(m) => {
            setModeTouched(true)
            setMode(m)
          }}
        />
        <p className="text-caption text-muted-foreground">
          {replace
            ? "What's in the database now is overwritten by the file."
            : "Creates the database, then loads the file into it. Nothing that exists is touched."}
        </p>
      </div>

      {replace && (
        <>
          <div className="flex gap-2.5 rounded-lg border border-border px-3 py-2.5 text-body-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>
              Everything in <span className="font-mono">{name}</span> is
              replaced by what the file holds. Apps using it may see errors
              while it loads.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex min-h-11 items-start justify-between gap-4">
              <label htmlFor="restore-file-safety">
                <span className="block text-body-sm font-medium">
                  Back it up first
                </span>
                <span className="block text-caption text-muted-foreground">
                  A full backup of the database as it is now, so you can go
                  back.
                </span>
                {errors.safety && (
                  <span className="block text-caption text-destructive">
                    {errors.safety}
                  </span>
                )}
              </label>
              <Switch
                id="restore-file-safety"
                checked={safety}
                onCheckedChange={setSafety}
              />
            </div>
            {safety && (
              <div className="flex flex-col gap-3 rounded-lg bg-subtle p-3">
                <Field
                  label="Keep it on"
                  error={errors.safetyStorage}
                  hint={
                    !safetyStorage && besideFile
                      ? `Next to the file, in ${dirname(info.path)}.`
                      : writable.length === 0
                        ? "You can't write to any storage. Turn this off, or ask for Engineer access to one."
                        : undefined
                  }
                >
                  {(p) => (
                    <Choice
                      id={p.id}
                      phone={phone}
                      value={safetyStorage}
                      onChange={(v) => {
                        setSafetyStorage(v)
                        setSafetyFolder("")
                        setBrowse(false)
                        setErrors((x) => ({ ...x, safetyStorage: undefined }))
                      }}
                      items={[
                        ...(besideFile
                          ? [
                              {
                                value: "",
                                label: `${place.name}, next to the file`,
                              },
                            ]
                          : safetyStorage
                            ? []
                            : [{ value: "", label: "Choose a storage" }]),
                        ...writable.map((t) => ({
                          value: t.id,
                          label: t.name,
                        })),
                      ]}
                    />
                  )}
                </Field>
                {safetyTarget && (
                  <Field
                    label="Folder"
                    error={errors.safetyFolder}
                    hint={
                      safetyTarget.buckets
                        ? "Starts with the bucket, e.g. /backups/restores."
                        : "Empty = the top of the storage."
                    }
                  >
                    {(p) => (
                      <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex min-w-0 gap-2">
                          <Input
                            {...p}
                            value={safetyFolder}
                            placeholder={
                              safetyTarget.buckets ? "/bucket/folder" : "/"
                            }
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            className="min-w-0 flex-1 font-mono"
                            onChange={(e) => {
                              setSafetyFolder(e.target.value)
                              setErrors((x) => ({
                                ...x,
                                safetyFolder: undefined,
                              }))
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 max-md:h-11 md:h-10"
                            aria-expanded={browse}
                            onClick={() => setBrowse((b) => !b)}
                          >
                            {browse ? "Done" : "Browse"}
                          </Button>
                        </div>
                        {browse && (
                          <FolderPicker
                            lister={storageLister(safetyTarget.id)}
                            value={safetyFolder || "/"}
                            onChange={(v) => {
                              setSafetyFolder(v)
                              setErrors((x) => ({
                                ...x,
                                safetyFolder: undefined,
                              }))
                            }}
                            disabled={
                              safetyTarget.buckets
                                ? (v) => v === "/"
                                : undefined
                            }
                            rootLabel={safetyTarget.name}
                            className="max-h-56"
                          />
                        )}
                      </div>
                    )}
                  </Field>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {parallel && (
        <RestoreJobs
          value={workers}
          onChange={setWorkers}
          phone={phone}
          replace={replace}
          safety={safety}
        />
      )}
      {unpacks && (
        <TempDirField
          id="restore-file"
          value={tempDir}
          onChange={(v) => {
            setTempDir(v)
            setErrors((e) => ({ ...e, tempDir: undefined }))
          }}
          server={runsOn ? { id: runsOn.id, name: runsOn.name } : undefined}
          container={direct ? undefined : d.container || undefined}
          restore
          error={errors.tempDir}
        />
      )}

      {direct && (
        <Field
          label="Run it from"
          error={errors.runner}
          hint={
            !runner
              ? localHint(options.data?.local)
              : `The server that loads it: it needs the database's tools and a way to reach it. ${place.kind === "server" && place.id !== runner ? `The file is copied from ${place.name} through Morche.` : ""}`
          }
        >
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={runner}
              onChange={setRunner}
              items={[
                options.data?.local.supported === false
                  ? { value: "", label: "Choose a server" }
                  : { value: "", label: LOCAL_RUNNER },
                ...runners,
              ]}
            />
          )}
        </Field>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex min-h-11 items-start justify-between gap-4">
          <label htmlFor="restore-file-login">
            <span className="block text-body-sm font-medium">
              Use another login
            </span>
            <span className="block text-caption text-muted-foreground">
              Off = the one Morche monitors with. It needs the right to create
              and overwrite databases.
            </span>
          </label>
          <Switch
            id="restore-file-login"
            checked={ownLogin}
            onCheckedChange={setOwnLogin}
          />
        </div>
        {ownLogin && (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Username" error={errors.login}>
              {(p) => (
                <Input
                  {...p}
                  value={username}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => setUsername(e.target.value)}
                />
              )}
            </Field>
            <Field label="Password">
              {(p) => (
                <SecretInput
                  {...p}
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
      </div>

      {replace && (
        <Field
          label={`Type ${name.trim() || "the name"} to confirm`}
          error={errors.confirm}
        >
          {(p) => (
            <Input
              {...p}
              value={confirm}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              className="font-mono"
              onChange={(e) => {
                setConfirm(e.target.value)
                setErrors((x) => ({ ...x, confirm: undefined }))
              }}
            />
          )}
        </Field>
      )}

      <p className="text-caption text-muted-foreground">
        The whole file is read and checked before anything changes. A file that
        turns out broken stops the restore with the database untouched.
      </p>

      <div className="flex gap-2 max-md:flex-col-reverse md:justify-end">
        <Button
          type="button"
          variant="outline"
          className="max-md:h-11"
          onClick={onBack}
        >
          <ArrowLeft />
          Back
        </Button>
        <Button
          type="submit"
          variant={replace ? "destructive" : "default"}
          className="max-md:h-11"
          disabled={restore.isPending || (replace && confirm !== name.trim())}
        >
          {restore.isPending
            ? "Starting…"
            : replace
              ? `Replace ${name.trim() || "it"}`
              : "Restore"}
        </Button>
      </div>
    </form>
  )
}
