"use client"

import { AppWindow, CloudOff, Ellipsis, Plus, SearchX } from "lucide-react"
import { type ReactNode, useRef, useState } from "react"

import { useAccess } from "@/components/auth/auth"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { App, AppList } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  type Item,
  SearchBox,
  SheetItems,
} from "../../servers/[id]/components/parts"
import { useApps } from "../api"
import { useAppActions } from "./app-actions"
import { useAppMenu } from "./app-menu"
import {
  LayoutDnd,
  SortableApps,
  useDraggingApp,
  useGroupDrop,
  useSortableApp,
} from "./layout-dnd"
import {
  type AppGroup,
  AppLogo,
  colorOf,
  noApps,
  safeHref,
  shortAddress,
  useAppFilters,
  visibleGroups,
} from "./meta"
import { useAppCan, useAppLayoutCan } from "./permissions"
import { accountName, CopyPasswordButton, CopyUsernameButton } from "./secret"
import { GroupHeading } from "./tile-view"

// Phones: a full-screen list. A tap opens the service, ⋯ opens its sheet,
// and holding a row picks it up to move it.
export function AppsMobile() {
  const list = useApps()
  const { q, critical } = useAppFilters()
  // Rearranging works on the whole list, so not while it's filtered.
  const layoutCan = useAppLayoutCan()
  const enabled = layoutCan && !!list.data && !q && !critical

  const [sheetOpen, setSheetOpen] = useOpen("app-sheet")
  const [sheetId, setSheetId] = useState<string | null>(null)
  // Keep the last tapped service around so the sheet can animate out.
  const last = useRef<App | null>(null)
  const current = list.data?.items.find((a) => a.id === sheetId) ?? last.current
  if (current) last.current = current

  return (
    <>
      <LayoutDnd enabled={enabled} list={list.data ?? noApps}>
        {(data) => (
          <Body
            list={list}
            data={data}
            enabled={enabled}
            onMore={(app) => {
              setSheetId(app.id)
              setSheetOpen(true)
            }}
          />
        )}
      </LayoutDnd>
      {current && (
        <AppSheet app={current} open={sheetOpen} onOpenChange={setSheetOpen} />
      )}
    </>
  )
}

