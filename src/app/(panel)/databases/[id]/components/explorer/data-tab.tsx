"use client"

import {
  ChevronLeft,
  ChevronRight,
  Code,
  Database as DatabaseIcon,
  Eye,
  FileCode2,
  Filter,
  KeyRound,
  Layers,
  ListFilter,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
  Table2,
  TableProperties,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"

import {
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDebounced } from "@/hooks/useDebounced"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type {
  DatabaseObject,
  DatabaseOverview,
  DatabaseSavedView,
  DatabaseViewState,
  ObjectInfo,
  RowFilter,
  RowSort,
  RowsRequest,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useExplorer, useObjectInfo, useRows } from "../../../api"
import { Blank, useDashboard } from "../parts"
import { useRowEditing } from "./edit"
import {
  ExportMenu,
  NullText,
  PhoneRows,
  ResultFacts,
  ResultGrid,
  RowDetails,
} from "./grid"
import { KeyBrowser } from "./key-browser"
import {
  filterOps,
  isSystemDb,
  kindLabel,
  opLabel,
  rowsText,
  selectFor,
} from "./meta"
import { useExplorerParams, useSendToQuery } from "./state"
import { CodeBlock } from "./structure"
import { ViewsMenu } from "./views"

// The fixed height desktop workbenches fill: the window under the page
// header and tab bar.
export const benchHeight = "h-[calc(100svh-13rem)] min-h-[30rem]"

// The Data tab: what the database holds, and any table's rows with filters.
export function DataTab() {
  const { database: d } = useDashboard()
  if (d.engine === "redis") return <KeyBrowser />
  return <TableBrowser />
}

// Which database inside the connection: the one in the URL, else the
// connection's own (a user database rather than SQL Server's master).
export function useCurrentDb() {
  const { database: d } = useDashboard()
  const [params, setParams] = useExplorerParams()
  const first = useExplorer(d.id, "")
  const current = params.db || first.data?.database || ""
  const overview = useExplorer(d.id, current, !!current || first.isSuccess)

  useEffect(() => {
    const o = first.data
    if (params.db || !o) return
    if (o.database && isSystemDb(d.engine, o.database)) {
      const user = o.databases.find((n) => !isSystemDb(d.engine, n))
      if (user) setParams({ db: user }, { history: "replace" })
    }
  }, [first.data, params.db, d.engine, setParams])

  const data: DatabaseOverview | undefined =
    current === (first.data?.database ?? "") && !params.db
      ? first.data
      : overview.data
  return {
    current,
    overview: data,
    loading: !data && (first.isPending || overview.isPending),
    error: first.error ?? overview.error,
    refetch: () => {
      first.refetch()
      overview.refetch()
    },
    setDb: (db: string) =>
      setParams({ db, schema: null, obj: null, view: null }),
  }
}

function TableBrowser() {
  const { phone } = useDashboard()
  const [params] = useExplorerParams()
  const state = useCurrentDb()

  if (state.error && !state.overview) {
    return (
      <Blank
        title="Couldn't open the database"
        body={state.error.message}
        action={
          <Button variant="outline" onClick={state.refetch}>
            Try again
          </Button>
        }
      />
    )
  }

  if (phone) {
    return params.obj ? (
      <ObjectPanel key={`${state.current}/${params.schema}/${params.obj}`} />
    ) : (
      <PhoneObjects state={state} />
    )
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[17rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border",
        benchHeight,
      )}
    >
      <ObjectRail state={state} />
      {params.obj ? (
        <ObjectPanel key={`${state.current}/${params.schema}/${params.obj}`} />
      ) : (
        <PickHint overview={state.overview} loading={state.loading} />
      )}
    </div>
  )
}

type DbState = ReturnType<typeof useCurrentDb>

