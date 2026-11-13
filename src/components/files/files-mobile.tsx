"use client"

import {
  ArrowDown,
  ArrowUp,
  ChartPie,
  Check,
  Circle,
  CircleCheck,
  ClipboardPaste,
  Copy,
  Download,
  Ellipsis,
  Eye,
  FilePlus,
  Folder,
  FolderPlus,
  FolderUp,
  HardDriveDownload,
  House,
  Link2,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  Send,
  SquareTerminal,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react"
import { type ReactNode, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { toast } from "sonner"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import { useLoginUsers } from "./api"
import { useFileActions } from "./file-actions"
import { useFiles } from "./file-manager"
import { useEntryMenu } from "./file-menu"
import {
  BucketIcon,
  basename,
  crumbs,
  dirname,
  FileTile,
  FolderSize,
  formatModified,
  formatSize,
  isDir,
  type SortField,
} from "./meta"
import type { FileEntry } from "./source"
import { UploadsPanel, useUploads } from "./uploads"

type Sheet =
  | { kind: "entry"; entry: FileEntry }
  | { kind: "selection" }
  | { kind: "add" }
  | { kind: "more" }
  | { kind: "path" }

// Every sheet owns a history entry (useOpen) and the folder lives in the
// URL, so a navigation made while a sheet is open would be undone by the
// Back that closes it. Close first; act once the sheet's entry is gone.
function afterClose(close: () => void, fn: () => void) {
  window.addEventListener("popstate", () => fn(), { once: true })
  close()
}

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted disabled:opacity-30 [&_svg]:size-5"

const label = (entries: FileEntry[]) =>
  entries.length === 1 ? entries[0].name : `${entries.length} items`

// Phone: a full-screen list under a sticky path bar. Tap opens, long-press
// starts selecting, ⋯ opens the item's action sheet.
export function FilesMobile() {
  const files = useFiles()
  const uploads = useUploads()
  const [sheet, setSheet] = useState<Sheet>({ kind: "add" })
  const [sheetOpen, setSheetOpen] = useOpen("files-sheet")
  // Select mode is a layer too: Back leaves it.
  const [selecting, setSelectingState] = useOpen("files-select")
  const [searching, setSearching] = useState(false)

  const showSheet = (next: Sheet) => {
    setSheet(next)
    setSheetOpen(true)
  }
  const close = () => setSheetOpen(false)

  const setSelecting = (on: boolean) => {
    if (!on) files.setSelected(new Set())
    setSelectingState(on)
  }

  const startSelect = (entry: FileEntry) => {
    navigator.vibrate?.(10)
    files.setSelected(new Set([entry.path]))
    setSelectingState(true)
  }

  const toggle = (entry: FileEntry) => {
    const next = new Set(files.selected)
    if (next.has(entry.path)) next.delete(entry.path)
    else next.add(entry.path)
    files.setSelected(next)
  }

  const list =
    files.search !== null ? (files.results.data?.items ?? []) : files.entries

  return (
    <>
      {selecting ? (
        <SelectBar list={list} onDone={() => setSelecting(false)} />
      ) : (
        <PathBar
          // A search restored from the URL opens the search bar too.
          searching={searching || files.search !== null}
          setSearching={setSearching}
          onPath={() => showSheet({ kind: "path" })}
          onAdd={() => showSheet({ kind: "add" })}
          onMore={() => showSheet({ kind: "more" })}
        />
      )}

      <Body
        list={list}
        selecting={selecting}
        onTap={(entry) => (selecting ? toggle(entry) : files.open(entry))}
        onLongPress={(entry) =>
          selecting ? toggle(entry) : startSelect(entry)
        }
        onMenu={(entry) => showSheet({ kind: "entry", entry })}
      />

      {selecting ? (
        <SelectionActions
          onMore={() => showSheet({ kind: "selection" })}
          afterAction={(fn) => afterClose(() => setSelecting(false), fn)}
        />
      ) : (
        files.clipboard && <PasteBar raised={uploads.items.length > 0} />
      )}
      {!selecting && <UploadsPanel phone />}

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={sheetTitle(sheet)}
        hideTitle={sheet.kind === "entry"}
      >
        {sheet.kind === "entry" && (
          <EntrySheet entry={sheet.entry} close={close} />
        )}
        {sheet.kind === "selection" && (
          <SelectionSheet
            onSelect={(fn) =>
              afterClose(close, () => afterClose(() => setSelecting(false), fn))
            }
          />
        )}
        {sheet.kind === "add" && <AddSheet close={close} />}
        {sheet.kind === "more" && (
          <MoreSheet
            close={close}
            onSelect={() =>
              afterClose(close, () => {
                files.setSelected(new Set())
                setSelectingState(true)
              })
            }
          />
        )}
        {sheet.kind === "path" && <PathSheet close={close} />}
      </BottomSheet>
    </>
  )
}

function sheetTitle(sheet: Sheet) {
  switch (sheet.kind) {
    case "entry":
      return sheet.entry.name
    case "selection":
      return "More actions"
    case "add":
      return "Add to this folder"
    case "more":
      return "View"
    case "path":
      return "Go to folder"
  }
}

const stickyBar =
  "sticky top-[calc(3rem+1px+env(safe-area-inset-top))] z-20 border-b border-border bg-background/90 backdrop-blur-md"

function PathBar({
  searching,
  setSearching,
  onPath,
  onAdd,
  onMore,
}: {
  searching: boolean
  setSearching: (on: boolean) => void
  onPath: () => void
  onAdd: () => void
  onMore: () => void
}) {
  const files = useFiles()
  const { listing } = files
  const input = useRef<HTMLInputElement>(null)
  const name = listing
    ? listing.path === listing.home
      ? "Home"
      : listing.path === "/"
        ? "/"
        : basename(listing.path)
    : ""

  const closeSearch = () => {
    setSearching(false)
    files.setFilter("")
    files.setSearch(null)
  }

  if (searching) {
    return (
      <div className={cn(stickyBar, "flex h-14 items-center gap-1 ps-3 pe-1")}>
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            files.setSearch(files.filter)
            input.current?.blur()
          }}
        >
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
          <Input
            ref={input}
            type="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={files.filter}
            placeholder={`Filter ${name}`}
            aria-label="Filter this folder"
            className="rounded-full ps-9"
            onChange={(e) => {
              files.setFilter(e.target.value)
              if (!e.target.value && files.search) files.setSearch(null)
            }}
          />
        </form>
        <button
          type="button"
          onClick={closeSearch}
          className="h-11 shrink-0 px-3 text-body font-medium text-brand outline-none active:opacity-60"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className={cn(stickyBar, "flex h-14 items-center gap-0.5 px-1")}>
      <button
        type="button"
        aria-label="Up one folder"
        disabled={!listing || listing.path === "/"}
        onClick={files.up}
        className={barButton}
      >
        <ArrowUp />
      </button>
      <button
        type="button"
        onClick={onPath}
        disabled={!listing}
        className="flex h-11 min-w-0 flex-1 flex-col justify-center rounded-xl px-2 text-start outline-none active:bg-muted"
      >
        <span className="truncate text-body font-medium">
          {name || <Skeleton className="h-4 w-24" />}
        </span>
        <span className="truncate font-mono text-caption text-ash">
          {listing?.path}
        </span>
      </button>
      <button
        type="button"
        aria-label="Search"
        disabled={!listing}
        onClick={() => {
          // Focus inside the tap so the keyboard opens.
          flushSync(() => setSearching(true))
          input.current?.focus()
        }}
        className={barButton}
      >
        <Search />
      </button>
      {!files.source.readOnly && (
        <button
          type="button"
          aria-label="Add"
          disabled={!listing}
          onClick={onAdd}
          className={barButton}
        >
          <Plus />
        </button>
      )}
      <button
        type="button"
        aria-label="More"
        onClick={onMore}
        className={barButton}
      >
        <Ellipsis />
      </button>
    </div>
  )
}

function SelectBar({
  list,
  onDone,
}: {
  list: FileEntry[]
  onDone: () => void
}) {
  const files = useFiles()
  const all = list.length > 0 && list.every((e) => files.selected.has(e.path))
  return (
    <div className={cn(stickyBar, "flex h-14 items-center gap-1 px-1")}>
      <button
        type="button"
        aria-label="Done selecting"
        onClick={onDone}
        className={barButton}
      >
        <X />
      </button>
      <p className="min-w-0 flex-1 truncate px-1 text-body font-medium tabular-nums">
        {files.selected.size
          ? `${files.selected.size} selected`
          : "Select items"}
      </p>
      <button
        type="button"
        onClick={() =>
          files.setSelected(all ? new Set() : new Set(list.map((e) => e.path)))
        }
        className="h-11 shrink-0 px-3 text-body font-medium text-brand outline-none active:opacity-60"
      >
        {all ? "Deselect all" : "Select all"}
      </button>
    </div>
  )
}

function Body({
  list,
  selecting,
  onTap,
  onLongPress,
  onMenu,
}: {
  list: FileEntry[]
  selecting: boolean
  onTap: (entry: FileEntry) => void
  onLongPress: (entry: FileEntry) => void
  onMenu: (entry: FileEntry) => void
}) {
  const files = useFiles()
  const actions = useFileActions()
  const uploads = useUploads()
  const searching = files.search !== null
  const results = files.results

  if (files.error && !files.listing) {
    const denied = files.error.status === 403
    return (
      <State
        title={
          files.error.status === 404
            ? "This folder doesn't exist"
            : denied
              ? "You can't open this folder"
              : "Couldn't open this folder"
        }
        description={
          denied
            ? `The ${files.source.noun} refused to list it.`
            : files.error.message
        }
      >
        <Button variant="outline" onClick={files.refetch}>
          Try again
        </Button>
        <Button onClick={() => files.go("")}>
          <House /> Home folder
        </Button>
      </State>
    )
  }

  if (files.loading || (searching && results.isPending)) {
    return (
      <div aria-busy className="divide-y divide-border">
        {searching && (
          <p className="flex items-center gap-2 px-4 py-3 text-body-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Searching…
          </p>
        )}
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <div key={i} className="flex min-h-[4.5rem] items-center gap-3 px-4">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (searching && results.error) {
    return (
      <State title="The search failed" description={results.error.message}>
        <Button variant="outline" onClick={() => results.refetch()}>
          Try again
        </Button>
      </State>
    )
  }

  if (list.length === 0) {
    if (searching)
      return (
        <State
          title="Nothing found"
          description={`No file or folder under here has “${files.search}” in its name.`}
        />
      )
    if (files.filter)
      return (
        <State
          title={`Nothing here matches “${files.filter}”`}
          description="Search the folders inside this one instead."
        >
          <Button onClick={() => files.setSearch(files.filter)}>
            <Search /> Search subfolders
          </Button>
        </State>
      )
    return (
      <State
        title="This folder is empty"
        description={
          files.hiddenCount
            ? `${files.hiddenCount} hidden ${files.hiddenCount === 1 ? "item" : "items"}.`
            : undefined
        }
      >
        {files.hiddenCount > 0 && (
          <Button variant="outline" onClick={() => files.setShowHidden(true)}>
            <Eye /> Show hidden
          </Button>
        )}
        {!files.source.readOnly && (
          <>
            <Button
              variant="outline"
              onClick={() => uploads.pickFiles(files.listing?.path ?? "")}
            >
              <Upload /> Upload
            </Button>
            <Button onClick={actions.newFolder}>
              {actions.bucketRoot ? <BucketIcon /> : <FolderPlus />}
              {actions.bucketRoot ? "New bucket" : "New folder"}
            </Button>
          </>
        )}
      </State>
    )
  }

  return (
    <div className={cn(files.clipboard && !selecting && "pb-20")}>
      {searching && (
        <p className="border-b border-border bg-subtle px-4 py-2.5 text-body-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {list.length}
            {results.data?.truncated && "+"}{" "}
            {list.length === 1 ? "result" : "results"}
          </span>{" "}
          for “{files.search}”
        </p>
      )}
      <ul className="divide-y divide-border">
        {list.map((entry) => (
          <Row
            key={entry.path}
            entry={entry}
            location={searching}
            selecting={selecting}
            selected={files.selected.has(entry.path)}
            cut={
              files.clipboard?.mode === "cut" &&
              files.clipboard.entries.some((e) => e.path === entry.path)
            }
            onTap={() => onTap(entry)}
            onLongPress={() => onLongPress(entry)}
            onMenu={() => onMenu(entry)}
          />
        ))}
      </ul>
      {files.filter && !searching && (
        <button
          type="button"
          onClick={() => files.setSearch(files.filter)}
          className="flex min-h-14 w-full items-center gap-3 border-t border-border px-4 text-start text-body font-medium text-brand outline-none active:bg-muted"
        >
          <Search className="size-5" /> Search subfolders for “{files.filter}”
        </button>
      )}
      {!searching && files.hiddenCount > 0 && !files.showHidden && (
        <p className="p-4 text-center text-caption text-ash">
          {files.hiddenCount} hidden{" "}
          {files.hiddenCount === 1 ? "item" : "items"}
        </p>
      )}
    </div>
  )
}

function Row({
  entry,
  location,
  selecting,
  selected,
  cut,
  onTap,
  onLongPress,
  onMenu,
}: {
  entry: FileEntry
  location: boolean
  selecting: boolean
  selected: boolean
  cut: boolean
  onTap: () => void
  onLongPress: () => void
  onMenu: () => void
}) {
  const press = useRef<{
    timer: number
    x: number
    y: number
    fired: boolean
  } | null>(null)

  const cancel = () => {
    if (press.current) window.clearTimeout(press.current.timer)
  }

  const meta = location ? (
    dirname(entry.path)
  ) : entry.bucket ? (
    <>
      Bucket · <FolderSize entry={entry} />
    </>
  ) : entry.type === "symlink" ? (
    `→ ${entry.link_target}`
  ) : (
    <>
      {isDir(entry) ? (
        <FolderSize entry={entry} fallback="Folder" />
      ) : (
        formatSize(entry.size)
      )}{" "}
      · {formatModified(entry.modified)}
    </>
  )

  return (
    <li
      data-selected={(selecting && selected) || undefined}
      className={cn(
        "flex min-h-[4.5rem] items-center data-selected:bg-brand-soft/60",
        cut && "opacity-50",
      )}
    >
      <button
        type="button"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return
          const state = {
            x: e.clientX,
            y: e.clientY,
            fired: false,
            timer: window.setTimeout(() => {
              state.fired = true
              onLongPress()
            }, 450),
          }
          press.current = state
        }}
        onPointerMove={(e) => {
          const p = press.current
          if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancel()
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (press.current?.fired) {
            press.current = null
            return
          }
          onTap()
        }}
        className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 ps-4 text-start outline-none select-none [-webkit-touch-callout:none] active:bg-muted"
      >
        {selecting ? (
          <span className="flex size-10 shrink-0 items-center justify-center">
            {selected ? (
              <CircleCheck className="size-6 fill-brand text-background" />
            ) : (
              <Circle className="size-6 text-mist" />
            )}
          </span>
        ) : (
          <FileTile entry={entry} />
        )}
        <span className="min-w-0 flex-1 py-2">
          <span className="block truncate text-body font-medium">
            {entry.name}
          </span>
          <span
            className={cn(
              "block truncate text-body-sm text-muted-foreground",
              location && "font-mono text-caption",
            )}
          >
            {meta}
          </span>
        </span>
      </button>
      {!selecting && (
        <button
          type="button"
          aria-label={`${entry.name} actions`}
          onClick={onMenu}
          className={cn(barButton, "me-1 text-muted-foreground")}
        >
          <Ellipsis />
        </button>
      )}
    </li>
  )
}

// Replaces the tab bar while selecting, like the photo grid of a phone.
function SelectionActions({
  onMore,
  afterAction,
}: {
  onMore: () => void
  afterAction: (fn: () => void) => void
}) {
  const files = useFiles()
  const actions = useFileActions()
  const sel = files.selectedEntries
  const none = sel.length === 0
  const write = !files.source.readOnly
  // Buckets can't be copied or moved.
  const movable = write && !sel.some((e) => e.bucket)

  const item = (
    text: string,
    icon: ReactNode,
    onClick: () => void,
    destructive = false,
  ) => (
    <button
      type="button"
      disabled={none}
      onClick={onClick}
      className={cn(
        "flex h-16 flex-1 flex-col items-center justify-center gap-1 text-caption font-medium outline-none active:bg-muted disabled:opacity-30 [&_svg]:size-5",
        destructive ? "text-destructive" : "text-foreground",
      )}
    >
      {icon}
      {text}
    </button>
  )

  return (
    <nav
      aria-label="Selection actions"
      className="fixed inset-x-0 bottom-0 z-[45] flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      {!files.source.listOnly &&
        item("Download", <Download />, () =>
          afterAction(() => actions.download(sel)),
        )}
      {movable &&
        item("Copy", <Copy />, () =>
          afterAction(() => {
            files.copy(sel)
            toast(`Copied ${label(sel)}`, {
              description: "Open a folder and tap Paste.",
            })
          }),
        )}
      {movable &&
        item("Move", <Scissors />, () =>
          afterAction(() => {
            files.cut(sel)
            toast(`Moving ${label(sel)}`, {
              description: "Open a folder and tap Paste.",
            })
          }),
        )}
      {!movable &&
        !files.source.listOnly &&
        actions.transfer &&
        item("Send to", <Send />, () =>
          afterAction(() => actions.transfer?.(sel)),
        )}
      {write &&
        item(
          "Delete",
          <Trash2 />,
          () => afterAction(() => actions.remove(sel)),
          true,
        )}
      {item("More", <Ellipsis />, onMore)}
    </nav>
  )
}

