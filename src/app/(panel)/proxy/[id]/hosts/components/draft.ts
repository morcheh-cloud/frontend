import { splitList } from "@/app/(panel)/dns/components/fields"

export { splitList }

import type { HostType } from "@/app/(panel)/proxy/components/meta"
import type {
  Auth,
  Balance,
  Certificate,
  HeaderRule,
  HostConfig,
  HostTLS,
  PathRule,
  ProxyHost,
  ProxyHostBody,
  RateLimit,
  RateRule,
  RealIP,
  UpstreamServer,
} from "@/lib/services"

export type RedirectCode = 301 | 302 | 307 | 308
export type TlsProfile = NonNullable<HostTLS["profile"]>

export type HeaderDraft = {
  key: string
  to: HeaderRule["to"]
  name: string
  value: string
}

// How a cache rule keeps its answers: as the site does, for its own time,
// or never.
export type RuleKeep = "" | "time" | "never"

// A cache rule (Cache tab): a named part of the cache with its own time,
// cleared in one go.
export type CacheGroupDraft = {
  key: string
  name: string
  paths: string
  header: string
  value: string
  keep: RuleKeep
  minutes: string
}

// What of the query string tells kept answers apart.
export type CacheQuery = "" | "none" | "only"

export type PathMatch = "prefix" | "exact" | "regex"
export type PathAction = "proxy" | "redirect" | "static" | "deny" | "return"
export type DenyStatus = 403 | 404 | 410 | 444
// Who can open a path: "" = as the site's lists say.
export type PathAccess = "" | "only" | "except" | "everyone"

export type PathDraft = {
  key: string
  match: PathMatch
  path: string
  action: PathAction
  upstream: string
  websockets: boolean
  // Send /api/users on as /users.
  stripPrefix: boolean
  redirectTo: string
  redirectCode: RedirectCode
  root: string
  denyStatus: DenyStatus
  // return: the status and the text answered.
  status: string
  body: string
  // No sign-in on this path when the site asks for one.
  public: boolean
  // Sign-in here when the site asks on chosen paths only.
  login: boolean
  access: PathAccess
  // Addresses or ranges for access only / except, one per line.
  addresses: string
  // Raw directives for this path only.
  advanced: string
}

export type AuthMode = "" | "basic" | "forward"

export type AuthUserDraft = {
  key: string
  name: string
  // Blank keeps the saved password of `savedName`.
  password: string
  // The name it was saved under; empty for someone new (or a copy).
  savedName: string
}

export type ErrorPageDraft = {
  key: string
  codes: number[]
  title: string
  message: string
}

export type HardeningStatus = 403 | 404 | 444
export type NotFoundCode = 404 | 410 | 444

// Statuses that can have their own page, as the backend allows.
export const errorCodes = [
  400, 403, 404, 405, 408, 413, 429, 500, 502, 503, 504,
] as const
export const hardeningMethods = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "PROPFIND",
  "PROPPATCH",
] as const

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

// One server of a balanced site; the main one's address is the upstream.
export type PoolServerDraft = {
  key: string
  // Typed apart; joined into host:port when sent. An empty port = the main
  // server's.
  host: string
  port: string
  weight: string
  maxConns: string
  backup: boolean
  down: boolean
  note: string
}

export type LbMethod = Exclude<NonNullable<Balance["method"]>, "">
export type LbHashKey = "ip" | "uri" | "cookie" | "header" | "arg"

