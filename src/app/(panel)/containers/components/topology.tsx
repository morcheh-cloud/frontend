"use client"

import "@xyflow/react/dist/style.css"

import dagre from "@dagrejs/dagre"
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  Handle,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
} from "@xyflow/react"
import { Globe, HeartPulse, Lock, Network, Server } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import type {
  DockerReport,
  DockerReportContainer,
  DockerReportNetwork,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { containerHref, Dot, stateMeta } from "./meta"
import { containerTone, pct, portLabel, rate, upFor } from "./project-stats"

// The selected environment's containers as a map: who sits on which network,
// what is published, and which containers talk to which (from the open TCP
// connections the report read). Nodes are laid out by dagre; a refresh keeps
// them where they are unless containers come or go.

const CONTAINER = { width: 232, height: 92 }
const NETWORK = { width: 224, height: 56 }
const ENDPOINT = { width: 168, height: 56 }

type ContainerData = {
  kind: "container"
  c: DockerReportContainer
  cores: number
  vertical: boolean
}
type NetworkData = {
  kind: "network"
  n: DockerReportNetwork
  members: number
  vertical: boolean
}
type EndpointData = {
  kind: "host" | "outside-in" | "outside-out"
  title: string
  sub: string
  vertical: boolean
}
type NodeData = ContainerData | NetworkData | EndpointData

export type FlowKind = "traffic" | "published" | "member" | "shared"

type FlowData = {
  kind: FlowKind
  ports: string[]
  connections: number
  up: number
  down: number
  bytes: boolean
  peers: string[]
  ip?: string
  // 1..4: line weight, from the traffic.
  weight: number
  showLabel?: boolean
}

type Graph = { nodes: Node[]; edges: Edge<FlowData>[]; structure: string }

export type TopologyCounts = {
  containers: number
  networks: number
  links: number
  connections: number
}

const cid = (id: string) => `c:${id}`
const nid = (name: string) => `n:${name}`

function ownNetwork(mode: string) {
  return !(mode === "host" || mode === "none" || mode.startsWith("container:"))
}

function linkLabel(d: FlowData) {
  const parts: string[] = []
  if (d.ports.length) parts.push(d.ports.slice(0, 3).join(", "))
  if (d.kind === "traffic") {
    parts.push(`${d.connections} conn`)
    if (d.bytes && d.up + d.down > 0) {
      parts.push(`↑${rate(d.up)} ↓${rate(d.down)}`)
    }
  }
  return parts.join(" · ")
}

export function buildTopology(
  report: DockerReport,
  { stopped, phone }: { stopped: boolean; phone: boolean },
): Graph & { counts: TopologyCounts } {
  const shown = report.containers.filter(
    (c) => stopped || c.state === "running" || c.state === "restarting",
  )
  const byId = new Map(shown.map((c) => [c.id, c]))
  const nets = new Map(report.networks.map((n) => [n.name, n]))
  const nodes: Node[] = []
  const edges: Edge<FlowData>[] = []
  const used = new Set<string>()
  const blank = {
    ports: [],
    connections: 0,
    up: 0,
    down: 0,
    bytes: report.link_bytes,
    peers: [],
    weight: 1,
  }

  for (const c of shown) {
    nodes.push({
      id: cid(c.id),
      type: "container",
      position: { x: 0, y: 0 },
      data: {
        kind: "container",
        c,
        cores: report.cpus,
        vertical: phone,
      } satisfies NodeData,
    })
  }

  // Membership: a container to each network it's on.
  const members = new Map<string, number>()
  for (const c of shown) {
    const mode = c.network_mode
    if (mode === "host") {
      edges.push({
        id: `h:${c.id}`,
        source: "host",
        target: cid(c.id),
        type: "flow",
        data: { ...blank, kind: "shared", ports: ["host network"] },
      })
      used.add("host")
      continue
    }
    if (mode.startsWith("container:")) {
      const ref = mode.slice("container:".length)
      const other = shown.find((o) => o.id.startsWith(ref) || o.name === ref)
      if (other) {
        edges.push({
          id: `s:${c.id}`,
          source: cid(other.id),
          target: cid(c.id),
          type: "flow",
          data: { ...blank, kind: "shared", ports: ["shares its network"] },
        })
      }
      continue
    }
    if (!ownNetwork(mode)) continue
    for (const e of c.networks) {
      if (!nets.has(e.network)) continue
      members.set(e.network, (members.get(e.network) ?? 0) + 1)
      edges.push({
        id: `m:${c.id}:${e.network}`,
        source: cid(c.id),
        target: nid(e.network),
        type: "flow",
        data: { ...blank, kind: "member", ip: e.ipv4 || e.ipv6 },
      })
    }
  }
  for (const [name, count] of members) {
    const n = nets.get(name)
    if (!n) continue
    nodes.push({
      id: nid(name),
      type: "network",
      position: { x: 0, y: 0 },
      data: {
        kind: "network",
        n,
        members: count,
        vertical: phone,
      } satisfies NodeData,
    })
  }

  // Traffic: one line per pair (ports and numbers added up). Outside is two
  // nodes, so what comes in sits on the left and what goes out on the right.
  const pairs = new Map<string, Edge<FlowData>>()
  const ends = (from: string, to: string) => {
    const a =
      from === "outside"
        ? "outside-in"
        : from === "host"
          ? "host"
          : byId.has(from)
            ? cid(from)
            : null
    const b =
      to === "outside"
        ? "outside-out"
        : to === "host"
          ? "host"
          : byId.has(to)
            ? cid(to)
            : null
    return a && b ? [a, b] : null
  }
  for (const l of report.links) {
    const pair = ends(l.from, l.to)
    if (!pair) continue
    const [source, target] = pair
    const id = `t:${source}>${target}`
    let e = pairs.get(id)
    if (!e) {
      e = {
        id,
        source,
        target,
        type: "flow",
        data: { ...blank, kind: "traffic", ports: [], peers: [] },
      }
      pairs.set(id, e)
    }
    const d = e.data as FlowData
    if (l.port && !d.ports.includes(`:${l.port}`)) d.ports.push(`:${l.port}`)
    d.connections += l.connections
    d.up += l.up
    d.down += l.down
    for (const p of l.peers) if (!d.peers.includes(p)) d.peers.push(p)
    used.add(source)
    used.add(target)
  }

  // Published ports come from outside too: on the traffic line when there is
  // one, else a dashed line of their own.
  for (const c of shown) {
    const published = c.ports.filter((p) => p.public > 0)
    if (!published.length || c.network_mode === "host") continue
    const labels = [...new Set(published.map(portLabel))]
    const traffic = pairs.get(`t:outside-in>${cid(c.id)}`)
    if (traffic?.data) {
      traffic.data.ports = labels
      continue
    }
    edges.push({
      id: `p:${c.id}`,
      source: "outside-in",
      target: cid(c.id),
      type: "flow",
      data: { ...blank, kind: "published", ports: labels },
    })
    used.add("outside-in")
  }

  const traffic = [...pairs.values()]
  const top = Math.max(
    1,
    ...traffic.map((e) =>
      report.link_bytes
        ? (e.data?.up ?? 0) + (e.data?.down ?? 0)
        : (e.data?.connections ?? 0),
    ),
  )
  for (const e of traffic) {
    const d = e.data as FlowData
    const v = report.link_bytes ? d.up + d.down : d.connections
    d.weight = 1 + Math.round((Math.sqrt(v / top) || 0) * 3)
  }
  edges.push(...traffic)

  const endpoints: Record<EndpointData["kind"], EndpointData> = {
    host: {
      kind: "host",
      title: "This server",
      sub: "The Docker host",
      vertical: phone,
    },
    "outside-in": {
      kind: "outside-in",
      title: "Outside",
      sub: "Connects in",
      vertical: phone,
    },
    "outside-out": {
      kind: "outside-out",
      title: "Outside",
      sub: "Reached from here",
      vertical: phone,
    },
  }
  for (const key of ["outside-in", "host", "outside-out"] as const) {
    if (!used.has(key)) continue
    nodes.push({
      id: key,
      type: "endpoint",
      position: { x: 0, y: 0 },
      data: endpoints[key] satisfies NodeData,
    })
  }

  const placed = place(nodes, edges, phone ? "TB" : "LR")
  return {
    nodes: placed,
    edges,
    structure: nodes
      .map((n) => n.id)
      .sort()
      .join(),
    counts: {
      containers: shown.length,
      networks: members.size,
      links: traffic.length,
      connections: traffic.reduce((n, e) => n + (e.data?.connections ?? 0), 0),
    },
  }
}

function sizeOf(n: Node) {
  return n.type === "container"
    ? CONTAINER
    : n.type === "network"
      ? NETWORK
      : ENDPOINT
}

function place(nodes: Node[], edges: Edge[], rankdir: "LR" | "TB") {
  const g = new dagre.graphlib.Graph({ multigraph: true })
  g.setGraph({
    rankdir,
    nodesep: rankdir === "LR" ? 28 : 20,
    ranksep: rankdir === "LR" ? 110 : 70,
    marginx: 8,
    marginy: 8,
  })
  g.setDefaultEdgeLabel(() => ({}))
  // dagre writes x/y into the label it's given: never share the size object.
  for (const n of nodes) g.setNode(n.id, { ...sizeOf(n) })
  for (const e of edges) {
    // Traffic pulls harder than membership, so talking containers sit close.
    const kind = (e.data as FlowData | undefined)?.kind
    g.setEdge(e.source, e.target, { weight: kind === "traffic" ? 3 : 1 }, e.id)
  }
  dagre.layout(g)
  return nodes.map((n) => {
    const p = g.node(n.id)
    const s = sizeOf(n)
    return { ...n, position: { x: p.x - s.width / 2, y: p.y - s.height / 2 } }
  })
}

// --- Nodes -------------------------------------------------------------------

function Ports({ vertical }: { vertical: boolean }) {
  return (
    <>
      <Handle
        type="target"
        position={vertical ? Position.Top : Position.Left}
        isConnectable={false}
        className="opacity-0"
      />
      <Handle
        type="source"
        position={vertical ? Position.Bottom : Position.Right}
        isConnectable={false}
        className="opacity-0"
      />
    </>
  )
}

const toneBorder = {
  destructive: "border-destructive/50",
  warning: "border-warning/50",
  success: "border-border",
  muted: "border-dashed border-mist",
  brand: "border-border",
}

const barTone = {
  brand: "bg-brand",
  warning: "bg-warning",
  destructive: "bg-destructive",
}

function ContainerNode({ data, selected }: NodeProps) {
  const { c, cores, vertical } = data as ContainerData
  const tone = containerTone(c)
  const running = c.state === "running"
  const share = cores > 0 ? c.cpu / cores : c.cpu
  const cpuTone =
    share >= 90 ? "destructive" : share >= 70 ? "warning" : ("brand" as const)
  const label = stateMeta[c.state]?.label ?? c.state
  return (
    <div
      style={{ width: CONTAINER.width, height: CONTAINER.height }}
      className={cn(
        "flex cursor-pointer flex-col gap-1 rounded-2xl border bg-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md",
        toneBorder[tone],
        !running && "bg-subtle",
        selected && "border-brand ring-3 ring-brand/20",
      )}
    >
      <Ports vertical={vertical} />
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
      </div>
      <p className="truncate font-mono text-caption tracking-normal text-ash">
        {c.image}
      </p>
      <div className="mt-auto flex items-center gap-2 text-caption text-muted-foreground tabular-nums">
        {running ? (
          <>
            <span className="truncate">Up {upFor(c.started_at)}</span>
            {c.measured && (
              <>
                <span className="ms-auto shrink-0">{pct(c.cpu)}</span>
                <span className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      barTone[cpuTone],
                    )}
                    style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                  />
                </span>
              </>
            )}
          </>
        ) : (
          <span className="truncate">
            {label}
            {c.finished_at && ` · ${upFor(c.finished_at)} ago`}
          </span>
        )}
      </div>
    </div>
  )
}

