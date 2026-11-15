"use client"

import {
  CloudOff,
  Ellipsis,
  HardDrive,
  Lock,
  Plus,
  RefreshCw,
  SearchX,
  Star,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useRef, useState } from "react"
import { MiniStrip } from "@/app/(panel)/databases/components/database-cards"
import {
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { StatusDot, statusMeta } from "@/app/(panel)/servers/components/meta"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { storageItem } from "@/components/panel/nav"
import { SectionLinks } from "@/components/panel/section-links"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { Storage } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useWorkspaceCan } from "../../servers/components/permissions"
import { useCheckingStorages, useStorages } from "../api"
import { newSyncHref } from "../syncs/components/meta"
import { useSyncCan } from "../syncs/components/permissions"
import { SyncList, useSyncCounts } from "../syncs/components/sync-list"
import {
  type StoragePage,
  storagePages,
  useStorageListFilters,
  useStoragePage,
} from "./filters"
import { InsightsBody, InsightsControls } from "./insights/insights"
import { endpointLabel, ProtocolTile, providerLabel } from "./meta"
import { useStorageActions } from "./storage-actions"
import {
  isProblem,
  StorageCards,
  StorageCardsSkeleton,
  useStorageDay,
} from "./storage-cards"
import { StorageSheet } from "./storage-menu"

// Favorites first, then by name.
const sorted = (items: Storage[]) =>
  [...items].sort(
    (a, b) =>
      Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name),
  )

const syncKindOf = (tab: StoragePage) =>
  tab === "syncs" ? "sync" : tab === "migrations" ? "migrate" : null

const pageTitles: Record<StoragePage, string> = {
  insights: "Storage",
  storages: "Storages",
  syncs: "Syncs",
  migrations: "Migrations",
}

export function StorageView() {
  const isPhone = useIsPhone()
  if (isPhone === null) return null
  return isPhone ? <StorageMobile /> : <StorageDesktop />
}

function StorageDesktop() {
  const actions = useStorageActions()
  const canAdd = useWorkspaceCan().addServer
  const list = useStorages()
  const checking = useCheckingStorages()
  const items = sorted(list.data?.items ?? [])
  const tab = useStoragePage()
  const syncCan = useSyncCan()
  const syncKind = syncKindOf(tab)

  const addButton = canAdd && (
    <Button className="h-9" onClick={() => actions.addStorage()}>
      <Plus />
      Add storage
    </Button>
  )

  let body: ReactNode
  if (list.isPending) {
    body = <StorageCardsSkeleton />
  } else if (list.isError && !list.data) {
    body = (
      <div className="rounded-2xl border border-border">
        <Failed error={list.error} onRetry={() => list.refetch()} />
      </div>
    )
  } else if (items.length === 0) {
    body = (
      <div className="rounded-2xl border border-border">
        <NoStorage onAdd={canAdd ? actions.addStorage : undefined} />
      </div>
    )
  } else if (syncKind) {
    body = (
      <SyncList
        kind={syncKind}
        phone={false}
        action={
          syncCan.edit && (
            <Button
              className="h-9"
              render={<Link href={newSyncHref({ kind: syncKind })} />}
              nativeButton={false}
            >
              <Plus />
              {syncKind === "sync" ? "New sync" : "New migration"}
            </Button>
          )
        }
      />
    )
  } else if (tab === "insights") {
    body = (
      <>
        <div className="flex min-h-9 flex-wrap items-center gap-3">
          <InsightsControls phone={false} />
          {addButton && <span className="ms-auto">{addButton}</span>}
        </div>
        <InsightsBody phone={false} />
      </>
    )
  } else {
    body = (
      <StoragesList
        items={items}
        checking={checking}
        refreshing={list.isFetching}
        onRefresh={() => list.refetch()}
        action={addButton}
      />
    )
  }

  return (
    <>
      <h1 className="sr-only">{pageTitles[tab]}</h1>
      <div className="flex flex-col gap-4 px-6 pt-5 pb-24">{body}</div>
    </>
  )
}