// When a site tries the next server; empty = error and timeout.
export const retryConditions = [
  "error",
  "timeout",
  "invalid_header",
  "http_500",
  "http_502",
  "http_503",
  "http_504",
  "http_403",
  "http_404",
  "http_429",
  "non_idempotent",
] as const

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
  // storage: a bucket (and folder) of an S3 storage from the Storage section.
  storageId: string
  bucket: string
  folder: string
  // Advanced: copy requests to a test server (proxy).
  mirrorTo: string
  mirrorBodies: boolean
  // Share of requests copied, 1–100.
  mirrorPercent: number
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
  ignoreUpstream: boolean
  // Always online: copies of pages handed out while the app is down (also
  // without the cache).
  onlineMode: OnlineMode
  onlineDays: string
  onlineWait: string
  onlineSlow: string
  onlineStatuses: number[]
  onlinePrivate: boolean
  skipPaths: string
  skipCookies: string
  cacheStatus: boolean
  cacheQuery: CacheQuery
  cacheParams: string
  cacheGroups: CacheGroupDraft[]
  varyDevice: boolean
  varyOs: boolean
  varyLanguage: boolean
  varyHeaders: string
  varyCookies: string
  // Login: basic (names and passwords) or forward (a sign-in service).
  authMode: AuthMode
  authRealm: string
  authUsers: AuthUserDraft[]
  authSkipAllowed: boolean
  // Ask only on the paths marked Sign in (Routing), not the whole site.
  authOnlyPaths: boolean
  fwdUrl: string
  fwdSignin: string
  fwdHeaders: string
  fwdPassPath: string
  // How an https upstream is reached.
  upVerify: boolean
  upName: string
  upCa: string
  upCert: string
  upKey: string
  // Pages: maintenance and the site's own error pages.
  maint: boolean
  maintAllow: string
  maintTitle: string
  maintMessage: string
  maintRetry: string
  errorPages: ErrorPageDraft[]
  interceptErrors: boolean
  // Hardening: requests no real visitor makes.
  hDotfiles: boolean
  hBackups: boolean
  hScanners: boolean
  hAiCrawlers: boolean
  hProbes: boolean
  hMethods: string[]
  hStatus: HardeningStatus
  requestId: boolean
  brotli: boolean
  // Load balancing (proxy, stream): more servers beside the main address.
  poolMain: PoolServerDraft
  poolServers: PoolServerDraft[]
  lbMethod: LbMethod
  lbHashKey: LbHashKey
  lbHashName: string
  lbConsistent: boolean
  lbRandomTwo: boolean
  lbKeepalive: string
  lbMaxFails: string
  lbFailTimeout: string
  // false = never try another server when one fails.
  lbRetry: boolean
  lbRetryOn: string[]
  lbTries: string
  lbRetryTimeout: string
  // 404 hosts: answer every name no other site has.
  catchAll: boolean
  notFoundCode: NotFoundCode
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

export const freshPath = (p: Partial<PathDraft> = {}): PathDraft => ({
  key: rowKey(),
  match: "prefix",
  path: "",
  action: "proxy",
  upstream: "",
  websockets: false,
  stripPrefix: false,
  redirectTo: "",
  redirectCode: 302,
  root: "",
  denyStatus: 403,
  status: "200",
  body: "",
  public: false,
  login: false,
  access: "",
  addresses: "",
  advanced: "",
  ...p,
})

export const freshUser = (): AuthUserDraft => ({
  key: rowKey(),
  name: "",
  password: "",
  savedName: "",
})

export const freshErrorPage = (codes: number[] = []): ErrorPageDraft => ({
  key: rowKey(),
  codes,
  title: "",
  message: "",
})

export const freshPoolServer = (
  p: Partial<PoolServerDraft> = {},
): PoolServerDraft => ({
  key: rowKey(),
  host: "",
  port: "",
  weight: "",
  maxConns: "",
  backup: false,
  down: false,
  note: "",
  ...p,
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
  storageId: "",
  bucket: "",
  folder: "",
  mirrorTo: "",
  mirrorBodies: true,
  mirrorPercent: 100,
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
  ignoreUpstream: false,
  onlineMode: "",
  onlineDays: "",
  onlineWait: "",
  onlineSlow: "",
  onlineStatuses: [],
  onlinePrivate: false,
  skipPaths: "",
  skipCookies: "",
  cacheStatus: true,
  cacheQuery: "",
  cacheParams: "",
  cacheGroups: [],
  varyDevice: false,
  varyOs: false,
  varyLanguage: false,
  varyHeaders: "",
  varyCookies: "",
  authMode: "",
  authRealm: "",
  authUsers: [],
  authSkipAllowed: false,
  authOnlyPaths: false,
  fwdUrl: "",
  fwdSignin: "",
  fwdHeaders: "",
  fwdPassPath: "",
  upVerify: false,
  upName: "",
  upCa: "",
  upCert: "",
  upKey: "",
  maint: false,
  maintAllow: "",
  maintTitle: "",
  maintMessage: "",
  maintRetry: "",
  errorPages: [],
  interceptErrors: false,
  hDotfiles: false,
  hBackups: false,
  hScanners: false,
  hAiCrawlers: false,
  hProbes: false,
  hMethods: [],
  hStatus: 404,
  requestId: false,
  brotli: false,
  poolMain: freshPoolServer(),
  poolServers: [],
  lbMethod: "round_robin",
  lbHashKey: "ip",
  lbHashName: "",
  lbConsistent: true,
  lbRandomTwo: false,
  lbKeepalive: "",
  lbMaxFails: "",
  lbFailTimeout: "",
  lbRetry: true,
  lbRetryOn: [],
  lbTries: "",
  lbRetryTimeout: "",
  catchAll: false,
  notFoundCode: 404,
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
    storageId: c.storage?.storage_id ?? "",
    bucket: c.storage?.bucket ?? "",
    folder: c.storage?.folder ?? "",
    mirrorTo: c.mirror?.to ?? "",
    mirrorBodies: !c.mirror?.skip_body,
    mirrorPercent: c.mirror?.percent || 100,
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
    paths: (c.paths ?? []).map(pathFromConfig),
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
    ...featuresFromConfig(c),
    ...balanceFromConfig(c.balance, base),
    note: h.note,
    enabled: h.enabled,
    custom: c.custom ?? "",
  }
}

