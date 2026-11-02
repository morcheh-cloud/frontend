"use client"

import {
  ChevronRight,
  Ellipsis,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Inbox,
  Layers,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useFacets, useFolders } from "../api"
import { buildTree, type FolderNode } from "./folder-tree"
import { useWorkspaceCan } from "./permissions"
import { useServerActions } from "./server-actions"
import { useFilters } from "./use-filters"

const rowClass =
  "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-body-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=true]:bg-muted aria-[current=true]:font-medium aria-[current=true]:text-foreground"

// Desktop: the views and folder tree beside the table.
export function FolderRail() {
  const { filters, setFilters } = useFilters()
  const facets = useFacets()
  const folders = useFolders()
  const actions = useServerActions()
  const can = useWorkspaceCan()
  const { roots } = buildTree(folders.data ?? [])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const view = filters.favorites
    ? "favorites"
    : filters.folder === "none"
      ? "unfiled"
      : filters.folder
        ? "folder"
        : "all"

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <nav aria-label="Folders" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-0.5">
        <ViewRow
          icon={<Layers />}
          label="All servers"
          count={facets.data?.total}
          current={view === "all"}
          onClick={() => setFilters({ folder: null, favorites: null })}
        />
        <ViewRow
          icon={<Star />}
          label="Favorites"
          count={facets.data?.favorites}
          current={view === "favorites"}
          onClick={() => setFilters({ folder: null, favorites: true })}
        />
        <ViewRow
          icon={<Inbox />}
          label="Unfiled"
          count={facets.data?.unfiled}
          current={view === "unfiled"}
          onClick={() => setFilters({ folder: "none", favorites: null })}
        />
      </ul>

      <div className="flex flex-col gap-1">
        <div className="flex h-8 items-center justify-between ps-2">
          <span className="font-label text-caption tracking-label text-ash uppercase">
            Folders
          </span>
          {can.folders && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New folder"
              onClick={() => actions.newFolder(null)}
            >
              <FolderPlus />
            </Button>
          )}
        </div>
        {roots.length === 0 && !folders.isPending ? (
          can.folders ? (
            <button
              type="button"
              onClick={() => actions.newFolder(null)}
              className="flex flex-col items-start gap-0.5 rounded-lg border border-dashed border-mist px-3 py-2.5 text-start text-body-sm text-muted-foreground hover:bg-muted"
            >
              <span className="font-medium text-foreground">
                Group your servers
              </span>
              Create folders like Production or EU, and nest them.
            </button>
          ) : (
            <p className="px-3 text-body-sm text-ash">No folders here.</p>
          )
        ) : (
          <ul className="flex flex-col gap-0.5">
            {roots.map((node) => (
              <FolderRow
                key={node.id}
                node={node}
                currentId={view === "folder" ? filters.folder : null}
                collapsed={collapsed}
                onToggle={toggle}
                onSelect={(id) => setFilters({ folder: id, favorites: null })}
              />
            ))}
          </ul>
        )}
      </div>
    </nav>
  )
}

function ViewRow({
  icon,
  label,
  count,
  current,
  onClick,
}: {
  icon: ReactNode
  label: string
  count?: number
  current: boolean
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={current}
        onClick={onClick}
        className={cn(rowClass, "[&_svg]:size-4")}
      >
        {icon}
        <span className="flex-1 truncate text-start">{label}</span>
        <span className="text-caption text-ash tabular-nums">
          {count ?? ""}
        </span>
      </button>
    </li>
  )
}

function FolderRow({
  node,
  currentId,
  collapsed,
  onToggle,
  onSelect,
}: {
  node: FolderNode
  currentId: string | null
  collapsed: Set<string>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}) {
  const actions = useServerActions()
  const can = useWorkspaceCan()
  const [menuOpen, setMenuOpen] = useState(false)
  const open = !collapsed.has(node.id)
  const current = node.id === currentId
  const hasChildren = node.children.length > 0
  const Icon = current ? FolderOpen : FolderIcon

  return (
    <li>
      <div
        className="group/row relative flex items-center"
        style={{ paddingInlineStart: `${node.depth * 0.875}rem` }}
      >
        <button
          type="button"
          aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
          aria-expanded={open}
          onClick={() => onToggle(node.id)}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded text-ash hover:text-foreground",
            !hasChildren && "invisible",
          )}
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform", open && "rotate-90")}
          />
        </button>
        <button
          type="button"
          aria-current={current}
          onClick={() => onSelect(node.id)}
          className={cn(rowClass, "ps-1.5 pe-8")}
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-start">{node.name}</span>
          <span
            className={cn(
              "text-caption text-ash tabular-nums group-hover/row:invisible",
              menuOpen && "invisible",
            )}
          >
            {node.total || ""}
          </span>
        </button>
        {(can.addServer || can.folders) && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${node.name} options`}
                  className={cn(
                    "absolute end-1 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
                    menuOpen && "opacity-100",
                  )}
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {can.addServer && (
                <DropdownMenuItem onClick={() => actions.addServer(node.id)}>
                  <Plus />
                  Add server here
                </DropdownMenuItem>
              )}
              {can.folders && (
                <>
                  <DropdownMenuItem onClick={() => actions.newFolder(node.id)}>
                    <FolderPlus />
                    New subfolder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.editFolder(node)}>
                    <Pencil />
                    Rename or move…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => actions.deleteFolder(node)}
                  >
                    <Trash2 />
                    Delete folder…
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {open && hasChildren && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {node.children.map((child) => (
            <FolderRow
              key={child.id}
              node={child}
              currentId={currentId}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
