"use client"

import { Cloud, Copy, Gauge, Info, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import {
  Callout,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ListInput } from "@/app/(panel)/dns/components/fields"
import { Field } from "@/components/field"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { JobBar } from "@/components/jobs/meta"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ProxyInspection, Proxy as ReverseProxy } from "@/lib/services"
import { useBrotliJob, useSetupBrotli } from "../../../api"
import { useProxyCan } from "../../../components/permissions"
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
              ? `${p.kind_label} on ${p.server_name} doesn't have the Brotli module yet.`
              : "About 15–20% smaller than gzip for browsers that take it; others still get gzip."
          }
          checked={draft.brotli}
          onChange={(brotli) => set({ brotli })}
          disabled={noBrotli && !draft.brotli}
        />
      )}
      {uses.brotli && noBrotli && (
        <BrotliModule proxy={p} warn={draft.brotli} />
      )}
      {uses.noBuffering && (
        <ToggleRow
          id="tune-no-buffering"
          label="Pass answers straight through"
          hint="Nothing is held back: for live updates (server-sent events), streamed downloads and AI chat answers that arrive word by word. Large uploads go to the app as they come, too."
          checked={draft.noBuffering}
          onChange={(noBuffering) =>
            set(
              noBuffering
                ? { noBuffering, cache: false, onlineMode: "" }
                : { noBuffering },
            )
          }
        />
      )}
      {uses.noBuffering &&
        draft.noBuffering &&
        (draft.cache || draft.onlineMode) && (
          <Callout icon={<Info />}>
            This turns off the proxy cache and Always online, which need whole
            answers.
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

const shares = [100, 50, 25, 10, 5, 1]

// A copy of every request (or a share of them) goes to a test server too;
// its answers are thrown away. For trying a new version on real traffic.
export function MirrorCard({ proxy: p, draft, set, errors, phone }: Props) {
  if (!p.capabilities.mirror || !typeUses(draft.type).mirror) return null
  const on = draft.mirrorTo.trim() !== ""
  const items = [...new Set([...shares, draft.mirrorPercent])]
    .sort((a, b) => b - a)
    .map((n) => ({
      value: String(n),
      label: n === 100 ? "Every request" : `${n}% of requests`,
    }))
  return (
    <Card
      title="Copy traffic to a test server"
      hint="Every request also goes to a second server, like a new version of the app. Its answers are thrown away: visitors only ever see the real app's."
      phone={phone}
    >
      <Field
        label="Test server"
        hint="Only the address: the requested path is added to it. Empty = off."
        error={errors["mirror.to"]}
      >
        {(f) => (
          <Input
            {...f}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            value={draft.mirrorTo}
            onChange={(e) => set({ mirrorTo: e.target.value })}
            placeholder="http://10.0.0.9:8080"
            className="font-mono"
          />
        )}
      </Field>
      {on && (
        <>
          <Field
            label="How many"
            hint="Copies are picked at random."
            error={errors["mirror.percent"]}
          >
            {(f) => (
              <Choice
                id={f.id}
                items={items}
                value={String(draft.mirrorPercent)}
                onChange={(v) => set({ mirrorPercent: Number(v) })}
              />
            )}
          </Field>
          <ToggleRow
            id="tune-mirror-bodies"
            label="Copy request bodies"
            hint={`Form posts and uploads reach the test server too. ${p.kind_label} then reads a whole body before passing the request on.`}
            checked={draft.mirrorBodies}
            onChange={(mirrorBodies) => set({ mirrorBodies })}
          />
          <Callout icon={<ShieldAlert />} tone="warning">
            Writes are copied too: a sign-up, a payment or a delete runs on the
            test server as well. Point it at test data, never at the real
            database or mail service.
          </Callout>
          <Callout icon={<Copy />}>
            Copies carry <span className="font-mono">X-Morcheh-Mirror: 1</span>.
            A slow test server holds up the next request on the same connection
            (up to 10 s): keep it close and quick.
          </Callout>
        </>
      )}
    </Card>
  )
}

// The Brotli module is missing: install it from the system's packages (job
// proxy-brotli), or show that job running.
function BrotliModule({
  proxy: p,
  warn,
}: {
  proxy: ReverseProxy
  warn: boolean
}) {
  const job = useBrotliJob(p.id)
  const setup = useSetupBrotli()
  const jobs = useJobActions()
  const can = useProxyCan()

  if (job) {
    return (
      <Callout icon={<Gauge />}>
        <p className="font-medium text-foreground">Installing Brotli…</p>
        <p className="truncate">
          {job.progress.current || job.progress.phase || job.title}
        </p>
        <JobBar job={job} className="mt-2" />
      </Callout>
    )
  }
  const install = () =>
    setup.mutate(p.id, {
      onSuccess: (j) => jobs.track(j),
      onError: (e) => toast.error(e.message),
    })
  return (
    <Callout
      icon={warn ? <ShieldAlert /> : <Gauge />}
      tone={warn ? "warning" : undefined}
    >
      <p>
        {warn
          ? `The Brotli module isn't loaded on ${p.server_name}, so only gzip is used until it's installed.`
          : `Installing it adds the module from ${p.server_name}'s own packages and reloads ${p.kind_label}; sites keep running.`}
      </p>
      {can(p, "engineer") && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-11 md:h-8"
          disabled={setup.isPending}
          onClick={install}
        >
          <Gauge />
          Install Brotli module
        </Button>
      )}
    </Callout>
  )
}