function PasteBar({ raised }: { raised: boolean }) {
  const files = useFiles()
  const clipboard = files.clipboard
  if (!clipboard) return null
  return (
    <div
      className={cn(
        "fixed inset-x-4 z-30 flex h-14 items-center gap-2 rounded-2xl border border-border bg-card ps-4 pe-1.5 shadow-md",
        raised
          ? "bottom-[calc(4rem+1px+env(safe-area-inset-bottom)+--spacing(3)+3.5rem)]"
          : "bottom-[calc(4rem+1px+env(safe-area-inset-bottom)+--spacing(3))]",
      )}
    >
      <p className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground">
        {clipboard.mode === "cut" ? "Move" : "Copy"}{" "}
        <span className="font-medium text-foreground">
          {label(clipboard.entries)}
        </span>
      </p>
      <button
        type="button"
        aria-label="Cancel"
        onClick={files.clearClipboard}
        className={cn(barButton, "text-muted-foreground")}
      >
        <X />
      </button>
      <Button
        className="h-11 rounded-xl px-4"
        disabled={files.pasting}
        onClick={files.paste}
      >
        {files.pasting ? (
          <Loader2 className="animate-spin" />
        ) : (
          <ClipboardPaste />
        )}
        Paste here
      </Button>
    </div>
  )
}

