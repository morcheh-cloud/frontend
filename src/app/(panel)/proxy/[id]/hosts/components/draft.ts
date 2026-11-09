import { splitList } from "@/app/(panel)/dns/components/fields"

export { splitList }

import type { HostType } from "@/app/(panel)/proxy/components/meta"
import type {
  Certificate,
  HeaderRule,
  HostConfig,
  HostTLS,
  ProxyHost,
  ProxyHostBody,
  RateLimit,
  RateRule,
  RealIP,
} from "@/lib/services"

export type RedirectCode = 301 | 302 | 307 | 308
export type TlsProfile = NonNullable<HostTLS["profile"]>

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

export type Access = "allow" | "deny"
export type RealIpHeader = NonNullable<RealIP["header"]>
export type RateStatus = 429 | 503 | 444

export type RateRuleDraft = {
  key: string
  path: string
  rate: string
  per: RateRule["per"]
  burst: string
  mode: "nodelay" | "queue" | "delay"
  delay: string
  by: "ip" | "site"
  methods: string[]
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
  // stream: a port on the proxy's server forwarded to host:port.
  listenPort: string
  protocol: "tcp" | "udp"
  streamTo: string
  tls: boolean
  certificate: string
  key: string
  forceHttps: boolean
  // 301 by default; 308 keeps a POST's method and body.
  forceCode: RedirectCode
  hsts: boolean
  // Seconds; 0 = a year.
  hstsMaxAge: number
  hstsSubdomains: boolean
  hstsPreload: boolean
  http2: boolean
  http3: boolean
  profile: TlsProfile
  ocsp: boolean
  sessionCache: boolean
  clientCa: string
  verifyClient: "on" | "optional"
  headers: HeaderDraft[]
  paths: PathDraft[]
  allow: string
  deny: string
  // Everyone the two lists don't name.
  defaultAccess: Access
  countries: string[]
  countryMode: Access
  rateRules: RateRuleDraft[]
  connPerIp: string
  connTotal: string
  downloadKbs: string
  uploadKbs: string
  fullSpeedMb: string
  rateStatus: RateStatus
  rateExempt: string
  rateDryRun: boolean
  advanced: string
  maxBody: string
  timeout: string
  // Advanced: tuning
  gzip: boolean
  noBuffering: boolean
  connectTimeout: string
  // Addresses of a CDN or load balancer in front; empty = none.
  realIpFrom: string
  realIpHeader: RealIpHeader
  proxyProtocol: boolean
  hideVersion: boolean
  // Cache: what browsers keep…
  assetDays: string
  pagesFresh: boolean
  // …and the proxy's own cache (proxy sites).
  cache: boolean
  cacheMinutes: string
  cacheSizeMb: string
  serveStale: boolean
  ignoreUpstream: boolean
  skipPaths: string
  skipCookies: string
  cacheStatus: boolean
  note: string
  enabled: boolean
  // The whole file written by hand; when set it's written instead of the
  // generated one and the other settings stop changing the file.
  custom: string
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

export const freshRateRule = (): RateRuleDraft => ({
  key: rowKey(),
  path: "",
  rate: "10",
  per: "second",
  burst: "20",
  mode: "nodelay",
  delay: "",
  by: "ip",
  methods: [],
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
  listenPort: "",
  protocol: "tcp",
  streamTo: "",
  tls: false,
  certificate: "",
  key: "",
  forceHttps: true,
  forceCode: 301,
  hsts: false,
  hstsMaxAge: 0,
  hstsSubdomains: false,
  hstsPreload: false,
  http2: true,
  http3: false,
  profile: "intermediate",
  ocsp: false,
  sessionCache: true,
  clientCa: "",
  verifyClient: "on",
  headers: [],
  paths: [],
  allow: "",
  deny: "",
  defaultAccess: "allow",
  countries: [],
  countryMode: "deny",
  rateRules: [],
  connPerIp: "",
  connTotal: "",
  downloadKbs: "",
  uploadKbs: "",
  fullSpeedMb: "",
  rateStatus: 429,
  rateExempt: "",
  rateDryRun: false,
  advanced: "",
  maxBody: "",
  timeout: "",
  // A new site starts with the usual good practice.
  gzip: true,
  noBuffering: false,
  connectTimeout: "",
  realIpFrom: "",
  realIpHeader: "X-Forwarded-For",
  proxyProtocol: false,
  hideVersion: true,
  assetDays: "",
  pagesFresh: false,
  cache: false,
  cacheMinutes: "",
  cacheSizeMb: "",
  serveStale: true,
  ignoreUpstream: false,
  skipPaths: "",
  skipCookies: "",
  cacheStatus: true,
  note: "",
  enabled: true,
  custom: "",
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
    listenPort: c.listen_port ? String(c.listen_port) : "",
    protocol: c.protocol === "udp" ? "udp" : "tcp",
    streamTo: c.stream_to ?? "",
    tls: !!c.tls?.enabled,
    certificate: c.tls?.certificate ?? "",
    key: c.tls?.key ?? "",
    forceHttps: c.tls?.enabled ? !!c.tls.force_https : base.forceHttps,
    forceCode: (c.tls?.force_code || 301) as RedirectCode,
    hsts: !!c.tls?.hsts,
    hstsMaxAge: c.tls?.hsts_max_age ?? 0,
    hstsSubdomains: !!c.tls?.hsts_subdomains,
    hstsPreload: !!c.tls?.hsts_preload,
    http2: c.tls?.enabled ? !!c.tls.http2 : base.http2,
    http3: !!c.tls?.http3,
    // A site saved before profiles existed keeps the proxy's defaults.
    profile: c.tls?.enabled ? (c.tls.profile ?? "") : base.profile,
    ocsp: !!c.tls?.ocsp,
    sessionCache: c.tls?.enabled ? !!c.tls.session_cache : base.sessionCache,
    clientCa: c.tls?.client_ca ?? "",
    verifyClient: c.tls?.verify_client === "optional" ? "optional" : "on",
    headers: (c.headers ?? []).map((x) => ({ key: rowKey(), ...x })),
    paths: (c.paths ?? []).map((p) => ({
      key: rowKey(),
      path: p.path,
      upstream: p.upstream,
      websockets: !!p.websockets,
      advanced: p.advanced ?? "",
    })),
    allow: (c.allow ?? []).join("\n"),
    deny: (c.deny ?? []).join("\n"),
    defaultAccess:
      c.default_access || (c.allow?.length ? "deny" : base.defaultAccess),
    countries: c.countries ?? [],
    countryMode: c.country_mode || base.countryMode,
    ...rateFromConfig(c.rate_limit),
    advanced: c.advanced ?? "",
    maxBody: c.max_body_mb ? String(c.max_body_mb) : "",
    timeout: c.timeout_seconds ? String(c.timeout_seconds) : "",
    gzip: !!c.gzip,
    noBuffering: !!c.no_buffering,
    connectTimeout: text(c.connect_timeout_seconds),
    realIpFrom: (c.real_ip?.from ?? []).join("\n"),
    realIpHeader: c.real_ip?.header || base.realIpHeader,
    proxyProtocol: !!c.proxy_protocol,
    hideVersion: !!c.hide_version,
    ...cacheFromConfig(c.cache, base),
    note: h.note,
    enabled: h.enabled,
    custom: c.custom ?? "",
  }
}

const text = (n?: number) => (n ? String(n) : "")

// A site without the proxy's cache keeps the fresh defaults, so turning it
// on starts from them.
function cacheFromConfig(c: HostConfig["cache"], base: Draft) {
  const on = !!c?.enabled
  return {
    assetDays: text(c?.asset_days),
    pagesFresh: !!c?.pages_fresh,
    cache: on,
    cacheMinutes: text(c?.minutes),
    cacheSizeMb: text(c?.max_size_mb),
    serveStale: on ? !!c?.serve_stale : base.serveStale,
    ignoreUpstream: !!c?.ignore_upstream,
    skipPaths: (c?.skip_paths ?? []).join("\n"),
    skipCookies: (c?.skip_cookies ?? []).join("\n"),
    cacheStatus: on ? !!c?.status_header : base.cacheStatus,
  }
}

function rateFromConfig(r?: RateLimit) {
  return {
    rateRules: (r?.rules ?? []).map(
      (x): RateRuleDraft => ({
        key: rowKey(),
        path: x.path ?? "",
        rate: String(x.rate),
        per: x.per,
        burst: text(x.burst),
        mode: x.mode || "nodelay",
        delay: text(x.delay),
        by: x.key || "ip",
        methods: x.methods ?? [],
      }),
    ),
    connPerIp: text(r?.conn_per_ip),
    connTotal: text(r?.conn_total),
    downloadKbs: text(r?.download_kbs),
    uploadKbs: text(r?.upload_kbs),
    fullSpeedMb: text(r?.full_speed_mb),
    rateStatus: (r?.status || 429) as RateStatus,
    rateExempt: (r?.exempt ?? []).join("\n"),
    rateDryRun: !!r?.dry_run,
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
// Rules count on sites only; a row with no rate isn't sent.
export const keptRules = (d: Draft) =>
  d.type === "stream" ? [] : d.rateRules.filter((r) => r.rate.trim())

// Upper-cased, without blanks or repeats, as the backend keeps them.
export const countryList = (d: Draft) => [
  ...new Set(d.countries.map((c) => c.trim().toUpperCase()).filter(Boolean)),
]

const number = (text: string) => {
  const n = Number(text.trim())
  return text.trim() && Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined
}

// What each type takes besides its own fields.
export const typeUses = (t: Draft["type"]) => ({
  domains: t !== "stream",
  tls: t !== "stream",
  headers: t !== "stream",
  paths: t === "proxy" || t === "static",
  maxBody: t !== "stream" && t !== "notfound",
  timeout: t === "proxy" || t === "stream",
  countries: t !== "stream",
  rateLimit: t === "proxy" || t === "static" || t === "stream",
  gzip: t === "proxy" || t === "static",
  noBuffering: t === "proxy",
  connectTimeout: t === "proxy" || t === "stream",
  realIp: t !== "stream",
  proxyProtocol: t === "stream",
  hideVersion: t !== "stream",
  browserCache: t === "proxy" || t === "static",
  proxyCache: t === "proxy",
})

// The cache as sent; undefined when it does nothing.
export function toCache(d: Draft): HostConfig["cache"] {
  const uses = typeUses(d.type)
  if (!uses.browserCache) return undefined
  const c: NonNullable<HostConfig["cache"]> = {
    asset_days: number(d.assetDays),
    pages_fresh: d.pagesFresh || undefined,
  }
  if (uses.proxyCache && d.cache) {
    Object.assign(c, {
      enabled: true,
      minutes: number(d.cacheMinutes),
      max_size_mb: number(d.cacheSizeMb),
      serve_stale: d.serveStale || undefined,
      ignore_upstream: d.ignoreUpstream || undefined,
      skip_paths: listOrNone(d.skipPaths),
      skip_cookies: listOrNone(d.skipCookies),
      status_header: d.cacheStatus || undefined,
    })
  }
  return c.asset_days || c.pages_fresh || c.enabled ? c : undefined
}

const listOrNone = (text: string) => {
  const l = splitList(text)
  return l.length ? l : undefined
}

// The rate limit as sent; undefined when it limits nothing.
export function toRateLimit(d: Draft): RateLimit | undefined {
  if (!typeUses(d.type).rateLimit) return undefined
  const stream = d.type === "stream"
  const rules = keptRules(d).map(
    (r): RateRule => ({
      path: r.path.trim() || undefined,
      rate: number(r.rate) ?? 0,
      per: r.per,
      burst: number(r.burst),
      mode: r.mode,
      delay: r.mode === "delay" ? number(r.delay) : undefined,
      key: r.by,
      methods: r.methods.length ? r.methods : undefined,
    }),
  )
  const download = number(d.downloadKbs)
  const r: RateLimit = {
    rules: rules.length ? rules : undefined,
    conn_per_ip: number(d.connPerIp),
    conn_total: number(d.connTotal),
    download_kbs: download,
    upload_kbs: stream ? number(d.uploadKbs) : undefined,
  }
  if (!r.rules && !r.conn_per_ip && !r.conn_total && !download && !r.upload_kbs)
    return undefined
  r.full_speed_mb = !stream && download ? number(d.fullSpeedMb) : undefined
  r.status = d.rateStatus
  const exempt = splitList(d.rateExempt)
  if (exempt.length) r.exempt = exempt
  if (d.rateDryRun) r.dry_run = true
  return r
}

// Only what the chosen type uses; no `tls` means plain http.
export function toConfig(d: Draft): HostConfig {
  const uses = typeUses(d.type)
  const c: HostConfig = {
    type: d.type,
    domains: uses.domains ? domainList(d.domains) : [],
  }
  if (d.type === "stream") {
    c.listen_port = number(d.listenPort)
    c.protocol = d.protocol
    c.stream_to = d.streamTo.trim()
    c.timeout_seconds = number(d.timeout)
  } else if (d.type === "notfound") {
    // Only the domains, https, headers and who may connect.
  } else if (d.type === "proxy") {
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
  if (d.tls && uses.tls) {
    c.tls = {
      enabled: true,
      certificate: d.certificate.trim(),
      key: d.key.trim(),
      force_https: d.forceHttps,
      force_code: d.forceHttps && d.forceCode !== 301 ? d.forceCode : undefined,
      hsts: d.hsts,
      http2: d.http2,
      http3: d.http3 || undefined,
      profile: d.profile || undefined,
      ocsp: d.ocsp || undefined,
      session_cache: d.sessionCache || undefined,
    }
    if (d.hsts) {
      c.tls.hsts_max_age = d.hstsMaxAge || undefined
      c.tls.hsts_subdomains = d.hstsSubdomains || undefined
      c.tls.hsts_preload = d.hstsPreload || undefined
    }
    const ca = d.clientCa.trim()
    if (ca) {
      c.tls.client_ca = ca
      c.tls.verify_client = d.verifyClient
    }
  }
  const headers = keptHeaders(d).map(({ to, name, value }) => ({
    to,
    name: name.trim(),
    value: value.trim(),
  }))
  if (headers.length && uses.headers) c.headers = headers
  if (uses.paths) {
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
  const deny = splitList(d.deny)
  if (deny.length) c.deny = deny
  c.default_access = d.defaultAccess
  const countries = countryList(d)
  if (countries.length && uses.countries) {
    c.countries = countries
    c.country_mode = d.countryMode
  }
  const rate = toRateLimit(d)
  if (rate) c.rate_limit = rate
  if (d.advanced.trim()) c.advanced = d.advanced.trim()
  if (uses.maxBody) c.max_body_mb = number(d.maxBody)
  if (uses.gzip && d.gzip) c.gzip = true
  if (uses.noBuffering && d.noBuffering) c.no_buffering = true
  if (uses.connectTimeout) c.connect_timeout_seconds = number(d.connectTimeout)
  const realIp = splitList(d.realIpFrom)
  if (uses.realIp && realIp.length)
    c.real_ip = { from: realIp, header: d.realIpHeader }
  if (uses.proxyProtocol && d.proxyProtocol) c.proxy_protocol = true
  if (uses.hideVersion && d.hideVersion) c.hide_version = true
  const cache = toCache(d)
  if (cache) c.cache = cache
  if (d.custom.trim()) c.custom = d.custom.trim()
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
  const lists: Record<string, string[]> = {
    allow: splitList(d.allow),
    deny: splitList(d.deny),
    countries: countryList(d),
    "rate_limit.exempt": splitList(d.rateExempt),
    "real_ip.from": splitList(d.realIpFrom),
    "cache.skip_paths": splitList(d.skipPaths),
    "cache.skip_cookies": splitList(d.skipCookies),
  }
  const rules = keptRules(d)
  const headers = keptHeaders(d)
  const paths = keptPaths(d)
  for (const p of problems) {
    const where = p.location ?? p.field
    if (!where || !p.message) continue
    const f = where.replace(/^body\./, "").replace(/^config\./, "")
    const rule = /^rate_limit\.rules\[(\d+)\](?:\.(\w+))?/.exec(f)
    if (rule) {
      const k = rules[Number(rule[1])]?.key ?? rule[1]
      out[`rate.${k}.${rule[2] ?? "rate"}`] ??= p.message
      continue
    }
    const m = /^([\w.]+)\[(\d+)\]/.exec(f)
    let key = f
    let message = p.message
    if (m) {
      const i = Number(m[2])
      if (m[1] === "domains") {
        key = "domains"
        if (domains[i]) message = `${domains[i]}: ${message}`
      } else if (lists[m[1]]) {
        key = m[1]
        const entry = lists[m[1]][i]
        if (entry) message = `${entry}: ${message}`
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
    type: [
      "type",
      "upstream",
      "redirect_to",
      "redirect_code",
      "root",
      "domains",
      "listen_port",
      "protocol",
      "stream_to",
    ],
    listenPort: ["listen_port"],
    protocol: ["protocol", "listen_port"],
    streamTo: ["stream_to"],
    domains: ["domains"],
    upstream: ["upstream"],
    redirectTo: ["redirect_to"],
    redirectCode: ["redirect_code"],
    root: ["root"],
    tls: ["tls.certificate", "tls.key"],
    certificate: ["tls.certificate"],
    key: ["tls.key"],
    forceCode: ["tls.force_code"],
    hsts: ["tls.hsts_preload", "tls.hsts_max_age"],
    hstsMaxAge: ["tls.hsts_max_age", "tls.hsts_preload"],
    hstsSubdomains: ["tls.hsts_preload"],
    hstsPreload: ["tls.hsts_preload"],
    http3: ["tls.http3"],
    profile: ["tls.profile"],
    clientCa: ["tls.client_ca", "tls.verify_client"],
    verifyClient: ["tls.verify_client"],
    allow: ["allow", "deny"],
    deny: ["deny"],
    defaultAccess: ["default_access"],
    countries: ["countries", "country_mode"],
    countryMode: ["country_mode"],
    connPerIp: ["rate_limit.conn_per_ip"],
    connTotal: ["rate_limit.conn_total"],
    downloadKbs: ["rate_limit.download_kbs"],
    uploadKbs: ["rate_limit.upload_kbs"],
    fullSpeedMb: ["rate_limit.full_speed_mb"],
    rateStatus: ["rate_limit.status"],
    rateExempt: ["rate_limit.exempt"],
    advanced: ["advanced"],
    maxBody: ["max_body_mb"],
    timeout: ["timeout_seconds"],
    connectTimeout: ["connect_timeout_seconds"],
    realIpFrom: ["real_ip.from"],
    realIpHeader: ["real_ip.header"],
    noBuffering: ["cache.enabled"],
    cache: ["cache.enabled"],
    cacheMinutes: ["cache.minutes"],
    cacheSizeMb: ["cache.max_size_mb"],
    assetDays: ["cache.asset_days"],
    skipPaths: ["cache.skip_paths"],
    skipCookies: ["cache.skip_cookies"],
    note: ["note"],
    custom: ["custom"],
  }
  for (const k of Object.keys(patch) as (keyof Draft)[]) {
    for (const f of map[k] ?? []) delete next[f]
  }
  if (patch.rateRules) {
    for (const f of Object.keys(next)) if (f.startsWith("rate.")) delete next[f]
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
