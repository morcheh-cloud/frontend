"use client"

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Folder as FolderIcon,
  FolderPlus,
  HardDrive,
  Layers,
  Pencil,
  Plus,
  Star,
  Trash2,
  Waypoints,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useEffect, useRef, useState } from "react"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useCheckingIds,
  useFacets,
  useFolders,
  useInfiniteServers,
} from "../api"
import { EmptyState, ErrorState } from "./empty-state"
import { folderSummary, useShownFolders } from "./folder-grid"
import {
  buildTree,
  type FolderNode,
  flatten,
  folderPath,
  ROOT_LABEL,
} from "./folder-tree"
import {
  ServerInsightsBody,
  ServerInsightsControls,
  ServersTabs,
} from "./insights/insights"
import { address, OsTile, osLabel, StatusDot, statusMeta } from "./meta"
import { useServersPageTab } from "./page-tab"
import { useWorkspaceCan } from "./permissions"
import { SearchInput } from "./search-input"
import { useServerActions } from "./server-actions"
import { ServerSheet } from "./server-menu"
import { type Option, sortLabels, useFilterOptions } from "./toolbar"
import {
  folderIdOf,
  placeOf,
  type SortField,
  toQuery,
  useFilters,
} from "./use-filters"

type SheetKind = "folder" | "status" | "os" | "tag" | "sort" | "folder-actions"

// Every sheet owns a history entry (useOpen) and the filters live in the URL,
// so a filter written while a sheet is open would be undone by the Back that
// closes it. Close first; act once the sheet's entry is gone.
function afterClose(close: () => void, fn: () => void) {
  window.addEventListener("popstate", () => fn(), { once: true })
  close()
}

