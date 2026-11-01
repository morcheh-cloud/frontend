"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { createSerializer, parseAsString, useQueryStates } from "nuqs"
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import { useOpen } from "@/hooks/useOpen"
import type { ApiError } from "@/lib/api"
import type { DirListing, FileEntry } from "@/lib/services"
import { useServerPage } from "../../components/server-page"
import { terminalHref } from "../../terminal/components/use-tabs"
import { fileKeys, useFileOps, useListing, useSearchFiles } from "../api"
import { FileEditor } from "./editor"
import { FileActionsProvider } from "./file-actions"
import { dirname, isDir, previewable, type Sort, sortEntries } from "./meta"
import { FilePreview } from "./preview"

type Clipboard = { mode: "cut" | "copy"; entries: FileEntry[]; from: string }

type Manager = {
  serverId: string
  phone: boolean
  // The folder asked for ("" = home) and the one actually on screen.
  path: string
  listing: DirListing | undefined
  loading: boolean
  fetching: boolean
  error: ApiError | null
  refetch: () => void
  go: (path: string) => void
  up: () => void
  // What the list shows: the folder, hidden files and filter applied, sorted.
  entries: FileEntry[]
  hiddenCount: number
  showHidden: boolean
  setShowHidden: (show: boolean) => void
  sort: Sort
  setSort: (sort: Sort) => void
  filter: string
  setFilter: (filter: string) => void
  // A search through every subfolder; null when not searching.
  search: string | null
  setSearch: (q: string | null) => void
  results: ReturnType<typeof useSearchFiles>
  selected: Set<string>
  setSelected: (paths: Set<string>) => void
  selectedEntries: FileEntry[]
  clipboard: Clipboard | null
  cut: (entries: FileEntry[]) => void
  copy: (entries: FileEntry[]) => void
  paste: () => void
  clearClipboard: () => void
  pasting: boolean
  open: (entry: FileEntry) => void
  edit: (path: string) => void
  openTerminal: (dir: string) => void
}

const Context = createContext<Manager | null>(null)

export function useFiles() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error("useFiles outside FileManager")
  return ctx
}

const HIDDEN_KEY = "morcheh.files.hidden"
const SORT_KEY = "morcheh.files.sort"

function stored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// Link to the file manager opening the folder `path`.
export const filesHref = createSerializer({ path: parseAsString })

