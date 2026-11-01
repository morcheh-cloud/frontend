"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ChevronRight,
  Database,
  Folder,
  FolderOpen,
  HardDrive,
  Loader2,
} from "lucide-react"
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import type { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { fileKeys } from "./api"
import type { Lister } from "./listers"
import { crumbs, isDir } from "./meta"
import type { FileEntry, Listing } from "./source"

type Tree = {
  lister: Lister
  value: string
  focus: string
  expanded: Set<string>
  disabled?: (path: string) => boolean
  pick: (path: string) => void
  toggle: (path: string, open?: boolean) => void
  setFocus: (path: string) => void
}

const TreeContext = createContext<Tree | null>(null)

const useTree = () => {
  const tree = useContext(TreeContext)
  if (!tree) throw new Error("useTree needs a <FolderPicker>")
  return tree
}

// Folders first by name; hidden ones (".config") after the rest.
const folders = (entries: FileEntry[]) =>
  entries
    .filter(isDir)
    .sort(
      (a, b) =>
        Number(a.name.startsWith(".")) - Number(b.name.startsWith(".")) ||
        a.name.localeCompare(b.name, undefined, { numeric: true }),
    )

// Pick a folder from a lazily loaded tree. `value` is the picked path and
// may be typed elsewhere: the tree opens down to it once typing pauses.
export function FolderPicker({
  lister,
  value,
  onChange,
  disabled,
  rootLabel = "/",
  rootIcon = <HardDrive />,
  className,
}: {
  lister: Lister
  value: string
  onChange: (path: string) => void
  // Folders that can't be picked (e.g. the one being moved, or "/" when
  // top-level folders are buckets).
  disabled?: (path: string) => boolean
  rootLabel?: string
  rootIcon?: ReactNode
  className?: string
}) {
  const [expanded, setExpanded] = useState(() => new Set(paths(value)))
  const [focus, setFocus] = useState("/")
  const picked = useRef(value)

  // Typed (not clicked): open the folders on the way once typing pauses.
  useEffect(() => {
    if (value === picked.current) return
    const t = setTimeout(() => {
      picked.current = value
      setExpanded((s) => new Set([...s, ...paths(value)]))
    }, 400)
    return () => clearTimeout(t)
  }, [value])

  const tree: Tree = {
    lister,
    value,
    focus,
    expanded,
    disabled,
    setFocus,
    pick: (path) => {
      if (disabled?.(path)) return
      picked.current = path
      onChange(path)
    },
    toggle: (path, open) => {
      const show = open ?? !expanded.has(path)
      // Keep a focusable item when the focus was inside the closed folder.
      if (!show && focus.startsWith(`${path === "/" ? "" : path}/`)) {
        setFocus(path)
      }
      setExpanded((s) => {
        const next = new Set(s)
        if (show) next.add(path)
        else next.delete(path)
        return next
      })
    },
  }

  return (
    <TreeContext value={tree}>
      <div
        role="tree"
        aria-label="Folders"
        onKeyDown={(e) => onKey(e, tree)}
        className={cn(
          "max-h-64 overflow-y-auto overscroll-contain rounded-lg border border-input p-1 max-md:max-h-[38svh]",
          className,
        )}
      >
        <Node path="/" name={rootLabel} icon={rootIcon} level={1} />
      </div>
    </TreeContext>
  )
}

// `path` is one of the entries or inside one: a folder can't go into itself.
export const insideAny = (path: string, entries: FileEntry[]) =>
  entries.some((e) => path === e.path || path.startsWith(`${e.path}/`))

// "/var/log" → "/", "/var", "/var/log".
const paths = (path: string) =>
  path.startsWith("/") ? crumbs(path).map((c) => c.path) : ["/"]

function Node({
  path,
  name,
  icon,
  level,
}: {
  path: string
  name: string
  icon?: ReactNode
  level: number
}) {
  const tree = useTree()
  const open = tree.expanded.has(path)
  const selected = tree.value === path
  const off = tree.disabled?.(path) ?? false
  const list = useQuery<Listing, ApiError>({
    queryKey: fileKeys.list(tree.lister, path),
    queryFn: () => tree.lister.list(path),
    enabled: open,
    retry: false,
    staleTime: 30_000,
  })
  const children = list.data ? folders(list.data.entries) : null
  const leaf = children?.length === 0
  const row = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) row.current?.scrollIntoView({ block: "nearest" })
  }, [selected])

  return (
    <div
      role="treeitem"
      aria-level={level}
      aria-selected={selected}
      aria-disabled={off || undefined}
      aria-expanded={leaf ? undefined : open}
      data-path={path}
      tabIndex={tree.focus === path ? 0 : -1}
      onFocus={(e) => {
        if (e.target === e.currentTarget) tree.setFocus(path)
      }}
      className="outline-none [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-ring/50"
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the tree handles keys (onKey) */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the treeitem is the control */}
      <div
        ref={row}
        onClick={() => {
          tree.setFocus(path)
          if (off) return tree.toggle(path)
          tree.pick(path)
          tree.toggle(path, true)
        }}
        style={{ paddingInlineStart: `${(level - 1) * 16 + 2}px` }}
        className={cn(
          "flex h-8 cursor-pointer items-center gap-1.5 rounded-md pe-2 text-body-sm select-none hover:bg-subtle max-md:h-11",
          selected && "bg-brand-soft text-brand-strong hover:bg-brand-soft",
          off && "text-ash",
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={(e) => {
            e.stopPropagation()
            tree.toggle(path)
          }}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded text-ash hover:text-foreground max-md:size-9",
            leaf && "invisible",
          )}
        >
          {open && list.isFetching && !list.data ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ChevronRight
              className={cn("size-4 transition-transform", open && "rotate-90")}
            />
          )}
        </button>
        <span
          className={cn(
            "shrink-0 [&_svg]:size-4",
            selected ? "text-brand" : "text-muted-foreground",
          )}
        >
          {icon ?? (open && !leaf ? <FolderOpen /> : <Folder />)}
        </span>
        <span className="truncate">{name}</span>
      </div>
      {open && (list.error || children?.length || list.data?.truncated) && (
        // biome-ignore lint/a11y/useSemanticElements: a tree's nested level, not a form group
        <div role="group">
          {children?.map((c) => (
            <Node
              key={c.path}
              path={c.path}
              name={c.name}
              icon={c.bucket ? <Database /> : undefined}
              level={level + 1}
            />
          ))}
          {(list.error || list.data?.truncated) && (
            <div
              style={{ paddingInlineStart: `${level * 16 + 34}px` }}
              className={cn(
                "py-1 pe-2 text-caption",
                list.error ? "text-destructive" : "text-ash",
              )}
            >
              {list.error
                ? `Can't open: ${list.error.message}`
                : "Some folders aren't shown. Type the path below."}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Arrow keys move through the visible folders, Right/Left open and close,
// Enter or Space picks (the WAI-ARIA tree pattern).
function onKey(e: KeyboardEvent<HTMLDivElement>, tree: Tree) {
  const items = [
    ...e.currentTarget.querySelectorAll<HTMLElement>("[role=treeitem]"),
  ]
  const el = document.activeElement as HTMLElement | null
  const i = el ? items.indexOf(el) : -1
  if (i < 0 || !el) return
  const path = el.dataset.path ?? "/"
  const go = (to?: HTMLElement | null) => {
    if (!to) return
    to.focus()
    tree.setFocus(to.dataset.path ?? "/")
  }
  switch (e.key) {
    case "ArrowDown":
      go(items[i + 1])
      break
    case "ArrowUp":
      go(items[i - 1])
      break
    case "Home":
      go(items[0])
      break
    case "End":
      go(items.at(-1))
      break
    case "ArrowRight":
      if (el.getAttribute("aria-expanded") === "false") tree.toggle(path, true)
      else if (
        el.getAttribute("aria-expanded") === "true" &&
        Number(items[i + 1]?.getAttribute("aria-level")) >
          Number(el.getAttribute("aria-level"))
      ) {
        go(items[i + 1])
      }
      break
    case "ArrowLeft":
      if (el.getAttribute("aria-expanded") === "true") tree.toggle(path, false)
      else go(el.parentElement?.closest<HTMLElement>("[role=treeitem]"))
      break
    case "Enter":
    case " ":
      tree.pick(path)
      break
    default:
      return
  }
  e.preventDefault()
  e.stopPropagation()
}
