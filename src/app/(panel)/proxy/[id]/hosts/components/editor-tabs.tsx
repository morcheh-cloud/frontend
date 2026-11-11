"use client"

import {
  ChartColumn,
  ChevronDown,
  DatabaseZap,
  FileCode,
  FileWarning,
  Gauge,
  KeyRound,
  Lock,
  type LucideIcon,
  Route,
  ScrollText,
  Settings2,
  ShieldCheck,
  Signpost,
  SlidersHorizontal,
} from "lucide-react"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { ToggleRow } from "@/app/(panel)/cronjobs/components/editor-parts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { chipClass } from "../../../components/parts"
import {
  type Draft,
  type Errors,
  freshHeader,
  keptRules,
  keptUsers,
  splitList,
  typeUses,
} from "./draft"

// The site editor's tabs: a saved site opens on its Report; then what the
// site does, one tab per kind of setting, and its Logs just before Config.
// Which ones show depends on the site's type and the proxy.

export const editorTabs = [
  "report",
  "general",
  "https",
  "security",
  "login",
  "ratelimit",
  "cache",
  "routing",
  "redirects",
  "pages",
  "advanced",
  "logs",
  "config",
] as const
export type EditorTab = (typeof editorTabs)[number]

export const editorTabMeta: Record<
  EditorTab,
  { label: string; icon: LucideIcon }
> = {
  report: { label: "Report", icon: ChartColumn },
  logs: { label: "Logs", icon: ScrollText },
  general: { label: "General", icon: Settings2 },
  https: { label: "HTTPS", icon: Lock },
  security: { label: "Security", icon: ShieldCheck },
  login: { label: "Login", icon: KeyRound },
  ratelimit: { label: "Rate limit", icon: Gauge },
  cache: { label: "Cache", icon: DatabaseZap },
  routing: { label: "Routing", icon: Route },
  redirects: { label: "Redirects", icon: Signpost },
  pages: { label: "Pages", icon: FileWarning },
  advanced: { label: "Advanced", icon: SlidersHorizontal },
  config: { label: "Config", icon: FileCode },
}

// The two views of what visitors did, not settings.
export const viewTabs: readonly EditorTab[] = ["report", "logs"]

export function tabsFor(
  type: Draft["type"],
  caps: ReverseProxy["capabilities"],
  // A saved site (a new one has no log yet).
  saved: boolean,
) {
  const uses = typeUses(type)
  const shown: Record<EditorTab, boolean> = {
    report: saved && caps.traffic,
    logs: saved && caps.traffic,
    general: true,
    https: uses.tls,
    security:
      caps.allow ||
      (caps.headers && uses.headers) ||
      (caps.hardening && uses.hardening),
    login: caps.auth && uses.auth,
    ratelimit: caps.rate_limit && uses.rateLimit,
    cache: caps.cache && uses.browserCache,
    routing: (caps.paths && uses.paths) || (caps.headers && uses.headers),
    redirects: caps.redirects && uses.redirects,
    pages: caps.pages && (uses.maintenance || uses.errorPages),
    advanced: uses.maxBody || uses.timeout || caps.advanced || caps.tuning,
    config: true,
  }
  return editorTabs.filter((t) => shown[t])
}

// The tab that holds a field the backend refused.
export function tabOfError(key: string): EditorTab {
  if (key.startsWith("tls")) return "https"
  if (key.startsWith("headers") || key.startsWith("paths")) return "routing"
  if (key.startsWith("redirects")) return "redirects"
  if (key.startsWith("auth")) return "login"
  if (
    key.startsWith("maintenance") ||
    key.startsWith("error_pages") ||
    key === "intercept_errors"
  )
    return "pages"
  if (key.startsWith("rate")) return "ratelimit"
  if (key.startsWith("cache")) return "cache"
  if (
    [
      "allow",
      "deny",
      "default_access",
      "countries",
      "country_mode",
      "hide_version",
    ].includes(key) ||
    key.startsWith("hardening") ||
    key.startsWith("waf")
  )
    return "security"
  if (key === "custom") return "config"
  if (
    key.startsWith("real_ip") ||
    [
      "max_body_mb",
      "timeout_seconds",
      "connect_timeout_seconds",
      "gzip",
      "no_buffering",
      "proxy_protocol",
      "request_id",
      "brotli",
      "advanced",
    ].includes(key) ||
    key.startsWith("mirror") ||
    key.startsWith("images")
  )
    return "advanced"
  return "general"
}

