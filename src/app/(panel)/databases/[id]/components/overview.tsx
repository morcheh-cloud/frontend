"use client"

import {
  Bell,
  BellOff,
  ChevronDown,
  Ellipsis,
  SlidersHorizontal,
} from "lucide-react"
import { useState } from "react"

import {
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { Meter } from "@/app/(panel)/servers/[id]/components/resources"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type {
  DatabaseCheck,
  DatabaseCheckInfo,
  DatabaseEvent,
  DatabaseHourAverages,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useDatabaseChecks,
  useDatabaseEvents,
  useDatabaseHistory,
} from "../../api"
import { byLevel, levelMeta } from "../../components/meta"
import { useDashboardActions } from "./dashboard-actions"
import { checkValue, ms, num, pct, perSecond } from "./format"
import { NotesFor, Pairs, Panel, type Stat, Stats, useDashboard } from "./parts"

export function OverviewTab() {
  const { phone } = useDashboard()
  return (
    <div className="flex flex-col md:gap-4">
      <Headline />
      <div
        className={cn(
          !phone &&
            "grid items-start gap-4 @5xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]",
        )}
      >
        <Checks />
        <div className="flex min-w-0 flex-col md:gap-4">
          <Compared />
          <Capacity />
          <Changes />
        </div>
      </div>
    </div>
  )
}

const toneOf = (c?: DatabaseCheck): Stat["tone"] =>
  c && !c.muted && (c.level === "critical" || c.level === "warning")
    ? c.level
    : undefined

function Headline() {
  const { database: d, snapshot: s } = useDashboard()
  const history = useDatabaseHistory(d.id, "24h")
  const check = (id: string) => d.checks.find((c) => c.id === id)
  const growth = history.data?.growth.size_bytes_per_day
  const items: Stat[] = []

  const conn = s?.connections
  const total = conn?.total ?? d.connections
  const max = conn?.max ?? d.max_connections
  if (total != null) {
    const ratio = max ? total / max : null
    items.push({
      key: "connections",
      label: "Connections",
      value: (
        <>
          {num(total)}
          {max ? (
            <span className="text-body text-muted-foreground">
              {" "}
              / {num(max)}
            </span>
          ) : null}
        </>
      ),
      tone: toneOf(check("connections")),
      sub: (
        <span className="flex flex-col gap-2">
          {ratio != null && (
            <Meter
              value={Math.min(ratio * 100, 100)}
              label="Connections used"
            />
          )}
          {conn && (
            <span>
              {num(conn.active)} active
              {conn.idle_in_tx > 0 &&
                ` · ${num(conn.idle_in_tx)} idle in transaction`}
              {conn.blocked > 0 && ` · ${num(conn.blocked)} waiting`}
            </span>
          )}
        </span>
      ),
    })
  }
  if (s?.rates?.queries != null) {
    items.push({
      key: "qps",
      label: d.engine === "redis" ? "Commands" : "Queries",
      value: perSecond(s.rates.queries),
      sub:
        s.rates.transactions != null
          ? `${perSecond(s.rates.transactions)} transactions`
          : s.rates.reads != null
            ? `${perSecond(s.rates.reads)} reads`
            : undefined,
    })
  }
  if (s?.cache_hit != null) {
    items.push({
      key: "cache",
      label: "Cache hit",
      value: pct(s.cache_hit),
      tone: toneOf(check("cache_hit")),
      sub: "Reads served from memory",
    })
  }
  const size = s?.size_bytes ?? d.size_bytes
  if (size != null) {
    items.push({
      key: "size",
      label: "Size",
      value: formatSize(size),
      sub:
        growth != null && Math.abs(growth) >= 1
          ? `${growth > 0 ? "+" : "−"}${formatSize(Math.abs(growth))} a day`
          : s
            ? `${s.databases.length} ${d.engine === "redis" ? "keyspaces" : "databases"}`
            : undefined,
    })
  }
  const latency = s?.latency_ms ?? d.latency_ms
  if (latency != null) {
    items.push({
      key: "latency",
      label: "Response time",
      value: ms(latency),
      tone: toneOf(check("latency")),
      sub: "A trivial query, round trip",
    })
  }
  if (s?.memory && s.memory.limit_bytes > 0) {
    const ratio = s.memory.used_bytes / s.memory.limit_bytes
    items.push({
      key: "memory",
      label: "Memory",
      value: pct(ratio),
      tone: toneOf(check("memory")),
      sub: `${formatSize(s.memory.used_bytes)} of ${formatSize(s.memory.limit_bytes)}`,
    })
  } else if (s?.disk && s.disk.total_bytes > 0) {
    const used = 1 - s.disk.free_bytes / s.disk.total_bytes
    items.push({
      key: "disk",
      label: "Disk used",
      value: pct(used),
      tone: toneOf(check("disk")),
      sub: `${formatSize(s.disk.free_bytes)} free`,
    })
  }
  return <Stats items={items} />
}

// Every check with its verdict; the passing ones fold away.
function Checks() {
  const { database: d, engineer, phone } = useDashboard()
  const a = useDashboardActions()
  const catalog = useDatabaseChecks()
  const [showOk, setShowOk] = useState(false)
  const [sheetOpen, setSheetOpen] = useOpen("database-check-sheet")
  const [picked, setPicked] = useState<DatabaseCheck | null>(null)

  const info = new Map(catalog.data?.items.map((c) => [c.id, c]))
  const sorted = [...d.checks].sort(byLevel)
  const loud = sorted.filter(
    (c) => !c.muted && (c.level === "critical" || c.level === "warning"),
  )
  const rest = sorted.filter((c) => !loud.includes(c))
  const shown = showOk ? sorted : loud

  const menu = (c: DatabaseCheck): Item[][] => {
    if (!engineer) return []
    const items: Item[] = [
      {
        key: "mute",
        label: c.muted ? "Unmute" : "Mute",
        icon: c.muted ? <Bell /> : <BellOff />,
        onSelect: () => a.mute(c.id, !c.muted),
      },
    ]
    if (info.get(c.id)?.limit) {
      items.push({
        key: "limits",
        label: "Change limits…",
        icon: <SlidersHorizontal />,
        onSelect: () => a.monitoring(c.id),
      })
    }
    return [items]
  }

  const caption =
    d.checks.length === 0
      ? undefined
      : loud.length
        ? `${loud.length} of ${d.checks.length} need a look`
        : `All ${d.checks.length} pass`

  return (
    <Panel
      title="Checks"
      caption={caption}
      flush
      actions={
        engineer && (
          <Button
            variant="ghost"
            size={phone ? "icon" : "sm"}
            aria-label="Monitoring settings"
            onClick={() => a.monitoring()}
            className="max-md:size-9"
          >
            <SlidersHorizontal />
            {!phone && "Settings"}
          </Button>
        )
      }
    >
      {d.checks.length === 0 ? (
        <p className="px-5 py-8 text-center text-body-sm text-muted-foreground">
          {d.paused
            ? "Paused: no checks run."
            : "No checks yet. They run on the first look."}
        </p>
      ) : (
        <>
          {loud.length === 0 && !showOk && (
            <p className="px-5 py-6 text-body-sm text-muted-foreground max-md:px-4">
              Nothing needs a look right now.
            </p>
          )}
          <ul className="divide-y divide-border">
            {shown.map((c) => (
              <CheckRow
                key={c.id}
                check={c}
                info={info.get(c.id)}
                menu={phone ? undefined : menu(c)}
                onOpen={
                  phone && engineer
                    ? () => {
                        setPicked(c)
                        setSheetOpen(true)
                      }
                    : undefined
                }
              />
            ))}
          </ul>
          {rest.length > 0 && (
            <button
              type="button"
              aria-expanded={showOk}
              onClick={() => setShowOk((v) => !v)}
              className="flex min-h-11 w-full items-center gap-2 border-t border-border px-5 text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:bg-muted max-md:px-4"
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  showOk && "rotate-180",
                )}
              />
              {showOk
                ? "Show only what needs a look"
                : `${rest.length} more ${rest.length === 1 ? "check" : "checks"} (passing, muted or unknown)`}
            </button>
          )}
        </>
      )}
      {picked && (
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={picked.title}
        >
          <SheetItems groups={menu(picked)} onOpenChange={setSheetOpen} />
        </BottomSheet>
      )}
    </Panel>
  )
}

