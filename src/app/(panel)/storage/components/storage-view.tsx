"use client"

import { CloudOff, Ellipsis, HardDrive, Lock, Plus, Star } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useRef, useState } from "react"

import {
  StatusDot,
  statusMeta,
  timeAgo,
} from "@/app/(panel)/servers/components/meta"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { PageHeader } from "@/components/panel/page-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { Storage } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Segmented } from "../../servers/[id]/components/parts"
import { useWorkspaceCan } from "../../servers/components/permissions"
import { useCheckingStorages, useStorages } from "../api"
import { useStoragePageFilters } from "./filters"
import { InsightsBody, InsightsControls } from "./insights/insights"
import { endpointLabel, ProtocolTile, providerLabel } from "./meta"
import { useStorageCan } from "./permissions"
import { useStorageActions } from "./storage-actions"
import { StorageMenuItems, StorageSheet } from "./storage-menu"

// Favorites first, then by name.
const sorted = (items: Storage[]) =>
  [...items].sort(
    (a, b) =>
      Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name),
  )

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
  const [{ tab }, setFilters] = useStoragePageFilters()

  return (
    <>
      <PageHeader
        title="Storage"
        description="S3 buckets, FTP, SFTP and WebDAV shares: browse them and move files between them and your servers."
        guide="storage"
        actions={
          canAdd && (
            <Button onClick={() => actions.addStorage()}>
              <Plus />
              Add storage
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-4 px-6 pt-5 pb-24">
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Show"
              value={tab}
              onChange={(tab) => setFilters({ tab })}
              items={[
                { value: "storages", label: `Storages · ${items.length}` },
                { value: "insights", label: "Insights" },
              ]}
            />
            {tab === "insights" && <InsightsControls phone={false} />}
          </div>
        )}
        {list.isPending ? (
          <div className="overflow-hidden rounded-2xl border border-border">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
                key={i}
                className="flex h-14 items-center gap-3 border-b border-border px-4 last:border-b-0"
              >
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ms-auto h-4 w-56" />
              </div>
            ))}
          </div>
        ) : list.isError && !list.data ? (
          <div className="rounded-2xl border border-border">
            <Failed error={list.error} onRetry={() => list.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border">
            <NoStorage onAdd={canAdd ? actions.addStorage : undefined} />
          </div>
        ) : tab === "insights" ? (
          <InsightsBody phone={false} />
        ) : (
          <div className="@container overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-body-sm">
              <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
                <tr>
                  <th scope="col" className="w-10 ps-3">
                    <span className="sr-only">Favorite</span>
                  </th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Address</Th>
                  <Th>Status</Th>
                  <Th className="hidden @4xl:table-cell">Checked</Th>
                  <th scope="col" className="w-12">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((s) => (
                  <Row key={s.id} storage={s} checking={checking.has(s.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function Th({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn("h-10 px-3 text-start font-medium", className)}
    >
      {children}
    </th>
  )
}

function Row({
  storage: s,
  checking,
}: {
  storage: Storage
  checking: boolean
}) {
  const actions = useStorageActions()
  const can = useStorageCan()
  return (
    <tr className="group/row h-14 hover:bg-subtle">
      <td className="ps-3">
        <button
          type="button"
          aria-label={s.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={s.favorite}
          disabled={!can(s, "operator")}
          onClick={() => actions.toggleFavorite(s)}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg text-ash enabled:hover:bg-muted enabled:hover:text-foreground",
            !s.favorite &&
              "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Star
            className={cn("size-4", s.favorite && "fill-brand text-brand")}
          />
        </button>
      </td>
      <td className="max-w-72 px-3">
        <Link
          href={`/storage/${s.id}`}
          className="flex items-center gap-3 outline-none hover:text-brand focus-visible:text-brand"
        >
          <ProtocolTile protocol={s.protocol} className="size-7 rounded-md" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{s.name}</span>
            {s.description && (
              <span className="block truncate text-caption text-ash">
                {s.description}
              </span>
            )}
          </span>
        </Link>
      </td>
      <td className="px-3 whitespace-nowrap">
        <span className="flex items-center gap-2">
          {providerLabel(s)}
          {s.read_only && <ReadOnlyBadge />}
        </span>
      </td>
      <td className="max-w-80 truncate px-3 font-mono text-caption text-muted-foreground">
        {endpointLabel(s)}
      </td>
      <td className="px-3 whitespace-nowrap">
        <span
          className="flex items-center gap-2"
          title={s.status === "online" ? s.detail : s.status_message}
        >
          <StatusDot status={s.status} checking={checking} />
          {checking ? "Checking…" : statusMeta[s.status].label}
          {!checking && s.status === "online" && s.latency_ms != null && (
            <span className="text-muted-foreground">{s.latency_ms} ms</span>
          )}
        </span>
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
        {timeAgo(s.last_checked_at)}
      </td>
      <td className="pe-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${s.name} actions`}
              />
            }
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <StorageMenuItems storage={s} checking={checking} />
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
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
  const [{ tab }, setFilters] = useStoragePageFilters()

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <h1 className="text-heading font-light">Storage</h1>
        <HelpButton
          href={guideHref("storage")}
          label="Storage guide"
          className="ms-auto"
        />
        {canAdd && (
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
        <div className="flex flex-col gap-3 px-4 pt-4">
          <Segmented
            label="Show"
            value={tab}
            onChange={(tab) => setFilters({ tab })}
            items={[
              { value: "storages", label: `Storages · ${items.length}` },
              { value: "insights", label: "Insights" },
            ]}
          />
          {tab === "insights" && (
            <div className="flex items-center gap-2">
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
                  </span>
                  {s.favorite && (
                    <Star
                      aria-label="Favorite"
                      className="size-4 shrink-0 fill-brand text-brand"
                    />
                  )}
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
}: {
  icon: ReactNode
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center md:py-20">
      <span className="mb-4 flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand [&_svg]:size-5">
        {icon}
      </span>
      <h2 className="text-body font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
