"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { ApiError, api } from "@/lib/api"
import type {
  ChmodFilesRequest,
  ChownFilesRequest,
  CompressFilesRequest,
  ErrorModel,
  FileEntry,
  WriteFileRequest,
} from "@/lib/services"

export const fileKeys = {
  all: (serverId: string) => ["files", serverId] as const,
  list: (serverId: string, path: string) =>
    ["files", serverId, "list", path] as const,
  content: (serverId: string, path: string) =>
    ["files", serverId, "content", path] as const,
  search: (serverId: string, path: string, q: string) =>
    ["files", serverId, "search", path, q] as const,
  sizes: (serverId: string) => ["files", serverId, "size"] as const,
  users: (serverId: string) => ["files", serverId, "users"] as const,
  size: (serverId: string, path: string) =>
    ["files", serverId, "size", path] as const,
}

// One folder. "" is the login user's home. Keeps showing the previous folder
// while the next one loads, so navigating doesn't flash an empty list.
export function useListing(serverId: string, path: string) {
  return useQuery<Awaited<ReturnType<typeof api.files.listFiles>>, ApiError>({
    queryKey: fileKeys.list(serverId, path),
    queryFn: () => api.files.listFiles(serverId, { path }),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

// A text file for the editor. Never refetched behind the user's back: that
// would replace what they are typing.
export function useFileContent(serverId: string, path: string | null) {
  return useQuery<Awaited<ReturnType<typeof api.files.readFile>>, ApiError>({
    queryKey: fileKeys.content(serverId, path ?? ""),
    queryFn: () => api.files.readFile(serverId, { path: path ?? "" }),
    enabled: path !== null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useSearchFiles(serverId: string, path: string, q: string) {
  return useQuery<Awaited<ReturnType<typeof api.files.searchFiles>>, ApiError>({
    queryKey: fileKeys.search(serverId, path, q),
    queryFn: () => api.files.searchFiles(serverId, { path, q }),
    enabled: q.length > 0,
    staleTime: 30_000,
    retry: false,
  })
}

// Every write changes some listing and folder sizes; refresh them all for
// this server (sizes keep showing the old total until du finishes again).
function useFileMutation<TVars, TData>(
  serverId: string,
  fn: (vars: TVars) => Promise<TData>,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, ApiError, TVars>({
    mutationFn: fn,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...fileKeys.all(serverId), "list"],
      })
      queryClient.invalidateQueries({ queryKey: fileKeys.sizes(serverId) })
    },
  })
}

export function useFileOps(serverId: string) {
  const f = api.files
  return {
    mkdir: useFileMutation(serverId, (path: string) =>
      f.makeFolder(serverId, { path }),
    ),
    rename: useFileMutation(serverId, (v: { from: string; to: string }) =>
      f.renameFile(serverId, v),
    ),
    move: useFileMutation(
      serverId,
      (v: { paths: string[]; destination: string }) => f.moveFiles(serverId, v),
    ),
    copy: useFileMutation(
      serverId,
      (v: { paths: string[]; destination: string }) => f.copyFiles(serverId, v),
    ),
    remove: useFileMutation(serverId, (paths: string[]) =>
      f.deleteFiles(serverId, { paths }),
    ),
    chmod: useFileMutation(serverId, (v: ChmodFilesRequest) =>
      f.chmodFiles(serverId, v),
    ),
    chown: useFileMutation(serverId, (v: ChownFilesRequest) =>
      f.chownFiles(serverId, v),
    ),
    compress: useFileMutation(serverId, (v: CompressFilesRequest) =>
      f.compressFiles(serverId, v),
    ),
    extract: useFileMutation(
      serverId,
      (v: { path: string; destination?: string }) =>
        f.extractArchive(serverId, v),
    ),
    write: useFileMutation(serverId, (v: WriteFileRequest) =>
      f.writeFile(serverId, v),
    ),
  }
}

// du walks the whole tree, so a big listing would open an SSH session per
// folder at once: run a few at a time. Leaving the folder aborts the rest.
const SIZE_SLOTS = 3
let sizesRunning = 0
const sizesWaiting: (() => void)[] = []

async function sizeSlot<T>(signal: AbortSignal, fn: () => Promise<T>) {
  if (sizesRunning >= SIZE_SLOTS) {
    await new Promise<void>((resolve, reject) => {
      const go = () => {
        signal.removeEventListener("abort", cancel)
        resolve()
      }
      const cancel = () => {
        sizesWaiting.splice(sizesWaiting.indexOf(go), 1)
        reject(signal.reason)
      }
      sizesWaiting.push(go)
      signal.addEventListener("abort", cancel, { once: true })
    })
  }
  sizesRunning++
  try {
    return await fn()
  } finally {
    sizesRunning--
    sizesWaiting.shift()?.()
  }
}

// Bytes on disk under a folder. Kernel filesystems have no real size.
export function useFolderSize(serverId: string, path: string, enabled = true) {
  return useQuery<number, ApiError>({
    queryKey: fileKeys.size(serverId, path),
    queryFn: ({ signal }) =>
      sizeSlot(signal, () =>
        api.files
          .folderSize(serverId, { path }, { signal })
          .then((r) => r.size),
      ),
    enabled: enabled && !["/proc", "/sys"].includes(path),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export type LoginUser = { name: string; uid: number; home: string }

// Accounts that can log in (a real shell, whatever the uid: containers often
// use ones below 1000), read from /etc/passwd, which every user can read.
// Root first, then by name.
export function useLoginUsers(serverId: string) {
  return useQuery<LoginUser[], ApiError>({
    queryKey: fileKeys.users(serverId),
    queryFn: async () => {
      const { content } = await api.files.readFile(serverId, {
        path: "/etc/passwd",
      })
      return content
        .split("\n")
        .map((line) => line.split(":"))
        .filter((f) => f.length >= 7)
        .map(([name, , uid, , , home, shell]) => ({
          name,
          uid: Number(uid),
          home,
          shell: shell.trim(),
        }))
        .filter(
          (u) =>
            u.uid !== 65534 &&
            u.home.startsWith("/") &&
            u.home !== "/" &&
            u.home !== "/nonexistent" &&
            u.shell !== "" &&
            !/\/(nologin|false|sync|halt|shutdown)$/.test(u.shell),
        )
        .map(({ name, uid, home }) => ({ name, uid, home }))
        .sort(
          (a, b) =>
            Number(b.uid === 0) - Number(a.uid === 0) ||
            a.name.localeCompare(b.name),
        )
    },
    staleTime: 10 * 60_000,
    retry: false,
  })
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

// Downloads are plain links (the browser streams them to disk); several
// paths or a folder arrive as one zip. `inline` opens media in the browser.
export function downloadUrl(
  serverId: string,
  paths: string[],
  opts: { inline?: boolean; name?: string } = {},
) {
  const params = new URLSearchParams()
  for (const p of paths) params.append("path", p)
  if (opts.inline) params.set("inline", "true")
  if (opts.name) params.set("name", opts.name)
  return `${API_URL}/servers/${serverId}/files/download?${params}`
}

export function download(serverId: string, paths: string[], name?: string) {
  const a = document.createElement("a")
  a.href = downloadUrl(serverId, paths, { name })
  a.rel = "noopener"
  document.body.append(a)
  a.click()
  a.remove()
}

// Upload one file with progress (fetch can't report upload progress yet).
// A 409 means the file exists and `overwrite` was off.
export function uploadFile(
  serverId: string,
  path: string,
  file: Blob,
  {
    overwrite = false,
    onProgress,
    signal,
  }: {
    overwrite?: boolean
    onProgress?: (loaded: number) => void
    signal?: AbortSignal
  } = {},
) {
  return new Promise<FileEntry>((resolve, reject) => {
    const params = new URLSearchParams({ path })
    if (overwrite) params.set("overwrite", "true")
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", `${API_URL}/servers/${serverId}/files/upload?${params}`)
    xhr.withCredentials = true
    xhr.setRequestHeader("Content-Type", "application/octet-stream")
    xhr.responseType = "json"
    xhr.upload.onprogress = (e) => onProgress?.(e.loaded)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
      else {
        const body = xhr.response as ErrorModel | null
        reject(
          new ApiError(
            xhr.status,
            body?.detail ?? body?.title ?? xhr.statusText,
            body ?? undefined,
          ),
        )
      }
    }
    xhr.onerror = () => reject(new ApiError(0, "The upload was interrupted."))
    xhr.onabort = () => reject(new DOMException("Canceled", "AbortError"))
    signal?.addEventListener("abort", () => xhr.abort(), { once: true })
    xhr.send(file)
  })
}
