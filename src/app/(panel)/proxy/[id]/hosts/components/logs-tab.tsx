"use client"

import {
  CalendarClock,
  ChevronDown,
  ListFilter,
  Pause,
  Play,
  RefreshCw,
  ScrollText,
  SearchX,
  ShieldAlert,
  ShieldBan,
  TriangleAlert,
  X,
} from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"

import { Callout } from "@/app/(panel)/cronjobs/components/editor-parts"
import {
  afterClose,
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Field } from "@/components/field"
import { formatCount, formatMs } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type {
  ProxyHost,
  ProxyRequestFirewallCounts,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { type RequestRow, useHostRequests } from "../../../api"
import { chipClass, Th } from "../../../components/parts"
import {
  ColumnsMenu,
  clientLabel,
  type LogColumn,
  useLogColumns,
} from "./log-columns"
import { NoLog, OldFormatNotice, shortDate } from "./log-notices"
import { RequestDetailsLayer } from "./request-details"
import {
  extraFilters,
  type FirewallVerdict,
  firewallLabels,
  type RequestFilters,
  type RequestRange,
  requestRangeLabels,
  requestRanges,
  type StatusClass,
  toRequestQuery,
  useRequestFilters,
} from "./request-filters"

// This site's access log, newest first: search, filters (all in the URL)
// and new lines added live while the range reaches up to now.

const PAGE = 300
const MOST = 2000

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]

const statusLabels: Record<StatusClass, string> = {
  all: "All",
  "2xx": "2xx",
  "3xx": "3xx",
  "4xx": "4xx",
  "5xx": "5xx",
  errors: "Errors",
}

