"use client"

import { Cloud, Info, ShieldAlert } from "lucide-react"

import {
  Callout,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ListInput } from "@/app/(panel)/dns/components/fields"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import type { ProxyInspection, Proxy as ReverseProxy } from "@/lib/services"
import { type Draft, type Errors, type RealIpHeader, typeUses } from "./draft"
import { EditorCard as Card } from "./editor-card"
import { Choice } from "./rate-limit"

// The Advanced tab's tuning: compression, streaming, the visitor's real
// address behind a CDN, and the PROXY protocol for port forwards.

const headerItems: { value: RealIpHeader; label: string }[] = [
  { value: "X-Forwarded-For", label: "X-Forwarded-For (most balancers)" },
  { value: "X-Real-IP", label: "X-Real-IP" },
  { value: "CF-Connecting-IP", label: "CF-Connecting-IP (Cloudflare)" },
  { value: "True-Client-IP", label: "True-Client-IP (Akamai, Cloudflare)" },
]

// Cloudflare's published ranges (cloudflare.com/ips).
const cloudflare = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
]

type Props = {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
  inspection?: ProxyInspection
}

export function PerformanceCard({
  proxy: p,
  draft,
  set,
  phone,
  inspection,
}: Props) {
  const uses = typeUses(draft.type)
  if (!uses.gzip && !uses.noBuffering) return null
  // Unknown until the server is read: offer it, the backend checks.
  const noBrotli = inspection ? !inspection.brotli : false
  return (
    <Card title="Performance" phone={phone}>
      {uses.gzip && (
        <ToggleRow
          id="tune-gzip"
          label="Compress text answers"
          hint="Pages, styles, scripts, JSON and SVG go out gzipped: often 70% smaller, a little more CPU."
          checked={draft.gzip}
          onChange={(gzip) => set({ gzip })}
        />
      )}
      {uses.brotli && (
        <ToggleRow
          id="tune-brotli"
          label="Brotli compression"
          hint={
            noBrotli && !draft.brotli
              ? `${p.kind_label} on ${p.server_name} doesn't have the Brotli module (Debian/Ubuntu: libnginx-mod-http-brotli-filter).`
              : "About 15–20% smaller than gzip for browsers that take it; others still get gzip."
          }
          checked={draft.brotli}
          onChange={(brotli) => set({ brotli })}
          disabled={noBrotli && !draft.brotli}
        />
      )}
      {uses.brotli && draft.brotli && noBrotli && (
        <Callout icon={<ShieldAlert />} tone="warning">
          The Brotli module isn't loaded on {p.server_name}, so only gzip is
          used. It starts working once the module is installed.
        </Callout>
      )}
      {uses.noBuffering && (
        <ToggleRow
          id="tune-no-buffering"
          label="Pass answers straight through"
          hint="Nothing is held back: for live updates (server-sent events), streamed downloads and AI chat answers that arrive word by word. Large uploads go to the app as they come, too."
          checked={draft.noBuffering}
          onChange={(noBuffering) =>
            set(noBuffering ? { noBuffering, cache: false } : { noBuffering })
          }
        />
      )}
      {uses.noBuffering && draft.noBuffering && draft.cache && (
        <Callout icon={<Info />}>
          This turns off the proxy cache, which needs whole answers.
        </Callout>
      )}
    </Card>
  )
}

export function RealIpCard({ proxy: p, draft, set, errors, phone }: Props) {
  if (!typeUses(draft.type).realIp) return null
  const from = draft.realIpFrom.trim()
  return (
    <Card
      title="Behind a CDN or load balancer"
      hint={`When visitors come through Cloudflare or a load balancer, ${p.kind_label} only sees its address. List those addresses so logs, allow/deny lists, countries and rate limits use the visitor's real one.`}
      phone={phone}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 md:h-8"
          onClick={() =>
            set({
              realIpFrom: cloudflare.join("\n"),
              realIpHeader: "CF-Connecting-IP",
            })
          }
        >
          <Cloud />
          Use Cloudflare's
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <Field
          label="Trusted addresses"
          hint="Addresses or ranges, one per line. Empty = off."
          error={errors["real_ip.from"]}
        >
          {(f) => (
            <ListInput
              {...f}
              value={draft.realIpFrom}
              onChange={(realIpFrom) => set({ realIpFrom })}
              placeholder={"10.0.0.0/8\n2400:cb00::/32"}
            />
          )}
        </Field>
        <Field
          label="Visitor's address is in"
          hint="The header they put it in."
          error={errors["real_ip.header"]}
        >
          {(f) => (
            <Choice
              id={f.id}
              items={headerItems}
              value={draft.realIpHeader}
              onChange={(realIpHeader) => set({ realIpHeader })}
            />
          )}
        </Field>
      </div>
      {from && (
        <Callout icon={<Info />}>
          Only list addresses you trust: anyone sending from them can claim to
          be any visitor.
          {draft.realIpHeader === "CF-Connecting-IP" &&
            " Cloudflare changes its list now and then; press the button again to refresh it."}
        </Callout>
      )}
    </Card>
  )
}

export function ProxyProtocolCard({ proxy: p, draft, set, phone }: Props) {
  if (!typeUses(draft.type).proxyProtocol) return null
  return (
    <Card title="Visitor's address" phone={phone}>
      <ToggleRow
        id="tune-proxy-protocol"
        label="Send the PROXY protocol"
        hint={`${p.kind_label} tells the target who connected, before the data. Only turn on when the target expects it (HAProxy, Traefik, Postfix, nginx with proxy_protocol), or every connection fails.`}
        checked={draft.proxyProtocol}
        onChange={(proxyProtocol) => set({ proxyProtocol })}
      />
    </Card>
  )
}

export function TracingCard({ draft, set, phone }: Props) {
  if (!typeUses(draft.type).requestId) return null
  return (
    <Card title="Tracing" phone={phone}>
      <ToggleRow
        id="tune-request-id"
        label="Give each request an ID"
        hint={
          draft.type === "proxy"
            ? "A unique X-Request-ID goes to the app and back to the visitor, and into the access log: match a visitor's error to the app's log line."
            : "A unique X-Request-ID goes back to the visitor and into the access log."
        }
        checked={draft.requestId}
        onChange={(requestId) => set({ requestId })}
      />
    </Card>
  )
}
