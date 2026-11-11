"use client"

import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  getStraightPath,
  Handle,
  type InternalNode,
  type NodeProps,
  Position,
  useInternalNode,
} from "@xyflow/react"
import { TriangleAlert } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"

import { OsTile, StatusDot } from "@/app/(panel)/servers/components/meta"
import { LogoMark } from "@/components/logo"
import { cn } from "@/lib/utils"
import {
  BOX,
  type HubData,
  type LinkData,
  type NetData,
  NODE_WIDTH,
  type NodeBase,
  type ServerData,
} from "./graph"
import { networkIcon, networkName } from "./meta"

// n8n-style: an icon square with its ports on the sides and the name below.
function Shell({
  flow,
  selected,
  title,
  sub,
  box,
  warn,
  children,
}: {
  flow: NodeBase["flow"]
  selected: boolean
  title: string
  sub?: string
  box: string
  warn?: boolean
  children: ReactNode
}) {
  const down = flow === "down"
  // Floating edges don't use the ports, but React Flow needs them to exist.
  const ports = flow === "free" ? "opacity-0" : undefined
  return (
    <div className="relative flex w-40 cursor-pointer flex-col items-center">
      <div
        className={cn(
          "relative flex items-center justify-center border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
          box,
          warn && "border-dashed border-mist",
          selected && "border-brand ring-3 ring-brand/20",
        )}
      >
        {children}
        <Handle
          type="target"
          position={down ? Position.Top : Position.Left}
          isConnectable={false}
          className={ports}
        />
        {!down && (
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={false}
            className={ports}
          />
        )}
      </div>
      <p className="mt-2 w-full truncate text-center text-body-sm font-medium">
        {title}
      </p>
      {sub && (
        <p className="w-full truncate text-center font-mono text-caption tracking-normal text-muted-foreground">
          {sub}
        </p>
      )}
      {down && (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={false}
        />
      )}
    </div>
  )
}

export function ServerNode({ data, selected }: NodeProps) {
  const { entry, flow } = data as ServerData
  const s = entry.server
  return (
    <Shell
      flow={flow}
      selected={selected}
      title={s.name}
      sub={s.host}
      box="size-22 rounded-2xl"
      warn={!entry.scanned}
    >
      <OsTile os={s.os} className="size-14 rounded-2xl border-0" />
      <StatusDot status={s.status} className="absolute end-2 top-2 size-2.5" />
      {!entry.scanned && (
        <TriangleAlert
          aria-label="Couldn't be read"
          className="absolute end-1.5 bottom-1.5 size-4 text-warning"
        />
      )}
    </Shell>
  )
}

export function NetworkNode({ data, selected }: NodeProps) {
  const { network: n, flow } = data as NetData
  const Icon = networkIcon[n.kind]
  return (
    <Shell
      flow={flow}
      selected={selected}
      title={networkName(n)}
      sub={n.cidr || undefined}
      box={cn(
        "size-18 rounded-full",
        n.kind === "container" && "border-dashed border-mist",
      )}
    >
      <Icon
        strokeWidth={1.5}
        className={cn(
          "size-7",
          n.kind === "vpn" ? "text-brand" : "text-muted-foreground",
        )}
      />
    </Shell>
  )
}

export function HubNode({ data, selected }: NodeProps) {
  const { flow } = data as HubData
  return (
    <Shell
      flow={flow}
      selected={selected}
      title="Morche"
      box="size-22 rounded-2xl bg-brand-soft"
    >
      <LogoMark className="h-5 w-10 text-brand" />
    </Shell>
  )
}

function lineStyle(data: LinkData | undefined, style?: CSSProperties) {
  return {
    stroke: data?.stroke,
    strokeWidth: 1.5,
    strokeDasharray: data?.dashed ? "6 4" : data?.dotted ? "2 4" : undefined,
    ...style,
  }
}

function EdgeLabel({
  x,
  y,
  data,
}: {
  x: number
  y: number
  data: LinkData | undefined
}) {
  if (!data?.label || !data.showLabel) return null
  return (
    <EdgeLabelRenderer>
      <div
        style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
        className="pointer-events-none absolute rounded-full border border-border bg-card px-2 font-mono text-caption tracking-normal whitespace-nowrap text-muted-foreground shadow-sm"
      >
        {data.label}
      </div>
    </EdgeLabelRenderer>
  )
}

type LinkEdgeProps = EdgeProps<Edge<LinkData>>

export function LinkEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerStart,
  markerEnd,
}: LinkEdgeProps) {
  const [path, x, y] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  return (
    <>
      <BaseEdge
        path={path}
        style={lineStyle(data, style)}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      <EdgeLabel x={x} y={y} data={data} />
    </>
  )
}

function boxCenter(node: InternalNode) {
  const { x, y } = node.internals.positionAbsolute
  return { x: x + (node.measured.width ?? NODE_WIDTH) / 2, y: y + BOX / 2 }
}

// Where the line from a node to another point leaves that node: its icon
// square, or below its name when heading down, so it never crosses the text.
function nodeBorder(node: InternalNode, to: { x: number; y: number }) {
  const from = boxCenter(node)
  const dx = to.x - from.x
  const dy = to.y - from.y
  const side = BOX / 2 + 4
  const below = (node.measured.height ?? BOX) - BOX / 2 + 4
  const scale = Math.min(
    side / Math.max(Math.abs(dx), 1),
    (dy > 0 ? below : side) / Math.max(Math.abs(dy), 1),
  )
  return { x: from.x + dx * scale, y: from.y + dy * scale }
}

// A straight line between two icon squares, whichever way round they sit:
// for graphs laid out in a circle, where side ports would tangle.
export function FloatEdge({
  source,
  target,
  data,
  style,
  markerStart,
  markerEnd,
}: LinkEdgeProps) {
  const a = useInternalNode(source)
  const b = useInternalNode(target)
  if (!a || !b) return null
  const start = nodeBorder(a, boxCenter(b))
  const end = nodeBorder(b, boxCenter(a))
  const [path, x, y] = getStraightPath({
    sourceX: start.x,
    sourceY: start.y,
    targetX: end.x,
    targetY: end.y,
  })
  return (
    <>
      <BaseEdge
        path={path}
        style={lineStyle(data, style)}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      <EdgeLabel x={x} y={y} data={data} />
    </>
  )
}
