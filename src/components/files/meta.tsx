import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileCog,
  FileImage,
  FileJson,
  FileKey,
  FileSpreadsheet,
  FileTerminal,
  FileText,
  FileVideo,
  Folder,
  FolderSymlink,
  Loader2,
  type LucideIcon,
  Package,
} from "lucide-react"
import type { ReactNode } from "react"

import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useFolderSize } from "./api"
import { type FileEntry, useSource } from "./source"

// A folder, or a symlink to one: both open as folders.
export const isDir = (e: FileEntry) =>
  e.type === "dir" || (e.type === "symlink" && e.target_type === "dir")

export function extension(name: string) {
  const lower = name.toLowerCase()
  for (const multi of [".tar.gz", ".tar.bz2", ".tar.xz"]) {
    if (lower.endsWith(multi)) return multi.slice(1)
  }
  const dot = lower.lastIndexOf(".")
  return dot > 0 ? lower.slice(dot + 1) : ""
}

const groups: Record<string, string[]> = {
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"],
  video: ["mp4", "webm", "mov", "m4v", "ogv"],
  audio: ["mp3", "wav", "ogg", "oga", "flac", "m4a", "aac", "opus"],
  pdf: ["pdf"],
  archive: [
    "zip",
    "tar",
    "gz",
    "tgz",
    "tar.gz",
    "tar.bz2",
    "tar.xz",
    "bz2",
    "xz",
    "7z",
    "rar",
  ],
  code: [
    "js",
    "mjs",
    "cjs",
    "ts",
    "tsx",
    "jsx",
    "go",
    "py",
    "rb",
    "php",
    "java",
    "kt",
    "rs",
    "c",
    "h",
    "cpp",
    "hpp",
    "cs",
    "swift",
    "lua",
    "pl",
    "html",
    "css",
    "scss",
    "vue",
    "svelte",
    "sql",
  ],
  shell: ["sh", "bash", "zsh", "fish", "ps1"],
  data: ["json", "jsonl", "yaml", "yml", "toml", "xml"],
  config: ["conf", "cfg", "ini", "env", "service", "timer", "socket", "rules"],
  key: ["pem", "key", "crt", "cer", "pub", "csr", "p12"],
  sheet: ["csv", "tsv", "xls", "xlsx", "ods"],
}

export type Kind = keyof typeof groups | "folder" | "file"

export function kindOf(entry: FileEntry): Kind {
  if (isDir(entry)) return "folder"
  const ext = extension(entry.name)
  for (const [kind, exts] of Object.entries(groups)) {
    if (exts.includes(ext)) return kind as Kind
  }
  if (
    /^(\.?[\w-]+rc|dockerfile|makefile|\.gitignore|\.env.*)$/i.test(entry.name)
  )
    return "config"
  if (/^id_(rsa|ed25519|ecdsa|dsa)$|^authorized_keys$/.test(entry.name))
    return "key"
  return "file"
}

const icons: Record<Kind, LucideIcon> = {
  folder: Folder,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  archive: FileArchive,
  code: FileCode,
  shell: FileTerminal,
  data: FileJson,
  config: FileCog,
  key: FileKey,
  sheet: FileSpreadsheet,
  file: File,
}

// Opened in the media viewer instead of the editor.
export const previewable = (entry: FileEntry) =>
  ["image", "video", "audio", "pdf"].includes(kindOf(entry))

export const isArchive = (entry: FileEntry) =>
  !isDir(entry) && kindOf(entry) === "archive"

// "site.tar.gz" → "site": the folder "Extract to folder" unpacks into.
export const archiveStem = (name: string) =>
  name.replace(/\.(tar\.(gz|bz2|xz)|tgz|tbz2|txz|tar|zip|gz)$/i, "") || name

// name, or name-2, name-3… when something in the folder already has it.
export function freeName(name: string, siblings: FileEntry[]) {
  const taken = new Set(siblings.map((e) => e.name))
  let next = name
  for (let i = 2; taken.has(next); i++) next = `${name}-${i}`
  return next
}

