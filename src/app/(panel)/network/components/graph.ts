import dagre from "@dagrejs/dagre"
import { type Edge, MarkerType, type Node } from "@xyflow/react"

import { statusMeta } from "@/app/(panel)/servers/components/meta"
import type { NetworkMap, NetworkServer, Reach, Subnet } from "@/lib/services"
import {
  type Filters,
  formatMs,
  internetHub,
  networkName,
  type Selection,
  serverText,
  type Tone,
} from "./meta"

export const NODE_WIDTH = 160
// The icon square at the top of a node; floating edges end at its border.
export const BOX = 88
const SERVER_HEIGHT = BOX + 48
const NETWORK_HEIGHT = 72 + 48

export type NodeBase = {
  text: string
  // Which way edges enter and leave.
  flow: "right" | "down" | "free"
  selection?: Selection
}
export type ServerData = NodeBase & { entry: NetworkServer }
export type NetData = NodeBase & { network: Subnet }
export type HubData = NodeBase

export type LinkData = {
  stroke: string
  dashed?: boolean
  dotted?: boolean
  label?: string
  // Show the label without hovering.
  showLabel?: boolean
  selection?: Selection
}

export type Graph = { nodes: Node[]; edges: Edge<LinkData>[] }

const strokes: Record<Tone, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  destructive: "var(--destructive)",
  muted: "var(--color-mist)",
}
const lineColor = "var(--color-ash)"
const vpnColor = "var(--color-brand)"

const sid = (id: string) => `s:${id}`
const nid = (id: string) => `n:${id}`

function serverNode(entry: NetworkServer, flow: NodeBase["flow"]): Node {
  return {
    id: sid(entry.server.id),
    type: "server",
    position: { x: 0, y: 0 },
    data: {
      entry,
      flow,
      text: serverText(entry),
      selection: { kind: "server", id: entry.server.id },
    } satisfies ServerData,
  }
}

function networkNode(network: Subnet, flow: NodeBase["flow"]): Node {
  return {
    id: nid(network.id),
    type: "network",
    position: { x: 0, y: 0 },
    data: {
      network,
      flow,
      text: `${networkName(network)} ${network.cidr} ${network.members
        .map((m) => m.ip)
        .join(" ")}`.toLowerCase(),
      selection: { kind: "network", id: network.id },
    } satisfies NetData,
  }
}

// Internet → networks → servers → their container networks: a left-to-right
// flow on desktop, top to bottom on a phone's tall screen.
export function networksGraph(
  map: NetworkMap,
  filters: Pick<Filters, "containers" | "ipv6">,
  phone: boolean,
): Graph {
  const flow = phone ? "down" : "right"
  const shown = map.networks.filter(
    (n) =>
      (filters.containers || n.kind !== "container") &&
      (filters.ipv6 || n.family !== "ipv6"),
  )
  const nodes: Node[] = []
  const edges: Edge<LinkData>[] = []

  const direct = shown.find((n) => n.kind === "internet")
  const routed = shown.filter((n) => n.internet)
  if (direct || routed.length > 0) {
    nodes.push(networkNode(direct ?? internetHub, flow))
  }
  for (const n of shown) {
    if (n.kind === "internet") continue
    nodes.push(networkNode(n, flow))
    if (n.internet) {
      edges.push({
        id: `gw:${n.id}`,
        type: "link",
        source: nid(internetHub.id),
        target: nid(n.id),
        data: {
          stroke: lineColor,
          label: n.gateways.length ? `via ${n.gateways.join(", ")}` : undefined,
        },
      })
    }
  }
  for (const entry of map.servers) nodes.push(serverNode(entry, flow))

  for (const n of shown) {
    const ips = new Map<string, string[]>()
    for (const m of n.members) {
      ips.set(m.server_id, [...(ips.get(m.server_id) ?? []), m.ip])
    }
    for (const [server, list] of ips) {
      const toContainer = n.kind === "container"
      edges.push({
        id: `m:${n.id}:${server}`,
        type: "link",
        source: toContainer ? sid(server) : nid(n.id),
        target: toContainer ? nid(n.id) : sid(server),
        data: {
          stroke: n.kind === "vpn" ? vpnColor : lineColor,
          dashed: toContainer,
          label: list.join(", "),
        },
      })
    }
  }
  return { nodes: place(nodes, edges, phone ? "TB" : "LR"), edges }
}

function place(nodes: Node[], edges: Edge[], rankdir: "LR" | "TB") {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir,
    nodesep: rankdir === "LR" ? 24 : 16,
    ranksep: rankdir === "LR" ? 120 : 72,
  })
  g.setDefaultEdgeLabel(() => ({}))
  for (const n of nodes) {
    g.setNode(n.id, {
      width: NODE_WIDTH,
      height: n.type === "server" ? SERVER_HEIGHT : NETWORK_HEIGHT,
    })
  }
  for (const e of edges) g.setEdge(e.source, e.target)

  // A server on no shown network still belongs in the servers' column.
  const anchor = nodes.find((n) => n.type === "network")
  if (anchor) {
    const linked = new Set(edges.flatMap((e) => [e.source, e.target]))
    for (const n of nodes) {
      if (n.type === "server" && !linked.has(n.id)) {
        g.setEdge(anchor.id, n.id)
      }
    }
  }

  dagre.layout(g)
  return nodes.map((n) => {
    const p = g.node(n.id)
    return {
      ...n,
      position: { x: p.x - p.width / 2, y: p.y - p.height / 2 },
    }
  })
}

