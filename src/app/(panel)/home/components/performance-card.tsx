"use client"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useServerInsights } from "@/app/(panel)/servers/api"
import { buildModel } from "@/app/(panel)/servers/components/insights/model"
import {
  bucketLabel,
  LineChart,
  StatusStrip,
  Tip,
} from "@/components/charts/time-chart"
import {
  formatMs,
  formatPct,
  formatPercent,
  insightRanges,
  rangeLabels,
  stripOf,
} from "@/components/insights/format"
import { checkTip } from "@/components/insights/parts"
import { Skeleton } from "@/components/ui/skeleton"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import { cn } from "@/lib/utils"
import { Card, CardLink } from "./card"
import { insightsHref } from "./kpis"

const measures = ["latency", "cpu", "memory"] as const
type Measure = (typeof measures)[number]

const measureItems = [
  { value: "latency", label: "Response" },
  { value: "cpu", label: "CPU" },
  { value: "memory", label: "Memory" },
] as const

const rangeItems = insightRanges.map((r) => ({ value: r, label: r }))

// Availability and one measure over time for the whole fleet, with its own
// range: the Servers › Insights tab in small.
export function PerformanceCard({ className }: { className?: string }) {
  const [range, setRange] = useStoredChoice("morcheh.home.range", insightRanges)
  const [measure, setMeasure] = useStoredChoice(
    "morcheh.home.measure",
    measures,
  )
  const q = useServerInsights(range)
  const m = q.data ? buildModel(q.data) : null
  const t = m?.totals

  const values =
    m &&
    (measure === "latency"
      ? m.all.latency
      : measure === "cpu"
        ? m.allRes.cpu
        : m.allRes.mem)
  const format = measure === "latency" ? formatMs : formatPct
  const label =
    measureItems.find((x) => x.value === measure)?.label ?? "Response"

  return (
    <Card
      title="Availability and performance"
      caption={`Every server · ${rangeLabels[range]}`}
      className={className}
      action={
        <>
          <Segmented
            label="Range"
            items={rangeItems}
            value={range}
            onChange={setRange}
          />
          <CardLink href={insightsHref(range)}>Insights</CardLink>
        </>
      }
    >
      {!m ? (
        <div className="flex flex-col gap-4 p-5">
          <Skeleton className="h-8" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-5 p-5",
            q.isPlaceholderData && "opacity-60",
          )}
        >
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Availability"
              value={t?.checks ? formatPercent(1 - t.failures / t.checks) : "—"}
              sub={
                t?.failures ? `${t.failures} failed checks` : "No failed checks"
              }
            />
            <Stat
              label="Response"
              value={t?.latency != null ? formatMs(t.latency) : "—"}
              sub="Average SSH answer"
            />
            <Stat
              label="CPU"
              value={t?.cpu != null ? formatPct(t.cpu) : "—"}
              sub={
                t?.cpuMax != null
                  ? `Peak ${formatPct(t.cpuMax)}`
                  : "Not sampled"
              }
            />
            <Stat
              label="Memory"
              value={t?.mem != null ? formatPct(t.mem) : "—"}
              sub={
                t?.memMax != null
                  ? `Peak ${formatPct(t.memMax)}`
                  : "Not sampled"
              }
            />
          </dl>
          <div className="flex flex-col gap-2">
            <p className="text-caption text-muted-foreground">Availability</p>
            <StatusStrip
              states={stripOf(m.all)}
              tooltip={(i) => checkTip(m.buckets, m.all, i)}
              label="Availability of every server over time"
              className="h-8"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <p className="flex-1 text-caption text-muted-foreground">
                {label}
                {measure !== "latency" && " · average of sampled servers"}
              </p>
              <Segmented
                label="Measure"
                items={measureItems}
                value={measure}
                onChange={(v: Measure) => setMeasure(v)}
              />
            </div>
            {values?.some((v) => v !== null) ? (
              <LineChart
                buckets={m.buckets}
                values={values}
                format={format}
                max={measure === "latency" ? undefined : 100}
                height={180}
                label={`${label} over time`}
                tooltip={(i) => (
                  <Tip
                    title={bucketLabel(m.buckets, i)}
                    rows={[
                      {
                        label,
                        value: values[i] == null ? "—" : format(values[i]),
                        swatch: "bg-brand",
                      },
                    ]}
                  />
                )}
              />
            ) : (
              <p className="flex h-44 items-center justify-center rounded-lg bg-subtle text-body-sm text-muted-foreground">
                Nothing measured in this range yet.
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg bg-subtle px-4 py-3">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="text-subheading font-light tabular-nums">{value}</dd>
      <dd className="truncate text-caption text-ash">{sub}</dd>
    </div>
  )
}
