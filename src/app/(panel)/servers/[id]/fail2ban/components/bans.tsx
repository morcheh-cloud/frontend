"use client"

import {
  Ban,
  ChevronRight,
  Copy,
  Search,
  ShieldCheck,
  ShieldOff,
  TriangleAlert,
} from "lucide-react"
import { useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import { BarSlot } from "../../components/bar-slots"
import {
  Empty,
  Facts,
  type Item,
  ItemMenu,
  SearchBox,
  SheetItems,
} from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useF2bActions } from "./fail2ban-actions"
import { type BanRow, banLeft, useF2bFilters } from "./meta"

// Server-local times as fail2ban prints them, without the seconds.
const when = (t?: string) => (t ? t.replace(/:\d\d$/, "") : "—")

export function BansTab({ rows }: { rows: BanRow[] }) {
  const { phone, can } = useServerPage()
  const a = useF2bActions()
  const o = a.overview
  const { filters, setFilters } = useF2bFilters()
  const needle = filters.q.trim().toLowerCase()
  const list = needle
    ? rows.filter(
        (r) => r.ip.toLowerCase().includes(needle) || r.jail.includes(needle),
      )
    : rows
  const canBan =
    o.jails.some((j) => j.active) && o.access !== "user" && can("engineer")

  const toolbar = (
    <>
      {rows.length > 0 && (
        <BarSlot slot="search">
          <SearchBox
            value={filters.q}
            onChange={(q) => setFilters({ q: q || null })}
            placeholder="Search addresses"
            label="Search banned addresses"
            className="w-full md:w-full"
          />
        </BarSlot>
      )}
      {canBan && (
        <BarSlot slot="actions">
          <Button
            variant="outline"
            size={phone ? "icon-lg" : "default"}
            className="md:h-9"
            aria-label="Ban an address"
            onClick={() => a.ban()}
          >
            <Ban />
            {!phone && "Ban an address"}
          </Button>
        </BarSlot>
      )}
    </>
  )

  let body: React.ReactNode
  if (!o.responding) {
    body = (
      <Empty
        icon={TriangleAlert}
        title="Bans can't be read"
        body={
          o.running
            ? "Fail2ban is running but doesn't answer."
            : "Fail2ban isn't running, so nothing is banned."
        }
        className="max-md:mt-4"
      />
    )
  } else if (rows.length === 0) {
    body = (
      <Empty
        icon={ShieldCheck}
        title="Nobody is banned"
        body="Addresses show up here once a jail bans them, with when the ban ends."
        className="max-md:mt-4"
      />
    )
  } else if (list.length === 0) {
    body = (
      <Empty
        icon={Search}
        title="No matching addresses"
        body="Try another search."
        className="max-md:mt-4"
      />
    )
  } else {
    body = phone ? <BansList rows={list} /> : <BansTable rows={list} />
  }

  return (
    <>
      {toolbar}
      {body}
    </>
  )
}

function useBanMenu(r: BanRow, all: BanRow[]): Item[][] {
  const a = useF2bActions()
  const { can } = useServerPage()
  const elsewhere = all.filter((x) => x.ip === r.ip).length > 1
  const copy = {
    key: "copy",
    label: "Copy address",
    icon: <Copy />,
    onSelect: () => a.copy(r.ip, "Address"),
  }
  if (!can("engineer")) return [[copy]]
  return [
    [
      {
        key: "unban",
        label: `Unban from ${r.jail}`,
        icon: <ShieldOff />,
        onSelect: () => a.unban(r.ip, r.jail),
      },
      ...(elsewhere
        ? [
            {
              key: "unban-all",
              label: "Unban from every jail",
              icon: <ShieldOff />,
              onSelect: () => a.unban(r.ip),
            },
          ]
        : []),
    ],
    [copy],
  ]
}

// ---- Desktop ----

function BansTable({ rows }: { rows: BanRow[] }) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border">
      <table className="w-full table-fixed text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr className="h-10">
            <th className="ps-4 text-start font-medium">Address</th>
            <th className="w-40 px-3 text-start font-medium">Jail</th>
            <th className="hidden w-40 px-3 text-start font-medium @2xl:table-cell">
              Since
            </th>
            <th className="hidden w-40 px-3 text-start font-medium @xl:table-cell">
              Ends
            </th>
            <th className="w-28 px-3 text-start font-medium">Length</th>
            <th className="w-36 pe-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <BanTableRow key={r.key} row={r} all={rows} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BanTableRow({ row: r, all }: { row: BanRow; all: BanRow[] }) {
  const a = useF2bActions()
  const { can } = useServerPage()
  const menu = useBanMenu(r, all)
  return (
    <tr className="h-14 hover:bg-subtle">
      <td className="max-w-0 truncate ps-4 font-mono">{r.ip}</td>
      <td className="max-w-0 truncate px-3">{r.jail}</td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground tabular-nums @2xl:table-cell">
        {when(r.since)}
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground tabular-nums @xl:table-cell">
        {r.seconds === -1 ? "Never" : when(r.until)}
      </td>
      <td className="px-3 whitespace-nowrap text-muted-foreground">
        {banLeft(r)}
      </td>
      <td className="pe-3">
        <span className="flex items-center justify-end gap-1">
          {can("engineer") && (
            <Button
              variant="ghost"
              size="sm"
              disabled={a.overview.access === "user"}
              onClick={() => a.unban(r.ip, r.jail)}
            >
              Unban
            </Button>
          )}
          <ItemMenu groups={menu} label={`Actions for ${r.ip}`} />
        </span>
      </td>
    </tr>
  )
}

// ---- Phone ----

function BansList({ rows }: { rows: BanRow[] }) {
  const [open, setOpen] = useOpen("f2b-ban-sheet")
  const [current, setCurrent] = useState<BanRow | null>(null)

  return (
    <>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              onClick={() => {
                setCurrent(r)
                setOpen(true)
              }}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Ban className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-body">
                  {r.ip}
                </span>
                <span className="block truncate text-body-sm text-muted-foreground">
                  {r.jail}
                  <span className="text-ash">
                    {" "}
                    · {r.seconds === -1 ? "forever" : `until ${when(r.until)}`}
                  </span>
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ash" />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <BanSheet row={current} all={rows} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

function BanSheet({
  row: r,
  all,
  open,
  onOpenChange,
}: {
  row: BanRow
  all: BanRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useBanMenu(r, all)
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={r.ip}
      header={
        <div className="px-6 pt-1 pb-3">
          <p className="truncate font-mono text-subheading">{r.ip}</p>
          <p className="text-body-sm text-muted-foreground">
            Banned in {r.jail}
          </p>
        </div>
      }
    >
      <Facts
        items={[
          { label: "Since", value: when(r.since) },
          {
            label: "Ends",
            value: r.seconds === -1 ? "Never" : when(r.until),
          },
          { label: "Length", value: banLeft(r) },
          { label: "Jail", value: r.jail },
        ]}
      />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}