const text = (n?: number) => (n ? String(n) : "")

function pathFromConfig(p: PathRule): PathDraft {
  const action = p.action || "proxy"
  return freshPath({
    match: p.match || "prefix",
    path: p.path,
    action,
    upstream: p.upstream ?? "",
    websockets: !!p.websockets,
    stripPrefix: !!p.strip_prefix,
    redirectTo: p.redirect_to ?? "",
    redirectCode: (p.redirect_code || 302) as RedirectCode,
    root: p.root ?? "",
    denyStatus: (action === "deny" && p.status ? p.status : 403) as DenyStatus,
    status: action === "return" ? text(p.status) || "200" : "200",
    body: p.body ?? "",
    public: !!p.public,
    login: !!p.login,
    access: p.access ?? "",
    addresses: (p.addresses ?? []).join("\n"),
    advanced: p.advanced ?? "",
  })
}

// Login, upstream TLS, pages, hardening and the small switches.
function featuresFromConfig(c: HostConfig) {
  const a = c.auth
  const f = a?.forward
  const u = c.upstream_tls
  const m = c.maintenance
  const hd = c.hardening
  return {
    authMode: (a?.mode || "") as AuthMode,
    authRealm: a?.realm ?? "",
    authUsers: (a?.users ?? []).map(
      (x): AuthUserDraft => ({
        key: rowKey(),
        name: x.name,
        password: "",
        savedName: x.name,
      }),
    ),
    authSkipAllowed: !!a?.skip_for_allowed,
    authOnlyPaths: !!a?.only_paths,
    fwdUrl: f?.url ?? "",
    fwdSignin: f?.signin_url ?? "",
    fwdHeaders: (f?.headers ?? []).join("\n"),
    fwdPassPath: f?.pass_path ?? "",
    upVerify: !!u?.verify,
    upName: u?.name ?? "",
    upCa: u?.ca ?? "",
    upCert: u?.certificate ?? "",
    upKey: u?.key ?? "",
    maint: !!m?.enabled,
    maintAllow: (m?.allow ?? []).join("\n"),
    maintTitle: m?.title ?? "",
    maintMessage: m?.message ?? "",
    maintRetry: text(m?.retry_minutes),
    errorPages: (c.error_pages ?? []).map(
      (p): ErrorPageDraft => ({
        key: rowKey(),
        codes: p.codes,
        title: p.title ?? "",
        message: p.message ?? "",
      }),
    ),
    interceptErrors: !!c.intercept_errors,
    hDotfiles: !!hd?.dotfiles,
    hBackups: !!hd?.backups,
    hScanners: !!hd?.scanners,
    hAiCrawlers: !!hd?.ai_crawlers,
    hProbes: !!hd?.probes,
    hMethods: hd?.methods ?? [],
    hStatus: (hd?.status || 404) as HardeningStatus,
    requestId: !!c.request_id,
    brotli: !!c.brotli,
    catchAll: !!c.catch_all,
    notFoundCode: (c.not_found_code || 404) as NotFoundCode,
  }
}

const serverFromConfig = (s?: UpstreamServer): PoolServerDraft =>
  freshPoolServer({
    ...splitHostPort(s?.address ?? ""),
    weight: text(s?.weight),
    maxConns: text(s?.max_conns),
    backup: !!s?.backup,
    down: !!s?.down,
    note: s?.note ?? "",
  })

