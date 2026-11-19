"use client"

import "@xyflow/react/dist/style.css"

import dagre from "@dagrejs/dagre"
import {
  Background,
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react"
import { ArrowRight, Network, X } from "lucide-react"
import Link from "next/link"
import { parseAsString, useQueryState } from "nuqs"
import { useState } from "react"

import { Empty, SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { Asset, AssetRelation } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAssetRelations, useAssets } from "../api"
import {
  AssetIcon,
  assetHref,
  kindGroups,
  kindOf,
  relationLabel,
  statusOf,
  toneDot,
} from "./meta"
import { OwnerChip } from "./parts"
import { AssetsShell } from "./shell"

type AssetNodeData = { asset: Asset; dim: boolean; focus: boolean }

function AssetNode({ data }: NodeProps<Node<AssetNodeData>>) {
  const a = data.asset
  const s = statusOf(a)
  return (
    <div
      className={cn(
        "flex w-56 items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-sm transition-opacity",
        data.dim && "opacity-25",
        data.focus && "border-brand ring-2 ring-brand/25",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-1.5 !border-0 !bg-mist"
      />
      <AssetIcon asset={a} className="size-8 [&>svg]:size-4" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-medium">{a.name}</p>
        <p className="flex items-center gap-1.5 truncate text-caption text-muted-foreground">
          {s && (
            <span
              className={cn("size-1.5 shrink-0 rounded-full", toneDot[s.tone])}
            />
          )}
          {kindOf(a.kind).label}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-1.5 !border-0 !bg-mist"
      />
    </div>
  )
}

const nodeTypes = { asset: AssetNode }

const W = 224
const H = 52
const PER_ROW = 6

// Top to bottom with dagre (what things run on sits below them), then
// crowded layers are wrapped into rows so forty apps on one server don't
// make a line too wide to read.
function layout(ids: string[], rels: AssetRelation[]) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: "TB", nodesep: 16, ranksep: 80 })
  g.setDefaultEdgeLabel(() => ({}))
  for (const id of ids) g.setNode(id, { width: W, height: H })
  for (const r of rels) g.setEdge(r.from_id, r.to_id)
  dagre.layout(g)
  const ranks = new Map<number, { id: string; x: number }[]>()
  for (const id of ids) {
    const p = g.node(id)
    const y = Math.round(p?.y ?? 0)
    ranks.set(y, [...(ranks.get(y) ?? []), { id, x: p?.x ?? 0 }])
  }
  const out = new Map<string, { x: number; y: number }>()
  // Each layer in rows of PER_ROW, every row centred on the same axis.
  let top = 0
  for (const y of [...ranks.keys()].sort((a, b) => a - b)) {
    const row = (ranks.get(y) ?? []).sort((a, b) => a.x - b.x)
    for (let i = 0; i < row.length; i += PER_ROW) {
      const line = row.slice(i, i + PER_ROW)
      const width = line.length * (W + 16) - 16
      for (const [c, n] of line.entries())
        out.set(n.id, { x: -width / 2 + c * (W + 16), y: top })
      top += H + 16
    }
    top += 70
  }
  return out
}

// Everything reachable from `start` following relations one way.
function walk(start: string, rels: AssetRelation[], dir: "down" | "up") {
  const seen = new Set<string>()
  const queue = [start]
  while (queue.length) {
    const id = queue.shift() as string
    for (const r of rels) {
      const next =
        dir === "up"
          ? r.from_id === id
            ? r.to_id
            : null
          : r.to_id === id
            ? r.from_id
            : null
      if (next && !seen.has(next) && next !== start) {
        seen.add(next)
        queue.push(next)
      }
    }
  }
  return seen
}

export function MapView() {
  const phone = useIsPhone()
  const assets = useAssets()
  const rels = useAssetRelations()
  if (phone === null) return null
  return (
    <AssetsShell phone={phone} title="Map" section="map" className="pb-6">
      {assets.isPending || rels.isPending ? (
        <Skeleton className="h-[70vh] rounded-2xl" />
      ) : (
        <ReactFlowProvider>
          <MapBody
            assets={assets.data ?? []}
            rels={rels.data ?? []}
            phone={phone}
          />
        </ReactFlowProvider>
      )}
    </AssetsShell>
  )
}