export function LogsTab({
  proxy: p,
  host,
  phone,
  rewrite,
  rewriting,
}: {
  proxy: ReverseProxy
  host: ProxyHost
  phone: boolean
  rewrite?: () => void
  rewriting?: boolean
}) {
  const [f, setFilters] = useRequestFilters()
  const stream = host.config.type === "stream"
  const [paused, setPaused] = useState(false)
  const live = !paused && !f.until

  // "Show more" starts over whenever the filters change.
  const sig = JSON.stringify(f)
  const [more, setMore] = useState({ sig, limit: PAGE })
  const limit = more.sig === sig ? more.limit : PAGE

  const query = useHostRequests(p.id, host.id, toRequestQuery(f, limit), live)
  const data = query.data
  const [picked, setPicked] = useState<RequestRow | null>(null)
  const [open, setOpen] = useOpen("proxy-request")

  const show = (row: RequestRow) => {
    setPicked(row)
    setOpen(true)
  }

  const counts = data?.classes
  const countOf = (s: StatusClass) => {
    if (!counts) return undefined
    switch (s) {
      case "2xx":
        return counts.ok
      case "3xx":
        return counts.redirects
      case "4xx":
        return counts.client_errors
      case "5xx":
        return counts.server_errors
      case "errors":
        return counts.client_errors + counts.server_errors
      default:
        return (
          counts.ok +
          counts.redirects +
          counts.client_errors +
          counts.server_errors
        )
    }
  }
  const classes = statusClassesFor(stream)
  // The firewall's filter, while the site has it on or the log shows it did.
  const fwCounts = data?.firewall
  const firewall =
    !stream &&
    (!!host.config.waf?.mode ||
      !!f.firewall ||
      !!(fwCounts && fwCounts.blocked + fwCounts.flagged))
  const setFirewall = (v: FirewallVerdict | null) => setFilters({ firewall: v })
  const multiDomain = host.domains.length > 1
  const columns = useLogColumns(stream, multiDomain)

  const toolbar = phone ? (
    <PhoneBar
      f={f}
      setFilters={setFilters}
      host={host}
      stream={stream}
      live={live}
      paused={paused}
      setPaused={setPaused}
      refreshing={query.isFetching}
      refresh={() => query.refetch()}
      classes={classes}
      countOf={countOf}
      firewall={
        firewall
          ? { value: f.firewall, counts: fwCounts, set: setFirewall }
          : undefined
      }
    />
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <DebouncedSearch
        value={f.q}
        onChange={(q) => setFilters({ q: q || null })}
        stream={stream}
        className="min-w-44 flex-1 md:w-auto md:max-w-72"
      />
      <Segmented
        label="Status"
        value={f.code ? ("" as StatusClass) : f.status}
        onChange={(status) =>
          setFilters({ status: status === "all" ? null : status, code: null })
        }
        items={classes.map((s) => ({
          value: s,
          label: (
            <span className="flex items-center gap-1.5">
              {statusLabels[s]}
              {countOf(s) !== undefined && (
                <span className="text-caption text-ash tabular-nums">
                  {formatCount(countOf(s) ?? 0)}
                </span>
              )}
            </span>
          ),
        }))}
      />
      {firewall && (
        <FirewallMenu
          value={f.firewall}
          counts={fwCounts}
          onChange={setFirewall}
        />
      )}
      <TimePopover f={f} setFilters={setFilters} />
      <FiltersPopover
        f={f}
        setFilters={setFilters}
        host={host}
        stream={stream}
      />
      <span className="flex-1" />
      <LiveButton
        live={live}
        paused={paused}
        frozen={!!f.until}
        onToggle={() => setPaused(!paused)}
      />
      <ColumnsMenu columns={columns} stream={stream} />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Read the log again"
        title="Read the log again"
        disabled={query.isFetching}
        onClick={() => query.refetch()}
      >
        <RefreshCw className={cn(query.isFetching && "animate-spin")} />
      </Button>
    </div>
  )

  const pills = extraFilters(f)
  const pillRow = pills.length > 0 && (
    <div
      className={cn(
        "flex items-center gap-2",
        phone ? "no-scrollbar overflow-x-auto px-4 pb-3" : "flex-wrap",
      )}
    >
      {pills.map((x) => (
        <button
          key={x.key}
          type="button"
          onClick={() => setFilters({ [x.key]: null })}
          aria-label={`Remove filter: ${x.label}`}
          className="flex h-8 max-w-72 shrink-0 items-center gap-1 rounded-full bg-brand-soft ps-3 pe-2 text-body-sm text-brand-strong outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-9"
        >
          <span className="truncate">{x.label}</span>
          <X className="size-3.5 shrink-0" />
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          setFilters({
            code: null,
            method: null,
            path: null,
            ip: null,
            domain: null,
            slow: null,
            firewall: null,
          })
        }
        className="h-8 shrink-0 px-2 text-body-sm text-muted-foreground hover:text-foreground max-md:h-9"
      >
        Clear all
      </button>
    </div>
  )

  let body: ReactNode
  if (!data) {
    body = query.error ? (
      <Empty
        icon={TriangleAlert}
        title="Couldn't read the log"
        body={query.error.message}
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        }
      />
    ) : (
      <RowsLoading phone={phone} />
    )
  } else if (data.missing) {
    body = <NoLog stream={stream} />
  } else if (!data.items.length) {
    const filtered = !!(f.q || f.status !== "all" || f.firewall || pills.length)
    body = (
      <Empty
        icon={filtered ? SearchX : ScrollText}
        title={filtered ? "Nothing matches" : "Nothing in this period"}
        body={
          filtered
            ? `No ${stream ? "connection" : "request"} ${rangePhrase(f)} matches these filters.`
            : live
              ? `Waiting for the next ${stream ? "connection" : "visit"}: new lines show up here as they're written.`
              : "Pick a longer period to look further back."
        }
      />
    )
  } else {
    body = phone ? (
      <PhoneRows rows={data.items} stream={stream} onPick={show} />
    ) : (
      <RowsTable
        rows={data.items}
        stream={stream}
        multiDomain={multiDomain}
        columns={columns.shown}
        onPick={show}
      />
    )
  }

  const canMore =
    !!data &&
    data.items.length >= limit &&
    data.matched > data.items.length &&
    limit < MOST

  return (
    <div className={cn("flex min-w-0 flex-col", !phone && "gap-3")}>
      {toolbar}
      {pillRow}
      {data && !stream && !data.detailed && data.items.length > 0 && (
        <div className={cn(phone && "px-4 pb-3")}>
          <OldFormatNotice rewrite={rewrite} rewriting={rewriting} />
        </div>
      )}
      {data?.partial && (
        <div className={cn(phone && "px-4 pb-3")}>
          <Callout icon={<TriangleAlert />} tone="warning">
            This period holds more of the log than can be read at once, so only
            lines from {data.oldest ? shortDate(data.oldest) : "the end"} on
            were searched. Pick a shorter period to see older ones.
          </Callout>
        </div>
      )}
      <div
        className={cn(
          "transition-opacity",
          query.isPlaceholderData && "opacity-60",
        )}
      >
        {body}
      </div>
      {data && data.items.length > 0 && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-2 text-caption text-ash",
            phone && "p-4",
          )}
        >
          <span className="tabular-nums">
            Showing {formatCount(data.items.length)} of{" "}
            {formatCount(data.matched)} matching · {formatCount(data.scanned)}{" "}
            lines read
          </span>
          {data.skipped && (
            <span>
              Some lines went by too fast to show here: read the log again to
              see them all.
            </span>
          )}
          {canMore && (
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11 md:ms-auto"
              disabled={query.isFetching}
              onClick={() =>
                setMore({ sig, limit: Math.min(MOST, limit + PAGE) })
              }
            >
              Show more
            </Button>
          )}
        </div>
      )}
      <RequestDetailsLayer
        row={picked}
        stream={stream}
        open={open}
        onOpenChange={setOpen}
        phone={phone}
        onFilter={(next) => afterClose(setOpen, () => setFilters(next))}
      />
    </div>
  )
}

