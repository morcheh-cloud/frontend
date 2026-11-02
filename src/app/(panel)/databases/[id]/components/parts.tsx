"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { CircleAlert, Info } from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"

import { Button } from "@/components/ui/button"
import type {
  Database,
  DatabaseLive,
  DatabaseNote,
  DatabaseSnapshot,
} from "@/lib/services"
import { cn } from "@/lib/utils"

type Dashboard = {
  database: Database
  phone: boolean
  live: UseQueryResult<DatabaseLive>
  // The latest look that got in; kept while a later one fails.
  snapshot?: DatabaseSnapshot
  operator: boolean
  engineer: boolean
  owner: boolean
}

const DashboardContext = createContext<Dashboard | null>(null)

export function DashboardProvider({
  value,
  children,
}: {
  value: Dashboard
  children: ReactNode
}) {
  return <DashboardContext value={value}>{children}</DashboardContext>
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboard outside DashboardProvider")
  return ctx
}

// A titled block. Desktop: a bordered card. Phone: a grouped list section
// (label above, edge-to-edge rows), like a native settings screen.
export function Panel({
  title,
  caption,
  actions,
  flush = false,
  className,
  children,
}: {
  title: string
  caption?: ReactNode
  actions?: ReactNode
  // Content brings its own padding (tables, lists).
  flush?: boolean
  className?: string
  children: ReactNode
}) {
  const { phone } = useDashboard()
  if (phone) {
    return (
      <section className={cn("mt-6", className)}>
        <div className="flex min-h-6 items-center gap-2 px-4 pb-2">
          <h2 className="font-label text-caption tracking-label text-ash uppercase">
            {title}
          </h2>
          {caption && (
            <span className="ms-auto truncate text-caption text-ash">
              {caption}
            </span>
          )}
          {actions && (
            <div className={cn("flex items-center", !caption && "ms-auto")}>
              {actions}
            </div>
          )}
        </div>
        <div className={cn("border-y border-border", !flush && "px-4 py-3")}>
          {children}
        </div>
      </section>
    )
  }
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border",
        className,
      )}
    >
      <div className="flex min-h-12 items-center gap-3 border-b border-border px-5 py-2">
        <h2 className="text-body-sm font-medium">{title}</h2>
        {caption && (
          <span className="min-w-0 truncate text-caption text-ash">
            {caption}
          </span>
        )}
        {actions && (
          <div className="ms-auto flex shrink-0 items-center gap-1">
            {actions}
          </div>
        )}
      </div>
      <div className={cn("min-w-0 flex-1", !flush && "p-5")}>{children}</div>
    </section>
  )
}

export type Col<T> = {
  key: string
  label: string
  cell: (row: T) => ReactNode
  end?: boolean
  // Literal Tailwind classes for both th and td (e.g. hiding on narrow).
  className?: string
}

export type PhoneRow = {
  title: ReactNode
  sub?: ReactNode
  end?: ReactNode
}

