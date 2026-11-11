import type { RedirectRule, RedirectWhen } from "@/lib/services"
import { rowKey } from "./draft"

// Redirect rules of a site: the draft row, the checks the backend makes
// (proxy/redirects.go), the import parser, the address tester and the
// chain finder. nginx matches like this: exact addresses (case ignored)
// first, an exact rule with ?query before one without; then starts-with and
// pattern rules in list order.

export type RedirectMatch = "exact" | "prefix" | "regex"
export type RuleCode = 301 | 302 | 307 | 308 | 410

export type RedirectDraft = {
  key: string
  from: string
  match: RedirectMatch
  to: string
  code: RuleCode
  keepQuery: boolean
  off: boolean
  note: string
  when: When
}

// ---- Conditions ----

// A rule with conditions only redirects visitors who meet all of them; it's
// checked before the plain rules, in list order (proxy/redirects.go).
export type Device = "phone" | "tablet" | "desktop"
export const deviceList: readonly Device[] = ["phone", "tablet", "desktop"]
export const deviceLabels: Record<Device, string> = {
  phone: "Phones",
  tablet: "Tablets",
  desktop: "Computers",
}

export type When = {
  countries: string[]
  languages: string[]
  devices: Device[]
  // YYYY-MM-DDTHH:MM in the proxy server's time; "" = open.
  from: string
  until: string
}

export const noWhen = (): When => ({
  countries: [],
  languages: [],
  devices: [],
  from: "",
  until: "",
})

export const hasWhen = (w: When) =>
  w.countries.length > 0 ||
  w.languages.length > 0 ||
  w.devices.length > 0 ||
  !!w.from.trim() ||
  !!w.until.trim()

const tidyList = (list: string[], upper: boolean) => [
  ...new Set(
    list
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => (upper ? x.toUpperCase() : x.toLowerCase())),
  ),
]

// As the backend's normalizeWhen.
export function tidyWhen(w: When): When {
  return {
    countries: tidyList(w.countries, true),
    languages: tidyList(w.languages, false),
    devices: tidyList(w.devices, false) as Device[],
    from: w.from.trim(),
    until: w.until.trim(),
  }
}

function whenToApi(w: When): RedirectWhen | undefined {
  const t = tidyWhen(w)
  if (!hasWhen(t)) return
  return {
    countries: t.countries.length ? t.countries : undefined,
    languages: t.languages.length ? t.languages : undefined,
    devices: t.devices.length ? t.devices : undefined,
    from: t.from || undefined,
    until: t.until || undefined,
  }
}

const whenTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

// As the backend's validateWhen; "" = fine.
export function checkWhen(w: When) {
  const t = tidyWhen(w)
  const country = t.countries.find((c) => !/^[A-Z]{2}$/.test(c))
  if (country) return `${country}: use a two-letter country code, like DE.`
  const lang = t.languages.find((l) => !/^[a-z]{2,3}$/.test(l))
  if (lang) return `${lang}: use a two- or three-letter language code, like fa.`
  if (t.devices.length === deviceList.length)
    return "Every device is picked; leave them all off instead."
  if (t.from && !whenTime.test(t.from))
    return "Use a start like 2026-12-01T09:00."
  if (t.until && !whenTime.test(t.until))
    return "Use an end like 2026-12-31T23:59."
  if (t.from && t.until && t.until <= t.from)
    return "The end has to come after the start."
  return ""
}

