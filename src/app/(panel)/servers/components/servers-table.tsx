"use client"

import { ArrowDown, ArrowUp, Ellipsis, Star } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCheckingIds, useFolders } from "../api"
import { EmptyState, ErrorState } from "./empty-state"
import { useDragServer } from "./folder-dnd"
import { buildTree, folderPath } from "./folder-tree"
import {
  address,
  OsTile,
  osLabel,
  StatusDot,
  statusMeta,
  timeAgo,
} from "./meta"
import { useServerCan } from "./permissions"
import { useServerActions } from "./server-actions"
import { ServerContextContent, ServerMenuItems } from "./server-menu"
import { isBrowsing, type SortField, useFilters } from "./use-filters"

export type Selection = Map<string, Server>

export type ServerListProps = {
  servers: Server[]
  loading: boolean
  /** Set when the list failed to load and there is nothing to show. */
  error: Error | null
  onRetry: () => void
  selection: Selection
  onSelectionChange: (selection: Selection) => void
}

// A tag on a server adds it to the Tags filter.
export function useTagFilter() {
  const { filters, setFilters } = useFilters()
  return (tag: string) => {
    if (!filters.tag.includes(tag)) setFilters({ tag: [...filters.tag, tag] })
  }
}

export function ListProblem({
  error,
  onRetry,
}: Pick<ServerListProps, "error" | "onRetry">) {
  return (
    <div className="rounded-2xl border border-border">
      {error ? <ErrorState error={error} onRetry={onRetry} /> : <EmptyState />}
    </div>
  )
}

