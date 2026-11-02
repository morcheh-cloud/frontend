"use client"

import { formatSize } from "@/lib/format"
import type { DatabaseSnapshot } from "@/lib/services"
import { secs } from "./format"
import {
  Blank,
  NoSnapshot,
  NotesFor,
  Pairs,
  Panel,
  Rows,
  Tag,
  useDashboard,
} from "./parts"

const roles: Record<DatabaseSnapshot["role"], string> = {
  primary: "Primary",
  replica: "Replica",
  standalone: "Standalone",
}

const lag = (s: number | null | undefined) => (s == null ? "—" : secs(s))

// Copies of this database and how far behind they are. Read-only: Morcheh
// never promotes, re-points or rebuilds a replica.
export function ReplicationTab() {
  const { snapshot: s } = useDashboard()
  if (!s) return <NoSnapshot />
  const r = s.replication
  const none =
    s.role === "standalone" &&
    !r.source &&
    r.replicas.length === 0 &&
    r.slots.length === 0 &&
    !r.set

  return (
    <div className="flex flex-col md:gap-4">
      <NotesFor
        notes={s.notes}
        areas={["replication"]}
        className="max-md:mt-3"
      />
      <Panel title="Role">
        <Pairs
          items={[
            { label: "Role", value: roles[s.role] },
            { label: "Replica set", value: r.set },
            { label: "Read only", value: s.read_only ? "Yes" : "No" },
          ]}
        />
      </Panel>
      {none ? (
        <Blank
          title="Not replicated"
          body="This database has no source and no replicas. A replica keeps a live copy on another machine and is the quickest way back after a disk or server failure."
        />
      ) : (
        <>
          {r.source && (
            <Panel title="Copying from">
              <Pairs
                items={[
                  { label: "Source", value: r.source.address, mono: true },
                  {
                    label: "State",
                    value: r.source.running ? (
                      "Running"
                    ) : (
                      <Tag tone="warning">Stopped</Tag>
                    ),
                  },
                  { label: "Behind by", value: lag(r.source.lag_seconds) },
                ]}
              />
              {r.source.error && (
                <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 font-mono text-caption break-all text-destructive">
                  {r.source.error}
                </p>
              )}
            </Panel>
          )}
          {r.replicas.length > 0 && (
            <Panel
              title="Replicas"
              caption={`${r.replicas.filter((x) => x.healthy).length} of ${r.replicas.length} healthy`}
              flush
            >
              <Rows
                label="Replicas"
                rows={r.replicas}
                rowKey={(x) => `${x.name}:${x.address}`}
                empty=""
                cols={[
                  {
                    key: "name",
                    label: "Replica",
                    className: "w-full",
                    cell: (x) => (
                      <span className="flex flex-col">
                        <span className="font-medium">
                          {x.name || x.address}
                        </span>
                        {x.name && x.address && (
                          <span className="font-mono text-caption text-ash">
                            {x.address}
                          </span>
                        )}
                      </span>
                    ),
                  },
                  {
                    key: "state",
                    label: "State",
                    cell: (x) => (
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        {x.state}
                        {!x.healthy && <Tag tone="warning">Unhealthy</Tag>}
                      </span>
                    ),
                  },
                  {
                    key: "sync",
                    label: "Mode",
                    className: "hidden @3xl:table-cell",
                    cell: (x) => x.sync || "—",
                  },
                  {
                    key: "lag",
                    label: "Behind by",
                    end: true,
                    cell: (x) => lag(x.lag_seconds),
                  },
                  {
                    key: "bytes",
                    label: "Not yet sent",
                    end: true,
                    className: "hidden @3xl:table-cell",
                    cell: (x) =>
                      x.lag_bytes == null ? "—" : formatSize(x.lag_bytes),
                  },
                ]}
                phone={(x) => ({
                  title: (
                    <span className="flex items-center gap-2">
                      <span className="truncate">{x.name || x.address}</span>
                      {!x.healthy && <Tag tone="warning">Unhealthy</Tag>}
                    </span>
                  ),
                  sub: [x.state, x.sync].filter(Boolean).join(" · "),
                  end: lag(x.lag_seconds),
                })}
              />
            </Panel>
          )}
          {r.slots.length > 0 && (
            <Panel
              title="Replication slots"
              caption="An inactive slot keeps WAL on disk until it's dropped"
              flush
            >
              <Rows
                label="Replication slots"
                rows={r.slots}
                rowKey={(x) => x.name}
                empty=""
                cols={[
                  {
                    key: "name",
                    label: "Slot",
                    className: "w-full",
                    cell: (x) => <span className="font-medium">{x.name}</span>,
                  },
                  {
                    key: "active",
                    label: "State",
                    cell: (x) =>
                      x.active ? "Active" : <Tag tone="warning">Inactive</Tag>,
                  },
                  {
                    key: "kept",
                    label: "WAL kept",
                    end: true,
                    cell: (x) =>
                      x.retained_bytes == null
                        ? "—"
                        : formatSize(x.retained_bytes),
                  },
                ]}
                phone={(x) => ({
                  title: x.name,
                  sub: x.active ? "Active" : "Inactive",
                  end:
                    x.retained_bytes == null
                      ? undefined
                      : formatSize(x.retained_bytes),
                })}
              />
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
