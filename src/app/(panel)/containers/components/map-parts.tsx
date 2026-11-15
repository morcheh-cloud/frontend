"use client"

import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  Handle,
  type InternalNode,
  type NodeProps,
  Position,
  useInternalNode,
} from "@xyflow/react"
import {
  ArrowUpRight,
  Boxes,
  Globe,
  HeartPulse,
  Lock,
  Network,
  Server,
  TriangleAlert,
  Waypoints,
} from "lucide-react"

import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  CONTAINER,
  type ContainerData,
  ENDPOINT,
  type EndpointData,
  type FlowData,
  type FlowKind,
  type GroupData,
  isUp,
  linkLabel,
} from "./map-graph"
import { Dot, stateMeta } from "./meta"
import { containerTone, pct, shareTone, upFor } from "./project-stats"

// Nodes and the one edge type of the containers map (`topology.tsx`).

// Edges are drawn border to border (`FloatEdge`), so the handles only have
// to exist: React Flow skips an edge whose nodes have none.
function Anchors() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="pointer-events-none opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="pointer-events-none opacity-0"
      />
    </>
  )
}

const toneBorder = {
  destructive: "border-destructive/60",
  warning: "border-warning/60",
  success: "border-border",
  muted: "border-dashed border-mist",
  brand: "border-border",
}

const barTone = {
  brand: "bg-brand",
  warning: "bg-warning",
  destructive: "bg-destructive",
}

