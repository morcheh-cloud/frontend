"use client"

import { Copy, Pause, Play, RefreshCw, ScrollText } from "lucide-react"
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs"
import { useEffect, useRef, useState } from "react"

import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
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
import { domainsText } from "../../components/meta"
import { copyText } from "../../components/proxy-actions"
import { inspectable, Toolbar } from "./toolbar"

// The proxy's own log is "proxy" in the URL; a site is its id.
const OWN = "proxy"
const lineChoices = [100, 200, 500, 1000, 2000]

const logFilters = {
  site: parseAsString.withDefault(OWN),
  log: parseAsString.withDefault("access"),
  lines: parseAsInteger.withDefault(200),
}

// The last lines of a site's log, or the proxy's own, read over SSH.
export function LogsTab({ detail }: { detail: ProxyDetail }) {
  const p = detail.proxy
  const phone = useIsPhone()
  const [f, setF] = useQueryStates(logFilters, { history: "replace" })
  const [live, setLive] = useState(false)
  const site = detail.hosts.some((h) => h.id === f.site) ? f.site : OWN
  const log = f.log === "error" ? "error" : "access"
  const lines = lineChoices.includes(f.lines) ? f.lines : 200
  const logs = useProxyLogs(p.id, {
    host: site === OWN ? "" : site,
    log,
    lines,
    live,
  })
  const pre = useRef<HTMLPreElement>(null)
  const text = logs.data?.text ?? ""

  // Follow the end while live, or right after a new log is opened.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new text
  useEffect(() => {
    const el = pre.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text])

  const siteItems = [
    { value: OWN, label: `${p.kind_label}'s own log` },
    ...[...detail.hosts]
      .sort((a, b) => (a.domains[0] ?? "").localeCompare(b.domains[0] ?? ""))
      .map((h) => ({ value: h.id, label: domainsText(h.domains) })),
  ]
  const lineItems = lineChoices.map((n) => ({
    value: String(n),
    label: `Last ${n} lines`,
  }))

  const sitePicker = (
    <Select
      items={siteItems}
      value={site}
      onValueChange={(v) => v !== null && setF({ site: v === OWN ? null : v })}
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
      onChange={(v) => setF({ log: v === "access" ? null : v })}
      items={[
        { value: "access", label: "Requests" },
        { value: "error", label: "Errors" },
      ]}
    />
  )
  const linePicker = (
    <Select
      items={lineItems}
      value={String(lines)}
      onValueChange={(v) =>
        v !== null && setF({ lines: Number(v) === 200 ? null : Number(v) })
      }
    >
      <SelectTrigger aria-label="Lines" className="h-11 md:h-8 md:w-40">
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
  const buttons = (
    <>
      <Button
        variant={live ? "secondary" : "ghost"}
        size={phone ? "icon-lg" : "icon"}
        aria-label={live ? "Stop following" : "Follow new lines"}
        aria-pressed={live}
        title={live ? "Stop following" : "Follow new lines (every 5 s)"}
        onClick={() => setLive(!live)}
        className={cn(phone && "rounded-full")}
      >
        {live ? <Pause /> : <Play />}
      </Button>
      <Button
        variant="ghost"
        size={phone ? "icon-lg" : "icon"}
        aria-label="Refresh"
        disabled={logs.isFetching}
        onClick={() => logs.refetch()}
        className={cn(phone && "rounded-full")}
      >
        <RefreshCw className={cn(logs.isFetching && "animate-spin")} />
      </Button>
    </>
  )

  return (
    <>
      <Toolbar proxy={p}>
        {sitePicker}
        {phone ? (
          buttons
        ) : (
          <>
            {kind}
            {linePicker}
            <span className="flex-1" />
            {live && (
              <span className="text-caption text-ash">
                Following · every 5 s
              </span>
            )}
            {buttons}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Copy the log"
              disabled={!text}
              onClick={() => copyText(text, "Log")}
            >
              <Copy />
            </Button>
          </>
        )}
      </Toolbar>
      {phone && (
        <div className="flex items-center gap-2 px-4 pb-3">
          {kind}
          <div className="min-w-0 flex-1">{linePicker}</div>
        </div>
      )}

      {!inspectable(p) ? (
        <Empty
          icon={ScrollText}
          title="Logs show once the server answers"
          body="Morcheh reads them over SSH."
        />
      ) : logs.isPending ? (
        <Skeleton
          className={cn("h-96", phone ? "rounded-none" : "rounded-2xl")}
        />
      ) : logs.isError && !logs.data ? (
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
      ) : logs.data?.missing || !text.trim() ? (
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
      ) : (
        <pre
          ref={pre}
          className={cn(
            "max-h-[70svh] overflow-auto bg-subtle p-4 font-mono text-caption leading-relaxed whitespace-pre",
            phone
              ? "border-y border-border"
              : "rounded-2xl border border-border",
          )}
        >
          {text}
        </pre>
      )}
    </>
  )
}
