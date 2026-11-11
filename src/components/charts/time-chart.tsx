"use client"

import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"

// Small SVG charts over time buckets (no chart library): a line with its
// area, stacked columns, and a strip of status blocks. Every chart has a
// hover/tap tooltip; arrow keys move it when the chart has focus.

export type Buckets = { starts: number[]; size: number }

// Every bucket from `from` until `to`, so gaps show as gaps.
export function buckets(from: string, to: string, seconds: number): Buckets {
  const size = seconds * 1000
  const start = Date.parse(from)
  const end = Date.parse(to)
  const starts: number[] = []
  for (let t = start; t < end && starts.length < 2000; t += size) {
    starts.push(t)
  }
  return { starts, size }
}

// Which bucket a timestamp falls in (-1 = outside).
export function bucketOf(b: Buckets, iso: string) {
  if (!b.starts.length) return -1
  const i = Math.floor((Date.parse(iso) - b.starts[0]) / b.size)
  return i >= 0 && i < b.starts.length ? i : -1
}

const hour = 3_600_000
const day = 24 * hour

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en", o)
const hm = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
const weekdayName = fmt({ weekday: "short" })
const dayNumber = fmt({ day: "numeric" })
// "Sun 1" (Intl puts the day first: "1 Sun").
const weekday = {
  format: (t: number) => `${weekdayName.format(t)} ${dayNumber.format(t)}`,
}
const monthDay = fmt({ month: "short", day: "numeric" })
const full = fmt({
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

// "Tue 4, 14:00–14:30", "Tue 4, 08:00–12:00", "Tue, Nov 4".
export function bucketLabel(b: Buckets, i: number) {
  const start = b.starts[i]
  if (b.size >= day)
    return fmt({ weekday: "short", month: "short", day: "numeric" }).format(
      start,
    )
  return `${full.format(start)}–${hm.format(start + b.size)}`
}

function tickLabel(b: Buckets, t: number) {
  if (b.size < hour) return hm.format(t)
  if (b.size < day) return weekday.format(t)
  return monthDay.format(t)
}

// Bucket starts worth a label: every 6 hours, each midnight, or every day
// (every 5 or 15 minutes over a short span), thinned until they fit.
function xTicks(b: Buckets, width: number) {
  const span = b.starts.length * b.size
  let ticks = b.starts
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => {
      const d = new Date(t)
      if (b.size < hour && span <= 3 * hour)
        return d.getMinutes() % (span <= hour ? 5 : 15) === 0
      if (b.size < hour) return d.getMinutes() === 0 && d.getHours() % 6 === 0
      if (b.size < day) return d.getHours() === 0 && d.getMinutes() === 0
      return true
    })
  const fit = Math.max(2, Math.floor(width / 72))
  if (ticks.length > fit) {
    const step = Math.ceil(ticks.length / fit)
    ticks = ticks.filter((_, k) => k % step === 0)
  }
  return ticks
}

// 0 and up to 3 more round steps covering max.
function yTicks(max: number) {
  if (max <= 0) return [0, 1]
  const raw = max / 3
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const ticks = []
  for (let v = 0; v < max + step * 0.999; v += step) ticks.push(v)
  return ticks
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

// The hovered bucket: pointer over the plot, a tap on phones, arrow keys.
function useHover(count: number, toIndex: (x: number) => number) {
  const [hover, setHover] = useState<number | null>(null)
  const onPointer = useCallback(
    (e: PointerEvent<Element>) => {
      const box = e.currentTarget.getBoundingClientRect()
      const i = toIndex(e.clientX - box.left)
      setHover(i >= 0 && i < count ? i : null)
    },
    [count, toIndex],
  )
  const onKeyDown = (e: KeyboardEvent) => {
    if (!count) return
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const d = e.key === "ArrowRight" ? 1 : -1
      setHover((h) =>
        Math.min(count - 1, Math.max(0, (h ?? (d > 0 ? -1 : count)) + d)),
      )
    } else if (e.key === "Escape") setHover(null)
  }
  return {
    hover,
    bind: {
      onPointerMove: onPointer,
      onPointerDown: onPointer,
      onPointerLeave: (e: PointerEvent) => {
        if (e.pointerType === "mouse") setHover(null)
      },
      onKeyDown,
      onBlur: () => setHover(null),
      tabIndex: 0,
    },
  }
}

function Tooltip({
  x,
  width,
  top = 0,
  children,
}: {
  x: number
  width: number
  top?: number
  children: ReactNode
}) {
  // Beside the crosshair, flipped to the other side near the right edge.
  const left = x > width / 2
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-max max-w-64 rounded-lg border border-border bg-popover px-3 py-2 text-caption text-popover-foreground shadow-md"
      style={{
        top,
        ...(left
          ? { right: Math.max(0, width - x + 12) }
          : { left: Math.max(0, x + 12) }),
      }}
    >
      {children}
    </div>
  )
}