// A site without balancing keeps the fresh defaults, so adding a server
// starts from them.
function balanceFromConfig(b: Balance | undefined, base: Draft) {
  if (!b?.servers?.length) return {}
  return {
    poolMain: serverFromConfig(b.main),
    poolServers: b.servers.map(serverFromConfig),
    lbMethod: (b.method || "round_robin") as LbMethod,
    lbHashKey: (b.hash_key || "ip") as LbHashKey,
    lbHashName: b.hash_name ?? "",
    lbConsistent: b.method === "hash" ? !!b.consistent : base.lbConsistent,
    lbRandomTwo: !!b.random_two,
    lbKeepalive: text(b.keepalive),
    lbMaxFails: text(b.max_fails),
    lbFailTimeout: text(b.fail_timeout),
    lbRetry: !b.no_retry,
    lbRetryOn: b.retry_on ?? [],
    lbTries: text(b.tries),
    lbRetryTimeout: text(b.retry_timeout),
  }
}

// A new site that starts as a copy of `h`: everything but its names, the
// hand-written file and the passwords (which never leave the server).
export function draftFromCopy(h: ProxyHost): Draft {
  const d = draftFromHost(h)
  return {
    ...d,
    domains: "",
    certificate: "",
    key: "",
    tls: false,
    catchAll: false,
    custom: "",
    enabled: true,
    authUsers: d.authUsers.map((u) => ({ ...u, savedName: "" })),
  }
}

// Always online as saved. A site from before it had "serve the last copy"
// on the cache, which now reads as Fast + backup.
function onlineFromConfig(c: HostConfig["cache"]) {
  const o = c?.always_online
  const legacy = !o?.mode && !!c?.enabled && !!c?.serve_stale
  return {
    onlineMode: (legacy ? "fast" : (o?.mode ?? "")) as OnlineMode,
    onlineDays: text(o?.keep_days),
    onlineWait: text(o?.wait_seconds),
    onlineSlow: text(o?.slow_seconds),
    onlineStatuses: legacy ? [500, 502, 503, 504] : (o?.statuses ?? []),
    onlinePrivate: !!o?.keep_private,
  }
}

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
    ...onlineFromConfig(c),
    ignoreUpstream: !!c?.ignore_upstream,
    skipPaths: (c?.skip_paths ?? []).join("\n"),
    skipCookies: (c?.skip_cookies ?? []).join("\n"),
    cacheStatus: on ? !!c?.status_header : base.cacheStatus,
    cacheQuery: (c?.query ?? "") as CacheQuery,
    cacheParams: (c?.query_params ?? []).join("\n"),
    cacheGroups: (c?.groups ?? []).map(
      (g): CacheGroupDraft => ({
        key: rowKey(),
        name: g.name,
        paths: (g.paths ?? []).join("\n"),
        header: g.header ?? "",
        value: g.value ?? "",
        keep: g.never ? "never" : g.minutes ? "time" : "",
        minutes: text(g.minutes),
      }),
    ),
    varyDevice: !!c?.vary_device,
    varyOs: !!c?.vary_os,
    varyLanguage: !!c?.vary_language,
    varyHeaders: (c?.vary_headers ?? []).join("\n"),
    varyCookies: (c?.vary_cookies ?? []).join("\n"),
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
  d.paths.filter(
    (p) => p.path.trim() || p.upstream.trim() || p.action !== "proxy",
  )
export const keptUsers = (d: Draft) =>
  d.authUsers.filter((u) => u.name.trim() || u.password)
const keptPages = (d: Draft) =>
  d.errorPages.filter(
    (p) => p.codes.length || p.title.trim() || p.message.trim(),
  )
// Servers with an address or a port; empty rows aren't sent.
export const keptServers = (d: Draft) =>
  typeUses(d.type).balance
    ? d.poolServers.filter((s) => s.host.trim() || s.port.trim())
    : []
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
// Types that serve pages: an app, a folder or a bucket.
export const serves = (t: Draft["type"]) =>
  t === "proxy" || t === "static" || t === "storage"

export const typeUses = (t: Draft["type"]) => ({
  domains: t !== "stream",
  tls: t !== "stream",
  headers: t !== "stream",
  paths: serves(t),
  maxBody: t !== "stream" && t !== "notfound" && t !== "storage",
  timeout: t === "proxy" || t === "stream" || t === "storage",
  countries: t !== "stream",
  rateLimit: serves(t) || t === "stream",
  gzip: serves(t),
  noBuffering: t === "proxy",
  connectTimeout: t === "proxy" || t === "stream" || t === "storage",
  realIp: t !== "stream",
  proxyProtocol: t === "stream",
  hideVersion: t !== "stream",
  browserCache: serves(t),
  proxyCache: t === "proxy",
  auth: serves(t),
  upstreamTls: t === "proxy",
  maintenance: t !== "stream" && t !== "notfound",
  errorPages: t !== "stream",
  interceptErrors: t === "proxy",
  hardening: t !== "stream",
  requestId: t !== "stream",
  brotli: serves(t),
  catchAll: t === "notfound",
  balance: t === "proxy" || t === "stream",
  mirror: t === "proxy",
})

