"use client"

import { Copy, Loader2 } from "lucide-react"
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react"
import { toast } from "sonner"
import { Field, Segmented } from "@/app/(panel)/servers/components/fields"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import type { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { download, useFileOps } from "./api"
import { FolderPicker, insideAny } from "./folder-picker"
import {
  basename,
  dirname,
  extension,
  FolderSize,
  formatDate,
  formatSize,
  isDir,
  joinPath,
  nameError,
} from "./meta"
import { ShareDialog } from "./share-dialog"
import { type FileEntry, useSource } from "./source"
import { TransferDialog } from "./transfer-dialog"

type Dialog =
  | { kind: "new-folder" }
  | { kind: "new-file" }
  | { kind: "rename"; entry: FileEntry }
  | { kind: "delete"; entries: FileEntry[] }
  | { kind: "permissions"; entries: FileEntry[] }
  | { kind: "compress"; entries: FileEntry[] }
  | { kind: "move" | "copy"; entries: FileEntry[] }
  | { kind: "info"; entry: FileEntry }
  | { kind: "share"; entry: FileEntry }
  | { kind: "transfer"; entries: FileEntry[]; move: boolean }

type Actions = {
  newFolder: () => void
  newFile: () => void
  rename: (entry: FileEntry) => void
  remove: (entries: FileEntry[]) => void
  permissions: (entries: FileEntry[]) => void
  compress: (entries: FileEntry[]) => void
  moveTo: (entries: FileEntry[]) => void
  copyTo: (entries: FileEntry[]) => void
  info: (entry: FileEntry) => void
  // A time-limited public link (sources with `share`).
  share: (entry: FileEntry) => void
  // Copy or move to another server or storage.
  transfer: (entries: FileEntry[], move?: boolean) => void
  // into: a folder to unpack into instead of the archive's own.
  extract: (entry: FileEntry, into?: string) => void
  copyPath: (entry: FileEntry) => void
  download: (entries: FileEntry[]) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useFileActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useFileActions outside FileActionsProvider")
  return ctx
}

const toastError = (err: ApiError) => toast.error(err.message)

const count = (entries: FileEntry[]) =>
  entries.length === 1 ? `“${entries[0].name}”` : `${entries.length} items`

// Every dialog the file manager opens, in one place. `dir` is the folder on
// screen: new things go there.
export function FileActionsProvider({
  dir,
  onCreatedFile,
  onNavigate,
  onRemoved,
  children,
}: {
  dir: string
  onCreatedFile: (path: string) => void
  onNavigate: (dir: string) => void
  onRemoved: (paths: string[]) => void
  children: ReactNode
}) {
  const source = useSource()
  const ops = useFileOps(source)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [open, setOpen] = useOpen("file-dialog")

  const show = (d: Dialog) => {
    setDialog(d)
    setOpen(true)
  }
  const close = () => setOpen(false)

  const downloadEntries = (entries: FileEntry[]) => {
    if (!entries.length) return
    // One file downloads as itself; a folder or several arrive as one zip.
    const single = entries.length === 1 && !isDir(entries[0])
    const name = single
      ? undefined
      : entries.length === 1
        ? `${entries[0].name}.zip`
        : `${basename(dir) === "/" ? "files" : basename(dir)}.zip`
    download(
      source,
      entries.map((e) => e.path),
      name,
    )
  }

  const actions: Actions = {
    newFolder: () => show({ kind: "new-folder" }),
    newFile: () => show({ kind: "new-file" }),
    rename: (entry) => show({ kind: "rename", entry }),
    remove: (entries) => entries.length && show({ kind: "delete", entries }),
    permissions: (entries) =>
      entries.length && show({ kind: "permissions", entries }),
    compress: (entries) =>
      entries.length && show({ kind: "compress", entries }),
    moveTo: (entries) => entries.length && show({ kind: "move", entries }),
    copyTo: (entries) => entries.length && show({ kind: "copy", entries }),
    info: (entry) => show({ kind: "info", entry }),
    share: (entry) => show({ kind: "share", entry }),
    transfer: (entries, move = false) =>
      entries.length && show({ kind: "transfer", entries, move }),
    extract: (entry, into) => {
      const id = toast.loading(`Extracting ${entry.name}…`)
      ops.extract.mutate(
        { path: entry.path, destination: into },
        {
          onSuccess: ({ destination }) =>
            toast.success(`Extracted ${entry.name}`, {
              id,
              description: destination,
              action:
                destination !== dir
                  ? { label: "Open", onClick: () => onNavigate(destination) }
                  : undefined,
            }),
          onError: (err) => toast.error(err.message, { id }),
        },
      )
    },
    copyPath: (entry) =>
      navigator.clipboard
        .writeText(entry.path)
        .then(() => toast.success("Path copied", { description: entry.path }))
        .catch(() => toast.error("Couldn't copy the path")),
    download: downloadEntries,
  }

  const d = dialog
  return (
    <ActionsContext.Provider value={actions}>
      {children}

      <ResponsiveDialog
        open={open && (d?.kind === "new-folder" || d?.kind === "new-file")}
        onOpenChange={setOpen}
        title={d?.kind === "new-file" ? "New file" : "New folder"}
        footer={
          <Buttons
            form="file-name-form"
            label="Create"
            pending={ops.mkdir.isPending || ops.write.isPending}
            onCancel={close}
          />
        }
      >
        <NameForm
          key={`${d?.kind}-${open}`}
          initial=""
          placeholder={d?.kind === "new-file" ? "notes.txt" : "Folder name"}
          onSubmit={(name, setError) => {
            const path = joinPath(dir, name)
            const onError = (err: ApiError) =>
              err.status === 409
                ? setError("Something with that name is already here.")
                : setError(err.message)
            if (d?.kind === "new-folder") {
              ops.mkdir.mutate(path, {
                onSuccess: () => {
                  close()
                  toast.success(`Created ${name}`)
                },
                onError,
              })
            } else {
              ops.write.mutate(
                { path, content: "", create: true },
                {
                  onSuccess: () => {
                    // Open the editor once this dialog's history entry is gone.
                    window.addEventListener(
                      "popstate",
                      () => onCreatedFile(path),
                      { once: true },
                    )
                    close()
                  },
                  onError,
                },
              )
            }
          }}
        />
      </ResponsiveDialog>

      <ResponsiveDialog
        open={open && d?.kind === "rename"}
        onOpenChange={setOpen}
        title="Rename"
        footer={
          <Buttons
            form="file-name-form"
            label="Rename"
            pending={ops.rename.isPending}
            onCancel={close}
          />
        }
      >
        {d?.kind === "rename" && (
          <NameForm
            key={`${d.entry.path}-${open}`}
            initial={d.entry.name}
            selectStem={!isDir(d.entry)}
            onSubmit={(name, setError) => {
              if (name === d.entry.name) return close()
              ops.rename.mutate(
                {
                  from: d.entry.path,
                  to: joinPath(dirname(d.entry.path), name),
                },
                {
                  onSuccess: () => close(),
                  onError: (err) =>
                    setError(
                      err.status === 409
                        ? "Something with that name is already here."
                        : err.message,
                    ),
                },
              )
            }}
          />
        )}
      </ResponsiveDialog>

      <ConfirmDialog
        open={open && d?.kind === "delete"}
        onOpenChange={setOpen}
        title={d?.kind === "delete" ? `Delete ${count(d.entries)}?` : "Delete"}
        description={
          d?.kind === "delete" && (
            <>
              {d.entries.some(isDir) &&
                "Folders are deleted with everything inside them. "}
              This can't be undone.
            </>
          )
        }
        confirmLabel="Delete"
        pending={ops.remove.isPending}
        onConfirm={() => {
          if (d?.kind !== "delete") return
          const paths = d.entries.map((e) => e.path)
          ops.remove.mutate(paths, {
            onSuccess: () => {
              close()
              onRemoved(paths)
              toast.success(`Deleted ${count(d.entries)}`)
            },
            onError: toastError,
          })
        }}
      />

      <ResponsiveDialog
        open={open && d?.kind === "permissions"}
        onOpenChange={setOpen}
        title="Permissions"
        description={d?.kind === "permissions" ? count(d.entries) : undefined}
        footer={
          <Buttons
            form="file-perm-form"
            label="Apply"
            pending={ops.chmod.isPending || ops.chown.isPending}
            onCancel={close}
          />
        }
      >
        {d?.kind === "permissions" && (
          <PermissionsForm
            key={`${d.entries[0].path}-${open}`}
            entries={d.entries}
            onDone={close}
          />
        )}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={open && d?.kind === "compress"}
        onOpenChange={setOpen}
        title="Compress"
        description={d?.kind === "compress" ? count(d.entries) : undefined}
        footer={
          <Buttons
            form="file-compress-form"
            label="Compress"
            pending={ops.compress.isPending}
            onCancel={close}
          />
        }
      >
        {d?.kind === "compress" && (
          <CompressForm
            key={`${d.entries[0].path}-${open}`}
            entries={d.entries}
            dir={dir}
            onDone={close}
          />
        )}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={open && (d?.kind === "move" || d?.kind === "copy")}
        onOpenChange={setOpen}
        title={d?.kind === "copy" ? "Copy to" : "Move to"}
        description={
          d?.kind === "move" || d?.kind === "copy"
            ? count(d.entries)
            : undefined
        }
        footer={
          <Buttons
            form="file-dest-form"
            label={d?.kind === "copy" ? "Copy" : "Move"}
            pending={ops.move.isPending || ops.copy.isPending}
            onCancel={close}
          />
        }
      >
        {(d?.kind === "move" || d?.kind === "copy") && (
          <DestinationForm
            key={`${d.kind}-${open}`}
            initial={dir}
            entries={d.entries}
            onSubmit={(destination, setError) => {
              const op = d.kind === "copy" ? ops.copy : ops.move
              op.mutate(
                { paths: d.entries.map((e) => e.path), destination },
                {
                  onSuccess: () => {
                    close()
                    toast.success(
                      `${d.kind === "copy" ? "Copied" : "Moved"} ${count(d.entries)}`,
                      {
                        description: destination,
                        action:
                          destination !== dir
                            ? {
                                label: "Open",
                                onClick: () => onNavigate(destination),
                              }
                            : undefined,
                      },
                    )
                  },
                  onError: (err) =>
                    setError(
                      err.status === 409
                        ? "Something with the same name is already there."
                        : err.message,
                    ),
                },
              )
            }}
          />
        )}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={open && d?.kind === "info"}
        onOpenChange={setOpen}
        title={d?.kind === "info" ? d.entry.name : "Info"}
        footer={
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="max-md:h-11 max-md:w-full"
              onClick={close}
            >
              Close
            </Button>
          </div>
        }
      >
        {d?.kind === "info" && <Info key={d.entry.path} entry={d.entry} />}
      </ResponsiveDialog>

      <ShareDialog
        open={open && d?.kind === "share"}
        setOpen={setOpen}
        entry={d?.kind === "share" ? d.entry : null}
      />

      <TransferDialog
        open={open && d?.kind === "transfer"}
        setOpen={setOpen}
        entries={d?.kind === "transfer" ? d.entries : []}
        move={d?.kind === "transfer" && d.move}
        onMoved={onRemoved}
      />
    </ActionsContext.Provider>
  )
}

function Buttons({
  form,
  label,
  pending,
  onCancel,
}: {
  form: string
  label: string
  pending: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
      <Button variant="outline" className="max-md:h-11" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        type="submit"
        form={form}
        disabled={pending}
        className="max-md:h-11"
      >
        {pending && <Loader2 className="animate-spin" />}
        {label}
      </Button>
    </div>
  )
}

const finePointer = () =>
  typeof window !== "undefined" && matchMedia("(pointer: fine)").matches

function NameForm({
  initial,
  placeholder,
  selectStem = false,
  onSubmit,
}: {
  initial: string
  placeholder?: string
  // Select the name without its extension, the way desktop file managers do.
  selectStem?: boolean
  onSubmit: (name: string, setError: (error: string) => void) => void
}) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string>()
  // Stable, so it runs once on mount and not again on every keystroke.
  const focusName = useCallback(
    (el: HTMLInputElement | null) => {
      if (!el || !finePointer()) return
      // After the dialog's own focus handling.
      requestAnimationFrame(() => {
        el.focus()
        const ext = extension(initial)
        const end = selectStem && ext ? initial.length - ext.length - 1 : -1
        el.setSelectionRange(0, end > 0 ? end : initial.length)
      })
    },
    [initial, selectStem],
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    const invalid = nameError(trimmed)
    if (invalid) return setError(invalid)
    setError(undefined)
    onSubmit(trimmed, setError)
  }

  return (
    <form id="file-name-form" onSubmit={submit} noValidate>
      <Field label="Name" error={error}>
        {(p) => (
          <Input
            {...p}
            value={name}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            onChange={(e) => setName(e.target.value)}
            ref={focusName}
          />
        )}
      </Field>
    </form>
  )
}

