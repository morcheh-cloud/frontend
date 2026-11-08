import { splitList } from "@/app/(panel)/dns/components/fields"
import type { HostType } from "@/app/(panel)/proxy/components/meta"
import type {
  Certificate,
  HeaderRule,
  HostConfig,
  ProxyHost,
  ProxyHostBody,
} from "@/lib/services"

export type RedirectCode = 301 | 302 | 307 | 308

export type HeaderDraft = {
  key: string
  to: HeaderRule["to"]
  name: string
  value: string
}

export type PathDraft = {
  key: string
  path: string
  upstream: string
  websockets: boolean
  // Raw directives for this path only.
  advanced: string
}

// What the form holds. Lists stay text until they're sent.
export type Draft = {
  type: HostType
  domains: string
  upstream: string
  websockets: boolean
  preserveHost: boolean
  redirectTo: string
  redirectCode: RedirectCode
  keepPath: boolean
  root: string
  spa: boolean
  tls: boolean
  certificate: string
  key: string
  forceHttps: boolean
  hsts: boolean
  http2: boolean
  headers: HeaderDraft[]
  paths: PathDraft[]
  allow: string
  advanced: string
  maxBody: string
  timeout: string
  note: string
  enabled: boolean
}

let rowSeq = 0
export const rowKey = () => `r${++rowSeq}`

export const freshHeader = (): HeaderDraft => ({
  key: rowKey(),
  to: "response",
  name: "",
  value: "",
})

export const freshPath = (): PathDraft => ({
  key: rowKey(),
  path: "",
  upstream: "",
  websockets: false,
  advanced: "",
})

export const freshDraft = (type: HostType = "proxy"): Draft => ({
  type,
  domains: "",
  upstream: "",
  websockets: true,
  preserveHost: true,
  redirectTo: "",
  redirectCode: 301,
  keepPath: true,
  root: "",
  spa: false,
  tls: false,
  certificate: "",
  key: "",
  forceHttps: true,
  hsts: false,
  http2: true,
  headers: [],
  paths: [],
  allow: "",
  advanced: "",
  maxBody: "",
  timeout: "",
  note: "",
  enabled: true,
})

export function draftFromHost(h: ProxyHost): Draft {
  const c = h.config
  const base = freshDraft(c.type)
  return {
    ...base,
    domains: h.domains.join("\n"),
    upstream: c.upstream ?? "",
    websockets: c.type === "proxy" ? !!c.websockets : base.websockets,
    preserveHost: c.type === "proxy" ? !!c.preserve_host : base.preserveHost,
    redirectTo: c.redirect_to ?? "",
    redirectCode: (c.redirect_code || 301) as RedirectCode,
    keepPath: c.type === "redirect" ? !!c.keep_path : base.keepPath,
    root: c.root ?? "",
    spa: !!c.spa,
    tls: !!c.tls?.enabled,
    certificate: c.tls?.certificate ?? "",
    key: c.tls?.key ?? "",
    forceHttps: c.tls?.enabled ? !!c.tls.force_https : base.forceHttps,
    hsts: !!c.tls?.hsts,
    http2: c.tls?.enabled ? !!c.tls.http2 : base.http2,
    headers: (c.headers ?? []).map((x) => ({ key: rowKey(), ...x })),
    paths: (c.paths ?? []).map((p) => ({
      key: rowKey(),
      path: p.path,
      upstream: p.upstream,
      websockets: !!p.websockets,
      advanced: p.advanced ?? "",
    })),
    allow: (c.allow ?? []).join("\n"),
    advanced: c.advanced ?? "",
    maxBody: c.max_body_mb ? String(c.max_body_mb) : "",
    timeout: c.timeout_seconds ? String(c.timeout_seconds) : "",
    note: h.note,
    enabled: h.enabled,
  }
}

