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

import { PageHeader } from "@/components/panel/page-header"
import { Button } from "@/components/ui/button"
import {
  PAGE_SIZE,
  useBulkCheck,
  useCheckingIds,
  useFolders,
  useServers,
} from "../api"
import { FolderRail } from "./folder-rail"
import { buildTree, folderPath } from "./folder-tree"
import { useServerCan, useWorkspaceCan } from "./permissions"
import { useServerActions } from "./server-actions"
import { type Selection, ServersTable } from "./servers-table"
import { ActiveFilters, Toolbar } from "./toolbar"
import { toQuery, useFilters } from "./use-filters"

export function ServersDesktop() {
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

  const folderId =
    filters.folder && filters.folder !== "none" ? filters.folder : null
  const can = useWorkspaceCan()

  return (
    <>
      <PageHeader
        title="Servers"
        description="Every machine Morcheh reaches over SSH."
        actions={
          <>
            {can.folders && (
              <Button
                variant="outline"
                onClick={() => actions.newFolder(folderId)}
              >
                <FolderPlus />
                New folder
              </Button>
            )}
            {can.addServer && (
              <Button onClick={() => actions.addServer(folderId)}>
                <Plus />
                Add server
              </Button>
            )}
          </>
        }
      />

      <div className="grid w-full grid-cols-[13.5rem_minmax(0,1fr)] gap-6 px-6 pt-5 pb-24">
        <aside className="sticky top-[calc(3rem+1px+--spacing(5))] self-start">
          <FolderRail />
        </aside>

        <section className="flex min-w-0 flex-col gap-3">
          <ViewTitle total={servers.data ? total : undefined} />
          <Toolbar />
          <ActiveFilters />
          <ServersTable
            servers={items}
            loading={servers.isPending}
            error={servers.data ? null : servers.error}
            onRetry={() => servers.refetch()}
            selection={selection}
            onSelectionChange={setSelection}
          />
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
            />
          )}
        </section>
      </div>
    </>
  )
}

function ViewTitle({ total }: { total?: number }) {
  const { filters } = useFilters()
  const folders = useFolders()
  const { nodes } = buildTree(folders.data ?? [])
  const title = filters.favorites
    ? "Favorites"
    : filters.folder === "none"
      ? "Unfiled"
      : filters.folder
        ? folderPath(nodes, filters.folder) || "Folder"
        : "All servers"
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="truncate text-body font-medium">{title}</h2>
      {total !== undefined && (
        <span className="text-body-sm text-ash tabular-nums">
          {total} {total === 1 ? "server" : "servers"}
        </span>
      )}
    </div>
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
}: {
  selection: Selection
  onClear: () => void
}) {
  const actions = useServerActions()
  const bulkCheck = useBulkCheck()
  const checking = useCheckingIds()
  const servers = [...selection.values()]
  const ids = [...selection.keys()]
  const anyChecking = ids.some((id) => checking.has(id))
  // A bulk action is all or nothing, so it needs the level on every server.
  const serverCan = useServerCan()
  const operator = servers.every((s) => serverCan(s, "operator"))
  const owner = servers.every((s) => serverCan(s, "owner"))

  function check() {
    bulkCheck.mutate(ids, {
      onSuccess: (res) => {
        const online = res.items.filter((s) => s.status === "online").length
        const failed = res.items.length - online
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
      {operator && (
        <Button
          variant="ghost"
          size="sm"
          disabled={anyChecking}
          onClick={check}
        >
          <Activity />
          {anyChecking ? "Checking…" : "Check"}
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
