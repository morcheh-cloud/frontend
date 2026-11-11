"use client"

import { Copy, RefreshCw, ScrollText } from "lucide-react"
import { useQueryStates } from "nuqs"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"

import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { formatCount } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { ProxyDetail } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useProxyLogs } from "../../api"
import { byHostName, hostName } from "../../components/meta"
import { chipClass } from "../../components/parts"
import { copyText } from "../../components/proxy-actions"
import {
  DebouncedSearch,
  LiveButton,
  LogsTab as RequestsTable,
} from "../hosts/components/logs-tab"
import {
  requestParsers,
  type StatusClass,
} from "../hosts/components/request-filters"
import {
  type ErrorLevel,
  errorLevels,
  type LogView,
  lineChoices,
  OWN_LOG,
  proxyLogParsers,
} from "./log-filters"
import { inspectable, Toolbar } from "./toolbar"

// The proxy's logs: a site's requests as the same searchable table its editor
// has, or any log (the proxy's own, a site's, requests or errors) as the raw
// lines read over SSH, filtered here.

const keys = {
  ...proxyLogParsers,
  q: requestParsers.q,
  status: requestParsers.status,
}

const rawStatuses: StatusClass[] = ["all", "2xx", "3xx", "4xx", "5xx", "errors"]
const statusLabels: Record<StatusClass, string> = {
  all: "All",
  "2xx": "2xx",
  "3xx": "3xx",
  "4xx": "4xx",
  "5xx": "5xx",
  errors: "Errors",
}
const levelLabels: Record<ErrorLevel, string> = {
  all: "All",
  error: "Errors",
  warn: "Warnings",
  notice: "Notices",
}

// Both of Morche's formats (and nginx's combined one) put the status right
// after the quoted request: ] "GET / HTTP/1.1" 200 …
const statusRe = /\] "(?:[^"\\]|\\.)*" (\d{3}) /
// 2026/11/09 10:00:00 [error] 1234#1234: …
const levelRe = /\[(emerg|alert|crit|error|warn|notice|info|debug)\]/

type Line = { text: string; status?: number; level?: ErrorLevel | "other" }

function parse(text: string, log: "access" | "error"): Line[] {
  const lines = text.split("\n")
  if (lines.at(-1) === "") lines.pop()
  return lines.map((t) => {
    if (log === "access") {
      const m = statusRe.exec(t)
      return { text: t, status: m ? Number(m[1]) : undefined }
    }
    const m = levelRe.exec(t)
    const l = m?.[1]
    return {
      text: t,
      level: !l
        ? undefined
        : l === "warn" || l === "notice"
          ? l
          : l === "info" || l === "debug"
            ? "other"
            : "error",
    }
  })
}

const inClass = (s: number | undefined, c: StatusClass) => {
  if (c === "all") return true
  if (s === undefined) return false
  if (c === "errors") return s >= 400
  return Math.floor(s / 100) === Number(c[0])
}

const lineTone = (l: Line) =>
  (l.status ?? 0) >= 500 || l.level === "error"
    ? "text-destructive"
    : (l.status ?? 0) >= 400 || l.level === "warn"
      ? "text-warning"
      : undefined