const shortDate = (s: string) => {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// One line for a list row: "DE, AT · Phones · fa · Dec 1 – Dec 31".
export function whenText(w: When) {
  const parts: string[] = []
  if (w.countries.length)
    parts.push(
      w.countries.length > 3
        ? `${w.countries.slice(0, 3).join(", ")} +${w.countries.length - 3}`
        : w.countries.join(", "),
    )
  if (w.devices.length)
    parts.push(w.devices.map((d) => deviceLabels[d]).join(", "))
  if (w.languages.length) parts.push(w.languages.join(", "))
  if (w.from && w.until)
    parts.push(`${shortDate(w.from)} – ${shortDate(w.until)}`)
  else if (w.from) parts.push(`from ${shortDate(w.from)}`)
  else if (w.until) parts.push(`until ${shortDate(w.until)}`)
  return parts.join(" · ")
}

// What a visitor brings to a conditional rule (the tester's fields). time
// is YYYY-MM-DDTHH:MM like the rule's window.
export type Visitor = {
  country: string
  language: string
  device: Device
  time: string
}

export const localTime = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function whenHolds(w: When, v: Visitor) {
  const t = tidyWhen(w)
  if (t.countries.length && !t.countries.includes(v.country.toUpperCase()))
    return false
  if (t.devices.length && !t.devices.includes(v.device)) return false
  if (
    t.languages.length &&
    !t.languages.includes(v.language.trim().toLowerCase().slice(0, 3))
  )
    return false
  if (t.from && v.time < t.from) return false
  if (t.until && v.time >= t.until) return false
  return true
}

export const MAX_REDIRECTS = 5000

export const redirectCodes: readonly RuleCode[] = [301, 302, 307, 308, 410]

export const codeMeta: Record<RuleCode, { label: string; hint: string }> = {
  301: {
    label: "301 Moved",
    hint: "For good. Browsers and search engines remember the new address.",
  },
  302: {
    label: "302 Found",
    hint: "For now. Nothing is remembered; use while testing.",
  },
  307: {
    label: "307 Temporary",
    hint: "For now, and forms are sent on as they were (POST stays POST).",
  },
  308: {
    label: "308 Permanent",
    hint: "For good, and forms are sent on as they were (POST stays POST).",
  },
  410: {
    label: "410 Gone",
    hint: "No redirect: the page was removed on purpose. Search engines drop it sooner than a 404.",
  },
}

export const matchMeta: Record<
  RedirectMatch,
  { label: string; short: string; hint: string; placeholder: string }
> = {
  exact: {
    label: "Exact address",
    short: "Exact",
    hint: "Just this address. With ?query it must match that query too.",
    placeholder: "/old-page",
  },
  prefix: {
    label: "Starts with",
    short: "Starts with",
    hint: "The address and everything under it; the rest is added to the target (/blog/a → /news/a).",
    placeholder: "/blog",
  },
  regex: {
    label: "Pattern",
    short: "Pattern",
    hint: "A regular expression on the path; use $1 … $9 in the target.",
    placeholder: "^/item/(\\d+)\\.html$",
  },
}

export const freshRedirect = (
  p: Partial<RedirectDraft> = {},
): RedirectDraft => ({
  key: rowKey(),
  from: "",
  match: "exact",
  to: "",
  code: 301,
  keepQuery: false,
  off: false,
  note: "",
  when: noWhen(),
  ...p,
})

export const redirectFromRule = (r: RedirectRule): RedirectDraft =>
  freshRedirect({
    from: r.from,
    match: r.match || "exact",
    to: r.to ?? "",
    code: (r.code || 301) as RuleCode,
    keepQuery: !!r.keep_query,
    off: !!r.off,
    note: r.note ?? "",
    when: {
      countries: r.when?.countries ?? [],
      languages: r.when?.languages ?? [],
      devices: (r.when?.devices ?? []) as Device[],
      from: r.when?.from ?? "",
      until: r.when?.until ?? "",
    },
  })

export const keptRedirects = (rows: RedirectDraft[]) =>
  rows.filter((r) => r.from.trim() || r.to.trim())

export function redirectToRule(
  r: RedirectDraft,
  domains: string[],
): RedirectRule {
  const gone = r.code === 410
  const from = r.from.trim()
  return {
    from: r.match === "regex" ? from : sitePath(from, domains).path,
    match: r.match === "exact" ? undefined : r.match,
    to: gone ? undefined : r.to.trim() || undefined,
    code: r.code === 301 ? undefined : r.code,
    keep_query: (!gone && r.keepQuery) || undefined,
    off: r.off || undefined,
    note: r.note.trim().replace(/\s+/g, " ") || undefined,
    when: whenToApi(r.when),
  }
}

// ---- Addresses ----

// A site's names answer host (wildcards one level or more down, as the
// backend's ownsHost).
export function ownsHost(domains: string[], host: string) {
  const h = host.toLowerCase()
  return domains.some(
    (d) => d === h || (d.startsWith("*.") && h.endsWith(d.slice(1))),
  )
}

const hasScheme = (s: string) => /^(https?:)?\/\//i.test(s)

// An address on this site as its path (+ ?query), %XX decoded in the path
// (nginx matches the decoded one). A full address of another host comes back
// as its path too, with `host` set so the caller can warn.
export function sitePath(
  input: string,
  domains: string[],
): { path: string; host?: string } {
  let s = input.trim()
  let host: string | undefined
  if (hasScheme(s)) {
    try {
      const u = new URL(s.startsWith("//") ? `https:${s}` : s)
      if (!ownsHost(domains, u.hostname)) host = u.hostname
      s = (u.pathname || "/") + u.search
    } catch {
      return { path: s }
    }
  }
  if (!s.startsWith("/")) s = `/${s}`
  const q = s.indexOf("?")
  let path = q < 0 ? s : s.slice(0, q)
  const query = q < 0 ? "" : s.slice(q)
  try {
    const p = decodeURIComponent(path)
    if (!/[\0\r\n?]/.test(p)) path = p
  } catch {}
  return { path: path + query, host }
}

// How an exact address compares: case ignored, and unless strict, without a
// trailing slash (an exact rule then takes both).
export function slashKey(from: string, strict: boolean) {
  let k = from.toLowerCase()
  if (!strict && k.length > 1 && !k.includes("?")) {
    k = k.replace(/\/+$/, "") || "/"
  }
  return k
}

// ---- Checks (as the backend's validateRedirects) ----

const badTarget = /[\s"'`\\{};]/
const capture = /\$[1-9]/g
const nginxEsc = /\\[\\"'ntr]/

export function checkPattern(s: string) {
  if (!s) return "Enter a pattern, like ^/item/(\\d+)$."
  if (/["\s]/.test(s)) return "Quotes and spaces aren't allowed."
  if (nginxEsc.test(s) || s.endsWith("\\"))
    return "\\\\ \\\" \\' \\n \\t \\r and a final \\ aren't allowed."
  try {
    new RegExp(jsPattern(s).source)
  } catch (e) {
    return `Not a valid pattern: ${(e as Error).message.replace(/^Invalid regular expression: /, "")}`
  }
  return ""
}

function checkFrom(r: RedirectDraft) {
  const s = r.from.trim()
  if (r.match === "regex") return checkPattern(s)
  if (!s) return "Enter the old address, like /old-page."
  if (/["\\\0\r\n\t]/.test(s))
    return "Quotes, \\ and line breaks aren't allowed."
  const path = s.startsWith("/") ? s : `/${s}`
  if (path.toLowerCase().startsWith("/.well-known/acme-challenge/"))
    return "Certificate checks use this path; it can't be redirected."
  if (r.match === "prefix" && path.includes("?"))
    return "A starts-with rule can't name a query; use an exact rule."
  return ""
}

function checkTo(r: RedirectDraft) {
  const t = r.to.trim()
  if (r.code === 410) return ""
  if (!t) return "Enter where it goes, like /new-page or https://example.com/."
  if (badTarget.test(t)) return "Spaces, quotes, \\ ; { } aren't allowed."
  if (t.replace(capture, "").includes("$"))
    return "$ is only allowed as $1 to $9."
  if (capture.test(t) && r.match !== "regex")
    return "$1 to $9 only work with a pattern."
  capture.lastIndex = 0
  if (r.match === "prefix" && t.includes("?"))
    return "A starts-with rule adds the rest of the path to the target, so it can't have a query."
  if (t.startsWith("/"))
    return t.startsWith("//")
      ? "Use a full address (https://…) or a path starting with one /."
      : ""
  try {
    const u = new URL(t.replace(capture, "1"))
    if (!/^https?:$/.test(u.protocol) || !u.host) throw new Error()
    if (u.username || u.password)
      return "Leave the user name and password out of the address."
  } catch {
    return "Use a path like /new-page or a full address starting with http:// or https://."
  }
  return ""
}

export type RuleProblem = { field: "from" | "to" | "when"; message: string }

// Problems the backend would refuse, by row key.
export function checkRedirects(
  rows: RedirectDraft[],
  domains: string[],
  strict: boolean,
) {
  const out = new Map<string, RuleProblem>()
  const seen = new Set<string>()
  for (const r of rows) {
    const from = checkFrom(r)
    if (from) {
      out.set(r.key, { field: "from", message: from })
      continue
    }
    const to = checkTo(r)
    if (to) {
      out.set(r.key, { field: "to", message: to })
      continue
    }
    const path =
      r.match === "regex" ? r.from.trim() : sitePath(r.from, domains).path
    const conditional = hasWhen(r.when)
    if (conditional) {
      if (r.match === "exact" && path.includes("?")) {
        out.set(r.key, {
          field: "from",
          message:
            "A rule with conditions can't name a query; leave the ?… out.",
        })
        continue
      }
      const when = checkWhen(r.when)
      if (when) {
        out.set(r.key, { field: "when", message: when })
        continue
      }
    }
    if (r.match === "exact" && r.code !== 410 && r.to.trim().startsWith("/")) {
      const to = path.includes("?") ? r.to.trim() : r.to.trim().split("?")[0]
      if (slashKey(to, strict) === slashKey(path, strict)) {
        out.set(r.key, {
          field: "to",
          message: "This sends the address to itself.",
        })
        continue
      }
    }
    if (r.off || conditional) continue
    const key = `${r.match} ${r.match === "exact" ? slashKey(path, strict) : path}`
    if (seen.has(key))
      out.set(r.key, {
        field: "from",
        message: "This address is listed twice.",
      })
    seen.add(key)
  }
  return out
}

// ---- Matching (what nginx would do) ----

// A PCRE pattern as a JavaScript one: (?i) at the start becomes the flag.
export function jsPattern(s: string, ignoreCase = false) {
  let src = s
  let flags = ignoreCase ? "i" : ""
  if (src.startsWith("(?i)")) {
    src = src.slice(4)
    flags = "i"
  }
  // Named groups (?P<name>…) are PCRE's older spelling.
  src = src.replace(/\(\?P</g, "(?<")
  return new RegExp(src, flags)
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

type Compiled = {
  exact: Map<string, RedirectDraft>
  query: Map<string, RedirectDraft>
  patterns: { rule: RedirectDraft; re: RegExp }[]
  // Rules with conditions, checked first in list order.
  conditional: { rule: RedirectDraft; re: RegExp }[]
}

// The path part of a rule as a regex (conditional rules are all matched by
// one; nginx/redirects.go conditionPath).
function pathRegex(r: RedirectDraft, domains: string[], strict: boolean) {
  if (r.match === "regex") return jsPattern(r.from.trim())
  const path = sitePath(r.from, domains).path
  if (r.match === "prefix") {
    const from = path.replace(/\/+$/, "") || "/"
    return from === "/"
      ? /^\/(.*)$/i
      : new RegExp(`^${escapeRe(from)}(?:/(.*))?$`, "i")
  }
  if (path === "/") return /^\/$/
  if (strict) return new RegExp(`^${escapeRe(path)}$`, "i")
  return new RegExp(`^${escapeRe(path.replace(/\/+$/, ""))}/?$`, "i")
}

export function compileRedirects(
  rows: RedirectDraft[],
  domains: string[],
  strict: boolean,
): Compiled {
  const exact = new Map<string, RedirectDraft>()
  const query = new Map<string, RedirectDraft>()
  const patterns: Compiled["patterns"] = []
  const conditional: Compiled["conditional"] = []
  for (const r of rows) {
    if (r.off || !r.from.trim()) continue
    if (hasWhen(r.when)) {
      try {
        conditional.push({ rule: r, re: pathRegex(r, domains, strict) })
      } catch {}
      continue
    }
    if (r.match === "exact") {
      const path = sitePath(r.from, domains).path
      const map = path.includes("?") ? query : exact
      const k = path.includes("?") ? path.toLowerCase() : slashKey(path, strict)
      if (!map.has(k)) map.set(k, r)
      continue
    }
    try {
      if (r.match === "prefix") {
        const from = sitePath(r.from, domains).path.replace(/\/+$/, "") || "/"
        const re =
          from === "/"
            ? /^\/(.*)$/i
            : new RegExp(`^${escapeRe(from)}(?:/(.*))?$`, "i")
        patterns.push({ rule: r, re })
      } else {
        patterns.push({ rule: r, re: jsPattern(r.from.trim()) })
      }
    } catch {}
  }
  return { exact, query, patterns, conditional }
}

export type MatchResult = {
  rule: RedirectDraft
  code: RuleCode
  // Empty for 410.
  target: string
}

// Who asks, for rules with conditions: a visitor's facts, "any" = as if
// every condition held, none = only the plain rules.
export type Asker = Visitor | "any" | undefined

// The target a rule gives for a path its regex matched.
function resolve(rule: RedirectDraft, m: RegExpExecArray) {
  const to = rule.to.trim()
  if (rule.match === "prefix")
    return (to.endsWith("/") ? to : `${to}/`) + (m[1] ?? "")
  if (rule.match === "regex")
    return to.replace(/\$([1-9])/g, (_, n) => m[Number(n)] ?? "")
  return to
}

// The rule an address meets, and where it sends it.
export function matchAddress(
  c: Compiled,
  address: string,
  domains: string[],
  strict: boolean,
  asker?: Asker,
): MatchResult | undefined {
  const full = sitePath(address, domains).path
  const q = full.indexOf("?")
  const path = q < 0 ? full : full.slice(0, q)
  const args = q < 0 ? "" : full.slice(q + 1)
  if (path.toLowerCase().startsWith("/.well-known/acme-challenge/")) return
  const done = (rule: RedirectDraft, to: string): MatchResult => {
    if (rule.code === 410) return { rule, code: 410, target: "" }
    let target = to
    if (rule.keepQuery && args)
      target += (target.includes("?") ? "&" : "?") + args
    return { rule, code: rule.code, target }
  }
  if (asker)
    for (const { rule, re } of c.conditional) {
      if (asker !== "any" && !whenHolds(rule.when, asker)) continue
      const m = re.exec(path)
      if (m) return done(rule, resolve(rule, m))
    }
  const byQuery = q >= 0 && c.query.get(full.toLowerCase())
  if (byQuery) return done(byQuery, byQuery.to.trim())
  const byPath = c.exact.get(slashKey(path, strict))
  if (byPath) return done(byPath, byPath.to.trim())
  for (const { rule, re } of c.patterns) {
    const m = re.exec(path)
    if (m) return done(rule, resolve(rule, m))
  }
}

// Every rule an address could meet, in the order nginx tries them: the
// conditional ones (whatever the visitor), then the plain one.
function candidates(
  c: Compiled,
  address: string,
  domains: string[],
  strict: boolean,
) {
  const path = sitePath(address, domains).path.split("?")[0]
  const out: RedirectDraft[] = []
  for (const { rule, re } of c.conditional) if (re.test(path)) out.push(rule)
  const plain = matchAddress(c, address, domains, strict)
  if (plain) out.push(plain.rule)
  return out
}

// The hops an address takes through the rules, up to a few; `loop` when it
// comes back to one it passed.
export function followAddress(
  c: Compiled,
  address: string,
  domains: string[],
  strict: boolean,
  asker?: Asker,
) {
  const hops: MatchResult[] = []
  const seen = new Set<string>()
  let at = address
  for (let i = 0; i < 8; i++) {
    const own = !hasScheme(at) || ownsHost(domains, hostOf(at))
    if (!own) break
    const key = sitePath(at, domains).path.toLowerCase()
    if (seen.has(key)) return { hops, loop: true }
    seen.add(key)
    const m = matchAddress(c, at, domains, strict, asker)
    if (!m) break
    hops.push(m)
    if (m.code === 410) break
    at = m.target
  }
  return { hops, loop: false }
}

const hostOf = (s: string) => {
  try {
    return new URL(s.startsWith("//") ? `https:${s}` : s).hostname
  } catch {
    return ""
  }
}

// Rules whose target meets another rule: a chain (a visitor is redirected
// twice) or a loop (never arrives). Exact and starts-with rules with a plain
// target only; patterns would need an example address.
export function findChains(
  rows: RedirectDraft[],
  domains: string[],
  strict: boolean,
) {
  const c = compileRedirects(rows, domains, strict)
  const out = new Map<string, { loop: boolean; hops: MatchResult[] }>()
  for (const r of rows) {
    if (r.off || r.code === 410 || r.match === "regex") continue
    const to = r.to.trim()
    if (!to || to.includes("$")) continue
    const sample =
      r.match === "prefix" ? `${to.endsWith("/") ? to : `${to}/`}` : to
    const f = followAddress(c, sample, domains, strict)
    if (f.loop || f.hops.length) out.set(r.key, f)
  }
  return out
}

// Points rules that lead into another redirect straight at where visitors
// end up. Leaves loops, chains ending in a 410 and starts-with rules whose
// next hop isn't a starts-with rule (the rest of the path wouldn't carry).
export function shortenChains(
  rows: RedirectDraft[],
  domains: string[],
  strict: boolean,
) {
  const chains = findChains(rows, domains, strict)
  let changed = 0
  const next = rows.map((r) => {
    const ch = chains.get(r.key)
    const last = ch?.hops.at(-1)
    if (!ch || ch.loop || !last || last.code === 410) return r
    let to = last.target
    if (r.match === "prefix") {
      if (ch.hops.some((h) => h.rule.match !== "prefix") || to.includes("?"))
        return r
      if (!r.to.trim().endsWith("/")) to = to.replace(/\/+$/, "") || "/"
    }
    if (!to || to === r.to.trim()) return r
    changed++
    return { ...r, to }
  })
  return { rows: next, changed }
}

// ---- Use (from the access log) ----

export type Hit = { path: string; status: number; count: number; last: string }
export type RuleUse = { count: number; last: string }

// Redirect answers in the log counted against the rules: the first rule the
// address could meet that answers with the logged code (a conditional rule
// or the plain one behind it). Answers no rule explains (an older list, the
// http → https redirect) count for none.
export function ruleUse(
  rows: RedirectDraft[],
  hits: Hit[],
  domains: string[],
  strict: boolean,
) {
  const c = compileRedirects(rows, domains, strict)
  const out = new Map<string, RuleUse>()
  for (const h of hits) {
    const rule = candidates(c, h.path, domains, strict).find(
      (r) => r.code === h.status,
    )
    if (!rule) continue
    const u = out.get(rule.key)
    if (!u) out.set(rule.key, { count: h.count, last: h.last })
    else {
      u.count += h.count
      if (h.last > u.last) u.last = h.last
    }
  }
  return out
}

// ---- Similar addresses (404s, migrations) ----

const pageExt = /\.(html?|php\d?|aspx?|jsp|cfm|shtml)$/i

// Words of a path: /Blog/2019/My_Post.html → blog 2019 my post.
export function pathWords(path: string) {
  return path
    .split("?")[0]
    .toLowerCase()
    .replace(pageExt, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && w !== "index")
}

const lastWords = (path: string) =>
  pathWords(
    path
      .split("?")[0]
      .replace(/\/+$/, "")
      .split("/")
      .at(-1)
      ?.replace(pageExt, "") ?? "",
  )

function dice(a: string[], b: string[]) {
  const x = new Set(a)
  const y = new Set(b)
  if (!x.size || !y.size) return 0
  let n = 0
  for (const w of x) if (y.has(w)) n++
  return (2 * n) / (x.size + y.size)
}

// 0…1: mostly the last part (the slug), some of the whole path.
export function similarity(a: string, b: string) {
  return (
    0.7 * dice(lastWords(a), lastWords(b)) +
    0.3 * dice(pathWords(a), pathWords(b))
  )
}

export const GOOD_MATCH = 0.75
const MIN_MATCH = 0.5

// Finds the closest of many pages for an address: pages sharing a word of
// its slug are scored, the best above MIN_MATCH wins.
export function pageMatcher(pages: string[]) {
  const byWord = new Map<string, number[]>()
  pages.forEach((p, i) => {
    for (const w of new Set(pathWords(p))) {
      const l = byWord.get(w)
      if (l) l.push(i)
      else byWord.set(w, [i])
    }
  })
  const keys = pages.map((p) => slashKey(p.split("?")[0], false))
  return (path: string): { to: string; score: number } | undefined => {
    const own = slashKey(path.split("?")[0], false)
    let words = lastWords(path)
    if (!words.length) words = pathWords(path)
    const seen = new Set<number>()
    // Common words (blog, en) hold most pages: rarer ones go first.
    const lists = [...new Set(words)]
      .map((w) => byWord.get(w) ?? [])
      .sort((a, b) => a.length - b.length)
    for (const l of lists) {
      for (const i of l) {
        seen.add(i)
        if (seen.size >= 2000) break
      }
      if (seen.size >= 2000) break
    }
    let best: { to: string; score: number } | undefined
    for (const i of seen) {
      if (keys[i] === own) continue
      const score = similarity(path, pages[i])
      if (score >= MIN_MATCH && (!best || score > best.score))
        best = { to: pages[i], score }
    }
    return best
  }
}

// Addresses only scanners ask for: never worth a redirect.
const probe =
  /(^|\/)(wp-(admin|login|content|includes|json)|xmlrpc\.php|\.env|\.git|\.aws|\.ds_store|phpmyadmin|cgi-bin|vendor\/phpunit|actuator|\.well-known)(\/|$|\.)|\.(sql|bak|old|zip|tar|gz|rar|7z|log|ini|ya?ml|config)$/i

export const isProbe = (path: string) => probe.test(path.split("?")[0])

export type Missing = {
  path: string
  count: number
  last: string
  referer?: string
}

export type Suggestion = Missing & { to: string; score: number }

// 404s worth a rule: not a scanner's, not taken by a rule in the list
// already (saved or not), not ignored; each with the closest page found.
export function suggestRedirects(
  missing: Missing[],
  pages: string[],
  rows: RedirectDraft[],
  domains: string[],
  strict: boolean,
  ignored: Set<string>,
) {
  const c = compileRedirects(rows, domains, strict)
  const targets = rows.flatMap((r) => {
    const to = r.to.trim()
    return !r.off && r.code !== 410 && to.startsWith("/") && !to.includes("$")
      ? [to]
      : []
  })
  const match = pageMatcher([...new Set([...pages, ...targets])])
  let probes = 0
  const list: Suggestion[] = []
  for (const m of missing) {
    if (isProbe(m.path)) {
      probes++
      continue
    }
    if (ignored.has(m.path)) continue
    if (matchAddress(c, m.path, domains, strict, "any")) continue
    const best = match(m.path)
    list.push({ ...m, to: best?.to ?? "", score: best?.score ?? 0 })
  }
  return { list, probes }
}

// ---- Address lists (sitemaps, migrations) ----

const xmlEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}

const unXml = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => xmlEntities[e])

// A sitemap (urlset or sitemapindex) or any list with one address a line
// (CSV: the first cell that looks like an address).
export function parseUrlList(text: string) {
  const t = text.trim()
  if (/<(urlset|sitemapindex)\b/i.test(t)) {
    const locs = [
      ...t.matchAll(
        /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi,
      ),
    ].map((m) => unXml(m[1]))
    const index = /<sitemapindex\b/i.test(t)
    return {
      urls: index ? [] : [...new Set(locs)],
      sitemaps: index ? [...new Set(locs)] : [],
    }
  }
  const urls = t
    .split(/\r?\n/)
    .map((l) =>
      l
        .trim()
        .split(/[\s,;\t]+/)
        .map((c) => c.replace(/^["']|["']$/g, ""))
        .find((c) => /^(https?:\/\/|\/)/i.test(c)),
    )
    .filter((u): u is string => !!u)
  return { urls: [...new Set(urls)], sitemaps: [] as string[] }
}

// An address as a path (query kept, %XX decoded) and its host.
export function addressParts(input: string) {
  const s = input.trim()
  let host = ""
  let path = s
  if (hasScheme(s)) {
    try {
      const u = new URL(s.startsWith("//") ? `https:${s}` : s)
      host = u.hostname
      path = (u.pathname || "/") + u.search
    } catch {
      return { host, path: s }
    }
  }
  return { host, path: sitePath(path, []).path }
}

export type MigrationRow = {
  // The old path: unique in a plan.
  key: string
  from: string
  // "" = no match found.
  to: string
  score: number
}

// Old addresses paired with the closest new ones. Addresses that stay the
// same need no rule and are only counted. A new address on this site
// becomes a path, one elsewhere stays whole.
export function planMigration(
  oldUrls: string[],
  newUrls: string[],
  domains: string[],
) {
  const targets = [
    ...new Set(
      newUrls.map((u) => {
        const { host, path } = addressParts(u)
        return !host || ownsHost(domains, host) ? path : u.trim()
      }),
    ),
  ]
  const local = new Set(
    targets
      .filter((t) => t.startsWith("/"))
      .map((t) => slashKey(t.split("?")[0], false)),
  )
  const match = pageMatcher(targets)
  const seen = new Set<string>()
  const rows: MigrationRow[] = []
  let same = 0
  for (const u of oldUrls) {
    const { path } = addressParts(u)
    const k = slashKey(path, false)
    if (seen.has(k)) continue
    seen.add(k)
    if (local.has(slashKey(path.split("?")[0], false))) {
      same++
      continue
    }
    const best = match(path)
    rows.push({
      key: path,
      from: path,
      to: best?.to ?? "",
      score: best?.score ?? 0,
    })
  }
  return { rows, same }
}

// ---- Checking targets ----

// The address a target is checked at: a path on this site under its main
// name (https when the site has it); undefined when it can't be (a pattern's
// $1, no name to ask).
export function targetUrl(r: RedirectDraft, base: string | undefined) {
  const to = r.to.trim()
  if (r.off || r.code === 410 || !to || to.includes("$")) return
  if (r.match === "prefix") return
  if (hasScheme(to)) return to.startsWith("//") ? `https:${to}` : to
  return base ? base + to : undefined
}

export type TargetState = "ok" | "redirects" | "broken"

export const targetState = (status: number): TargetState =>
  status >= 200 && status < 300
    ? "ok"
    : status >= 300 && status < 400
      ? "redirects"
      : "broken"

// ---- Import ----

export type ParsedRule = {
  line: number
  from: string
  match: RedirectMatch
  to: string
  code: RuleCode
  keepQuery: boolean
  // Set when the address belongs to another host than the site's names.
  host?: string
  // Netlify's Country=/Language= conditions.
  when?: When
}

export type SkippedLine = { line: number; text: string; reason: string }

export type ImportOptions = {
  domains: string[]
  // For rows that don't say.
  code: RuleCode
  // Rows with no target: sent here, or 410 when empty.
  fallback: string
}

const codeWords: Record<string, RuleCode> = {
  "301": 301,
  "302": 302,
  "303": 302,
  "307": 307,
  "308": 308,
  "410": 410,
  permanent: 301,
  permanently: 301,
  moved: 301,
  redirect: 302,
  temp: 302,
  temporary: 302,
  found: 302,
  seeother: 302,
  gone: 410,
}

const codeOf = (s: string | undefined): RuleCode | undefined => {
  if (!s) return
  const w = s
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/!$/, "")
  if (codeWords[w]) return codeWords[w]
  const r = /r=(\d{3})/.exec(w)
  if (r) return codeWords[r[1]]
  if (/(^|,)r(,|$)/.test(w)) return 302
  if (/(^|,)g(,|$)/.test(w)) return 410
}

// Splits a CSV/TSV line; quotes may hold the separator.
function splitDelimited(line: string, sep: string) {
  const out: string[] = []
  let cur = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"' && !cur.trim()) quoted = true
    else if (ch === sep) {
      out.push(cur.trim())
      cur = ""
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

const headerWords =
  /^(from|to|source|target|destination|old|new|old ?url|new ?url|url|redirect|redirect ?to|type|code|status|status ?code|match|path)$/i

// Netlify/Vercel style placeholders: /news/:year/:slug, /blog/*, :path*.
function placeholders(from: string, to: string) {
  if (!/(^|\/):[a-z_]\w*\*?|\*/i.test(from)) return
  // /blog/* → /news/:splat (or /news/*): a starts-with rule.
  const star = /^(.*?)\/?\*$/.exec(from)
  if (star && !/[:*]/.test(star[1])) {
    const base = to.replace(/\/?(:splat|\*|:path\*?)$/, "")
    if (base !== to || !/[:*]/.test(to))
      return {
        from: star[1] || "/",
        match: "prefix" as const,
        to: base || "/",
        cut: base === to,
      }
  }
  const names: string[] = []
  const re = from.replace(
    /:([a-z_]\w*)(\*)?|(\*)|([.+?^${}()|[\]\\])/gi,
    (_, name, many, star, special) => {
      if (special) return `\\${special}`
      names.push(name ?? "splat")
      return many || star ? "(.*)" : "([^/]+)"
    },
  )
  let target = to
  names.forEach((n, i) => {
    target = target.replaceAll(`:${n}*`, `$${i + 1}`)
    target = target.replaceAll(`:${n}`, `$${i + 1}`)
  })
  target = target.replace(/\*/g, `$${names.indexOf("splat") + 1}`)
  return { from: `^${re}$`, match: "regex" as const, to: target, cut: false }
}

// A regex nginx/Apache wrote around one literal path: ^/old/?$ → exact.
function literalOf(re: string) {
  const m = /^\^(\/?[A-Za-z0-9._~@%+=,:/-]*?)\/?\??\$$/.exec(re)
  if (!m || /\\/.test(re.slice(1, -1).replace(/\\\./g, ""))) return
  return m[1].startsWith("/") ? m[1] : `/${m[1]}`
}

// Reads one line in any of the known shapes; undefined = not a rule.
function parseLine(
  raw: string,
  sep: string | undefined,
):
  | {
      from: string
      to: string
      code?: RuleCode
      match?: RedirectMatch
      keepQuery?: boolean
      when?: When
    }
  | string
  | undefined {
  const line = raw.trim().replace(/;$/, "").trim()
  if (!line || line.startsWith("#") || line.startsWith("//")) return
  // nginx
  let m = /^rewrite\s+(\S+)\s+(\S+)(?:\s+(\w+))?$/i.exec(line)
  if (m) {
    const flag = m[3]?.toLowerCase()
    if (flag !== "permanent" && flag !== "redirect" && !/^https?:/.test(m[2]))
      return "An internal rewrite, not a redirect"
    const lit = literalOf(m[1])
    const keepQuery = !m[2].endsWith("?")
    const to = m[2].replace(/\?$/, "")
    return {
      from: lit ?? m[1],
      match: lit ? "exact" : "regex",
      to,
      code: flag === "redirect" ? 302 : 301,
      keepQuery,
    }
  }
  m =
    /^location\s+(=|~\*?)?\s*(\S+)\s*\{\s*return\s+(\d{3})\s*(\S*?)\s*;?\s*\}$/i.exec(
      line,
    )
  if (m) {
    const exact = m[1] === "=" || (!m[1] && !m[2].endsWith("/"))
    return {
      from: m[1]?.startsWith("~") ? m[2] : m[2],
      match: m[1]?.startsWith("~") ? "regex" : exact ? "exact" : "prefix",
      to: m[4].replace(/\$request_uri$|\$is_args\$args$/, ""),
      code: codeOf(m[3]),
      keepQuery: /\$(request_uri|is_args|args)/.test(m[4]),
    }
  }
  // Apache
  m =
    /^(Redirect|RedirectPermanent|RedirectTemp|RedirectMatch)\s+(?:(\S+)\s+)?(\S+)(?:\s+(\S+))?$/i.exec(
      line,
    )
  if (m) {
    const kind = m[1].toLowerCase()
    let status = m[2]
    let from = m[3]
    let to = m[4] ?? ""
    // Two arguments: no status was given.
    if (status && !codeOf(status) && !/^(gone)$/i.test(status)) {
      to = from
      from = status
      status = ""
    }
    const code =
      kind === "redirectpermanent"
        ? 301
        : kind === "redirecttemp"
          ? 302
          : (codeOf(status) ?? 302)
    if (kind === "redirectmatch") {
      const lit = literalOf(from)
      return {
        from: lit ?? from,
        match: lit ? "exact" : "regex",
        to,
        code,
      }
    }
    // Apache's Redirect takes the path and everything under it.
    return { from, match: "prefix", to, code, keepQuery: true }
  }
  m = /^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?$/i.exec(line)
  if (m) {
    const flags = m[3] ?? ""
    if (!/(^|,)\s*(R|G)(=|,|$)/i.test(flags) && !/^https?:/.test(m[2]))
      return "An internal rewrite, not a redirect"
    // .htaccess patterns have no leading slash.
    const pattern = m[1].replace(/^\^(?!\/)/, "^/")
    const lit = literalOf(pattern)
    const code = /(^|,)\s*G(,|$)/i.test(flags)
      ? 410
      : (codeOf(flags.replace(/\s/g, "")) ?? 302)
    return {
      from: lit ?? pattern,
      match: lit ? "exact" : "regex",
      to: m[2] === "-" ? "" : m[2].replace(/\?$/, ""),
      code,
      keepQuery: /(^|,)\s*QSA/i.test(flags) || !m[2].includes("?"),
    }
  }
  if (
    /^(RewriteCond|RewriteEngine|RewriteBase|Options|<|server\b|location\b|\})/i.test(
      line,
    )
  )
    return "Not a redirect line"
  // old -> new, old => new
  m = /^(\S+)\s*(?:->|=>|→)\s*(\S+)(?:\s+(\S+))?$/.exec(line)
  if (m) return { from: m[1], to: m[2], code: codeOf(m[3]) }
  // CSV/TSV or spaces: from, to, code, then anything (notes…). Netlify's
  // _redirects adds Country=de,at Language=fa after the code.
  let cells = sep ? splitDelimited(raw.trim(), sep) : line.split(/\s+/)
  let when: When | undefined
  if (!sep) {
    const conds = cells.filter((c) => /^(country|language)=/i.test(c))
    if (conds.length) {
      when = noWhen()
      for (const c of conds) {
        const [k, v] = c.split("=")
        const list = v.split(",").filter(Boolean)
        if (/^country$/i.test(k))
          when.countries = list.map((x) => x.toUpperCase())
        else when.languages = list.map((x) => x.toLowerCase())
      }
      cells = cells.filter((c) => !conds.includes(c))
    }
  }
  const [from = "", second = "", third = ""] = cells
  if (!from) return
  // A lone code in the second column: "/old,410".
  const secondCode = codeOf(second)
  if (secondCode && !second.includes("/"))
    return { from, to: "", code: secondCode, when }
  return { from, to: second, code: codeOf(third), when }
}

// Picks the separator a pasted list uses (none = spaces).
function separatorOf(lines: string[]) {
  const sample = lines
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .slice(0, 20)
  for (const sep of ["\t", ",", ";", "|"]) {
    if (
      sample.length &&
      sample.filter((l) => l.includes(sep)).length >=
        Math.ceil(sample.length * 0.6)
    )
      return sep
  }
}

// Vercel/Next.js and similar JSON lists.
function parseJson(text: string): ReturnType<typeof parseLine>[] | undefined {
  const t = text.trim()
  if (!t.startsWith("[") && !t.startsWith("{")) return
  let data: unknown
  try {
    data = JSON.parse(t)
  } catch {
    return
  }
  const list = Array.isArray(data)
    ? data
    : ((data as { redirects?: unknown[] }).redirects ?? [])
  if (!Array.isArray(list)) return
  return list.map((x) => {
    const o = (x ?? {}) as Record<string, unknown>
    const from = String(o.source ?? o.from ?? o.old ?? "")
    const to = String(o.destination ?? o.to ?? o.target ?? o.new ?? "")
    const code =
      codeOf(String(o.statusCode ?? o.status ?? o.code ?? "")) ??
      (o.permanent === false ? 307 : o.permanent === true ? 308 : undefined)
    if (!from) return "No source"
    return { from, to, code }
  })
}

export function parseRedirects(text: string, o: ImportOptions) {
  const rules: ParsedRule[] = []
  const skipped: SkippedLine[] = []
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  const json = parseJson(text)
  const parsed =
    json ??
    (() => {
      const sep = separatorOf(lines)
      return lines.map((l) => parseLine(l, sep))
    })()
  parsed.forEach((p, i) => {
    const line = i + 1
    const text = json ? JSON.stringify(p) : lines[i].trim()
    if (p === undefined) return
    if (typeof p === "string") {
      skipped.push({ line, text, reason: p })
      return
    }
    // A header row: from,to / source,destination …
    if (
      i < 3 &&
      rules.length === 0 &&
      headerWords.test(p.from) &&
      (!p.to || headerWords.test(p.to))
    )
      return
    let { from, to } = p
    let match: RedirectMatch = p.match ?? "exact"
    let code = p.code ?? o.code
    let keepQuery = p.keepQuery ?? false
    if (!p.match) {
      const ph = placeholders(from, to)
      if (ph) {
        ;({ from, to, match } = ph)
        keepQuery = false
      } else if (/^\^|\$$|\(\.\*\)|\\\.|\[\^?/.test(from)) match = "regex"
    }
    let host: string | undefined
    if (match !== "regex") {
      const sp = sitePath(from, o.domains)
      from = sp.path
      host = sp.host
      if (match === "prefix") from = from.replace(/\/+$/, "") || "/"
    }
    if (to && !hasScheme(to) && !to.startsWith("/") && !to.startsWith("$"))
      to = `/${to}`
    // A target on this site becomes a path, so moving domains keeps working.
    if (to && hasScheme(to)) {
      try {
        const u = new URL(to)
        if (ownsHost(o.domains, u.hostname) && match !== "prefix")
          to = decodeURI(u.pathname) + u.search
      } catch {}
    }
    if (!to && code !== 410) {
      if (o.fallback.trim()) to = o.fallback.trim()
      else code = 410
    }
    if (code === 410) to = ""
    const when = "when" in p ? p.when : undefined
    rules.push({ line, from, match, to, code, keepQuery, host, when })
  })
  return { rules, skipped }
}

// ---- Export ----

const csvCell = (s: string) =>
  /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s

export function redirectsCsv(rows: RedirectDraft[]) {
  const head = "from,to,code,match,keep_query,off,note"
  const body = rows.map((r) =>
    [
      r.from,
      r.to,
      String(r.code),
      r.match,
      r.keepQuery ? "yes" : "",
      r.off ? "yes" : "",
      r.note,
    ]
      .map(csvCell)
      .join(","),
  )
  return `${[head, ...body].join("\n")}\n`
}

// ---- Lists ----

// What makes two rules the same address (for duplicates and imports).
export function redirectKey(
  r: Pick<RedirectDraft, "from" | "match"> & { when?: When },
  domains: string[],
  strict: boolean,
) {
  const cond =
    r.when && hasWhen(r.when) ? ` when ${JSON.stringify(tidyWhen(r.when))}` : ""
  return addressKey(r, domains, strict) + cond
}

function addressKey(
  r: Pick<RedirectDraft, "from" | "match">,
  domains: string[],
  strict: boolean,
) {
  if (r.match === "regex") return `regex ${r.from.trim()}`
  const path = sitePath(r.from, domains).path
  if (r.match === "prefix")
    return `prefix ${path.replace(/\/+$/, "").toLowerCase() || "/"}`
  return `exact ${slashKey(path, strict)}`
}

// Imported rules added to the list: one for an address already there
// replaces its target and answer (and turns it back on).
export function mergeRedirects(
  rows: RedirectDraft[],
  incoming: RedirectDraft[],
  domains: string[],
  strict: boolean,
) {
  const index = new Map(
    rows.map((r, i) => [redirectKey(r, domains, strict), i] as const),
  )
  const next = [...rows]
  let added = 0
  let updated = 0
  for (const r of incoming) {
    const k = redirectKey(r, domains, strict)
    const i = index.get(k)
    if (i !== undefined) {
      next[i] = {
        ...next[i],
        to: r.to,
        code: r.code,
        keepQuery: r.keepQuery,
        off: false,
      }
      updated++
    } else {
      index.set(k, next.length)
      next.push(r)
      added++
    }
  }
  return { rows: next, added, updated }
}

// The quick-add row guesses the kind from what was typed: /blog/* is a
// starts-with rule, ^…$ or (…) a pattern.
export function quickRule(from: string, to: string, code: RuleCode) {
  const f = from.trim()
  if (/^\^|\$$|\(/.test(f))
    return freshRedirect({ from: f, match: "regex", to, code })
  if (/\/\*$|\*$/.test(f))
    return freshRedirect({
      from: f.replace(/\/?\*$/, "") || "/",
      match: "prefix",
      to: to.replace(/\/?(\*|:splat)$/, "") || "/",
      code,
    })
  return freshRedirect({ from: f, to, code })
}

export function ruleMatches(r: RedirectDraft, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return (
    r.from.toLowerCase().includes(s) ||
    r.to.toLowerCase().includes(s) ||
    r.note.toLowerCase().includes(s) ||
    String(r.code) === s ||
    (hasWhen(r.when) && whenText(r.when).toLowerCase().includes(s))
  )
}