export const tabParser = parseAsStringLiteral(editorTabs)

export function useEditorTab(tabs: readonly EditorTab[]) {
  const [tab, setTab] = useQueryState(
    "tab",
    tabParser.withOptions({ history: "replace", scroll: false }),
  )
  // The first tab (Report on a saved site, General on a new one) needs no
  // ?tab=; one the site no longer has (https after switching to a stream)
  // falls back to it.
  const first = tabs[0] ?? "general"
  return {
    tab: tab && tabs.includes(tab) ? tab : first,
    setTab: (t: EditorTab) => setTab(t === first ? null : t),
  }
}

type TabInfo = {
  tab: EditorTab
  // A small count (paths, headers) or state ("On") beside the label.
  badge?: string
  error: boolean
}

export function tabInfo(
  tabs: readonly EditorTab[],
  d: Draft,
  errors: Errors,
): TabInfo[] {
  const wrong = new Set(Object.keys(errors).map(tabOfError))
  const badge: Partial<Record<EditorTab, string>> = {
    https: d.tls ? "On" : undefined,
    routing:
      d.paths.length + d.headers.length
        ? `${d.paths.length + d.headers.length}`
        : undefined,
    security: limited(d)
      ? "Limited"
      : d.wafMode === "block"
        ? "Firewall"
        : undefined,
    login: loginBadge(d),
    redirects: d.redirects.length ? `${d.redirects.length}` : undefined,
    pages: pagesBadge(d),
    ratelimit: rateBadge(d),
    cache: cacheBadge(d),
    config: d.custom.trim() ? "By hand" : undefined,
  }
  return tabs.map((tab) => ({ tab, badge: badge[tab], error: wrong.has(tab) }))
}

function loginBadge(d: Draft) {
  if (!typeUses(d.type).auth) return undefined
  if (d.authMode === "basic") {
    const n = keptUsers(d).length
    return n ? `${n}` : "Password"
  }
  return d.authMode === "forward" ? "SSO" : undefined
}

function pagesBadge(d: Draft) {
  if (typeUses(d.type).maintenance && d.maint) return "Maintenance"
  const n = typeUses(d.type).errorPages ? d.errorPages.length : 0
  return n ? `${n}` : undefined
}

const limited = (d: Draft) =>
  d.defaultAccess === "deny" ||
  !!splitList(d.deny).length ||
  (typeUses(d.type).countries && d.countries.length > 0)

function cacheBadge(d: Draft) {
  const uses = typeUses(d.type)
  if (uses.proxyCache && d.cache) return "On"
  if (uses.proxyCache && d.onlineMode) return "Backup"
  return uses.browserCache && (d.assetDays.trim() || d.pagesFresh)
    ? "Browsers"
    : undefined
}

function rateBadge(d: Draft) {
  if (!typeUses(d.type).rateLimit) return undefined
  const rules = keptRules(d).length
  if (rules) return `${rules}`
  return d.connPerIp || d.connTotal || d.downloadKbs || d.uploadKbs
    ? "On"
    : undefined
}

const tabClass =
  "relative flex h-11 shrink-0 items-center gap-2 rounded-lg px-2.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full hover:text-foreground hover:after:bg-mist focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:bg-brand [&_svg]:size-4 [&_svg]:shrink-0"

function Badge({ info }: { info: TabInfo }) {
  return (
    <>
      {info.badge && (
        <span className="rounded-full bg-muted px-1.5 text-caption text-muted-foreground tabular-nums">
          {info.badge}
        </span>
      )}
      {info.error && (
        <span
          role="img"
          aria-label="has a problem"
          className="size-1.5 rounded-full bg-destructive"
        />
      )}
    </>
  )
}