function Groups({
  groups,
  onSelect,
}: {
  groups: ReturnType<ReturnType<typeof useEntryMenu>>["groups"]
  onSelect: (fn: () => void) => void
}) {
  return groups
    .filter((g) => g.length)
    .map((group, i) => (
      <ul
        key={group[0].key}
        className={cn(
          "divide-y divide-border",
          i > 0 && "-mx-4 mt-2 border-t-8 border-subtle px-4",
        )}
      >
        {group.map((item) => (
          <li key={item.key}>
            <SheetAction
              icon={<item.icon />}
              label={item.label}
              destructive={item.destructive}
              onClick={() => onSelect(item.onSelect)}
            />
          </li>
        ))}
      </ul>
    ))
}

function EntrySheet({ entry, close }: { entry: FileEntry; close: () => void }) {
  const { posix } = useFiles().source
  const menu = useEntryMenu()
  const { groups } = menu(entry)
  return (
    <>
      <div className="flex items-center gap-3 px-2 pb-3">
        <FileTile entry={entry} />
        <div className="min-w-0">
          <p className="truncate text-body font-medium">{entry.name}</p>
          <p className="truncate text-body-sm text-muted-foreground">
            {isDir(entry) ? (
              <FolderSize entry={entry} fallback="Folder" />
            ) : (
              formatSize(entry.size)
            )}{" "}
            · {formatModified(entry.modified)}
            {posix && (
              <>
                {" "}
                · <span className="font-mono">{entry.perm}</span>
              </>
            )}
          </p>
        </div>
      </div>
      <Groups groups={groups} onSelect={(fn) => afterClose(close, fn)} />
    </>
  )
}

