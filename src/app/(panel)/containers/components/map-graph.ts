import dagre from "@dagrejs/dagre"
import type { Edge, Node } from "@xyflow/react"

import type { DockerReport, DockerReportContainer } from "@/lib/services"
import { portLabel } from "./project-stats"

// The environment's containers as a graph, three ways:
// - traffic: only the containers that talk to each other, laid out by dagre
//   from left to right;
// - projects / networks: every container in one box per compose project (or
//   Docker network), the boxes packed in rows to the screen's shape. Lines
//   are there (box to box, one per pair, and each container's own) but show
//   only while a box or a container is in focus, so the map stays calm.
// Outside is never a node (it'd fan out to half the map): a container's
// card says it's published or talks to the internet. A network nearly every
// container shares draws no lines either: the legend names it once.

export type MapView = "traffic" | "projects" | "networks"

export const CONTAINER = { width: 212, height: 64 }
export const ENDPOINT = { width: 156, height: 52 }
const GROUP_HEAD = 52
const GROUP_PAD = 14
const GROUP_GAP = 12
const PACK_GAP = 40

export type ContainerData = {
  kind: "container"
  c: DockerReportContainer
  cores: number
  // Networks to name on the node: every one but the shared one.
  extra: string[]
  published: number
  // Open connections from / to addresses outside this server.
  inbound: number
  outbound: number
}
export type GroupData = {
  kind: "group"
  key: string
  by: "project" | "network"
  title: string
  ids: string[]
  running: number
  failing: number
  internal?: boolean
  // Open connections between its own containers (no line for those).
  inner: number
  // Other boxes it's wired to, and its containers published to the world.
  peers: number
  published: number
  width: number
  height: number
}
export type EndpointData = {
  kind: "host"
  title: string
  sub: string
}
export type NodeData = ContainerData | GroupData | EndpointData

export type FlowKind = "traffic" | "shared"

export type FlowData = {
  kind: FlowKind
  ports: string[]
  connections: number
  up: number
  down: number
  bytes: boolean
  peers: string[]
  // 1..4: line weight, from the traffic.
  weight: number
  // "group" = one line between two boxes, standing for its containers' lines
  // ("container"), which then show only while one of them is in focus.
  level: "group" | "container"
  // Lines of a laid out flow leave and enter on that axis only, so they run
  // with the layout instead of curling round the boxes.
  axis?: "x" | "y"
  showLabel?: boolean
  dim?: boolean
  hot?: boolean
}

export type MapGraph = {
  nodes: Node[]
  edges: Edge<FlowData>[]
  structure: string
  // Containers left off the traffic view: nothing in or out.
  quiet: number
  // The network (nearly) everyone shares, drawn as a note, not lines.
  shared?: { name: string; members: number }
  // Projects / networks: lines show only on focus.
  onFocus: boolean
  counts: {
    containers: number
    groups: number
    links: number
    connections: number
  }
}

export const cid = (id: string) => `c:${id}`
export const gid = (key: string) => `g:${key}`

function publishedOf(c: DockerReportContainer) {
  if (c.network_mode === "host") return 0
  return new Set(c.ports.filter((p) => p.public > 0).map(portLabel)).size
}

export function isUp(c: DockerReportContainer) {
  return c.state === "running" || c.state === "restarting"
}

function ownNetwork(mode: string) {
  return !(mode === "host" || mode === "none" || mode.startsWith("container:"))
}

// The network most containers are on, when it's at least half of them:
// lines to it would say nothing.
function sharedNetwork(list: DockerReportContainer[]) {
  const count = new Map<string, number>()
  for (const c of list) {
    if (!ownNetwork(c.network_mode)) continue
    for (const n of c.networks) {
      count.set(n.network, (count.get(n.network) ?? 0) + 1)
    }
  }
  let best: { name: string; members: number } | undefined
  for (const [name, members] of count) {
    if (!best || members > best.members) best = { name, members }
  }
  return best && best.members >= Math.max(3, list.length / 2) ? best : undefined
}