const statusClassesFor = (stream: boolean): StatusClass[] =>
  stream
    ? ["all", "2xx", "4xx", "5xx"]
    : ["all", "2xx", "3xx", "4xx", "5xx", "errors"]

type SetFilters = ReturnType<typeof useRequestFilters>[1]

// ── Toolbar parts ───────────────────────────────────────────────────────

function DebouncedSearch({
  value,
  onChange,
  stream,
  className,
}: {
  value: string
  onChange: (value: string) => void
  stream: boolean
  className?: string
}) {
  const [text, setText] = useState(value)
  const [seen, setSeen] = useState(value)
  // A link or Clear all changed it from outside.
  if (value !== seen) {
    setSeen(value)
    setText(value)
  }
  useEffect(() => {
    if (text === value) return
    const t = window.setTimeout(() => onChange(text.trim()), 400)
    return () => window.clearTimeout(t)
  }, [text, value, onChange])
  return (
    <SearchBox
      value={text}
      onChange={setText}
      placeholder={
        stream ? "Search the log" : "Search paths, addresses, agents"
      }
      label="Search the log"
      className={className}
    />
  )
}

function LiveButton({
  live,
  paused,
  frozen,
  onToggle,
  icon,
}: {
  live: boolean
  paused: boolean
  frozen: boolean
  onToggle: () => void
  icon?: boolean
}) {
  const label = frozen
    ? "The range ends in the past"
    : paused
      ? "Paused: start following new lines"
      : "Live: stop following new lines"
  const dot = (
    <span className="relative flex size-2">
      {live && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
      )}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          live ? "bg-brand" : "bg-ash",
        )}
      />
    </span>
  )
  if (icon) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={live}
        disabled={frozen}
        onClick={onToggle}
        className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none active:bg-muted disabled:opacity-50"
      >
        {live ? dot : <Play className="size-5" />}
      </button>
    )
  }
  return (
    <Button
      variant="outline"
      className="h-9 gap-2"
      aria-pressed={live}
      title={label}
      disabled={frozen}
      onClick={onToggle}
    >
      {live ? dot : paused ? <Play /> : <Pause />}
      {frozen ? "Not live" : live ? "Live" : "Paused"}
    </Button>
  )
}

