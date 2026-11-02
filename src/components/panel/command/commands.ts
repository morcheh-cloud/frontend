"use client"

import {
  BookOpen,
  CircleHelp,
  Link2,
  type LucideIcon,
  PanelLeft,
  Plus,
  Search,
} from "lucide-react"
import { useEffect, useState } from "react"

import {
  sectionFor,
  sectionGroups,
  sectionHref,
  settingsSection,
} from "@/app/(panel)/servers/[id]/components/sections"
import { serversHref } from "@/app/(panel)/servers/components/use-filters"
import { guideForPath, guideHref, guides } from "@/components/help/guides"
import { helpItem, navGroups, settingsItem } from "../nav"

// What the command palette offers before anything is typed, and the static
// half of what it searches (servers and storages come from the API).

export type Tile = "muted" | "brand" | "outline"

export type Command = {
  key: string
  label: string
  hint?: string
  icon: LucideIcon
  tile: Tile
  // Extra words it should match.
  keywords?: string
  href?: string
  // Asks the page at `href` to do something once it is open (useIntent).
  intent?: string
  run?: () => void
  keys?: string[]
}

export const pages: Command[] = [
  ...navGroups.flatMap((g) => g.items),
  settingsItem,
  helpItem,
].flatMap((item) => [
  {
    key: `page:${item.href}`,
    label: item.label,
    icon: item.icon,
    tile: "muted" as const,
    href: item.href,
    keywords: "go open page",
  },
  ...(item.children ?? [])
    .filter((c) => c.href !== item.href)
    .map((c) => ({
      key: `page:${c.href}`,
      label: c.label,
      hint: item.label,
      icon: item.icon,
      tile: "muted" as const,
      href: c.href,
      keywords: "go open page",
    })),
])

const topPages = new Set(["/home", "/servers", "/storage", "/help"])
export const shortcutPages = pages.filter((p) => topPages.has(p.href ?? ""))

export function actions(
  pathname: string,
  toggleSidebar: () => void,
): Command[] {
  const guide = guideForPath(pathname)
  return [
    {
      key: "action:add-server",
      label: "Add server",
      icon: Plus,
      tile: "brand",
      href: "/servers",
      intent: "add-server",
      keywords: "new create ssh host",
    },
    {
      key: "action:add-storage",
      label: "Add storage",
      icon: Plus,
      tile: "brand",
      href: "/storage",
      intent: "add-storage",
      keywords: "new create s3 ftp sftp webdav bucket",
    },
    {
      key: "action:guide",
      label: guide ? `How ${guide.guide.title} works` : "Open help",
      hint: guide ? "Guide for this page" : undefined,
      icon: CircleHelp,
      tile: "brand",
      href: guide?.href ?? "/help",
      keywords: "help guide docs documentation",
    },
    {
      key: "action:sidebar",
      label: "Toggle sidebar",
      icon: PanelLeft,
      tile: "brand",
      run: toggleSidebar,
      keys: ["Mod", "B"],
      keywords: "collapse expand menu",
    },
    {
      key: "action:copy-link",
      label: "Copy link to this page",
      icon: Link2,
      tile: "brand",
      run: () => navigator.clipboard?.writeText(window.location.href),
      keywords: "url share clipboard",
    },
  ]
}

const serverSections = [
  ...sectionGroups.flatMap((g) => g.sections),
  settingsSection,
].filter((s) => s.ready)

// The current server's built sections, when a server page is open.
export function sectionsOf(serverId: string, serverName: string): Command[] {
  return serverSections.map((s) => ({
    key: `section:${serverId}:${s.slug}`,
    label: s.label,
    hint: serverName,
    icon: s.icon,
    tile: "muted",
    href: sectionHref(serverId, s.slug),
    keywords: s.summary,
  }))
}

export const guideCommands: Command[] = guides.map((g) => ({
  key: `guide:${g.slug}`,
  label: g.title,
  hint: "Guide",
  icon: g.icon ?? BookOpen,
  tile: "outline",
  href: guideHref(g.slug),
  keywords: `${g.keywords.join(" ")} ${g.summary}`,
}))

export function searchAll(query: string): Command {
  return {
    key: "search:servers",
    label: `Search all servers for “${query}”`,
    icon: Search,
    tile: "outline",
    href: serversHref("/servers", { q: query }),
  }
}

export function serverIdOf(pathname: string) {
  return /^\/servers\/([^/]+)/.exec(pathname)?.[1]
}

// Matching: every word must appear somewhere; a hit at the start of the label
// ranks first, then one inside it, then hint and keywords only.
export const words = (query: string) =>
  query.toLowerCase().split(/\s+/).filter(Boolean)

export function score(
  item: Pick<Command, "label" | "hint" | "keywords">,
  terms: string[],
) {
  const label = item.label.toLowerCase()
  const rest = `${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase()
  let total = 0
  for (const t of terms) {
    if (label.startsWith(t) || label.includes(` ${t}`)) total += 3
    else if (label.includes(t)) total += 2
    else if (rest.includes(t)) total += 1
    else return 0
  }
  return total
}

export function filter<T extends Pick<Command, "label" | "hint" | "keywords">>(
  items: T[],
  terms: string[],
  limit = 6,
) {
  return items
    .map((item) => ({ item, s: score(item, terms) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.item)
}

// The icon a remembered command was shown with.
export function iconOf(key: string): LucideIcon {
  const [kind, a, b] = key.split(":")
  if (kind === "section") return sectionFor(b ?? "")?.icon ?? BookOpen
  if (kind === "guide")
    return guides.find((g) => g.slug === a)?.icon ?? BookOpen
  return pages.find((p) => p.key === key)?.icon ?? BookOpen
}

// What was opened from the palette lately, per browser.

export type Recent = {
  kind: "server" | "storage" | "command"
  key: string
  label: string
  hint?: string
  href: string
}

const RECENT = "morcheh.palette.recent"
const EVENT = "morcheh:palette-recent"

function read(): Recent[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT) ?? "[]")
    return Array.isArray(value) ? value.filter((v) => v?.key && v?.href) : []
  } catch {
    return []
  }
}

export function remember(entry: Recent) {
  try {
    const list = [entry, ...read().filter((r) => r.key !== entry.key)]
    localStorage.setItem(RECENT, JSON.stringify(list.slice(0, 5)))
    window.dispatchEvent(new Event(EVENT))
  } catch {}
}

export function forget(key: string) {
  try {
    const list = read().filter((r) => r.key !== key)
    localStorage.setItem(RECENT, JSON.stringify(list))
    window.dispatchEvent(new Event(EVENT))
  } catch {}
}

export function useRecent() {
  const [list, setList] = useState<Recent[]>([])
  useEffect(() => {
    const load = () => setList(read())
    load()
    window.addEventListener(EVENT, load)
    window.addEventListener("storage", load)
    return () => {
      window.removeEventListener(EVENT, load)
      window.removeEventListener("storage", load)
    }
  }, [])
  return list
}