// Methods that can't have a backup server.
export const noBackup = (m: LbMethod) =>
  m === "ip_hash" || m === "hash" || m === "random"

// The main address as host:port, the port filled in from the scheme, as
// the backend writes it in the upstream block.
export function mainServer(d: Draft) {
  if (d.type === "stream") return d.streamTo.trim()
  try {
    const u = new URL(d.upstream.trim())
    if (!u.hostname) return ""
    const port = u.port || (u.protocol === "https:" ? "443" : "80")
    return `${u.hostname}:${port}`
  } catch {
    return ""
  }
}

// host:port, [v6]:port or a bare host, taken apart.
export function splitHostPort(v: string) {
  const a = v.trim()
  const v6 = /^\[([^\]]*)\](?::(\d*))?$/.exec(a)
  if (v6) return { host: v6[1], port: v6[2] ?? "" }
  const m = /^([^:]*):(\d*)$/.exec(a)
  if (m) return { host: m[1], port: m[2] }
  return { host: a, port: "" }
}

export function joinHostPort(host: string, port: string) {
  const h = host.trim().replace(/^\[|\]$/g, "")
  const p = port.trim()
  const shown = h.includes(":") ? `[${h}]` : h
  return p ? `${shown}:${p}` : shown
}

// The main server's parts: the upstream URL (proxy) or Forward to (stream).
// While a site is balanced, server 1's row edits these.
export function mainParts(d: Draft) {
  if (d.type === "stream")
    return { ...splitHostPort(d.streamTo), scheme: "", rest: "" }
  return urlParts(d.upstream)
}

