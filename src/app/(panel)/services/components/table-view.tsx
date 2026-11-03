"use client"

import { ExternalLink, GripVertical } from "lucide-react"
import type { ReactNode } from "react"

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
import { CopyUsernameButton, PasswordCell } from "./secret"

// The same services as the old spreadsheet: one row each, grouped by
// category.
export function TableView({ groups }: { groups: AppGroup[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Service</Th>
            <Th>Address</Th>
            <Th>Username</Th>
            <Th>Password</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        {groups.map((g) => (
          <RowGroup key={g.category?.id ?? "none"} group={g} />
        ))}
      </table>
    </div>
  )
}

function RowGroup({ group }: { group: AppGroup }) {
  const drop = useGroupDrop(group)
  const dragging = useDraggingApp()
  return (
    <SortableApps group={group}>
      <tbody ref={drop.ref} className="divide-y divide-border border-t">
        <tr className="bg-subtle">
          <th
            scope="colgroup"
            colSpan={5}
            className="h-9 px-3 text-start font-label text-caption font-normal tracking-label text-ash uppercase"
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  group.category
                    ? colorOf(group.category.color).dot
                    : "bg-mist",
                )}
              />
              {group.category?.name ?? "Uncategorized"}
              <span className="tabular-nums">{group.apps.length}</span>
            </span>
          </th>
        </tr>
        {group.apps.map((app) => (
          <Row key={app.id} app={app} />
        ))}
        {group.apps.length === 0 && (
          <tr>
            <td
              colSpan={5}
              className={cn(
                "h-14 text-center text-body-sm text-ash",
                drop.over && "bg-brand-soft/50 text-brand-strong",
              )}
            >
              {dragging ? "Drop here" : "Drag services here"}
            </td>
          </tr>
        )}
      </tbody>
    </SortableApps>
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

function Row({ app }: { app: App }) {
  const href = safeHref(app.address)
  const a = useAppActions()
  const [first, ...rest] = app.accounts
  const s = useSortableApp(app)

  return (
    <tr
      ref={s.ref}
      style={s.style}
      className={cn(
        "group/row relative h-14 bg-card hover:bg-subtle",
        s.dragging && "opacity-40",
      )}
    >
      <td className="max-w-72 px-3">
        <span className="flex items-center gap-3">
          {s.handle && (
            // Mouse, touch and keys all start here.
            <button
              type="button"
              aria-label={`Move ${app.name}`}
              {...s.handle}
              {...s.pointer}
              className="-mx-2 flex size-6 shrink-0 cursor-grab touch-manipulation items-center justify-center rounded-md text-ash opacity-0 outline-none group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4"
            >
              <GripVertical />
            </button>
          )}
          <AppLogo app={app} size={28} />
          <button
            type="button"
            onClick={() => a.details(app)}
            className="truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {app.name}
          </button>
          {app.critical && (
            <span
              role="img"
              aria-label="Critical"
              title="Critical"
              className="size-1.5 shrink-0 rounded-full bg-destructive"
            />
          )}
        </span>
      </td>
      <td className="max-w-80 px-3">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-brand-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="truncate">{shortAddress(app.address)}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          <span className="block truncate text-muted-foreground">
            {app.address}
          </span>
        )}
      </td>
      <td className="max-w-56 px-3">
        {first && (
          <span className="flex items-center gap-2">
            <span className="truncate font-mono text-caption">
              {first.username}
            </span>
            <CopyUsernameButton app={app} account={first} />
            {rest.length > 0 && (
              <span
                title={`${app.accounts.length} accounts`}
                className="shrink-0 rounded-full bg-muted px-1.5 text-caption text-muted-foreground tabular-nums"
              >
                +{rest.length}
              </span>
            )}
          </span>
        )}
      </td>
      <td className="w-56 px-3">
        {first && <PasswordCell app={app} account={first} />}
      </td>
      <td className="pe-3 text-end">
        <AppMenu app={app} />
      </td>
    </tr>
  )
}
