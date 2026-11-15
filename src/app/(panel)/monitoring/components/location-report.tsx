"use client"

import { ChevronDown, CircleHelp } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import {
  type Buckets,
  bucketLabel,
  bucketOf,
  StatusStrip,
  type StripState,
  Tip,
} from "@/components/charts/time-chart"
import { Section } from "@/components/insights/parts"
import type {
  LocationResult,
  MonitorLocation,
  ReportLocation,
  UptimeMonitor,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { ruleText } from "./draft"
import { type MonitorState, stateMeta, uptimeText } from "./meta"

type LocStatus = MonitorLocation["status"] | LocationResult["status"]

// "unknown" = the location couldn't check (its server was unreachable).
const unknownMeta = {
  label: "Couldn't check",
  icon: CircleHelp,
  text: "text-ash",
  dot: "bg-mist",
}

export const locMeta = (s: LocStatus) =>
  s === "unknown" ? unknownMeta : stateMeta[s as MonitorState]

const ms = (v: number) => `${Math.round(v)} ms`

// Every location's answer for one check, as compact rows.
export function LocationResults({
  items,
  className,
}: {
  items: LocationResult[]
  className?: string
}) {
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {items.map((l) => {
        const meta = locMeta(l.status)
        return (
          <li key={l.location} className="flex items-start gap-2">
            <span
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", meta.dot)}
            />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm">
                <span className="font-medium">{l.name}</span>
                <span className={cn("ms-1.5", meta.text)}>{meta.label}</span>
                {l.latency_ms != null && (
                  <span className="text-muted-foreground tabular-nums">
                    {" "}
                    · {l.latency_ms} ms
                  </span>
                )}
              </p>
              {l.message && (
                <p className="text-caption break-words text-muted-foreground">
                  {l.message}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// The monitor's locations as dots (worst state per dot), for lists.
export function LocationDots({
  m,
  className,
}: {
  m: Pick<UptimeMonitor, "locations">
  className?: string
}) {
  if (m.locations.length < 2) return null
  const bad = m.locations.filter(
    (l) => l.status !== "up" && l.status !== "pending",
  )
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={m.locations
        .map((l) => `${l.name}: ${locMeta(l.status).label}`)
        .join("\n")}
    >
      <span className="flex gap-0.5" aria-hidden>
        {m.locations.map((l) => (
          <span
            key={l.location}
            className={cn("size-1.5 rounded-full", locMeta(l.status).dot)}
          />
        ))}
      </span>
      <span>
        {m.locations.length} locations
        {bad.length > 0 && ` · ${bad.length} with trouble`}
      </span>
    </span>
  )
}

// A check row's "N locations" toggle that unfolds their answers.
export function CheckLocations({ items }: { items: LocationResult[] }) {
  const [open, setOpen] = useState(false)
  if (items.length < 2) return null
  const bad = items.filter((l) => l.status !== "up").length
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex min-h-6 items-center gap-1 rounded-md text-caption text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex gap-0.5" aria-hidden>
          {items.map((l) => (
            <span
              key={l.location}
              className={cn("size-1.5 rounded-full", locMeta(l.status).dot)}
            />
          ))}
        </span>
        {items.length} locations
        {bad > 0 && ` · ${bad} with trouble`}
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <LocationResults items={items} className="mt-1.5 ps-1" />}
    </div>
  )
}

function stripOf(
  b: Buckets,
  r: ReportLocation | undefined,
): {
  states: StripState[]
  rows: (ReportLocation["buckets"][number] | null)[]
} {
  const states = new Array<StripState>(b.starts.length).fill("none")
  const rows = new Array<ReportLocation["buckets"][number] | null>(
    b.starts.length,
  ).fill(null)
  for (const x of r?.buckets ?? []) {
    const i = bucketOf(b, x.at)
    if (i < 0 || !x.checks) continue
    rows[i] = x
    states[i] = x.down === 0 ? "ok" : x.down >= x.checks ? "down" : "some"
  }
  return { states, rows }
}

// Each location's own state now, and how it did over the report's range.
export function LocationsSection({
  m,
  report,
  buckets,
  phone,
}: {
  m: UptimeMonitor
  report?: ReportLocation[]
  buckets?: Buckets
  phone: boolean
}) {
  const n = m.locations.length
  return (
    <Section title="Locations" caption={ruleText(m.rule, n)} phone={phone}>
      <ul className={cn("flex flex-col", phone ? "-mx-4" : "-mx-1")}>
        {m.locations.map((l) => {
          const meta = locMeta(l.status)
          const r = report?.find((x) => x.location === l.location)
          const strip =
            buckets && r?.buckets.length ? stripOf(buckets, r) : null
          return (
            <li
              key={l.location}
              className={cn(
                "flex flex-col gap-2 border-b border-border py-3 last:border-b-0",
                phone ? "px-4" : "px-1",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  className={cn("size-2 shrink-0 rounded-full", meta.dot)}
                  aria-hidden
                />
                {l.server_id ? (
                  <Link
                    href={`/servers/${l.server_id}`}
                    className="text-body-sm font-medium hover:underline"
                  >
                    {l.name}
                  </Link>
                ) : (
                  <span className="text-body-sm font-medium">{l.name}</span>
                )}
                <span className={cn("text-caption", meta.text)}>
                  {meta.label}
                  {l.status !== "pending" &&
                    ` for ${timeAgo(l.status_since).replace(/ ago$/, "")}`}
                </span>
                <span className="flex-1" />
                {l.latency_ms != null && (
                  <span className="text-caption text-muted-foreground tabular-nums">
                    {l.latency_ms} ms
                  </span>
                )}
                {l.checked_at && (
                  <span className="text-caption text-ash">
                    {timeAgo(l.checked_at)}
                  </span>
                )}
              </div>
              {l.status_message && l.status !== "up" && (
                <p
                  className={cn(
                    "ps-5 text-caption break-words",
                    l.status === "down"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {l.status_message}
                </p>
              )}
              {r && r.checks > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 ps-5 text-caption text-muted-foreground">
                  <span>Uptime {uptimeText(r.uptime)}</span>
                  {r.latency_avg != null && (
                    <span>
                      Avg {ms(r.latency_avg)}
                      {r.latency_p95 != null &&
                        ` · slowest 5% ${ms(r.latency_p95)}`}
                    </span>
                  )}
                  {r.down > 0 && (
                    <span className="text-destructive">{r.down} failed</span>
                  )}
                  {r.unknown > 0 && (
                    <span className="text-ash">{r.unknown} couldn't check</span>
                  )}
                </div>
              )}
              {strip && buckets && (
                <StatusStrip
                  className="ms-5"
                  label={`${l.name} over time`}
                  states={strip.states}
                  tooltip={(i) => {
                    const x = strip.rows[i]
                    return (
                      <Tip
                        title={bucketLabel(buckets, i)}
                        rows={
                          x
                            ? [
                                { label: "Checks", value: x.checks },
                                { label: "Failed", value: x.down },
                                {
                                  label: "Average",
                                  value:
                                    x.latency_avg == null
                                      ? "—"
                                      : ms(x.latency_avg),
                                },
                              ]
                            : [{ label: "Checks", value: "None" }]
                        }
                      />
                    )
                  }}
                />
              )}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
