"use client"

import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  Box,
  Boxes,
  Calendar,
  ChartLine,
  Cloud,
  Code,
  Container,
  Cpu,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  Monitor,
  Network,
  Router,
  Server,
  Settings,
  Shield,
  Store,
  Terminal,
  Ticket,
  Users,
  Workflow,
  Wrench,
} from "lucide-react"
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs"
import { useState } from "react"

import { API_URL } from "@/lib/api"
import type { App, AppCategory } from "@/lib/services"
import { cn } from "@/lib/utils"

export const appColorKeys = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "indigo",
  "violet",
  "pink",
] as const
export type AppColor = (typeof appColorKeys)[number]

// Written out in full so Tailwind sees every class.
export const appColors: Record<
  AppColor,
  { dot: string; tile: string; label: string }
> = {
  slate: { dot: "bg-svc-slate", tile: "bg-svc-slate", label: "Slate" },
  red: { dot: "bg-svc-red", tile: "bg-svc-red", label: "Red" },
  orange: { dot: "bg-svc-orange", tile: "bg-svc-orange", label: "Orange" },
  amber: { dot: "bg-svc-amber", tile: "bg-svc-amber", label: "Amber" },
  green: { dot: "bg-svc-green", tile: "bg-svc-green", label: "Green" },
  teal: { dot: "bg-svc-teal", tile: "bg-svc-teal", label: "Teal" },
  blue: { dot: "bg-svc-blue", tile: "bg-svc-blue", label: "Blue" },
  indigo: { dot: "bg-svc-indigo", tile: "bg-svc-indigo", label: "Indigo" },
  violet: { dot: "bg-svc-violet", tile: "bg-svc-violet", label: "Violet" },
  pink: { dot: "bg-svc-pink", tile: "bg-svc-pink", label: "Pink" },
}

export const colorOf = (key: string) =>
  appColors[key as AppColor] ?? appColors.slate

// The icons a service can wear instead of a picture. Keys are what the
// backend stores in `logo_icon`.
export const appIcons: Record<string, LucideIcon> = {
  globe: Globe,
  server: Server,
  database: Database,
  "hard-drive": HardDrive,
  cloud: Cloud,
  container: Container,
  box: Box,
  boxes: Boxes,
  "git-branch": GitBranch,
  code: Code,
  terminal: Terminal,
  workflow: Workflow,
  "chart-line": ChartLine,
  gauge: Gauge,
  activity: Activity,
  bell: Bell,
  shield: Shield,
  lock: Lock,
  "key-round": KeyRound,
  network: Network,
  router: Router,
  cpu: Cpu,
  monitor: Monitor,
  "layout-dashboard": LayoutDashboard,
  mail: Mail,
  "message-square": MessageSquare,
  users: Users,
  ticket: Ticket,
  calendar: Calendar,
  "file-text": FileText,
  "book-open": BookOpen,
  store: Store,
  bot: Bot,
  wrench: Wrench,
  settings: Settings,
}

const logoSizes = {
  36: "size-9 rounded-lg text-body",
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
  size?: 36 | 28
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
export function groupApps(items: App[], categories: AppCategory[]): AppGroup[] {
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
  if (loose.length > 0) groups.push({ category: null, apps: loose })
  return groups
}

export type ViewMode = "tiles" | "table"
const viewKey = "morcheh.services.view"

// Tiles or table, remembered on this browser.
export function useViewMode() {
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(viewKey) === "table" ? "table" : "tiles"
    } catch {
      return "tiles"
    }
  })
  return [
    mode,
    (next: ViewMode) => {
      setMode(next)
      try {
        localStorage.setItem(viewKey, next)
      } catch {}
    },
  ] as const
}
