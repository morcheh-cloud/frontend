"use client"

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  KeyRound,
  RefreshCw,
} from "lucide-react"
import { useState } from "react"

import { SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounced } from "@/hooks/useDebounced"
import { useOpen } from "@/hooks/useOpen"
import { formatDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useRedisKey, useRedisKeys } from "../../../api"
import { useDashboard } from "../parts"
import { benchHeight, compact, DatabasePicker, useCurrentDb } from "./data-tab"
import { ExportMenu, PhoneRows, ResultGrid, RowDetails } from "./grid"
import { pretty } from "./meta"
import { useExplorerParams } from "./state"

const types = ["", "string", "hash", "list", "set", "zset", "stream"] as const
const typeLabel: Record<string, string> = {
  "": "All",
  string: "Strings",
  hash: "Hashes",
  list: "Lists",
  set: "Sets",
  zset: "Sorted sets",
  stream: "Streams",
}

// Redis: keys by pattern on one side, the chosen key's value on the other.
export function KeyBrowser() {
  const { phone } = useDashboard()
  const [params] = useExplorerParams()
  if (phone) return params.obj ? <KeyView /> : <KeyList />
  return (
    <div
      className={cn(
        "grid grid-cols-[22rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border",
        benchHeight,
      )}
    >
      <KeyList />
      {params.obj ? (
        <KeyView key={params.obj} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
            <KeyRound className="size-6" />
          </span>
          <h2 className="text-subheading font-light">Pick a key</h2>
          <p className="max-w-sm text-body-sm text-muted-foreground">
            Search with a pattern like <code className="font-mono">user:*</code>{" "}
            and pick a key to see its value. Keys are read with SCAN, so a big
            database stays responsive.
          </p>
        </div>
      )}
    </div>
  )
}

