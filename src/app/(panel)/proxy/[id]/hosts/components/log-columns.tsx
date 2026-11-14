"use client"

import { Columns3 } from "lucide-react"
import { type ReactNode, useState } from "react"

import { formatMs } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { RequestRow } from "../../../api"

// The optional columns of the site log's table: which ones show is kept on
// this browser. Time, Status and Request always show.

export type LogColumnId =
  | "ip"
  | "domain"
  | "client"
  | "referer"
  | "took"
  | "sent"
  | "received"
  | "cache"
  | "upstream"
  | "upstream_status"
  | "upstream_ms"
  | "user"
  | "protocol"
  | "request_id"

export type LogColumn = {
  id: LogColumnId
  label: string
  // Shorter header than the menu's label.
  head?: string
  // rem
  width: number
  end?: boolean
  mono?: boolean
  // Also on streams (they log only address, time, status and size).
  stream?: boolean
  group: "Visitor" | "Answer" | "Upstream" | "Request"
  value: (r: RequestRow, stream: boolean) => ReactNode
  title?: (r: RequestRow) => string | undefined
}

const dash = <span className="text-ash">—</span>
const or = (v?: string | number) =>
  v === undefined || v === "" ? dash : String(v)

export const logColumns: LogColumn[] = [
  {
    id: "ip",
    label: "IP address",
    head: "IP",
    width: 9.5,
    mono: true,
    stream: true,
    group: "Visitor",
    value: (r) => r.ip,
  },
  {
    id: "client",
    label: "Browser or client",
    head: "Client",
    width: 11,
    group: "Visitor",
    value: (r) => or(clientLabel(r.agent)),
    title: (r) => r.agent,
  },
  {
    id: "referer",
    label: "Came from",
    width: 12,
    mono: true,
    group: "Visitor",
    value: (r) => or(r.referer?.replace(/^https?:\/\//, "")),
    title: (r) => r.referer,
  },
  {
    id: "user",
    label: "Signed in as",
    head: "User",
    width: 8,
    group: "Visitor",
    value: (r) => or(r.user),
  },
  {
    id: "domain",
    label: "Domain",
    width: 11,
    group: "Request",
    value: (r) => or(r.domain),
  },
  {
    id: "protocol",
    label: "HTTP version",
    head: "HTTP",
    width: 6,
    group: "Request",
    value: (r) => or(r.protocol?.replace(/^HTTP\//, "")),
  },
  {
    id: "received",
    label: "Received",
    width: 6,
    end: true,
    group: "Request",
    value: (r) =>
      r.request_length === undefined ? dash : formatSize(r.request_length),
  },
  {
    id: "request_id",
    label: "Request ID",
    width: 10,
    mono: true,
    group: "Request",
    value: (r) => or(r.request_id),
    title: (r) => r.request_id,
  },
  {
    id: "took",
    label: "Took",
    width: 6,
    end: true,
    stream: true,
    group: "Answer",
    value: (r) => took(r.duration_ms),
  },
  {
    id: "sent",
    label: "Sent",
    width: 6,
    end: true,
    stream: true,
    group: "Answer",
    value: (r) => formatSize(r.bytes),
  },
  {
    id: "cache",
    label: "Cache",
    width: 6.5,
    group: "Answer",
    value: (r) => or(r.cache),
  },
  {
    id: "upstream",
    label: "Upstream address",
    head: "Upstream",
    width: 10,
    mono: true,
    group: "Upstream",
    value: (r) => or(r.upstream_addr),
    title: (r) => r.upstream_addr,
  },
  {
    id: "upstream_status",
    label: "Upstream status",
    head: "Up. status",
    width: 6.5,
    mono: true,
    group: "Upstream",
    value: (r) => or(r.upstream_status),
  },
  {
    id: "upstream_ms",
    label: "Upstream took",
    head: "Up. took",
    width: 6.5,
    end: true,
    group: "Upstream",
    value: (r) => took(r.upstream_ms),
  },
]

const groups = ["Visitor", "Request", "Answer", "Upstream"] as const

const defaults: LogColumnId[] = ["ip", "took", "sent"]
// When the site answers on more than one domain.
const multiDomainDefaults: LogColumnId[] = ["ip", "domain", "took", "sent"]

const KEY = "morcheh.proxy.logs.columns"

function readSaved(): LogColumnId[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const ids = JSON.parse(raw)
    if (!Array.isArray(ids)) return null
    return logColumns.filter((c) => ids.includes(c.id)).map((c) => c.id)
  } catch {
    return null
  }
}

// The columns shown, in table order. Client-only (the tab renders after the
// log is read), so localStorage is read in the first render.
export function useLogColumns(stream: boolean, multiDomain: boolean) {
  const [saved, setSaved] = useState<LogColumnId[] | null>(readSaved)
  const ids = saved ?? (multiDomain ? multiDomainDefaults : defaults)
  const save = (next: LogColumnId[] | null) => {
    setSaved(next)
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next))
      else localStorage.removeItem(KEY)
    } catch {}
  }
  return {
    shown: logColumns.filter(
      (c) => ids.includes(c.id) && (!stream || c.stream),
    ),
    ids,
    custom: saved !== null,
    toggle: (id: LogColumnId, on: boolean) =>
      save(on ? [...ids, id] : ids.filter((x) => x !== id)),
    reset: () => save(null),
  }
}