// Everything the bottom bar has no room for.
function SelectionSheet({ onSelect }: { onSelect: (fn: () => void) => void }) {
  const files = useFiles()
  const menu = useEntryMenu()
  const first = files.selectedEntries[0]
  if (!first)
    return (
      <p className="px-2 py-6 text-center text-body-sm text-muted-foreground">
        Nothing is selected.
      </p>
    )
  const movable =
    !files.source.readOnly && !files.selectedEntries.some((e) => e.bucket)
  // What the bottom bar already shows.
  const shown = new Set(["download", "copy", "cut", "delete"])
  if (!movable) shown.add("transfer")
  const groups = menu(first).groups.map((g) =>
    g.filter((item) => !shown.has(item.key)),
  )
  return <Groups groups={groups} onSelect={onSelect} />
}

function AddSheet({ close }: { close: () => void }) {
  const files = useFiles()
  const actions = useFileActions()
  const uploads = useUploads()
  const dir = files.listing?.path ?? ""
  // The file picker must open inside the tap, so pick first, then close.
  const pick = (fn: (dir: string) => void) => () => {
    fn(dir)
    close()
  }
  return (
    <ul className="divide-y divide-border">
      <li>
        <SheetAction
          icon={<Upload />}
          label="Upload files"
          description="From this phone"
          onClick={pick(uploads.pickFiles)}
        />
      </li>
      <li>
        <SheetAction
          icon={<FolderUp />}
          label="Upload a folder"
          onClick={pick(uploads.pickFolder)}
        />
      </li>
      {actions.importFrom && (
        <li>
          <SheetAction
            icon={<HardDriveDownload />}
            label="From a server or storage"
            description="Straight from there, not through this phone"
            onClick={() =>
              actions.importFrom && afterClose(close, actions.importFrom)
            }
          />
        </li>
      )}
      {actions.fetchUrl && (
        <li>
          <SheetAction
            icon={<Link2 />}
            label="From a URL"
            description="The server downloads it itself"
            onClick={() =>
              actions.fetchUrl && afterClose(close, actions.fetchUrl)
            }
          />
        </li>
      )}
      <li>
        <SheetAction
          icon={actions.bucketRoot ? <BucketIcon /> : <FolderPlus />}
          label={actions.bucketRoot ? "New bucket" : "New folder"}
          onClick={() => afterClose(close, actions.newFolder)}
        />
      </li>
      <li>
        <SheetAction
          icon={<FilePlus />}
          label="New text file"
          onClick={() => afterClose(close, actions.newFile)}
        />
      </li>
    </ul>
  )
}

