"use client"

import {
  Activity,
  ChartLine,
  Code,
  Container,
  Database,
  Film,
  Gamepad2,
  GitBranch,
  Globe,
  HardDrive,
  LayoutTemplate,
  LifeBuoy,
  ListTodo,
  type LucideIcon,
  Mail,
  MessagesSquare,
  Network,
  Rss,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Wallet,
  Workflow,
  Wrench,
} from "lucide-react"
import { useState } from "react"

import type { DockerTemplate } from "@/lib/services"
import { cn } from "@/lib/utils"
import { appLogos, inkLogos } from "../../applications/components/meta"
import { newSecret } from "./env-vars"
import { templateInkLogos, templatePaperLogos } from "./template-ink"

const categoryIcons: Record<string, LucideIcon> = {
  AI: Sparkles,
  Analytics: ChartLine,
  Automation: Workflow,
  Backend: Server,
  Communication: MessagesSquare,
  Containers: Container,
  Databases: Database,
  Development: Code,
  Email: Mail,
  Finance: Wallet,
  Games: Gamepad2,
  "Git & CI": GitBranch,
  Media: Film,
  Monitoring: Activity,
  "News & RSS": Rss,
  Networking: Network,
  Productivity: ListTodo,
  Search: Search,
  Security: ShieldCheck,
  Storage: HardDrive,
  Support: LifeBuoy,
  Tools: Wrench,
  Websites: Globe,
}

export function categoryIcon(category?: string): LucideIcon {
  return (category && categoryIcons[category]) || LayoutTemplate
}

// The images a compose file runs, read from its `image:` lines.
export function imagesOf(compose: string) {
  const out: string[] = []
  for (const m of compose.matchAll(/^\s*image:\s*["']?([^\s"'#]+)/gm)) {
    if (!out.includes(m[1])) out.push(m[1])
  }
  return out
}

// A template's logo: a name from the applications set (nginx →
// /apps/nginx.svg) or a file under /apps (templates/ghost.svg).
function logoOf(t: DockerTemplate) {
  const logo = t.logo
  if (!logo) return undefined
  if (logo.includes("/")) {
    if (!/^[\w./-]+\.(svg|webp|png)$/.test(logo) || logo.includes("..")) {
      return undefined
    }
    return {
      src: `/apps/${logo}`,
      ink: templateInkLogos.has(logo),
      paper: templatePaperLogos.has(logo),
    }
  }
  if (!appLogos.includes(logo)) return undefined
  return { src: `/apps/${logo}.svg`, ink: inkLogos.has(logo), paper: false }
}

export function TemplateIcon({
  t,
  className,
}: {
  t: DockerTemplate
  className?: string
}) {
  const logo = logoOf(t)
  const [broken, setBroken] = useState<string>()
  // A wordmark (much wider than tall) gets more width, else it's a sliver.
  const [wide, setWide] = useState<string>()
  const Icon = categoryIcon(t.category)
  const shown = logo && broken !== logo.src ? logo : undefined
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl",
        shown
          ? "border border-border bg-card"
          : "bg-brand-soft text-brand-strong",
        className,
      )}
    >
      {shown ? (
        // biome-ignore lint/performance/noImgElement: tiny static logos, already sized; the optimizer adds nothing
        <img
          src={shown.src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(shown.src)}
          onLoad={(e) => {
            const img = e.currentTarget
            if (img.naturalWidth > img.naturalHeight * 2) setWide(shown.src)
          }}
          className={cn(
            "object-contain",
            wide === shown.src ? "size-[80%]" : "size-[58%]",
            shown.ink && "dark:invert",
            shown.paper && "invert dark:invert-0",
          )}
        />
      ) : (
        <Icon className="size-[45%]" />
      )}
    </span>
  )
}

// How well a template matches a search: 0 = not at all. Every word must hit
// somewhere; the name counts most, then tags and category, then the rest.
export function templateScore(t: DockerTemplate, needle: string) {
  const words = needle.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const name = t.name.toLowerCase()
  const tags = [t.category, ...(t.tags ?? [])].join(" ").toLowerCase()
  const rest = [t.description, ...imagesOf(t.compose)].join(" ").toLowerCase()
  let score = 0
  for (const w of words) {
    if (name.startsWith(w)) score += 12
    else if (name.includes(w)) score += 8
    else if (tags.includes(w)) score += 4
    else if (rest.includes(w)) score += 1
    else return 0
  }
  return score + (t.featured ? 1 : 0)
}

// Popular ones first, then by name.
export function byPopular(a: DockerTemplate, b: DockerTemplate) {
  return (
    Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
    a.name.localeCompare(b.name)
  )
}

export function searchTemplates(list: DockerTemplate[], needle: string) {
  if (!needle.trim()) return [...list].sort(byPopular)
  return list
    .map((t) => ({ t, s: templateScore(t, needle) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.t.name.localeCompare(b.t.name))
    .map((x) => x.t)
}

// What a template's .env asks of you: the values to fill in, and how many
// passwords and keys Morche makes when the project starts.
export function envNeeds(env: string) {
  const fill: string[] = []
  let made = 0
  let section = ""
  for (const line of env.split("\n")) {
    const text = line.trim()
    if (text.startsWith("#")) {
      section = text
      continue
    }
    const m = text.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    if (/\{\{(secret|hex|base64)(:\d+)?\}\}/.test(m[2])) made++
    else if (/fill these in/i.test(section) && !m[2]) fill.push(m[1])
  }
  return { fill, made }
}

const LOWER = "abcdefghijklmnopqrstuvwxyz"

function randomBytes(n: number) {
  const bytes = new Uint8Array(n)
  crypto.getRandomValues(bytes)
  return bytes
}

// Fills a template's placeholders with fresh values, once per project:
// {{secret}} / {{secret:N}} = letters and digits, {{user}} = a lowercase
// name, {{hex:N}} = N hex digits, {{base64:N}} = N random bytes in base64,
// {{host}} = the server's address.
export function fillTemplate(text: string, host: string) {
  return text.replace(
    /\{\{(secret|user|hex|base64|host)(?::(\d+))?\}\}/g,
    (_, kind: string, size?: string) => {
      const n = size ? Math.min(Math.max(Number(size), 4), 256) : undefined
      switch (kind) {
        case "secret":
          return newSecret(n ?? 32)
        case "user":
          return Array.from(
            randomBytes(10),
            (b) => LOWER[b % LOWER.length],
          ).join("")
        case "hex":
          return Array.from(randomBytes(Math.ceil((n ?? 32) / 2)), (b) =>
            b.toString(16).padStart(2, "0"),
          )
            .join("")
            .slice(0, n ?? 32)
        case "base64":
          return btoa(String.fromCharCode(...randomBytes(n ?? 32)))
        default:
          return host
      }
    },
  )
}
