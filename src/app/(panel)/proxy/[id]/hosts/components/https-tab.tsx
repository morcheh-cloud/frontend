"use client"

import { FileKey, Info, TriangleAlert, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import {
  Callout,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { useJobList } from "@/components/jobs/api"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { JobBar, progressText } from "@/components/jobs/meta"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOpen } from "@/hooks/useOpen"
import type {
  Certificate,
  Job,
  ProxyInspection,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { domainsText } from "../../../components/meta"
import { CertificateLayer } from "./certificate-layer"
import {
  bestCertificate,
  type Draft,
  domainList,
  type Errors,
  type RedirectCode,
  type TlsProfile,
} from "./draft"
import { EditorCard as Card } from "./editor-card"

const typing = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

const YEAR = 31536000

const codes: { value: RedirectCode; label: string; note: string }[] = [
  { value: 301, label: "301 · Permanent", note: "Recommended" },
  { value: 308, label: "308 · Permanent", note: "Keeps a POST" },
  { value: 302, label: "302 · Temporary", note: "" },
  { value: 307, label: "307 · Temporary", note: "Keeps a POST" },
]

// "" (the proxy's own defaults) can't be a Select value.
const DEFAULTS = "defaults"

const profiles: {
  value: TlsProfile
  label: string
  note: string
  hint: string
}[] = [
  {
    value: "intermediate",
    label: "Intermediate",
    note: "Recommended",
    hint: "TLS 1.2 and 1.3 with strong ciphers: works for nearly every visitor.",
  },
  {
    value: "modern",
    label: "Modern",
    note: "TLS 1.3 only",
    hint: "TLS 1.3 only. Old phones, Java 8 and some API clients can't connect.",
  },
  {
    value: "old",
    label: "Old",
    note: "Also TLS 1.0, 1.1",
    hint: "Also TLS 1.0 and 1.1, for very old clients. Weaker: only when you must.",
  },
  {
    value: "",
    label: "Server defaults",
    note: "",
    hint: "Leaves the protocols and ciphers to the proxy's own settings.",
  },
]

// HSTS max-age choices; 0 = a year (the backend's default).
const ages = [
  { value: "300", label: "5 minutes (to test)" },
  { value: "86400", label: "1 day" },
  { value: "2592000", label: "30 days" },
  { value: "15768000", label: "6 months" },
  { value: "0", label: "1 year" },
  { value: "63072000", label: "2 years" },
]

const ageSeconds = (v: number) => (v === 0 ? YEAR : v)

// The HTTPS tab of the site editor: the certificate (picked from the server
// or got right here), the http → https redirect, protocols, HSTS and the
// rarer TLS settings.
export function HttpsTab({
  proxy: p,
  draft,
  set,
  setTls,
  errors,
  certs,
  inspection,
  phone,
}: {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  setTls: (on: boolean) => void
  errors: Errors
  certs: Certificate[]
  inspection: ProxyInspection | undefined
  phone: boolean
}) {
  const column = cn("flex min-w-0 flex-col", !phone && "gap-6")
  return (
    <div
      className={cn(
        phone
          ? "flex flex-col"
          : "flex flex-col gap-6 xl:grid xl:grid-cols-2 xl:items-start",
      )}
    >
      <div className={column}>
        <CertificateCard
          proxy={p}
          draft={draft}
          set={set}
          setTls={setTls}
          errors={errors}
          certs={certs}
          phone={phone}
        />
        <RedirectCard draft={draft} set={set} errors={errors} phone={phone} />
      </div>
      {draft.tls && (
        <div className={column}>
          <ProtocolsCard
            proxy={p}
            draft={draft}
            set={set}
            errors={errors}
            inspection={inspection}
            phone={phone}
          />
          <HstsCard draft={draft} set={set} errors={errors} phone={phone} />
          <MoreCard draft={draft} set={set} errors={errors} phone={phone} />
        </div>
      )}
    </div>
  )
}

function CertificateCard({
  proxy: p,
  draft,
  set,
  setTls,
  errors,
  certs,
  phone,
}: {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  setTls: (on: boolean) => void
  errors: Errors
  certs: Certificate[]
  phone: boolean
}) {
  const [layer, setLayer] = useOpen("proxy-cert-layer")
  // The certificate job started from here: its files go into the form when
  // it ends.
  const [jobId, setJobId] = useState<string | null>(null)
  const job = useJobList().data?.find((j) => j.id === jobId)
  const domains = domainList(draft.domains)
  const current = certs.find((c) => c.certificate === draft.certificate)

  useEffect(() => {
    if (job?.state !== "succeeded") return
    const r = job.result as { certificate?: string; key?: string } | undefined
    if (r?.certificate && r.key) {
      set({ tls: true, certificate: r.certificate, key: r.key })
    }
    setJobId(null)
  }, [job, set])

  const getButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-11 md:h-8"
      onClick={() => setLayer(true)}
    >
      <FileKey />
      Get a certificate
    </Button>
  )

  return (
    <Card
      title="Certificate"
      hint="From the server, or got here from Let's Encrypt and other CAs."
      phone={phone}
      action={draft.tls ? getButton : undefined}
    >
      <ToggleRow
        id="host-tls"
        label="Serve over https"
        checked={draft.tls}
        onChange={setTls}
      />

      {jobId && <CertJob job={job} onDismiss={() => setJobId(null)} />}

      {draft.tls ? (
        <>
          {certs.length > 0 ? (
            <CertificatePicker
              certs={certs}
              domains={domains}
              value={draft.certificate}
              onPick={(c) => set({ certificate: c.certificate, key: c.key })}
            />
          ) : (
            <Callout icon={<Info />}>
              No certificates found on the server yet. Get one with the button
              above, or type the files' paths.
            </Callout>
          )}
          {current && <CertificateFacts cert={current} />}
          <Field
            label="Certificate file"
            hint="The full chain (fullchain.pem)."
            error={errors["tls.certificate"]}
          >
            {(f) => (
              <Input
                {...f}
                {...typing}
                value={draft.certificate}
                onChange={(e) => set({ certificate: e.target.value })}
                placeholder="/etc/letsencrypt/live/example.com/fullchain.pem"
                className="font-mono"
              />
            )}
          </Field>
          <Field label="Key file" error={errors["tls.key"]}>
            {(f) => (
              <Input
                {...f}
                {...typing}
                value={draft.key}
                onChange={(e) => set({ key: e.target.value })}
                placeholder="/etc/letsencrypt/live/example.com/privkey.pem"
                className="font-mono"
              />
            )}
          </Field>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-caption text-muted-foreground">
            Plain http only. Get a certificate for these names (it turns https
            on when it's ready), or turn it on to use one already on the server.
          </p>
          {getButton}
        </div>
      )}

      <CertificateLayer
        open={layer}
        onOpenChange={setLayer}
        proxy={p}
        domains={domains}
        onStarted={(j) => setJobId(j.id)}
      />
    </Card>
  )
}

// The running (or failed) certificate job, under the switch.
function CertJob({
  job,
  onDismiss,
}: {
  job: Job | undefined
  onDismiss: () => void
}) {
  const jobs = useJobActions()
  if (!job) {
    return (
      <p className="text-caption text-muted-foreground">Starting the job…</p>
    )
  }
  const running = job.state === "queued" || job.state === "running"
  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-2 rounded-lg bg-subtle px-3 py-2.5"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium">
            {running
              ? "Getting the certificate…"
              : job.state === "failed"
                ? "No certificate"
                : "Stopped"}
          </p>
          <p
            className={cn(
              "text-caption break-words",
              job.state === "failed"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {running
              ? job.progress.current || progressText(job)
              : job.error || "The job didn't finish."}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 shrink-0 md:h-7"
          onClick={() => jobs.show(job.id)}
        >
          Details
        </Button>
        {!running && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-11 shrink-0 md:size-7"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <X />
          </Button>
        )}
      </div>
      {running && <JobBar job={job} />}
    </div>
  )
}

// Who signed the picked certificate and whether it renews by itself.
function CertificateFacts({ cert }: { cert: Certificate }) {
  const left = daysLeft(cert)
  const parts = [cert.issuer || "Unknown issuer"]
  if (cert.source === "certbot") parts.push("certbot renews it by itself")
  else if (cert.expires) parts.push("not renewed: replace it before it ends")
  return (
    <p className="-mt-2 text-caption text-muted-foreground">
      {parts.join(" · ")}
      {left !== null && (
        <span
          className={cn(
            "ms-1",
            left < 0 ? "text-destructive" : left < 14 && "text-warning",
          )}
        >
          · {left < 0 ? "expired" : `${left} days left`}
        </span>
      )}
    </p>
  )
}

function RedirectCard({
  draft,
  set,
  errors,
  phone,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const code = codes.find((c) => c.value === draft.forceCode)
  return (
    <Card
      title="Redirect to https"
      hint="Visitors who type http:// land on https:// instead."
      phone={phone}
    >
      <ToggleRow
        id="host-force-https"
        label="Force https"
        hint={
          draft.tls
            ? "Every plain http request is sent to the same address over https."
            : "Turn on https first."
        }
        checked={draft.tls && draft.forceHttps}
        disabled={!draft.tls}
        onChange={(forceHttps) => set({ forceHttps })}
      />
      {draft.tls && draft.forceHttps && (
        <Field
          label="Redirect code"
          hint="Browsers remember a permanent one: try a temporary code while testing."
          error={errors["tls.force_code"]}
        >
          {(f) => (
            <Select
              items={codes.map((c) => ({
                value: String(c.value),
                label: c.label,
              }))}
              value={String(draft.forceCode)}
              onValueChange={(v) =>
                v && set({ forceCode: Number(v) as RedirectCode })
              }
            >
              <SelectTrigger id={f.id} className="h-11 w-full md:h-10">
                <SelectValue>{code?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {codes.map((c) => (
                  <SelectItem key={c.value} value={String(c.value)}>
                    <span className="truncate">{c.label}</span>
                    {c.note && (
                      <span className="ms-auto shrink-0 text-caption text-ash">
                        {c.note}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}
    </Card>
  )
}

function ProtocolsCard({
  proxy: p,
  draft,
  set,
  errors,
  inspection,
  phone,
}: {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  inspection: ProxyInspection | undefined
  phone: boolean
}) {
  const quic = inspection?.http3 ?? false
  const profile = profiles.find((x) => x.value === draft.profile)
  return (
    <Card title="Protocols" phone={phone}>
      <ToggleRow
        id="host-http2"
        label="HTTP/2"
        hint="Faster pages. Leave on unless the app has trouble with it."
        checked={draft.http2}
        onChange={(http2) => set({ http2 })}
      />
      <ToggleRow
        id="host-http3"
        label="HTTP/3"
        hint={
          quic || draft.http3
            ? "Over QUIC: quicker on phones and patchy networks. Browsers fall back to HTTP/2."
            : inspection
              ? `${p.kind_label} ${inspection.version} here can't: it needs 1.25 or newer, built with HTTP/3.`
              : "Checking whether the server can…"
        }
        checked={draft.http3}
        disabled={!quic && !draft.http3}
        onChange={(http3) => set({ http3 })}
      />
      {errors["tls.http3"] && (
        <p className="-mt-2 text-caption text-destructive">
          {errors["tls.http3"]}
        </p>
      )}
      {draft.http3 && (
        <Callout icon={<Info />}>
          HTTP/3 uses UDP port 443: open it in the{" "}
          <Link
            href={`/servers/${p.server_id}/firewall`}
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            server's firewall
          </Link>{" "}
          and any cloud firewall, or visitors stay on HTTP/2.
        </Callout>
      )}
      <Field
        label="TLS settings"
        hint={profile?.hint}
        error={errors["tls.profile"]}
      >
        {(f) => (
          <Select
            items={profiles.map((x) => ({
              value: x.value || DEFAULTS,
              label: x.label,
            }))}
            value={draft.profile || DEFAULTS}
            onValueChange={(v) =>
              v && set({ profile: (v === DEFAULTS ? "" : v) as TlsProfile })
            }
          >
            <SelectTrigger id={f.id} className="h-11 w-full md:h-10">
              <SelectValue>{profile?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {profiles.map((x) => (
                <SelectItem
                  key={x.value || DEFAULTS}
                  value={x.value || DEFAULTS}
                >
                  <span className="truncate">{x.label}</span>
                  {x.note && (
                    <span className="ms-auto shrink-0 text-caption text-ash">
                      {x.note}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
    </Card>
  )
}

function HstsCard({
  draft,
  set,
  errors,
  phone,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const age = ages.find((a) => a.value === String(draft.hstsMaxAge))
  const canPreload =
    draft.hstsSubdomains && ageSeconds(draft.hstsMaxAge) >= YEAR
  return (
    <Card
      title="HSTS"
      hint="Browsers refuse plain http for this name for as long as they remember it."
      phone={phone}
    >
      <ToggleRow
        id="host-hsts"
        label="HSTS"
        hint="Sends Strict-Transport-Security."
        checked={draft.hsts}
        onChange={(hsts) => set({ hsts })}
      />
      {draft.hsts && (
        <>
          <Field
            label="Remembered for"
            hint="Start short, then raise it once https has worked for a while."
            error={errors["tls.hsts_max_age"]}
          >
            {(f) => (
              <Select
                items={ages}
                value={age ? age.value : "0"}
                onValueChange={(v) => {
                  if (v === null) return
                  const hstsMaxAge = Number(v)
                  set(
                    ageSeconds(hstsMaxAge) < YEAR
                      ? { hstsMaxAge, hstsPreload: false }
                      : { hstsMaxAge },
                  )
                }}
              >
                <SelectTrigger id={f.id} className="h-11 w-full md:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {ages.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      <span className="truncate">{a.label}</span>
                      {a.value === "0" && (
                        <span className="ms-auto shrink-0 text-caption text-ash">
                          Recommended
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <ToggleRow
            id="host-hsts-subdomains"
            label="Include subdomains"
            hint="Every name under this one too: each of them must work over https."
            checked={draft.hstsSubdomains}
            onChange={(hstsSubdomains) =>
              set(
                hstsSubdomains
                  ? { hstsSubdomains }
                  : { hstsSubdomains, hstsPreload: false },
              )
            }
          />
          <ToggleRow
            id="host-hsts-preload"
            label="Preload"
            hint={
              canPreload
                ? "Lets you list the name at hstspreload.org, so browsers use https even on the first visit."
                : "Needs subdomains included and a year or more."
            }
            checked={draft.hstsPreload}
            disabled={!canPreload && !draft.hstsPreload}
            onChange={(hstsPreload) => set({ hstsPreload })}
          />
          {errors["tls.hsts_preload"] && (
            <p className="-mt-2 text-caption text-destructive">
              {errors["tls.hsts_preload"]}
            </p>
          )}
          <Callout icon={<TriangleAlert />} tone="warning">
            Hard to take back: if https stops working, visitors who came before
            can't reach the site until the certificate is fixed.
            {draft.hstsPreload &&
              " A preloaded name takes months to leave the browsers' lists."}
          </Callout>
        </>
      )}
    </Card>
  )
}

function MoreCard({
  draft,
  set,
  errors,
  phone,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  return (
    <Card title="More" phone={phone}>
      <ToggleRow
        id="host-ocsp"
        label="OCSP stapling"
        hint="Sends the certificate's revocation status along. Only for certificates that list an OCSP address (Let's Encrypt's no longer do)."
        checked={draft.ocsp}
        onChange={(ocsp) => set({ ocsp })}
      />
      <ToggleRow
        id="host-session-cache"
        label="Session cache"
        hint="Returning visitors connect faster. Leave on."
        checked={draft.sessionCache}
        onChange={(sessionCache) => set({ sessionCache })}
      />
      <Field
        label="Client certificates"
        hint="Optional. Path of a CA file on the server: visitors must show a certificate it signed (mutual TLS)."
        error={errors["tls.client_ca"] || errors["tls.verify_client"]}
      >
        {(f) => (
          <Input
            {...f}
            {...typing}
            value={draft.clientCa}
            onChange={(e) => set({ clientCa: e.target.value })}
            placeholder="/etc/nginx/client-ca.pem"
            className="font-mono"
          />
        )}
      </Field>
      {draft.clientCa.trim() && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm font-medium">A client certificate is</p>
            <p className="text-caption text-muted-foreground">
              {draft.verifyClient === "on"
                ? "Visitors without one are refused."
                : "Asked for; the app sees whether it checked out."}
            </p>
          </div>
          <Segmented
            label="Client certificate"
            items={[
              { value: "on", label: "Required" },
              { value: "optional", label: "Optional" },
            ]}
            value={draft.verifyClient}
            onChange={(verifyClient) => set({ verifyClient })}
          />
        </div>
      )}
    </Card>
  )
}

function certLabel(c: Certificate) {
  return c.domains.length ? domainsText(c.domains) : c.name
}

function daysLeft(c: Certificate) {
  if (!c.expires) return null
  return Math.floor((new Date(c.expires).getTime() - Date.now()) / 864e5)
}

function certNote(c: Certificate) {
  const left = daysLeft(c)
  if (left === null) return c.issuer ?? ""
  return left < 0 ? "expired" : `${left} days left`
}

// Certificates found on the server, the ones covering these names first.
function CertificatePicker({
  certs,
  domains,
  value,
  onPick,
}: {
  certs: Certificate[]
  domains: string[]
  value: string
  onPick: (c: Certificate) => void
}) {
  const best = bestCertificate(certs, domains)
  const sorted = [...certs].sort(
    (a, b) =>
      Number(b.certificate === best?.certificate) -
        Number(a.certificate === best?.certificate) ||
      certLabel(a).localeCompare(certLabel(b)),
  )
  const items = sorted.map((c) => ({
    value: c.certificate,
    label: certLabel(c),
  }))
  const current = certs.find((c) => c.certificate === value)
  return (
    <Field
      label="Found on the server"
      hint={
        best && best.certificate !== value
          ? `${certLabel(best)} covers these names.`
          : current
            ? undefined
            : "Fills in both files."
      }
    >
      {(f) => (
        <Select
          items={items}
          value={current ? current.certificate : null}
          onValueChange={(v) => {
            const c = certs.find((x) => x.certificate === v)
            if (c) onPick(c)
          }}
        >
          <SelectTrigger id={f.id} className="h-11 w-full md:h-10">
            <SelectValue placeholder="Pick a certificate" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="max-h-72">
            {sorted.map((c) => (
              <SelectItem key={c.certificate} value={c.certificate}>
                <span className="min-w-0 truncate">
                  {certLabel(c)}
                  {c.issuer && (
                    <span className="ms-1.5 text-caption text-ash">
                      {c.issuer}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "ms-auto shrink-0 text-caption",
                    certNote(c) === "expired" ? "text-destructive" : "text-ash",
                  )}
                >
                  {c.certificate === best?.certificate
                    ? "Covers these names"
                    : certNote(c)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  )
}
