"use client"

import { CloudOff, RefreshCw } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import {
  type Buckets,
  bucketLabel,
  Legend,
  LineChart,
  StatusStrip,
  type StripState,
  Tip,
} from "@/components/charts/time-chart"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  bucketEach,
  formatMs,
  formatPercent,
  type InsightsRange,
  rangeLabels,
  type Series,
} from "./format"

// The building blocks of every Insights tab: a card per section on desktop,
// full-width bands on phones.

export function Section({
  title,
  caption,
  actions,
  phone,
  children,
  className,
}: {
  title: string
  caption?: ReactNode
  actions?: ReactNode
  phone: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border p-5",
        className,
      )}
    >
      <header className="mb-4 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-body font-medium">{title}</h2>
          {caption && (
            <p className="text-caption text-muted-foreground">{caption}</p>
          )}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

export function Quiet({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-body-sm text-muted-foreground">
      {children}
    </p>
  )
}

export type Tile = {
  label: string
  value: ReactNode
  note: ReactNode
  // A real problem: shows a warning dot before the note.
  warn?: boolean
}

// The headline numbers. Phones get a 2-column grid of bands; desktop one
// row of cards (`className` sets the columns for more than four).
export function Tiles({
  tiles,
  phone,
  className = "lg:grid-cols-4",
}: {
  tiles: Tile[]
  phone: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2",
        phone
          ? "border-b border-border [&>*:not(:nth-last-child(-n+2))]:border-b [&>*:nth-child(odd)]:border-e"
          : cn("gap-4", className),
      )}
    >
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={cn(
            "flex min-w-0 flex-col border-border",
            phone ? "p-4" : "rounded-2xl border p-5",
          )}
        >
          <span className="text-caption text-muted-foreground">
            {tile.label}
          </span>
          <span
            className={cn(
              "mt-1 truncate font-light tabular-nums",
              phone ? "text-subheading" : "text-heading",
            )}
          >
            {tile.value}
          </span>
          <span className="mt-1 flex items-center gap-1.5 truncate text-caption text-ash">
            {tile.warn && (
              <span className="size-1.5 shrink-0 rounded-full bg-warning" />
            )}
            {tile.note}
          </span>
        </div>
      ))}
    </div>
  )
}