export function linkLabel(d: FlowData) {
  const parts: string[] = []
  if (d.ports.length) {
    parts.push(
      d.ports.slice(0, 3).join(", ") + (d.ports.length > 3 ? " …" : ""),
    )
  }
  if (d.kind === "traffic") parts.push(`${d.connections} conn`)
  return parts.join(" · ")
}

export function buildMap(
  report: DockerReport,
  { view, all, phone }: { view: MapView; all: boolean; phone: boolean },
): MapGraph {
  const shown = report.containers.filter((c) => all || isUp(c))
  const byId = new Map(shown.map((c) => [c.id, c]))
  const shared = sharedNetwork(shown)
  const blank = {
    ports: [],
    connections: 0,
    up: 0,
    down: 0,
    bytes: report.link_bytes,
    peers: [],
    weight: 1,
    level: "container" as const,
  }
  const edges: Edge<FlowData>[] = []
  const used = new Set<string>()

  // Traffic: one line per pair, ports and numbers added up. Outside is
  // counted on the container instead.
  const inbound = new Map<string, number>()
  const outbound = new Map<string, number>()
  const end = (who: string) =>
    who === "host" ? "host" : byId.has(who) ? cid(who) : null
  const pairs = new Map<string, Edge<FlowData>>()
  for (const l of report.links) {
    if (l.from === "outside" || l.to === "outside") {
      const [tally, who] =
        l.from === "outside" ? [inbound, l.to] : [outbound, l.from]
      tally.set(who, (tally.get(who) ?? 0) + l.connections)
      continue
    }
    const source = end(l.from)
    const target = end(l.to)
    if (!source || !target || source === target) continue
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

  // Host network, or another container's network.
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
      used.add(cid(c.id))
    } else if (mode.startsWith("container:")) {
      const ref = mode.slice("container:".length)
      const other = shown.find((o) => o.id.startsWith(ref) || o.name === ref)
      if (!other) continue
      edges.push({
        id: `s:${c.id}`,
        source: cid(other.id),
        target: cid(c.id),
        type: "flow",
        data: { ...blank, kind: "shared", ports: ["shares its network"] },
      })
      used.add(cid(c.id))
      used.add(cid(other.id))
    }
  }

  const traffic = [...pairs.values()]
  weigh(traffic, report.link_bytes)
  edges.push(...traffic)

  const containerNode = (c: DockerReportContainer): Node => ({
    id: cid(c.id),
    type: "container",
    position: { x: 0, y: 0 },
    data: {
      kind: "container",
      c,
      cores: report.cpus,
      extra: ownNetwork(c.network_mode)
        ? c.networks
            .map((n) => n.network)
            .filter((n) => n !== shared?.name && view !== "networks")
        : [],
      published: publishedOf(c),
      inbound: inbound.get(c.id) ?? 0,
      outbound: outbound.get(c.id) ?? 0,
    } satisfies ContainerData,
  })

  const endpointNodes: Node[] = used.has("host")
    ? [
        {
          id: "host",
          type: "endpoint",
          position: { x: 0, y: 0 },
          data: {
            kind: "host",
            title: "This server",
            sub: "The Docker host",
          } satisfies NodeData,
        },
      ]
    : []

  let nodes: Node[]
  let groups = 0
  let quiet = 0
  if (view === "traffic") {
    const talking = shown.filter((c) => used.has(cid(c.id)))
    quiet = shown.length - talking.length
    const axis = phone ? "y" : "x"
    for (const e of edges) (e.data as FlowData).axis = axis
    nodes = [...talking.map(containerNode), ...endpointNodes]
    nodes = placeFlow(nodes, edges, phone ? "TB" : "LR")
  } else {
    const grouped = groupBy(shown, view)
    groups = grouped.length
    const lifted = liftEdges(edges, grouped, report.link_bytes, phone)
    edges.push(...lifted.edges)
    nodes = placeGroups(
      grouped,
      lifted,
      containerNode,
      endpointNodes,
      view,
      report,
      phone,
    )
  }

  return {
    nodes,
    edges,
    structure: `${view}|${nodes
      .map((n) => n.id)
      .sort()
      .join()}`,
    quiet,
    shared,
    onFocus: view !== "traffic",
    counts: {
      containers: shown.length,
      groups,
      links: traffic.length,
      connections: traffic.reduce((n, e) => n + (e.data?.connections ?? 0), 0),
    },
  }
}

