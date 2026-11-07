"use client"

import {
  createSerializer,
  parseAsBoolean,
  parseAsString,
  useQueryStates,
} from "nuqs"
import { useState } from "react"

import { appIcons, colorOf } from "@/components/palette"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import { API_URL } from "@/lib/api"
import type { App, AppCategory, AppList } from "@/lib/services"
import { cn } from "@/lib/utils"

export {
  type AppColor,
  appColorKeys,
  appColors,
  appIcons,
  colorOf,
} from "@/components/palette"

const logoSizes = {
  40: "size-10 rounded-lg text-body",
  36: "size-9 rounded-lg text-body",
  32: "size-8 rounded-lg text-body-sm",
  28: "size-7 rounded-md text-body-sm",
}

// The person's pick (an uploaded picture or an icon), else the favicon the
// backend fetched, else the first letter on the service's color.
export function AppLogo({
  app,
  size = 36,
  className,
}: {
  app: App
  size?: 40 | 36 | 32 | 28
  className?: string
}) {
  const [broken, setBroken] = useState<string | null>(null)
  const box = cn(
    "flex shrink-0 items-center justify-center overflow-hidden",
    logoSizes[size],
    className,
  )
  const Icon = app.logo_kind === "icon" ? appIcons[app.logo_icon] : undefined

  if (Icon) {
    return (
      <span aria-hidden className={cn(box, colorOf(app.color).tile)}>
        <Icon className="size-[55%] text-white" />
      </span>
    )
  }
  if (app.logo_url && broken !== app.logo_url) {
    const url = app.logo_url
    return (
      <span aria-hidden className={cn(box, "border border-border bg-card")}>
        {/* biome-ignore lint/performance/noImgElement: a cookie-authenticated API image, not a static asset */}
        <img
          src={`${API_URL}${url}`}
          alt=""
          draggable={false}
          onError={() => setBroken(url)}
          className="size-[70%] object-contain"
        />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className={cn(box, colorOf(app.color).tile, "font-medium text-white")}
    >
      {[...app.name.trim()][0]?.toUpperCase() ?? "?"}
    </span>
  )
}

// Only http(s) addresses become links; anything else (javascript:, data:…)
// or one carrying a login stays plain text.
export function safeHref(address: string): string | undefined {
  try {
    const url = new URL(address)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    if (url.username || url.password) return undefined
    return url.href
  } catch {
    return undefined
  }
}

// A typed address with https:// added when it has no scheme. "localhost:9000"
// is a host and a port, not a scheme; "javascript:…" keeps its own and fails
// the http(s) check.
export function withScheme(address: string) {
  const text = address.trim()
  if (!text || /^[a-z][a-z0-9+.-]*:(?!\d|$)/i.test(text)) return text
  return `https://${text.replace(/^\/+/, "")}`
}

// The address as people say it: no scheme, no trailing slash.
export const shortAddress = (address: string) =>
  address.replace(/^https?:\/\//i, "").replace(/\/$/, "")

const IP = /^(\d{1,3}\.){3}\d{1,3}$|^\[.*\]$/

// A name to start from, read off the host: portainer.acme.ir → Portainer.
// Nothing for a bare IP, where the host says nothing about the service.
export function suggestName(address: string): string {
  const text = address.trim()
  if (!text) return ""
  let host: string
  try {
    host = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`,
    ).hostname
  } catch {
    return ""
  }
  if (IP.test(host)) return ""
  const first = host.replace(/^www\./, "").split(".")[0] ?? ""
  const words = first.replace(/[-_]+/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Search, category and the Critical view, kept in the URL.
// A link into the page's search, for places outside it.
export const appsHref = createSerializer({ q: parseAsString })

export function useAppFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      // A category id, or "none" for services outside every category.
      cat: parseAsString,
      critical: parseAsBoolean.withDefault(false),
    },
    { history: "replace" },
  )
  return {
    q: filters.q,
    setQ: (q: string) => setFilters({ q: q || null }),
    cat: filters.cat,
    setCat: (cat: string | null) => setFilters({ cat, critical: null }),
    critical: filters.critical,
    setCritical: (on: boolean) =>
      setFilters({ critical: on || null, cat: null }),
  }
}

// Every word must appear in the name, address, note, an account's label or
// its username (usernames only reach Operators and up).
export function matchesApp(app: App, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const text = [
    app.name,
    app.address,
    app.note,
    ...app.accounts.flatMap((a) => [a.label, a.username]),
  ]
    .join(" ")
    .toLowerCase()
  return words.every((w) => text.includes(w))
}

export type AppGroup = { category: AppCategory | null; apps: App[] }

// Categories in their order, each with its services in theirs; services
// outside every category come last.
// keepLoose: show the uncategorized block even when empty (a place to drop).
export function groupApps(
  items: App[],
  categories: AppCategory[],
  keepLoose = false,
): AppGroup[] {
  const byPosition = <T extends { position: number }>(a: T, b: T) =>
    a.position - b.position
  const known = new Set(categories.map((c) => c.id))
  const groups: AppGroup[] = [...categories].sort(byPosition).map((c) => ({
    category: c,
    apps: items.filter((a) => a.category_id === c.id).sort(byPosition),
  }))
  const loose = items
    .filter((a) => !a.category_id || !known.has(a.category_id))
    .sort(byPosition)
  if (loose.length > 0 || keepLoose)
    groups.push({ category: null, apps: loose })
  return groups
}

export const noApps: AppList = { items: [], categories: [] }

// What the page lists under the filters. While it can be rearranged, empty
// blocks stay as places to drop (the uncategorized one only mid-drag).
export function visibleGroups(
  { items, categories }: AppList,
  { q, cat, critical }: { q: string; cat: string | null; critical: boolean },
  { enabled, dragging }: { enabled: boolean; dragging: boolean },
) {
  const known = new Set(categories.map((c) => c.id))
  const shown = items.filter(
    (a) =>
      matchesApp(a, q) &&
      (!critical || a.critical) &&
      (!cat ||
        (cat === "none"
          ? !a.category_id || !known.has(a.category_id)
          : a.category_id === cat)),
  )
  const groups = groupApps(shown, categories, dragging).filter(
    (g) =>
      g.apps.length > 0 ||
      (enabled &&
        (!cat || (cat === "none" ? !g.category : g.category?.id === cat))),
  )
  return { shown, groups }
}

// Tiles or table, remembered on this browser.
export const useViewMode = () =>
  useStoredChoice("morcheh.services.view", ["tiles", "table"])
