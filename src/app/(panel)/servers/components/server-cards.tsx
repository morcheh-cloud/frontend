"use client"

import {
  Cpu,
  Ellipsis,
  Folder as FolderIcon,
  HardDrive,
  MemoryStick,
  Star,
} from "lucide-react"
import Link from "next/link"
import { shareTone } from "@/app/(panel)/containers/components/project-stats"
import { StatusStrip } from "@/components/charts/time-chart"
import { formatPercent } from "@/components/insights/format"
import { checkTip } from "@/components/insights/parts"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCheckingIds, useFolders, useServerInsights } from "../api"
import { useDragServer } from "./folder-dnd"
import { buildTree, folderPath } from "./folder-tree"
import { buildModel, type Model, type ServerModel } from "./insights/model"
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

const gridClass =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))] gap-4"

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
  // The last 24 hours of every server, from the same request the Insights
  // tab makes (shared cache): one read for the whole list.
  const insights = useServerInsights("24h")
  const day = insights.data ? buildModel(insights.data) : null
  const history = new Map(day?.servers.map((s) => [s.id, s] as const))

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
          history={history.get(server.id)}
          day={day}
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

type Tone = "destructive" | "warning" | null

// How loud a card is: a server Morche can't reach is red, a refused sign-in
// orange; a disk or memory nearly full shows only on its own meter.
function toneOf(server: Server): Tone {
  switch (server.status) {
    case "unreachable":
    case "error":
    case "host_key_mismatch":
      return "destructive"
    case "auth_failed":
      return "warning"
    default:
      return null
  }
}

const toneBorder: Record<NonNullable<Tone>, string> = {
  destructive: "border-destructive/40",
  warning: "border-warning/40",
}

