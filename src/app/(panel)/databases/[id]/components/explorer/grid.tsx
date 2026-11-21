"use client"

import {
  ArrowDown,
  ArrowUp,
  Braces,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  KeyRound,
  Rows3,
} from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { QueryResult, RowSort } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  download,
  fileName,
  numericType,
  pretty,
  toCsv,
  toJson,
  toTsv,
} from "./meta"

type Grid = Pick<QueryResult, "columns" | "rows" | "documents">

export function NullText({ className }: { className?: string }) {
  return (
    <span className={cn("text-ash italic select-none", className)}>NULL</span>
  )
}

// One value in a cell: one line, cut at the cell's width.
function Cell({ value, numeric }: { value: string | null; numeric: boolean }) {
  if (value == null) return <NullText />
  if (value === "") return <span className="text-ash select-none">empty</span>
  const line = value.length > 300 ? `${value.slice(0, 300)}…` : value
  return (
    <span className={cn(numeric && "tabular-nums")}>
      {line.replaceAll(/\s+/g, " ")}
    </span>
  )
}

function nextSort(sort: RowSort[], column: string, add: boolean): RowSort[] {
  const at = sort.find((s) => s.column === column)
  const rest = add ? sort.filter((s) => s.column !== column) : []
  if (!at) return [...rest, { column, desc: false }]
  if (!at.desc)
    return add
      ? sort.map((s) => (s.column === column ? { column, desc: true } : s))
      : [{ column, desc: true }]
  return rest
}

function compare(a: string | null, b: string | null, numeric: boolean) {
  if (a == null) return b == null ? 0 : 1
  if (b == null) return -1
  if (numeric) {
    const x = Number(a)
    const y = Number(b)
    if (!Number.isNaN(x) && !Number.isNaN(y)) return x - y
  }
  return a.localeCompare(b, undefined, { numeric: true })
}