// scheme://host:port/rest taken apart; every part may be empty.
export function urlParts(text: string) {
  const m = /^([a-z][a-z0-9+.-]*:\/\/)?([^/?#]*)(.*)$/i.exec(text.trim())
  return {
    ...splitHostPort(m?.[2] ?? ""),
    scheme: m?.[1] ?? "",
    rest: m?.[3] ?? "",
  }
}

export function withMain(
  d: Draft,
  p: { host?: string; port?: string; scheme?: string; rest?: string },
): Partial<Draft> {
  const c = { ...mainParts(d) }
  for (const [k, v] of Object.entries(p))
    if (v !== undefined) c[k as keyof typeof c] = v
  const at = joinHostPort(c.host, c.port)
  if (d.type === "stream") return { streamTo: at }
  // Nothing typed but the usual scheme: still empty, so "required" holds.
  const scheme = c.scheme.toLowerCase() || "http://"
  if (!at && !c.rest && scheme === "http://") return { upstream: "" }
  return { upstream: `${scheme}${at}${c.rest}` }
}

// The main server's port, used by a row whose port is left empty.
export const mainPort = (d: Draft) => splitHostPort(mainServer(d)).port

// A row's address as sent.
export const serverAddress = (d: Draft, s: PoolServerDraft) =>
  joinHostPort(s.host, s.port.trim() || mainPort(d))

const toServer = (
  d: Draft,
  s: PoolServerDraft,
  main = false,
): UpstreamServer => ({
  address: main ? undefined : serverAddress(d, s).toLowerCase(),
  weight: number(s.weight),
  max_conns: number(s.maxConns),
  backup: s.backup || undefined,
  down: s.down || undefined,
  note: s.note.trim() || undefined,
})

// The balancing as sent; undefined with no other server.
export function toBalance(d: Draft): Balance | undefined {
  const servers = keptServers(d)
  if (!servers.length) return undefined
  const stream = d.type === "stream"
  const m = d.lbMethod
  const hash = m === "hash"
  const key = stream ? "ip" : d.lbHashKey
  const b: Balance = {
    servers: servers.map((s) => toServer(d, s)),
    method: m,
    hash_key: hash ? key : undefined,
    hash_name:
      hash && key !== "ip" && key !== "uri"
        ? d.lbHashName.trim() || undefined
        : undefined,
    consistent: (hash && d.lbConsistent) || undefined,
    random_two: (m === "random" && d.lbRandomTwo) || undefined,
    keepalive: stream ? undefined : number(d.lbKeepalive),
    max_fails: number(d.lbMaxFails),
    fail_timeout: number(d.lbFailTimeout),
  }
  const main = toServer(d, d.poolMain, true)
  if (Object.values(main).some(Boolean)) b.main = main
  if (!d.lbRetry) b.no_retry = true
  else {
    if (!stream && d.lbRetryOn.length) b.retry_on = d.lbRetryOn
    b.tries = number(d.lbTries)
    b.retry_timeout = number(d.lbRetryTimeout)
  }
  return b
}

// An https address among the site's upstream and its paths'.
export const httpsUpstream = (d: Draft) =>
  d.type === "proxy" &&
  [d.upstream, ...d.paths.map((p) => (p.action === "proxy" ? p.upstream : ""))]
    .map((x) => x.trim().toLowerCase())
    .some((x) => x.startsWith("https://"))

export const hardeningOn = (d: Draft) =>
  d.hDotfiles ||
  d.hBackups ||
  d.hScanners ||
  d.hAiCrawlers ||
  d.hProbes ||
  d.hMethods.length > 0

export function toAuth(d: Draft): Auth | undefined {
  if (!typeUses(d.type).auth || !d.authMode) return undefined
  const skip = d.authSkipAllowed && splitList(d.allow).length > 0
  if (d.authMode === "basic") {
    return {
      mode: "basic",
      realm: d.authRealm.trim() || undefined,
      users: keptUsers(d).map((u) => ({
        name: u.name.trim(),
        password: u.password || undefined,
      })),
      skip_for_allowed: skip || undefined,
      only_paths: d.authOnlyPaths || undefined,
    }
  }
  const headers = splitList(d.fwdHeaders)
  return {
    mode: "forward",
    forward: {
      url: d.fwdUrl.trim(),
      signin_url: d.fwdSignin.trim() || undefined,
      headers: headers.length ? headers : undefined,
      pass_path: d.fwdPassPath.trim() || undefined,
    },
    skip_for_allowed: skip || undefined,
    only_paths: d.authOnlyPaths || undefined,
  }
}

function toPath(p: PathDraft): PathRule {
  const r: PathRule = {
    path: p.path.trim(),
    match: p.match === "prefix" ? undefined : p.match,
    action: p.action === "proxy" ? undefined : p.action,
    advanced: p.advanced.trim() || undefined,
    public: p.public || undefined,
  }
  switch (p.action) {
    case "proxy":
      r.upstream = p.upstream.trim()
      r.websockets = p.websockets || undefined
      if (p.match === "prefix") r.strip_prefix = p.stripPrefix || undefined
      break
    case "redirect":
      r.redirect_to = p.redirectTo.trim()
      r.redirect_code = p.redirectCode
      break
    case "static":
      r.root = p.root.trim()
      break
    case "deny":
      r.status = p.denyStatus
      break
    case "return":
      r.status = Number(p.status.trim()) || 0
      r.body = p.body || undefined
  }
  if (guarded(p)) {
    r.login = p.login || undefined
    if (p.access) r.access = p.access
    if (p.access === "only" || p.access === "except") {
      const list = splitList(p.addresses)
      if (list.length) r.addresses = list
    }
  }
  return r
}

// Paths whose visitors can be checked: redirects, blocks and fixed answers
// go out before any address check or sign-in would run.
export const guarded = (p: PathDraft) =>
  p.action === "proxy" || p.action === "static"

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
      ignore_upstream: d.ignoreUpstream || undefined,
      skip_paths: listOrNone(d.skipPaths),
      skip_cookies: listOrNone(d.skipCookies),
      status_header: d.cacheStatus || undefined,
      query: d.cacheQuery || undefined,
      query_params:
        d.cacheQuery === "only" ? listOrNone(d.cacheParams) : undefined,
      groups: keptGroups(d).length
        ? keptGroups(d).map((g) => ({
            name: g.name.trim(),
            paths: listOrNone(g.paths),
            header: g.header.trim() || undefined,
            value: g.value.trim() || undefined,
            minutes: g.keep === "time" ? number(g.minutes) : undefined,
            never: g.keep === "never" || undefined,
          }))
        : undefined,
      vary_device: d.varyDevice || undefined,
      vary_os: d.varyOs || undefined,
      vary_language: d.varyLanguage || undefined,
      vary_headers: listOrNone(d.varyHeaders),
      vary_cookies: listOrNone(d.varyCookies),
    })
  }
  if (uses.proxyCache && d.onlineMode) {
    c.always_online = {
      mode: d.onlineMode,
      keep_days: number(d.onlineDays),
      wait_seconds: number(d.onlineWait),
      slow_seconds: number(d.onlineSlow),
      statuses: d.onlineStatuses.length
        ? onlineStatuses.filter((s) => d.onlineStatuses.includes(s))
        : undefined,
      keep_private: (!d.cache && d.onlinePrivate) || undefined,
    }
    // Without the cache, what's never kept still applies to the copies.
    if (!d.cache)
      Object.assign(c, {
        skip_paths: listOrNone(d.skipPaths),
        skip_cookies: listOrNone(d.skipCookies),
      })
  }
  return c.asset_days || c.pages_fresh || c.enabled || c.always_online
    ? c
    : undefined
}

