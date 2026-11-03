"use client"

import { AppWindow, CloudOff, Plus, SearchX } from "lucide-react"

import { useAccess } from "@/components/auth/auth"
import { PageHeader } from "@/components/panel/page-header"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { useApps } from "../api"
import { useAppActions } from "./app-actions"
import { CategoryRail } from "./category-rail"
import { groupApps, matchesApp, useAppFilters, useViewMode } from "./meta"
import { TableView } from "./table-view"
import { TileView } from "./tile-view"

const views = [
  { value: "tiles", label: "Tiles" },
  { value: "table", label: "Table" },
] as const

export function AppsDesktop() {
  const list = useApps()
  const { q, setQ, cat, critical, setCat } = useAppFilters()
  const [view, setView] = useViewMode()
  const a = useAppActions()
  const { canCreateIn } = useAccess()
  const { workspace } = useWorkspace()
  const canAdd = canCreateIn(workspace?.id)

  const items = list.data?.items ?? []
  const categories = list.data?.categories ?? []
  const known = new Set(categories.map((c) => c.id))
  const shown = items.filter(
    (a) =>
      matchesApp(a, q) &&
      (!critical || a.critical) &&
      (!cat ||
        (cat === "none"
          ? !a.category_id || !known.has(a.category_id)
          : a.category_id === cat)),
  )
  const groups = groupApps(shown, categories).filter((g) => g.apps.length > 0)

  return (
    <>
      <PageHeader
        title="Services"
        description="The web services your team uses, with their addresses and logins."
        guide="service-launcher"
        actions={
          canAdd && (
            <Button
              onClick={() => a.add(cat && cat !== "none" ? cat : undefined)}
            >
              <Plus />
              Add service
            </Button>
          )
        }
      />
      <div className="grid grid-cols-[13.5rem_minmax(0,1fr)] gap-6 px-6 pt-5 pb-24">
        <aside className="sticky top-[calc(3rem+1px+--spacing(5))] self-start">
          <CategoryRail items={items} categories={categories} />
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-3">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Search services"
              label="Search services"
            />
            <Segmented
              label="View"
              items={views}
              value={view}
              onChange={setView}
            />
            {list.data && (
              <span className="ms-auto text-caption text-ash tabular-nums">
                {shown.length === items.length
                  ? `${items.length} ${items.length === 1 ? "service" : "services"}`
                  : `${shown.length} of ${items.length}`}
              </span>
            )}
          </div>
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
              body={
                list.error.message || "The server didn't answer. Try again."
              }
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
    </>
  )
}