// Title + rows of "swatch label value" for a tooltip.
export function Tip({
  title,
  rows,
}: {
  title: ReactNode
  rows: { label: ReactNode; value: ReactNode; swatch?: string }[]
}) {
  return (
    <>
      <div className="mb-1 text-ash">{title}</div>
      <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
        {rows.map((r, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed rows
          <div key={i} className="contents">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              {r.swatch && (
                <span className={cn("size-2 rounded-[2px]", r.swatch)} />
              )}
              {r.label}
            </dt>
            <dd className="text-end font-medium tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

const pad = { top: 8, right: 8, bottom: 24 }

type FrameProps = {
  buckets: Buckets
  max: number
  format: (v: number) => string
  height: number
  label: string
  tooltip: (i: number) => ReactNode
  // Left edge reserved for the y labels (default: fits the widest one).
  axisWidth?: number
  children: (scale: {
    x: (i: number) => number
    y: (v: number) => number
    step: number
    plotHeight: number
    hover: number | null
  }) => ReactNode
  // Drawn under the marks for the hovered bucket.
  highlight?: "line" | "band"
}

function Frame({
  buckets: b,
  max,
  format,
  height,
  label,
  tooltip,
  axisWidth: fixedAxis,
  children,
  highlight = "line",
}: FrameProps) {
  const [ref, width] = useWidth()
  const n = b.starts.length
  const ticks = yTicks(max)
  // Wide enough for the longest label (11px tabular figures ≈ 6.5px each).
  const axisWidth =
    fixedAxis ??
    Math.max(
      44,
      Math.ceil(Math.max(...ticks.map((v) => format(v).length)) * 6.5) + 12,
    )
  const plotWidth = Math.max(0, width - axisWidth - pad.right)
  const plotHeight = height - pad.top - pad.bottom
  const step = n ? plotWidth / n : 0
  const top = ticks[ticks.length - 1] || 1
  const x = (i: number) => axisWidth + step * (i + 0.5)
  const y = (v: number) => pad.top + plotHeight * (1 - v / top)
  const toIndex = useCallback(
    (px: number) => (step ? Math.floor((px - axisWidth) / step) : -1),
    [step, axisWidth],
  )
  const { hover, bind } = useHover(n, toIndex)

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          className="block touch-pan-y outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
          {...bind}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line
                x1={axisWidth}
                x2={width - pad.right}
                y1={y(v)}
                y2={y(v)}
                className={v === 0 ? "stroke-mist" : "stroke-border"}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={axisWidth - 8}
                y={y(v)}
                dy="0.32em"
                textAnchor="end"
                className="fill-ash text-[11px] tabular-nums"
              >
                {format(v)}
              </text>
            </g>
          ))}
          {xTicks(b, plotWidth).map(({ t, i }) => (
            <text
              key={t}
              x={axisWidth + step * i}
              y={height - 6}
              textAnchor={i === 0 ? "start" : "middle"}
              className="fill-ash text-[11px]"
            >
              {tickLabel(b, t)}
            </text>
          ))}
          {hover !== null &&
            (highlight === "band" ? (
              <rect
                x={axisWidth + step * hover}
                y={pad.top}
                width={step}
                height={plotHeight}
                className="fill-muted"
              />
            ) : (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={pad.top}
                y2={pad.top + plotHeight}
                className="stroke-mist"
                strokeWidth={1}
              />
            ))}
          {children({ x, y, step, plotHeight, hover })}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={x(hover)} width={width} top={pad.top}>
          {tooltip(hover)}
        </Tooltip>
      )}
    </div>
  )
}

