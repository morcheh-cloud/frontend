"use client"

import "@xyflow/react/dist/style.css"

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
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
import { Info, RotateCcw, Unplug } from "lucide-react"
import { useRouter } from "next/navigation"
import { parseAsBoolean, parseAsStringLiteral, useQueryStates } from "nuqs"
import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import {
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { DockerReport } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  DetailsBody,
  DetailsHeader,
  type Picked,
  pickedTitle,
} from "./map-details"
import {
  buildMap,
  type FlowData,
  type FlowKind,
  type MapView,
  type NodeData,
} from "./map-graph"
import { edgeTypes, MapLegend, nodeTypes } from "./map-parts"
import { containerHref } from "./meta"

// The Dashboard's Map tab: the environment's containers three ways (who
// talks to whom, by compose project, by network), with search, a details
// panel for whatever you pick, and a canvas as tall as the window.

const views = ["traffic", "projects", "networks"] as const
export const mapParsers = {
  view: parseAsStringLiteral(views).withDefault("traffic"),
  all: parseAsBoolean.withDefault(false),
}

export function ContainerMap(props: MapProps) {
  return (
    <ReactFlowProvider>
      <MapCanvas {...props} />
    </ReactFlowProvider>
  )
}

type MapProps = {
  report: DockerReport
  server: string
  phone: boolean
}

// Fills the window from where the map starts down to the bottom (above the
// phone tab bar), never shorter than a usable map.
function useFillHeight(phone: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState<number | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      setTop(el.getBoundingClientRect().top + window.scrollY)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])
  // Inline styles can't use Tailwind's --spacing() function.
  const bottom = phone
    ? "(var(--spacing) * 16 + env(safe-area-inset-bottom))"
    : "(var(--spacing) * 6)"
  const height =
    top === null
      ? "36rem"
      : `max(${phone ? "24rem" : "30rem"}, calc(100dvh - ${top}px - ${bottom}))`
  return { ref, height }
}

// Fits the map once its nodes are measured, and again when the set of nodes
// changes. Its own component: reading the store in MapCanvas would re-render
// it on every store sync, and its fresh `nodes` would sync the store again.
// Room around the map for the panels laid over it (quiet note and controls
// on top, legend at the bottom).
function fitPadding(phone: boolean) {
  return phone
    ? ({ top: "64px", bottom: "16px", left: "16px", right: "16px" } as const)
    : ({ top: "64px", bottom: "72px", left: "56px", right: "32px" } as const)
}

function FitOnLoad({
  fitted,
  phone,
}: {
  fitted: RefObject<string>
  phone: boolean
}) {
  const flow = useReactFlow()
  const ids = useStore((s) =>
    s.nodes
      .map((n) => n.id)
      .sort()
      .join(),
  )
  const measured = useNodesInitialized()
  useEffect(() => {
    if (!measured || !ids || ids === fitted.current) return
    fitted.current = ids
    flow.fitView({ padding: fitPadding(phone), maxZoom: 1 })
  }, [ids, measured, flow, fitted, phone])
  return null
}

