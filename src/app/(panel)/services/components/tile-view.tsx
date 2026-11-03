"use client"

import { ExternalLink, GripVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { App } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAppActions } from "./app-actions"
import { AppMenu } from "./app-menu"
import {
  SortableApps,
  useDraggingApp,
  useGroupDrop,
  useSortableApp,
} from "./layout-dnd"
import { type AppGroup, AppLogo, colorOf, safeHref, shortAddress } from "./meta"
import { CopyPasswordButton, CopyUsernameButton } from "./secret"

// Services as tiles, one block per category. A tile opens the service's
// details (logins, Open button); the arrow on hover opens it in a new tab.
export function TileView({ groups }: { groups: AppGroup[] }) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <TileGroup key={g.category?.id ?? "none"} group={g} />
      ))}
    </div>
  )
}

function TileGroup({ group }: { group: AppGroup }) {
  const drop = useGroupDrop(group)
  const dragging = useDraggingApp()
  return (
    <section aria-label={group.category?.name ?? "Uncategorized"}>
      <GroupHeading group={group} />
      <SortableApps group={group} grid>
        <ul
          ref={drop.ref}
          className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3"
        >
          {group.apps.map((app) => (
            <TileItem key={app.id} app={app} />
          ))}
          {group.apps.length === 0 && (
            <li
              className={cn(
                "col-span-full flex h-[4.625rem] items-center justify-center rounded-2xl border border-dashed border-mist text-body-sm text-ash",
                (drop.over || dragging) && "border-brand bg-brand-soft/50",
                drop.over && "text-brand-strong",
              )}
            >
              {dragging ? "Drop here" : "Drag services here"}
            </li>
          )}
        </ul>
      </SortableApps>
    </section>
  )
}

function TileItem({ app }: { app: App }) {
  const s = useSortableApp(app)
  return (
    <li
      ref={s.ref}
      style={s.style}
      {...s.pointer}
      onClickCapture={s.onClickCapture}
      className={cn(
        "group/tile relative",
        s.enabled && "cursor-grab touch-manipulation select-none",
        s.dragging && "opacity-40",
      )}
    >
      <Tile app={app} />
      {/* Copy buttons show on hover or focus; the menu stays reachable where
          there's no hover. */}
      <span className="absolute end-2 top-2 flex items-center gap-0.5 rounded-lg bg-card">
        <span className="flex items-center gap-0.5 opacity-0 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 focus-within:opacity-100 has-data-popup-open:opacity-100">
          <CopyUsernameButton app={app} />
          <CopyPasswordButton app={app} />
          <OpenButton app={app} />
        </span>
        <span className="opacity-0 group-hover/tile:opacity-100 focus-within:opacity-100 has-data-popup-open:opacity-100 [@media(hover:none)]:opacity-100">
          <AppMenu app={app} />
        </span>
      </span>
      {/* The keyboard's way to move it: Space picks it up. Only shown when
          focused, so the mouse never needs it. */}
      {s.handle && (
        <button
          type="button"
          aria-label={`Move ${app.name}`}
          {...s.handle}
          className="absolute start-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-card text-ash opacity-0 outline-none focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4"
        >
          <GripVertical />
        </button>
      )}
    </li>
  )
}

export function GroupHeading({ group }: { group: AppGroup }) {
  return (
    <h2 className="flex items-center gap-2 font-label text-caption tracking-label text-ash uppercase">
      <span
        className={cn(
          "size-2 rounded-full",
          group.category ? colorOf(group.category.color).dot : "bg-mist",
        )}
      />
      {group.category?.name ?? "Uncategorized"}
      <span className="tabular-nums">{group.apps.length}</span>
    </h2>
  )
}

function Tile({ app }: { app: App }) {
  const a = useAppActions()
  return (
    <button
      type="button"
      onClick={() => a.details(app)}
      className={cn(
        "flex size-full items-center gap-3 rounded-2xl border border-border bg-card p-4 pe-11 text-start shadow-sm transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
        app.critical && "border-destructive/40",
      )}
    >
      {/* Critical sits on the logo, where the hover buttons never cover it. */}
      <span className="relative shrink-0">
        <AppLogo app={app} />
        {app.critical && (
          <span
            role="img"
            aria-label="Critical"
            title="Critical"
            className="absolute -end-1 -top-1 size-3 rounded-full bg-destructive ring-2 ring-card"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium">
          {app.name}
        </span>
        <span className="block truncate text-caption text-ash">
          {shortAddress(app.address)}
        </span>
      </span>
    </button>
  )
}

// Straight to the service, skipping the details. Only plain http(s).
function OpenButton({ app }: { app: App }) {
  const href = safeHref(app.address)
  if (!href) return null
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Open ${app.name} in a new tab`}
            nativeButton={false}
            render={
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
              />
            }
          />
        }
      >
        <ExternalLink />
      </TooltipTrigger>
      <TooltipContent>Open in a new tab</TooltipContent>
    </Tooltip>
  )
}
