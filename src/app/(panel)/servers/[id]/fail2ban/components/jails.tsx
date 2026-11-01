"use client"

import {
  Ban,
  ChevronRight,
  FileCode,
  FlaskConical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldBan,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import type { Fail2BanJail } from "@/lib/services"
import { cn } from "@/lib/utils"
import { BarSlot } from "../../components/bar-slots"
import {
  Empty,
  Facts,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
  SheetItems,
  StateDot,
} from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useF2bActions } from "./fail2ban-actions"
import {
  duration,
  effective,
  filterJails,
  filterName,
  inLocal,
  jailState,
  listValue,
  resolve,
  stateMeta,
  useF2bFilters,
} from "./meta"

const tone = { active: "success", failed: "warning", off: "muted" } as const

export function JailsTab() {
  const { phone } = useServerPage()
  const a = useF2bActions()
  const { filters, setFilters } = useF2bFilters()
  const show = filters.show ?? "enabled"
  const list = filterJails(a.overview.jails, show, filters.q)

  const toolbar = (
    <>
      <BarSlot slot="search">
        <SearchBox
          value={filters.q}
          onChange={(q) => setFilters({ q: q || null })}
          placeholder="Search jails"
          label="Search jails"
          className="w-full md:w-full"
        />
      </BarSlot>
      <BarSlot slot="filters">
        <Segmented
          label="Jails to show"
          items={[
            { value: "enabled", label: "Turned on" },
            { value: "all", label: `All · ${a.overview.jails.length}` },
          ]}
          value={show}
          onChange={(v) => setFilters({ show: v === "enabled" ? null : v })}
        />
      </BarSlot>
      <BarSlot slot="actions">
        <Button
          size={phone ? "icon-lg" : "default"}
          className="md:h-9"
          aria-label="Add jail"
          disabled={a.overview.access === "user"}
          onClick={() => a.editJail(null)}
        >
          <Plus />
          {!phone && "Add jail"}
        </Button>
      </BarSlot>
    </>
  )

  let body: React.ReactNode
  if (list.length === 0) {
    body =
      filters.q || show === "all" ? (
        <Empty
          icon={Search}
          title="No matching jails"
          body="Try another search."
          className="max-md:mt-4"
        />
      ) : (
        <Empty
          icon={ShieldBan}
          title="No jail is turned on"
          body="A jail watches one service's log, like sshd or nginx. Turn one on to start banning."
          className="max-md:mt-4"
          action={
            <Button
              variant="outline"
              onClick={() => setFilters({ show: "all" })}
            >
              Show all jails
            </Button>
          }
        />
      )
  } else {
    body = phone ? <JailsList jails={list} /> : <JailsTable jails={list} />
  }

  return (
    <>
      {toolbar}
      {body}
    </>
  )
}

// What can be done with a jail, for its ⋯ menu and its phone sheet.
function useJailMenu(j: Fail2BanJail): Item[][] {
  const a = useF2bActions()
  const o = a.overview
  const filter = filterName(effective(o, j, "filter"))
  const backend = resolve(o, j, effective(o, j, "backend")) ?? ""
  const log = backend.includes("systemd")
    ? "journal"
    : (j.status?.files[0] ??
      listValue(resolve(o, j, effective(o, j, "logpath")) ?? "")[0])
  const local = inLocal(j)
  return [
    [
      {
        key: "edit",
        label: "Edit settings",
        icon: <Pencil />,
        onSelect: () => a.editJail(j),
      },
      ...(filter
        ? [
            {
              key: "filter",
              label: `Edit filter ${filter}`,
              icon: <FileCode />,
              onSelect: () => a.editFilter(filter),
            },
            {
              key: "test",
              label: "Test its filter",
              icon: <FlaskConical />,
              onSelect: () => a.test({ filter, log }),
            },
          ]
        : []),
    ],
    j.active
      ? [
          {
            key: "ban",
            label: "Ban an address…",
            icon: <Ban />,
            onSelect: () => a.ban({ jail: j.name }),
          },
        ]
      : [],
    local
      ? [
          j.custom
            ? {
                key: "reset",
                label: "Delete jail…",
                icon: <Trash2 />,
                destructive: true,
                onSelect: () => a.resetJail(j),
              }
            : {
                key: "reset",
                label: "Reset to shipped settings…",
                icon: <RotateCcw />,
                onSelect: () => a.resetJail(j),
              },
        ]
      : [],
  ]
}

function source(
  o: ReturnType<typeof useF2bActions>["overview"],
  j: Fail2BanJail,
) {
  const filter = filterName(effective(o, j, "filter"))
  const port = resolve(o, j, effective(o, j, "port"))
  return [filter && `filter ${filter}`, port && `port ${port}`]
    .filter(Boolean)
    .join(" · ")
}

// ---- Desktop ----