export function ServersMobile() {
  const [{ tab }] = useServersPageTab()
  const { filters, open } = useFilters()
  const actions = useServerActions()
  const checking = useCheckingIds()
  const list = useInfiniteServers(toQuery(filters, false))
  const servers = list.data?.pages.flatMap((p) => p.items) ?? []
  const total = list.data?.pages[0]?.total

  const [sheetOpen, setSheetOpen] = useOpen("servers-filter-sheet")
  const [sheet, setSheet] = useState<SheetKind>("folder")
  const [serverOpen, setServerOpen] = useOpen("server-sheet")
  const [serverId, setServerId] = useState<string | null>(null)
  // Keep the last tapped server around so the sheet can animate out.
  const lastServer = useRef<Server | null>(null)
  const current = servers.find((s) => s.id === serverId) ?? lastServer.current
  if (current) lastServer.current = current

  function openSheet(kind: SheetKind) {
    setSheet(kind)
    setSheetOpen(true)
  }

  // Load the next page as the end of the list comes into view.
  const sentinel = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: "400px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const folderId = folderIdOf(filters)
  const can = useWorkspaceCan()
  const shownFolders = useShownFolders(filters)
  const tree = useFolders()
  const folder = folderId
    ? buildTree(tree.data ?? []).nodes.get(folderId)
    : undefined

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        {folderId && (
          <button
            type="button"
            aria-label="Up one level"
            onClick={() => open({ folder: folder?.parent_id })}
            className="-ms-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none active:bg-muted"
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </button>
        )}
        <h1 className="min-w-0 truncate text-heading font-light">
          {folder?.name ?? "Servers"}
        </h1>
        <HelpButton
          href={guideHref("servers")}
          label="Servers guide"
          className="ms-auto"
        />
        <Link
          href="/network"
          aria-label="Network map"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none active:bg-muted"
        >
          <Waypoints className="size-5" />
        </Link>
        {can.addServer && (
          <Button
            size="icon-lg"
            aria-label="Add server"
            className="rounded-full"
            onClick={() => actions.addServer(folderId)}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </header>

      {!folderId && (
        <div className="px-4 pt-4">
          <ServersTabs />
        </div>
      )}

      {tab === "insights" && !folderId ? (
        <>
          <div className="flex items-center gap-2 px-4 pt-3">
            <ServerInsightsControls phone />
          </div>
          <div className="mt-3 border-t border-border pb-24">
            <ServerInsightsBody phone />
          </div>
        </>
      ) : (
        <>
          <div className="sticky top-0 z-20 flex flex-col gap-2 bg-background pt-3 pb-2">
            <SearchInput className="mx-4" />
            <FilterChips onOpen={openSheet} />
          </div>

          <div className="flex items-center justify-between px-4 py-1 text-body-sm text-ash">
            <span className="tabular-nums">
              {total !== undefined &&
                `${total} ${total === 1 ? "server" : "servers"}`}
            </span>
            {folderId && (can.addServer || can.folders) && (
              <button
                type="button"
                onClick={() => openSheet("folder-actions")}
                className="-me-2 flex h-11 items-center gap-1.5 px-2 font-medium text-muted-foreground active:text-foreground"
              >
                <Ellipsis className="size-4" />
                Folder
              </button>
            )}
          </div>

          {list.isPending ? (
            <ul className="divide-y divide-border border-y border-border">
              {Array.from({ length: 8 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
                <li key={i} className="flex h-[4.5rem] items-center gap-3 px-4">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </li>
              ))}
            </ul>
          ) : servers.length === 0 && shownFolders.length === 0 ? (
            list.error ? (
              <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : (
              <EmptyState />
            )
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {shownFolders.map((node) => (
                <li key={node.id}>
                  <FolderListRow
                    node={node}
                    onOpen={() => open({ folder: node.id })}
                  />
                </li>
              ))}
              {servers.map((server) => (
                <li key={server.id}>
                  <ServerRow
                    server={server}
                    checking={checking.has(server.id)}
                    onActions={() => {
                      setServerId(server.id)
                      setServerOpen(true)
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
          <div ref={sentinel} aria-hidden className="h-px" />
          {isFetchingNextPage && (
            <p className="py-4 text-center text-body-sm text-ash">
              Loading more…
            </p>
          )}
        </>
      )}

      {current && (
        <ServerSheet
          server={current}
          checking={checking.has(current.id)}
          open={serverOpen}
          onOpenChange={setServerOpen}
        />
      )}

      <FilterSheet kind={sheet} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}

function FolderListRow({
  node,
  onOpen,
}: {
  node: FolderNode
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[4.5rem] w-full items-center gap-3 py-3 ps-4 pe-3 text-start outline-none active:bg-muted"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <FolderIcon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium">
          {node.name}
        </span>
        <span className="block truncate text-body-sm text-muted-foreground">
          {folderSummary(node)}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ash rtl:rotate-180" />
    </button>
  )
}

// Tap opens the server's page; the trailing button opens its action sheet.
function ServerRow({
  server,
  checking,
  onActions,
}: {
  server: Server
  checking: boolean
  onActions: () => void
}) {
  return (
    <div className="flex items-center">
      <Link
        href={`/servers/${server.id}`}
        className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
      >
        <OsTile os={server.os} className="size-10" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-body font-medium">
              {server.name}
            </span>
            <StatusDot status={server.status} checking={checking} />
            <span className="sr-only">{statusMeta[server.status].label}</span>
          </span>
          <span className="block truncate text-body-sm text-muted-foreground">
            <span className="font-mono text-caption">{address(server)}</span>
            {server.os.id && ` · ${osLabel(server.os)}`}
          </span>
        </span>
        {server.favorite && (
          <Star
            aria-label="Favorite"
            className="size-4 shrink-0 fill-brand text-brand"
          />
        )}
      </Link>
      <button
        type="button"
        aria-label={`${server.name} actions`}
        onClick={onActions}
        className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
      >
        <Ellipsis className="size-5" />
      </button>
    </div>
  )
}

function FilterChips({ onOpen }: { onOpen: (kind: SheetKind) => void }) {
  const { filters } = useFilters()
  const folders = useFolders()
  const { nodes } = buildTree(folders.data ?? [])
  const place = placeOf(filters)
  const folderLabel =
    place === "favorites"
      ? "Favorites"
      : place === "all"
        ? "All servers"
        : place === "folder"
          ? (nodes.get(filters.folder ?? "")?.name ?? "Folder")
          : ROOT_LABEL
  const SortIcon =
    filters.order === "desc" ? ArrowDownWideNarrow : ArrowUpNarrowWide

  return (
    <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden">
      <Chip
        active={place !== "root"}
        onClick={() => onOpen("folder")}
        icon={<FolderIcon />}
      >
        {folderLabel}
      </Chip>
      <Chip
        active={filters.status.length > 0}
        count={filters.status.length}
        onClick={() => onOpen("status")}
      >
        Status
      </Chip>
      <Chip
        active={filters.os.length > 0}
        count={filters.os.length}
        onClick={() => onOpen("os")}
      >
        OS
      </Chip>
      <Chip
        active={filters.tag.length > 0}
        count={filters.tag.length}
        onClick={() => onOpen("tag")}
      >
        Tags
      </Chip>
      <Chip onClick={() => onOpen("sort")} icon={<SortIcon />}>
        {sortLabels[filters.sort]}
      </Chip>
    </div>
  )
}

function Chip({
  active = false,
  count = 0,
  icon,
  onClick,
  children,
}: {
  active?: boolean
  count?: number
  icon?: ReactNode
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium whitespace-nowrap outline-none active:bg-muted [&_svg]:size-4",
        active
          ? "border-brand/30 bg-brand-soft text-brand-strong"
          : "border-mist text-foreground",
      )}
    >
      {icon}
      {children}
      {count > 0 && (
        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white tabular-nums">
          {count}
        </span>
      )}
      <ChevronDown className="opacity-60" />
    </button>
  )
}

const titles: Record<SheetKind, string> = {
  folder: "Show",
  status: "Status",
  os: "Operating system",
  tag: "Tags",
  sort: "Sort by",
  "folder-actions": "Folder",
}

function FilterSheet({
  kind,
  open,
  onOpenChange,
}: {
  kind: SheetKind
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { filters, setFilters } = useFilters()
  const options = useFilterOptions()
  const close = () => onOpenChange(false)
  const multi = kind === "status" || kind === "os" || kind === "tag"
  const [draft, setDraft] = useState<string[]>([])

  // Start each multi-select sheet from the applied values.
  // biome-ignore lint/correctness/useExhaustiveDependencies: seed on open only
  useEffect(() => {
    if (open && multi) setDraft(filters[kind])
  }, [open, kind])

  function apply(values: string[]) {
    afterClose(close, () => {
      if (kind === "status")
        setFilters({ status: values as typeof filters.status })
      if (kind === "os") setFilters({ os: values })
      if (kind === "tag") setFilters({ tag: values })
    })
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={titles[kind]}
      footer={
        multi && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="lg" onClick={() => apply([])}>
              Clear
            </Button>
            <Button size="lg" onClick={() => apply(draft)}>
              Apply
            </Button>
          </div>
        )
      }
    >
      {kind === "folder" && <FolderPicker close={close} />}
      {kind === "folder-actions" && <FolderActions close={close} />}
      {kind === "sort" && <SortPicker close={close} />}
      {multi && (
        <OptionList
          options={options[kind]}
          value={draft}
          onChange={setDraft}
          emptyText={
            kind === "tag"
              ? "No tags yet. Add some when editing a server."
              : "OS is detected on the first successful check."
          }
        />
      )}
    </BottomSheet>
  )
}

function OptionList({
  options,
  value,
  onChange,
  emptyText,
}: {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  emptyText: string
}) {
  if (options.length === 0) {
    return (
      <p className="px-2 py-6 text-body-sm text-muted-foreground">
        {emptyText}
      </p>
    )
  }
  return (
    <ul className="divide-y divide-border">
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <li key={o.value}>
            {/* biome-ignore lint/a11y/useSemanticElements: a full-width native-style picker row */}
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() =>
                onChange(
                  on ? value.filter((v) => v !== o.value) : [...value, o.value],
                )
              }
              className="flex min-h-14 w-full items-center gap-3 px-2 text-start text-body outline-none active:bg-muted"
            >
              {o.dot && (
                <StatusDot
                  status={o.dot as Server["status"]}
                  className="size-2.5"
                />
              )}
              <span className="flex-1 truncate">{o.label}</span>
              {o.count !== undefined && (
                <span className="text-body-sm text-ash tabular-nums">
                  {o.count}
                </span>
              )}
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border border-mist",
                  on && "border-brand bg-brand text-white",
                )}
              >
                {on && <Check className="size-4" />}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function FolderPicker({ close }: { close: () => void }) {
  const { filters, open } = useFilters()
  const facets = useFacets()
  const folders = useFolders()
  const actions = useServerActions()
  const can = useWorkspaceCan()
  const { roots } = buildTree(folders.data ?? [])

  const pick = (place?: Parameters<typeof open>[0]) =>
    afterClose(close, () => open(place))
  const tick = <Check className="size-5 text-brand" />
  const at = placeOf(filters)

  return (
    <>
      <ul className="divide-y divide-border border-b border-border">
        <li>
          <SheetAction
            icon={<HardDrive />}
            label={ROOT_LABEL}
            trailing={at === "root" && tick}
            onClick={() => pick()}
          />
        </li>
        <li>
          <SheetAction
            icon={<Layers />}
            label="All servers"
            trailing={at === "all" ? tick : <Count n={facets.data?.total} />}
            onClick={() => pick({ folder: "all" })}
          />
        </li>
        <li>
          <SheetAction
            icon={<Star />}
            label="Favorites"
            trailing={
              at === "favorites" ? tick : <Count n={facets.data?.favorites} />
            }
            onClick={() => pick({ favorites: true })}
          />
        </li>
      </ul>
      <p className="px-2 pt-5 pb-1 font-label text-caption tracking-label text-ash uppercase">
        Folders
      </p>
      <ul className="divide-y divide-border">
        {flatten(roots).map((node) => (
          <li
            key={node.id}
            style={{ paddingInlineStart: `${node.depth * 1.25}rem` }}
          >
            <SheetAction
              icon={<FolderIcon />}
              label={node.name}
              trailing={
                folderIdOf(filters) === node.id ? (
                  tick
                ) : (
                  <Count n={node.total} />
                )
              }
              onClick={() => pick({ folder: node.id })}
            />
          </li>
        ))}
        {can.folders && (
          <li>
            <SheetAction
              icon={<FolderPlus />}
              label="New folder"
              onClick={() =>
                afterClose(close, () => actions.newFolder(folderIdOf(filters)))
              }
            />
          </li>
        )}
      </ul>
    </>
  )
}

function Count({ n }: { n?: number }) {
  return (
    <span className="text-body-sm font-normal text-ash tabular-nums">
      {n ?? ""}
    </span>
  )
}

// Actions on the folder being viewed: the phone's stand-in for the path's menu.
function FolderActions({ close }: { close: () => void }) {
  const { filters } = useFilters()
  const folders = useFolders()
  const actions = useServerActions()
  const can = useWorkspaceCan()
  const { nodes } = buildTree(folders.data ?? [])
  const folder = nodes.get(folderIdOf(filters) ?? "")
  if (!folder) return null
  const run = (fn: () => void) => () => afterClose(close, fn)

  return (
    <>
      <p className="px-2 pb-2 text-body-sm text-muted-foreground">
        {folderPath(nodes, folder.id)}
      </p>
      <ul className="divide-y divide-border">
        {can.addServer && (
          <li>
            <SheetAction
              icon={<Plus />}
              label="Add server here"
              onClick={run(() => actions.addServer(folder.id))}
            />
          </li>
        )}
        {can.folders && (
          <>
            <li>
              <SheetAction
                icon={<FolderPlus />}
                label="New subfolder"
                onClick={run(() => actions.newFolder(folder.id))}
              />
            </li>
            <li>
              <SheetAction
                icon={<Pencil />}
                label="Rename or move"
                onClick={run(() => actions.editFolder(folder))}
              />
            </li>
            <li>
              <SheetAction
                icon={<Trash2 />}
                label="Delete folder"
                description="Its servers move up a level"
                destructive
                onClick={run(() => actions.deleteFolder(folder))}
              />
            </li>
          </>
        )}
      </ul>
    </>
  )
}

function SortPicker({ close }: { close: () => void }) {
  const { filters, setFilters } = useFilters()
  const pick = (patch: Parameters<typeof setFilters>[0]) =>
    afterClose(close, () => setFilters(patch))

  return (
    <>
      <ul className="divide-y divide-border border-b border-border">
        {(Object.keys(sortLabels) as SortField[]).map((field) => (
          <li key={field}>
            <SheetAction
              label={sortLabels[field]}
              trailing={
                filters.sort === field && (
                  <Check className="size-5 text-brand" />
                )
              }
              onClick={() => pick({ sort: field })}
            />
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3 px-2 py-4">
        {(["asc", "desc"] as const).map((order) => (
          <Button
            key={order}
            size="lg"
            variant={filters.order === order ? "default" : "outline"}
            onClick={() => pick({ order })}
          >
            {order === "asc" ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
            {order === "asc" ? "Ascending" : "Descending"}
          </Button>
        ))}
      </div>
    </>
  )
}