export function ServersTable({
  servers,
  loading,
  error,
  onRetry,
  selection,
  onSelectionChange,
}: ServerListProps) {
  const { filters, setFilters, open } = useFilters()
  const onTag = useTagFilter()
  const actions = useServerActions()
  const checking = useCheckingIds()
  const folders = useFolders()
  const { nodes } = buildTree(folders.data ?? [])
  // A folder column only helps where servers from many folders mix.
  const showFolder = !isBrowsing(filters)

  const allSelected =
    servers.length > 0 && servers.every((s) => selection.has(s.id))
  const someSelected = servers.some((s) => selection.has(s.id))

  function toggleAll() {
    const next = new Map(selection)
    for (const s of servers) {
      if (allSelected) next.delete(s.id)
      else next.set(s.id, s)
    }
    onSelectionChange(next)
  }

  function toggle(server: Server, on: boolean) {
    const next = new Map(selection)
    if (on) next.set(server.id, server)
    else next.delete(server.id)
    onSelectionChange(next)
  }

  function sortBy(field: SortField) {
    if (filters.sort === field) {
      setFilters({ order: filters.order === "asc" ? "desc" : "asc" })
    } else {
      setFilters({
        sort: field,
        order: field === "last_checked" ? "desc" : "asc",
      })
    }
  }

  const header = (
    field: SortField | null,
    label: string,
    className?: string,
  ) => (
    <th
      scope="col"
      className={cn("h-10 px-3 text-start font-medium", className)}
    >
      {field ? (
        <button
          type="button"
          onClick={() => sortBy(field)}
          className="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground"
        >
          {label}
          {filters.sort === field &&
            (filters.order === "asc" ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            ))}
        </button>
      ) : (
        label
      )}
    </th>
  )

  if (!loading && servers.length === 0) {
    return <ListProblem error={error} onRetry={onRetry} />
  }

  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <th scope="col" className="w-10 ps-4">
              <Checkbox
                aria-label="Select all on this page"
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onCheckedChange={toggleAll}
              />
            </th>
            <th scope="col" className="w-8">
              <span className="sr-only">Favorite</span>
            </th>
            {header("name", "Name", "ps-1")}
            {header("host", "Address")}
            {header("os", "OS")}
            {header("status", "Status")}
            {header(null, "Tags", "hidden @3xl:table-cell")}
            {showFolder && header(null, "Folder", "hidden @4xl:table-cell")}
            {header("last_checked", "Checked", "hidden @5xl:table-cell")}
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading && servers.length === 0
            ? Array.from({ length: 6 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
                <SkeletonRow key={i} folder={showFolder} />
              ))
            : servers.map((server) => (
                <Row
                  key={server.id}
                  server={server}
                  selected={selection.has(server.id)}
                  checking={checking.has(server.id)}
                  folder={
                    showFolder ? folderPath(nodes, server.folder_id) : null
                  }
                  onSelect={(on) => toggle(server, on)}
                  onFavorite={() => actions.toggleFavorite(server)}
                  onTag={onTag}
                  onFolder={() => open({ folder: server.folder_id })}
                />
              ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({
  server,
  selected,
  checking,
  folder,
  onSelect,
  onFavorite,
  onTag,
  onFolder,
}: {
  server: Server
  selected: boolean
  checking: boolean
  folder: string | null
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
        render={<tr />}
        aria-selected={selected}
        onClickCapture={drag.onClickCapture}
        {...drag.listeners}
        className={cn(
          "group/row h-14 hover:bg-subtle aria-selected:bg-brand-soft/60 data-popup-open:bg-subtle",
          drag.moving && "opacity-40",
        )}
      >
        <td className="ps-4">
          <Checkbox
            aria-label={`Select ${server.name}`}
            checked={selected}
            onCheckedChange={(on) => onSelect(on)}
          />
        </td>
        <td>
          {can(server, "operator") && (
            <button
              type="button"
              aria-label={
                server.favorite ? "Remove from favorites" : "Add to favorites"
              }
              aria-pressed={server.favorite}
              onClick={onFavorite}
              className={cn(
                "flex size-7 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground",
                !server.favorite &&
                  "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
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
        </td>
        <td className="max-w-64 ps-1 pe-3">
          <Link
            href={`/servers/${server.id}`}
            draggable={false}
            className="block max-w-full truncate font-medium hover:text-brand"
          >
            {server.name}
          </Link>
          {(server.hostname || server.description) && (
            <p className="truncate text-caption text-ash">
              {server.description || server.hostname}
            </p>
          )}
        </td>
        <td
          data-no-drag
          className="px-3 font-mono text-caption whitespace-nowrap text-muted-foreground select-text"
        >
          {address(server)}
        </td>
        <td className="px-3">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <OsTile os={server.os} className="size-7 rounded-md text-[11px]" />
            <span className={cn(!server.os.id && "text-ash")}>
              {osLabel(server.os)}
            </span>
          </span>
        </td>
        <td className="px-3 whitespace-nowrap">
          <StatusCell server={server} checking={checking} />
        </td>
        <td className="hidden px-3 @3xl:table-cell">
          <span className="flex items-center gap-1">
            {shownTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTag(tag)}
                title={`Filter by ${tag}`}
                className="h-6 max-w-28 truncate rounded-full bg-muted px-2 text-caption text-muted-foreground hover:bg-mist hover:text-foreground"
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
        </td>
        {folder !== null && (
          <td className="hidden max-w-48 px-3 @4xl:table-cell">
            {folder ? (
              <button
                type="button"
                onClick={onFolder}
                className="block max-w-full truncate text-muted-foreground hover:text-foreground"
              >
                {folder}
              </button>
            ) : (
              <span className="text-ash">—</span>
            )}
          </td>
        )}
        <td className="hidden px-3 whitespace-nowrap text-muted-foreground @5xl:table-cell">
          {timeAgo(server.last_checked_at)}
        </td>
        <td className="pe-3">
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
        </td>
      </ContextMenuTrigger>
      <ServerContextContent server={server} checking={checking} />
    </ContextMenu>
  )
}

export function StatusCell({
  server,
  checking,
}: {
  server: Server
  checking: boolean
}) {
  const content: ReactNode = (
    <span className="inline-flex items-center gap-2">
      <StatusDot status={server.status} checking={checking} />
      {checking ? "Checking…" : statusMeta[server.status].label}
      {!checking && server.status === "online" && server.latency_ms != null && (
        <span className="text-caption text-ash">{server.latency_ms} ms</span>
      )}
    </span>
  )
  if (!server.status_message || checking) return content
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="cursor-default" />}>
        {content}
      </TooltipTrigger>
      <TooltipContent>{server.status_message}</TooltipContent>
    </Tooltip>
  )
}

function SkeletonRow({ folder }: { folder: boolean }) {
  return (
    <tr className="h-14">
      <td className="ps-4">
        <Skeleton className="size-4 rounded" />
      </td>
      <td />
      <td className="ps-1 pe-3">
        <Skeleton className="h-4 w-32" />
      </td>
      <td className="px-3">
        <Skeleton className="h-3.5 w-36" />
      </td>
      <td className="px-3">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-3">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="hidden px-3 @3xl:table-cell">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      {folder && <td className="hidden @4xl:table-cell" />}
      <td className="hidden px-3 @5xl:table-cell">
        <Skeleton className="h-4 w-16" />
      </td>
      <td />
    </tr>
  )
}
