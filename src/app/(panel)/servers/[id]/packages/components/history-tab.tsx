"use client"

import {
  ChevronDown,
  CircleAlert,
  History,
  LoaderCircle,
  Search,
  TriangleAlert,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { PackageChange, PackageHistoryEntry } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { fullTime } from "../../users/components/meta"
import { usePackageHistory } from "../api"
import { changeMeta, usePackageFilters } from "./meta"
import { usePackagesActions } from "./packages-actions"

// What the package manager did on this server, from its own log: installs,
// upgrades and removals, whoever made them (Morche, a person over SSH,
// automatic updates).
export function HistoryTab() {
  const { server, phone } = useServerPage()
  const a = usePackagesActions()
  const supported = a.overview.capabilities.history
  const query = usePackageHistory(server.id, supported)
  const { filters } = usePackageFilters()

  if (!supported) {
    return (
      <Empty
        icon={History}
        title="No history on this server"
        body="This package manager keeps no log of past changes that Morche can read."
        className="max-md:mt-4"
      />
    )
  }
  if (query.isPending) {
    return (
      <p className="flex items-center gap-2 py-10 text-body-sm text-muted-foreground max-md:px-4">
        <LoaderCircle className="size-4 animate-spin" />
        Reading the package log…
      </p>
    )
  }
  if (query.error) {
    return (
      <Empty
        icon={TriangleAlert}
        title="Couldn't read the history"
        body={query.error.message}
        className="max-md:mt-4"
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  const t = filters.q.trim().toLowerCase()
  const entries = query.data.entries.filter(
    (e) =>
      !t ||
      e.changes.some((c) => c.name.toLowerCase().includes(t)) ||
      (e.command?.toLowerCase().includes(t) ?? false),
  )
  if (entries.length === 0) {
    return (
      <Empty
        icon={t ? Search : History}
        title={t ? "No matching changes" : "Nothing recorded yet"}
        body={
          t
            ? "Search looks at package names and the commands that ran."
            : "Changes appear here once packages are installed, upgraded or removed."
        }
        className="max-md:mt-4"
      />
    )
  }

  const days = groupByDay(entries)
  return (
    <div className={cn("flex flex-col gap-6", phone && "mt-4 gap-4")}>
      {days.map((d) => (
        <section key={d.key}>
          <h3
            className={cn(
              "mb-2 font-label text-caption tracking-label text-ash uppercase",
              phone && "px-4",
            )}
          >
            {d.label}
          </h3>
          <ol
            className={cn(
              "divide-y divide-border border-border [contain:inline-size]",
              phone ? "border-y" : "rounded-2xl border",
            )}
          >
            {d.entries.map((e) => (
              <Entry key={`${e.at}-${e.command}`} entry={e} q={t} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function Entry({ entry: e, q }: { entry: PackageHistoryEntry; q: string }) {
  const [open, setOpen] = useState(false)
  const counts = new Map<PackageChange["action"], number>()
  for (const c of e.changes)
    counts.set(c.action, (counts.get(c.action) ?? 0) + 1)
  const summary = [...counts.entries()]
    .map(([action, n]) => `${changeMeta[action].verb} ${n}`)
    .join(" · ")
  const names = e.changes.map((c) => c.name)
  const failed = !!e.error
  const time = new Date(e.at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-16 w-full items-start gap-3 px-4 py-3 text-start outline-none hover:bg-subtle focus-visible:bg-subtle active:bg-muted"
      >
        <span
          className="w-16 shrink-0 pt-0.5 text-caption whitespace-nowrap text-muted-foreground tabular-nums"
          title={fullTime(e.at)}
        >
          {time}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-body-sm font-medium">
            {failed && (
              <CircleAlert className="size-4 shrink-0 text-destructive" />
            )}
            {summary || "No packages changed"}
            {e.partial && (
              <span className="text-caption font-normal text-ash">
                (log cut short)
              </span>
            )}
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {names.slice(0, 8).join(", ")}
            {names.length > 8 && ` and ${names.length - 8} more`}
          </span>
          {(e.command || e.user) && (
            <span className="mt-0.5 block truncate font-mono text-caption text-ash">
              {[e.user, e.command].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-ash transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 md:ps-23">
          {e.error && (
            <p className="mb-2 rounded-xl bg-destructive/5 p-3 font-mono text-caption break-words text-destructive">
              {e.error}
            </p>
          )}
          <ul className="divide-y divide-border rounded-xl border border-border text-body-sm">
            {e.changes.map((c) => (
              <li
                key={`${c.action}-${c.name}`}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2",
                  q && c.name.toLowerCase().includes(q) && "bg-brand-soft/40",
                )}
              >
                <span
                  className={cn(
                    "w-24 shrink-0 text-caption",
                    changeMeta[c.action].tone === "danger"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {changeMeta[c.action].verb}
                </span>
                <span className="min-w-0 truncate font-medium">{c.name}</span>
                <span className="ms-auto truncate font-mono text-caption text-muted-foreground">
                  {[c.from, c.to].filter(Boolean).join(" → ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

function groupByDay(entries: PackageHistoryEntry[]) {
  const out: { key: string; label: string; entries: PackageHistoryEntry[] }[] =
    []
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86_400_000).toDateString()
  for (const e of entries) {
    const d = new Date(e.at)
    const key = d.toDateString()
    let group = out.at(-1)
    if (group?.key !== key) {
      group = {
        key,
        label:
          key === today
            ? "Today"
            : key === yesterday
              ? "Yesterday"
              : d.toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year:
                    d.getFullYear() === new Date().getFullYear()
                      ? undefined
                      : "numeric",
                }),
        entries: [],
      }
      out.push(group)
    }
    group.entries.push(e)
  }
  return out
}
