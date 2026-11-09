"use client"

import { ChevronRight, RefreshCw } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { formatSize } from "@/lib/format"
import type {
  Certificate,
  ProxyDetail,
  ProxyHost,
  ProxyHostTraffic,
  ProxyInspection,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useInspection, useProxy, useProxyTraffic } from "../../api"
import { count, errorTone, MiniBars, rate, sum } from "../../components/live"
import {
  byHostName,
  domainsText,
  hostHref,
  hostTypeMeta,
  hostTypes,
  proxyStatusMeta,
} from "../../components/meta"
import { Tag, Th } from "../../components/parts"
import { ProxyLive } from "./live-traffic"
import { Domain } from "./sites-tab"
import { inspectable, Toolbar, useTab } from "./toolbar"

// The whole proxy at a glance: live numbers added up over every site, which
// sites carry the traffic or the errors right now, and the proxy's own state
// (certificates, sites that need a look, what it can do).

const sorts = ["busiest", "errors", "sent"] as const
type Sort = (typeof sorts)[number]
const sortLabels: Record<Sort, string> = {
  busiest: "Busiest",
  errors: "Errors",
  sent: "Sent",
}
const FIRST = 8

type SiteRow = {
  host: ProxyHost
  stream: boolean
  series: number[]
  errorSeries: number[]
  now: number
  total: number
  client: number
  server: number
  bytes: number
  share: number
}

function siteRows(
  hosts: ProxyHost[],
  traffic: ProxyHostTraffic[],
  minutes: number,
  sort: Sort,
): SiteRow[] {
  const byId = new Map(traffic.map((t) => [t.host_id, t]))
  const blank = Array.from({ length: Math.max(0, minutes - 1) }, () => 0)
  const rows = hosts
    .filter((h) => h.enabled)
    .map((host) => {
      const t = byId.get(host.id)
      const series = t ? t.requests.slice(0, -1) : blank
      return {
        host,
        stream: host.config.type === "stream",
        series,
        errorSeries: t ? t.server_errors.slice(0, -1) : blank,
        now: series.at(-1) ?? 0,
        total: sum(t?.requests),
        client: sum(t?.client_errors),
        server: sum(t?.server_errors),
        bytes: sum(t?.bytes),
        share: 0,
      }
    })
  // A site's share of its own kind: connections and requests don't add up.
  for (const stream of [false, true]) {
    const all = sum(rows.filter((r) => r.stream === stream).map((r) => r.total))
    for (const r of rows)
      if (r.stream === stream && all) r.share = r.total / all
  }
  const key = (r: SiteRow) =>
    sort === "errors"
      ? r.server * 1e6 + r.client
      : sort === "sent"
        ? r.bytes
        : r.total
  return rows.sort((a, b) => key(b) - key(a) || byHostName(a.host, b.host))
}

export function ReportTab({ detail }: { detail: ProxyDetail }) {
  const p = detail.proxy
  const phone = useIsPhone()
  const query = useProxy(p.id)
  const traffic = useProxyTraffic(p.id)
  const inspection = useInspection(p.id, inspectable(p))
  const [sort, setSort] = useState<Sort>("busiest")
  const minutes = traffic.data?.minutes ?? 30
  const rows = siteRows(detail.hosts, traffic.data?.hosts ?? [], minutes, sort)
  const fetching =
    query.isFetching || traffic.isFetching || inspection.isFetching
  const refresh = () => {
    query.refetch()
    traffic.refetch()
    if (inspectable(p)) inspection.refetch()
  }

  const sorter = (
    <Segmented
      label="Order by"
      value={sort}
      onChange={setSort}
      items={sorts.map((s) => ({ value: s, label: sortLabels[s] }))}
    />
  )
  const sites = (
    <SitesNow
      rows={rows}
      proxyId={p.id}
      minutes={minutes}
      pending={traffic.isPending}
      phone={!!phone}
      off={detail.hosts.filter((h) => !h.enabled).length}
    />
  )
  const glance = (
    <AtAGlance
      detail={detail}
      inspection={inspection.data}
      checking={inspectable(p) && inspection.isPending}
      phone={!!phone}
    />
  )

  return (
    <>
      <Toolbar proxy={p}>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size={phone ? "icon-lg" : "icon"}
          aria-label="Refresh"
          disabled={fetching}
          onClick={refresh}
          className={cn(phone && "rounded-full")}
        >
          <RefreshCw className={cn(fetching && "animate-spin")} />
        </Button>
      </Toolbar>

      <ProxyLive detail={detail} />

      {phone ? (
        <>
          <PhoneHeading action={detail.hosts.length > 1 && sorter}>
            Sites right now
          </PhoneHeading>
          {sites}
          <PhoneHeading>This proxy</PhoneHeading>
          {glance}
        </>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card
            title="Sites right now"
            caption={`Last ${minutes} minutes`}
            action={detail.hosts.length > 1 && sorter}
          >
            {sites}
          </Card>
          <Card title="This proxy">{glance}</Card>
        </div>
      )}
    </>
  )
}