export function DatabasePicker({
  state,
  className,
}: {
  state: DbState
  className?: string
}) {
  const { database: d } = useDashboard()
  const list = state.overview?.databases ?? []
  if (list.length <= 1 && d.engine !== "redis") {
    return (
      <div
        className={cn(
          "flex h-9 items-center gap-2 truncate rounded-lg border border-border bg-subtle px-3 text-body-sm",
          className,
        )}
      >
        <DatabaseIcon className="size-4 shrink-0 text-ash" />
        <span className="truncate">{state.current || "—"}</span>
      </div>
    )
  }
  const items = list.map((n) => ({
    value: n,
    label: d.engine === "redis" ? `db${n}` : n,
  }))
  return (
    <Select
      items={items}
      value={state.current}
      onValueChange={(v) => v && state.setDb(v)}
    >
      <SelectTrigger
        aria-label="Database"
        className={cn("h-9 w-full md:h-9", className)}
      >
        <DatabaseIcon className="size-4 shrink-0 text-ash" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-80">
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="truncate">{o.label}</span>
            {isSystemDb(d.engine, o.value) && (
              <span className="ms-auto text-caption text-ash">system</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const objectIcon = (kind: string) =>
  kind === "view" || kind === "materialized_view" ? Eye : Table2

function groupObjects(objects: DatabaseObject[], q: string) {
  const s = q.trim().toLowerCase()
  const groups = new Map<string, DatabaseObject[]>()
  for (const o of objects) {
    if (s && !o.name.toLowerCase().includes(s)) continue
    const list = groups.get(o.schema) ?? []
    list.push(o)
    groups.set(o.schema, list)
  }
  return [...groups.entries()]
}

function ObjectRail({ state }: { state: DbState }) {
  const { database: d } = useDashboard()
  const [params, setParams] = useExplorerParams()
  const [q, setQ] = useState("")
  const objects = state.overview?.objects ?? []
  const groups = groupObjects(objects, q)
  const noun = d.engine === "mongodb" ? "collections" : "tables"

  return (
    <aside className="flex min-h-0 flex-col border-e border-border bg-subtle/60">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center gap-1.5">
          <DatabasePicker state={state} className="min-w-0 flex-1" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Read the list again"
                  onClick={state.refetch}
                />
              }
            >
              <RefreshCw />
            </TooltipTrigger>
            <TooltipContent>Read the list again</TooltipContent>
          </Tooltip>
        </div>
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder={`Find ${noun}`}
          label={`Find ${noun}`}
          className="md:w-full"
        />
      </div>
      <nav aria-label={noun} className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {state.loading ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="px-4 py-6 text-center text-body-sm text-muted-foreground">
            {q ? `No ${noun} match “${q}”.` : `No ${noun} here yet.`}
          </p>
        ) : (
          groups.map(([schema, list]) => (
            <div key={schema} className="mb-1">
              {schema && groups.length > 1 && (
                <p className="flex items-center gap-1.5 px-4 pt-2 pb-1 font-label text-[11px] tracking-label text-ash uppercase">
                  <Layers className="size-3" />
                  {schema}
                  <span className="ms-auto font-sans tracking-normal normal-case">
                    {list.length}
                  </span>
                </p>
              )}
              <ul>
                {list.map((o) => {
                  const Icon = objectIcon(o.kind)
                  const current =
                    params.obj === o.name && params.schema === o.schema
                  return (
                    <li key={`${o.schema}.${o.name}`}>
                      <button
                        type="button"
                        aria-current={current ? "page" : undefined}
                        onClick={() =>
                          setParams({
                            schema: o.schema || null,
                            obj: o.name,
                            view: null,
                          })
                        }
                        className="group mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-body-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-strong"
                        title={`${kindLabel[o.kind] ?? o.kind} · ${o.schema ? `${o.schema}.` : ""}${o.name}`}
                      >
                        <Icon className="size-4 shrink-0 text-ash group-aria-[current=page]:text-brand" />
                        <span className="min-w-0 flex-1 truncate">
                          {o.name}
                        </span>
                        {o.rows != null && (
                          <span className="shrink-0 text-[11px] text-ash tabular-nums">
                            {compact(o.rows)}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
        {state.overview?.capped && (
          <p className="px-4 py-2 text-caption text-ash">
            Showing the first 5,000. Search to find others.
          </p>
        )}
      </nav>
      <div className="border-t border-border px-4 py-2 text-caption text-ash">
        {objects.length.toLocaleString()}{" "}
        {objects.length === 1 ? noun.replace(/s$/, "") : noun}
        {totalBytes(objects) > 0 && ` · ${formatSize(totalBytes(objects))}`}
      </div>
    </aside>
  )
}

const totalBytes = (list: DatabaseObject[]) =>
  list.reduce((n, o) => n + (o.bytes ?? 0), 0)

export function compact(n: number) {
  return Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n)
}

function PickHint({
  overview,
  loading,
}: {
  overview?: DatabaseOverview
  loading: boolean
}) {
  const { database: d } = useDashboard()
  const [, setParams] = useExplorerParams()
  const objects = overview?.objects ?? []
  const biggest = [...objects]
    .sort((a, b) => (b.rows ?? 0) - (a.rows ?? 0))
    .slice(0, 6)
  const noun = d.engine === "mongodb" ? "collection" : "table"
  return (
    <div className="flex min-h-0 flex-col items-center justify-center gap-5 overflow-y-auto p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
        <TableProperties className="size-6" />
      </span>
      <div>
        <h2 className="text-subheading font-light">
          {loading ? "Reading what's inside…" : `Pick a ${noun}`}
        </h2>
        <p className="mt-1 max-w-md text-body-sm text-muted-foreground">
          See its rows, search and filter them, sort by any column, and read its
          columns and indexes. Everything here only reads.
        </p>
      </div>
      {biggest.length > 0 && (
        <div className="grid w-full max-w-2xl grid-cols-2 gap-2 lg:grid-cols-3">
          {biggest.map((o) => {
            const Icon = objectIcon(o.kind)
            return (
              <button
                key={`${o.schema}.${o.name}`}
                type="button"
                onClick={() =>
                  setParams({ schema: o.schema || null, obj: o.name })
                }
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-start shadow-sm outline-none hover:border-mist hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-body-sm font-medium">
                    {o.name}
                  </span>
                  <span className="block truncate text-caption text-ash">
                    {o.rows != null
                      ? `≈ ${rowsText(o.rows)}`
                      : kindLabel[o.kind]}
                    {o.bytes ? ` · ${formatSize(o.bytes)}` : ""}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
      <p className="flex items-center gap-1.5 text-caption text-ash">
        <Lock className="size-3" />
        Read only · nothing you do here changes the data
      </p>
    </div>
  )
}

function PhoneObjects({ state }: { state: DbState }) {
  const { database: d } = useDashboard()
  const [, setParams] = useExplorerParams()
  const [q, setQ] = useState("")
  const groups = groupObjects(state.overview?.objects ?? [], q)
  const noun = d.engine === "mongodb" ? "collections" : "tables"
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="flex flex-col gap-2 px-4">
        <DatabasePicker state={state} className="h-11" />
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder={`Find ${noun}`}
          label={`Find ${noun}`}
        />
      </div>
      {state.loading ? (
        <div className="flex flex-col gap-2 px-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="px-4 py-10 text-center text-body-sm text-muted-foreground">
          {q ? `No ${noun} match “${q}”.` : `No ${noun} here yet.`}
        </p>
      ) : (
        groups.map(([schema, list]) => (
          <section key={schema}>
            {schema && (
              <h3 className="px-4 pb-2 font-label text-caption tracking-label text-ash uppercase">
                {schema}
              </h3>
            )}
            <ul className="divide-y divide-border border-y border-border">
              {list.map((o) => {
                const Icon = objectIcon(o.kind)
                return (
                  <li key={o.name}>
                    <button
                      type="button"
                      onClick={() =>
                        setParams({ schema: o.schema || null, obj: o.name })
                      }
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start active:bg-muted"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium">
                          {o.name}
                        </span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {kindLabel[o.kind] ?? o.kind}
                          {o.rows != null && ` · ≈ ${rowsText(o.rows)}`}
                          {o.bytes ? ` · ${formatSize(o.bytes)}` : ""}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

// ---- one table ----

const pageSizes = [50, 100, 250, 500, 1000]

function ObjectPanel() {
  const { database: d, phone } = useDashboard()
  const [params, setParams] = useExplorerParams()
  const db = useCurrentDb().current
  const info = useObjectInfo(d.id, db, params.schema, params.obj)
  const sendToQuery = useSendToQuery(d.id)
  const view = params.view
  const name = params.obj

  const header = (
    <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 max-md:px-2">
      {phone && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to the list"
          onClick={() => setParams({ obj: null, schema: null, view: null })}
        >
          <ChevronLeft className="size-5 rtl:rotate-180" />
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 truncate text-body font-medium">
          {!phone && (
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
              <Table2 className="size-3.5" />
            </span>
          )}
          {params.schema && !phone && (
            <span className="font-normal text-ash">{params.schema}.</span>
          )}
          <span className="truncate">{name}</span>
        </h2>
        {info.data && (
          <p className="truncate text-caption text-muted-foreground">
            {kindLabel[info.data.kind] ?? info.data.kind} ·{" "}
            {info.data.columns.length}{" "}
            {d.engine === "mongodb" ? "fields seen" : "columns"}
            {info.data.key.length > 0 && ` · key ${info.data.key.join(", ")}`}
          </p>
        )}
      </div>
      <Segmented
        label="View"
        value={view}
        onChange={(v) =>
          setParams({ view: v === "rows" ? null : v }, { history: "replace" })
        }
        items={[
          {
            value: "rows",
            label: phone ? (
              <Rows3 className="size-4" aria-label="Rows" />
            ) : (
              "Rows"
            ),
          },
          {
            value: "structure",
            label: phone ? (
              <TableProperties className="size-4" aria-label="Structure" />
            ) : (
              "Structure"
            ),
          },
        ]}
      />
      {!phone && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => sendToQuery(selectFor(d.engine, params.schema, name))}
        >
          <Code />
          Query it
        </Button>
      )}
    </div>
  )

  return (
    <section className="flex min-h-0 min-w-0 flex-col">
      {header}
      {view === "structure" ? (
        <StructureView
          info={info.data}
          loading={info.isPending}
          error={info.error?.message}
        />
      ) : (
        <RowsView info={info.data} />
      )}
    </section>
  )
}

function RowsView({ info }: { info?: ObjectInfo }) {
  const { database: d, phone } = useDashboard()
  const [params] = useExplorerParams()
  const db = useCurrentDb().current
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<RowFilter[]>([])
  const [match, setMatch] = useState<"all" | "any">("all")
  const [where, setWhere] = useState("")
  const [sort, setSort] = useState<RowSort[]>([])
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(100)
  const [row, setRow] = useState(0)
  const [rowOpen, setRowOpen] = useOpen("database-row")
  const [view, setView] = useState<string | null>(null)
  const q = useDebounced(search, 350)
  const target = { database: db, schema: params.schema, table: params.obj }
  const viewState: DatabaseViewState = {
    search: search || undefined,
    filters: filters.length ? filters : undefined,
    match: filters.length > 1 ? match : undefined,
    where: where.trim() || undefined,
    sort: sort.length ? sort : undefined,
    page_size: size === 100 ? undefined : size,
  }
  const applyView = (v: DatabaseSavedView | null) => {
    const st = v?.state ?? {}
    setSearch(st.search ?? "")
    setFilters(st.filters ?? [])
    setMatch(st.match ?? "all")
    setWhere(st.where ?? "")
    setSort(st.sort ?? [])
    setSize(st.page_size || 100)
    setPage(0)
    setView(v?.id ?? null)
  }

  const req: RowsRequest = {
    database: db || undefined,
    schema: params.schema || undefined,
    table: params.obj,
    search: q || undefined,
    filters: filters.length ? filters : undefined,
    match: filters.length > 1 ? match : undefined,
    where: where.trim() || undefined,
    // No sort of your own: by the key, so pages and edited rows stay put.
    sort: sort.length
      ? sort
      : info?.key.length
        ? info.key.map((column) => ({ column }))
        : undefined,
    limit: size,
    offset: page * size,
    count: true,
  }
  const rows = useRows(d.id, req)
  const types = new Map(info?.columns.map((c) => [c.name, c.type]))
  const data = rows.data && {
    ...rows.data,
    columns: rows.data.columns.map((c) => ({
      ...c,
      type: types.get(c.name) || c.type,
    })),
  }
  const total = data?.total
  const from = page * size
  const shown = data?.rows.length ?? 0
  const lastPage =
    total != null ? Math.max(0, Math.ceil(total / size) - 1) : undefined
  const keys = info?.key ?? []
  const editing = useRowEditing({
    target,
    info,
    result: data,
    onDone: () => setRowOpen(false),
  })
  // Changing what's asked starts at the first page again.
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(0)
    }

  const views = (
    <ViewsMenu
      target={target}
      state={viewState}
      active={view}
      onApply={applyView}
    />
  )

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 max-md:px-4">
      {!phone && views}
      <SearchBox
        value={search}
        onChange={reset(setSearch)}
        placeholder={
          d.engine === "mongodb" ? "Search text fields" : "Search every column"
        }
        label="Search the rows"
        className="max-md:w-full md:w-64"
      />
      {phone && views}
      <FilterButton
        columns={info?.columns.map((c) => c.name) ?? []}
        filters={filters}
        onFilters={reset(setFilters)}
        match={match}
        onMatch={reset(setMatch)}
        where={where}
        onWhere={reset(setWhere)}
        phone={phone}
      />
      {filters.map((f, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: filters have no id.
          key={i}
          className="flex h-8 max-w-64 items-center gap-1 rounded-full border border-border bg-card ps-3 pe-1 text-caption"
        >
          <span className="truncate">
            <span className="font-medium">{f.column}</span>{" "}
            <span className="text-muted-foreground">{opLabel(f.op)}</span>{" "}
            {f.value && <span className="font-mono">{f.value}</span>}
          </span>
          <button
            type="button"
            aria-label="Remove filter"
            onClick={() => reset(setFilters)(filters.filter((_, j) => j !== i))}
            className="flex size-6 items-center justify-center rounded-full text-ash hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      {where.trim() && (
        <span className="flex h-8 max-w-72 items-center gap-1 rounded-full border border-border bg-card ps-3 pe-1 text-caption">
          <Code className="size-3.5 shrink-0 text-ash" />
          <span className="truncate font-mono">{where}</span>
          <button
            type="button"
            aria-label="Remove condition"
            onClick={() => reset(setWhere)("")}
            className="flex size-6 items-center justify-center rounded-full text-ash hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
      )}
      <div className="ms-auto flex items-center gap-1.5">
        {rows.isFetching && (
          <RefreshCw className="size-3.5 animate-spin text-ash" />
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Read again"
                onClick={() => rows.refetch()}
              />
            }
          >
            <RefreshCw />
          </TooltipTrigger>
          <TooltipContent>Read again</TooltipContent>
        </Tooltip>
        {data && <ExportMenu result={data} name={params.obj} compact={phone} />}
        {editing.can.insert && (
          <Button
            size={phone ? "icon" : "sm"}
            aria-label="Add a row"
            onClick={editing.add}
            className={cn(phone && "size-11")}
          >
            <Plus />
            {!phone && "Add row"}
          </Button>
        )}
      </div>
    </div>
  )

  const pager = (
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2 max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <ResultFacts>
        {shown > 0 ? (
          <span>
            <span className="text-foreground">
              {(from + 1).toLocaleString()}–{(from + shown).toLocaleString()}
            </span>
            {total != null && (
              <>
                {" "}
                of {data?.estimated ? "≈ " : ""}
                {total.toLocaleString()}
              </>
            )}
          </span>
        ) : (
          <span>No rows</span>
        )}
        {data && <span>{data.ms} ms</span>}
      </ResultFacts>
      <div className="ms-auto flex items-center gap-1.5">
        {!phone && (
          <Select
            items={pageSizes.map((n) => ({
              value: String(n),
              label: `${n} a page`,
            }))}
            value={String(size)}
            onValueChange={(v) => {
              if (!v) return
              setSize(Number(v))
              setPage(0)
            }}
          >
            <SelectTrigger aria-label="Rows a page" className="h-8 w-32 md:h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} a page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
          className="max-md:size-11"
        >
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
        <span className="min-w-16 text-center text-caption text-muted-foreground tabular-nums">
          Page {page + 1}
          {lastPage != null && ` of ${(lastPage + 1).toLocaleString()}`}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={!data?.truncated}
          onClick={() => setPage(page + 1)}
          className="max-md:size-11"
        >
          <ChevronRight className="rtl:rotate-180" />
        </Button>
      </div>
    </div>
  )

  let body: React.ReactNode
  if (rows.error && !data) {
    body = (
      <div className="m-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-body-sm">
        <p className="font-medium">Couldn't read the rows</p>
        <p className="mt-1 font-mono text-caption break-words text-muted-foreground">
          {rows.error.message}
        </p>
      </div>
    )
  } else if (!data) {
    body = (
      <div className="flex flex-col gap-1.5 p-4">
        {Array.from({ length: 10 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders.
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    )
  } else if (data.rows.length === 0) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <Filter className="size-5 text-ash" />
        <p className="text-body-sm font-medium">
          {q || filters.length || where
            ? "Nothing matches"
            : "This table is empty"}
        </p>
        {(q || filters.length > 0 || where) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("")
              setFilters([])
              setWhere("")
              setPage(0)
            }}
          >
            Clear the filters
          </Button>
        )}
      </div>
    )
  } else if (phone) {
    body = (
      <PhoneRows
        result={data}
        keys={keys}
        offset={from}
        onOpenRow={(i) => {
          setRow(i)
          setRowOpen(true)
        }}
      />
    )
  } else {
    body = (
      <ResultGrid
        result={data}
        sort={sort}
        onSort={reset(setSort)}
        keys={keys}
        offset={from}
        onOpenRow={(i) => {
          setRow(i)
          setRowOpen(true)
        }}
        className={cn(
          "flex-1",
          rows.isFetching && rows.isPlaceholderData && "opacity-60",
        )}
      />
    )
  }

  return (
    <>
      {toolbar}
      {rows.error && data && (
        <p className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 font-mono text-caption text-destructive">
          {rows.error.message}
        </p>
      )}
      <div className="flex min-h-0 flex-1 flex-col">{body}</div>
      {pager}
      {data && (
        <RowDetails
          result={data}
          index={row}
          onIndex={setRow}
          open={rowOpen}
          onOpenChange={setRowOpen}
          phone={phone}
          keys={keys}
          offset={from}
          title={params.obj}
          actions={
            editing.can.change
              ? (i) => (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editing.edit(i)}
                      className="max-md:h-9"
                    >
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete this row"
                      disabled={editing.busy}
                      onClick={() => editing.remove([i])}
                      className="text-destructive hover:text-destructive max-md:size-9"
                    >
                      <Trash2 />
                    </Button>
                  </>
                )
              : undefined
          }
        />
      )}
      {editing.layers}
    </>
  )
}

// ---- filters ----

function FilterButton({
  columns,
  filters,
  onFilters,
  match,
  onMatch,
  where,
  onWhere,
  phone,
}: {
  columns: string[]
  filters: RowFilter[]
  onFilters: (f: RowFilter[]) => void
  match: "all" | "any"
  onMatch: (m: "all" | "any") => void
  where: string
  onWhere: (w: string) => void
  phone: boolean
}) {
  const [open, setOpen] = useOpen("database-filters")
  const count = filters.length + (where.trim() ? 1 : 0)
  const form = (
    <FilterForm
      columns={columns}
      filters={filters}
      match={match}
      where={where}
      onApply={(f, m, w) => {
        onFilters(f)
        onMatch(m)
        onWhere(w)
        setOpen(false)
      }}
      onCancel={() => setOpen(false)}
    />
  )
  const label = (
    <>
      <ListFilter />
      Filter
      {count > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-medium text-primary-foreground">
          {count}
        </span>
      )}
    </>
  )
  if (phone) {
    return (
      <>
        <Button
          variant="outline"
          className="h-11"
          onClick={() => setOpen(true)}
        >
          {label}
        </Button>
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title="Filter rows"
          full
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4">{form}</div>
        </BottomSheet>
      </>
    )
  }
  return (
    <Popover open={open} onOpenChange={(next) => setOpen(next)}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        {label}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[36rem] max-w-[calc(100vw-2rem)] p-4"
      >
        {form}
      </PopoverContent>
    </Popover>
  )
}

function FilterForm({
  columns,
  filters,
  match,
  where,
  onApply,
  onCancel,
}: {
  columns: string[]
  filters: RowFilter[]
  match: "all" | "any"
  where: string
  onApply: (f: RowFilter[], m: "all" | "any", w: string) => void
  onCancel: () => void
}) {
  const { database: d, phone } = useDashboard()
  const blank = (): RowFilter => ({
    column: columns[0] ?? "",
    op: "contains",
    value: "",
  })
  const [rows, setRows] = useState<RowFilter[]>(
    filters.length ? filters : [blank()],
  )
  const [m, setM] = useState(match)
  const [w, setW] = useState(where)
  const [showWhere, setShowWhere] = useState(!!where)
  const set = (i: number, patch: Partial<RowFilter>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const ready = rows.filter(
    (r) =>
      r.column &&
      (filterOps.find((o) => o.value === r.op)?.noValue || r.value !== ""),
  )
  const whereLabel =
    d.engine === "mongodb"
      ? "Your own filter (JSON)"
      : "Your own condition (SQL after WHERE)"

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        onApply(ready, m, showWhere ? w : "")
      }}
    >
      {rows.length > 1 && (
        <div className="flex items-center gap-2 text-body-sm">
          Rows that match
          <Segmented
            label="Match"
            value={m}
            onChange={setM}
            items={[
              { value: "all", label: "all" },
              { value: "any", label: "any" },
            ]}
          />
          of these
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const op = filterOps.find((o) => o.value === r.op)
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id.
              key={i}
              className={cn(
                "flex gap-2",
                phone && "flex-col rounded-2xl border border-border p-3",
              )}
            >
              <Select
                items={columns.map((c) => ({ value: c, label: c }))}
                value={r.column}
                onValueChange={(v) => v && set(i, { column: v })}
              >
                <SelectTrigger
                  aria-label="Column"
                  className={cn(phone ? "w-full" : "h-9 w-40 md:h-9")}
                >
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  className="max-h-72"
                >
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                items={filterOps.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                value={r.op}
                onValueChange={(v) => v && set(i, { op: v as RowFilter["op"] })}
              >
                <SelectTrigger
                  aria-label="Condition"
                  className={cn(phone ? "w-full" : "h-9 w-40 md:h-9")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {filterOps.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!op?.noValue && (
                <Input
                  aria-label="Value"
                  value={r.value ?? ""}
                  onChange={(e) => set(i, { value: e.target.value })}
                  placeholder={r.op === "in" ? "a, b, c" : "Value"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={cn(
                    "font-mono",
                    phone ? "w-full" : "h-9 min-w-0 flex-1",
                  )}
                />
              )}
              {op?.noValue && !phone && <span className="flex-1" />}
              <Button
                type="button"
                variant="ghost"
                size={phone ? "default" : "icon-sm"}
                aria-label="Remove this filter"
                className={cn(!phone && "mt-0.5")}
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                <X />
                {phone && "Remove"}
              </Button>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRows([...rows, blank()])}
        >
          <Plus />
          Add a filter
        </Button>
        {!showWhere && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowWhere(true)}
          >
            <FileCode2 />
            Write a condition
          </Button>
        )}
      </div>
      {showWhere && (
        <label htmlFor="rows-where" className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">{whereLabel}</span>
          <Input
            id="rows-where"
            value={w}
            onChange={(e) => setW(e.target.value)}
            placeholder={
              d.engine === "mongodb"
                ? '{ "total": { "$gt": 100 } }'
                : "total > 100 AND status <> 'done'"
            }
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
          />
          <span className="text-caption text-muted-foreground">
            Runs read only, together with the filters above.
          </span>
        </label>
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onApply([], m, "")}
          disabled={filters.length === 0 && !where}
        >
          Clear all
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Apply</Button>
      </div>
    </form>
  )
}

// ---- structure ----

function StructureView({
  info,
  loading,
  error,
}: {
  info?: ObjectInfo
  loading: boolean
  error?: string
}) {
  const { database: d } = useDashboard()
  if (error) {
    return <p className="m-4 text-body-sm text-destructive">{error}</p>
  }
  if (loading || !info) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }
  const mongo = d.engine === "mongodb"
  const facts = info.facts ?? []
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-5">
      {facts.length > 0 && (
        <section aria-label="About this table">
          <dl className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-2">
            {facts.map((f) => (
              <div
                key={f.label}
                className="min-w-0 rounded-2xl border border-border bg-card px-3.5 py-2.5"
              >
                <dt className="text-caption text-ash">{f.label}</dt>
                <dd
                  title={f.value}
                  className="truncate font-mono text-body-sm text-foreground"
                >
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {info.read_only && (
        <p className="rounded-2xl border border-border bg-subtle px-4 py-3 text-body-sm text-muted-foreground">
          {info.read_only}
        </p>
      )}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-body-sm font-medium">
          {mongo ? "Fields" : "Columns"}
          <span className="text-caption font-normal text-ash">
            {info.columns.length}
            {mongo && info.sampled
              ? ` · seen in ${info.sampled} sampled documents`
              : ""}
          </span>
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-border [contain:inline-size]">
          <table className="w-full text-body-sm">
            <thead className="bg-subtle text-caption text-ash">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start [&>th]:font-normal">
                <th>Name</th>
                <th>Type</th>
                <th>{mongo ? "In every document" : "Null"}</th>
                {!mongo && <th>Default</th>}
                {!mongo && <th>Notes</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {info.columns.map((c) => (
                <tr
                  key={c.name}
                  className="[&>td]:px-3 [&>td]:py-2 [&>td]:align-top"
                >
                  <td className="font-medium">
                    <span className="flex items-center gap-1.5">
                      {c.key && (
                        <KeyRound
                          className="size-3.5 text-brand"
                          aria-label="Key"
                        />
                      )}
                      {c.name}
                    </span>
                  </td>
                  <td className="font-mono text-caption text-muted-foreground">
                    {c.type || "—"}
                  </td>
                  <td className="text-caption text-muted-foreground">
                    {mongo
                      ? c.nullable
                        ? "No"
                        : "Yes"
                      : c.nullable
                        ? "Yes"
                        : "No"}
                  </td>
                  {!mongo && (
                    <td className="max-w-64 truncate font-mono text-caption text-muted-foreground">
                      {c.default ?? <NullText className="not-italic" />}
                    </td>
                  )}
                  {!mongo && (
                    <td className="text-caption text-muted-foreground">
                      {[c.extra, c.comment].filter(Boolean).join(" · ") || ""}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {info.indexes.length > 0 && (
        <section>
          <h3 className="mb-2 text-body-sm font-medium">
            Indexes{" "}
            <span className="text-caption font-normal text-ash">
              {info.indexes.length}
            </span>
          </h3>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {info.indexes.map((x) => (
              <li key={x.name} className="flex flex-col gap-1 px-4 py-2.5">
                <span className="flex flex-wrap items-center gap-2 text-body-sm font-medium">
                  {x.name}
                  {x.primary && <Tag>primary</Tag>}
                  {x.unique && !x.primary && <Tag>unique</Tag>}
                </span>
                <code className="font-mono text-caption break-all whitespace-pre-wrap text-muted-foreground">
                  {x.definition}
                </code>
              </li>
            ))}
          </ul>
        </section>
      )}
      {info.constraints.length > 0 && (
        <section>
          <h3 className="mb-2 text-body-sm font-medium">Constraints</h3>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {info.constraints.map((x) => (
              <li key={x.name} className="flex flex-col gap-1 px-4 py-2.5">
                <span className="flex items-center gap-2 text-body-sm font-medium">
                  {x.name}
                  <Tag>{x.kind.replace("_", " ")}</Tag>
                </span>
                <code className="font-mono text-caption break-all whitespace-pre-wrap text-muted-foreground">
                  {x.definition}
                </code>
              </li>
            ))}
          </ul>
        </section>
      )}
      {info.definition && (
        <section>
          <h3 className="mb-2 text-body-sm font-medium">Definition</h3>
          <CodeBlock text={info.definition} engine={d.engine} />
        </section>
      )}
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 font-label text-[10px] tracking-label text-muted-foreground uppercase">
      {children}
    </span>
  )
}
