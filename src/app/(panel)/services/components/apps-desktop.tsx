"use client"

import { AppWindow, CloudOff, Plus, SearchX } from "lucide-react"

import { useAccess } from "@/components/auth/auth"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { AppList } from "@/lib/services"
import {
  Empty,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { useApps } from "../api"
import { useAppActions } from "./app-actions"
import { CategoryBar } from "./category-bar"
import { LayoutDnd, useDraggingApp } from "./layout-dnd"
import { noApps, useAppFilters, useViewMode, visibleGroups } from "./meta"
import { useAppLayoutCan } from "./permissions"
import { TableView } from "./table-view"
import { TileView } from "./tile-view"

const views = [
  { value: "tiles", label: "Tiles" },
  { value: "table", label: "Table" },
] as const

export function AppsDesktop() {
  const list = useApps()
  const { q, critical } = useAppFilters()

  // Rearranging works on the whole list, so not while it's filtered.
  const layoutCan = useAppLayoutCan()
  const enabled = layoutCan && !!list.data && !q && !critical

  return (
    <LayoutDnd enabled={enabled} list={list.data ?? noApps}>
      {(data) => <Body list={list} data={data} enabled={enabled} />}
    </LayoutDnd>
  )
}

// Inside the drag context, with the arrangement as it looks mid-drag.
function Body({
  list,
  data,
  enabled,
}: {
  list: ReturnType<typeof useApps>
  data: AppList
  enabled: boolean
}) {
  const { q, setQ, cat, critical, setCat } = useAppFilters()
  const [view, setView] = useViewMode()
  const a = useAppActions()
  const { canCreateIn } = useAccess()
  const { workspace } = useWorkspace()
  const canAdd = canCreateIn(workspace?.id)
  const draggingApp = useDraggingApp()

  const { items, categories } = data
  const { shown, groups } = visibleGroups(
    data,
    { q, cat, critical },
    { enabled, dragging: draggingApp },
  )

  return (
    <div className="flex flex-col gap-4 px-6 pb-24">
      {/* Stays under the header while the list scrolls. */}
      <div className="sticky top-[calc(3rem+1px)] z-10 -mx-6 flex items-start gap-3 bg-background px-6 pt-5 pb-1">
        <CategoryBar
          items={items}
          categories={categories}
          className="min-w-0 flex-1"
        />
        <div className="flex shrink-0 items-center gap-3">
          {list.data && (
            <span className="text-caption text-ash tabular-nums">
              {shown.length === items.length
                ? `${items.length} ${items.length === 1 ? "service" : "services"}`
                : `${shown.length} of ${items.length}`}
            </span>
          )}
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Search services"
            label="Search services"
            className="md:w-60"
          />
          <Segmented
            label="View"
            items={views}
            value={view}
            onChange={setView}
          />
          {canAdd && (
            <Button
              onClick={() => a.add(cat && cat !== "none" ? cat : undefined)}
            >
              <Plus />
              Add service
            </Button>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        {list.isPending ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-border p-4"
              >
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : list.isError && !list.data ? (
          <Empty
            icon={CloudOff}
            title="Couldn't load services"
            body={list.error.message || "The server didn't answer. Try again."}
            action={
              <Button variant="outline" onClick={() => list.refetch()}>
                Try again
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <Empty
            icon={AppWindow}
            title="No services yet"
            body="Keep every web service your team opens here: its address, a logo and the logins, in place of a shared sheet."
            action={
              canAdd && (
                <Button onClick={() => a.add()}>
                  <Plus />
                  Add service
                </Button>
              )
            }
          />
        ) : groups.length === 0 ? (
          <Empty
            icon={SearchX}
            title="No services match"
            body="Try other words, or look in every category."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQ("")
                  setCat(null)
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : view === "table" ? (
          <TableView groups={groups} />
        ) : (
          <TileView groups={groups} />
        )}
      </div>
    </div>
  )
}