export function InsightsLoading({
  phone,
  tiles = 4,
}: {
  phone: boolean
  tiles?: number
}) {
  return (
    <div className={cn("flex flex-col gap-4", phone && "px-4 pt-4")}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: Math.min(tiles, 4) }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

export function InsightsError({
  error,
  onRetry,
}: {
  error: Error | null
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <CloudOff className="size-5" />
      </span>
      <h2 className="text-body font-medium">Couldn't load Insights</h2>
      <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
        {error?.message || "The server didn't answer. Try again."}
      </p>
      <Button variant="outline" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

// Range, when it was read, Refresh; `children` go after the spacer.
export function RangeControls({
  range,
  onChange,
  query,
  phone,
  children,
}: {
  range: InsightsRange
  onChange: (range: InsightsRange) => void
  query: { dataUpdatedAt: number; isFetching: boolean; refetch: () => unknown }
  phone: boolean
  children?: ReactNode
}) {
  const items = (Object.keys(rangeLabels) as InsightsRange[]).map((value) => ({
    value,
    label: phone ? value : rangeLabels[value],
  }))
  return (
    <>
      <Segmented
        label="Range"
        value={range}
        onChange={onChange}
        items={items}
      />
      {!phone && query.dataUpdatedAt > 0 && (
        <span className="text-caption text-ash">
          Updated {timeAgo(new Date(query.dataUpdatedAt).toISOString())}
        </span>
      )}
      <span className="flex-1" />
      <Button
        variant="ghost"
        size={phone ? "icon-lg" : "icon"}
        aria-label="Refresh"
        disabled={query.isFetching}
        onClick={() => query.refetch()}
      >
        <RefreshCw className={cn(query.isFetching && "animate-spin")} />
      </Button>
      {children}
    </>
  )
}

// Picks one item (or all of them) for a chart: a Select on desktop, the
// native picker on phones.
export function ItemPicker({
  items,
  value,
  onChange,
  phone,
  label,
  allLabel,
}: {
  items: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  phone: boolean
  label: string
  allLabel: string
}) {
  const options = [
    { value: "all", label: allLabel },
    ...items.map((s) => ({ value: s.id, label: s.name })),
  ]
  if (phone) {
    return (
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-body"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(v) => v && onChange(v)}
    >
      <SelectTrigger aria-label={label} className="h-8 w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="truncate">{o.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// One item picked from a list for a chart, falling back to "all" when the
// picked one is gone.
export function usePicked<T extends { id: string }>(items: T[]) {
  const [picked, setPicked] = useState("all")
  const item = items.find((s) => s.id === picked)
  return { item, value: item ? picked : "all", setPicked }
}

export function checkTip(b: Buckets, s: Series, i: number) {
  const checks = s.checks[i]
  const failed = s.failures[i]
  const latency = s.latency[i]
  return (
    <Tip
      title={bucketLabel(b, i)}
      rows={
        checks
          ? [
              {
                label: "Checks",
                value: failed
                  ? `${failed} of ${checks} failed`
                  : `${checks} passed`,
              },
              ...(latency !== null
                ? [{ label: "Response", value: formatMs(latency) }]
                : []),
            ]
          : [{ label: "Checks", value: "None" }]
      }
    />
  )
}

function Num({ children }: { children: ReactNode }) {
  return (
    <th
      scope="col"
      className="w-20 px-2 pb-2 text-end font-medium whitespace-nowrap"
    >
      {children}
    </th>
  )
}

export type AvailabilityRow = {
  id: string
  label: string
  name: ReactNode
  series: Series
  strip: StripState[]
  uptime: number | null
  // Desktop columns after Uptime, matching `columns`.
  values: string[]
  // Phones: the line under the strip.
  caption: string
}

// A strip of check results per item, with uptime and response times.
export function AvailabilitySection({
  buckets: b,
  rows,
  noun,
  columns,
  phone,
}: {
  buckets: Buckets
  rows: AvailabilityRow[]
  noun: string
  columns: string[]
  phone: boolean
}) {
  const legend = (
    <Legend
      items={[
        { label: "All checks passed", swatch: "bg-success" },
        { label: "Some failed", swatch: "bg-warning" },
        { label: "All failed", swatch: "bg-destructive" },
        { label: "No checks", swatch: "bg-muted" },
      ]}
    />
  )
  return (
    <Section
      title="Availability"
      caption={`Each block is ${bucketEach(b)} of connection checks.`}
      actions={!phone && legend}
      phone={phone}
    >
      {phone ? (
        <ul className="-mx-4 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-center gap-3">
                {r.name}
                <span className="ms-auto shrink-0 text-body-sm font-medium tabular-nums">
                  {r.uptime === null ? "—" : formatPercent(r.uptime)}
                </span>
              </div>
              <StatusStrip
                states={r.strip}
                label={`${r.label} availability`}
                tooltip={(i) => checkTip(b, r.series, i)}
              />
              <span className="text-caption text-ash">{r.caption}</span>
            </li>
          ))}
          <li className="px-4 pt-3">{legend}</li>
        </ul>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-body-sm">
            <thead className="text-caption text-muted-foreground">
              <tr>
                <th
                  scope="col"
                  className="w-56 px-2 pb-2 text-start font-medium"
                >
                  {noun}
                </th>
                <th scope="col" className="px-2 pb-2 text-start font-medium">
                  <span className="sr-only">Checks over time</span>
                </th>
                <Num>Uptime</Num>
                {columns.map((c) => (
                  <Num key={c}>{c}</Num>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="h-11">
                  <td className="max-w-56 px-2">{r.name}</td>
                  <td className="px-2">
                    <StatusStrip
                      states={r.strip}
                      label={`${r.label} availability`}
                      tooltip={(i) => checkTip(b, r.series, i)}
                    />
                  </td>
                  <td className="px-2 text-end font-medium tabular-nums">
                    {r.uptime === null ? "—" : formatPercent(r.uptime)}
                  </td>
                  {r.values.map((v, k) => (
                    <td
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed columns
                      key={k}
                      className="px-2 text-end text-muted-foreground tabular-nums"
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

// Response time of the checks that got through, for all items or one.
export function ResponseTimeSection({
  buckets: b,
  items,
  all,
  noun,
  caption = "How long a connection check took, when it got through.",
  phone,
}: {
  buckets: Buckets
  items: { id: string; name: string; series: Series }[]
  all: Series
  // Plural: "storages", "servers".
  noun: string
  caption?: string
  phone: boolean
}) {
  const { item, value, setPicked } = usePicked(items)
  const series = item?.series ?? all
  const any = series.latency.some((v) => v !== null)
  return (
    <Section
      title="Response time"
      caption={caption}
      actions={
        <div className={cn(phone && "w-full")}>
          <ItemPicker
            items={items}
            value={value}
            onChange={setPicked}
            phone={phone}
            label={noun}
            allLabel={`All ${noun}`}
          />
        </div>
      }
      phone={phone}
    >
      {any ? (
        <LineChart
          buckets={b}
          values={series.latency}
          format={formatMs}
          label={`Response time of ${item?.name ?? `all ${noun}`}`}
          tooltip={(i) => (
            <Tip
              title={bucketLabel(b, i)}
              rows={
                series.latency[i] === null
                  ? [{ label: "Response", value: "No answer" }]
                  : [
                      {
                        label: "Average",
                        value: formatMs(series.latency[i] ?? 0),
                      },
                      {
                        label: "Slowest",
                        value: formatMs(series.latencyMax[i]),
                      },
                      {
                        label: "Checks",
                        value: series.failures[i]
                          ? `${series.failures[i]} of ${series.checks[i]} failed`
                          : series.checks[i],
                      },
                    ]
              }
            />
          )}
        />
      ) : (
        <Quiet>
          {item
            ? `${item.name} didn't answer a check in this range.`
            : "No check got an answer in this range yet."}
        </Quiet>
      )}
    </Section>
  )
}

export type Bar = {
  id: string
  name: string
  href?: string
  value: string
  // 0–1 of the longest bar.
  share: number
  note?: ReactNode
}

// Ranked rows with a bar each (busiest, biggest…).
export function BarList({ rows, phone }: { rows: Bar[]; phone: boolean }) {
  return (
    <ul className={cn("flex flex-col gap-3", phone && "pt-1")}>
      {rows.map((r) => (
        <li key={r.id} className="text-body-sm">
          <div className="flex items-baseline gap-2">
            {r.href ? (
              <Link
                href={r.href}
                className="truncate font-medium hover:text-brand"
              >
                {r.name}
              </Link>
            ) : (
              <span className="truncate font-medium">{r.name}</span>
            )}
            <span className="ms-auto shrink-0 tabular-nums">{r.value}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max(1, r.share * 100)}%` }}
            />
          </div>
          {r.note && <div className="mt-1 text-caption text-ash">{r.note}</div>}
        </li>
      ))}
    </ul>
  )
}

export type InsightEvent = {
  key: string
  dot: ReactNode
  title: ReactNode
  detail?: string
  at: string
}

// Newest first; the first 8, then "Show all".
export function EventList({
  events,
  phone,
}: {
  events: InsightEvent[]
  phone: boolean
}) {
  const [more, setMore] = useState(false)
  const shown = more ? events : events.slice(0, 8)
  return (
    <>
      <ul className={cn("divide-y divide-border", phone && "-mx-4")}>
        {shown.map((e) => (
          <li
            key={e.key}
            className={cn(
              "flex items-start gap-3 py-2.5 text-body-sm",
              phone && "px-4",
            )}
          >
            <span className="mt-1.5 flex shrink-0">{e.dot}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{e.title}</span>
              {e.detail && (
                <span className="block truncate text-caption text-ash">
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
      </ul>
      {events.length > 8 && (
        <Button
          variant="ghost"
          className="mt-2 self-start"
          onClick={() => setMore((m) => !m)}
        >
          {more ? "Show fewer" : `Show all ${events.length}`}
        </Button>
      )}
    </>
  )
}