// Always online: "" = off; backup = ask the app, copies only when it fails;
// fast = answer from the copy and refresh it behind; copies = never ask.
export type OnlineMode = "" | "backup" | "fast" | "copies"
// App answers that may count as down, in the backend's order.
export const onlineStatuses = [500, 502, 503, 504, 429]
// What turning Always online on starts with.
export const onlineStart = (): Partial<Draft> => ({
  onlineMode: "backup",
  onlineStatuses: [502, 503, 504],
})

// Cache rules worth sending: a row left fully blank is dropped.
export const keptGroups = (d: Draft) =>
  d.cacheGroups.filter(
    (g) => g.name.trim() || g.paths.trim() || g.header.trim(),
  )

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
  } else if (d.type === "storage") {
    c.storage = {
      storage_id: d.storageId,
      bucket: d.bucket.trim(),
      folder: d.folder.trim() || undefined,
    }
    c.spa = d.spa
    c.timeout_seconds = number(d.timeout)
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
    value: to === "hide" ? "" : value.trim(),
  }))
  if (headers.length && uses.headers) c.headers = headers
  if (uses.paths) {
    const paths = keptPaths(d).map(toPath)
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
  addFeatures(c, d)
  if (d.custom.trim()) c.custom = d.custom.trim()
  return c
}