// Which storages a list shows: the `show` choice, then the search.
function useShownStorages(items: Storage[]) {
  const [{ q, show }, setFilters] = useStorageListFilters()
  const look = items.filter(isProblem)
  const favorites = items.filter((s) => s.favorite)
  const current =
    show === "problems" || show === "favorites" ? show : ("all" as const)
  const words = q.trim().toLowerCase()
  const shown = (
    current === "problems" ? look : current === "favorites" ? favorites : items
  ).filter(
    (s) =>
      !words ||
      [s.name, s.description, providerLabel(s), endpointLabel(s)].some((t) =>
        t.toLowerCase().includes(words),
      ),
  )
  const choices = [
    { value: "all" as const, label: `All · ${items.length}` },
    { value: "problems" as const, label: `Needs a look · ${look.length}` },
    ...(favorites.length
      ? [
          {
            value: "favorites" as const,
            label: `Favorites · ${favorites.length}`,
          },
        ]
      : []),
  ]
  const empty = (
    <Empty
      icon={<SearchX />}
      title={
        current === "problems" && !words
          ? "Nothing needs a look"
          : "Nothing matches"
      }
      text={
        current === "problems" && !words
          ? "Every storage answered its last check."
          : "Try another search, or show all storages."
      }
      bordered
      action={
        <Button
          variant="outline"
          onClick={() => setFilters({ q: null, show: null })}
        >
          Show all
        </Button>
      }
    />
  )
  return {
    q,
    current,
    look,
    shown,
    choices,
    empty,
    setShow: (v: "all" | "problems" | "favorites") =>
      setFilters({ show: v === "all" ? null : v }),
    setQ: (v: string) => setFilters({ q: v || null }),
  }
}

// /storage/list on desktop: one toolbar row (which ones, search, a short
// summary, Refresh, Add) above the cards.
function StoragesList({
  items,
  checking,
  refreshing,
  onRefresh,
  action,
}: {
  items: Storage[]
  checking: Set<string | undefined>
  refreshing: boolean
  onRefresh: () => void
  action: ReactNode
}) {
  const f = useShownStorages(items)
  const online = items.filter((s) => s.status === "online").length
  return (
    <>
      <div className="@container flex items-center gap-2">
        <Segmented
          label="Show"
          items={f.choices}
          value={f.current}
          onChange={f.setShow}
        />
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <SearchBox
          value={f.q}
          onChange={f.setQ}
          placeholder="Search name, provider or address"
          label="Search storages"
          className="min-w-0 flex-1 md:max-w-72 md:min-w-36"
        />
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <span className="me-2 hidden text-caption whitespace-nowrap text-muted-foreground @3xl:inline">
            {f.look.length
              ? `${f.look.length} of ${items.length} need a look`
              : `${online} of ${items.length} online`}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="Refresh"
            title="Refresh"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>
          {action}
        </div>
      </div>
      {f.shown.length ? (
        <StorageCards items={f.shown} checking={checking} />
      ) : (
        f.empty
      )}
    </>
  )
}

export function ReadOnlyBadge() {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-muted px-2 text-caption text-muted-foreground">
      <Lock className="size-3" />
      Read-only
    </span>
  )
}