function KeyList() {
  const { database: d, phone } = useDashboard()
  const state = useCurrentDb()
  const [params, setParams] = useExplorerParams()
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const pattern = useDebounced(
    q.trim() ? (/[*?[]/.test(q) ? q.trim() : `*${q.trim()}*`) : "",
    350,
  )
  const keys = useRedisKeys(d.id, state.current, pattern, type)
  const pages = keys.data?.pages ?? []
  const rows = pages.flatMap((p) => p.rows)
  const total = pages[0]?.total

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col",
        !phone && "border-e border-border bg-subtle/60",
      )}
    >
      <div className="flex flex-col gap-2 border-b border-border p-3 max-md:px-4">
        <div className="flex items-center gap-1.5">
          <DatabasePicker
            state={state}
            className="min-w-0 flex-1 max-md:h-11"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Read again"
            onClick={() => keys.refetch()}
          >
            <RefreshCw className={cn(keys.isFetching && "animate-spin")} />
          </Button>
        </div>
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Pattern, e.g. user:*"
          label="Find keys"
          className="md:w-full"
        />
        <div className="-mx-1 flex [scrollbar-width:none] gap-1 overflow-x-auto px-1">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className="h-9 shrink-0 rounded-full border border-border px-3 text-caption whitespace-nowrap text-muted-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background md:h-7"
            >
              {typeLabel[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {keys.isPending ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : keys.error ? (
          <p className="p-4 text-body-sm text-destructive">
            {keys.error.message}
          </p>
        ) : rows.length === 0 && !keys.hasNextPage ? (
          <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">
            No keys match.
          </p>
        ) : (
          <ul
            className={cn(
              phone && "divide-y divide-border border-b border-border",
            )}
          >
            {rows.map((r) => {
              const key = r[0] ?? ""
              const ttl = Number(r[2])
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-current={params.obj === key ? "page" : undefined}
                    onClick={() => setParams({ obj: key })}
                    className={cn(
                      "flex w-full items-center gap-2 text-start outline-none",
                      phone
                        ? "min-h-14 px-4 py-2 active:bg-muted"
                        : "mx-1.5 w-[calc(100%-0.75rem)] rounded-lg px-2.5 py-1.5 hover:bg-muted aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-strong",
                    )}
                  >
                    <TypeBadge type={r[1] ?? ""} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">
                      {key}
                    </span>
                    {ttl > 0 && (
                      <Clock
                        className="size-3 shrink-0 text-ash"
                        aria-label="Expires"
                      />
                    )}
                    {r[3] != null && (
                      <span className="shrink-0 text-[11px] text-ash tabular-nums">
                        {compact(Number(r[3]))}
                      </span>
                    )}
                    {phone && (
                      <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {keys.hasNextPage && (
          <div className="p-3">
            <Button
              variant="outline"
              className="w-full"
              disabled={keys.isFetchingNextPage}
              onClick={() => keys.fetchNextPage()}
            >
              {keys.isFetchingNextPage ? "Looking…" : "Look further"}
            </Button>
          </div>
        )}
      </div>
      <div className="border-t border-border px-4 py-2 text-caption text-ash">
        {rows.length.toLocaleString()} shown
        {total != null && ` · ${total.toLocaleString()} keys in this database`}
      </div>
    </aside>
  )
}

const typeTone: Record<string, string> = {
  string: "bg-muted text-muted-foreground",
  hash: "bg-brand-soft text-brand-strong",
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "w-12 shrink-0 rounded-md px-1 py-0.5 text-center font-label text-[10px] tracking-label uppercase",
        typeTone[type] ?? "bg-muted text-muted-foreground",
      )}
    >
      {type}
    </span>
  )
}

function KeyView() {
  const { database: d, phone } = useDashboard()
  const [params, setParams] = useExplorerParams()
  const db = useCurrentDb().current
  const key = useRedisKey(d.id, db, params.obj)
  const [pretty_, setPretty] = useState(true)
  const [row, setRow] = useState(0)
  const [open, setOpen] = useOpen("redis-item")
  const k = key.data

  return (
    <section className="flex min-h-0 min-w-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 max-md:px-2">
        {phone && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to the keys"
            onClick={() => setParams({ obj: null })}
          >
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-mono text-body-sm font-medium">
            {params.obj}
          </h2>
          {k && (
            <p className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
              <TypeBadge type={k.type} />
              <span>
                {k.size.toLocaleString()}{" "}
                {k.type === "string"
                  ? "bytes"
                  : k.size === 1
                    ? "item"
                    : "items"}
              </span>
              <span>
                {k.ttl_ms < 0
                  ? "Never expires"
                  : `Expires in ${formatDuration(Math.round(k.ttl_ms / 1000))}`}
              </span>
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Read again"
          onClick={() => key.refetch()}
        >
          <RefreshCw className={cn(key.isFetching && "animate-spin")} />
        </Button>
        {k?.value && <ExportMenu result={k.value} name={params.obj} compact />}
      </div>
      {key.isPending ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : key.error ? (
        <p className="p-4 text-body-sm text-destructive">{key.error.message}</p>
      ) : k?.text != null ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 px-4 pt-3">
            <label className="flex items-center gap-2 text-caption text-muted-foreground">
              <input
                type="checkbox"
                checked={pretty_}
                onChange={(e) => setPretty(e.target.checked)}
                className="size-4 accent-[var(--color-brand)]"
              />
              Format JSON
            </label>
            {k.truncated && (
              <span className="text-caption text-warning">
                Showing the first 64 KiB
              </span>
            )}
          </div>
          <pre className="m-4 min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-subtle p-4 font-mono text-[12.5px] leading-relaxed break-all whitespace-pre-wrap">
            {pretty_ ? pretty(k.text) : k.text}
          </pre>
        </div>
      ) : k?.value ? (
        <>
          {phone ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PhoneRows
                result={k.value}
                onOpenRow={(i) => {
                  setRow(i)
                  setOpen(true)
                }}
              />
            </div>
          ) : (
            <ResultGrid
              result={k.value}
              className="flex-1"
              onOpenRow={(i) => {
                setRow(i)
                setOpen(true)
              }}
            />
          )}
          {k.truncated && (
            <p className="border-t border-border px-4 py-2 text-caption text-muted-foreground">
              Showing {k.value.rows.length.toLocaleString()} of{" "}
              {k.size.toLocaleString()}. Use the Query tab (e.g.{" "}
              <code className="font-mono">HSCAN</code>) to read further.
            </p>
          )}
          <RowDetails
            result={k.value}
            index={row}
            onIndex={setRow}
            open={open}
            onOpenChange={setOpen}
            phone={phone}
            title={params.obj}
          />
        </>
      ) : (
        <p className="p-4 text-body-sm text-muted-foreground">
          This type can't be shown here.
        </p>
      )}
    </section>
  )
}