function Body({
  list,
  data,
  enabled,
  onMore,
}: {
  list: ReturnType<typeof useApps>
  data: AppList
  enabled: boolean
  onMore: (app: App) => void
}) {
  const { q, setQ, cat, setCat, critical, setCritical } = useAppFilters()
  const a = useAppActions()
  const { canCreateIn } = useAccess()
  const { workspace } = useWorkspace()
  const canAdd = canCreateIn(workspace?.id)
  const dragging = useDraggingApp()

  const { items, categories } = data
  const { groups } = visibleGroups(
    data,
    { q, cat, critical },
    { enabled, dragging },
  )
  const known = new Set(categories.map((c) => c.id))
  const loose = items.some((x) => !x.category_id || !known.has(x.category_id))
  const sorted = [...categories].sort((x, y) => x.position - y.position)

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <h1 className="text-heading font-light">Services</h1>
        <HelpButton
          href={guideHref("service-launcher")}
          label="Services guide"
          className="ms-auto"
        />
        {canAdd && (
          <Button
            size="icon-lg"
            aria-label="Add service"
            className="rounded-full"
            onClick={() => a.add(cat && cat !== "none" ? cat : undefined)}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </header>

      <div className="sticky top-0 z-20 flex flex-col gap-3 bg-background pt-3 pb-2">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search services"
          label="Search services"
          className="mx-4"
        />
        {items.length > 0 && (
          <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
            <Chip on={!cat && !critical} onClick={() => setCat(null)}>
              All
            </Chip>
            <Chip on={critical} onClick={() => setCritical(!critical)}>
              <span className="size-1.5 rounded-full bg-destructive" />
              Critical
            </Chip>
            {sorted.map((c) => (
              <Chip
                key={c.id}
                on={cat === c.id}
                onClick={() => setCat(cat === c.id ? null : c.id)}
              >
                <span
                  className={cn("size-2 rounded-full", colorOf(c.color).dot)}
                />
                {c.name}
              </Chip>
            ))}
            {loose && (
              <Chip
                on={cat === "none"}
                onClick={() => setCat(cat === "none" ? null : "none")}
              >
                <span className="size-2 rounded-full bg-mist" />
                Uncategorized
              </Chip>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 pb-24">
        {list.isPending ? (
          <ul className="divide-y divide-border border-y border-border">
            {Array.from({ length: 6 }, (_, i) => (
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
          <Empty
            icon={CloudOff}
            title="Couldn't load services"
            body={list.error.message || "The server didn't answer. Try again."}
            action={
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => list.refetch()}
              >
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
                <Button size="lg" className="w-full" onClick={() => a.add()}>
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
                size="lg"
                className="w-full"
                onClick={() => {
                  setQ("")
                  setCat(null)
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((g) => (
              <Group key={g.category?.id ?? "none"} group={g} onMore={onMore} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium whitespace-nowrap outline-none",
        on
          ? "border-brand/30 bg-brand-soft text-brand-strong"
          : "border-mist active:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

function Group({
  group,
  onMore,
}: {
  group: AppGroup
  onMore: (app: App) => void
}) {
  const drop = useGroupDrop(group)
  const dragging = useDraggingApp()
  return (
    <section aria-label={group.category?.name ?? "Uncategorized"}>
      <div className="px-4 pb-2">
        <GroupHeading group={group} />
      </div>
      <SortableApps group={group}>
        <ul
          ref={drop.ref}
          className="divide-y divide-border border-y border-border"
        >
          {group.apps.map((app) => (
            <Row key={app.id} app={app} onMore={onMore} />
          ))}
          {group.apps.length === 0 && (
            <li
              className={cn(
                "flex h-16 items-center justify-center text-body-sm text-ash",
                dragging && "bg-brand-soft/50",
                drop.over && "text-brand-strong",
              )}
            >
              {dragging ? "Drop here" : "Hold a service and drag it here"}
            </li>
          )}
        </ul>
      </SortableApps>
    </section>
  )
}

function Row({ app, onMore }: { app: App; onMore: (app: App) => void }) {
  const s = useSortableApp(app)
  const a = useAppActions()
  const href = safeHref(app.address)
  const body = (
    <>
      <AppLogo app={app} size={40} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body font-medium">{app.name}</span>
          {app.critical && (
            <span
              role="img"
              aria-label="Critical"
              className="size-1.5 shrink-0 rounded-full bg-destructive"
            />
          )}
        </span>
        <span className="block truncate text-body-sm text-muted-foreground">
          {shortAddress(app.address)}
        </span>
      </span>
    </>
  )
  const main =
    "flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 text-start outline-none active:bg-muted"

  return (
    <li
      ref={s.ref}
      style={s.style}
      {...s.pointer}
      onClickCapture={s.onClickCapture}
      // Holding a row picks it up; no text selection or link callout then.
      onContextMenu={s.enabled ? (e) => e.preventDefault() : undefined}
      className={cn(
        "flex items-center bg-background",
        s.enabled && "select-none [-webkit-touch-callout:none]",
        s.dragging && "opacity-40",
      )}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          className={main}
        >
          {body}
        </a>
      ) : (
        <button type="button" className={main} onClick={() => a.details(app)}>
          {body}
        </button>
      )}
      <CopyPasswordButton app={app} />
      <button
        type="button"
        aria-label={`Actions for ${app.name}`}
        onClick={() => onMore(app)}
        className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
      >
        <Ellipsis className="size-5" />
      </button>
    </li>
  )
}

function AppSheet({
  app,
  open,
  onOpenChange,
}: {
  app: App
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // Opening the link has to happen inside the tap, so it doesn't wait for
  // the sheet to close first.
  const groups = useAppMenu(app).map((g) =>
    g.map(
      (item): Item =>
        item.key === "open"
          ? {
              ...item,
              stay: true,
              onSelect: () => {
                item.onSelect()
                onOpenChange(false)
              },
            }
          : item,
    ),
  )
  const logins = app.accounts.filter((x) => x.username || x.has_password)

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={app.name}
      hideTitle
      header={
        <div className="flex items-center gap-3 px-6 pt-1 pb-3">
          <AppLogo app={app} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-subheading font-medium">{app.name}</p>
            <p className="truncate text-body-sm text-muted-foreground">
              {shortAddress(app.address)}
            </p>
          </div>
        </div>
      }
    >
      <Logins app={app} logins={logins} />
      <SheetItems groups={groups} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

// Copy buttons per login, for Operators and up.
function Logins({ app, logins }: { app: App; logins: App["accounts"] }) {
  const can = useAppCan(app)
  if (!can.reveal || logins.length === 0) return null
  return (
    <ul className="mb-2 divide-y divide-border border-b border-border">
      {logins.map((account) => (
        <li key={account.id} className="flex min-h-14 items-center gap-2 px-6">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm font-medium">
              {accountName(account)}
            </span>
            {account.username && account.label && (
              <span className="block truncate text-caption text-ash">
                {account.username}
              </span>
            )}
          </span>
          <CopyUsernameButton app={app} account={account} />
          <CopyPasswordButton app={app} account={account} />
        </li>
      ))}
    </ul>
  )
}
