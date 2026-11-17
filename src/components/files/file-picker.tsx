"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  ArrowUp,
  ChevronRight,
  CornerDownLeft,
  FolderOpen,
  House,
  Loader2,
  RotateCw,
  Search,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { fileKeys } from "./api"
import type { Lister } from "./listers"
import {
  crumbs,
  dirname,
  FileIcon,
  formatModified,
  formatSize,
  isDir,
} from "./meta"
import type { FileEntry, Listing } from "./source"

type Sort = "name" | "newest"

const byName = (a: FileEntry, b: FileEntry) =>
  Number(a.name.startsWith(".")) - Number(b.name.startsWith(".")) ||
  a.name.localeCompare(b.name, undefined, { numeric: true })

const byNewest = (a: FileEntry, b: FileEntry) =>
  (b.modified || "").localeCompare(a.modified || "") || byName(a, b)

// Browse folder by folder and pick one file. `start` = the folder it opens
// in ("" = the home folder on a server, "/" on a storage). `value` is the
// picked file; a path typed below picks it too, so a file in a folder that
// can't be listed is still reachable.
export function FilePicker({
  lister,
  start,
  initialDir,
  value,
  onPick,
  matches,
  matchLabel = "Looks like a backup",
  className,
}: {
  lister: Lister
  start: string
  // Where to open instead of `start` (e.g. where the last file came from).
  initialDir?: string
  value?: string
  onPick: (path: string) => void
  // Files to raise to the top and mark, e.g. backup dumps.
  matches?: (e: FileEntry) => boolean
  matchLabel?: string
  className?: string
}) {
  const [dir, setDir] = useState(value ? dirname(value) : (initialDir ?? start))
  const [filter, setFilter] = useState("")
  const [sort, setSort] = useState<Sort>("newest")
  const [typed, setTyped] = useState(value ?? "")

  const listing = useQuery<Listing, ApiError>({
    queryKey: fileKeys.list(lister, dir),
    queryFn: () => lister.list(dir),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const here = listing.data?.path ?? dir
  const shown = listing.isPlaceholderData ? undefined : listing.data

  const open = (path: string) => {
    setDir(path)
    setFilter("")
  }

  const q = filter.trim().toLowerCase()
  const entries = (shown?.entries ?? []).filter(
    (e) => !q || e.name.toLowerCase().includes(q),
  )
  const folders = entries.filter(isDir).sort(byName)
  const files = entries
    .filter((e) => !isDir(e))
    .sort(
      (a, b) =>
        Number(!!matches?.(b)) - Number(!!matches?.(a)) ||
        (sort === "newest" ? byNewest(a, b) : byName(a, b)),
    )
  const hasParent = here !== "/" && !!shown?.parent

  function goTyped() {
    const p = typed.trim()
    if (!p) return
    if (p.endsWith("/") && p !== "/") {
      open(p.replace(/\/+$/, ""))
      return
    }
    if (p === "/") {
      open("/")
      return
    }
    if (p.startsWith("/")) setDir(dirname(p))
    onPick(p)
  }

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col gap-3", className)}>
      <nav
        aria-label="Folder"
        className="flex min-w-0 items-center gap-1 overflow-hidden"
      >
        {shown?.home && shown.home !== "/" && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Home folder"
            title="Home folder"
            className="shrink-0 max-md:size-11"
            onClick={() => open(shown.home)}
          >
            <House />
          </Button>
        )}
        <ol className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-body-sm">
          {crumbs(here).map((c, i, all) => {
            const last = i === all.length - 1
            // Keep the root and the last two folders; fold the middle away.
            if (i > 0 && i < all.length - 2) {
              return i === 1 ? (
                <li key={c.path} className="shrink-0 text-ash">
                  <ChevronRight className="inline size-3.5" />…
                </li>
              ) : null
            }
            return (
              <li key={c.path} className="flex min-w-0 items-center">
                {i > 0 && (
                  <ChevronRight className="size-3.5 shrink-0 text-ash" />
                )}
                <button
                  type="button"
                  onClick={() => open(c.path)}
                  aria-current={last ? "location" : undefined}
                  className={cn(
                    "min-w-0 truncate rounded-md px-1.5 py-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                    last
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {c.name}
                </button>
              </li>
            )
          })}
        </ol>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Read the folder again"
          title="Read the folder again"
          className="shrink-0 max-md:size-11"
          onClick={() => listing.refetch()}
        >
          <RotateCw className={cn(listing.isFetching && "animate-spin")} />
        </Button>
      </nav>

      <div className="flex min-w-0 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
          <Input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter this folder"
            aria-label="Filter this folder"
            className="ps-9 md:h-9"
          />
        </div>
        <fieldset className="flex shrink-0 rounded-lg bg-muted p-0.5">
          <legend className="sr-only">Order files by</legend>
          {(
            [
              ["newest", "Newest"],
              ["name", "Name"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={sort === v}
              onClick={() => setSort(v)}
              className="h-10 rounded-md px-2.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm md:h-8"
            >
              {label}
            </button>
          ))}
        </fieldset>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-input">
        {listing.isPending ? (
          <div className="flex h-40 items-center justify-center text-ash">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : listing.isError && !shown ? (
          <div className="flex flex-col items-start gap-3 p-4">
            <p className="text-body-sm text-destructive">
              {listing.error.message}
            </p>
            <div className="flex gap-2">
              {here !== start && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => open(start)}
                >
                  Back to the start
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => listing.refetch()}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : !shown ? (
          <div className="flex h-40 items-center justify-center text-ash">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {hasParent && !q && (
              <li>
                <button
                  type="button"
                  onClick={() => open(shown.parent)}
                  className="flex min-h-10 w-full items-center gap-3 px-3 py-1.5 text-start text-body-sm text-muted-foreground outline-none hover:bg-subtle focus-visible:bg-muted max-md:min-h-12"
                >
                  <ArrowUp className="size-4 shrink-0 text-ash" />
                  Up one folder
                </button>
              </li>
            )}
            {folders.map((e) => (
              <li key={e.path}>
                <button
                  type="button"
                  onClick={() => open(e.path)}
                  className="flex min-h-10 w-full min-w-0 items-center gap-3 px-3 py-1.5 text-start outline-none hover:bg-subtle focus-visible:bg-muted max-md:min-h-12"
                >
                  <FileIcon entry={e} className="size-4" />
                  <span className="min-w-0 flex-1 truncate text-body-sm">
                    {e.name}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ash" />
                </button>
              </li>
            ))}
            {files.map((e) => {
              const picked = value === e.path
              const match = matches?.(e)
              return (
                <li key={e.path}>
                  <button
                    type="button"
                    aria-pressed={picked}
                    onClick={() => {
                      setTyped(e.path)
                      onPick(e.path)
                    }}
                    className={cn(
                      "flex min-h-10 w-full min-w-0 items-center gap-3 px-3 py-1.5 text-start outline-none focus-visible:bg-muted max-md:min-h-12",
                      picked
                        ? "bg-brand-soft text-brand-strong"
                        : "hover:bg-subtle",
                      !match && !picked && matches && "text-muted-foreground",
                    )}
                  >
                    <FileIcon entry={e} className="size-4" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm">
                        {e.name}
                      </span>
                      {match && (
                        <span
                          className={cn(
                            "block text-caption md:hidden",
                            picked ? "text-brand-strong" : "text-ash",
                          )}
                        >
                          {matchLabel}
                        </span>
                      )}
                    </span>
                    {match && (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-caption max-md:hidden",
                          picked
                            ? "bg-card"
                            : "bg-brand-soft text-brand-strong",
                        )}
                      >
                        {matchLabel}
                      </span>
                    )}
                    <span className="w-16 shrink-0 text-end text-caption text-ash tabular-nums">
                      {formatSize(e.size)}
                    </span>
                    <span className="w-20 shrink-0 text-end text-caption text-ash tabular-nums max-sm:hidden">
                      {formatModified(e.modified)}
                    </span>
                  </button>
                </li>
              )
            })}
            {folders.length + files.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <FolderOpen className="size-6 text-ash" />
                <p className="text-body-sm text-muted-foreground">
                  {q ? `Nothing here matches “${filter.trim()}”.` : "Empty."}
                </p>
              </li>
            )}
          </ul>
        )}
        {shown?.truncated && (
          <p className="border-t border-border px-3 py-2 text-caption text-ash">
            This folder holds more than could be listed. Filter it, or type the
            file's path below.
          </p>
        )}
      </div>

      {/* Not a <form>: the picker may sit inside one. */}
      <div className="flex min-w-0 items-center gap-2">
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            e.preventDefault()
            goTyped()
          }}
          placeholder="Or type the file's full path"
          aria-label="The file's full path"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 font-mono text-body-sm md:h-9"
        />
        <Button
          type="button"
          variant="outline"
          onClick={goTyped}
          className="shrink-0 max-md:h-11 md:h-9"
          disabled={!typed.trim() || typed.trim() === value}
        >
          <CornerDownLeft />
          Use it
        </Button>
      </div>
    </div>
  )
}