export function ContainerNode({ data, selected }: NodeProps) {
  const { c, cores, extra, published, inbound, outbound } =
    data as ContainerData
  const tone = containerTone(c)
  const up = isUp(c)
  const share = cores > 0 ? c.cpu / cores : c.cpu
  const label = stateMeta[c.state]?.label ?? c.state
  return (
    <div
      style={{ width: CONTAINER.width, height: CONTAINER.height }}
      className={cn(
        "flex cursor-pointer flex-col justify-center gap-1 rounded-2xl border bg-card px-3 shadow-sm transition-[box-shadow,border-color] hover:shadow-md",
        toneBorder[tone],
        !up && "bg-subtle",
        selected && "border-brand ring-3 ring-brand/25",
      )}
    >
      <Anchors />
      <div className="flex min-w-0 items-center gap-2">
        <Dot tone={tone} />
        <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
          {c.name}
        </span>
        {c.health !== "none" && (
          <HeartPulse
            aria-label={c.health}
            className={cn(
              "size-3.5 shrink-0",
              c.health === "healthy" && "text-success",
              c.health === "unhealthy" && "text-destructive",
              c.health === "starting" && "text-warning",
            )}
          />
        )}
        <Internet published={published} inbound={inbound} out={outbound} />
      </div>
      <div className="flex min-w-0 items-center gap-2 text-caption text-muted-foreground tabular-nums">
        {up && c.measured ? (
          <>
            <span className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full rounded-full",
                  barTone[shareTone(share)],
                )}
                style={{ width: `${Math.min(100, Math.max(3, share))}%` }}
              />
            </span>
            <span className="shrink-0">{pct(share)}</span>
            <span className="shrink-0 text-ash">·</span>
            <span className="shrink-0">{formatSize(c.memory_used)}</span>
          </>
        ) : (
          <span className="truncate">
            {up ? `Up ${upFor(c.started_at)}` : label}
            {!up && c.finished_at && ` · ${upFor(c.finished_at)} ago`}
          </span>
        )}
        {extra.length > 0 && (
          <span
            title={`Also on ${extra.join(", ")}`}
            className="ms-auto flex min-w-0 items-center gap-0.5 text-ash"
          >
            <Network className="size-3 shrink-0" />
            <span className="truncate">
              {extra.length === 1 ? extra[0] : extra.length}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

// Whether the internet reaches it (published, or connected to from
// outside) or it only reaches out. Outside isn't a node on the map.
function Internet({
  published,
  inbound,
  out,
}: {
  published: number
  inbound: number
  out: number
}) {
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`
  const said = [
    published > 0 && `${plural(published, "published port")}`,
    inbound > 0 && `${plural(inbound, "connection")} in from outside`,
    out > 0 && `${plural(out, "connection")} out to the internet`,
  ].filter(Boolean)
  if (!said.length) return null
  const reached = published > 0 || inbound > 0
  return (
    <span
      title={said.join(" · ")}
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-full px-1.5 text-caption tabular-nums",
        reached
          ? "bg-brand-soft text-brand-strong"
          : "bg-muted text-muted-foreground",
      )}
    >
      {reached ? (
        <Globe className="size-3" />
      ) : (
        <ArrowUpRight className="size-3" />
      )}
      {reached ? published || inbound : out}
    </span>
  )
}

export function GroupNode({ data, selected }: NodeProps) {
  const g = data as GroupData
  const Icon = g.by === "project" ? Boxes : Network
  const all = g.ids.length
  return (
    <div
      style={{ width: g.width, height: g.height }}
      className={cn(
        "rounded-3xl border border-border bg-subtle/80 transition-[box-shadow,border-color] dark:bg-subtle/50",
        selected && "border-brand ring-3 ring-brand/20",
      )}
    >
      <Anchors />
      <div className="flex h-[52px] min-w-0 cursor-grab items-center gap-2.5 px-3.5 active:cursor-grabbing">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Icon className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1 text-body-sm font-medium">
            <span className="truncate">{g.title}</span>
            {g.internal && (
              <Lock
                aria-label="Internal"
                className="size-3 shrink-0 text-ash"
              />
            )}
          </span>
          <span className="truncate text-caption text-muted-foreground tabular-nums">
            {g.running === all
              ? `${all} running`
              : `${g.running}/${all} running`}
            {g.inner > 0 &&
              ` · ${g.inner} connection${g.inner === 1 ? "" : "s"} inside`}
          </span>
        </span>
        {g.published > 0 && (
          <span
            title={`${g.published} published to the internet`}
            className="flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-caption text-brand-strong tabular-nums"
          >
            <Globe className="size-3" />
            {g.published}
          </span>
        )}
        {g.peers > 0 && (
          <span
            title={`Talks to ${g.peers} other ${g.by === "project" ? "project" : "network"}${g.peers === 1 ? "" : "s"}`}
            className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground tabular-nums"
          >
            <Waypoints className="size-3" />
            {g.peers}
          </span>
        )}
        {g.failing > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-caption text-destructive tabular-nums">
            <TriangleAlert className="size-3" />
            {g.failing}
          </span>
        )}
      </div>
    </div>
  )
}

export function EndpointNode({ data, selected }: NodeProps) {
  const d = data as EndpointData
  return (
    <div
      style={{ width: ENDPOINT.width, height: ENDPOINT.height }}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-full border border-border bg-card ps-1.5 pe-4 shadow-sm",
        selected && "border-brand ring-3 ring-brand/25",
      )}
    >
      <Anchors />
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Server className="size-5" strokeWidth={1.5} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm font-medium">{d.title}</span>
        <span className="truncate text-caption text-ash">{d.sub}</span>
      </span>
    </div>
  )
}

// --- Edge --------------------------------------------------------------------

export const stroke: Record<FlowKind, string> = {
  traffic: "var(--color-brand)",
  shared: "var(--color-ash)",
}
const dash: Record<FlowKind, string | undefined> = {
  traffic: undefined,
  shared: "3 4",
}

type Box = { x: number; y: number; w: number; h: number }

function boxOf(n: InternalNode): Box {
  const { x, y } = n.internals.positionAbsolute
  return { x, y, w: n.measured.width ?? 0, h: n.measured.height ?? 0 }
}

// The middle of the side facing the other box: left/right when they sit
// more apart than above each other.
// A laid out flow keeps to its axis, so lines run with it.
function sideOf(a: Box, b: Box, axis?: "x" | "y") {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2)
  const dy = b.y + b.h / 2 - (a.y + a.h / 2)
  const across =
    axis === "x" ||
    (axis !== "y" && Math.abs(dx) * (a.h + b.h) >= Math.abs(dy) * (a.w + b.w))
  if (across) {
    return dx >= 0
      ? { x: a.x + a.w, y: a.y + a.h / 2, p: Position.Right }
      : { x: a.x, y: a.y + a.h / 2, p: Position.Left }
  }
  return dy >= 0
    ? { x: a.x + a.w / 2, y: a.y + a.h, p: Position.Bottom }
    : { x: a.x + a.w / 2, y: a.y, p: Position.Top }
}

export function FloatEdge({
  id,
  source,
  target,
  data,
}: EdgeProps<Edge<FlowData>>) {
  const a = useInternalNode(source)
  const b = useInternalNode(target)
  if (!a || !b || !data) return null
  const s = sideOf(boxOf(a), boxOf(b), data.axis)
  const t = sideOf(boxOf(b), boxOf(a), data.axis)
  const [path, x, y] = getBezierPath({
    sourceX: s.x,
    sourceY: s.y,
    sourcePosition: s.p,
    targetX: t.x,
    targetY: t.y,
    targetPosition: t.p,
  })
  const traffic = data.kind === "traffic"
  const width = traffic ? 0.75 + data.weight * 0.75 : 1.25
  // Moving dots show the direction: on the lines in focus, else only on the
  // busy ones, so a quiet map stays still.
  const dots =
    !traffic || data.dim
      ? 0
      : data.hot
        ? Math.min(3, data.weight)
        : data.weight >= 3
          ? 1
          : 0
  const speed = Math.max(1.6, 4 - data.weight * 0.6)
  const label = linkLabel(data)
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={14}
        style={{
          stroke: stroke[data.kind],
          strokeWidth: data.hot ? width + 0.75 : width,
          strokeDasharray: dash[data.kind],
          strokeLinecap: "round",
          opacity: data.dim ? 0.08 : data.hot ? 1 : traffic ? 0.6 : 0.45,
          transition: "opacity 150ms",
        }}
      />
      {Array.from({ length: dots }, (_, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed dots
          key={i}
          r={1.75 + data.weight * 0.4}
          className="fill-brand motion-reduce:hidden"
        >
          <animateMotion
            dur={`${speed}s`}
            repeatCount="indefinite"
            // Negative: every dot starts part way along, none waits at 0,0.
            begin={`${-(i * speed) / dots}s`}
            path={path}
          />
        </circle>
      ))}
      {label && data.showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
            }}
            className={cn(
              "nodrag nopan pointer-events-none absolute z-10 rounded-full border bg-card px-2 font-mono text-caption tracking-normal whitespace-nowrap shadow-sm",
              traffic
                ? "border-brand/30 text-brand-strong"
                : "border-border text-muted-foreground",
            )}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const nodeTypes = {
  container: ContainerNode,
  group: GroupNode,
  endpoint: EndpointNode,
}
export const edgeTypes = { flow: FloatEdge }

// --- Legend ------------------------------------------------------------------

const legend: { kind: FlowKind; label: string }[] = [
  { kind: "traffic", label: "Open connections" },
  { kind: "shared", label: "Shared network" },
]

export function MapLegend({
  bytes,
  shared,
  kinds,
  hint,
}: {
  bytes: boolean
  shared?: { name: string; members: number }
  kinds: Set<FlowKind>
  // Lines show on focus only: say so.
  hint?: string
}) {
  const items = legend.filter((i) => kinds.has(i.kind))
  if (!items.length && !shared && !hint) return null
  return (
    <ul className="flex max-w-[min(42rem,calc(100vw-2rem))] flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-caption tracking-normal text-muted-foreground shadow-sm backdrop-blur">
      {items.map((item) => (
        <li key={item.kind} className="flex items-center gap-1.5">
          <svg aria-hidden width="20" height="4" className="shrink-0">
            <line
              x1="1"
              y1="2"
              x2="19"
              y2="2"
              strokeWidth={item.kind === "traffic" ? 3 : 2}
              strokeLinecap="round"
              stroke={stroke[item.kind]}
              strokeDasharray={dash[item.kind]}
            />
          </svg>
          {item.label}
        </li>
      ))}
      {kinds.has("traffic") && (
        <li className="text-ash">
          {bytes ? "Thicker = more bytes" : "Thicker = more connections"}
        </li>
      )}
      <li className="flex items-center gap-1.5">
        <Globe className="size-3.5 shrink-0 text-brand" />
        Reached from the internet
      </li>
      {shared && (
        <li className="flex min-w-0 items-center gap-1.5">
          <Network className="size-3.5 shrink-0 text-ash" />
          <span className="truncate">
            {shared.members} on <span className="font-mono">{shared.name}</span>
          </span>
        </li>
      )}
      {hint && <li className="text-ash">{hint}</li>}
    </ul>
  )
}