function CheckRow({
  check: c,
  info,
  menu,
  onOpen,
}: {
  check: DatabaseCheck
  info?: DatabaseCheckInfo
  menu?: Item[][]
  onOpen?: () => void
}) {
  const meta = levelMeta[c.level]
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          c.muted ? "bg-mist" : meta.dot,
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{c.title}</span>
          <span className={cn("text-caption text-muted-foreground")}>
            {c.muted ? `Muted · ${meta.label}` : meta.label}
            {c.value != null && ` · ${checkValue(c.value, info?.unit)}`}
          </span>
        </span>
        <span className="block text-muted-foreground">{c.reason}</span>
        {c.action && c.level !== "ok" && (
          <span className="mt-1 block text-foreground">{c.action}</span>
        )}
        {(c.since || c.pending) && (
          <span className="mt-1 block text-caption text-ash">
            {c.since &&
              c.level !== "ok" &&
              `Since ${timeAgo(c.since).toLowerCase()}`}
            {c.since && c.level !== "ok" && c.pending && " · "}
            {c.pending &&
              `Looked ${levelMeta[c.pending as DatabaseCheck["level"]]?.label.toLowerCase() ?? c.pending} once, confirming on the next look`}
          </span>
        )}
      </span>
    </>
  )
  const cls = "flex w-full gap-3 px-5 py-3 text-start text-body-sm max-md:px-4"
  return (
    <li className="flex items-start">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className={cn(cls, "outline-none active:bg-muted")}
        >
          {body}
          <Ellipsis className="mt-0.5 size-4 shrink-0 text-ash" />
        </button>
      ) : (
        <div className={cls}>
          {body}
          {menu && menu.length > 0 && (
            <div className="-my-1 shrink-0">
              <ItemMenu groups={menu} label={`${c.title} actions`} />
            </div>
          )}
        </div>
      )}
    </li>
  )
}