// "in the last hour", "between Nov 8, 14:05 and now".
function rangePhrase(f: RequestFilters) {
  if (f.since) {
    return `between ${shortDate(f.since.toISOString())} and ${f.until ? shortDate(f.until.toISOString()) : "now"}`
  }
  return `in the ${requestRangeLabels[f.range].toLowerCase()}`
}

function rangeText(f: RequestFilters) {
  if (f.since) {
    return `${shortDate(f.since.toISOString())} – ${f.until ? shortDate(f.until.toISOString()) : "now"}`
  }
  return requestRangeLabels[f.range]
}

// <input type="datetime-local"> speaks local time without a zone.
function toLocalInput(d: Date | null) {
  if (!d) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(v: string) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

// Ranges to pick from, then a range of one's own.
function TimeChoices({
  f,
  apply,
}: {
  f: RequestFilters
  apply: (next: Partial<Record<keyof RequestFilters, unknown>>) => void
}) {
  const [since, setSince] = useState(toLocalInput(f.since))
  const [until, setUntil] = useState(toLocalInput(f.until))
  const from = fromLocalInput(since)
  const to = fromLocalInput(until)
  const bad = !!from && !!to && to <= from
  return (
    <div className="flex flex-col gap-1">
      {requestRanges.map((r: RequestRange) => (
        <button
          key={r}
          type="button"
          aria-pressed={!f.since && f.range === r}
          onClick={() =>
            apply({ range: r === "1h" ? null : r, since: null, until: null })
          }
          className="flex h-11 items-center rounded-lg px-3 text-start text-body-sm outline-none hover:bg-muted focus-visible:bg-muted aria-pressed:font-medium aria-pressed:text-brand md:h-9"
        >
          {requestRangeLabels[r]}
        </button>
      ))}
      <div className="mt-2 flex flex-col gap-3 border-t border-border px-1 pt-3">
        <p className="text-body-sm font-medium">Between</p>
        <Field label="From">
          {(props) => (
            <Input
              {...props}
              type="datetime-local"
              value={since}
              max={toLocalInput(new Date())}
              onChange={(e) => setSince(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="To"
          hint={bad ? undefined : "Leave it empty to keep following."}
          error={bad ? "Must be after From." : undefined}
        >
          {(props) => (
            <Input
              {...props}
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          )}
        </Field>
        <Button
          disabled={!from || bad}
          className="max-md:h-11"
          onClick={() => apply({ since: from, until: to })}
        >
          Show this range
        </Button>
      </div>
    </div>
  )
}

function TimePopover({
  f,
  setFilters,
}: {
  f: RequestFilters
  setFilters: SetFilters
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-1.5 px-3",
              f.since &&
                "border-brand/40 bg-brand-soft text-brand-strong hover:bg-brand-soft",
            )}
          />
        }
      >
        <CalendarClock className="size-4" />
        {rangeText(f)}
        <ChevronDown className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5">
        {open && (
          <TimeChoices
            f={f}
            apply={(next) => {
              setFilters(next as Parameters<SetFilters>[0])
              setOpen(false)
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

type Draft = {
  method: string
  path: string
  ip: string
  domain: string
  code: string
  slow: string
}

const draftOf = (f: RequestFilters): Draft => ({
  method: f.method,
  path: f.path,
  ip: f.ip,
  domain: f.domain,
  code: f.code,
  slow: f.slow ? String(f.slow) : "",
})

const fromDraft = (d: Draft) => {
  const slow = Number.parseInt(d.slow, 10)
  return {
    method: d.method || null,
    path: d.path.trim() || null,
    ip: d.ip.trim() || null,
    domain: d.domain || null,
    code: d.code.replace(/\s+/g, "") || null,
    slow: slow > 0 ? slow : null,
  }
}

const codeOk = (v: string) =>
  !v.trim() ||
  /^([1-5]\d\d|[1-5]xx)(,([1-5]\d\d|[1-5]xx))*$/i.test(v.replace(/\s+/g, ""))

function FilterFields({
  d,
  set,
  host,
  stream,
}: {
  d: Draft
  set: (d: Draft) => void
  host: ProxyHost
  stream: boolean
}) {
  const any = "any"
  return (
    <div className="flex flex-col gap-4">
      {!stream && (
        <Field label="Path has">
          {(props) => (
            <Input
              {...props}
              value={d.path}
              placeholder="/api/"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
              onChange={(e) => set({ ...d, path: e.target.value })}
            />
          )}
        </Field>
      )}
      <Field label="From address" hint="An IP, or its start: 10.0.">
        {(props) => (
          <Input
            {...props}
            value={d.ip}
            placeholder="203.0.113.7"
            inputMode="decimal"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
            onChange={(e) => set({ ...d, ip: e.target.value })}
          />
        )}
      </Field>
      {!stream && (
        <Field label="Method">
          {(props) => (
            <Select
              items={[
                { value: any, label: "Any" },
                ...methods.map((m) => ({ value: m, label: m })),
              ]}
              value={d.method || any}
              onValueChange={(v) =>
                set({ ...d, method: !v || v === any ? "" : String(v) })
              }
            >
              <SelectTrigger id={props.id} className="h-11 w-full md:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value={any}>Any</SelectItem>
                {methods.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}
      {!stream && host.domains.length > 1 && (
        <Field label="Domain">
          {(props) => (
            <Select
              items={[
                { value: any, label: "Any of them" },
                ...host.domains.map((x) => ({ value: x, label: x })),
              ]}
              value={d.domain || any}
              onValueChange={(v) =>
                set({ ...d, domain: !v || v === any ? "" : String(v) })
              }
            >
              <SelectTrigger id={props.id} className="h-11 w-full md:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value={any}>Any of them</SelectItem>
                {host.domains.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}
      <Field
        label="Status codes"
        hint={codeOk(d.code) ? "Like 404, or 502,504, or 5xx" : undefined}
        error={
          codeOk(d.code) ? undefined : "Codes like 404 or 5xx, split by commas."
        }
      >
        {(props) => (
          <Input
            {...props}
            value={d.code}
            placeholder="404"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
            onChange={(e) => set({ ...d, code: e.target.value })}
          />
        )}
      </Field>
      <Field
        label="Slower than"
        hint={
          stream
            ? "Connections open longer than this, in milliseconds"
            : "Milliseconds to answer"
        }
      >
        {(props) => (
          <Input
            {...props}
            value={d.slow}
            placeholder="500"
            inputMode="numeric"
            onChange={(e) =>
              set({ ...d, slow: e.target.value.replace(/\D/g, "") })
            }
          />
        )}
      </Field>
    </div>
  )
}

function FiltersPopover({
  f,
  setFilters,
  host,
  stream,
}: {
  f: RequestFilters
  setFilters: SetFilters
  host: ProxyHost
  stream: boolean
}) {
  const [open, setOpen] = useState(false)
  const [d, setD] = useState(() => draftOf(f))
  const n = extraFilters(f).length
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setD(draftOf(f))
        setOpen(next)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-1.5 px-3",
              n > 0 &&
                "border-brand/40 bg-brand-soft text-brand-strong hover:bg-brand-soft",
            )}
          />
        }
      >
        <ListFilter className="size-4" />
        Filters
        {n > 0 && <FilterCount n={n} />}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-4">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!codeOk(d.code)) return
            setFilters(fromDraft(d))
            setOpen(false)
          }}
        >
          <FilterFields d={d} set={setD} host={host} stream={stream} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setD(draftOf({ ...f, ...emptyExtras }))}
            >
              Reset
            </Button>
            <Button type="submit" disabled={!codeOk(d.code)}>
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

const emptyExtras = {
  method: "",
  path: "",
  ip: "",
  domain: "",
  code: "",
  slow: 0,
}

const firewallChoices: { value: FirewallVerdict | ""; label: string }[] = [
  { value: "", label: "Every request" },
  { value: "blocked", label: "Blocked" },
  { value: "flagged", label: "Logged only" },
  { value: "any", label: "Blocked or logged" },
]

// What the web application firewall made of the requests: blocked ones
// (403 from the firewall) or ones it only wrote down.
function FirewallMenu({
  value,
  counts,
  onChange,
}: {
  value: FirewallVerdict | null
  counts?: ProxyRequestFirewallCounts
  onChange: (v: FirewallVerdict | null) => void
}) {
  const countOf = (v: FirewallVerdict | "") =>
    !counts || v === ""
      ? undefined
      : v === "any"
        ? counts.blocked + counts.flagged
        : counts[v]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-1.5 px-3",
              value &&
                "border-brand/40 bg-brand-soft text-brand-strong hover:bg-brand-soft",
            )}
          />
        }
      >
        {value === "flagged" ? (
          <ShieldAlert className="size-4" />
        ) : (
          <ShieldBan className="size-4" />
        )}
        {value
          ? firewallChoices.find((c) => c.value === value)?.label
          : "Firewall"}
        {!value && !!counts?.blocked && (
          <span className="text-caption text-ash tabular-nums">
            {formatCount(counts.blocked)}
          </span>
        )}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Web application firewall</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value ?? ""}
            onValueChange={(v) =>
              onChange((v || null) as FirewallVerdict | null)
            }
          >
            {firewallChoices.map((c) => (
              <DropdownMenuRadioItem key={c.value} value={c.value}>
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                {countOf(c.value) !== undefined && (
                  <span className="text-caption text-ash tabular-nums">
                    {formatCount(countOf(c.value) ?? 0)}
                  </span>
                )}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// A shield beside the status when the firewall blocked or logged the request.
export function FirewallMark({
  firewall,
  className,
}: {
  firewall?: RequestRow["firewall"]
  className?: string
}) {
  if (!firewall) return null
  const Icon = firewall.blocked ? ShieldBan : ShieldAlert
  const label = `${firewallLabels[firewall.blocked ? "blocked" : "flagged"]}${
    firewall.rules.length
      ? `: ${firewall.rules
          .slice(0, 3)
          .map((r) => r.id)
          .join(", ")}`
      : ""
  }`
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0",
        firewall.blocked ? "text-destructive" : "text-warning",
        className,
      )}
    >
      <Icon className="size-3.5" />
    </span>
  )
}

function FilterCount({ n }: { n: number }) {
  return (
    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white tabular-nums">
      {n}
    </span>
  )
}

// Phones: search and icon buttons, then the status chips.
function PhoneBar({
  f,
  setFilters,
  host,
  stream,
  live,
  paused,
  setPaused,
  refreshing,
  refresh,
  classes,
  countOf,
  firewall,
}: {
  f: RequestFilters
  setFilters: SetFilters
  host: ProxyHost
  stream: boolean
  live: boolean
  paused: boolean
  setPaused: (v: boolean) => void
  refreshing: boolean
  refresh: () => void
  classes: StatusClass[]
  countOf: (s: StatusClass) => number | undefined
  firewall?: {
    value: FirewallVerdict | null
    counts?: ProxyRequestFirewallCounts
    set: (v: FirewallVerdict | null) => void
  }
}) {
  const [timeOpen, setTimeOpen] = useOpen("proxy-logs-time")
  const [filtersOpen, setFiltersOpen] = useOpen("proxy-logs-filters")
  const [d, setD] = useState(() => draftOf(f))
  const n = extraFilters(f).length
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 px-4 pt-3 pb-2">
        <DebouncedSearch
          value={f.q}
          onChange={(q) => setFilters({ q: q || null })}
          stream={stream}
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          aria-label="Filters"
          onClick={() => {
            setD(draftOf(f))
            setFiltersOpen(true)
          }}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full outline-none active:bg-muted"
        >
          <ListFilter className="size-5" />
          {n > 0 && (
            <span className="absolute end-1 top-1">
              <FilterCount n={n} />
            </span>
          )}
        </button>
        <LiveButton
          icon
          live={live}
          paused={paused}
          frozen={!!f.until}
          onToggle={() => setPaused(!paused)}
        />
        <button
          type="button"
          aria-label="Read the log again"
          disabled={refreshing}
          onClick={refresh}
          className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none active:bg-muted"
        >
          <RefreshCw className={cn("size-5", refreshing && "animate-spin")} />
        </button>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
        <button
          type="button"
          onClick={() => setTimeOpen(true)}
          className={cn(chipClass, "text-foreground")}
          aria-current={f.since ? "page" : undefined}
        >
          <CalendarClock className="size-4" />
          {rangeText(f)}
        </button>
        {classes.map((s) => (
          <button
            key={s}
            type="button"
            aria-current={!f.code && f.status === s ? "page" : undefined}
            onClick={() =>
              setFilters({ status: s === "all" ? null : s, code: null })
            }
            className={chipClass}
          >
            {statusLabels[s]}
            {countOf(s) !== undefined && (
              <span className="tabular-nums opacity-70">
                {formatCount(countOf(s) ?? 0)}
              </span>
            )}
          </button>
        ))}
        {firewall &&
          (["blocked", "flagged"] as const).map((v) => {
            const Icon = v === "blocked" ? ShieldBan : ShieldAlert
            const on = firewall.value === v
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                aria-current={on ? "page" : undefined}
                onClick={() => firewall.set(on ? null : v)}
                className={chipClass}
              >
                <Icon className="size-4" />
                {v === "blocked" ? "Blocked" : "Logged by firewall"}
                {firewall.counts && (
                  <span className="tabular-nums opacity-70">
                    {formatCount(firewall.counts[v])}
                  </span>
                )}
              </button>
            )
          })}
      </div>

      <BottomSheet open={timeOpen} onOpenChange={setTimeOpen} title="Time">
        <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {timeOpen && (
            <TimeChoices
              f={f}
              apply={(next) =>
                afterClose(setTimeOpen, () =>
                  setFilters(next as Parameters<SetFilters>[0]),
                )
              }
            />
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters"
        full
        footer={
          <div className="flex gap-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              className="h-11 flex-1"
              onClick={() => setD(draftOf({ ...f, ...emptyExtras }))}
            >
              Reset
            </Button>
            <Button
              className="h-11 flex-1"
              disabled={!codeOk(d.code)}
              onClick={() =>
                afterClose(setFiltersOpen, () => setFilters(fromDraft(d)))
              }
            >
              Apply
            </Button>
          </div>
        }
      >
        <div className="overflow-y-auto px-4 pb-4">
          <FilterFields d={d} set={setD} host={host} stream={stream} />
        </div>
      </BottomSheet>
    </div>
  )
}

// ── Rows ────────────────────────────────────────────────────────────────

export function statusTone(status: number) {
  if (status >= 500) return "text-destructive"
  if (status >= 400) return "text-warning"
  if (status >= 300) return "text-muted-foreground"
  return "text-foreground"
}

function timeText(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString("en", { month: "short", day: "numeric" })} ${time}`
}

const fresh = (r: RequestRow) => r.at && "animate-[help-flash_2s_ease-out]"

function RowsTable({
  rows,
  stream,
  multiDomain,
  columns,
  onPick,
}: {
  rows: RequestRow[]
  stream: boolean
  multiDomain: boolean
  columns: LogColumn[]
  onPick: (r: RequestRow) => void
}) {
  // The domain sits beside the path unless it has its own column.
  const inlineDomain = multiDomain && !columns.some((c) => c.id === "domain")
  const minWidth = 9 + 5 + 16 + columns.reduce((n, c) => n + c.width, 0)
  return (
    <div className="overflow-x-auto rounded-2xl border border-border [contain:inline-size]">
      <table
        className="w-full table-fixed text-body-sm"
        style={{ minWidth: `${minWidth}rem` }}
      >
        <colgroup>
          <col className="w-36" />
          <col className="w-20" />
          <col />
          {columns.map((c) => (
            <col key={c.id} style={{ width: `${c.width}rem` }} />
          ))}
        </colgroup>
        <thead className="border-b border-border bg-subtle">
          <tr>
            <Th>Time</Th>
            <Th>Status</Th>
            <Th>{stream ? "Protocol" : "Request"}</Th>
            {columns.map((c) => (
              <Th key={c.id} className={cn("truncate", c.end && "text-end")}>
                {c.id === "took" && stream ? "Open for" : (c.head ?? c.label)}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className={cn(
                "relative border-b border-border last:border-0 hover:bg-subtle",
                fresh(r),
              )}
            >
              <td
                className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums"
                title={new Date(r.time).toString()}
              >
                {timeText(r.time)}
              </td>
              <td
                className={cn(
                  "px-3 py-2 font-mono font-medium tabular-nums",
                  statusTone(r.status),
                )}
              >
                <span className="flex items-center gap-1.5">
                  {r.status}
                  <FirewallMark firewall={r.firewall} />
                </span>
              </td>
              <td className="min-w-0 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="flex w-full min-w-0 items-baseline gap-2 text-start outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                >
                  {stream ? (
                    <span>{r.protocol || "—"}</span>
                  ) : (
                    <>
                      <span className="shrink-0 text-caption font-medium text-muted-foreground">
                        {r.method || "—"}
                      </span>
                      <span className="truncate font-mono text-caption">
                        {r.path || "—"}
                      </span>
                      {inlineDomain && r.domain && (
                        <span className="ms-auto shrink-0 text-caption text-ash">
                          {r.domain}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </td>
              {columns.map((c) => (
                <td
                  key={c.id}
                  title={c.title?.(r)}
                  className={cn(
                    "truncate px-3 py-2 tabular-nums",
                    c.end && "text-end",
                    c.mono && "font-mono text-caption",
                    c.id === "sent" && "text-muted-foreground",
                  )}
                >
                  {c.value(r, stream)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PhoneRows({
  rows,
  stream,
  onPick,
}: {
  rows: RequestRow[]
  stream: boolean
  onPick: (r: RequestRow) => void
}) {
  return (
    <ul className="border-t border-border">
      {rows.map((r) => (
        <li key={r.key} className={cn("border-b border-border", fresh(r))}>
          <button
            type="button"
            onClick={() => onPick(r)}
            className="flex min-h-14 w-full flex-col gap-0.5 px-4 py-2.5 text-start outline-none active:bg-muted"
          >
            <span className="flex w-full min-w-0 items-baseline gap-2">
              <span
                className={cn(
                  "shrink-0 font-mono text-body-sm font-medium",
                  statusTone(r.status),
                )}
              >
                {r.status}
              </span>
              <FirewallMark firewall={r.firewall} className="self-center" />
              {stream ? (
                <span className="text-body-sm">{r.protocol}</span>
              ) : (
                <>
                  <span className="shrink-0 text-caption font-medium text-muted-foreground">
                    {r.method}
                  </span>
                  <span className="truncate font-mono text-caption">
                    {r.path}
                  </span>
                </>
              )}
            </span>
            <span className="flex items-center gap-1.5 truncate text-caption text-ash tabular-nums">
              {timeText(r.time)} · {r.ip}
              {r.duration_ms !== undefined && ` · ${formatMs(r.duration_ms)}`}
              {` · ${formatSize(r.bytes)}`}
              {!stream && r.agent && ` · ${clientLabel(r.agent)}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function RowsLoading({ phone }: { phone: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col",
        phone ? "border-t border-border" : "gap-2",
      )}
      role="status"
      aria-busy
      aria-label="Reading the log"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
          key={i}
          className={cn(
            "animate-pulse bg-muted",
            phone ? "mx-4 my-3 h-9 rounded-lg" : "h-9 rounded-lg",
          )}
        />
      ))}
    </div>
  )
}