function NetworkNode({ data, selected }: NodeProps) {
  const { n, members, vertical } = data as NetworkData
  return (
    <div
      style={{ width: NETWORK.width, height: NETWORK.height }}
      className={cn(
        "flex cursor-default items-center gap-2.5 rounded-full border border-border bg-subtle ps-2 pe-4 shadow-sm",
        selected && "border-brand ring-3 ring-brand/20",
      )}
    >
      <Ports vertical={vertical} />
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
        <Network className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1 text-body-sm font-medium">
          <span className="truncate">{n.name}</span>
          {n.internal && (
            <Lock aria-label="Internal" className="size-3 shrink-0 text-ash" />
          )}
        </span>
        <span className="truncate font-mono text-caption tracking-normal text-ash">
          {n.subnet || n.driver} · {members}
        </span>
      </span>
    </div>
  )
}

function EndpointNode({ data }: NodeProps) {
  const d = data as EndpointData
  const vertical = d.vertical
  const Icon = d.kind === "host" ? Server : Globe
  return (
    <div
      style={{ width: ENDPOINT.width, height: ENDPOINT.height }}
      className="flex cursor-default items-center gap-2.5 rounded-2xl border border-border bg-card px-2 shadow-sm"
    >
      <Ports vertical={vertical} />
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          d.kind === "host"
            ? "bg-brand-soft text-brand-strong"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" strokeWidth={1.5} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm font-medium">{d.title}</span>
        <span className="truncate text-caption text-ash">{d.sub}</span>
      </span>
    </div>
  )
}

