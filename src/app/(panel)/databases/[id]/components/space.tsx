"use client"

import { Meter } from "@/app/(panel)/servers/[id]/components/resources"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { formatSize } from "@/lib/format"
import type {
  DatabaseIDColumn,
  DatabaseIndex,
  DatabaseInfo,
  DatabaseSnapshot,
  DatabaseTable,
} from "@/lib/services"
import { num, pct } from "./format"
import {
  type Col,
  NoSnapshot,
  NotesFor,
  Pairs,
  Panel,
  Rows,
  Tag,
  useDashboard,
} from "./parts"

const nouns: Record<DatabaseSnapshot["engine"], [string, string]> = {
  postgres: ["Table", "Tables"],
  mysql: ["Table", "Tables"],
  mssql: ["Table", "Tables"],
  mongodb: ["Collection", "Collections"],
  redis: ["Key", "Keys"],
}

const size = (n: number | null | undefined) => (n == null ? "—" : formatSize(n))
const count = (n: number | null | undefined) => (n == null ? "—" : num(n))

// Where the space goes: databases, the biggest tables (or keys), counters
// running out, indexes nothing reads, and the log. Read-only throughout.
export function SpaceTab() {
  const { snapshot: s } = useDashboard()
  if (!s) return <NoSnapshot />
  return (
    <div className="flex flex-col md:gap-4">
      {s.details_at && (
        <p className="text-caption text-ash max-md:px-4 max-md:pt-3">
          Sizes and tables read {timeAgo(s.details_at)}; they refresh every few
          minutes.
        </p>
      )}
      <NotesFor
        notes={s.notes}
        areas={["tables", "details"]}
        className="max-md:mt-3"
      />
      {s.engine !== "redis" && <Databases s={s} />}
      <Tables s={s} />
      <IdColumns rows={s.id_columns} />
      <UnusedIndexes rows={s.indexes} />
      <Storage s={s} />
    </div>
  )
}

function Databases({ s }: { s: DatabaseSnapshot }) {
  const mssql = s.engine === "mssql"
  const items = [...s.databases].sort(
    (a, b) => (b.size_bytes ?? 0) - (a.size_bytes ?? 0),
  )
  const cols: Col<DatabaseInfo>[] = [
    {
      key: "name",
      label: "Database",
      className: "w-full",
      cell: (d) => (
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{d.name}</span>
          {d.state && d.state !== "ONLINE" && (
            <Tag tone="warning">{d.state.toLowerCase()}</Tag>
          )}
        </span>
      ),
    },
    { key: "size", label: "Size", end: true, cell: (d) => size(d.size_bytes) },
    {
      key: "tables",
      label: nouns[s.engine][1],
      end: true,
      cell: (d) => count(d.tables),
    },
    {
      key: "conn",
      label: "Connections",
      end: true,
      className: "hidden @3xl:table-cell",
      cell: (d) => num(d.connections),
    },
  ]
  if (mssql) {
    cols.push(
      {
        key: "recovery",
        label: "Recovery",
        className: "hidden @4xl:table-cell",
        cell: (d) => d.recovery?.toLowerCase() || "—",
      },
      {
        key: "log",
        label: "Log used",
        end: true,
        cell: (d) => (
          <span title={d.log_wait ? `Waiting on ${d.log_wait}` : undefined}>
            {d.log_used != null ? pct(d.log_used) : "—"}
            {d.log_bytes != null && (
              <span className="text-ash"> of {formatSize(d.log_bytes)}</span>
            )}
          </span>
        ),
      },
      {
        key: "backup",
        label: "Last full backup",
        end: true,
        cell: (d) => <Backup d={d} />,
      },
    )
  }
  return (
    <Panel
      title="Databases"
      caption={`${items.length} · ${size(s.size_bytes)} in all`}
      flush
    >
      <Rows
        label="Databases"
        rows={items}
        rowKey={(d) => d.name}
        cols={cols}
        empty="No databases this login can see."
        phone={(d) => ({
          title: d.name,
          sub: [
            d.tables != null &&
              `${num(d.tables)} ${nouns[s.engine][1].toLowerCase()}`,
            mssql && d.recovery?.toLowerCase(),
            mssql && d.log_used != null && `log ${pct(d.log_used)} used`,
            mssql &&
              (d.last_backup
                ? `backed up ${timeAgo(d.last_backup)}`
                : "never backed up"),
          ]
            .filter(Boolean)
            .join(" · "),
          end: size(d.size_bytes),
        })}
      />
    </Panel>
  )
}