function JailsTable({ jails }: { jails: Fail2BanJail[] }) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border">
      <table className="w-full table-fixed text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr className="h-10 text-start">
            <th className="ps-4 text-start font-medium">Jail</th>
            <th className="w-36 px-3 text-start font-medium">Status</th>
            <th className="hidden w-24 px-3 text-end font-medium @xl:table-cell">
              Failures
            </th>
            <th className="w-24 px-3 text-end font-medium">Banned</th>
            <th className="hidden w-32 px-3 text-start font-medium @2xl:table-cell">
              Ban time
            </th>
            <th className="w-16 px-3 text-start font-medium">On</th>
            <th className="w-12 pe-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {jails.map((j) => (
            <JailRow key={j.name} jail={j} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function JailRow({ jail: j }: { jail: Fail2BanJail }) {
  const a = useF2bActions()
  const o = a.overview
  const menu = useJailMenu(j)
  const state = jailState(j)
  const s = j.status
  return (
    <tr className="h-16 hover:bg-subtle">
      <td className="max-w-0 ps-4">
        <button
          type="button"
          onClick={() => a.editJail(j)}
          className="block w-full min-w-0 text-start outline-none focus-visible:underline"
        >
          <span
            className={cn(
              "block truncate font-medium",
              state === "off" && "text-muted-foreground",
            )}
          >
            {j.name}
          </span>
          <span className="block truncate font-mono text-caption text-ash">
            {source(o, j) || "—"}
          </span>
        </button>
      </td>
      <td className="px-3" title={stateMeta[state].hint}>
        <StateDot tone={tone[state]} label={stateMeta[state].label} />
      </td>
      <td className="hidden px-3 text-end tabular-nums @xl:table-cell">
        {s ? s.currently_failed : <span className="text-ash">—</span>}
      </td>
      <td
        className="px-3 text-end tabular-nums"
        title={s ? `${s.total_banned} since fail2ban started` : undefined}
      >
        {s ? (
          <span className={cn(s.currently_banned > 0 && "font-medium")}>
            {s.currently_banned}
          </span>
        ) : (
          <span className="text-ash">—</span>
        )}
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @2xl:table-cell">
        {duration(resolve(o, j, effective(o, j, "bantime")))}
      </td>
      <td className="px-3">
        <Switch
          size="sm"
          aria-label={j.enabled ? `Turn off ${j.name}` : `Turn on ${j.name}`}
          checked={j.enabled}
          disabled={a.pending || o.access === "user"}
          onCheckedChange={(on) => a.setEnabled(j, on)}
        />
      </td>
      <td className="pe-3">
        <ItemMenu groups={menu} label={`Actions for ${j.name}`} />
      </td>
    </tr>
  )
}

// ---- Phone ----

function JailsList({ jails }: { jails: Fail2BanJail[] }) {
  const [open, setOpen] = useOpen("f2b-jail-sheet")
  const [current, setCurrent] = useState<string | null>(null)
  // Keep the sheet's jail in step with changes made from it.
  const jail = jails.find((j) => j.name === current)

  return (
    <>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {jails.map((j) => (
          <li key={j.name}>
            <MobileRow
              jail={j}
              onOpen={() => {
                setCurrent(j.name)
                setOpen(true)
              }}
            />
          </li>
        ))}
      </ul>
      {jail && <JailSheet jail={jail} open={open} onOpenChange={setOpen} />}
    </>
  )
}

function MobileRow({
  jail: j,
  onOpen,
}: {
  jail: Fail2BanJail
  onOpen: () => void
}) {
  const state = jailState(j)
  const banned = j.status?.currently_banned ?? 0
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg",
          j.active ? "bg-brand-soft text-brand-strong" : "bg-muted text-ash",
        )}
      >
        <ShieldBan className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-body font-medium",
            state === "off" && "text-muted-foreground",
          )}
        >
          {j.name}
        </span>
        <span className="block truncate text-body-sm text-muted-foreground">
          <StateDot tone={tone[state]} label={stateMeta[state].label} />
          {j.status && <span className="text-ash"> · {banned} banned</span>}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ash" />
    </button>
  )
}

function JailSheet({
  jail: j,
  open,
  onOpenChange,
}: {
  jail: Fail2BanJail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const a = useF2bActions()
  const o = a.overview
  const menu = useJailMenu(j)
  const state = jailState(j)
  const s = j.status
  const toggle: Item = {
    key: "toggle",
    label: "Turned on",
    icon: <ShieldBan />,
    stay: true,
    disabled: a.pending || o.access === "user",
    trailing: (
      <Switch
        checked={j.enabled}
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none"
      />
    ),
    onSelect: () => a.setEnabled(j, !j.enabled),
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={j.name}
      header={
        <div className="px-6 pt-1 pb-3">
          <p className="truncate text-subheading font-medium">{j.name}</p>
          <p className="text-body-sm text-muted-foreground">
            {stateMeta[state].hint}
          </p>
        </div>
      }
    >
      <Facts
        items={[
          { label: "Banned now", value: s ? s.currently_banned : "—" },
          { label: "Failures counted", value: s ? s.currently_failed : "—" },
          {
            label: "Ban time",
            value: duration(resolve(o, j, effective(o, j, "bantime"))),
          },
          {
            label: "Max retries",
            value: resolve(o, j, effective(o, j, "maxretry")) ?? "—",
          },
          {
            label: "Watching",
            value:
              s?.files.join("\n") ||
              s?.journal_matches ||
              resolve(o, j, effective(o, j, "logpath")) ||
              "—",
            wide: true,
            mono: true,
          },
        ]}
      />
      <SheetItems groups={[[toggle], ...menu]} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}
