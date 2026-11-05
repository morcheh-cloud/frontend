"use client"

import {
  ChevronRight,
  Ellipsis,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { Fragment, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useFolders } from "../api"
import { useDragFolder, useFolderDrop } from "./folder-dnd"
import { buildTree, type FolderNode, flatten, ROOT_LABEL } from "./folder-tree"
import { useWorkspaceCan } from "./permissions"
import { useServerActions } from "./server-actions"
import {
  type Filters,
  filterCount,
  folderIdOf,
  isBrowsing,
  placeOf,
  useFilters,
} from "./use-filters"

export function folderSummary(node: FolderNode) {
  const servers = node.total === 1 ? "1 server" : `${node.total} servers`
  const folders = node.children.length
  if (folders === 0) return node.total ? servers : "Empty"
  return `${folders} ${folders === 1 ? "folder" : "folders"} · ${servers}`
}

// The folders the page shows: those of this level, or while searching, the
// ones the words match within reach of the search.
export function useShownFolders(filters: Filters) {
  const folders = useFolders()
  return useMemo(() => {
    const { roots, nodes } = buildTree(folders.data ?? [])
    const here = folderIdOf(filters)
    const inside = here ? (nodes.get(here)?.children ?? []) : roots
    if (isBrowsing(filters)) return inside
    const onlySearch =
      filters.q && !filters.favorites && filterCount(filters) === 0
    if (!onlySearch) return []
    const words = filters.q.toLowerCase()
    return flatten(inside).filter((n) => n.name.toLowerCase().includes(words))
  }, [folders.data, filters])
}

// Desktop: a level's folders as cards above its servers, as Drive shows them.
export function FolderGrid({ folders }: { folders: FolderNode[] }) {
  return (
    <section aria-label="Folders" className="flex flex-col gap-2">
      <h3 className="font-label text-caption tracking-label text-ash uppercase">
        Folders
      </h3>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
        {folders.map((node) => (
          <FolderCard key={node.id} node={node} />
        ))}
      </ul>
    </section>
  )
}

function FolderCard({ node }: { node: FolderNode }) {
  const { open } = useFilters()
  const can = useWorkspaceCan()
  const [menuOpen, setMenuOpen] = useState(false)
  const drop = useFolderDrop(`card:${node.id}`, node.id, node.name)
  const drag = useDragFolder(node, can.folders)
  const hasMenu = can.addServer || can.folders

  return (
    <ContextMenu disabled={!hasMenu} onOpenChange={drag.onMenuChange}>
      <ContextMenuTrigger
        ref={drop.ref}
        render={<li />}
        className={cn(
          "group/card relative flex h-14 items-center rounded-2xl border border-border hover:bg-subtle data-popup-open:bg-subtle",
          drop.over && "border-brand bg-brand-soft hover:bg-brand-soft",
          drag.moving && "opacity-40",
        )}
      >
        <button
          ref={drag.ref}
          type="button"
          data-drag
          onClick={() => open({ folder: node.id })}
          onClickCapture={drag.onClickCapture}
          {...drag.listeners}
          className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-2xl ps-4 pe-10 text-start outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {drop.over ? (
            <FolderOpen className="size-5 shrink-0 text-brand" />
          ) : (
            <FolderIcon className="size-5 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm font-medium">
              {node.name}
            </span>
            <span className="block truncate text-caption text-ash">
              {folderSummary(node)}
            </span>
          </span>
        </button>
        {hasMenu && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${node.name} options`}
                  className={cn(
                    "absolute end-2 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100",
                    menuOpen && "opacity-100",
                  )}
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <FolderMenuItems node={node} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <FolderMenuItems
          node={node}
          Item={ContextMenuItem}
          Separator={ContextMenuSeparator}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}

// Where the page is. Each step up is a link and a place to drop, so a server
// moves up a level in one drag.
export function FolderCrumbs({ total }: { total?: number }) {
  const { filters, narrowed } = useFilters()
  const folders = useFolders()
  const place = placeOf(filters)

  const { nodes } = useMemo(() => buildTree(folders.data ?? []), [folders.data])
  const chain: FolderNode[] = []
  let node = nodes.get(folderIdOf(filters) ?? "")
  while (node) {
    chain.unshift(node)
    node = node.parent_id ? nodes.get(node.parent_id) : undefined
  }

  const current = chain.at(-1)
  // A search from the top level reaches every server, not just this level.
  const flat =
    place === "favorites"
      ? "Favorites"
      : place === "all" || (place === "root" && narrowed)
        ? "All servers"
        : null

  return (
    <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
      {flat ? (
        <h2 className="truncate text-body font-medium">{flat}</h2>
      ) : (
        <nav aria-label="Folder path" className="contents">
          {current ? (
            <UpCrumb folderId={null} name={ROOT_LABEL} />
          ) : (
            <h2 className="truncate text-body font-medium">{ROOT_LABEL}</h2>
          )}
          {chain.map((step) => (
            <Fragment key={step.id}>
              <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
              {step === current ? (
                <CurrentCrumb node={step} />
              ) : (
                <UpCrumb folderId={step.id} name={step.name} />
              )}
            </Fragment>
          ))}
        </nav>
      )}
      {total !== undefined && (
        <span className="ms-1 text-body-sm text-ash tabular-nums">
          {total} {total === 1 ? "server" : "servers"}
        </span>
      )}
    </div>
  )
}

function UpCrumb({
  folderId,
  name,
}: {
  folderId: string | null
  name: string
}) {
  const { open } = useFilters()
  const drop = useFolderDrop(`crumb:${folderId ?? "root"}`, folderId, name)
  return (
    <button
      ref={drop.ref}
      type="button"
      onClick={() => open({ folder: folderId })}
      className={cn(
        "h-8 max-w-56 truncate rounded-lg px-2 text-body font-medium text-muted-foreground outline-none first:-ms-2 hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        drop.over && "bg-brand-soft text-brand-strong",
      )}
    >
      {name}
    </button>
  )
}

function CurrentCrumb({ node }: { node: FolderNode }) {
  const can = useWorkspaceCan()
  const name = <h2 className="truncate text-body font-medium">{node.name}</h2>
  if (!can.addServer && !can.folders) return <div className="px-2">{name}</div>
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`${node.name} options`}
            className="flex h-8 max-w-64 items-center gap-1 rounded-lg px-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        {name}
        <Ellipsis className="size-4 shrink-0 text-ash" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <FolderMenuItems node={node} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// A folder's actions, on its card (⋯ and right-click) and on the path.
function FolderMenuItems({
  node,
  Item = DropdownMenuItem,
  Separator = DropdownMenuSeparator,
}: {
  node: FolderNode
  Item?: typeof DropdownMenuItem | typeof ContextMenuItem
  Separator?: typeof DropdownMenuSeparator | typeof ContextMenuSeparator
}) {
  const actions = useServerActions()
  const can = useWorkspaceCan()
  return (
    <>
      {can.addServer && (
        <Item onClick={() => actions.addServer(node.id)}>
          <Plus />
          Add server here
        </Item>
      )}
      {can.folders && (
        <>
          <Item onClick={() => actions.newFolder(node.id)}>
            <FolderPlus />
            New subfolder
          </Item>
          <Item onClick={() => actions.editFolder(node)}>
            <Pencil />
            Rename or move…
          </Item>
          <Separator />
          <Item
            variant="destructive"
            onClick={() => actions.deleteFolder(node)}
          >
            <Trash2 />
            Delete folder…
          </Item>
        </>
      )}
    </>
  )
}

const tabClass =
  "h-8 rounded-md px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm"

// The three ways to look at the workspace. My servers also takes a drop, the
// one way out of every folder from the flat lists.
export function PlaceTabs() {
  const { filters, open } = useFilters()
  const place = placeOf(filters)
  const drop = useFolderDrop("place:root", null, ROOT_LABEL)
  return (
    <fieldset className="flex shrink-0 rounded-lg bg-muted p-0.5">
      <legend className="sr-only">Show</legend>
      <button
        ref={drop.ref}
        type="button"
        aria-pressed={place === "root" || place === "folder"}
        onClick={() => open()}
        className={cn(tabClass, drop.over && "bg-brand-soft text-brand-strong")}
      >
        {ROOT_LABEL}
      </button>
      <button
        type="button"
        aria-pressed={place === "all"}
        onClick={() => open({ folder: "all" })}
        className={tabClass}
      >
        All servers
      </button>
      <button
        type="button"
        aria-pressed={place === "favorites"}
        onClick={() => open({ favorites: true })}
        className={tabClass}
      >
        Favorites
      </button>
    </fieldset>
  )
}
