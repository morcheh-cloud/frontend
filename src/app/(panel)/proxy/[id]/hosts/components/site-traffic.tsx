"use client"

import { ScrollText } from "lucide-react"
import Link from "next/link"

import type {
  ProxyHost,
  ProxyHostTraffic,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { useProxyTraffic } from "../../../api"
import { MiniBars, SiteNumbers } from "../../../components/live"
import { hostHref } from "../../../components/meta"
import { EditorCard as Card } from "./editor-card"

// The site's own live numbers, beside its settings, and a way to its log.
export function SiteTraffic({
  proxy: p,
  host,
  phone,
}: {
  proxy: ReverseProxy
  host: ProxyHost
  phone: boolean
}) {
  const live = p.capabilities.traffic && host.enabled
  const traffic = useProxyTraffic(p.id, live)
  if (!p.capabilities.traffic) return null
  const data = live ? traffic.data : undefined
  const minutes = data?.minutes ?? 30
  const unread = data?.sources.some((s) => s.proxy_id === p.id && !s.ok)
  const stream = host.config.type === "stream"
  // A site with no visits yet isn't in the answer: all zeros.
  const t: ProxyHostTraffic | undefined = data
    ? (data.hosts.find((x) => x.host_id === host.id) ?? quiet(host, minutes))
    : undefined
  return (
    <Card
      title="Traffic"
      hint={`The last ${minutes} minutes, from ${p.kind_label}'s log.`}
      phone={phone}
      action={
        <Link
          href={hostHref(p.id, host.id, "logs")}
          className="inline-flex min-h-11 items-center gap-1.5 text-caption font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-0"
        >
          <ScrollText className="size-3.5" />
          Logs
        </Link>
      }
    >
      {t && !unread ? (
        <div className="flex flex-col gap-3">
          <SiteNumbers t={t} stream={stream} minutes={minutes} />
          <MiniBars
            requests={t.requests.slice(0, -1)}
            errors={t.server_errors.slice(0, -1)}
          />
        </div>
      ) : (
        <p className="flex h-[6.25rem] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-caption text-ash">
          {!host.enabled
            ? "Turned off: this site isn't served"
            : unread
              ? "Couldn't read this proxy's log"
              : traffic.error
                ? traffic.error.message
                : "Reading the live numbers…"}
        </p>
      )}
    </Card>
  )
}

function quiet(h: ProxyHost, minutes: number): ProxyHostTraffic {
  const zeros = Array.from({ length: minutes + 1 }, () => 0)
  return {
    host_id: h.id,
    proxy_id: h.proxy_id,
    requests: zeros,
    server_errors: zeros,
    client_errors: zeros,
    bytes: zeros,
  }
}
