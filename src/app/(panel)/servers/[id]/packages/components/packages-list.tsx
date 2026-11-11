"use client"

import {
  ArrowRight,
  ArrowUpCircle,
  ChevronRight,
  CircleCheck,
  Lock,
  LockOpen,
  Package,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { formatSize } from "@/lib/format"
import type { InstalledPackage } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, ItemMenu } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { ago, fullTime } from "../../users/components/meta"
import {
  installedList,
  shortVersion,
  showHints,
  showLabels,
  updateList,
  usePackageFilters,
} from "./meta"
import { Tag } from "./package-details"
import { usePackageMenu, usePackagesActions } from "./packages-actions"

const PAGE = 100

// ---- Installed ----

export function InstalledTab() {
  const { phone } = useServerPage()
  const a = usePackagesActions()
  const { filters, setFilters } = usePackageFilters()
  const list = installedList(a.overview, filters.show, filters.q, filters.sort)

  if (list.length === 0) {
    return (
      <Empty
        icon={Search}
        title={
          filters.q
            ? "No matching packages"
            : `Nothing under ${showLabels[filters.show]}`
        }
        body={
          filters.q
            ? "Only installed packages are listed here. To find new ones, use Install package."
            : showHints[filters.show]
        }
        className="max-md:mt-4"
        action={
          filters.show !== "all" || filters.q ? (
            <Button
              variant="outline"
              onClick={() => setFilters({ show: null, q: null })}
            >
              Show every package
            </Button>
          ) : undefined
        }
      />
    )
  }
  return phone ? (
    <PhoneList list={list} />
  ) : (
    <Table list={list} mode="installed" />
  )
}

// ---- Updates ----

export function UpdatesTab() {
  const { phone } = useServerPage()
  const a = usePackagesActions()
  const { filters, setFilters } = usePackageFilters()
  const list = updateList(a.overview, filters.kind, filters.q)

  if (list.length === 0) {
    if (filters.q || filters.kind !== "all") {
      return (
        <Empty
          icon={Search}
          title="No matching updates"
          body="Try another search, or show every update."
          className="max-md:mt-4"
          action={
            <Button
              variant="outline"
              onClick={() => setFilters({ kind: null, q: null })}
            >
              Show every update
            </Button>
          }
        />
      )
    }
    return (
      <Empty
        icon={CircleCheck}
        title="Everything is up to date"
        body={
          a.overview.refreshed_at
            ? `Compared with the package lists from ${ago(a.overview.refreshed_at)}. Check for updates to download fresh lists.`
            : "Check for updates to download fresh package lists first."
        }
        className="max-md:mt-4"
        action={
          a.canRefresh ? (
            <Button
              variant="outline"
              disabled={a.locked || a.refreshing}
              onClick={a.refreshLists}
            >
              Check for updates
            </Button>
          ) : undefined
        }
      />
    )
  }
  return phone ? (
    <PhoneList list={list} updates />
  ) : (
    <Table list={list} mode="updates" />
  )
}

// ---- Desktop ----

function Table({
  list,
  mode,
}: {
  list: InstalledPackage[]
  mode: "installed" | "updates"
}) {
  const a = usePackagesActions()
  const [shown, setShown] = useState(PAGE)
  const [selected, setSelected] = useState<string[]>([])
  const names = new Set(list.map((p) => p.name))
  // Selection never holds a row the filters hide.
  const picked = selected.filter((n) => names.has(n))
  const rows = list.slice(0, shown)
  const all = rows.length > 0 && rows.every((p) => picked.includes(p.name))
  const some = !all && rows.some((p) => picked.includes(p.name))
  const selectable = a.canChange

  function toggle(name: string, on: boolean) {
    setSelected((s) => (on ? [...s, name] : s.filter((n) => n !== name)))
  }

  return (
    <>
      <div className="@container overflow-hidden rounded-2xl border border-border">
        <table className="w-full table-fixed text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr className="h-10">
              {selectable && (
                <th className="w-11 ps-4">
                  <Checkbox
                    aria-label="Select all shown"
                    checked={all}
                    indeterminate={some}
                    onCheckedChange={(on) =>
                      setSelected(on ? rows.map((p) => p.name) : [])
                    }
                  />
                </th>
              )}
              <th
                className={cn("text-start font-medium", !selectable && "ps-4")}
              >
                Package
              </th>
              {mode === "installed" ? (
                <>
                  <th className="w-48 px-3 text-start font-medium">Version</th>
                  <th className="hidden w-24 px-3 text-end font-medium @2xl:table-cell">
                    Size
                  </th>
                  <th className="hidden w-32 px-3 text-start font-medium @4xl:table-cell">
                    Changed
                  </th>
                  <th className="hidden w-40 px-3 text-start font-medium @3xl:table-cell" />
                </>
              ) : (
                <>
                  <th className="w-[40%] px-3 text-start font-medium">
                    Version
                  </th>
                  <th className="hidden w-48 px-3 text-start font-medium @4xl:table-cell">
                    From
                  </th>
                  <th className="hidden w-28 px-3 @2xl:table-cell" />
                </>
              )}
              <th className="w-12 pe-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => (
              <Row
                key={p.name}
                pkg={p}
                mode={mode}
                selectable={selectable}
                selected={picked.includes(p.name)}
                onSelect={(on) => toggle(p.name, on)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {list.length > shown && (
        <div className="flex items-center justify-center gap-3 text-caption text-muted-foreground">
          {`Showing ${shown} of ${list.length}`}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShown((n) => n + PAGE * 5)}
          >
            Show more
          </Button>
        </div>
      )}
      {picked.length > 0 && (
        <BulkBar names={picked} list={list} onClear={() => setSelected([])} />
      )}
    </>
  )
}