export function LogsTab({ detail }: { detail: ProxyDetail }) {
  const p = detail.proxy
  const phone = useIsPhone()
  const [f, setF] = useQueryStates(keys, { history: "replace", scroll: false })
  const host = detail.hosts.find((h) => h.id === f.site)
  const site = host ? host.id : OWN_LOG
  const log = f.log === "error" ? "error" : "access"
  // The table reads Morche's own request lines, so only a site's requests.
  const tableable = !!host && log === "access"
  const view: LogView = tableable ? f.view : "raw"

  const siteItems = [
    { value: OWN_LOG, label: `${p.kind_label}'s own log` },
    ...[...detail.hosts]
      .sort(byHostName)
      .map((h) => ({ value: h.id, label: hostName(h) })),
  ]
  const sitePicker = (
    <Select
      items={siteItems}
      value={site}
      onValueChange={(v) =>
        v !== null && setF({ site: v === OWN_LOG ? null : v })
      }
    >
      <SelectTrigger
        aria-label="Log of"
        className={cn("h-11 md:h-8 md:w-56", phone && "min-w-0 flex-1")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {siteItems.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            <span className="truncate">{s.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const kind = (
    <Segmented
      label="Log"
      value={log}
      onChange={(v) =>
        setF({ log: v === "access" ? null : v, status: null, level: null })
      }
      items={[
        { value: "access", label: "Requests" },
        { value: "error", label: "Errors" },
      ]}
    />
  )
  const viewPicker = tableable && (
    <Segmented
      label="Show as"
      value={view}
      onChange={(v) => setF({ view: v === "table" ? null : v })}
      items={[
        { value: "table", label: "Table" },
        { value: "raw", label: "Raw" },
      ]}
    />
  )

  if (!inspectable(p)) {
    return (
      <>
        <Toolbar proxy={p} />
        <Empty
          icon={ScrollText}
          title="Logs show once the server answers"
          body="Morche reads them over SSH."
        />
      </>
    )
  }

  const pickers = phone ? (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-3">
      {kind}
      {viewPicker}
    </div>
  ) : null

  if (view === "table" && host) {
    return (
      <>
        <Toolbar proxy={p}>
          {sitePicker}
          {!phone && kind}
          {!phone && viewPicker}
        </Toolbar>
        {pickers}
        <RequestsTable key={host.id} proxy={p} host={host} phone={!!phone} />
      </>
    )
  }

  return (
    <RawLog
      key={`${site}:${log}`}
      proxyId={p.id}
      site={site}
      log={log}
      phone={!!phone}
      head={
        <>
          <Toolbar proxy={p}>
            {sitePicker}
            {!phone && kind}
            {!phone && viewPicker}
          </Toolbar>
          {pickers}
        </>
      }
    />
  )
}

// The last lines of a log as they are, filtered and searched here.
function RawLog({
  proxyId,
  site,
  log,
  phone,
  head,
}: {
  proxyId: string
  site: string
  log: "access" | "error"
  phone: boolean
  head: ReactNode
}) {
  const [f, setF] = useQueryStates(keys, { history: "replace", scroll: false })
  const [paused, setPaused] = useState(false)
  const lines = lineChoices.includes(f.lines) ? f.lines : 500
  const logs = useProxyLogs(proxyId, {
    host: site === OWN_LOG ? "" : site,
    log,
    lines,
    live: !paused,
  })
  const text = logs.data?.text ?? ""
  const all = useMemo(() => parse(text, log), [text, log])
  const needle = f.q.trim().toLowerCase()
  const keep = (l: Line) =>
    log === "access"
      ? inClass(l.status, f.status)
      : f.level === "all" || l.level === f.level
  const shown = all.filter(
    (l) => keep(l) && (!needle || l.text.toLowerCase().includes(needle)),
  )
  const filtered = !!needle || f.status !== "all" || f.level !== "all"

  // Follow the end while the reader is there; scrolling up stops it.
  const box = useRef<HTMLDivElement>(null)
  const atEnd = useRef(true)
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new lines
  useEffect(() => {
    const el = box.current
    if (el && atEnd.current) el.scrollTop = el.scrollHeight
  }, [shown.length, text])

  const lineItems = lineChoices.map((n) => ({
    value: String(n),
    label: `Last ${formatCount(n)} lines`,
  }))
  const linePicker = (
    <Select
      items={lineItems}
      value={String(lines)}
      onValueChange={(v) =>
        v !== null && setF({ lines: Number(v) === 500 ? null : Number(v) })
      }
    >
      <SelectTrigger
        aria-label="Lines"
        className="h-9 shrink-0 max-md:h-9 md:h-8 md:w-40"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {lineItems.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const choices =
    log === "access"
      ? rawStatuses.map((c) => ({
          value: c as string,
          label: statusLabels[c],
          n: all.filter((l) => inClass(l.status, c)).length,
          on: f.status === c,
          pick: () => setF({ status: c === "all" ? null : c }),
        }))
      : errorLevels.map((c) => ({
          value: c as string,
          label: levelLabels[c],
          n: c === "all" ? all.length : all.filter((l) => l.level === c).length,
          on: f.level === c,
          pick: () => setF({ level: c === "all" ? null : c }),
        }))
  const ready = !!logs.data && !logs.data.missing && all.length > 0
  const search = (
    <DebouncedSearch
      value={f.q}
      onChange={(q) => setF({ q: q || null })}
      stream={false}
      placeholder="Search the lines"
      className={cn(phone ? "min-w-0 flex-1" : "min-w-44 md:max-w-72")}
    />
  )
  const refresh = (
    <Button
      variant="ghost"
      size={phone ? "icon-lg" : "icon"}
      aria-label="Read the log again"
      title="Read the log again"
      disabled={logs.isFetching}
      onClick={() => logs.refetch()}
      className={cn(phone && "rounded-full")}
    >
      <RefreshCw className={cn(logs.isFetching && "animate-spin")} />
    </Button>
  )
  const copy = (
    <Button
      variant="ghost"
      size={phone ? "icon-lg" : "icon"}
      aria-label={filtered ? "Copy the lines shown" : "Copy the log"}
      title={filtered ? "Copy the lines shown" : "Copy the log"}
      disabled={shown.length === 0}
      onClick={() =>
        copyText(
          shown.map((l) => l.text).join("\n"),
          filtered ? "Lines" : "Log",
        )
      }
      className={cn(phone && "rounded-full")}
    >
      <Copy />
    </Button>
  )
  const caption = ready && (
    <span className="text-caption text-ash tabular-nums">
      {filtered
        ? `${formatCount(shown.length)} of ${formatCount(all.length)} lines`
        : `${formatCount(all.length)} line${all.length === 1 ? "" : "s"}`}
    </span>
  )

  const bar = phone ? (
    <>
      <div className="flex items-center gap-1 px-4 pb-2">
        {search}
        <LiveButton
          icon
          live={!paused}
          paused={paused}
          frozen={false}
          onToggle={() => setPaused(!paused)}
        />
        {refresh}
        {copy}
      </div>
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-3">
        {choices.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-current={c.on ? "page" : undefined}
            onClick={c.pick}
            className={chipClass}
          >
            {c.label}
            {ready && (
              <span className="text-caption tabular-nums opacity-70">
                {formatCount(c.n)}
              </span>
            )}
          </button>
        ))}
        {linePicker}
      </div>
    </>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      {search}
      <Segmented
        label={log === "access" ? "Status" : "Level"}
        value={choices.find((c) => c.on)?.value ?? "all"}
        onChange={(v) => choices.find((c) => c.value === v)?.pick()}
        items={choices.map((c) => ({
          value: c.value,
          label: (
            <span className="flex items-center gap-1.5">
              {c.label}
              {ready && (
                <span className="text-caption text-ash tabular-nums">
                  {formatCount(c.n)}
                </span>
              )}
            </span>
          ),
        }))}
      />
      {linePicker}
      <span className="flex-1" />
      {caption}
      <LiveButton
        live={!paused}
        paused={paused}
        frozen={false}
        onToggle={() => setPaused(!paused)}
      />
      {refresh}
      {copy}
    </div>
  )

  let body: ReactNode
  if (logs.isPending) {
    body = (
      <Skeleton
        className={cn("h-96", phone ? "mx-4 rounded-2xl" : "rounded-2xl")}
      />
    )
  } else if (logs.isError && !logs.data) {
    body = (
      <Empty
        icon={ScrollText}
        title="Couldn't read the log"
        body={logs.error.message}
        action={
          <Button variant="outline" onClick={() => logs.refetch()}>
            Try again
          </Button>
        }
      />
    )
  } else if (!ready) {
    body = (
      <Empty
        icon={ScrollText}
        title={logs.data?.missing ? "No log yet" : "Nothing logged yet"}
        body={
          logs.data?.missing
            ? "The file isn't on the server yet: it's created on the first request after the site is set up."
            : log === "error"
              ? "No errors so far."
              : "No requests so far."
        }
      />
    )
  } else if (shown.length === 0) {
    body = (
      <Empty
        icon={ScrollText}
        title="No line matches"
        body={`None of the last ${formatCount(all.length)} lines match. Read more lines or loosen the filters.`}
        action={
          <Button
            variant="outline"
            onClick={() => setF({ q: null, status: null, level: null })}
          >
            Clear filters
          </Button>
        }
      />
    )
  } else {
    body = (
      <div
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget
          atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32
        }}
        className={cn(
          "overflow-auto bg-subtle",
          phone
            ? "max-h-[75svh] border-y border-border"
            : "max-h-[70svh] rounded-2xl border border-border",
        )}
      >
        <pre className="w-max min-w-full p-4 font-mono text-caption leading-relaxed whitespace-pre">
          {shown.map((l, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: lines have no id
              key={i}
              className={cn("block", lineTone(l))}
            >
              <Marked text={l.text} needle={needle} />
            </span>
          ))}
        </pre>
      </div>
    )
  }

  return (
    <>
      {head}
      {bar}
      {phone && caption && <div className="px-4 pb-2">{caption}</div>}
      {body}
    </>
  )
}

// The text with every match of the search marked.
function Marked({ text, needle }: { text: string; needle: string }) {
  if (!needle) return text
  const lower = text.toLowerCase()
  const parts: ReactNode[] = []
  let at = 0
  for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, at)) {
    if (i > at) parts.push(text.slice(at, i))
    parts.push(
      <mark key={i} className="rounded-sm bg-brand-soft text-brand-strong">
        {text.slice(i, i + needle.length)}
      </mark>,
    )
    at = i + needle.length
  }
  parts.push(text.slice(at))
  return parts
}