function addFeatures(c: HostConfig, d: Draft) {
  const uses = typeUses(d.type)
  const auth = toAuth(d)
  if (auth) c.auth = auth
  if (uses.upstreamTls && httpsUpstream(d)) {
    const u = {
      verify: d.upVerify || undefined,
      ca: d.upVerify ? d.upCa.trim() || undefined : undefined,
      name: d.upName.trim() || undefined,
      certificate: d.upCert.trim() || undefined,
      key: d.upKey.trim() || undefined,
    }
    if (Object.values(u).some(Boolean)) c.upstream_tls = u
  }
  if (uses.maintenance) {
    const allow = splitList(d.maintAllow)
    const m = {
      enabled: d.maint || undefined,
      allow: allow.length ? allow : undefined,
      title: d.maintTitle.trim() || undefined,
      message: d.maintMessage.trim() || undefined,
      retry_minutes: number(d.maintRetry),
    }
    // Kept while off, so turning it on again finds the same page.
    if (Object.values(m).some(Boolean)) c.maintenance = m
  }
  if (uses.errorPages) {
    const pages = keptPages(d).map((p) => ({
      codes: p.codes,
      title: p.title.trim() || undefined,
      message: p.message.trim() || undefined,
    }))
    if (pages.length) {
      c.error_pages = pages
      if (uses.interceptErrors && d.interceptErrors) c.intercept_errors = true
    }
  }
  if (uses.hardening && hardeningOn(d)) {
    c.hardening = {
      dotfiles: d.hDotfiles || undefined,
      backups: d.hBackups || undefined,
      scanners: d.hScanners || undefined,
      ai_crawlers: d.hAiCrawlers || undefined,
      probes: d.hProbes || undefined,
      methods: d.hMethods.length ? d.hMethods : undefined,
      status: d.hStatus,
    }
  }
  if (uses.requestId && d.requestId) c.request_id = true
  if (uses.brotli && d.brotli) c.brotli = true
  if (uses.mirror && d.mirrorTo.trim()) {
    c.mirror = {
      to: d.mirrorTo.trim(),
      skip_body: !d.mirrorBodies || undefined,
      percent: d.mirrorPercent < 100 ? d.mirrorPercent : undefined,
    }
  }
  if (uses.catchAll) {
    if (d.catchAll) c.catch_all = true
    c.not_found_code = d.notFoundCode
  }
  const balance = toBalance(d)
  if (balance) c.balance = balance
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
    "cache.query_params": splitList(d.cacheParams),
    "cache.vary_headers": splitList(d.varyHeaders),
    "cache.vary_cookies": splitList(d.varyCookies),
    "auth.forward.headers": splitList(d.fwdHeaders),
    "maintenance.allow": splitList(d.maintAllow),
  }
  const rules = keptRules(d)
  const headers = keptHeaders(d)
  const paths = keptPaths(d)
  const users = keptUsers(d)
  const pages = keptPages(d)
  const servers = keptServers(d)
  const groups = keptGroups(d)
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
    const group = /^cache\.groups\[(\d+)\]\.(\w+)(?:\[(\d+)\])?/.exec(f)
    if (group) {
      const g = groups[Number(group[1])]
      const entry = group[3] ? splitList(g?.paths ?? "")[Number(group[3])] : ""
      out[`cache.groups.${g?.key ?? group[1]}.${group[2]}`] ??= entry
        ? `${entry}: ${p.message}`
        : p.message
      continue
    }
    const server = /^balance\.servers\[(\d+)\](?:\.(\w+))?/.exec(f)
    if (server) {
      const k = servers[Number(server[1])]?.key ?? server[1]
      out[`pool.${k}.${server[2] ?? "address"}`] ??= p.message
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
        const a = /^paths\[\d+\]\.addresses\[(\d+)\]/.exec(f)
        const entry = a && splitList(paths[i]?.addresses ?? "")[Number(a[1])]
        if (entry) message = `${entry}: ${message}`
      } else if (m[1] === "auth.users") {
        key = `auth.users.${users[i]?.key ?? i}`
      } else if (m[1] === "error_pages") {
        key = `error_pages.${pages[i]?.key ?? i}`
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
    storageId: ["storage.storage_id", "storage.bucket"],
    bucket: ["storage.bucket"],
    folder: ["storage.folder"],
    mirrorTo: ["mirror.to"],
    mirrorPercent: ["mirror.percent"],
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
    onlineMode: ["cache.always_online.mode"],
    onlineDays: ["cache.always_online.keep_days"],
    onlineWait: ["cache.always_online.wait_seconds"],
    onlineSlow: ["cache.always_online.slow_seconds"],
    onlineStatuses: ["cache.always_online.statuses"],
    cacheQuery: ["cache.query_params"],
    cacheParams: ["cache.query_params"],
    varyHeaders: ["cache.vary_headers"],
    varyCookies: ["cache.vary_cookies"],
    authMode: ["auth.mode", "auth.users"],
    authRealm: ["auth.realm"],
    fwdUrl: ["auth.forward.url", "auth.mode"],
    fwdSignin: ["auth.forward.signin_url"],
    fwdHeaders: ["auth.forward.headers"],
    fwdPassPath: ["auth.forward.pass_path"],
    authOnlyPaths: ["auth.only_paths"],
    upName: ["upstream_tls.name"],
    upCa: ["upstream_tls.ca"],
    upCert: ["upstream_tls.certificate", "upstream_tls.key"],
    upKey: ["upstream_tls.key"],
    maintAllow: ["maintenance.allow"],
    maintRetry: ["maintenance.retry_minutes"],
    hMethods: ["hardening.methods"],
    hStatus: ["hardening.status"],
    poolMain: ["balance.main.backup", "balance.servers"],
    poolServers: ["balance.servers"],
    lbMethod: [
      "balance.method",
      "balance.hash_key",
      "balance.hash_name",
      "balance.main.backup",
    ],
    lbHashKey: ["balance.hash_key", "balance.hash_name"],
    lbHashName: ["balance.hash_name"],
    lbKeepalive: ["balance.keepalive"],
    lbMaxFails: ["balance.max_fails"],
    lbFailTimeout: ["balance.fail_timeout"],
    lbRetry: ["balance.retry_on", "balance.tries", "balance.retry_timeout"],
    lbRetryOn: ["balance.retry_on"],
    lbTries: ["balance.tries"],
    lbRetryTimeout: ["balance.retry_timeout"],
    catchAll: ["catch_all", "domains"],
    notFoundCode: ["not_found_code"],
    note: ["note"],
    custom: ["custom"],
  }
  for (const k of Object.keys(patch) as (keyof Draft)[]) {
    for (const f of map[k] ?? []) delete next[f]
  }
  const rows: [keyof Draft, string][] = [
    ["rateRules", "rate."],
    ["authUsers", "auth.users"],
    ["errorPages", "error_pages"],
    ["paths", "paths."],
    ["paths", "auth.only_paths"],
    ["headers", "headers."],
    ["poolServers", "pool."],
    ["lbMethod", "pool."],
    ["cacheGroups", "cache.groups."],
  ]
  for (const [k, prefix] of rows) {
    if (!patch[k]) continue
    for (const f of Object.keys(next)) if (f.startsWith(prefix)) delete next[f]
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
