"use client"

import "@xyflow/react/dist/style.css"

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type NodeChange,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
} from "@xyflow/react"
import { RotateCcw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import type { Graph, LinkData, NodeBase } from "./graph"
import { matches, type Selection } from "./meta"
import { FloatEdge, HubNode, LinkEdge, NetworkNode, ServerNode } from "./nodes"

const nodeTypes = { server: ServerNode, network: NetworkNode, hub: HubNode }
const edgeTypes = { link: LinkEdge, float: FloatEdge }

type Positions = Record<string, { x: number; y: number }>

const layoutKey = (view: string) => `morcheh.netmap.layout.${view}`

function loadLayout(view: string): Positions {
  try {
    return JSON.parse(localStorage.getItem(layoutKey(view)) ?? "{}")
  } catch {
    return {}
  }
}

function saveLayout(view: string, positions: Positions | null) {
  try {
    if (positions) {
      localStorage.setItem(layoutKey(view), JSON.stringify(positions))
    } else {
      localStorage.removeItem(layoutKey(view))
    }
  } catch {
    // Dragged nodes just won't be remembered.
  }
}

export type LegendItem = {
  label: string
  stroke: string
  dash?: string
}

export function Canvas(props: FlowProps) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  )
}

type FlowProps = {
  graph: Graph
  view: string
  phone: boolean
  query: string
  notice?: string
  legend: LegendItem[]
  onSelect: (selection: Selection) => void
}

function Flow({
  graph,
  view,
  phone,
  query,
  notice,
  legend,
  onSelect,
}: FlowProps) {
  const flow = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [hoverEdge, setHoverEdge] = useState<string | null>(null)
  const [moved, setMoved] = useState(false)
  const fitted = useRef("")

  // Phones can't drag nodes, and a desktop layout wouldn't fit them anyway.
  const place = useCallback(
    (list: Node[]) => {
      const saved = phone ? {} : loadLayout(view)
      setMoved(Object.keys(saved).length > 0)
      return list.map((n) =>
        saved[n.id] ? { ...n, position: saved[n.id] } : n,
      )
    },
    [phone, view],
  )

  useEffect(() => {
    setNodes(place(graph.nodes))
  }, [graph, place, setNodes])

  // Fit once React Flow has measured the nodes, and only when different things
  // show: a rescan keeps the user's viewport.
  const stored = useStore((s) => s.nodes)
  const measured = useNodesInitialized()
  useEffect(() => {
    const ids = stored.map((n) => n.id).join()
    if (!measured || !ids || ids === fitted.current) return
    fitted.current = ids
    flow.fitView({ padding: 0.15, maxZoom: 1 })
  }, [stored, measured, flow])

  const resetLayout = () => {
    saveLayout(view, null)
    setNodes(place(graph.nodes))
    flow.fitView({ padding: 0.15, maxZoom: 1, duration: 200 })
  }

  const remember = (_: unknown, __: Node, dragged: Node[]) => {
    const saved = loadLayout(view)
    for (const n of dragged) saved[n.id] = n.position
    saveLayout(view, saved)
    setMoved(true)
  }

  // Dim what isn't connected to the hovered node, or doesn't match the search.
  const near = useMemo(() => {
    if (!hoverNode) return null
    const set = new Set([hoverNode])
    for (const e of graph.edges) {
      if (e.source === hoverNode) set.add(e.target)
      if (e.target === hoverNode) set.add(e.source)
    }
    return set
  }, [hoverNode, graph.edges])

  const hits = useMemo(() => {
    if (!query.trim()) return null
    return new Set(
      nodes
        .filter((n) => matches((n.data as NodeBase).text, query))
        .map((n) => n.id),
    )
  }, [nodes, query])

  const shownNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        className:
          (near && !near.has(n.id)) || (hits && !hits.has(n.id))
            ? "opacity-25 transition-opacity"
            : "transition-opacity",
      })),
    [nodes, near, hits],
  )

  const shownEdges = useMemo(
    () =>
      graph.edges.map((e): Edge<LinkData> => {
        const active =
          e.id === hoverEdge || e.source === hoverNode || e.target === hoverNode
        const dim =
          (near && !active) ||
          (hits && !hits.has(e.source) && !hits.has(e.target))
        return {
          ...e,
          data: {
            ...(e.data as LinkData),
            showLabel: active || (!dim && e.data?.showLabel),
          },
          style: {
            opacity: dim ? 0.15 : 1,
            strokeWidth: active ? 2.5 : 1.5,
            cursor: e.data?.selection ? "pointer" : undefined,
          },
        }
      }),
    [graph.edges, hoverEdge, hoverNode, near, hits],
  )

  const open = (selection?: Selection) => {
    if (selection) onSelect(selection)
  }

  return (
    <ReactFlow
      className="netmap"
      nodes={shownNodes}
      edges={shownEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange as (changes: NodeChange[]) => void}
      onNodeClick={(_, n) => open((n.data as NodeBase).selection)}
      onEdgeClick={(_, e) => open((e.data as LinkData | undefined)?.selection)}
      onNodeMouseEnter={(_, n) => setHoverNode(n.id)}
      onNodeMouseLeave={() => setHoverNode(null)}
      onEdgeMouseEnter={(_, e) => setHoverEdge(e.id)}
      onEdgeMouseLeave={() => setHoverEdge(null)}
      onNodeDragStop={remember}
      onKeyDown={(e) => {
        // The keyboard path to a node's details: Tab to it, then Enter.
        if (e.key !== "Enter") return
        const id = (e.target as HTMLElement).dataset.id
        const node = nodes.find((n) => n.id === id)
        if (node) open((node.data as NodeBase).selection)
      }}
      nodesDraggable={!phone}
      nodesConnectable={false}
      deleteKeyCode={null}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      minZoom={0.1}
      maxZoom={2}
      attributionPosition="top-right"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
      {!phone && <Controls showInteractive={false} />}
      {!phone && <MiniMap pannable zoomable ariaLabel="Map overview" />}
      {moved && !phone && (
        <Panel position="top-left">
          <Button variant="outline" size="sm" onClick={resetLayout}>
            <RotateCcw />
            Reset layout
          </Button>
        </Panel>
      )}
      {notice && (
        <Panel position="top-center">
          <p className="rounded-lg border border-border bg-card px-3 py-1.5 text-body-sm text-muted-foreground shadow-sm">
            {notice}
          </p>
        </Panel>
      )}
      {legend.length > 0 && (
        <Panel position={phone ? "bottom-left" : "bottom-center"}>
          <Legend items={legend} />
        </Panel>
      )}
    </ReactFlow>
  )
}

function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card px-3 py-1.5 text-caption tracking-normal text-muted-foreground shadow-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <svg aria-hidden width="20" height="2" className="shrink-0">
            <line
              x1="0"
              y1="1"
              x2="20"
              y2="1"
              strokeWidth="2"
              stroke={item.stroke}
              strokeDasharray={item.dash}
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  )
}
