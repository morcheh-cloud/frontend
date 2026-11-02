"use client"

import { Copy, SearchCode, Search as SearchIcon } from "lucide-react"
import { useState } from "react"

import {
  Facts,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { DatabaseQuery } from "@/lib/services"
import { useDashboardActions } from "./dashboard-actions"
import { ms, num } from "./format"
import { NoSnapshot, NotesFor, Panel, Rows, useDashboard } from "./parts"

type Sort = "total" | "mean" | "calls"

const sorters: Record<Sort, (a: DatabaseQuery, b: DatabaseQuery) => number> = {
  total: (a, b) => b.total_ms - a.total_ms,
  mean: (a, b) => b.mean_ms - a.mean_ms,
  calls: (a, b) => b.calls - a.calls,
}

const sources: Record<string, string> = {
  pg_stat_statements: "pg_stat_statements, since its last reset",
  performance_schema: "performance_schema, since the server started",
  "sys.dm_exec_query_stats": "the plan cache (statements still cached)",
  SLOWLOG: "SLOWLOG, the latest commands over its limit",
}

// The statements that cost the most time. Redis has no statistics, only a
// slow log: the latest commands over its limit.
export function QueriesTab() {
  const { snapshot: s, database: d, engineer, phone } = useDashboard()
  const a = useDashboardActions()
  const [sort, setSort] = useState<Sort>("total")
  const [q, setQ] = useState("")
  if (!s) return <NoSnapshot />

  const redis = d.engine === "redis"
  const needle = q.trim().toLowerCase()
  const rows = s.queries
    .filter(
      (x) =>
        !needle ||
        `${x.query} ${x.database ?? ""}`.toLowerCase().includes(needle),
    )
    .sort(
      redis ? (x, y) => (y.at ?? "").localeCompare(x.at ?? "") : sorters[sort],
    )
  const source = s.queries_source
    ? `From ${sources[s.queries_source] ?? s.queries_source}`
    : undefined
  const canExplain = engineer && !redis

  const explain = canExplain && (
    <Button
      variant={phone ? "outline" : "default"}
      size={phone ? "icon-lg" : "default"}
      aria-label="Explain a query"
      onClick={() => a.explain()}
    >
      <SearchCode />
      {!phone && "Explain a query"}
    </Button>
  )
  const sortControl = !redis && (
    <Segmented
      label="Sort by"
      items={[
        { value: "total", label: "Total time" },
        { value: "mean", label: "Per call" },
        { value: "calls", label: "Calls" },
      ]}
      value={sort}
      onChange={setSort}
    />
  )

  return (
    <div className="flex flex-col md:gap-4">
      {phone ? (
        <div className="flex flex-col gap-3 pt-3">
          <div className="flex items-center gap-2 px-4">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder={redis ? "Search commands" : "Search statements"}
              label="Search"
              className="min-w-0 flex-1"
            />
            {explain}
          </div>
          {sortControl && <div className="px-4">{sortControl}</div>}
          {source && <p className="px-4 text-caption text-ash">{source}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder={redis ? "Search commands" : "Search statements"}
            label="Search"
          />
          {sortControl}
          <div className="ms-auto flex items-center gap-3">
            {source && <span className="text-caption text-ash">{source}</span>}
            {explain}
          </div>
        </div>
      )}
      <NotesFor notes={s.notes} areas={["queries"]} />
      <QueryList rows={rows} redis={redis} total={s.queries.length} />
    </div>
  )
}

function QueryList({
  rows,
  redis,
  total,
}: {
  rows: DatabaseQuery[]
  redis: boolean
  total: number
}) {
  const { engineer } = useDashboard()
  const a = useDashboardActions()
  const [open, setOpen] = useOpen("database-query-sheet")
  const [picked, setPicked] = useState<DatabaseQuery | null>(null)

  const menu = (x: DatabaseQuery): Item[][] => [
    [
      ...(engineer && !redis
        ? [
            {
              key: "explain",
              label: "Explain…",
              icon: <SearchIcon />,
              onSelect: () =>
                a.explain({ query: x.query, database: x.database }),
            },
          ]
        : []),
      {
        key: "copy",
        label: redis ? "Copy command" : "Copy statement",
        icon: <Copy />,
        onSelect: () => a.copy(x.query, redis ? "Command" : "Statement"),
      },
    ],
  ]
  const statement = (x: DatabaseQuery) => (
    <span
      title={x.query}
      className="line-clamp-2 min-w-64 font-mono text-caption break-all"
    >
      {x.query || "—"}
    </span>
  )

  return (
    <Panel
      title={redis ? "Slow log" : "Slowest statements"}
      caption={rows.length !== total ? `${rows.length} of ${total}` : undefined}
      flush
    >
      <Rows
        label={redis ? "Slow log" : "Statements"}
        rows={rows}
        rowKey={(x) => `${x.database ?? ""}:${x.at ?? ""}:${x.query}`}
        empty={
          total
            ? "Nothing matches."
            : redis
              ? "The slow log is empty."
              : "No statistics yet."
        }
        cols={
          redis
            ? [
                {
                  key: "q",
                  label: "Command",
                  className: "w-full",
                  cell: statement,
                },
                {
                  key: "at",
                  label: "When",
                  end: true,
                  cell: (x) => (x.at ? timeAgo(x.at) : "—"),
                },
                {
                  key: "took",
                  label: "Took",
                  end: true,
                  cell: (x) => ms(x.mean_ms),
                },
                {
                  key: "menu",
                  label: "",
                  cell: (x) => (
                    <ItemMenu groups={menu(x)} label="Command actions" />
                  ),
                },
              ]
            : [
                {
                  key: "q",
                  label: "Statement",
                  className: "w-full",
                  cell: statement,
                },
                {
                  key: "db",
                  label: "Database",
                  className: "hidden @4xl:table-cell",
                  cell: (x) => x.database || "—",
                },
                {
                  key: "calls",
                  label: "Calls",
                  end: true,
                  cell: (x) => num(x.calls),
                },
                {
                  key: "total",
                  label: "Total",
                  end: true,
                  cell: (x) => ms(x.total_ms),
                },
                {
                  key: "mean",
                  label: "Per call",
                  end: true,
                  cell: (x) => ms(x.mean_ms),
                },
                {
                  key: "rows",
                  label: "Rows",
                  end: true,
                  className: "hidden @3xl:table-cell",
                  cell: (x) => (x.rows != null ? num(x.rows) : "—"),
                },
                {
                  key: "menu",
                  label: "",
                  cell: (x) => (
                    <ItemMenu groups={menu(x)} label="Statement actions" />
                  ),
                },
              ]
        }
        phone={(x) => ({
          title: (
            <span className="font-mono text-body-sm">{x.query || "—"}</span>
          ),
          sub: redis
            ? x.at
              ? timeAgo(x.at)
              : undefined
            : `${num(x.calls)} calls · ${ms(x.mean_ms)} each`,
          end: redis ? ms(x.mean_ms) : ms(x.total_ms),
        })}
        onOpen={(x) => {
          setPicked(x)
          setOpen(true)
        }}
      />
      {picked && (
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title={redis ? "Command" : "Statement"}
        >
          <Facts
            items={
              redis
                ? [
                    {
                      label: "When",
                      value: picked.at ? timeAgo(picked.at) : "—",
                    },
                    { label: "Took", value: ms(picked.mean_ms) },
                    {
                      label: "Command",
                      value: picked.query,
                      wide: true,
                      mono: true,
                    },
                  ]
                : [
                    { label: "Calls", value: num(picked.calls) },
                    { label: "Per call", value: ms(picked.mean_ms) },
                    { label: "Total", value: ms(picked.total_ms) },
                    {
                      label: "Rows",
                      value: picked.rows != null ? num(picked.rows) : "—",
                    },
                    ...(picked.database
                      ? [
                          {
                            label: "Database",
                            value: picked.database,
                            wide: true,
                          },
                        ]
                      : []),
                    {
                      label: "Statement",
                      value: picked.query,
                      wide: true,
                      mono: true,
                    },
                  ]
            }
          />
          <SheetItems groups={menu(picked)} onOpenChange={setOpen} />
        </BottomSheet>
      )}
    </Panel>
  )
}