const sortLabels: Record<SortField, string> = {
  name: "Name",
  size: "Size",
  modified: "Date modified",
}

function MoreSheet({
  close,
  onSelect,
}: {
  close: () => void
  onSelect: () => void
}) {
  const files = useFiles()
  const dir = files.listing?.path ?? ""
  const { openTerminal } = files
  const Arrow = files.sort.order === "asc" ? ArrowUp : ArrowDown
  return (
    <>
      <p className="px-2 py-1 font-label text-caption tracking-label text-ash uppercase">
        Sort by
      </p>
      <ul className="divide-y divide-border">
        {(Object.keys(sortLabels) as SortField[]).map((field) => {
          const active = files.sort.field === field
          return (
            <li key={field}>
              <SheetAction
                label={sortLabels[field]}
                description={
                  active
                    ? files.sort.order === "asc"
                      ? "Ascending · tap to reverse"
                      : "Descending · tap to reverse"
                    : undefined
                }
                trailing={active && <Arrow className="size-5 text-brand" />}
                onClick={() =>
                  files.setSort({
                    field,
                    order:
                      active && files.sort.order === "asc" ? "desc" : "asc",
                  })
                }
              />
            </li>
          )
        })}
      </ul>
      <ul className="-mx-4 mt-2 divide-y divide-border border-t-8 border-subtle px-4">
        <li>
          <SheetAction
            icon={<Eye />}
            label="Show hidden files"
            description={
              files.hiddenCount
                ? `${files.hiddenCount} hidden here`
                : "Names starting with a dot"
            }
            trailing={
              files.showHidden && <Check className="size-5 text-brand" />
            }
            onClick={() => files.setShowHidden(!files.showHidden)}
          />
        </li>
        <li>
          <SheetAction
            icon={<ListChecks />}
            label="Select items"
            disabled={files.entries.length === 0}
            onClick={onSelect}
          />
        </li>
        {files.analyse && (
          <li>
            <SheetAction
              icon={<ChartPie />}
              label="Disk usage"
              description="What takes the space in this folder"
              disabled={!files.listing}
              onClick={() => {
                const { analyse } = files
                afterClose(close, () => analyse?.(dir))
              }}
            />
          </li>
        )}
        {openTerminal && (
          <li>
            <SheetAction
              icon={<SquareTerminal />}
              label="Open a terminal here"
              disabled={!files.listing}
              onClick={() => afterClose(close, () => openTerminal(dir))}
            />
          </li>
        )}
        <li>
          <SheetAction
            icon={
              <RefreshCw className={cn(files.fetching && "animate-spin")} />
            }
            label="Refresh"
            onClick={() => {
              files.refetch()
              close()
            }}
          />
        </li>
      </ul>
    </>
  )
}