function onCircle(i: number, count: number, radius: number) {
  const angle = -Math.PI / 2 + (i / count) * 2 * Math.PI
  return {
    x: radius * Math.cos(angle) - NODE_WIDTH / 2,
    y: radius * Math.sin(angle) - BOX / 2,
  }
}

const circleRadius = (count: number) =>
  Math.max(count <= 2 ? 160 : 240, (count * 190) / (2 * Math.PI))

type Pair = { from: string; to: string; ab?: Reach; ba?: Reach }

// One line per pair of servers, however the two directions turned out.
function pairs(links: Reach[]) {
  const byKey = new Map<string, Pair>()
  for (const l of links) {
    const [a, b] = l.from < l.to ? [l.from, l.to] : [l.to, l.from]
    const key = `${a}|${b}`
    const pair = byKey.get(key) ?? { from: a, to: b }
    if (l.from === a) pair.ab = l
    else pair.ba = l
    byKey.set(key, pair)
  }
  return [...byKey.values()]
}

function pairTone(pair: Pair): Tone | null {
  const tested = [pair.ab, pair.ba]
    .map((l) => l?.status)
    .filter((s) => s && s !== "unknown")
  if (tested.length === 0) return null
  if (tested.every((s) => s === "open")) return "success"
  if (tested.every((s) => s === "blocked")) return "destructive"
  return "warning"
}

const bestPing = (pair: Pair) => {
  const list = [pair.ab?.ping_ms, pair.ba?.ping_ms].filter(
    (ms): ms is number => ms != null,
  )
  return list.length ? Math.min(...list) : undefined
}

// Every server around a circle, a line between each pair that was tested. An
// arrow means only that direction connects.
export function reachGraph(
  map: NetworkMap,
  filters: Pick<Filters, "problems">,
): Graph {
  const count = map.servers.length
  const radius = circleRadius(count)
  const nodes = map.servers.map((entry, i) => ({
    ...serverNode(entry, "free"),
    position: onCircle(i, count, radius),
  }))
  const edges: Edge<LinkData>[] = []
  for (const pair of pairs(map.links)) {
    const tone = pairTone(pair)
    if (!tone || (filters.problems && tone === "success")) continue
    const stroke = strokes[tone]
    const oneWay = pair.ab?.status !== pair.ba?.status
    const arrow = { type: MarkerType.ArrowClosed, color: stroke }
    const ping = bestPing(pair)
    edges.push({
      id: `r:${pair.from}:${pair.to}`,
      type: "float",
      source: sid(pair.from),
      target: sid(pair.to),
      markerEnd: oneWay && pair.ab?.status === "open" ? arrow : undefined,
      markerStart: oneWay && pair.ba?.status === "open" ? arrow : undefined,
      data: {
        stroke,
        dashed: tone === "destructive",
        label: ping != null ? formatMs(ping) : undefined,
        showLabel: count <= 6,
        selection: { kind: "link", from: pair.from, to: pair.to },
      },
    })
  }
  return { nodes, edges }
}

const statusTone = {
  online: "success",
  unknown: "muted",
  auth_failed: "warning",
  unreachable: "destructive",
  host_key_mismatch: "destructive",
  error: "destructive",
} as const

// Morche in the middle: how it, not the servers, gets to each one.
export function morchehGraph(
  map: NetworkMap,
  filters: Pick<Filters, "problems">,
): Graph {
  const shown = map.servers.filter(
    (s) => !filters.problems || s.server.status !== "online",
  )
  const radius = circleRadius(shown.length)
  const nodes: Node[] = [
    {
      id: "morcheh",
      type: "hub",
      position: { x: -NODE_WIDTH / 2, y: -BOX / 2 },
      data: { flow: "free", text: "morcheh" } satisfies HubData,
    },
    ...shown.map((entry, i) => ({
      ...serverNode(entry, "free"),
      position: onCircle(i, shown.length, radius),
    })),
  ]
  const edges: Edge<LinkData>[] = shown.map(({ server: s }) => {
    const tone = statusTone[s.status]
    return {
      id: `m:${s.id}`,
      type: "float",
      source: "morcheh",
      target: sid(s.id),
      data: {
        stroke: strokes[tone],
        dashed: tone === "destructive",
        dotted: s.status === "unknown",
        label:
          s.status === "online"
            ? s.latency_ms != null
              ? `${s.latency_ms} ms`
              : undefined
            : statusMeta[s.status].label,
        showLabel: shown.length <= 12,
        selection: { kind: "server", id: s.id },
      },
    }
  })
  return { nodes, edges }
}