function MapBody({
  assets,
  rels,
  phone,
}: {
  assets: Asset[]
  rels: AssetRelation[]
  phone: boolean
}) {
  const [focus, setFocus] = useQueryState(
    "focus",
    parseAsString.withDefault(""),
  )
  const [group, setGroup] = useState("")
  const [q, setQ] = useState("")

  const related = new Set(rels.flatMap((r) => [r.from_id, r.to_id]))
  const groupKinds = kindGroups.find((g) => g.key === group)?.kinds
  const shown = assets.filter(
    (a) =>
      related.has(a.id) &&
      (!groupKinds || groupKinds.includes(a.kind)) &&
      (!q || a.name.toLowerCase().includes(q.toLowerCase())),
  )
  const ids = new Set(shown.map((a) => a.id))
  const edgesIn = rels.filter((r) => ids.has(r.from_id) && ids.has(r.to_id))

  const up = focus ? walk(focus, rels, "up") : new Set<string>()
  const down = focus ? walk(focus, rels, "down") : new Set<string>()
  const lit = (id: string) =>
    !focus || id === focus || up.has(id) || down.has(id)

  const pos = layout(
    shown.map((a) => a.id),
    edgesIn,
  )
  const nodes: Node<AssetNodeData>[] = shown.map((a) => ({
    id: a.id,
    type: "asset",
    position: pos.get(a.id) ?? { x: 0, y: 0 },
    data: { asset: a, dim: !lit(a.id), focus: a.id === focus },
  }))
  const chain = focus ? [focus, ...up, ...down].filter((id) => ids.has(id)) : []
  const edges: Edge[] = edgesIn.map((r) => ({
    id: r.id,
    source: r.from_id,
    target: r.to_id,
    label:
      focus && lit(r.from_id) && lit(r.to_id)
        ? relationLabel(r.kind, true)
        : undefined,
    animated: !!focus && lit(r.from_id) && lit(r.to_id),
    style: {
      opacity: lit(r.from_id) && lit(r.to_id) ? 1 : 0.15,
      strokeDasharray: r.origin === "manual" ? "4 3" : undefined,
    },
  }))

  const picked = assets.find((a) => a.id === focus)
  const byId = new Map(assets.map((a) => [a.id, a]))

  if (related.size === 0)
    return (
      <Empty
        icon={Network}
        title="No relations yet"
        body="Morche links what it sees (a database on a server, a site on a proxy, backups on a storage). Add your own from an asset's Relations tab, and the map draws them here."
      />
    )

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className={cn("flex flex-wrap items-center gap-2", phone && "px-4")}>
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Find an asset"
          label="Find an asset"
          className={phone ? "min-w-0 flex-1" : undefined}
        />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {[{ key: "", label: "Everything" }, ...kindGroups].map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={group === k.key}
              onClick={() => setGroup(k.key)}
              className="h-9 shrink-0 rounded-full border border-border px-3 text-body-sm whitespace-nowrap hover:bg-subtle aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
            >
              {k.label}
            </button>
          ))}
        </div>
        <span className="ms-auto text-caption text-ash">
          Solid = found by Morche · dashed = added by hand · click an asset to
          see its chain
        </span>
      </div>
      <div
        className={cn(
          "relative h-[calc(100dvh-14rem)] min-h-96 overflow-hidden border-border",
          phone ? "border-y" : "rounded-2xl border",
        )}
      >
        <ReactFlow
          key={`${group}|${q}|${focus}`}
          fitView
          fitViewOptions={{
            padding: 0.12,
            maxZoom: 1,
            nodes: chain.length ? chain.map((id) => ({ id })) : undefined,
          }}
          className="netmap"
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          minZoom={0.15}
          onNodeClick={(_, n) => setFocus(n.id === focus ? null : n.id)}
          onPaneClick={() => setFocus(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} />
          {!phone && <Controls showInteractive={false} />}
        </ReactFlow>
        {picked && (
          <aside className="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-border bg-card p-4 shadow-md md:start-auto md:end-3 md:top-3 md:bottom-auto md:w-80">
            <div className="flex items-start gap-3">
              <AssetIcon asset={picked} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium">
                  {picked.name}
                </p>
                <p className="truncate text-caption text-muted-foreground">
                  {kindOf(picked.kind).label}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                onClick={() => setFocus(null)}
              >
                <X />
              </Button>
            </div>
            <div className="mt-3">
              <OwnerChip asset={picked} compact />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-subtle p-2">
                <dt className="text-caption text-ash">Relies on</dt>
                <dd className="text-subheading font-light tabular-nums">
                  {up.size}
                </dd>
              </div>
              <div className="rounded-xl bg-subtle p-2">
                <dt className="text-caption text-ash">Affected if down</dt>
                <dd
                  className={cn(
                    "text-subheading font-light tabular-nums",
                    down.size > 0 && "text-warning",
                  )}
                >
                  {down.size}
                </dd>
              </div>
            </dl>
            {down.size > 0 && (
              <ul className="mt-3 grid max-h-36 gap-1 overflow-y-auto text-caption">
                {[...down].slice(0, 20).map((id) => (
                  <li key={id} className="truncate text-muted-foreground">
                    {byId.get(id)?.name}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={assetHref(picked.id)}
              className="mt-3 inline-flex items-center gap-1 text-body-sm text-brand"
            >
              Open asset
              <ArrowRight className="size-3.5" />
            </Link>
          </aside>
        )}
      </div>
    </div>
  )
}