function PathSheet({ close }: { close: () => void }) {
  const files = useFiles()
  const { listing } = files
  const users = useLoginUsers(files.source).data ?? []
  const [value, setValue] = useState("")
  if (!listing) return null
  const go = (path: string) => afterClose(close, () => files.go(path))
  const parts = crumbs(listing.path).reverse()

  return (
    <>
      <form
        className="flex gap-2 px-2 pb-3"
        onSubmit={(e) => {
          e.preventDefault()
          const next = value.trim().replace(/(.)\/+$/, "$1")
          if (!next.startsWith("/"))
            return toast.error("Enter a full path that starts with /.")
          go(next)
        }}
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={files.source.posix ? "/etc/nginx" : "/backups/2026"}
          aria-label="Folder path"
          enterKeyHint="go"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono"
        />
        <Button type="submit" className="h-11 px-4" disabled={!value.trim()}>
          Go
        </Button>
      </form>
      <ul className="divide-y divide-border">
        {listing.path !== listing.home && (
          <li>
            <SheetAction
              icon={<House />}
              label="Home"
              description={listing.home}
              onClick={() => go(listing.home)}
            />
          </li>
        )}
        {users
          .filter((u) => u.home !== listing.home && u.home !== listing.path)
          .map((u) => (
            <li key={u.name}>
              <SheetAction
                icon={<UserRound />}
                label={`${u.name}'s home`}
                description={u.home}
                onClick={() => go(u.home)}
              />
            </li>
          ))}
        {parts.map((c, i) => (
          <li key={c.path}>
            <SheetAction
              icon={<Folder />}
              label={c.path === "/" ? "/ (root)" : c.name}
              description={c.path}
              trailing={i === 0 && <Check className="size-5 text-brand" />}
              onClick={() => (i === 0 ? close() : go(c.path))}
            />
          </li>
        ))}
      </ul>
    </>
  )
}

function State({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-[55svh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div>
        <p className="text-body font-medium">{title}</p>
        {description && (
          <p className="mt-1 text-body-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap justify-center gap-2">{children}</div>
      )}
    </div>
  )
}