function Card({
  title,
  caption,
  action,
  children,
}: {
  title: string
  caption?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <header className="flex min-h-13 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-5 py-2.5">
        <h2 className="text-body-sm font-medium">{title}</h2>
        {caption && <span className="text-caption text-ash">{caption}</span>}
        {action && <span className="ms-auto">{action}</span>}
      </header>
      {children}
    </section>
  )
}

function PhoneHeading({
  action,
  children,
}: {
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 px-4 pt-4 pb-2">
      <h2 className="font-label text-caption tracking-label text-ash uppercase">
        {children}
      </h2>
      {action && <span className="ms-auto">{action}</span>}
    </div>
  )
}

// ---- which sites carry the traffic ----

function SitesNow({
  rows,
  proxyId,
  minutes,
  pending,
  phone,
  off,
}: {
  rows: SiteRow[]
  proxyId: string
  minutes: number
  pending: boolean
  phone: boolean
  off: number
}) {
  const [all, setAll] = useState(false)
  if (rows.length === 0) {
    return (
      <p
        className={cn(
          "px-5 py-8 text-center text-body-sm text-muted-foreground",
          phone && "border-y border-border px-4",
        )}
      >
        {off
          ? "Every site is turned off."
          : "No sites yet. Add one in the Sites tab and its numbers show here."}
      </p>
    )
  }
  const shown = all ? rows : rows.slice(0, FIRST)
  const footer = (rows.length > FIRST || off > 0) && (
    <div
      className={cn(
        "flex items-center gap-3 text-caption text-ash",
        phone ? "px-4 py-3" : "border-t border-border px-5 py-2",
      )}
    >
      {off > 0 && (
        <span>
          {off} site{off === 1 ? " is" : "s are"} off
        </span>
      )}
      {rows.length > FIRST && (
        <Button
          variant="ghost"
          size="sm"
          className="ms-auto max-md:h-11"
          onClick={() => setAll(!all)}
        >
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </Button>
      )}
    </div>
  )

  if (phone) {
    return (
      <>
        <ul className="divide-y divide-border border-y border-border">
          {shown.map((r) => (
            <li key={r.host.id}>
              <Link
                href={hostHref(proxyId, r.host.id)}
                className="flex min-h-16 items-center gap-3 px-4 py-3 outline-none active:bg-muted"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-body">
                    <Domain host={r.host} />
                  </span>
                  <span className="truncate text-body-sm text-muted-foreground tabular-nums">
                    {pending ? (
                      "–"
                    ) : (
                      <>
                        {count(r.now)}/min · {count(r.total)}{" "}
                        {r.stream ? "connections" : "requests"}
                        {r.server > 0 && (
                          <span
                            className={toneClass(errorTone(r.server, r.total))}
                          >
                            {" "}
                            · {rate(r.server, r.total)}{" "}
                            {r.stream ? "failed" : "5xx"}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </span>
                {!pending && (
                  <MiniBars
                    requests={r.series.slice(-15)}
                    errors={r.errorSeries.slice(-15)}
                    className="h-8 w-20 shrink-0 gap-[2px]"
                  />
                )}
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </Link>
            </li>
          ))}
        </ul>
        {footer}
      </>
    )
  }

  return (
    <>
      <div className="@container overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr>
              <Th className="ps-5">Site</Th>
              <Th className="hidden @2xl:table-cell">Last {minutes} minutes</Th>
              <Th className="text-end">Per minute</Th>
              <Th className="text-end">Total</Th>
              <Th className="hidden @3xl:table-cell">Share</Th>
              <Th className="text-end">4xx</Th>
              <Th className="text-end">5xx</Th>
              <Th className="pe-5 text-end">Sent</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((r) => (
              <tr key={r.host.id} className="h-12 hover:bg-subtle">
                <td className="max-w-72 ps-5 pe-3">
                  <Link
                    href={hostHref(proxyId, r.host.id)}
                    className="block outline-none hover:text-brand focus-visible:text-brand"
                    title={`${hostTypeMeta[r.host.config.type].label} · open its report`}
                  >
                    <Domain host={r.host} />
                  </Link>
                </td>
                <td className="hidden px-3 @2xl:table-cell">
                  {pending ? (
                    <Skeleton className="h-6 w-36" />
                  ) : (
                    <MiniBars
                      requests={r.series}
                      errors={r.errorSeries}
                      className="h-6 w-36 gap-[2px]"
                    />
                  )}
                </td>
                <Num pending={pending}>{count(r.now)}</Num>
                <Num pending={pending}>
                  <span title={r.stream ? "Connections" : "Requests"}>
                    {count(r.total)}
                  </span>
                </Num>
                <td className="hidden px-3 @3xl:table-cell">
                  {!pending && <ShareBar value={r.share} />}
                </td>
                <Num pending={pending} muted={r.client === 0}>
                  {r.stream ? "–" : count(r.client)}
                </Num>
                <Num pending={pending}>
                  <span
                    className={cn(
                      r.server === 0
                        ? "text-ash"
                        : toneClass(errorTone(r.server, r.total)),
                    )}
                    title={`${count(r.server)} ${r.stream ? "failed" : "× 5xx"}`}
                  >
                    {rate(r.server, r.total)}
                  </span>
                </Num>
                <Num pending={pending} className="pe-5">
                  {formatSize(r.bytes)}
                </Num>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </>
  )
}

const toneClass = (tone: ReturnType<typeof errorTone>) =>
  tone === "destructive"
    ? "text-destructive"
    : tone === "warning"
      ? "text-warning"
      : undefined

function Num({
  pending,
  muted,
  className,
  children,
}: {
  pending: boolean
  muted?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <td
      className={cn(
        "px-3 text-end whitespace-nowrap tabular-nums",
        muted && "text-ash",
        className,
      )}
    >
      {pending ? <Skeleton className="ms-auto h-4 w-10" /> : children}
    </td>
  )
}

function ShareBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-brand"
          style={{ width: `${Math.max(value > 0 ? 3 : 0, pct)}%` }}
        />
      </span>
      <span className="w-9 text-caption text-ash tabular-nums">{pct}%</span>
    </span>
  )
}

// ---- the proxy itself ----

const DAY = 864e5

function daysLeft(c: Certificate) {
  return c.expires
    ? Math.floor((Date.parse(c.expires) - Date.now()) / DAY)
    : null
}

// certbot renews by itself, so only a near end means renewing fails; one
// uploaded or made in the panel is never renewed.
function certTone(c: Certificate) {
  const left = daysLeft(c)
  if (left === null) return "muted" as const
  if (left < 0) return "destructive" as const
  return left <= (c.source === "certbot" ? 7 : 14)
    ? ("warning" as const)
    : ("muted" as const)
}

type Glance = {
  key: string
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: "warning" | "destructive" | "success"
  go?: () => void
  goLabel?: string
}

function AtAGlance({
  detail,
  inspection: i,
  checking,
  phone,
}: {
  detail: ProxyDetail
  inspection?: ProxyInspection
  checking: boolean
  phone: boolean
}) {
  const p = detail.proxy
  const t = useTab(p)
  const hosts = detail.hosts
  const on = hosts.filter((h) => h.enabled)
  const web = on.filter((h) => h.config.type !== "stream")
  const https = web.filter((h) => h.config.tls?.enabled).length
  const types = hostTypes
    .map((x) => ({
      label: x.label,
      n: hosts.filter((h) => h.config.type === x.value).length,
    }))
    .filter((x) => x.n > 0)

  const items: Glance[] = [
    {
      key: "status",
      label: p.kind_label,
      value: proxyStatusMeta[p.status].label,
      sub: [
        p.version || i?.version,
        i && (i.enabled ? "starts at boot" : "doesn't start at boot"),
      ]
        .filter(Boolean)
        .join(" · "),
      tone:
        p.status === "online"
          ? "success"
          : p.status === "stopped"
            ? "warning"
            : p.status === "error" ||
                p.status === "unreachable" ||
                p.status === "config_error"
              ? "destructive"
              : undefined,
    },
    {
      key: "sites",
      label: "Sites",
      value: `${on.length} on${hosts.length > on.length ? ` · ${hosts.length - on.length} off` : ""}`,
      sub: types.map((x) => `${x.n} ${x.label.toLowerCase()}`).join(" · "),
      go: () => t.setTab("sites"),
      goLabel: "Open the sites",
    },
  ]
  if (web.length > 0) {
    items.push({
      key: "https",
      label: "HTTPS",
      value: `${https} of ${web.length} site${web.length === 1 ? "" : "s"}`,
      sub:
        https === web.length
          ? "Every web site answers over https"
          : `${web.length - https} answer over plain http only`,
    })
  }

  if (i) {
    const certs = [...i.certificates].sort(
      (a, b) => (daysLeft(a) ?? 1e9) - (daysLeft(b) ?? 1e9),
    )
    const next = certs.find((c) => daysLeft(c) !== null)
    const expired = certs.filter((c) => (daysLeft(c) ?? 0) < 0).length
    const tone = next ? certTone(next) : "muted"
    const left = next ? daysLeft(next) : null
    items.push({
      key: "certs",
      label: "Certificates",
      value:
        certs.length === 0
          ? "None"
          : expired > 0
            ? `${expired} expired`
            : `${certs.length} on the server`,
      sub:
        next && left !== null
          ? `${left < 0 ? "Ended" : "Next ends"} ${left < 0 ? `${-left} days ago` : left === 0 ? "today" : `in ${left} day${left === 1 ? "" : "s"}`}: ${domainsText(next.domains.length ? next.domains : [next.name])}${next.source === "certbot" ? " (certbot renews it)" : ""}`
          : undefined,
      tone: tone === "muted" ? undefined : tone,
    })

    const states = new Map(i.hosts.map((h) => [h.id, h]))
    const look = hosts.filter((h) => {
      const s = states.get(h.id)
      return (
        h.enabled &&
        !!s &&
        (s.state === "changed" ||
          s.state === "missing" ||
          s.conflicts.length > 0 ||
          !!s.unpublished)
      )
    })
    items.push({
      key: "attention",
      label: "Need a look",
      value: look.length
        ? `${look.length} site${look.length === 1 ? "" : "s"}`
        : "None",
      sub: look.length
        ? look
            .sort(byHostName)
            .slice(0, 3)
            .map((h) => domainsText(h.domains))
            .join(", ")
        : "Every site on the server is as Morcheh wrote it",
      tone: look.length ? "warning" : undefined,
      go: look.length ? () => t.setTab("sites") : undefined,
      goLabel: "Open the sites",
    })

    const written = i.sites.filter((s) => !s.managed).length
    items.push({
      key: "existing",
      label: "Hand-written sites",
      value: written ? String(written) : "None",
      sub: written
        ? "Server blocks in the server's own files, read only here"
        : undefined,
      go: written ? () => t.setTab("existing") : undefined,
      goLabel: "See what's on the server",
    })

    const features = [
      i.http3 && "HTTP/3",
      i.ipv6 && "IPv6",
      i.brotli && "Brotli",
      i.waf && "Firewall (WAF)",
      i.geo === "ready" && "Countries",
      i.image_filter && "Image resizing",
      i.streams === "ready" && "Streams",
      i.auth_request && "Forward auth",
    ].filter((x): x is string => !!x)
    items.push({
      key: "features",
      label: "Can do",
      value: features.length ? (
        <span className="flex flex-wrap gap-1.5 pt-0.5">
          {features.map((f) => (
            <Tag key={f}>{f}</Tag>
          ))}
        </span>
      ) : (
        "Only the basics"
      ),
    })
  }

  const loading = checking && !i
  if (phone) {
    return (
      <ul className="divide-y divide-border border-y border-border">
        {items.map((x) => (
          <li key={x.key}>
            <GlanceRow item={x} phone />
          </li>
        ))}
        {loading && (
          <li className="flex flex-col gap-2 px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
          </li>
        )}
      </ul>
    )
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((x) => (
        <li key={x.key}>
          <GlanceRow item={x} />
        </li>
      ))}
      {loading &&
        [1, 2, 3].map((n) => (
          <li key={n} className="flex flex-col gap-2 px-5 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-40" />
          </li>
        ))}
    </ul>
  )
}

function GlanceRow({ item: x, phone }: { item: Glance; phone?: boolean }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-caption text-ash">{x.label}</span>
        <span
          className={cn(
            "font-medium",
            phone ? "text-body" : "text-body-sm",
            x.tone === "warning" && "text-warning",
            x.tone === "destructive" && "text-destructive",
          )}
        >
          {x.tone === "success" && (
            <span className="me-1.5 inline-block size-2 rounded-full bg-success align-middle" />
          )}
          {x.value}
        </span>
        {x.sub && (
          <span className="text-caption break-words text-muted-foreground">
            {x.sub}
          </span>
        )}
      </span>
      {x.go && <ChevronRight className="size-4 shrink-0 text-ash" />}
    </>
  )
  const pad = phone ? "px-4 py-3 min-h-14" : "px-5 py-3"
  if (!x.go)
    return <div className={cn("flex items-center gap-3", pad)}>{body}</div>
  return (
    <button
      type="button"
      onClick={x.go}
      aria-label={`${x.label}: ${x.goLabel}`}
      className={cn(
        "flex w-full items-center gap-3 text-start outline-none hover:bg-subtle focus-visible:bg-subtle active:bg-muted",
        pad,
      )}
    >
      {body}
    </button>
  )
}