function Card({
  server,
  history,
  day,
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
  history?: ServerModel
  day: Model | null
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
  const tone = toneOf(server)
  const shownTags = server.tags.slice(0, 2)
  const moreTags = server.tags.length - shownTags.length
  const r = history?.latest
  const online = server.status === "online"
  const os = [server.os.name, server.os.version].filter(Boolean).join(" ")

  return (
    <ContextMenu onOpenChange={drag.onMenuChange}>
      <ContextMenuTrigger
        ref={drag.ref}
        render={<li />}
        data-selected={selected || undefined}
        onClickCapture={drag.onClickCapture}
        {...drag.listeners}
        className={cn(
          "group/card relative flex min-w-0 flex-col gap-3.5 rounded-2xl border bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:shadow-md data-popup-open:shadow-md data-selected:border-brand data-selected:bg-brand-soft/40",
          tone ? toneBorder[tone] : "border-border hover:border-mist",
          drag.moving && "opacity-40",
        )}
      >
        {/* Header: what it is, star and menu. */}
        <div className="flex items-center gap-3">
          <span className="relative z-10 size-10 shrink-0">
            <OsTile os={server.os} className="size-10 rounded-xl" />
            {/* Stands in for the logo, so ticking never shifts the card. */}
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-xl bg-card opacity-0 group-hover/card:opacity-100 focus-within:opacity-100",
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
            <p className="truncate text-caption text-ash">
              <span className="font-mono">{address(server)}</span>
              {os && <span> · {os}</span>}
            </p>
          </div>
          <div className="relative z-10 -me-2 flex shrink-0 items-center">
            {can(server, "operator") && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  server.favorite ? "Remove from favorites" : "Add to favorites"
                }
                aria-pressed={server.favorite}
                onClick={onFavorite}
                className={cn(
                  "text-ash",
                  !server.favorite &&
                    "opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100",
                )}
              >
                <Star
                  className={cn(server.favorite && "fill-brand text-brand")}
                />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${server.name} actions`}
                    className="text-ash"
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

        {/* What it's made of, and how full it is (the last reading). */}
        <dl
          className={cn("grid grid-cols-3 gap-2", !online && r && "opacity-60")}
        >
          <Resource
            icon={Cpu}
            label="CPU"
            value={
              r?.cores ? `${r.cores} ${r.cores === 1 ? "core" : "cores"}` : null
            }
            used={r ? r.cpu_percent : null}
            note={r ? `${Math.round(r.cpu_percent)}% busy` : null}
          />
          <Resource
            icon={MemoryStick}
            label="Memory"
            value={r?.mem_total_bytes ? formatSize(r.mem_total_bytes) : null}
            used={
              r?.mem_total_bytes
                ? (r.mem_used_bytes / r.mem_total_bytes) * 100
                : null
            }
            note={
              r?.mem_total_bytes
                ? `${Math.round((r.mem_used_bytes / r.mem_total_bytes) * 100)}% used`
                : null
            }
          />
          <Resource
            icon={HardDrive}
            label="Disk"
            value={r?.disk_total_bytes ? formatSize(r.disk_total_bytes) : null}
            used={
              r?.disk_total_bytes
                ? (r.disk_used_bytes / r.disk_total_bytes) * 100
                : null
            }
            note={
              r?.disk_total_bytes
                ? `${formatSize(Math.max(0, r.disk_total_bytes - r.disk_used_bytes))} free`
                : null
            }
          />
        </dl>

        {/* The last 24 hours of checks. */}
        <div className="flex items-center gap-2.5">
          {history && day ? (
            <div className="relative z-10 min-w-0 flex-1">
              <StatusStrip
                compact
                states={history.strip}
                tooltip={(i) => checkTip(day.buckets, history.series, i)}
                label={`${server.name}: checks over the last 24 hours`}
              />
            </div>
          ) : (
            <Skeleton className="h-4 min-w-0 flex-1 rounded-md" />
          )}
          <span
            title="Up over the last 24 hours"
            className="shrink-0 text-caption tabular-nums"
          >
            {history?.uptime != null ? (
              <>
                <span className="font-medium">
                  {formatPercent(history.uptime)}
                </span>
                <span className="text-ash"> uptime</span>
              </>
            ) : (
              <span className="text-ash">24h</span>
            )}
          </span>
        </div>

        {/* Its state, tags and folder. */}
        <div className="mt-auto flex min-h-6 items-center justify-between gap-3 border-t border-border pt-3 text-body-sm">
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
            className="relative z-10 -mt-1.5 flex w-fit max-w-full items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground"
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

// One of CPU / Memory / Disk: its size, a meter of how much is in use and a
// short note. Unknown until Morche has read the server once.
function Resource({
  icon: Icon,
  label,
  value,
  used,
  note,
}: {
  icon: typeof Cpu
  label: string
  value: string | null
  used: number | null
  note: string | null
}) {
  const pct = used === null ? null : Math.min(100, Math.max(0, used))
  const tone = pct === null ? null : shareTone(pct)
  return (
    <div className="min-w-0 rounded-xl bg-subtle px-2.5 py-2">
      <dt className="flex items-center gap-1 text-caption text-ash">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-0.5 truncate text-body-sm font-medium tabular-nums">
        {value ?? <span className="text-ash">—</span>}
      </dd>
      <dd className="mt-1.5 h-1 overflow-hidden rounded-full bg-mist/60">
        {pct !== null && (
          <span
            role="img"
            aria-label={`${Math.round(pct)}% in use`}
            className={cn(
              "block h-full rounded-full",
              tone === "brand" && "bg-brand",
              tone === "warning" && "bg-warning",
              tone === "destructive" && "bg-destructive",
            )}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        )}
      </dd>
      <dd
        className={cn(
          "mt-1 truncate text-caption tabular-nums",
          tone === "warning"
            ? "text-warning"
            : tone === "destructive"
              ? "text-destructive"
              : "text-muted-foreground",
        )}
      >
        {note ?? "Not read yet"}
      </dd>
    </div>
  )
}

function SkeletonCard() {
  return (
    <li className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-4 rounded-md" />
      <Skeleton className="mt-1 h-4 w-20" />
    </li>
  )
}
