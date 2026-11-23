"use client"

import { Meter } from "@/app/(panel)/servers/[id]/components/resources"
import type { DatabaseSearch } from "@/lib/services"
import { cn } from "@/lib/utils"
import { num, pct } from "./format"
import { Pairs, Panel, Tag, useDashboard } from "./parts"

const statusMeta: Record<string, { label: string; dot: string; hint: string }> =
  {
    green: {
      label: "Green",
      dot: "bg-success",
      hint: "Every shard is placed.",
    },
    yellow: {
      label: "Yellow",
      dot: "bg-warning",
      hint: "Every primary is placed, some replicas aren't.",
    },
    red: {
      label: "Red",
      dot: "bg-destructive",
      hint: "Some primary shards aren't placed: part of the data can't be read or written.",
    },
  }

// What a search engine reports beyond the common shape: the cluster and its
// shards (Elasticsearch, OpenSearch) or the task queue (Meilisearch).
export function SearchPanel() {
  const { database: d, snapshot: s } = useDashboard()
  const x = s?.search
  if (!x) return null
  return d.engine === "meilisearch" ? (
    <MeiliPanel x={x} />
  ) : (
    <ElasticPanel x={x} />
  )
}

function ElasticPanel({ x }: { x: DatabaseSearch }) {
  const status = statusMeta[x.status ?? ""]
  const total =
    x.active_shards + x.initializing_shards + x.unassigned_shards || 1
  return (
    <Panel
      title="Cluster"
      caption={
        x.cluster ? <span className="font-mono">{x.cluster}</span> : null
      }
    >
      <div className="flex flex-col gap-4">
        {status && (
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={cn(
                "mt-1.5 size-2.5 shrink-0 rounded-full",
                status.dot,
              )}
            />
            <div className="min-w-0">
              <p className="text-body-sm font-medium">{status.label}</p>
              <p className="text-caption text-muted-foreground">
                {status.hint}
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 text-body-sm">
            <span className="text-muted-foreground">Shards</span>
            <span className="tabular-nums">
              {num(x.active_shards)} active · {num(x.primary_shards)} primary
            </span>
          </div>
          {/* Active, starting and unplaced shards as one strip. */}
          <div
            className="flex h-2 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${x.active_shards} active, ${x.initializing_shards} starting, ${x.unassigned_shards} unassigned`}
          >
            <span
              className="bg-success"
              style={{ width: `${(x.active_shards / total) * 100}%` }}
            />
            <span
              className="bg-brand"
              style={{ width: `${(x.initializing_shards / total) * 100}%` }}
            />
            <span
              className="bg-destructive"
              style={{ width: `${(x.unassigned_shards / total) * 100}%` }}
            />
          </div>
          {(x.unassigned_shards > 0 ||
            x.initializing_shards > 0 ||
            x.relocating_shards > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {x.unassigned_shards > 0 && (
                <Tag tone="warning">{num(x.unassigned_shards)} unassigned</Tag>
              )}
              {x.initializing_shards > 0 && (
                <Tag tone="brand">{num(x.initializing_shards)} starting</Tag>
              )}
              {x.relocating_shards > 0 && (
                <Tag>{num(x.relocating_shards)} moving</Tag>
              )}
            </div>
          )}
        </div>
        {x.heap_ratio != null && (
          <Gauge label="JVM heap, fullest node" ratio={x.heap_ratio} />
        )}
        {x.disk_ratio != null && (
          <div className="flex flex-col gap-1">
            <Gauge label="Disk, fullest data node" ratio={x.disk_ratio} />
            {(x.high_watermark != null || x.flood_stage != null) && (
              <p className="text-caption text-muted-foreground">
                {x.high_watermark != null &&
                  `Shards move away at ${pct(x.high_watermark)}`}
                {x.high_watermark != null && x.flood_stage != null && " · "}
                {x.flood_stage != null &&
                  `indices turn read-only at ${pct(x.flood_stage)}`}
              </p>
            )}
          </div>
        )}
        {x.read_only_indices.length > 0 && (
          <p className="text-caption text-destructive">
            Read-only: {x.read_only_indices.slice(0, 5).join(", ")}
            {x.read_only_indices.length > 5 &&
              ` and ${x.read_only_indices.length - 5} more`}
          </p>
        )}
        <Pairs
          items={[
            {
              label: "Nodes",
              value: `${num(x.nodes)} (${num(x.data_nodes)} data)`,
            },
            { label: "Indices", value: num(x.indexes) },
            {
              label: "Documents",
              value: x.documents != null ? num(x.documents) : null,
            },
            {
              label: "Waiting cluster changes",
              value: x.pending_tasks > 0 ? num(x.pending_tasks) : null,
            },
          ]}
        />
      </div>
    </Panel>
  )
}

function MeiliPanel({ x }: { x: DatabaseSearch }) {
  const busy = x.enqueued > 0 || x.processing > 0
  return (
    <Panel
      title="Indexing"
      caption={x.indexing ? "Updating an index now" : busy ? "Busy" : "Idle"}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <Count label="Waiting" value={x.enqueued} />
          <Count label="Running" value={x.processing} />
          <Count
            label="Failed, 24 h"
            value={x.failed}
            tone={x.failed > 0 ? "warning" : undefined}
          />
        </div>
        {x.failed > 0 && x.last_failure && (
          <p className="text-caption break-words text-warning">
            Last failure: {x.last_failure}
          </p>
        )}
        <Pairs
          items={[
            {
              label: "Oldest wait",
              value:
                x.oldest_wait_seconds != null
                  ? waitText(x.oldest_wait_seconds)
                  : null,
            },
            { label: "Indexes", value: num(x.indexes) },
            {
              label: "Documents",
              value: x.documents != null ? num(x.documents) : null,
            },
          ]}
        />
      </div>
    </Panel>
  )
}

function Count({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "warning"
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card px-3 py-2.5">
      <div
        className={cn(
          "text-subheading font-light tabular-nums",
          tone === "warning" && "text-warning",
        )}
      >
        {num(value)}
      </div>
      <div className="truncate text-caption text-ash">{label}</div>
    </div>
  )
}

function Gauge({ label, ratio }: { label: string; ratio: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-body-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{pct(ratio)}</span>
      </div>
      <Meter value={ratio * 100} label={label} />
    </div>
  )
}

function waitText(sec: number) {
  if (sec < 60) return `${Math.round(sec)} s`
  if (sec < 3600) return `${Math.round(sec / 60)} min`
  return `${Math.round((sec / 3600) * 10) / 10} h`
}
