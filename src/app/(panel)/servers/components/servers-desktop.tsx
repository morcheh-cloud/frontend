"use client"

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FolderInput,
  FolderPlus,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import { PAGE_SIZE, useBulkCheck, useCheckingIds, useServers } from "../api"
import { FolderDnd } from "./folder-dnd"
import {
  FolderCrumbs,
  FolderGrid,
  PlaceTabs,
  useShownFolders,
} from "./folder-grid"
import { ServerInsightsDesktop, ServersTabs } from "./insights/insights"
import { useServersPageTab } from "./page-tab"
import { useServerCan, useWorkspaceCan } from "./permissions"
import { useServerActions } from "./server-actions"
import { ServerCards } from "./server-cards"
import { type Selection, ServersTable } from "./servers-table"
import { ActiveFilters, Toolbar } from "./toolbar"
import { folderIdOf, toQuery, useFilters } from "./use-filters"

const views = [
  { value: "cards", label: "Cards" },
  { value: "table", label: "Table" },
] as const

export function ServersDesktop() {
  const [{ tab }] = useServersPageTab()
  const { filters, setPage } = useFilters()
  const actions = useServerActions()
  const query = toQuery(filters)
  const servers = useServers(query)
  const [selection, setSelection] = useState<Selection>(new Map())

  // A new search, filter or folder makes the old selection invisible; drop
  // it rather than act on servers the user can't see. Paging keeps it.
  const { offset: _offset, limit: _limit, ...view } = query
  const viewKey = JSON.stringify(view)
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on view change only
  useEffect(() => setSelection(new Map()), [viewKey])

  const items = servers.data?.items ?? []
  const total = servers.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Past the end (e.g. after deleting the last page's servers): step back.
  useEffect(() => {
    if (servers.data && filters.page > pages) setPage(pages)
  }, [servers.data, filters.page, pages, setPage])

  const folderId = folderIdOf(filters)
  const can = useWorkspaceCan()
  const folders = useShownFolders(filters)
  // A level holding only folders has no empty list to explain.
  const showList = servers.isPending || items.length > 0 || !folders.length
  const [listView, setListView] = useStoredChoice("morcheh.servers.view", [
    "cards",
    "table",
  ])
  const List = listView === "cards" ? ServerCards : ServersTable

  if (tab === "insights") return <ServerInsightsDesktop />

  return (
    <FolderDnd selection={selection} onMoved={() => setSelection(new Map())}>
      <section className="flex w-full min-w-0 flex-col gap-3 px-6 pt-5 pb-24">
        <Toolbar leading={<ServersTabs />}>
          {can.folders && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    aria-label="New folder"
                    className="size-9 p-0"
                    onClick={() => actions.newFolder(folderId)}
                  />
                }
              >
                <FolderPlus />
              </TooltipTrigger>
              <TooltipContent>New folder</TooltipContent>
            </Tooltip>
          )}
          {can.addServer && (
            <Button className="h-9" onClick={() => actions.addServer(folderId)}>
              <Plus />
              Add server
            </Button>
          )}
        </Toolbar>
        <ActiveFilters />
        <div className="flex items-center justify-between gap-3">
          <FolderCrumbs total={servers.data ? total : undefined} />
          <div className="flex shrink-0 items-center gap-2">
            <PlaceTabs />
            <Segmented
              label="View"
              items={views}
              value={listView}
              onChange={setListView}
            />
          </div>
        </div>
        {folders.length > 0 && <FolderGrid folders={folders} />}
        {showList && (
          <List
            servers={items}
            loading={servers.isPending}
            error={servers.data ? null : servers.error}
            onRetry={() => servers.refetch()}
            selection={selection}
            onSelectionChange={setSelection}
          />
        )}
        {total > PAGE_SIZE && (
          <Pagination
            page={filters.page}
            pages={pages}
            total={total}
            onPage={setPage}
          />
        )}
        {selection.size > 0 && (
          <BulkBar
            selection={selection}
            onClear={() => setSelection(new Map())}
            onSelectAll={
              items.every((s) => selection.has(s.id))
                ? undefined
                : () =>
                    setSelection(
                      new Map([
                        ...selection,
                        ...items.map((s) => [s.id, s] as const),
                      ]),
                    )
            }
          />
        )}
      </section>
    </FolderDnd>
  )
}

function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
}) {
  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-end gap-3 text-body-sm"
    >
      <span className="text-muted-foreground tabular-nums">
        {from}–{to} of {total}
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="rtl:rotate-180" />
        </Button>
      </div>
    </nav>
  )
}

function BulkBar({
  selection,
  onClear,
  onSelectAll,
}: {
  selection: Selection
  onClear: () => void
  /** Set while some servers on this page aren't selected. */
  onSelectAll?: () => void
}) {
  const actions = useServerActions()
  const bulkCheck = useBulkCheck()
  const checking = useCheckingIds()
  const servers = [...selection.values()]
  const ids = [...selection.keys()]
  const pending = ids.filter((id) => checking.has(id)).length
  const anyChecking = pending > 0
  // A bulk action is all or nothing, so it needs the level on every server.
  const serverCan = useServerCan()
  const operator = servers.every((s) => serverCan(s, "operator"))
  const owner = servers.every((s) => serverCan(s, "owner"))

  function check() {
    bulkCheck.mutate(ids, {
      onSuccess: (results) => {
        const online = results.filter(
          (r) => r.server?.status === "online",
        ).length
        const failed = results.length - online
        if (failed === 0) toast.success(`All ${online} servers are online`)
        else toast.warning(`${online} online, ${failed} with problems`)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  // Sticks to the viewport bottom while the list scrolls, centred on the list.
  return (
    <div
      role="toolbar"
      aria-label="Selected servers"
      className="sticky bottom-6 z-30 mx-auto mt-3 flex w-fit items-center gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-md"
    >
      <span className="px-3 text-body-sm font-medium tabular-nums">
        {selection.size} selected
      </span>
      {onSelectAll && (
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          Select all
        </Button>
      )}
      {operator && (
        <Button
          variant="ghost"
          size="sm"
          disabled={anyChecking}
          onClick={check}
        >
          <Activity />
          {anyChecking
            ? `Checking ${ids.length - pending}/${ids.length}`
            : "Check"}
        </Button>
      )}
      {owner && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.moveServers(ids, onClear)}
          >
            <FolderInput />
            Move
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.tagServers(servers, onClear)}
          >
            <Tags />
            Tags
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => actions.deleteServers(servers, onClear)}
          >
            <Trash2 />
            Delete
          </Button>
        </>
      )}
      <span aria-hidden className="mx-1 h-5 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear selection"
        onClick={onClear}
      >
        <X />
      </Button>
    </div>
  )
}