// Line weights 1..4 against the busiest line, by bytes when known.
function weigh(edges: Edge<FlowData>[], bytes: boolean) {
  const value = (d: FlowData) => (bytes ? d.up + d.down : d.connections)
  const top = Math.max(1, ...edges.map((e) => value(e.data as FlowData)))
  for (const e of edges) {
    const d = e.data as FlowData
    if (d.kind !== "traffic") continue
    d.weight = 1 + Math.round((Math.sqrt(value(d) / top) || 0) * 3)
  }
}

// --- Traffic: dagre ------------------------------------------------------

function sizeOf(n: Node) {
  return n.type === "container" ? CONTAINER : ENDPOINT
}

function placeFlow(nodes: Node[], edges: Edge[], rankdir: "LR" | "TB") {
  const ids = new Set(nodes.map((n) => n.id))
  const g = new dagre.graphlib.Graph({ multigraph: true })
  g.setGraph({
    rankdir,
    nodesep: rankdir === "LR" ? 28 : 20,
    ranksep: rankdir === "LR" ? 180 : 90,
    marginx: 8,
    marginy: 8,
  })
  g.setDefaultEdgeLabel(() => ({}))
  // dagre writes x/y into the label it's given: never share the size object.
  for (const n of nodes) g.setNode(n.id, { ...sizeOf(n) })
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue
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

// --- Projects / networks: boxes ------------------------------------------

type Group = {
  key: string
  title: string
  list: DockerReportContainer[]
  internal?: boolean
}

const NO_PROJECT = "\u0000none"

function groupBy(
  list: DockerReportContainer[],
  view: "projects" | "networks",
): Group[] {
  const members = new Map<string, number>()
  for (const c of list) {
    for (const n of c.networks) {
      members.set(n.network, (members.get(n.network) ?? 0) + 1)
    }
  }
  const keyOf = (c: DockerReportContainer): string => {
    if (view === "projects") return c.project || NO_PROJECT
    if (c.network_mode === "host") return "host"
    if (c.network_mode.startsWith("container:")) {
      const ref = c.network_mode.slice("container:".length)
      const other = list.find((o) => o.id.startsWith(ref) || o.name === ref)
      if (other && other !== c) return keyOf(other)
    }
    // On several: the smallest one says the most about it.
    const nets = [...c.networks].sort(
      (a, b) =>
        (members.get(a.network) ?? 0) - (members.get(b.network) ?? 0) ||
        a.network.localeCompare(b.network),
    )
    return nets[0]?.network || "none"
  }
  const map = new Map<string, Group>()
  for (const c of list) {
    const key = keyOf(c)
    let g = map.get(key)
    if (!g) {
      g = {
        key,
        title:
          key === NO_PROJECT
            ? "Not in a project"
            : key === "host" && view === "networks"
              ? "Host network"
              : key,
        list: [],
      }
      map.set(key, g)
    }
    g.list.push(c)
  }
  for (const g of map.values()) {
    g.list.sort(
      (a, b) =>
        Number(isUp(b)) - Number(isUp(a)) || a.name.localeCompare(b.name),
    )
  }
  return [...map.values()]
}

type Lifted = {
  edges: Edge<FlowData>[]
  // Connections inside each box, by its node id.
  inner: Map<string, number>
}

// The containers' lines added up per pair of boxes (or a box and Outside /
// the host): one line between two boxes, however many containers talk.
function liftEdges(
  edges: Edge<FlowData>[],
  groups: Group[],
  bytes: boolean,
  phone: boolean,
): Lifted {
  const boxOf = new Map<string, string>()
  for (const g of groups)
    for (const c of g.list) boxOf.set(cid(c.id), gid(g.key))
  const lift = (id: string) => boxOf.get(id) ?? id
  const rank: Record<FlowKind, number> = { traffic: 2, shared: 1 }
  const pairs = new Map<string, Edge<FlowData>>()
  const inner = new Map<string, number>()
  for (const e of edges) {
    const d = e.data as FlowData
    const source = lift(e.source)
    const target = lift(e.target)
    if (source === target) {
      inner.set(source, (inner.get(source) ?? 0) + d.connections)
      continue
    }
    const id = `g:${source}>${target}`
    let line = pairs.get(id)
    if (!line) {
      line = {
        id,
        source,
        target,
        type: "flow",
        data: {
          ...d,
          ports: [],
          peers: [],
          connections: 0,
          up: 0,
          down: 0,
          level: "group",
          axis: phone ? "y" : "x",
        },
      }
      pairs.set(id, line)
    }
    const sum = line.data as FlowData
    if (rank[d.kind] > rank[sum.kind]) sum.kind = d.kind
    for (const p of d.ports) if (!sum.ports.includes(p)) sum.ports.push(p)
    for (const p of d.peers) if (!sum.peers.includes(p)) sum.peers.push(p)
    sum.connections += d.connections
    sum.up += d.up
    sum.down += d.down
  }
  const lines = [...pairs.values()]
  weigh(lines, bytes)
  return { edges: lines, inner }
}

function columnsFor(n: number, phone: boolean) {
  if (phone) return n <= 3 ? 1 : 2
  return n <= 1 ? 1 : n <= 4 ? 2 : n <= 12 ? 3 : 4
}

type Placed = { id: string; x: number; y: number }
type Sized = { id: string; width: number; height: number }

// Rows of boxes no wider than `limit`, tallest first.
function shelves(boxes: Sized[], limit: number) {
  const at = new Map<string, Placed>()
  let x = 0
  let y = 0
  let row = 0
  let width = 0
  for (const b of boxes) {
    if (x > 0 && x + b.width > limit) {
      x = 0
      y += row + PACK_GAP
      row = 0
    }
    at.set(b.id, { id: b.id, x, y })
    width = Math.max(width, x + b.width)
    x += b.width + PACK_GAP
    row = Math.max(row, b.height)
  }
  return { at, width, height: y + row }
}

// The row width whose packing comes closest to the screen's shape (wide on
// a desktop, tall on a phone), so the map fits without shrinking to dots.
function pack(boxes: Sized[], aspect: number) {
  const widest = Math.max(0, ...boxes.map((b) => b.width))
  const total = boxes.reduce((n, b) => n + b.width + PACK_GAP, 0)
  let best: ReturnType<typeof shelves> | undefined
  let score = Number.POSITIVE_INFINITY
  for (let i = 0; i <= 48; i++) {
    const limit = widest + ((total - widest) * i) / 48
    const p = shelves(boxes, limit)
    const s = Math.abs(Math.log(p.width / Math.max(1, p.height) / aspect))
    if (s < score - 0.01) {
      best = p
      score = s
    }
  }
  return best ?? shelves(boxes, widest)
}

// Every box packed in rows, tallest first; the host (when a container uses
// its network) sits to the left of them.
function placeGroups(
  groups: Group[],
  lifted: Lifted,
  containerNode: (c: DockerReportContainer) => Node,
  endpoints: Node[],
  view: "projects" | "networks",
  report: DockerReport,
  phone: boolean,
) {
  const boxes = groups
    .map((g) => {
      const cols = Math.min(columnsFor(g.list.length, phone), g.list.length)
      const rows = Math.ceil(g.list.length / cols)
      return {
        id: gid(g.key),
        g,
        cols,
        width: GROUP_PAD * 2 + cols * CONTAINER.width + (cols - 1) * GROUP_GAP,
        height:
          GROUP_HEAD +
          GROUP_PAD +
          rows * CONTAINER.height +
          (rows - 1) * GROUP_GAP,
      }
    })
    .sort(
      (a, b) =>
        b.height - a.height ||
        b.width - a.width ||
        a.g.title.localeCompare(b.g.title),
    )
  const { at, height } = pack(boxes, phone ? 0.6 : 1.75)
  const peers = new Map<string, Set<string>>()
  for (const e of lifted.edges) {
    for (const [a, b] of [
      [e.source, e.target],
      [e.target, e.source],
    ]) {
      const set = peers.get(a) ?? new Set<string>()
      set.add(b)
      peers.set(a, set)
    }
  }

  const nodes: Node[] = []
  for (const box of boxes) {
    const { g, cols, id } = box
    const p = at.get(id) as Placed
    const net =
      view === "networks"
        ? report.networks.find((n) => n.name === g.key)
        : undefined
    nodes.push({
      id,
      type: "group",
      position: { x: p.x, y: p.y },
      width: box.width,
      height: box.height,
      data: {
        kind: "group",
        key: g.key,
        by: view === "projects" ? "project" : "network",
        title: g.title,
        ids: g.list.map((c) => c.id),
        running: g.list.filter(isUp).length,
        failing: g.list.filter(
          (c) =>
            c.health === "unhealthy" ||
            c.oom_killed ||
            c.state === "dead" ||
            c.state === "restarting" ||
            (c.state === "exited" && c.exit_code !== 0),
        ).length,
        internal: net?.internal,
        inner: lifted.inner.get(id) ?? 0,
        peers: peers.get(id)?.size ?? 0,
        published: g.list.filter((c) => publishedOf(c) > 0).length,
        width: box.width,
        height: box.height,
      } satisfies GroupData,
    })
    g.list.forEach((c, i) => {
      const col = i % cols
      const r = Math.floor(i / cols)
      nodes.push({
        ...containerNode(c),
        parentId: id,
        extent: "parent",
        position: {
          x: GROUP_PAD + col * (CONTAINER.width + GROUP_GAP),
          y: GROUP_HEAD + r * (CONTAINER.height + GROUP_GAP),
        },
      })
    })
  }
  for (const e of endpoints) {
    nodes.push({
      ...e,
      position: { x: -ENDPOINT.width - 96, y: (height - ENDPOINT.height) / 2 },
    })
  }
  return nodes
}

// Who a container talks to and who reaches it, by name, for the details.
export type Peer = {
  id: string
  name: string
  port: number
  connections: number
  up: number
  down: number
}

export function peersOf(report: DockerReport, id: string) {
  const name = (who: string) =>
    who === "outside"
      ? "Outside"
      : who === "host"
        ? "This server"
        : (report.containers.find((c) => c.id === who)?.name ??
          who.slice(0, 12))
  const out: Peer[] = []
  const into: Peer[] = []
  for (const l of report.links) {
    if (l.from === id) {
      out.push({
        id: l.to,
        name: name(l.to),
        port: l.port,
        connections: l.connections,
        up: l.up,
        down: l.down,
      })
    }
    if (l.to === id) {
      into.push({
        id: l.from,
        name: name(l.from),
        port: l.port,
        connections: l.connections,
        up: l.up,
        down: l.down,
      })
    }
  }
  const order = (a: Peer, b: Peer) =>
    b.up + b.down - (a.up + a.down) || b.connections - a.connections
  return { out: out.sort(order), into: into.sort(order) }
}