// Now against the same hour yesterday and the usual for this hour.
function Compared() {
  const { database: d, snapshot: s } = useDashboard()
  const history = useDatabaseHistory(d.id, "24h")
  const h = history.data
  if (!h) return null
  const hasPast = h.yesterday.samples > 0 || h.usual.samples > 0

  const rows: {
    key: keyof Omit<DatabaseHourAverages, "samples">
    label: string
    now: number | null | undefined
    fmt: (n: number) => string
  }[] = [
    {
      key: "qps",
      label: d.engine === "redis" ? "Commands/s" : "Queries/s",
      now: s?.rates?.queries,
      fmt: num,
    },
    {
      key: "connections",
      label: "Connections",
      now: s?.connections.total,
      fmt: num,
    },
    { key: "active", label: "Active", now: s?.connections.active, fmt: num },
    {
      key: "latency_ms",
      label: "Response time",
      now: s?.latency_ms,
      fmt: ms,
    },
  ]
  const cell = (v: number | null | undefined, fmt: (n: number) => string) =>
    v == null ? "—" : fmt(v)

  return (
    <Panel title="Compared with yesterday" caption="This hour">
      {!hasPast ? (
        <p className="text-body-sm text-muted-foreground">
          Comparisons start once a day of history is recorded.
        </p>
      ) : (
        <table className="w-full text-body-sm">
          <thead className="text-caption text-muted-foreground">
            <tr>
              <th className="pb-2 text-start font-medium">
                <span className="sr-only">Measure</span>
              </th>
              <th className="pb-2 text-end font-medium">Now</th>
              <th className="pb-2 text-end font-medium">Yesterday</th>
              <th className="pb-2 text-end font-medium">Usual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="h-9">
                <th
                  scope="row"
                  className="text-start font-normal text-muted-foreground"
                >
                  {r.label}
                </th>
                <td className="text-end tabular-nums">
                  <Trend now={r.now} usual={h.usual[r.key]} />
                  {cell(r.now, r.fmt)}
                </td>
                <td className="text-end text-muted-foreground tabular-nums">
                  {cell(h.yesterday[r.key], r.fmt)}
                </td>
                <td className="text-end text-muted-foreground tabular-nums">
                  {cell(h.usual[r.key], r.fmt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

// A marker when now is well off the usual (2× or half), in words for
// screen readers.
function Trend({
  now,
  usual,
}: {
  now: number | null | undefined
  usual: number | null
}) {
  if (now == null || usual == null || usual <= 0) return null
  const r = now / usual
  if (r < 2 && r > 0.5) return null
  return (
    <span className="me-1.5 text-caption text-warning">
      {r >= 2 ? `×${num(Math.round(r * 10) / 10)}` : "low"}
      <span className="sr-only"> compared with usual</span>
    </span>
  )
}

function Capacity() {
  const { database: d, snapshot: s } = useDashboard()
  const history = useDatabaseHistory(d.id, "24h")
  const growth = history.data?.growth
  if (!s) return null
  const disk = s.disk
  const log = s.log
  const mem = s.memory
  const full = growth?.disk_full_days
  if (!disk && !log && !mem && growth?.size_bytes_per_day == null) return null

  return (
    <Panel title="Space and growth">
      <div className="flex flex-col gap-4">
        {disk && disk.total_bytes > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="text-muted-foreground">
                Disk
                {disk.path && (
                  <span className="font-mono text-caption"> {disk.path}</span>
                )}
              </span>
              <span className="tabular-nums">
                {formatSize(disk.total_bytes - disk.free_bytes)} of{" "}
                {formatSize(disk.total_bytes)}
              </span>
            </div>
            <Meter
              value={(1 - disk.free_bytes / disk.total_bytes) * 100}
              label="Disk used"
            />
            {full != null && full < 60 && (
              <p
                className={cn(
                  "text-caption",
                  full < 14 ? "text-destructive" : "text-warning",
                )}
              >
                Full in about {Math.max(1, Math.round(full))}{" "}
                {Math.round(full) === 1 ? "day" : "days"} at this rate
              </p>
            )}
          </div>
        )}
        {mem && mem.limit_bytes > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="text-muted-foreground">Memory</span>
              <span className="tabular-nums">
                {formatSize(mem.used_bytes)} of {formatSize(mem.limit_bytes)}
              </span>
            </div>
            <Meter
              value={(mem.used_bytes / mem.limit_bytes) * 100}
              label="Memory used"
            />
          </div>
        )}
        <Pairs
          items={[
            {
              label: "Growth",
              value:
                growth?.size_bytes_per_day != null
                  ? `${growth.size_bytes_per_day >= 0 ? "+" : "−"}${formatSize(Math.abs(growth.size_bytes_per_day))} a day`
                  : null,
            },
            {
              label: "Memory in use",
              value:
                mem && mem.limit_bytes === 0
                  ? `${formatSize(mem.used_bytes)} (no limit set)`
                  : null,
            },
            {
              label: "Evicted keys",
              value:
                mem?.evicted != null && mem.evicted > 0
                  ? num(mem.evicted)
                  : null,
            },
            {
              label: log ? `${log.kind} size` : "Log",
              value:
                log?.size_bytes != null ? formatSize(log.size_bytes) : null,
            },
            {
              label: `${log?.kind ?? "Log"} in use`,
              value: log?.used_ratio != null ? pct(log.used_ratio) : null,
            },
            {
              label: "Oplog window",
              value:
                log?.window_hours != null
                  ? `${num(Math.round(log.window_hours * 10) / 10)} hours`
                  : null,
            },
            { label: "Held by", value: log?.held_by || null },
          ]}
        />
        <NotesFor notes={s.notes} areas={["capacity"]} />
      </div>
    </Panel>
  )
}

const severityDot: Record<DatabaseEvent["severity"], string> = {
  critical: "bg-destructive",
  warning: "bg-warning",
  ok: "bg-success",
  info: "bg-mist",
}

function Changes() {
  const { database: d } = useDashboard()
  const events = useDatabaseEvents(d.id)
  const [all, setAll] = useState(false)
  const items = events.data?.items ?? []
  const shown = all ? items : items.slice(0, 8)
  return (
    <Panel title="Recent changes" flush>
      {events.isPending ? (
        <p className="px-5 py-6 text-body-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="px-5 py-6 text-body-sm text-muted-foreground max-md:px-4">
          {events.error
            ? events.error.message
            : "Nothing has changed since monitoring began."}
        </p>
      ) : (
        <>
          <ol className="divide-y divide-border">
            {shown.map((e) => (
              <li
                key={e.id}
                className="flex gap-3 px-5 py-2.5 text-body-sm max-md:px-4"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    severityDot[e.severity],
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block">{e.title}</span>
                  {e.detail && (
                    <span className="block text-muted-foreground">
                      {e.detail}
                    </span>
                  )}
                </span>
                <time
                  dateTime={e.at}
                  title={new Date(e.at).toLocaleString()}
                  className="shrink-0 text-caption text-ash"
                >
                  {timeAgo(e.at)}
                </time>
              </li>
            ))}
          </ol>
          {items.length > shown.length && (
            <div className="border-t border-border px-4 py-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="max-md:h-11"
                onClick={() => setAll(true)}
              >
                Show all {items.length}
              </Button>
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