// Browser state for one server's files: the folder and the search (in the
// URL, so Back walks up the folders, a reload keeps the results and links can
// be shared), selection, clipboard, and the editor and viewer layered over
// the list.
export function FileManager({ children }: { children: ReactNode }) {
  const { server, phone } = useServerPage()
  const serverId = server.id
  const router = useRouter()
  const ops = useFileOps(serverId)
  const queryClient = useQueryClient()

  const [{ path, q: search }, setUrl] = useQueryStates(
    { path: parseAsString.withDefault(""), q: parseAsString },
    { history: "replace" },
  )
  const setSearch = (q: string | null) => void setUrl({ q })
  const query = useListing(serverId, path)
  // keepPreviousData shows the last folder while the next loads; only trust
  // a listing that belongs to the folder asked for.
  const listing = query.data

  const [showHidden, setShowHiddenState] = useState(() =>
    stored(HIDDEN_KEY, false),
  )
  const [sort, setSortState] = useState<Sort>(() =>
    stored(SORT_KEY, { field: "name", order: "asc" }),
  )
  // The search runs on the filter's text, so a restored search refills it.
  const [filter, setFilter] = useState(search ?? "")
  const searchRef = useRef(search)
  searchRef.current = search
  const results = useSearchFiles(serverId, listing?.path ?? path, search ?? "")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clipboard, setClipboard] = useState<Clipboard | null>(null)

  const [editing, setEditing] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useOpen("file-editor")
  const [viewing, setViewing] = useState<FileEntry | null>(null)
  const [viewerOpen, setViewerOpen] = useOpen("file-preview")

  // A new folder starts fresh. Leaving one clears the search (see `go`);
  // Back and Forward bring back whatever search the URL had.
  const shown = listing?.path
  useEffect(() => {
    if (shown === undefined) return
    setSelected(new Set())
    setFilter(searchRef.current ?? "")
  }, [shown])

  const all = listing?.entries ?? []
  const visible = showHidden ? all : all.filter((e) => !e.name.startsWith("."))
  const needle = filter.trim().toLowerCase()
  const entries = useMemo(
    () =>
      sortEntries(
        needle
          ? visible.filter((e) => e.name.toLowerCase().includes(needle))
          : visible,
        sort,
      ),
    [visible, needle, sort],
  )

  const go = (next: string) => {
    if (next === (listing?.path ?? path)) return void query.refetch()
    setUrl(
      { path: next === listing?.home ? null : next, q: null },
      { history: "push" },
    )
  }

  const selectedEntries = (search ? (results.data?.items ?? []) : all).filter(
    (e) => selected.has(e.path),
  )

  const edit = (p: string) => {
    setEditing(p)
    setEditorOpen(true)
  }

  const open = (entry: FileEntry) => {
    if (isDir(entry)) go(entry.path)
    else if (previewable(entry)) {
      setViewing(entry)
      setViewerOpen(true)
    } else edit(entry.path)
  }

  const siblings = useMemo(
    () =>
      viewing
        ? sortEntries(
            (search ? (results.data?.items ?? []) : all).filter(
              (e) =>
                previewable(e) && dirname(e.path) === dirname(viewing.path),
            ),
            sort,
          )
        : [],
    [viewing, search, results.data, all, sort],
  )

  const dir = listing?.path ?? path

  const paste = () => {
    if (!clipboard) return
    const { mode, entries: items, from } = clipboard
    const paths = items.map((e) => e.path)
    if (mode === "cut" && from === dir) return setClipboard(null)
    const op = mode === "cut" ? ops.move : ops.copy
    op.mutate(
      { paths, destination: dir },
      {
        onSuccess: () => {
          if (mode === "cut") setClipboard(null)
          toast.success(
            `${mode === "cut" ? "Moved" : "Copied"} ${
              items.length === 1 ? items[0].name : `${items.length} items`
            }`,
          )
        },
        onError: (err) =>
          toast.error(
            err.status === 409
              ? "Something with the same name is already here."
              : err.message,
          ),
      },
    )
  }

  const manager: Manager = {
    serverId,
    phone,
    path,
    listing,
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error,
    refetch: () => {
      query.refetch()
      queryClient.invalidateQueries({ queryKey: fileKeys.sizes(serverId) })
    },
    go,
    up: () => listing && listing.path !== "/" && go(listing.parent),
    entries,
    hiddenCount: all.length - visible.length,
    showHidden,
    setShowHidden: (show) => {
      setShowHiddenState(show)
      store(HIDDEN_KEY, show)
    },
    sort,
    setSort: (next) => {
      setSortState(next)
      store(SORT_KEY, next)
    },
    filter,
    setFilter,
    search,
    setSearch: (q) => {
      setSelected(new Set())
      setSearch(q?.trim() ? q.trim() : null)
    },
    results,
    selected,
    setSelected,
    selectedEntries,
    clipboard,
    cut: (items) =>
      items.length && setClipboard({ mode: "cut", entries: items, from: dir }),
    copy: (items) =>
      items.length && setClipboard({ mode: "copy", entries: items, from: dir }),
    paste,
    clearClipboard: () => setClipboard(null),
    pasting: ops.move.isPending || ops.copy.isPending,
    open,
    edit,
    openTerminal: (cwd) =>
      router.push(terminalHref(`/servers/${serverId}/terminal`, { cwd })),
  }

  return (
    <Context.Provider value={manager}>
      <FileActionsProvider
        serverId={serverId}
        dir={dir}
        onCreatedFile={edit}
        onNavigate={go}
        onRemoved={(paths) => {
          const gone = new Set(paths)
          setSelected(new Set([...selected].filter((p) => !gone.has(p))))
        }}
      >
        {children}
      </FileActionsProvider>

      {editing !== null && (
        <FileEditor
          key={editing}
          serverId={serverId}
          path={editing}
          open={editorOpen}
          setOpen={setEditorOpen}
          onClosed={() => setEditing(null)}
          phone={phone}
        />
      )}
      {viewing && (
        <FilePreview
          serverId={serverId}
          entry={viewing}
          siblings={siblings}
          open={viewerOpen}
          setOpen={setViewerOpen}
          onNavigate={setViewing}
          phone={phone}
        />
      )}
    </Context.Provider>
  )
}