export function ColumnsMenu({
  columns: c,
  stream,
}: {
  columns: ReturnType<typeof useLogColumns>
  stream: boolean
}) {
  const list = logColumns.filter((x) => !stream || x.stream)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Columns"
            title="Columns"
          />
        }
      >
        <Columns3 />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {groups.map((g, i) => {
          const items = list.filter((x) => x.group === g)
          if (!items.length) return null
          return (
            <DropdownMenuGroup key={g}>
              {i > 0 && !stream && <DropdownMenuSeparator />}
              {!stream && <DropdownMenuLabel>{g}</DropdownMenuLabel>}
              {items.map((x) => (
                <DropdownMenuCheckboxItem
                  key={x.id}
                  checked={c.ids.includes(x.id)}
                  onCheckedChange={(on) => c.toggle(x.id, on)}
                  closeOnClick={false}
                >
                  {x.id === "took" && stream ? "Open for" : x.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          )
        })}
        {c.custom && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={c.reset}>
              Back to default
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function took(ms?: number) {
  if (ms === undefined) return dash
  return (
    <span
      className={cn(
        ms >= 1000 && "text-warning",
        ms >= 5000 && "text-destructive",
      )}
    >
      {formatMs(ms)}
    </span>
  )
}

// "Chrome 131 · Windows", "Googlebot", "curl 8.5": enough to tell visitors
// apart at a glance; the whole agent shows on hover and in the details.
export function clientLabel(agent?: string): string | undefined {
  if (!agent) return undefined
  const bot = agent.match(/([\w-]*(?:bot|crawler|spider|slurp))\b/i)
  if (bot) return bot[1]
  const tool = agent.match(
    /^(curl|Wget|python-requests|python-httpx|aiohttp|Go-http-client|PostmanRuntime|okhttp|axios|node-fetch|undici|Java|libwww-perl|HTTPie|Apache-HttpClient)\/([\d.]+)/i,
  )
  if (tool) return `${tool[1]} ${tool[2].split(".").slice(0, 2).join(".")}`
  const browsers: [RegExp, string][] = [
    [/Edg(?:e|A|iOS)?\/(\d+)/, "Edge"],
    [/(?:OPR|Opera)\/(\d+)/, "Opera"],
    [/SamsungBrowser\/(\d+)/, "Samsung Internet"],
    [/(?:Firefox|FxiOS)\/(\d+)/, "Firefox"],
    [/(?:Chrome|CriOS)\/(\d+)/, "Chrome"],
    [/Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/, "Safari"],
  ]
  const os = osLabel(agent)
  for (const [re, name] of browsers) {
    const m = agent.match(re)
    if (m) return [`${name} ${m[1]}`, os].filter(Boolean).join(" · ")
  }
  const first = agent.split(/[\s(]/)[0]
  return first ? first.replace("/", " ") : agent
}

function osLabel(agent: string) {
  if (/iPhone|iPad|iPod/.test(agent)) return "iOS"
  if (/Android/.test(agent)) return "Android"
  if (/Windows/.test(agent)) return "Windows"
  if (/Mac OS X|Macintosh/.test(agent)) return "macOS"
  if (/CrOS/.test(agent)) return "ChromeOS"
  if (/Linux/.test(agent)) return "Linux"
  return undefined
}