// One series as a 2px line over a light area; null = no data (a gap).
export function LineChart({
  values,
  ...rest
}: {
  buckets: Buckets
  values: (number | null)[]
  format: (v: number) => string
  tooltip: (i: number) => ReactNode
  label: string
  height?: number
  // A fixed top of the scale (100 for percentages); a value above it wins.
  max?: number
  guides?: Guide[]
}) {
  return <MultiLineChart {...rest} series={[{ key: "v", values }]} />
}

// A line on a chart: `brand` = the main one (with its area), `quiet` = a
// second measure (grey, no area), `peak` = the highest value in each bucket
// (a faint brand line).
export type Series = {
  key: string
  values: (number | null)[]
  tone?: "brand" | "quiet" | "peak"
}

// A level drawn across the chart (an alert rule's threshold).
export type Guide = {
  value: number
  label: string
  tone?: "warning" | "destructive"
}

const lineClass = {
  brand: "stroke-brand",
  quiet: "stroke-muted-foreground",
  peak: "stroke-brand/35",
}
const dotClass = {
  brand: "fill-brand",
  quiet: "fill-muted-foreground",
  peak: "fill-brand/35",
}

// Several series over the same buckets, plus optional threshold guides.
export function MultiLineChart({
  buckets: b,
  series,
  guides = [],
  format,
  tooltip,
  label,
  height = 200,
  max: ceiling,
}: {
  buckets: Buckets
  series: Series[]
  guides?: Guide[]
  format: (v: number) => string
  tooltip: (i: number) => ReactNode
  label: string
  height?: number
  max?: number
}) {
  const max = Math.max(
    ceiling ?? 0,
    ...series.flatMap((s) => s.values.map((v) => v ?? 0)),
    ...guides.map((g) => g.value),
  )
  // The main series is drawn last, over the others.
  const order = [...series].sort(
    (x, y) => rank[x.tone ?? "brand"] - rank[y.tone ?? "brand"],
  )
  return (
    <Frame
      buckets={b}
      max={max}
      format={format}
      height={height}
      label={label}
      tooltip={tooltip}
    >
      {({ x, y, hover }) => {
        const base = y(0)
        const left = x(0) - (x(1) - x(0)) / 2
        const right = x(b.starts.length - 1) + (x(1) - x(0)) / 2
        return (
          <g className="pointer-events-none">
            {order.map((s) => {
              const tone = s.tone ?? "brand"
              // Runs of buckets with data; a lone one becomes a dot.
              const runs: number[][] = []
              s.values.forEach((v, i) => {
                if (v === null) return
                const last = runs[runs.length - 1]
                if (last && last[last.length - 1] === i - 1) last.push(i)
                else runs.push([i])
              })
              return (
                <g key={s.key}>
                  {runs.map((run) => {
                    if (run.length === 1) {
                      const i = run[0]
                      return (
                        <circle
                          key={i}
                          cx={x(i)}
                          cy={y(s.values[i] ?? 0)}
                          r={tone === "brand" ? 3 : 2}
                          className={dotClass[tone]}
                        />
                      )
                    }
                    const line = run
                      .map(
                        (i, k) =>
                          `${k ? "L" : "M"}${x(i)},${y(s.values[i] ?? 0)}`,
                      )
                      .join("")
                    const area = `${line}L${x(run[run.length - 1])},${base}L${x(run[0])},${base}Z`
                    return (
                      <g key={run[0]}>
                        {tone === "brand" && (
                          <path d={area} className="fill-brand/10" />
                        )}
                        <path
                          d={line}
                          fill="none"
                          className={lineClass[tone]}
                          strokeWidth={tone === "brand" ? 2 : 1.5}
                          strokeDasharray={tone === "quiet" ? "4 3" : undefined}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </g>
                    )
                  })}
                  {hover !== null && s.values[hover] != null && (
                    <circle
                      cx={x(hover)}
                      cy={y(s.values[hover] ?? 0)}
                      r={tone === "brand" ? 4 : 3}
                      strokeWidth={2}
                      className={cn(dotClass[tone], "stroke-background")}
                    />
                  )}
                </g>
              )
            })}
            {guides.map((g) => (
              <g key={`${g.value}-${g.label}`}>
                <line
                  x1={left}
                  x2={right}
                  y1={y(g.value)}
                  y2={y(g.value)}
                  strokeWidth={1}
                  strokeDasharray="6 4"
                  shapeRendering="crispEdges"
                  className={
                    g.tone === "destructive"
                      ? "stroke-destructive/70"
                      : "stroke-warning/70"
                  }
                />
                <text
                  x={right - 4}
                  y={y(g.value) - 4}
                  textAnchor="end"
                  className={cn(
                    "text-[11px] font-medium",
                    g.tone === "destructive"
                      ? "fill-destructive"
                      : "fill-warning",
                  )}
                >
                  {g.label}
                </text>
              </g>
            ))}
          </g>
        )
      }}
    </Frame>
  )
}

