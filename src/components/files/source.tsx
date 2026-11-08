"use client"

import { createContext, type ReactNode, useContext } from "react"

import type {
  ChmodFilesRequest,
  ChownFilesRequest,
  CompressFilesRequest,
  DiskUsage,
  FileContent,
  Job,
  FileEntry as ServerEntry,
  WriteFileRequest,
} from "@/lib/services"

// One entry as the file manager shows it. Storages fill the POSIX fields
// (perm, owner…) with blanks and may not know `modified` ("").
export type FileEntry = ServerEntry & {
  // A top-level folder that is an S3 bucket.
  bucket?: boolean
  storage_class?: string
  content_type?: string
  etag?: string
}

export type Listing = {
  path: string
  parent: string
  // Where Home goes.
  home: string
  entries: FileEntry[]
  // The folder has more entries than were listed.
  truncated?: boolean
}

export type LoginUser = { name: string; uid: number; home: string }

// The other end of a transfer: a server or a storage.
export type Endpoint = { server_id: string } | { storage_id: string }

// The tabs of a bucket's settings.
export type BucketTab =
  | "overview"
  | "access"
  | "lifecycle"
  | "cors"
  | "security"

// S3 bucket settings, run by the storage page. Absent = no bucket UI.
export type BucketHooks = {
  settings: (bucket: string, tab?: BucketTab) => void
  // Missing = this person can't.
  empty?: (bucket: string) => void
  create?: () => void
}

// Where the file manager reads and writes: a server over SFTP or a storage
// (S3, FTP, SFTP, WebDAV). Optional methods turn their UI on.
export type FileSource = {
  // Query key prefix, unique per server or storage.
  key: readonly unknown[]
  // "server" / "storage", for sentences like "changed on the server".
  noun: string
  endpoint: Endpoint
  // Every write is refused: hide the write actions.
  readOnly?: boolean
  // Folders can be listed, but files can't be opened or downloaded.
  listOnly?: boolean
  // Top-level folders are buckets: files can't go at "/".
  buckets?: boolean
  bucketHooks?: BucketHooks
  // Unix permissions, owners and symlinks are real.
  posix?: boolean

  list: (path: string) => Promise<Listing>
  read: (path: string) => Promise<FileContent>
  write: (v: WriteFileRequest) => Promise<{ modified: string; size: number }>
  search: (
    path: string,
    q: string,
  ) => Promise<{ items: FileEntry[]; truncated: boolean }>
  size: (path: string, signal: AbortSignal) => Promise<number>
  mkdir: (path: string) => Promise<unknown>
  rename: (v: { from: string; to: string }) => Promise<unknown>
  move: (v: { paths: string[]; destination: string }) => Promise<Job>
  copy: (v: { paths: string[]; destination: string }) => Promise<Job>
  remove: (paths: string[]) => Promise<unknown>
  downloadUrl: (
    paths: string[],
    opts?: { inline?: boolean; name?: string },
  ) => string
  uploadUrl: (path: string, overwrite: boolean) => string

  chmod?: (v: ChmodFilesRequest) => Promise<unknown>
  chown?: (v: ChownFilesRequest) => Promise<unknown>
  // These run as background jobs: the answer is the queued job.
  compress?: (v: CompressFilesRequest) => Promise<Job>
  extract?: (v: { path: string; destination?: string }) => Promise<Job>
  fetchUrl?: (v: {
    url: string
    path: string
    name?: string
    overwrite?: boolean
  }) => Promise<Job>
  share?: (
    path: string,
    expiresIn: number,
  ) => Promise<{ url: string; expires_at: string }>
  // What takes the space under a folder (the disk usage analyser).
  usage?: (path: string, signal: AbortSignal) => Promise<DiskUsage>
  loginUsers?: () => Promise<LoginUser[]>
  // A link to a terminal opened in `cwd`.
  terminalHref?: (cwd: string) => string
}

const SourceContext = createContext<FileSource | null>(null)

export function FileSourceProvider({
  source,
  children,
}: {
  source: FileSource
  children: ReactNode
}) {
  return <SourceContext value={source}>{children}</SourceContext>
}

export function useSource() {
  const source = useContext(SourceContext)
  if (!source) throw new Error("useSource needs a <FileSourceProvider>")
  return source
}