function StorageMobile() {
  const actions = useStorageActions()
  const canAdd = useWorkspaceCan().addServer
  const list = useStorages()
  const checking = useCheckingStorages()
  const items = sorted(list.data?.items ?? [])
  const [sheetOpen, setSheetOpen] = useOpen("storage-sheet")
  const [sheetId, setSheetId] = useState<string | null>(null)
  // Keep the last tapped storage around so the sheet can animate out.
  const last = useRef<Storage | null>(null)
  const current = items.find((s) => s.id === sheetId) ?? last.current
  if (current) last.current = current
  const tab = useStoragePage()
  const syncCounts = useSyncCounts()
  const syncCan = useSyncCan()
  const syncKind = syncKindOf(tab)
  const day = useStorageDay()

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <h1 className="text-heading font-light">{pageTitles[tab]}</h1>
        <HelpButton
          href={guideHref("storage")}
          label="Storage guide"
          className="ms-auto"
        />
        {syncKind
          ? syncCan.edit &&
            items.length > 0 && (
              <Button
                size="icon-lg"
                aria-label={syncKind === "sync" ? "New sync" : "New migration"}
                className="rounded-full"
                render={<Link href={newSyncHref({ kind: syncKind })} />}
                nativeButton={false}
              >
                <Plus className="size-5" />
              </Button>
            )
          : canAdd && (
              <Button
                size="icon-lg"
                aria-label="Add storage"
                className="rounded-full"
                onClick={() => actions.addStorage()}
              >
                <Plus className="size-5" />
              </Button>
            )}
      </header>

      {items.length > 0 && (
        <div className="flex flex-col gap-3 pt-4">
          <SectionLinks
            item={storageItem}
            counts={{
              [storagePages.storages]: items.length,
              [storagePages.syncs]: syncCounts.sync,
              [storagePages.migrations]: syncCounts.migrate,
            }}
          />
          {tab === "insights" && (
            <div className="flex items-center gap-2 px-4">
              <InsightsControls phone />
            </div>
          )}
        </div>
      )}

      <div className={cn("pb-24", tab === "insights" ? "pt-3" : "pt-4")}>
        {list.isPending ? (
          <ul className="divide-y divide-border border-y border-border">
            {Array.from({ length: 4 }, (_, i) => (
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
        ) : list.isError && !list.data ? (
          <Failed error={list.error} onRetry={() => list.refetch()} />
        ) : items.length === 0 ? (
          <NoStorage onAdd={canAdd ? actions.addStorage : undefined} />
        ) : syncKind ? (
          <SyncList kind={syncKind} phone />
        ) : tab === "insights" ? (
          <div className="border-t border-border">
            <InsightsBody phone />
          </div>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {items.map((s) => (
              <li key={s.id} className="flex items-center">
                <Link
                  href={`/storage/${s.id}`}
                  className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
                >
                  <ProtocolTile protocol={s.protocol} className="size-10" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-body font-medium">
                        {s.name}
                      </span>
                      <StatusDot
                        status={s.status}
                        checking={checking.has(s.id)}
                      />
                      <span className="sr-only">
                        {statusMeta[s.status].label}
                      </span>
                    </span>
                    <span className="block truncate text-body-sm text-muted-foreground">
                      {providerLabel(s)}
                      {s.read_only && " · Read-only"} ·{" "}
                      <span className="font-mono text-caption">
                        {endpointLabel(s)}
                      </span>
                    </span>
                    {day.byId.get(s.id) && (
                      <MiniStrip
                        states={day.byId.get(s.id)?.strip ?? []}
                        label={`${s.name}: checks over the last 24 hours`}
                        className="mt-1.5 max-w-48"
                      />
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {s.favorite && (
                      <Star
                        aria-label="Favorite"
                        className="size-4 fill-brand text-brand"
                      />
                    )}
                    {day.byId.get(s.id)?.usage && (
                      <span className="text-caption text-ash tabular-nums">
                        {formatSize(day.byId.get(s.id)?.usage?.used_bytes ?? 0)}
                      </span>
                    )}
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label={`${s.name} actions`}
                  onClick={() => {
                    setSheetId(s.id)
                    setSheetOpen(true)
                  }}
                  className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
                >
                  <Ellipsis className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {current && (
        <StorageSheet
          storage={current}
          checking={checking.has(current.id)}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  )
}

function NoStorage({ onAdd }: { onAdd?: () => void }) {
  if (!onAdd) {
    return (
      <Empty
        icon={<HardDrive />}
        title="No storage to show"
        text="Nothing here is shared with you yet. Ask an admin or the workspace owner for access."
      />
    )
  }
  return (
    <Empty
      icon={<HardDrive />}
      title="Connect your first storage"
      text="An S3 bucket (AWS, MinIO, R2…), an FTP or SFTP account or a WebDAV share. Browse it here and send files between it and your servers."
      action={<Button onClick={onAdd}>Add storage</Button>}
    />
  )
}

function Failed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Empty
      icon={<CloudOff />}
      title="Couldn't load storages"
      text={error.message || "The server didn't answer. Try again."}
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}

function Empty({
  icon,
  title,
  text,
  action,
  bordered,
}: {
  icon: ReactNode
  title: string
  text: string
  action?: ReactNode
  bordered?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-16 text-center md:py-20",
        bordered && "rounded-2xl border border-border",
      )}
    >
      <span className="mb-4 flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand [&_svg]:size-5">
        {icon}
      </span>
      <h2 className="text-body font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