// One list, two shapes: a table on desktop, rows on phones (tap opens).
// Long lists show the first `limit` with a "Show all" under them.
export function Rows<T>({
  rows,
  cols,
  rowKey,
  phone: phoneRow,
  onOpen,
  empty,
  limit = 50,
  label,
}: {
  rows: T[]
  cols: Col<T>[]
  rowKey: (row: T) => string
  phone: (row: T) => PhoneRow
  onOpen?: (row: T) => void
  empty: ReactNode
  limit?: number
  label: string
}) {
  const { phone } = useDashboard()
  const [all, setAll] = useState(false)
  if (rows.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-body-sm text-muted-foreground">
        {empty}
      </p>
    )
  }
  const shown = all ? rows : rows.slice(0, limit)
  const more = rows.length - shown.length > 0 && (
    <div className="border-t border-border px-4 py-2 text-center">
      <Button
        variant="ghost"
        size="sm"
        className="max-md:h-11"
        onClick={() => setAll(true)}
      >
        Show all {rows.length}
      </Button>
    </div>
  )

  if (phone) {
    return (
      <>
        <ul aria-label={label} className="divide-y divide-border">
          {shown.map((row) => {
            const r = phoneRow(row)
            const inner = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body">{r.title}</span>
                  {r.sub && (
                    <span className="block truncate text-body-sm text-muted-foreground">
                      {r.sub}
                    </span>
                  )}
                </span>
                {r.end != null && (
                  <span className="shrink-0 text-body-sm text-muted-foreground tabular-nums">
                    {r.end}
                  </span>
                )}
              </>
            )
            const cls =
              "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start"
            return (
              <li key={rowKey(row)}>
                {onOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(row)}
                    className={cn(cls, "outline-none active:bg-muted")}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
        {more}
      </>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table aria-label={label} className="w-full text-body-sm">
          <thead className="text-caption text-muted-foreground">
            <tr className="border-b border-border">
              {cols.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "h-9 px-4 font-medium whitespace-nowrap first:ps-5 last:pe-5",
                    c.end ? "text-end" : "text-start",
                    c.className,
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((row) => (
              <tr key={rowKey(row)} className="h-11 hover:bg-subtle">
                {cols.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-2 first:ps-5 last:pe-5",
                      c.end && "text-end whitespace-nowrap tabular-nums",
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {more}
    </>
  )
}

export type Stat = {
  key: string
  label: string
  value: ReactNode
  sub?: ReactNode
  // Says it in words too; color only backs it up.
  tone?: "warning" | "critical"
}

// The headline numbers. Desktop: tiles. Phone: label/value rows.
export function Stats({ items }: { items: Stat[] }) {
  const { phone } = useDashboard()
  if (items.length === 0) return null
  if (phone) {
    return (
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {items.map((s) => (
          <li key={s.key} className="px-4 py-2.5">
            <div className="flex min-h-6 items-center justify-between gap-4 text-body">
              <span className="min-w-0 truncate text-muted-foreground">
                {s.label}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  s.tone === "critical" && "text-destructive",
                  s.tone === "warning" && "text-warning",
                )}
              >
                {s.value}
              </span>
            </div>
            {s.sub && (
              <div className="mt-0.5 text-caption text-muted-foreground tabular-nums">
                {s.sub}
              </div>
            )}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-3 @6xl:grid-cols-6">
      {items.map((s) => (
        <div
          key={s.key}
          className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5"
        >
          <p className="truncate text-body-sm text-muted-foreground">
            {s.label}
          </p>
          <div
            className={cn(
              "mt-1 truncate text-heading font-light tabular-nums",
              s.tone === "critical" && "text-destructive",
              s.tone === "warning" && "text-warning",
            )}
          >
            {s.value}
          </div>
          {s.sub && (
            <div className="mt-auto truncate pt-2 text-caption text-muted-foreground tabular-nums">
              {s.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Label/value lines inside a panel.
export function Pairs({
  items,
}: {
  items: { label: string; value: ReactNode; mono?: boolean }[]
}) {
  const { phone } = useDashboard()
  const shown = items.filter((i) => i.value != null && i.value !== "")
  if (shown.length === 0) return null
  return (
    <dl
      className={cn(
        "text-body-sm",
        phone ? "-my-3 divide-y divide-border" : "flex flex-col gap-2.5",
      )}
    >
      {shown.map((i) => (
        <div
          key={i.label}
          className={cn(
            "flex items-baseline justify-between gap-4",
            phone && "min-h-12 items-center py-2.5 text-body",
          )}
        >
          <dt className="shrink-0 text-muted-foreground">{i.label}</dt>
          <dd
            className={cn(
              "min-w-0 text-end break-words",
              i.mono && "font-mono text-caption break-all",
            )}
          >
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// What the login couldn't read for this part, from the snapshot's notes.
export function NotesFor({
  notes,
  areas,
  className,
}: {
  notes: DatabaseNote[] | undefined
  areas: string[]
  className?: string
}) {
  const shown = (notes ?? []).filter((n) => areas.includes(n.area))
  if (shown.length === 0) return null
  return (
    <ul
      className={cn(
        "flex flex-col gap-2 text-body-sm max-md:gap-0 max-md:divide-y max-md:divide-border max-md:border-y max-md:border-border",
        className,
      )}
    >
      {shown.map((n) => (
        <li
          key={`${n.area}:${n.message}`}
          className="flex gap-3 p-4 md:items-center md:rounded-2xl md:border md:border-border md:bg-subtle md:px-5 md:py-3"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-ash md:mt-0" />
          <span className="text-muted-foreground">{n.message}</span>
        </li>
      ))}
    </ul>
  )
}

// A tab that needs the live look when there isn't one.
export function NoSnapshot() {
  const { live, database } = useDashboard()
  if (database.paused) {
    return (
      <Blank
        title="Monitoring is paused"
        body="Resume it to see what the database is doing."
      />
    )
  }
  if (live.isPending) {
    return (
      <div className="flex flex-col gap-3 max-md:px-4 max-md:pt-4">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }
  return (
    <Blank
      title="Couldn't read the database just now"
      body={
        live.data?.message ||
        live.error?.message ||
        "The last attempt didn't get in."
      }
      action={
        <Button variant="outline" onClick={() => live.refetch()}>
          Try again
        </Button>
      }
    />
  )
}

export function Blank({
  title,
  body,
  action,
}: {
  title: string
  body: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center md:rounded-2xl md:border md:border-border">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CircleAlert className="size-5" />
      </span>
      <h3 className="mt-4 text-body font-medium">{title}</h3>
      <div className="mt-1 max-w-md text-body-sm text-muted-foreground">
        {body}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Small inline tag: "New", "Admin", "Never used".
export function Tag({
  children,
  tone,
}: {
  children: ReactNode
  tone?: "warning" | "brand"
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-caption font-medium",
        tone === "warning"
          ? "bg-warning/10 text-warning"
          : tone === "brand"
            ? "bg-brand-soft text-brand-strong"
            : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}