function Row({
  pkg: p,
  mode,
  selectable,
  selected,
  onSelect,
}: {
  pkg: InstalledPackage
  mode: "installed" | "updates"
  selectable: boolean
  selected: boolean
  onSelect: (on: boolean) => void
}) {
  const a = usePackagesActions()
  const menu = usePackageMenu(p)
  const leftover = p.state === "config-files"
  return (
    <tr className={cn("h-14 hover:bg-subtle", selected && "bg-brand-soft/40")}>
      {selectable && (
        <td className="ps-4">
          <Checkbox
            aria-label={`Select ${p.name}`}
            checked={selected}
            onCheckedChange={(on) => onSelect(!!on)}
          />
        </td>
      )}
      <td className={cn("max-w-0", !selectable && "ps-4")}>
        <button
          type="button"
          onClick={() => a.details(p.name)}
          className="block w-full min-w-0 text-start outline-none focus-visible:underline"
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "truncate font-medium",
                leftover && "text-muted-foreground",
              )}
            >
              {p.name}
            </span>
            {mode === "updates" && p.security && (
              <Tag tone="warn">Security</Tag>
            )}
          </span>
          {p.summary && (
            <span className="block truncate text-caption text-ash">
              {p.summary}
            </span>
          )}
        </button>
      </td>
      {mode === "installed" ? (
        <>
          <td className="px-3">
            <span
              className="block truncate font-mono text-caption"
              title={p.version}
            >
              {leftover ? (
                <span className="font-sans text-ash">Settings only</span>
              ) : (
                shortVersion(p.version)
              )}
            </span>
          </td>
          <td className="hidden px-3 text-end text-muted-foreground tabular-nums @2xl:table-cell">
            {p.size > 0 ? formatSize(p.size) : "—"}
          </td>
          <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
            {p.changed_at ? (
              <span title={fullTime(p.changed_at)}>{ago(p.changed_at)}</span>
            ) : (
              <span className="text-ash">—</span>
            )}
          </td>
          <td className="hidden px-3 @3xl:table-cell">
            <Tags pkg={p} />
          </td>
        </>
      ) : (
        <>
          <td className="px-3">
            <span
              className="flex min-w-0 items-center gap-1.5 font-mono text-caption"
              title={`${p.version} → ${p.latest}`}
            >
              <span className="truncate text-muted-foreground">
                {shortVersion(p.version, 22)}
              </span>
              <ArrowRight className="size-3 shrink-0 text-ash" />
              <span className="truncate">{shortVersion(p.latest, 22)}</span>
            </span>
          </td>
          <td className="hidden truncate px-3 text-caption text-muted-foreground @4xl:table-cell">
            {p.repo || "—"}
          </td>
          <td className="hidden px-3 text-end @2xl:table-cell">
            {p.held ? (
              <Tag>Held</Tag>
            ) : (
              a.canChange && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={a.locked}
                  onClick={() =>
                    a.review({ action: "upgrade", names: [p.name] })
                  }
                >
                  Upgrade
                </Button>
              )
            )}
          </td>
        </>
      )}
      <td className="pe-3">
        <ItemMenu groups={menu} label={`Actions for ${p.name}`} />
      </td>
    </tr>
  )
}