function Backup({ d }: { d: DatabaseInfo }) {
  if (d.last_backup) return <>{timeAgo(d.last_backup)}</>
  // System databases are rebuilt, not restored.
  if (["tempdb", "model"].includes(d.name)) return <>—</>
  return <Tag tone="warning">Never</Tag>
}

function Tables({ s }: { s: DatabaseSnapshot }) {
  const [one, many] = nouns[s.engine]
  const redis = s.engine === "redis"
  const pg = s.engine === "postgres"
  const mysql = s.engine === "mysql"
  const name = (t: DatabaseTable) =>
    t.schema && !["public", "dbo"].includes(t.schema)
      ? `${t.schema}.${t.name}`
      : t.name
  const showDb = !redis && new Set(s.tables.map((t) => t.database)).size > 1

  const cols: Col<DatabaseTable>[] = [
    {
      key: "name",
      label: one,
      className: "w-full",
      cell: (t) => (
        <span
          title={name(t)}
          className={redis ? "font-mono text-caption break-all" : "font-medium"}
        >
          {name(t)}
        </span>
      ),
    },
  ]
  if (showDb) {
    cols.push({
      key: "db",
      label: "Database",
      className: "hidden @3xl:table-cell",
      cell: (t) => t.database || "—",
    })
  }
  if (redis) {
    cols.push({ key: "kind", label: "Type", cell: (t) => t.kind || "—" })
  } else {
    cols.push({
      key: "rows",
      label: s.engine === "mongodb" ? "Documents" : "Rows",
      end: true,
      cell: (t) => count(t.rows),
    })
  }
  cols.push({
    key: "size",
    label: "Size",
    end: true,
    cell: (t) => size(t.size_bytes),
  })
  if (!redis) {
    cols.push({
      key: "idx",
      label: "Indexes",
      end: true,
      className: "hidden @3xl:table-cell",
      cell: (t) => size(t.index_bytes),
    })
  }
  if (pg) {
    cols.push(
      {
        key: "dead",
        label: "Dead rows",
        end: true,
        cell: (t) => <DeadRows t={t} />,
      },
      {
        key: "vacuum",
        label: "Last vacuum",
        end: true,
        className: "hidden @5xl:table-cell",
        cell: (t) => (t.last_vacuum ? timeAgo(t.last_vacuum) : "Never"),
      },
    )
  }
  if (mysql) {
    cols.push({
      key: "free",
      label: "Free inside",
      end: true,
      className: "hidden @4xl:table-cell",
      cell: (t) => size(t.free_bytes),
    })
  }

  return (
    <Panel
      title={redis ? "Largest keys" : `Largest ${many.toLowerCase()}`}
      caption={s.tables_scope ? `In ${s.tables_scope}` : undefined}
      flush
    >
      <Rows
        label={many}
        rows={s.tables}
        rowKey={(t) => `${t.database ?? ""}:${t.schema ?? ""}:${t.name}`}
        cols={cols}
        empty={`No ${many.toLowerCase()} to show.`}
        limit={20}
        phone={(t) => ({
          title: redis ? (
            <span className="font-mono text-body-sm">{name(t)}</span>
          ) : (
            name(t)
          ),
          sub: [
            redis ? t.kind : t.rows != null && `${num(t.rows)} rows`,
            pg && t.dead_rows && `${num(t.dead_rows)} dead`,
            showDb && t.database,
          ]
            .filter(Boolean)
            .join(" · "),
          end: size(t.size_bytes),
        })}
      />
    </Panel>
  )
}

// Dead rows past a fifth of the live ones mean vacuum isn't keeping up.
function DeadRows({ t }: { t: DatabaseTable }) {
  if (t.dead_rows == null) return <>—</>
  const heavy = t.rows != null && t.rows > 1000 && t.dead_rows > t.rows * 0.2
  return heavy ? <Tag tone="warning">{num(t.dead_rows)}</Tag> : num(t.dead_rows)
}