// Selects the field once when it mounts (an inline ref would rerun, and
// reselect, on every keystroke).
function DestinationForm({
  initial,
  entries,
  onSubmit,
}: {
  initial: string
  entries: FileEntry[]
  onSubmit: (path: string, setError: (error: string) => void) => void
}) {
  const source = useSource()
  const [path, setPath] = useState(initial)
  const [error, setError] = useState<string>()
  return (
    <form
      id="file-dest-form"
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        const p = path.trim().replace(/(.)\/+$/, "$1")
        if (!p.startsWith("/")) return setError("Enter a full path, like /srv.")
        setError(undefined)
        onSubmit(p, setError)
      }}
    >
      <FolderPicker
        lister={source}
        value={path}
        onChange={(p) => {
          setPath(p)
          setError(undefined)
        }}
        disabled={(p) => (source.buckets && p === "/") || insideAny(p, entries)}
      />
      <Field label="Folder" error={error}>
        {(p) => (
          <Input
            {...p}
            value={path}
            className="font-mono"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(e) => setPath(e.target.value)}
          />
        )}
      </Field>
    </form>
  )
}

const WHO = ["Owner", "Group", "Others"] as const
const BITS = [
  { label: "Read", bit: 4 },
  { label: "Write", bit: 2 },
  { label: "Execute", bit: 1 },
] as const