// --- Edges -------------------------------------------------------------------

const stroke: Record<FlowKind, string> = {
  traffic: "var(--color-brand)",
  published: "var(--color-muted-foreground)",
  member: "var(--color-mist)",
  shared: "var(--color-ash)",
}

function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps<Edge<FlowData>>) {
  const [path, x, y] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  if (!data) return null
  const width = data.kind === "traffic" ? 1 + data.weight : 1.5
  const label = data.kind === "member" ? (data.ip ?? "") : linkLabel(data)
  // Moving dots show the direction; busier lines get more of them.
  const dots = data.kind === "traffic" ? Math.min(3, data.weight) : 0
  const speed = Math.max(1.6, 4 - data.weight * 0.6)
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: stroke[data.kind],
          strokeWidth: width,
          strokeDasharray:
            data.kind === "published"
              ? "6 4"
              : data.kind === "member"
                ? "2 4"
                : data.kind === "shared"
                  ? "4 3"
                  : undefined,
          strokeLinecap: "round",
          ...style,
        }}
      />
      {Array.from({ length: dots }, (_, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed dots
          key={i}
          r={2 + data.weight * 0.4}
          className="fill-brand motion-reduce:hidden"
          style={{ opacity: style?.opacity }}
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
              "pointer-events-none absolute rounded-full border bg-card px-2 font-mono text-caption tracking-normal whitespace-nowrap shadow-sm",
              data.kind === "traffic"
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

const nodeTypes = {
  container: ContainerNode,
  network: NetworkNode,
  endpoint: EndpointNode,
}
const edgeTypes = { flow: FlowEdge }

// --- Canvas ------------------------------------------------------------------

export function Topology(props: TopologyProps) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  )
}

type TopologyProps = {
  report: DockerReport
  server: string
  phone: boolean
  stopped: boolean
  // Full screen layers can pan and zoom with a finger; the page's card can't.
  interactive?: boolean
}

function Flow({ report, server, phone, stopped, interactive }: TopologyProps) {
  const router = useRouter()
  const flow = useReactFlow()
  const graph = buildTopology(report, { stopped, phone })
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [hoverEdge, setHoverEdge] = useState<string | null>(null)
  const structure = useRef("")
  const fitted = useRef("")

  // A refresh keeps the layout (and anything dragged) while the same nodes
  // show; new or gone containers lay it out again.
  useEffect(() => {
    const same = structure.current === graph.structure
    structure.current = graph.structure
    setNodes((prev) => {
      if (!same) return graph.nodes
      const at = new Map(prev.map((n) => [n.id, n.position]))
      return graph.nodes.map((n) => ({
        ...n,
        position: at.get(n.id) ?? n.position,
      }))
    })
  }, [graph.nodes, graph.structure, setNodes])

  const stored = useStore((s) => s.nodes)
  const measured = useNodesInitialized()
  useEffect(() => {
    const ids = stored
      .map((n) => n.id)
      .sort()
      .join()
    if (!measured || !ids || ids === fitted.current) return
    fitted.current = ids
    flow.fitView({ padding: 0.12, maxZoom: 1 })
  }, [stored, measured, flow])

  const near = (() => {
    if (!hoverNode) return null
    const set = new Set([hoverNode])
    for (const e of graph.edges) {
      if (e.source === hoverNode) set.add(e.target)
      if (e.target === hoverNode) set.add(e.source)
    }
    return set
  })()

  const shownNodes = nodes.map((n) => ({
    ...n,
    className:
      near && !near.has(n.id)
        ? "opacity-25 transition-opacity"
        : "transition-opacity",
  }))
  const shownEdges = graph.edges.map((e): Edge<FlowData> => {
    const active =
      e.id === hoverEdge || e.source === hoverNode || e.target === hoverNode
    const dim = !!near && !active
    const kind = e.data?.kind
    return {
      ...e,
      data: {
        ...(e.data as FlowData),
        showLabel:
          active || (!dim && (kind === "traffic" || kind === "published")),
      },
      style: { opacity: dim ? 0.12 : 1 },
      zIndex: kind === "traffic" ? 1 : 0,
    }
  })

  const empty = graph.nodes.length === 0

  return (
    <ReactFlow
      className="netmap"
      nodes={shownNodes}
      edges={shownEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange as (changes: NodeChange[]) => void}
      onNodeClick={(_, n) => {
        const d = n.data as NodeData
        if (d.kind === "container") router.push(containerHref(server, d.c.name))
      }}
      onNodeMouseEnter={(_, n) => setHoverNode(n.id)}
      onNodeMouseLeave={() => setHoverNode(null)}
      onEdgeMouseEnter={(_, e) => setHoverEdge(e.id)}
      onEdgeMouseLeave={() => setHoverEdge(null)}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return
        const id = (e.target as HTMLElement).dataset.id
        const node = nodes.find((n) => n.id === id)
        const d = node?.data as NodeData | undefined
        if (d?.kind === "container")
          router.push(containerHref(server, d.c.name))
      }}
      nodesDraggable={!phone}
      nodesConnectable={false}
      deleteKeyCode={null}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      // Inside the page the wheel scrolls the page; zoom with the buttons or
      // a pinch.
      zoomOnScroll={false}
      preventScrolling={!!interactive}
      panOnDrag={phone ? !!interactive : true}
      zoomOnPinch={phone ? !!interactive : true}
      zoomOnDoubleClick={!phone}
      minZoom={0.15}
      maxZoom={1.75}
      attributionPosition="top-right"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
      {!phone && <Controls showInteractive={false} />}
      {!phone && graph.nodes.length > 14 && (
        <MiniMap pannable zoomable ariaLabel="Map overview" />
      )}
      {empty && (
        <Panel position="top-center">
          <p className="rounded-lg border border-border bg-card px-3 py-1.5 text-body-sm text-muted-foreground shadow-sm">
            {stopped
              ? "No containers on this server."
              : "No container is running."}
          </p>
        </Panel>
      )}
      <Panel position={phone ? "bottom-left" : "bottom-center"}>
        <FlowLegend bytes={report.link_bytes} />
      </Panel>
    </ReactFlow>
  )
}

const legend: { kind: FlowKind; label: string; dash?: string }[] = [
  { kind: "traffic", label: "Open connections" },
  { kind: "published", label: "Published port", dash: "6 4" },
  { kind: "member", label: "On a network", dash: "2 4" },
]

export function FlowLegend({ bytes }: { bytes: boolean }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card px-3 py-1.5 text-caption tracking-normal text-muted-foreground shadow-sm">
      {legend.map((item) => (
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
              strokeDasharray={item.dash}
            />
          </svg>
          {item.label}
        </li>
      ))}
      <li className="text-ash">
        {bytes ? "Thicker = more bytes" : "Thicker = more connections"}
      </li>
    </ul>
  )
}