function Tags({ pkg: p }: { pkg: InstalledPackage }) {
  const tags: ReactNode[] = []
  if (p.state === "broken")
    tags.push(
      <Tag key="b" tone="warn">
        Broken
      </Tag>,
    )
  if (p.held) tags.push(<Tag key="h">Held</Tag>)
  if (p.latest) {
    tags.push(
      <Tag key="u" tone={p.security ? "warn" : "brand"}>
        {p.security ? "Security update" : "Update"}
      </Tag>,
    )
  }
  if (p.removable) tags.push(<Tag key="r">Not needed</Tag>)
  if (!tags.length) return null
  return <span className="flex flex-wrap justify-start gap-1">{tags}</span>
}

// Changes to the selected packages, in one go.
function BulkBar({
  names,
  list,
  onClear,
}: {
  names: string[]
  list: InstalledPackage[]
  onClear: () => void
}) {
  const a = usePackagesActions()
  const caps = a.overview.capabilities
  const chosen = list.filter((p) => names.includes(p.name))
  const upgradable = chosen.filter((p) => p.latest && !p.held)
  const held = chosen.filter((p) => p.held)
  const free = chosen.filter((p) => !p.held && p.state === "installed")
  const off = a.locked
  return (
    <div
      role="toolbar"
      aria-label="Selected packages"
      className="sticky bottom-6 z-30 mx-auto mt-3 flex w-fit items-center gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-md"
    >
      <span className="px-3 text-body-sm font-medium whitespace-nowrap">
        {names.length} selected
      </span>
      {upgradable.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          disabled={off}
          onClick={() =>
            a.review({
              action: "upgrade",
              names: upgradable.map((p) => p.name),
            })
          }
        >
          <ArrowUpCircle />
          Upgrade {upgradable.length}
        </Button>
      )}
      {caps.hold && free.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          disabled={a.marking}
          onClick={() =>
            a.mark(
              free.map((p) => p.name),
              "hold",
              onClear,
            )
          }
        >
          <Lock />
          Hold
        </Button>
      )}
      {caps.hold && held.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          disabled={a.marking}
          onClick={() =>
            a.mark(
              held.map((p) => p.name),
              "unhold",
              onClear,
            )
          }
        >
          <LockOpen />
          Unhold
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={off}
        onClick={() =>
          a.review({
            action: chosen.every((p) => p.state === "config-files")
              ? "purge"
              : "remove",
            names,
          })
        }
      >
        <Trash2 />
        Remove
      </Button>
      <span className="mx-1 h-5 w-px bg-border" />
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

// ---- Phone ----

function PhoneList({
  list,
  updates,
}: {
  list: InstalledPackage[]
  updates?: boolean
}) {
  const a = usePackagesActions()
  const [shown, setShown] = useState(PAGE)
  return (
    <>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {list.slice(0, shown).map((p) => {
          const leftover = p.state === "config-files"
          return (
            <li key={p.name}>
              <button
                type="button"
                onClick={() => a.details(p.name)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg",
                    p.security && updates
                      ? "bg-warning/10 text-warning"
                      : p.latest && updates
                        ? "bg-brand-soft text-brand-strong"
                        : "bg-muted text-ash",
                  )}
                >
                  {p.security && updates ? (
                    <ShieldAlert className="size-5" />
                  ) : p.latest && updates ? (
                    <ArrowUpCircle className="size-5" />
                  ) : p.held ? (
                    <Lock className="size-5" />
                  ) : (
                    <Package className="size-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-body font-medium",
                      leftover && "text-muted-foreground",
                    )}
                  >
                    {p.name}
                  </span>
                  <span className="block truncate font-mono text-caption text-muted-foreground">
                    {leftover
                      ? "Settings only"
                      : updates
                        ? `${shortVersion(p.version, 18)} → ${shortVersion(p.latest, 18)}`
                        : shortVersion(p.version, 32)}
                  </span>
                </span>
                {!updates && p.latest && (
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      p.security ? "bg-warning" : "bg-brand",
                    )}
                    role="img"
                    aria-label={p.security ? "Security update" : "Update"}
                  />
                )}
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </button>
            </li>
          )
        })}
      </ul>
      {list.length > shown && (
        <div className="px-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setShown((n) => n + PAGE * 5)}
          >
            {`Show more (${list.length - shown} left)`}
          </Button>
        </div>
      )}
    </>
  )
}
