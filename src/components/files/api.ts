"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { ApiError } from "@/lib/api"
import type {
  ChmodFilesRequest,
  ChownFilesRequest,
  CompressFilesRequest,
  ErrorModel,
  FileContent,
  WriteFileRequest,
} from "@/lib/services"
import type { FileEntry, FileSource, Listing, LoginUser } from "./source"

export const fileKeys = {
  all: (s: FileSource) => s.key,
  // Also used by the folder picker, which only has a `Lister`.
  list: (s: Pick<FileSource, "key">, path: string) =>
    [...s.key, "list", path] as const,
  content: (s: FileSource, path: string) =>
    [...s.key, "content", path] as const,
  search: (s: FileSource, path: string, q: string) =>
    [...s.key, "search", path, q] as const,
  sizes: (s: FileSource) => [...s.key, "size"] as const,
  users: (s: FileSource) => [...s.key, "users"] as const,
  size: (s: FileSource, path: string) => [...s.key, "size", path] as const,
}

// One folder. "" is the home folder. Keeps showing the previous folder
// while the next one loads, so navigating doesn't flash an empty list.
export function useListing(source: FileSource, path: string) {
  return useQuery<Listing, ApiError>({
    queryKey: fileKeys.list(source, path),
    queryFn: () => source.list(path),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

// A text file for the editor. Never refetched behind the user's back: that
// would replace what they are typing.
export function useFileContent(source: FileSource, path: string | null) {
  return useQuery<FileContent, ApiError>({
    queryKey: fileKeys.content(source, path ?? ""),
    queryFn: () => source.read(path ?? ""),
    enabled: path !== null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useSearchFiles(source: FileSource, path: string, q: string) {
  return useQuery<{ items: FileEntry[]; truncated: boolean }, ApiError>({
    queryKey: fileKeys.search(source, path, q),
    queryFn: () => source.search(path, q),
    enabled: q.length > 0,
    staleTime: 30_000,
    retry: false,
  })
}

// Every write changes some listing and folder sizes; refresh them all for
// this source (sizes keep showing the old total until the count finishes).
function useFileMutation<TVars, TData>(
  source: FileSource,
  fn: (vars: TVars) => Promise<TData>,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, ApiError, TVars>({
    mutationFn: fn,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...source.key, "list"] })
      queryClient.invalidateQueries({ queryKey: fileKeys.sizes(source) })
    },
  })
}

const unsupported = (): Promise<never> =>
  Promise.reject(new ApiError(405, "This storage can't do that."))

export function useFileOps(source: FileSource) {
  const s = source
  return {
    mkdir: useFileMutation(s, (path: string) => s.mkdir(path)),
    rename: useFileMutation(s, (v: { from: string; to: string }) =>
      s.rename(v),
    ),
    move: useFileMutation(s, (v: { paths: string[]; destination: string }) =>
      s.move(v),
    ),
    copy: useFileMutation(s, (v: { paths: string[]; destination: string }) =>
      s.copy(v),
    ),
    remove: useFileMutation(s, (paths: string[]) => s.remove(paths)),
    chmod: useFileMutation(s, (v: ChmodFilesRequest) =>
      s.chmod ? s.chmod(v) : unsupported(),
    ),
    chown: useFileMutation(s, (v: ChownFilesRequest) =>
      s.chown ? s.chown(v) : unsupported(),
    ),
    compress: useFileMutation(s, (v: CompressFilesRequest) =>
      s.compress ? s.compress(v) : unsupported(),
    ),
    extract: useFileMutation(s, (v: { path: string; destination?: string }) =>
      s.extract ? s.extract(v) : unsupported(),
    ),
    write: useFileMutation(s, (v: WriteFileRequest) => s.write(v)),
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

// Bytes under a folder. Kernel filesystems have no real size.
export function useFolderSize(
  source: FileSource,
  path: string,
  enabled = true,
) {
  return useQuery<number, ApiError>({
    queryKey: fileKeys.size(source, path),
    queryFn: ({ signal }) => sizeSlot(signal, () => source.size(path, signal)),
    enabled: enabled && !(source.posix && ["/proc", "/sys"].includes(path)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

// Accounts that can log in, for the home folder shortcuts (servers only).
export function useLoginUsers(source: FileSource) {
  return useQuery<LoginUser[], ApiError>({
    queryKey: fileKeys.users(source),
    queryFn: () => source.loginUsers?.() ?? [],
    enabled: !!source.loginUsers,
    staleTime: 10 * 60_000,
    retry: false,
  })
}

// Downloads are plain links (the browser streams them to disk); several
// paths or a folder arrive as one zip.
export function download(source: FileSource, paths: string[], name?: string) {
  const a = document.createElement("a")
  a.href = source.downloadUrl(paths, { name })
  a.rel = "noopener"
  document.body.append(a)
  a.click()
  a.remove()
}

// Upload one file with progress (fetch can't report upload progress yet).
// A 409 means the file exists and `overwrite` was off.
export function uploadFile(
  source: FileSource,
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
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", source.uploadUrl(path, overwrite))
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