function IdColumns({ rows }: { rows: DatabaseIDColumn[] }) {
  if (rows.length === 0) return null
  const name = (c: DatabaseIDColumn) => `${c.table}.${c.column}`
  return (
    <Panel
      title="ID counters"
      caption="How far each auto-increment column has gone toward its type's limit"
      flush
    >
      <Rows
        label="ID counters"
        rows={rows}
        rowKey={(c) => `${c.database ?? ""}:${name(c)}`}
        limit={10}
        empty=""
        cols={[
          {
            key: "col",
            label: "Column",
            cell: (c) => (
              <span className="font-medium">
                {name(c)}
                {c.database && (
                  <span className="ms-2 font-normal text-ash">
                    {c.database}
                  </span>
                )}
              </span>
            ),
          },
          { key: "type", label: "Type", cell: (c) => c.type },
          {
            key: "used",
            label: "Used",
            className: "w-full",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <Meter
                  value={c.ratio * 100}
                  label={`${name(c)} used`}
                  className="min-w-24 flex-1"
                />
                <span className="w-14 text-end tabular-nums">
                  {pct(c.ratio)}
                </span>
              </div>
            ),
          },
          {
            key: "left",
            label: "Values left",
            end: true,
            cell: (c) => num(Math.max(c.max - c.current, 0)),
          },
        ]}
        phone={(c) => ({
          title: name(c),
          sub: `${c.type} · ${num(Math.max(c.max - c.current, 0))} left`,
          end: pct(c.ratio),
        })}
      />
    </Panel>
  )
}

function UnusedIndexes({ rows }: { rows: DatabaseIndex[] }) {
  const { phone } = useDashboard()
  if (rows.length === 0) return null
  const total = rows.reduce((n, i) => n + (i.size_bytes ?? 0), 0)
  return (
    <Panel
      title="Unused indexes"
      caption={`Not read since statistics were reset · ${formatSize(total)}`}
      flush
    >
      <p
        className={
          phone
            ? "px-4 py-3 text-body-sm text-muted-foreground"
            : "border-b border-border px-5 py-3 text-body-sm text-muted-foreground"
        }
      >
        Each one still slows every write. Before dropping one, check that no
        replica or rare report (month-end, yearly) uses it. Morche only
        suggests; it never changes the schema.
      </p>
      <Rows
        label="Unused indexes"
        rows={rows}
        rowKey={(i) => `${i.database ?? ""}:${i.table}:${i.name}`}
        limit={10}
        empty=""
        cols={[
          {
            key: "name",
            label: "Index",
            className: "w-full",
            cell: (i) => <span className="font-medium">{i.name}</span>,
          },
          { key: "table", label: "On", cell: (i) => i.table },
          {
            key: "db",
            label: "Database",
            className: "hidden @3xl:table-cell",
            cell: (i) => i.database || "—",
          },
          {
            key: "writes",
            label: "Writes",
            end: true,
            className: "hidden @4xl:table-cell",
            cell: (i) => count(i.writes),
          },
          {
            key: "size",
            label: "Size",
            end: true,
            cell: (i) => size(i.size_bytes),
          },
        ]}
        phone={(i) => ({
          title: i.name,
          sub: [i.table, i.database].filter(Boolean).join(" · "),
          end: size(i.size_bytes),
        })}
      />
    </Panel>
  )
}

// The write-ahead / binary / transaction log, and Redis' snapshots.
function Storage({ s }: { s: DatabaseSnapshot }) {
  const log = s.log
  const p = s.persistence
  if (!log && !p) return null
  return (
    <div className="grid md:gap-4 @4xl:grid-cols-2">
      {log && (
        <Panel title={log.kind}>
          <Pairs
            items={[
              {
                label: "Size",
                value: log.size_bytes != null && formatSize(log.size_bytes),
              },
              {
                label: "Used",
                value: log.used_ratio != null && pct(log.used_ratio),
              },
              {
                label: "Covers",
                value:
                  log.window_hours != null &&
                  `the last ${num(Math.round(log.window_hours))} hours`,
              },
              { label: "Held by", value: log.held_by },
            ].map((i) => ({ ...i, value: i.value || null }))}
          />
          {log.used_ratio != null && (
            <Meter
              value={log.used_ratio * 100}
              label={`${log.kind} used`}
              className="mt-4"
            />
          )}
        </Panel>
      )}
      {p && (
        <Panel title="Persistence">
          <Pairs
            items={[
              {
                label: "Last snapshot",
                value: p.rdb_last_save
                  ? `${timeAgo(p.rdb_last_save)} · ${p.rdb_status}`
                  : "Never",
              },
              { label: "Changes since", value: num(p.rdb_changes) },
              { label: "Snapshot schedule", value: p.save_schedule || "Off" },
              {
                label: "Append-only file",
                value: p.aof_enabled ? p.aof_status || "On" : "Off",
              },
            ]}
          />
          {!p.aof_enabled && !p.save_schedule && (
            <p className="mt-4 text-body-sm text-warning">
              Nothing is written to disk: a restart loses every key.
            </p>
          )}
        </Panel>
      )}
    </div>
  )
}
