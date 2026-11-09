"use client"

import {
  DatabaseZap,
  FileCode,
  FileWarning,
  Gauge,
  KeyRound,
  Lock,
  type LucideIcon,
  Route,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useEffect, useRef } from "react"

import { ToggleRow } from "@/app/(panel)/cronjobs/components/editor-parts"
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

// The site editor's tabs: what a site does first, then one tab per kind
// of setting. Which ones show depends on the site's type and the proxy.

export const editorTabs = [
  "general",
  "https",
  "security",
  "login",
  "ratelimit",
  "cache",
  "routing",
  "pages",
  "advanced",
  "config",
] as const
export type EditorTab = (typeof editorTabs)[number]

export const editorTabMeta: Record<
  EditorTab,
  { label: string; icon: LucideIcon }
> = {
  general: { label: "General", icon: Settings2 },
  https: { label: "HTTPS", icon: Lock },
  security: { label: "Security", icon: ShieldCheck },
  login: { label: "Login", icon: KeyRound },
  ratelimit: { label: "Rate limit", icon: Gauge },
  cache: { label: "Cache", icon: DatabaseZap },
  routing: { label: "Routing", icon: Route },
  pages: { label: "Pages", icon: FileWarning },
  advanced: { label: "Advanced", icon: SlidersHorizontal },
  config: { label: "Config", icon: FileCode },
}

export function tabsFor(
  type: Draft["type"],
  caps: ReverseProxy["capabilities"],
) {
  const uses = typeUses(type)
  const shown: Record<EditorTab, boolean> = {
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
    key.startsWith("hardening")
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
    ].includes(key)
  )
    return "advanced"
  return "general"
}

export function useEditorTab(tabs: readonly EditorTab[]) {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(editorTabs)
      .withDefault("general")
      .withOptions({ history: "replace", scroll: false }),
  )
  return {
    // A tab the type no longer has (e.g. https after switching to a stream)
    // falls back to General.
    tab: tabs.includes(tab) ? tab : ("general" as const),
    setTab: (t: EditorTab) => setTab(t === "general" ? null : t),
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
    security: limited(d) ? "Limited" : undefined,
    login: loginBadge(d),
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
// with the page's buttons at its end so Save stays in reach.
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
  return (
    <nav
      aria-label="Site settings"
      className="sticky top-[calc(3rem+1px)] z-20 border-b border-border bg-background/90 px-4 backdrop-blur-md"
    >
      <div className="flex items-center gap-1">
        {tabs.map((info) => {
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
        {end && (
          <div className="ms-auto flex shrink-0 items-center gap-2 py-1.5 ps-3">
            {end}
          </div>
        )}
      </div>
    </nav>
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