// Tidied the way the backend tidies them, so a problem at `domains[2]`
// points at the same entry here.
export function domainList(text: string) {
  const out: string[] = []
  for (const d of splitList(text)) {
    const v = d.toLowerCase().replace(/\.$/, "")
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

const keptHeaders = (d: Draft) => d.headers.filter((x) => x.name.trim())
const keptPaths = (d: Draft) =>
  d.paths.filter((p) => p.path.trim() || p.upstream.trim())

const number = (text: string) => {
  const n = Number(text.trim())
  return text.trim() && Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined
}

// Only what the chosen type uses; no `tls` means plain http.
export function toConfig(d: Draft): HostConfig {
  const c: HostConfig = { type: d.type, domains: domainList(d.domains) }
  if (d.type === "proxy") {
    c.upstream = d.upstream.trim()
    c.websockets = d.websockets
    c.preserve_host = d.preserveHost
    c.timeout_seconds = number(d.timeout)
  } else if (d.type === "redirect") {
    c.redirect_to = d.redirectTo.trim()
    c.redirect_code = d.redirectCode
    c.keep_path = d.keepPath
  } else {
    c.root = d.root.trim()
    c.spa = d.spa
  }
  if (d.tls) {
    c.tls = {
      enabled: true,
      certificate: d.certificate.trim(),
      key: d.key.trim(),
      force_https: d.forceHttps,
      hsts: d.hsts,
      http2: d.http2,
    }
  }
  const headers = keptHeaders(d).map(({ to, name, value }) => ({
    to,
    name: name.trim(),
    value: value.trim(),
  }))
  if (headers.length) c.headers = headers
  if (d.type !== "redirect") {
    const paths = keptPaths(d).map((p) => ({
      path: p.path.trim(),
      upstream: p.upstream.trim(),
      websockets: p.websockets || undefined,
      advanced: p.advanced.trim() || undefined,
    }))
    if (paths.length) c.paths = paths
  }
  const allow = splitList(d.allow)
  if (allow.length) c.allow = allow
  if (d.advanced.trim()) c.advanced = d.advanced.trim()
  c.max_body_mb = number(d.maxBody)
  return c
}

export const toBody = (d: Draft): ProxyHostBody => ({
  config: toConfig(d),
  note: d.note.trim(),
  enabled: d.enabled,
})

export const sameDraft = (a: Draft, b: Draft) =>
  JSON.stringify(toBody(a)) === JSON.stringify(toBody(b))

// Where a problem shows. Rows of headers and paths are keyed by their row,
// so the message lands next to the right one.
export type Errors = Record<string, string>

export function problemsToErrors(
  problems: { location?: string; field?: string; message?: string }[],
  d: Draft,
): Errors {
  const out: Errors = {}
  const domains = domainList(d.domains)
  const allow = splitList(d.allow)
  const headers = keptHeaders(d)
  const paths = keptPaths(d)
  for (const p of problems) {
    const where = p.location ?? p.field
    if (!where || !p.message) continue
    const f = where.replace(/^body\./, "").replace(/^config\./, "")
    const m = /^(\w+)\[(\d+)\]/.exec(f)
    let key = f
    let message = p.message
    if (m) {
      const i = Number(m[2])
      if (m[1] === "domains") {
        key = "domains"
        if (domains[i]) message = `${domains[i]}: ${message}`
      } else if (m[1] === "allow") {
        key = "allow"
        if (allow[i]) message = `${allow[i]}: ${message}`
      } else if (m[1] === "headers") {
        key = `headers.${headers[i]?.key ?? i}`
      } else if (m[1] === "paths") {
        key = `paths.${paths[i]?.key ?? i}`
      } else {
        key = m[1]
      }
    }
    out[key] ??= message
  }
  return out
}

// Which errors a change to these draft keys clears.
export function clearErrors(e: Errors, patch: Partial<Draft>): Errors {
  const next = { ...e }
  const map: Partial<Record<keyof Draft, string[]>> = {
    type: ["type", "upstream", "redirect_to", "redirect_code", "root"],
    domains: ["domains"],
    upstream: ["upstream"],
    redirectTo: ["redirect_to"],
    redirectCode: ["redirect_code"],
    root: ["root"],
    tls: ["tls.certificate", "tls.key"],
    certificate: ["tls.certificate"],
    key: ["tls.key"],
    allow: ["allow"],
    advanced: ["advanced"],
    maxBody: ["max_body_mb"],
    timeout: ["timeout_seconds"],
    note: ["note"],
  }
  for (const k of Object.keys(patch) as (keyof Draft)[]) {
    for (const f of map[k] ?? []) delete next[f]
  }
  return next
}

// A certificate that covers a name: the same name, or a wildcard one level
// up (*.example.com covers www.example.com, not example.com).
export function covers(cert: Certificate, domain: string) {
  return cert.domains.some(
    (c) =>
      c === domain ||
      (c.startsWith("*.") &&
        domain.endsWith(c.slice(1)) &&
        domain.split(".").length === c.split(".").length),
  )
}

// The certificate that covers every domain of the site, if one does.
export function bestCertificate(certs: Certificate[], domains: string[]) {
  if (!domains.length) return undefined
  const usable = certs.filter(
    (c) => !c.expires || new Date(c.expires).getTime() > Date.now(),
  )
  return usable.find((c) => domains.every((d) => covers(c, d)))
}