// The permission digits of `perm` ("0755" → [7, 5, 5]); the leading special
// digit (setuid, sticky…) is kept as is.
function digits(perm: string) {
  const p = perm.padStart(4, "0").slice(-4)
  return { special: p[0], who: [1, 2, 3].map((i) => Number(p[i])) }
}

export function symbolic(perm: string) {
  return digits(perm)
    .who.map(
      (n) => `${n & 4 ? "r" : "-"}${n & 2 ? "w" : "-"}${n & 1 ? "x" : "-"}`,
    )
    .join("")
}

function PermissionsForm({
  entries,
  onDone,
}: {
  entries: FileEntry[]
  onDone: () => void
}) {
  const { chmod, chown } = useFileOps(useSource())
  const first = entries[0]
  const start = digits(first.perm)
  const sameOwner = entries.every((e) => e.owner === first.owner)
  const sameGroup = entries.every((e) => e.group === first.group)
  const [who, setWho] = useState(start.who)
  const [octal, setOctal] = useState(start.who.join(""))
  const [owner, setOwner] = useState(sameOwner ? first.owner : "")
  const [group, setGroup] = useState(sameGroup ? first.group : "")
  const [recursive, setRecursive] = useState(false)
  const [error, setError] = useState<string>()
  const hasDirs = entries.some(isDir)
  const paths = entries.map((e) => e.path)

  const setBits = (next: number[]) => {
    setWho(next)
    setOctal(next.join(""))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^[0-7]{3}$/.test(octal)) return setError("Use three digits, 0–7.")
    setError(undefined)
    const mode = `${start.special === "0" ? "" : start.special}${octal}`
    const modeChanged =
      entries.length > 1 || recursive || octal !== start.who.join("")
    const ownerChanged =
      (owner.trim() && owner.trim() !== first.owner) ||
      (group.trim() && group.trim() !== first.group) ||
      (recursive && (owner.trim() || group.trim()))
    try {
      if (modeChanged)
        await chmod.mutateAsync({
          mode,
          paths,
          recursive: recursive || undefined,
        })
      if (ownerChanged)
        await chown.mutateAsync({
          owner: owner.trim() || undefined,
          group: group.trim() || undefined,
          paths,
          recursive: recursive || undefined,
        })
      onDone()
      if (modeChanged || ownerChanged) toast.success("Permissions updated")
    } catch (err) {
      setError((err as ApiError).message)
    }
  }

  return (
    <form
      id="file-perm-form"
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-5"
    >
      <div className="overflow-hidden rounded-2xl border">
        <table className="w-full text-body-sm">
          <thead className="bg-subtle text-caption text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start font-medium" />
              {BITS.map((b) => (
                <th key={b.label} className="p-2 font-medium">
                  {b.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {WHO.map((label, row) => (
              <tr key={label} className="h-12">
                <th scope="row" className="px-3 text-start font-medium">
                  {label}
                </th>
                {BITS.map((b) => (
                  <td key={b.label} className="text-center">
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is the control; the label widens its tap target */}
                    <label className="inline-flex size-11 items-center justify-center">
                      <Checkbox
                        aria-label={`${label} ${b.label.toLowerCase()}`}
                        checked={(who[row] & b.bit) !== 0}
                        onCheckedChange={(on) =>
                          setBits(
                            who.map((n, i) =>
                              i === row ? (on ? n | b.bit : n & ~b.bit) : n,
                            ),
                          )
                        }
                        className="max-md:size-5"
                      />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-[7rem_1fr] items-end gap-3">
        <Field label="Octal" error={error}>
          {(p) => (
            <Input
              {...p}
              value={octal}
              inputMode="numeric"
              maxLength={3}
              className="font-mono"
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-7]/g, "").slice(0, 3)
                setOctal(v)
                if (v.length === 3) setWho([...v].map(Number))
              }}
            />
          )}
        </Field>
        <p className="pb-2.5 font-mono text-body-sm text-muted-foreground">
          {/^[0-7]{3}$/.test(octal) ? symbolic(`0${octal}`) : "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Owner">
          {(p) => (
            <Input
              {...p}
              value={owner}
              placeholder={sameOwner ? undefined : "Mixed"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setOwner(e.target.value)}
            />
          )}
        </Field>
        <Field label="Group">
          {(p) => (
            <Input
              {...p}
              value={group}
              placeholder={sameGroup ? undefined : "Mixed"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setGroup(e.target.value)}
            />
          )}
        </Field>
      </div>

      {hasDirs && (
        // biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is the control
        <label className="flex min-h-11 items-center gap-3 text-body-sm">
          <Checkbox
            checked={recursive}
            onCheckedChange={(on) => setRecursive(on)}
          />
          Apply to everything inside the folders too
        </label>
      )}
      <p className="-mt-2 text-caption text-muted-foreground">
        Changing the owner needs root on the server.
      </p>
    </form>
  )
}

function CompressForm({
  entries,
  dir,
  onDone,
}: {
  entries: FileEntry[]
  dir: string
  onDone: () => void
}) {
  const { compress } = useFileOps(useSource())
  const [format, setFormat] = useState<"tar.gz" | "zip">("tar.gz")
  const [name, setName] = useState(
    entries.length === 1
      ? entries[0].name
      : basename(dir) === "/"
        ? "archive"
        : basename(dir),
  )
  const [error, setError] = useState<string>()

  return (
    <form
      id="file-compress-form"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = name.trim()
        const invalid = nameError(trimmed)
        if (invalid) return setError(invalid)
        setError(undefined)
        const file = `${trimmed}.${format}`
        const id = toast.loading(`Compressing into ${file}…`)
        compress.mutate(
          {
            format,
            paths: entries.map((x) => x.path),
            destination: joinPath(dir, file),
          },
          {
            onSuccess: (entry) => {
              onDone()
              toast.success(`Created ${entry.name}`, {
                id,
                description: formatSize(entry.size),
              })
            },
            onError: (err) => {
              toast.dismiss(id)
              setError(
                err.status === 409
                  ? "An archive with that name is already here."
                  : err.message,
              )
            },
          },
        )
      }}
    >
      <Segmented
        label="Format"
        value={format}
        onChange={setFormat}
        options={[
          { value: "tar.gz", label: "tar.gz" },
          { value: "zip", label: "zip" },
        ]}
      />
      <Field label="Archive name" error={error}>
        {(p) => (
          <div className="flex items-center gap-2">
            <Input
              {...p}
              value={name}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="shrink-0 font-mono text-body-sm text-muted-foreground">
              .{format}
            </span>
          </div>
        )}
      </Field>
    </form>
  )
}

function Info({ entry }: { entry: FileEntry }) {
  const { posix } = useSource()
  const dir = isDir(entry)
  const rows: [string, ReactNode][] = [
    [
      "Type",
      entry.type === "symlink"
        ? `Link to a ${entry.target_type === "dir" ? "folder" : "file"}`
        : dir
          ? "Folder"
          : extension(entry.name)
            ? `${extension(entry.name).toUpperCase()} file`
            : "File",
    ],
    [
      "Size",
      dir ? (
        <FolderSize key="size" entry={entry} />
      ) : (
        `${formatSize(entry.size)}${entry.size >= 1024 ? ` (${entry.size.toLocaleString()} bytes)` : ""}`
      ),
    ],
    ["Modified", formatDate(entry.modified)],
  ]
  if (posix)
    rows.push(
      [
        "Permissions",
        <span key="p" className="font-mono">
          {entry.perm} · {symbolic(entry.perm)}
        </span>,
      ],
      ["Owner", `${entry.owner} (${entry.uid})`],
      ["Group", `${entry.group} (${entry.gid})`],
    )
  if (entry.link_target) rows.push(["Points to", entry.link_target])
  if (entry.bucket) rows[0][1] = "Bucket"
  if (entry.content_type && !dir)
    rows.push(["Content type", entry.content_type])
  if (entry.storage_class) rows.push(["Storage class", entry.storage_class])
  if (entry.etag && !dir)
    rows.push([
      "ETag",
      <span key="etag" className="font-mono break-all">
        {entry.etag}
      </span>,
    ])

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() =>
          navigator.clipboard
            .writeText(entry.path)
            .then(() => toast.success("Path copied"))
        }
        className="group flex min-h-11 items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-start font-mono text-body-sm break-all"
      >
        <span className="flex-1">{entry.path}</span>
        <Copy className="size-4 shrink-0 text-ash group-hover:text-foreground" />
      </button>
      <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2.5 text-body-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn("min-w-0 break-words")}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