// Desktop: a sticky tab bar under the header, like a server's sections,
// with the page's buttons at its end so Save stays in reach. What doesn't
// fit goes into "More"; the current tab and any with a problem stay in view.
export function EditorTabBar({
  tabs,
  current,
  onChange,
  end,
}: {
  tabs: TabInfo[]
  current: EditorTab
  onChange: (tab: EditorTab) => void
  end?: React.ReactNode
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  // Tabs that fit in the bar; null until measured (then every tab shows).
  const [shown, setShown] = useState<Set<EditorTab> | null>(null)
  // Badges change the widths, so they're part of what's measured.
  const signature = tabs
    .map((t) => `${t.tab}:${t.badge ?? ""}:${t.error ? 1 : 0}`)
    .join("|")

  // biome-ignore lint/correctness/useExhaustiveDependencies: `signature` stands for `tabs`, a new array on every render
  useLayoutEffect(() => {
    const row = rowRef.current
    const measure = measureRef.current
    if (!row || !measure) return

    const fit = () => {
      const widths = new Map<string, number>()
      for (const el of measure.querySelectorAll<HTMLElement>("[data-tab]")) {
        widths.set(el.dataset.tab ?? "", el.getBoundingClientRect().width)
      }
      const width = (set: Set<EditorTab>) =>
        tabs.reduce(
          (sum, t) => sum + (set.has(t.tab) ? (widths.get(t.tab) ?? 0) + 4 : 0),
          0,
        )
      const endWidth = endRef.current
        ? endRef.current.getBoundingClientRect().width
        : 0
      const room = row.clientWidth - endWidth - 8
      const all = new Set(tabs.map((t) => t.tab))
      if (width(all) <= room) return setShown(all)

      const more = (widths.get("…more") ?? 0) + 4
      const ranked = [
        ...tabs.filter((t) => t.tab === current),
        ...tabs.filter((t) => t.tab !== current && t.error),
        ...tabs.filter((t) => t.tab !== current && !t.error),
      ]
      const next = new Set<EditorTab>()
      for (const t of ranked) {
        next.add(t.tab)
        if (next.size > 1 && width(next) > room - more) {
          next.delete(t.tab)
          break
        }
      }
      setShown(next)
    }

    fit()
    // The measuring copy resizes when the font loads; the buttons at the
    // end change with the page's state.
    const observer = new ResizeObserver(fit)
    observer.observe(row)
    observer.observe(measure)
    if (endRef.current) observer.observe(endRef.current)
    return () => observer.disconnect()
  }, [current, signature])

  const hidden = shown ? tabs.filter((t) => !shown.has(t.tab)) : []

  return (
    <nav
      aria-label="Site settings"
      className="sticky top-[calc(3rem+1px)] z-20 border-b border-border bg-background/90 px-4 backdrop-blur-md"
    >
      <div ref={rowRef} className="relative flex items-center gap-1">
        {tabs
          .filter((info) => !shown || shown.has(info.tab))
          .map((info) => {
            const Icon = editorTabMeta[info.tab].icon
            return (
              <button
                key={info.tab}
                type="button"
                aria-current={current === info.tab ? "page" : undefined}
                onClick={() => onChange(info.tab)}
                className={tabClass}
              >
                <Icon />
                {editorTabMeta[info.tab].label}
                <Badge info={info} />
              </button>
            )
          })}
        {hidden.length > 0 && <MoreTabs tabs={hidden} onChange={onChange} />}
        {end && (
          <div
            ref={endRef}
            className="ms-auto flex shrink-0 items-center gap-2 py-1.5 ps-3"
          >
            {end}
          </div>
        )}

        {/* Every tab at its widest (font-medium), for measuring only;
            clipped so it can't widen the page. */}
        <div
          aria-hidden
          className="pointer-events-none invisible absolute inset-0 overflow-hidden"
        >
          <div ref={measureRef} className="flex w-max">
            {tabs.map((info) => {
              const Icon = editorTabMeta[info.tab].icon
              return (
                <span
                  key={info.tab}
                  data-tab={info.tab}
                  className={cn(tabClass, "font-medium")}
                >
                  <Icon />
                  {editorTabMeta[info.tab].label}
                  <Badge info={info} />
                </span>
              )
            })}
            <span data-tab="…more" className={cn(tabClass, "font-medium")}>
              More
              <span className="size-1.5" />
              <ChevronDown />
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}

function MoreTabs({
  tabs,
  onChange,
}: {
  tabs: TabInfo[]
  onChange: (tab: EditorTab) => void
}) {
  const wrong = tabs.some((t) => t.error)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={tabClass}>
        More
        {wrong && (
          <span
            role="img"
            aria-label="a tab in here has a problem"
            className="size-1.5 rounded-full bg-destructive"
          />
        )}
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {tabs.map((info) => {
          const Icon = editorTabMeta[info.tab].icon
          return (
            <DropdownMenuItem key={info.tab} onClick={() => onChange(info.tab)}>
              <Icon />
              <span className="flex-1 truncate">
                {editorTabMeta[info.tab].label}
              </span>
              <Badge info={info} />
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Phones: a scrolling chip row under the app bar.
export function EditorChips({
  tabs,
  current,
  onChange,
}: {
  tabs: TabInfo[]
  current: EditorTab
  onChange: (tab: EditorTab) => void
}) {
  // A link or a refused save can open a tab at the end of the row: keep
  // the current chip in sight.
  const row = useRef<HTMLElement>(null)
  const badge = tabs.find((t) => t.tab === current)?.badge
  // biome-ignore lint/correctness/useExhaustiveDependencies: a badge widens the chip
  useEffect(() => {
    row.current
      ?.querySelector(`[data-tab="${current}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [current, badge])
  return (
    <nav
      ref={row}
      aria-label="Site settings"
      className="sticky top-14 z-10 no-scrollbar flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-3"
    >
      {tabs.map((info) => (
        <button
          key={info.tab}
          type="button"
          data-tab={info.tab}
          aria-current={current === info.tab ? "page" : undefined}
          onClick={() => onChange(info.tab)}
          className={cn(chipClass, "gap-1.5")}
        >
          {editorTabMeta[info.tab].label}
          {info.error ? (
            <span
              role="img"
              aria-label="has a problem"
              className="size-1.5 rounded-full bg-destructive"
            />
          ) : (
            info.badge && (
              <span className="text-caption tabular-nums opacity-70">
                {info.badge}
              </span>
            )
          )}
        </button>
      ))}
    </nav>
  )
}

// Common protections, each one a response header. They're ordinary rows
// in Routing › Headers too: a switch here only adds or removes that row.
const protections = [
  {
    name: "X-Frame-Options",
    value: "SAMEORIGIN",
    label: "Block framing by other sites",
    hint: "Other sites can't show these pages inside theirs (clickjacking).",
  },
  {
    name: "X-Content-Type-Options",
    value: "nosniff",
    label: "Stop content-type guessing",
    hint: "Browsers take files for what the server says they are.",
  },
  {
    name: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
    label: "Share less with other sites",
    hint: "Links to other sites only tell them the domain, not the full page address.",
  },
  {
    name: "X-Robots-Tag",
    value: "noindex, nofollow",
    label: "Keep out of search engines",
    hint: "For internal tools and admin pages.",
  },
] as const

export function ProtectionHeaders({
  draft,
  set,
  hidden,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  // Header values are hidden from this person.
  hidden?: boolean
}) {
  const find = (name: string) =>
    draft.headers.find(
      (h) =>
        h.to === "response" &&
        h.name.trim().toLowerCase() === name.toLowerCase(),
    )
  return (
    <>
      {protections.map((p) => {
        const row = find(p.name)
        const other = row && !hidden && row.value.trim() !== p.value
        return (
          <ToggleRow
            key={p.name}
            id={`protect-${p.name}`}
            label={p.label}
            hint={
              other ? (
                <>
                  Set by hand in Routing:{" "}
                  <span className="font-mono">{row.value || "(empty)"}</span>
                </>
              ) : (
                p.hint
              )
            }
            checked={!!row}
            onChange={(on) =>
              set({
                headers: on
                  ? [
                      ...draft.headers,
                      {
                        ...freshHeader(),
                        name: p.name,
                        value: p.value,
                      },
                    ]
                  : draft.headers.filter(
                      (h) =>
                        !(
                          h.to === "response" &&
                          h.name.trim().toLowerCase() === p.name.toLowerCase()
                        ),
                    ),
              })
            }
          />
        )
      })}
    </>
  )
}