// Rows of a result as a table with a sticky header. Sorting is the server's
// when `onSort` is given (a table's rows), else done here (a query's
// result). Wide results scroll inside the box, never the page.
export function ResultGrid({
  result,
  sort,
  onSort,
  keys = [],
  offset = 0,
  onOpenRow,
  className,
}: {
  result: Grid
  sort?: RowSort[]
  onSort?: (sort: RowSort[]) => void
  keys?: string[]
  offset?: number
  onOpenRow?: (index: number) => void
  className?: string
}) {
  const [localSort, setLocalSort] = useState<RowSort[]>([])
  const active = onSort ? (sort ?? []) : localSort
  const numeric = result.columns.map((c) => numericType(c.type))

  let order = result.rows.map((_, i) => i)
  if (!onSort && localSort.length > 0) {
    const idx = localSort.map((s) => ({
      i: result.columns.findIndex((c) => c.name === s.column),
      desc: s.desc,
    }))
    order = [...order].sort((a, b) => {
      for (const { i, desc } of idx) {
        if (i < 0) continue
        const c = compare(result.rows[a][i], result.rows[b][i], numeric[i])
        if (c !== 0) return desc ? -c : c
      }
      return a - b
    })
  }

  const setSort = (column: string, add: boolean) => {
    const next = nextSort(active, column, add)
    onSort ? onSort(next) : setLocalSort(next)
  }

  return (
    <div
      className={cn(
        "relative min-h-0 overflow-auto [contain:inline-size]",
        className,
      )}
    >
      <table className="w-max min-w-full border-separate border-spacing-0 font-mono text-[12.5px]">
        <thead>
          <tr>
            <th className="sticky start-0 top-0 z-20 border-e border-b border-border bg-subtle px-2 py-1.5 text-end font-sans text-caption font-normal text-ash">
              #
            </th>
            {result.columns.map((c, i) => {
              const s = active.findIndex((x) => x.column === c.name)
              const dir = s >= 0 ? active[s] : undefined
              return (
                <th
                  // biome-ignore lint/suspicious/noArrayIndexKey: columns can repeat a name.
                  key={i}
                  scope="col"
                  className="sticky top-0 z-10 border-e border-b border-border bg-subtle p-0 text-start font-sans font-normal"
                >
                  <button
                    type="button"
                    onClick={(e) => setSort(c.name, e.shiftKey)}
                    title={`Sort by ${c.name} (Shift: add to the sort)`}
                    className={cn(
                      "group flex w-full max-w-[22rem] min-w-24 items-start gap-1.5 px-3 py-1.5 text-start outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
                      numeric[i] && "flex-row-reverse text-end",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-body-sm font-medium text-foreground">
                        {keys.includes(c.name) && (
                          <KeyRound
                            aria-label="Primary key"
                            className="size-3 shrink-0 text-brand"
                          />
                        )}
                        <span className="truncate">{c.name}</span>
                      </span>
                      {c.type && (
                        <span className="block truncate text-[11px] text-ash lowercase">
                          {c.type}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex shrink-0 items-center text-ash",
                        !dir && "opacity-0 group-hover:opacity-60",
                      )}
                    >
                      {dir?.desc ? (
                        <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUp className="size-3.5" />
                      )}
                      {dir && active.length > 1 && (
                        <span className="text-[10px]">{s + 1}</span>
                      )}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {order.map((ri) => {
            const row = result.rows[ri]
            return (
              <tr
                key={ri}
                onClick={() => onOpenRow?.(ri)}
                className={cn(
                  "group/row",
                  onOpenRow && "cursor-pointer",
                  "[&>td]:hover:bg-muted/60",
                )}
              >
                <td className="sticky start-0 z-[1] border-e border-b border-border bg-background px-2 py-1 text-end text-[11px] text-ash tabular-nums group-hover/row:bg-muted">
                  {offset + ri + 1}
                </td>
                {row.map((v, ci) => (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: cells have no id.
                    key={ci}
                    className={cn(
                      "max-w-[22rem] truncate border-e border-b border-border px-3 py-1",
                      numeric[ci] && "text-end",
                    )}
                  >
                    <Cell value={v} numeric={numeric[ci]} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Phones: each row as a list row (its first values), tap for the rest. A
// leading key column becomes the row's number, the next value its title.
export function PhoneRows({
  result,
  onOpenRow,
  offset = 0,
  keys = [],
}: {
  result: Grid
  onOpenRow: (index: number) => void
  offset?: number
  keys?: string[]
}) {
  const cols = result.columns
  const keyFirst =
    cols.length > 1 && keys.length === 1 && cols[0].name === keys[0]
  const title = keyFirst ? 1 : 0
  return (
    <ul className="divide-y divide-border border-y border-border">
      {result.rows.map((row, ri) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id.
        <li key={ri}>
          <button
            type="button"
            onClick={() => onOpenRow(ri)}
            className="flex min-h-14 w-full items-start gap-3 px-4 py-2.5 text-start active:bg-muted"
          >
            <span className="mt-0.5 max-w-16 min-w-8 shrink-0 truncate text-end text-caption text-ash tabular-nums">
              {keyFirst ? row[0] : offset + ri + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-body-sm font-medium">
                {row[title] ?? "NULL"}
              </span>
              <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                {cols
                  .slice(title + 1, title + 4)
                  .map((c, i) => `${c.name}: ${row[title + 1 + i] ?? "NULL"}`)
                  .join(" · ")}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

async function copy(text: string, what = "Copied") {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(what)
  } catch {
    toast.error("Couldn't copy: the browser blocked the clipboard")
  }
}

// Copy and download a result.
export function ExportMenu({
  result,
  name,
  compact,
}: {
  result: Grid
  name: string
  compact?: boolean
}) {
  const empty = result.columns.length === 0
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={empty}
        render={
          <Button
            variant="outline"
            size={compact ? "icon-sm" : "sm"}
            aria-label="Export"
          />
        }
      >
        <Download />
        {!compact && "Export"}
        {!compact && <ChevronDown className="opacity-60" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>These {result.rows.length} rows</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() =>
              copy(toTsv(result), "Copied, ready to paste into a spreadsheet")
            }
          >
            <Copy />
            Copy as a table
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => copy(toJson(result), "Copied as JSON")}
          >
            <Braces />
            Copy as JSON
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            download(
              `${fileName(name)}.csv`,
              toCsv(result),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            download(
              `${fileName(name)}.json`,
              toJson(result),
              "application/json",
            )
          }
        >
          <Download />
          Download JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Every value of one row, full length; arrows step through the rows.
export function RowDetails({
  result,
  index,
  onIndex,
  open,
  onOpenChange,
  phone,
  keys = [],
  offset = 0,
  title = "Row",
  actions,
}: {
  result: Grid
  index: number
  onIndex: (i: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
  keys?: string[]
  offset?: number
  title?: string
  // Buttons for this row (edit, delete).
  actions?: (index: number) => ReactNode
}) {
  const doc = result.documents?.[index]
  const [view, setView] = useState<"fields" | "document">("fields")
  const row = result.rows[index]
  const count = result.rows.length

  useEffect(() => {
    if (!open || phone) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea")) return
      if (e.key === "ArrowDown" || e.key === "j")
        onIndex(Math.min(count - 1, index + 1))
      if (e.key === "ArrowUp" || e.key === "k") onIndex(Math.max(0, index - 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, phone, index, count, onIndex])

  if (!row) return null

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 md:px-6">
        {doc && (
          <div className="flex rounded-lg bg-muted p-0.5">
            {(["fields", "document"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className="h-9 rounded-md px-3 text-body-sm text-muted-foreground aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm md:h-7"
              >
                {v === "fields" ? "Fields" : "Document"}
              </button>
            ))}
          </div>
        )}
        <span className="text-caption text-ash tabular-nums">
          Row {offset + index + 1} of {offset + count}
        </span>
        <div className="ms-auto flex gap-1">
          {actions?.(index)}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copy the row as JSON"
            onClick={() =>
              copy(
                doc
                  ? pretty(doc)
                  : JSON.stringify(
                      Object.fromEntries(
                        result.columns.map((c, i) => [c.name, row[i] ?? null]),
                      ),
                      null,
                      2,
                    ),
                "Row copied as JSON",
              )
            }
          >
            <Braces />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous row"
            disabled={index === 0}
            onClick={() => onIndex(index - 1)}
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next row"
            disabled={index >= count - 1}
            onClick={() => onIndex(index + 1)}
          >
            <ChevronDown />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {doc && view === "document" ? (
          <pre className="p-4 font-mono text-[12.5px] leading-relaxed break-all whitespace-pre-wrap md:px-6">
            {pretty(doc)}
          </pre>
        ) : (
          <dl className="divide-y divide-border">
            {result.columns.map((c, i) => (
              <FieldRow
                // biome-ignore lint/suspicious/noArrayIndexKey: names can repeat.
                key={i}
                name={c.name}
                type={c.type}
                isKey={keys.includes(c.name)}
                value={row[i]}
              />
            ))}
          </dl>
        )}
      </div>
    </div>
  )

  if (phone) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={title} full>
        {body}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-body">
            <Rows3 className="size-4 text-ash" />
            {title}
          </SheetTitle>
          <SheetDescription>
            {result.columns.length}{" "}
            {result.columns.length === 1 ? "value" : "values"} · ↑ ↓ to step
            through the rows
          </SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

function FieldRow({
  name,
  type,
  isKey,
  value,
}: {
  name: string
  type: string
  isKey: boolean
  value: string | null
}) {
  const shown = value == null ? null : pretty(value)
  return (
    <div className="group flex flex-col gap-1 px-4 py-2.5 md:px-6">
      <dt className="flex items-center gap-1.5 text-caption">
        {isKey && <KeyRound className="size-3 text-brand" aria-label="Key" />}
        <span className="font-medium text-foreground">{name}</span>
        {type && <span className="text-ash lowercase">{type}</span>}
        {value != null && (
          <button
            type="button"
            aria-label={`Copy ${name}`}
            onClick={() => copy(value, `${name} copied`)}
            className="ms-auto flex size-8 items-center justify-center rounded-md text-ash opacity-100 hover:bg-muted hover:text-foreground md:size-6 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <Copy className="size-3.5" />
          </button>
        )}
      </dt>
      <dd className="font-mono text-[12.5px] leading-relaxed break-all whitespace-pre-wrap">
        {shown == null ? (
          <NullText />
        ) : shown === "" ? (
          <span className="text-ash">empty</span>
        ) : (
          shown
        )}
      </dd>
    </div>
  )
}

// A quiet line under a result: what came back and how long it took.
export function ResultFacts({ children }: { children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground tabular-nums">
      {children}
    </p>
  )
}
