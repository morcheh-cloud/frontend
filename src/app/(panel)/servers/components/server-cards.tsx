"use client"

import { Ellipsis, Folder as FolderIcon, Star } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import type { Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCheckingIds, useFolders } from "../api"
import { useDragServer } from "./folder-dnd"
import { buildTree, folderPath } from "./folder-tree"
import { address, OsTile } from "./meta"
import { useServerCan } from "./permissions"
import { useServerActions } from "./server-actions"
import { ServerContextContent, ServerMenuItems } from "./server-menu"
import {
  ListProblem,
  type ServerListProps,
  StatusCell,
  useTagFilter,
} from "./servers-table"
import { isBrowsing, useFilters } from "./use-filters"

const gridClass = "grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-3"

// The card view of the list, the way a Drive folder shows its files. A click
// anywhere on a card opens the server; what's raised above the link (z-10)
// keeps its own click.
export function ServerCards({
  servers,
  loading,
  error,
  onRetry,
  selection,
  onSelectionChange,
}: ServerListProps) {
  const { filters, open } = useFilters()
  const actions = useServerActions()
  const checking = useCheckingIds()
  const folders = useFolders()
  const onTag = useTagFilter()
  const { nodes } = buildTree(folders.data ?? [])
  const showFolder = !isBrowsing(filters)

  if (!loading && servers.length === 0) {
    return <ListProblem error={error} onRetry={onRetry} />
  }
  if (loading && servers.length === 0) {
    return (
      <ul className={gridClass}>
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <SkeletonCard key={i} />
        ))}
      </ul>
    )
  }

  function toggle(server: Server, on: boolean) {
    const next = new Map(selection)
    if (on) next.set(server.id, server)
    else next.delete(server.id)
    onSelectionChange(next)
  }

  return (
    <ul className={gridClass}>
      {servers.map((server) => (
        <Card
          key={server.id}
          server={server}
          selected={selection.has(server.id)}
          selecting={selection.size > 0}
          checking={checking.has(server.id)}
          folder={showFolder ? folderPath(nodes, server.folder_id) : ""}
          onSelect={(on) => toggle(server, on)}
          onFavorite={() => actions.toggleFavorite(server)}
          onTag={onTag}
          onFolder={() => open({ folder: server.folder_id })}
        />
      ))}
    </ul>
  )
}

function Card({
  server,
  selected,
  selecting,
  checking,
  folder,
  onSelect,
  onFavorite,
  onTag,
  onFolder,
}: {
  server: Server
  selected: boolean
  selecting: boolean
  checking: boolean
  folder: string
  onSelect: (on: boolean) => void
  onFavorite: () => void
  onTag: (tag: string) => void
  onFolder: () => void
}) {
  const can = useServerCan()
  const drag = useDragServer(server, can(server, "owner"))
  const shownTags = server.tags.slice(0, 2)
  const moreTags = server.tags.length - shownTags.length

  return (
    <ContextMenu onOpenChange={drag.onMenuChange}>
      <ContextMenuTrigger
        ref={drag.ref}
        render={<li />}
        data-selected={selected || undefined}
        onClickCapture={drag.onClickCapture}
        {...drag.listeners}
        className={cn(
          "group/card relative flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-4 hover:bg-subtle data-popup-open:bg-subtle data-selected:border-brand data-selected:bg-brand-soft/60",
          drag.moving && "opacity-40",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="relative z-10 size-10 shrink-0">
            <OsTile os={server.os} className="size-10 rounded-lg" />
            {/* Stands in for the logo, so ticking never shifts the card. */}
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-lg bg-card opacity-0 group-hover/card:opacity-100 focus-within:opacity-100",
                selecting && "opacity-100",
              )}
            >
              <Checkbox
                aria-label={`Select ${server.name}`}
                checked={selected}
                onCheckedChange={(on) => onSelect(on)}
              />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/servers/${server.id}`}
              draggable={false}
              className="block truncate text-body-sm font-medium outline-none group-hover/card:text-brand after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {server.name}
            </Link>
            <p className="truncate font-mono text-caption text-muted-foreground">
              {address(server)}
            </p>
          </div>
          <div className="relative z-10 -me-1.5 -mt-1 flex shrink-0 items-center">
            {can(server, "operator") && (
              <button
                type="button"
                aria-label={
                  server.favorite ? "Remove from favorites" : "Add to favorites"
                }
                aria-pressed={server.favorite}
                onClick={onFavorite}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground",
                  !server.favorite &&
                    "opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100",
                )}
              >
                <Star
                  className={cn(
                    "size-4",
                    server.favorite && "fill-brand text-brand",
                  )}
                />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${server.name} actions`}
                  />
                }
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <ServerMenuItems server={server} checking={checking} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-auto flex min-h-6 items-center justify-between gap-3 text-body-sm">
          <span className="relative z-10 min-w-0 truncate">
            <StatusCell server={server} checking={checking} />
          </span>
          <span className="relative z-10 flex min-w-0 items-center gap-1">
            {shownTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTag(tag)}
                title={`Filter by ${tag}`}
                className="h-6 max-w-24 truncate rounded-full bg-muted px-2 text-caption text-muted-foreground hover:bg-mist hover:text-foreground"
              >
                {tag}
              </button>
            ))}
            {moreTags > 0 && (
              <span
                title={server.tags.slice(2).join(", ")}
                className="text-caption text-ash"
              >
                +{moreTags}
              </span>
            )}
          </span>
        </div>

        {folder && (
          <button
            type="button"
            onClick={onFolder}
            className="relative z-10 -mt-1 flex w-fit max-w-full items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground"
          >
            <FolderIcon className="size-3.5 shrink-0" />
            <span className="truncate">{folder}</span>
          </button>
        )}
      </ContextMenuTrigger>
      <ServerContextContent server={server} checking={checking} />
    </ContextMenu>
  )
}

function SkeletonCard() {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-4 w-20" />
    </li>
  )
}