export function FileIcon({
  entry,
  className,
}: {
  entry: FileEntry
  className?: string
}) {
  if (entry.bucket) return <BucketIcon className={className} />
  const kind = kindOf(entry)
  const Icon =
    kind === "folder" && entry.type === "symlink" ? FolderSymlink : icons[kind]
  return (
    <Icon
      aria-hidden
      className={cn(
        "shrink-0",
        kind === "folder" ? "fill-brand-soft text-brand" : "text-ash",
        className,
      )}
    />
  )
}

// An S3 bucket: a box, so it never reads as a folder.
export function BucketIcon({ className }: { className?: string }) {
  return (
    <Package
      aria-hidden
      className={cn("shrink-0 fill-muted text-brand-strong", className)}
    />
  )
}

// A tinted tile around the icon (phone rows).
export function FileTile({ entry }: { entry: FileEntry }) {
  const folder = isDir(entry)
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        entry.bucket
          ? "border border-border bg-subtle"
          : folder
            ? "bg-brand-soft"
            : "bg-muted",
      )}
    >
      <FileIcon entry={entry} className="size-5" />
    </span>
  )
}

export { formatSize }

// A folder's total size, worked out once it's on screen. Links to folders
// aren't followed: they show `fallback`.
export function FolderSize({
  entry,
  fallback = "—",
}: {
  entry: FileEntry
  fallback?: ReactNode
}) {
  const source = useSource()
  const size = useFolderSize(source, entry.path, entry.type === "dir")
  if (size.data !== undefined) return formatSize(size.data)
  if (size.isFetching)
    return (
      <Loader2
        aria-label="Calculating size"
        className="inline size-3.5 animate-spin align-[-0.125em] text-ash"
      />
    )
  return <span title={size.error?.message}>{fallback}</span>
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})
const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
})
const shortTime = new Intl.DateTimeFormat(undefined, { timeStyle: "short" })

// "" = unknown (S3 folders have no date).
export const formatDate = (iso: string) =>
  iso ? dateFormat.format(new Date(iso)) : "—"

// Today: the time; this year: the day; else the full date.
export function formatModified(iso: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return shortTime.format(d)
  if (d.getFullYear() === now.getFullYear()) return shortDate.format(d)
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d)
}

// Path helpers (every source uses POSIX paths).
export const joinPath = (dir: string, name: string) =>
  dir === "/" ? `/${name}` : `${dir}/${name}`

export function dirname(path: string) {
  const i = path.lastIndexOf("/")
  return i <= 0 ? "/" : path.slice(0, i)
}

export const basename = (path: string) =>
  path.split("/").filter(Boolean).pop() ?? "/"

// "/var/log/nginx" → ["/", "/var", "/var/log", "/var/log/nginx"]
export function crumbs(path: string) {
  const parts = path.split("/").filter(Boolean)
  return [
    { name: "/", path: "/" },
    ...parts.map((name, i) => ({
      name,
      path: `/${parts.slice(0, i + 1).join("/")}`,
    })),
  ]
}

// A name the source would accept for one entry.
export function nameError(name: string) {
  if (!name.trim()) return "Enter a name."
  if (name.includes("/")) return "A name can't contain “/”."
  if (name === "." || name === "..") return "That name is reserved."
  return null
}

export type SortField = "name" | "size" | "modified"
export type Sort = { field: SortField; order: "asc" | "desc" }

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

// Folders first, then by the chosen field.
export function sortEntries(entries: FileEntry[], { field, order }: Sort) {
  const dir = order === "asc" ? 1 : -1
  return [...entries].sort((a, b) => {
    const folders = Number(isDir(b)) - Number(isDir(a))
    if (folders) return folders
    let cmp = 0
    if (field === "size") cmp = a.size - b.size
    else if (field === "modified")
      cmp = (Date.parse(a.modified) || 0) - (Date.parse(b.modified) || 0)
    if (!cmp) cmp = collator.compare(a.name, b.name)
    return cmp * dir
  })
}

export const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

// Shortcut labels: "⌘C" on a Mac, "Ctrl+C" elsewhere.
export const shortcut = (key: string) => (isMac ? `⌘${key}` : `Ctrl+${key}`)