const rank = { peak: 0, quiet: 1, brand: 2 }

export type Stack = { key: string; fill: string; values: number[] }

// A rect with its top corners rounded (the data end); the base stays square.
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

// Stacked columns, at most 24px wide, 2px gaps between segments.
export function ColumnChart({
  buckets: b,
  stacks,
  format,
  tooltip,
  label,
  height = 200,
}: {
  buckets: Buckets
  stacks: Stack[]
  format: (v: number) => string
  tooltip: (i: number) => ReactNode
  label: string
  height?: number
}) {
  const totals = b.starts.map((_, i) =>
    stacks.reduce((sum, s) => sum + (s.values[i] ?? 0), 0),
  )
  return (
    <Frame
      buckets={b}
      max={Math.max(0, ...totals)}
      format={format}
      height={height}
      label={label}
      tooltip={tooltip}
      highlight="band"
    >
      {({ x, y, step }) => {
        const w = Math.max(2, Math.min(24, step * 0.6))
        return (
          <g className="pointer-events-none">
            {b.starts.map((t, i) => {
              let top = y(0)
              const parts = stacks.filter((s) => (s.values[i] ?? 0) > 0)
              return (
                <g key={t}>
                  {parts.map((s, k) => {
                    const h = Math.max(1, y(0) - y(s.values[i]))
                    const gap = k ? 2 : 0
                    const y0 = top - h
                    top = y0
                    const last = k === parts.length - 1
                    const height = Math.max(0.5, h - gap)
                    return last ? (
                      <path
                        key={s.key}
                        d={topRounded(x(i) - w / 2, y0, w, height, 4)}
                        className={s.fill}
                      />
                    ) : (
                      <rect
                        key={s.key}
                        x={x(i) - w / 2}
                        y={y0}
                        width={w}
                        height={height}
                        className={s.fill}
                      />
                    )
                  })}
                </g>
              )
            })}
          </g>
        )
      }}
    </Frame>
  )
}

export type StripState = "ok" | "some" | "down" | "none"

const stripFill: Record<StripState, string> = {
  ok: "bg-success",
  some: "bg-warning",
  down: "bg-destructive",
  none: "bg-muted",
}

// One block per bucket, colored by how its checks went.
export function StatusStrip({
  states,
  tooltip,
  label,
  className,
}: {
  states: StripState[]
  tooltip: (i: number) => ReactNode
  label: string
  className?: string
}) {
  const [ref, width] = useWidth()
  const n = states.length
  const toIndex = useCallback(
    (px: number) => (n && width ? Math.floor((px / width) * n) : -1),
    [n, width],
  )
  const { hover, bind } = useHover(n, toIndex)
  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        role="img"
        aria-label={label}
        className="flex h-7 touch-pan-y items-stretch gap-px rounded-md outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
        {...bind}
      >
        {states.map((s, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: one per bucket
            key={i}
            className={cn(
              "min-w-px flex-1 rounded-[2px]",
              stripFill[s],
              hover !== null && hover !== i && "opacity-60",
            )}
          />
        ))}
      </div>
      {hover !== null && width > 0 && (
        <Tooltip x={((hover + 0.5) / n) * width} width={width} top={36}>
          {tooltip(hover)}
        </Tooltip>
      )}
    </div>
  )
}

// Legend for 2+ series: a swatch and a text label each.
export function Legend({
  items,
}: {
  items: { label: string; swatch: string }[]
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", it.swatch)} />
          {it.label}
        </li>
      ))}
    </ul>
  )
}