function MapCanvas({ report, server, phone }: MapProps) {
  const router = useRouter()
  const flow = useReactFlow()
  const [{ view, all }, setFilters] = useQueryStates(mapParsers, {
    history: "replace",
  })
  const [q, setQ] = useState("")
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [sheet, setSheet] = useOpen("docker-map-details")
  const [hover, setHover] = useState<string | null>(null)
  const [moved, setMoved] = useState(false)
  const fill = useFillHeight(phone)

  const graph = buildMap(report, { view, all, phone })
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const structure = useRef("")
  const fitted = useRef("")

  // A refresh keeps the layout (and anything dragged) while the same nodes
  // show; new or gone containers lay it out again.
  // Keyed on the inputs, not on `graph`: that's a fresh object every render.
  useEffect(() => {
    const next = buildMap(report, { view, all, phone })
    const same = structure.current === next.structure
    structure.current = next.structure
    if (!same) setMoved(false)
    setNodes((prev) => {
      if (!same) return next.nodes
      const at = new Map(prev.map((n) => [n.id, n.position]))
      return next.nodes.map((n) => ({
        ...n,
        position: at.get(n.id) ?? n.position,
      }))
    })
  }, [report, view, all, phone, setNodes])

  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const picked = pickedId ? toPicked(byId.get(pickedId)) : null

  // What lights up: the picked (or hovered) node and everything it's wired
  // to; a box lights up with its containers and the ones they talk to.
  const focus = pickedId ?? hover
  const focusNode = focus ? byId.get(focus) : undefined
  const focusKind = (focusNode?.data as NodeData | undefined)?.kind
  const seed = new Set<string>()
  if (focusNode) {
    seed.add(focusNode.id)
    if (focusKind === "group") {
      for (const n of graph.nodes)
        if (n.parentId === focusNode.id) seed.add(n.id)
    }
  }
  const near = (() => {
    if (!focusNode) return null
    const set = new Set(seed)
    for (const e of graph.edges) {
      if (seed.has(e.source)) set.add(e.target)
      if (seed.has(e.target)) set.add(e.source)
    }
    for (const id of [...set]) {
      const parent = byId.get(id)?.parentId
      if (parent) set.add(parent)
    }
    return set
  })()
  const needle = q.trim().toLowerCase()
  const matches = (() => {
    if (!needle) return null
    const set = new Set<string>()
    for (const n of graph.nodes) {
      const d = n.data as NodeData
      if (d.kind !== "container") continue
      const c = d.c
      const hay = `${c.name} ${c.image} ${c.project ?? ""} ${c.service ?? ""}`
      if (hay.toLowerCase().includes(needle)) {
        set.add(n.id)
        if (n.parentId) set.add(n.parentId)
      }
    }
    return set
  })()
  const firstMatch = matches
    ? graph.nodes.find((n) => n.type === "container" && matches.has(n.id))
    : undefined

  const shownNodes = nodes.map((n) => {
    const dim =
      (near && !near.has(n.id)) ||
      (matches && n.type !== "endpoint" && !matches.has(n.id))
    return {
      ...n,
      selected: n.id === pickedId,
      className: cn("transition-opacity", dim && "opacity-25"),
    }
  })
  // In the boxes, lines show only while something is in focus: a box's
  // lines to other boxes, or a container's own lines. Ports and numbers show
  // on the lines in focus only, so labels never pile up.
  const grouped = graph.onFocus
  const shownEdges = graph.edges.map((e): Edge<FlowData> => {
    const d = e.data as FlowData
    const touches = seed.has(e.source) || seed.has(e.target)
    const own = d.level === "container"
    const hidden =
      grouped &&
      !(
        touches && (own ? focusKind === "container" : focusKind !== "container")
      )
    const hot = touches && !hidden
    const dim =
      (!!focusNode && !hot) ||
      (!!matches && !matches.has(e.source) && !matches.has(e.target))
    return {
      ...e,
      hidden,
      // Above the boxes, under the container cards.
      zIndex: grouped && own ? 1 : 0,
      data: { ...d, hot, dim, showLabel: hot },
    }
  })
  const kinds = new Set<FlowKind>(
    graph.edges.map((e) => (e.data as FlowData).kind),
  )

  const pick = (id: string | null, zoom = false) => {
    setPickedId(id)
    if (phone) setSheet(!!id)
    if (!id || !zoom) return
    const n = byId.get(id)
    if (!n) return
    flow.fitView({
      nodes: [{ id }],
      duration: 350,
      maxZoom: n.type === "group" ? 1 : 1.15,
      padding: phone ? 0.3 : 0.9,
    })
  }

  const empty = graph.nodes.length === 0
  const quiet = view === "traffic" ? graph.quiet : 0

  const toolbar = (
    <Toolbar
      phone={phone}
      view={view}
      all={all}
      q={q}
      counts={graph.counts}
      moved={moved}
      onView={(v) => {
        pick(null)
        setFilters({ view: v })
      }}
      onAll={(v) => setFilters({ all: v })}
      onQ={setQ}
      onFind={() => firstMatch && pick(firstMatch.id, true)}
      matches={
        matches
          ? graph.nodes.filter(
              (n) => n.type === "container" && matches.has(n.id),
            ).length
          : null
      }
      onReset={() => {
        setNodes(graph.nodes)
        setMoved(false)
        fitted.current = ""
        requestAnimationFrame(() =>
          flow.fitView({
            padding: fitPadding(phone),
            maxZoom: 1,
            duration: 300,
          }),
        )
      }}
    />
  )

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {toolbar}
      <div
        ref={fill.ref}
        style={{ height: fill.height }}
        className={cn(
          "relative min-w-0 overflow-hidden bg-background [contain:inline-size]",
          phone ? "border-y border-border" : "rounded-2xl border border-border",
        )}
      >
        <ReactFlow
          className="netmap"
          nodes={shownNodes}
          edges={shownEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={(changes: NodeChange[]) => {
            if (changes.some((c) => c.type === "position" && c.dragging)) {
              setMoved(true)
            }
            onNodesChange(changes)
          }}
          onNodeClick={(_, n) => pick(n.id === pickedId ? null : n.id)}
          onNodeDoubleClick={(_, n) => {
            const d = n.data as NodeData
            if (d.kind === "container") {
              router.push(containerHref(server, d.c.name))
            }
          }}
          onPaneClick={() => pick(null)}
          onNodeMouseEnter={(_, n) => !phone && setHover(n.id)}
          onNodeMouseLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") pick(null)
            if (e.key !== "Enter") return
            const id = (e.target as HTMLElement).dataset.id
            if (id && byId.has(id)) pick(id, true)
          }}
          nodesDraggable={!phone}
          nodesConnectable={false}
          elementsSelectable={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          zoomOnDoubleClick={false}
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-right"
        >
          <FitOnLoad fitted={fitted} phone={phone} />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
          <Controls
            showInteractive={false}
            position={phone ? "top-right" : "bottom-left"}
          />
          {empty && (
            <Panel position="top-center">
              <EmptyMap
                view={view}
                all={all}
                onProjects={() => setFilters({ view: "projects" })}
              />
            </Panel>
          )}
          {!empty && quiet > 0 && (
            <Panel position="top-left">
              <button
                type="button"
                onClick={() => setFilters({ view: "projects" })}
                className="flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card/95 px-3 text-caption text-muted-foreground shadow-sm backdrop-blur outline-none hover:text-brand focus-visible:text-brand"
              >
                <Unplug className="size-3.5" />
                {quiet} container{quiet === 1 ? "" : "s"} not talking to others
                · <span className="font-medium text-brand">See by project</span>
              </button>
            </Panel>
          )}
          {report.links_state !== "read" && (
            <Panel position="top-center">
              <p className="flex max-w-md items-start gap-1.5 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-caption text-muted-foreground shadow-sm">
                <Info className="mt-px size-3.5 shrink-0" />
                {report.links_note ||
                  (report.links_state === "unavailable"
                    ? "Connections between containers couldn't be read."
                    : "Some containers' connections couldn't be read.")}
              </p>
            </Panel>
          )}
          {!phone && (
            <Panel position="bottom-center">
              <MapLegend
                bytes={report.link_bytes}
                shared={view === "networks" ? undefined : graph.shared}
                kinds={kinds}
                hint={
                  graph.onFocus
                    ? "Point at a box or a container to see its lines"
                    : undefined
                }
              />
            </Panel>
          )}
        </ReactFlow>
        {!phone && picked && (
          <aside
            aria-label={`About ${pickedTitle(picked)}`}
            className="absolute inset-y-3 end-3 z-10 flex w-80 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-md"
          >
            <div className="border-b border-border px-4 py-3">
              <DetailsHeader picked={picked} onClose={() => pick(null)} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <DetailsBody
                picked={picked}
                report={report}
                server={server}
                phone={false}
                onPick={(id) => pick(id, true)}
              />
            </div>
          </aside>
        )}
      </div>
      {phone && (
        <div className="px-4">
          <MapLegend
            bytes={report.link_bytes}
            shared={view === "networks" ? undefined : graph.shared}
            kinds={kinds}
            hint={
              graph.onFocus
                ? "Tap a box or a container to see its lines"
                : undefined
            }
          />
        </div>
      )}
      {phone && (
        <BottomSheet
          open={sheet && !!picked}
          onOpenChange={(open) => {
            setSheet(open)
            if (!open) setPickedId(null)
          }}
          title={picked ? pickedTitle(picked) : "Details"}
          hideTitle
          header={
            picked && (
              <div className="px-4 pt-1 pb-3">
                <DetailsHeader picked={picked} onClose={() => pick(null)} />
              </div>
            )
          }
        >
          {picked && (
            <div className="px-4 pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]">
              <DetailsBody
                picked={picked}
                report={report}
                server={server}
                phone
                onPick={(id) => {
                  setPickedId(id)
                  const n = byId.get(id)
                  if (n) {
                    flow.fitView({
                      nodes: [{ id }],
                      duration: 350,
                      maxZoom: 1.15,
                      padding: 0.3,
                    })
                  }
                }}
              />
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  )
}

function toPicked(n: Node | undefined): Picked | null {
  if (!n) return null
  const d = n.data as NodeData
  if (d.kind === "container") return { type: "container", c: d.c }
  if (d.kind === "group") return { type: "group", g: d }
  return { type: "endpoint", e: d }
}

const viewLabels: Record<MapView, string> = {
  traffic: "Traffic",
  projects: "Projects",
  networks: "Networks",
}

function Toolbar({
  phone,
  view,
  all,
  q,
  counts,
  moved,
  matches,
  onView,
  onAll,
  onQ,
  onFind,
  onReset,
}: {
  phone: boolean
  view: MapView
  all: boolean
  q: string
  counts: ReturnType<typeof buildMap>["counts"]
  moved: boolean
  matches: number | null
  onView: (v: MapView) => void
  onAll: (v: boolean) => void
  onQ: (v: string) => void
  onFind: () => void
  onReset: () => void
}) {
  const search = (
    <SearchBox
      value={q}
      onChange={onQ}
      placeholder="Find a container"
      label="Find a container on the map"
      className={phone ? "min-w-0 flex-1" : "md:w-60"}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onFind()
        }
      }}
    />
  )
  const viewPicker = (
    <Segmented
      label="Map view"
      items={views.map((v) => ({ value: v, label: viewLabels[v] }))}
      value={view}
      onChange={onView}
    />
  )
  const show = (
    <Segmented
      label="Containers on the map"
      items={[
        { value: "running", label: "Running" },
        { value: "all", label: "All" },
      ]}
      value={all ? "all" : "running"}
      onChange={(v) => onAll(v === "all")}
    />
  )
  const caption = (
    <span className="text-caption whitespace-nowrap text-muted-foreground tabular-nums">
      {matches !== null
        ? `${matches} match${matches === 1 ? "" : "es"}`
        : `${counts.containers} containers · ${counts.links} link${
            counts.links === 1 ? "" : "s"
          } · ${counts.connections} connections`}
    </span>
  )
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4">
        {search}
        <div className="-mx-4 no-scrollbar flex items-center gap-2 overflow-x-auto px-4">
          {viewPicker}
          {show}
        </div>
        {caption}
      </div>
    )
  }
  return (
    <div className="@container flex min-w-0 flex-wrap items-center gap-2">
      {viewPicker}
      {show}
      {search}
      <span className="ms-auto flex items-center gap-2">
        {caption}
        {moved && (
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw />
            Reset layout
          </Button>
        )}
      </span>
    </div>
  )
}

function EmptyMap({
  view,
  all,
  onProjects,
}: {
  view: MapView
  all: boolean
  onProjects: () => void
}) {
  return (
    <div className="mt-16 flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-sm">
      <Unplug className="size-6 text-ash" />
      <p className="text-body-sm font-medium">
        {view === "traffic"
          ? "No container is talking right now"
          : all
            ? "No containers on this server"
            : "No container is running"}
      </p>
      {view === "traffic" && (
        <>
          <p className="text-caption text-muted-foreground">
            Lines appear when containers hold open connections to each other.
          </p>
          <Button size="sm" variant="outline" onClick={onProjects}>
            See them by project
          </Button>
        </>
      )}
    </div>
  )
}
