"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { proxyItem } from "@/components/panel/nav"
import type { Proxy as ReverseProxy } from "@/lib/services"
import { useServerProxies } from "../api"
import { ProxyStatusDot, proxyHref, proxyStatusMeta } from "./meta"

// The reverse proxy is its own section, not a server tab: a server's
// Overview only says one runs there and links to it.

export function useServerProxyList(server: string) {
  return useServerProxies(server).data ?? []
}

function summary(p: ReverseProxy) {
  const sites = `${p.host_count} site${p.host_count === 1 ? "" : "s"}`
  return `${proxyStatusMeta[p.status].label} · ${sites}`
}

// Desktop: a line under the System card's facts.
export function ServerProxyLinks({ proxies }: { proxies: ReverseProxy[] }) {
  if (proxies.length === 0) return null
  const Icon = proxyItem.icon
  return (
    <ul className="mt-4 flex flex-col gap-1">
      {proxies.map((p) => (
        <li key={p.id}>
          <Link
            href={proxyHref(p.id)}
            className="flex items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-body-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon className="size-3.5 shrink-0 text-ash" />
            <span className="font-medium">{p.kind_label} reverse proxy</span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-muted-foreground">
              <ProxyStatusDot status={p.status} />
              {summary(p)}
            </span>
            <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

// Phone: grouped list rows.
export function ServerProxyRows({ proxies }: { proxies: ReverseProxy[] }) {
  const Icon = proxyItem.icon
  return proxies.map((p) => (
    <li key={p.id}>
      <Link
        href={proxyHref(p.id)}
        className="flex min-h-12 items-center gap-3 px-4 py-2 outline-none active:bg-muted"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body">{p.kind_label}</span>
          <span className="flex items-center gap-1.5 truncate text-body-sm text-muted-foreground">
            <ProxyStatusDot status={p.status} />
            {summary(p)}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
      </Link>
    </li>
  ))
}
