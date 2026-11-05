"use client"

import {
  Activity,
  Bell,
  Boxes,
  Cloud,
  Database,
  FileText,
  GitBranch,
  Globe,
  type LucideIcon,
  Package,
  Puzzle,
  Server,
  ShieldCheck,
  SquareTerminal,
  Users,
  Workflow,
} from "lucide-react"
import { Fragment, type ReactNode } from "react"

import type { Module } from "@/lib/services"
import { cn } from "@/lib/utils"

// The backend sorts every module into one of these (ansible/modules.go).
export const categories: {
  key: string
  label: string
  icon: LucideIcon
  hint: string
}[] = [
  {
    key: "packages",
    label: "Packages",
    icon: Package,
    hint: "Install, update and remove software; repositories and keys",
  },
  {
    key: "files",
    label: "Files",
    icon: FileText,
    hint: "Copy, template, edit lines, permissions, downloads, archives",
  },
  {
    key: "commands",
    label: "Commands",
    icon: SquareTerminal,
    hint: "Run a command, a shell line or a script",
  },
  {
    key: "system",
    label: "System",
    icon: Server,
    hint: "Services, cron, hostname, reboot, facts",
  },
  {
    key: "users",
    label: "Users & access",
    icon: Users,
    hint: "Users, groups, SSH keys and known hosts",
  },
  {
    key: "network",
    label: "Network & web",
    icon: Globe,
    hint: "HTTP calls, waiting for ports, firewalls",
  },
  {
    key: "security",
    label: "Security",
    icon: ShieldCheck,
    hint: "Certificates, keys, SELinux",
  },
  {
    key: "source",
    label: "Source control",
    icon: GitBranch,
    hint: "Check out code from Git and others",
  },
  {
    key: "containers",
    label: "Containers",
    icon: Boxes,
    hint: "Docker, Podman, Kubernetes",
  },
  {
    key: "databases",
    label: "Databases",
    icon: Database,
    hint: "Databases, users and grants",
  },
  {
    key: "cloud",
    label: "Cloud & VMs",
    icon: Cloud,
    hint: "Cloud providers and virtual machines",
  },
  {
    key: "monitoring",
    label: "Monitoring",
    icon: Activity,
    hint: "Monitoring tools",
  },
  {
    key: "notify",
    label: "Notifications",
    icon: Bell,
    hint: "Mail and chat messages",
  },
  {
    key: "flow",
    label: "Playbook flow",
    icon: Workflow,
    hint: "Messages, checks, variables, pauses, including other tasks",
  },
  { key: "other", label: "Other", icon: Puzzle, hint: "Everything else" },
]

const byKey = new Map(categories.map((c) => [c.key, c]))
export const categoryOf = (key: string) =>
  byKey.get(key) ?? categories[categories.length - 1]

// Picked first when nothing is searched yet.
export const popular = [
  "ansible.builtin.package",
  "ansible.builtin.apt",
  "ansible.builtin.copy",
  "ansible.builtin.template",
  "ansible.builtin.file",
  "ansible.builtin.lineinfile",
  "ansible.builtin.command",
  "ansible.builtin.shell",
  "ansible.builtin.systemd_service",
  "ansible.builtin.user",
  "ansible.builtin.get_url",
  "ansible.builtin.git",
  "ansible.builtin.cron",
  "ansible.builtin.debug",
]

export function ModuleIcon({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  const Icon = categoryOf(category).icon
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  )
}

// Every word must match the name or the description; name hits rank first.
export function searchModules(items: Module[], q: string, category?: string) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const inCat = category ? items.filter((m) => m.category === category) : items
  if (words.length === 0) return inCat
  const scored: { m: Module; score: number }[] = []
  for (const m of inCat) {
    const name = m.name.toLowerCase()
    const desc = m.description.toLowerCase()
    let score = 0
    let ok = true
    for (const w of words) {
      if (m.short_name.toLowerCase() === w) score += 100
      else if (m.short_name.toLowerCase().startsWith(w)) score += 40
      else if (name.includes(w)) score += 20
      else if (desc.includes(w)) score += 5
      else {
        ok = false
        break
      }
    }
    if (ok) {
      // Builtin first among equals: it's always there.
      if (m.collection === "ansible.builtin") score += 1
      scored.push({ m, score })
    }
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.m)
}

// Ansible's doc markup: C(code), O(option), V(value), I(italic), B(bold),
// U(url), L(text,url), M(module), E(env), RV(return value), P(plugin).
const markup = /\b(RV|[CIBOVUMLEP])\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g

export function DocText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(markup)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const [, kind, inner] = m
    const key = i++
    if (kind === "I") out.push(<em key={key}>{inner}</em>)
    else if (kind === "B") {
      out.push(
        <strong key={key} className="font-medium">
          {inner}
        </strong>,
      )
    } else if (kind === "U") {
      out.push(<Ext key={key} href={inner} text={inner} />)
    } else if (kind === "L") {
      const comma = inner.lastIndexOf(",")
      out.push(
        <Ext
          key={key}
          href={inner.slice(comma + 1).trim()}
          text={inner.slice(0, comma).trim()}
        />,
      )
    } else {
      // O(name=value) shows as name=value; the rest as plain code.
      out.push(
        <code
          key={key}
          className="rounded bg-muted px-1 py-px font-mono text-[0.9em] text-foreground"
        >
          {inner.replace(/^[a-z0-9_.]+#[a-z]+:/i, "")}
        </code>,
      )
    }
    last = at + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return (
    <span className={className}>
      {out.map((n, k) =>
        typeof n === "string" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static text pieces
          <Fragment key={`t${k}`}>{n}</Fragment>
        ) : (
          n
        ),
      )}
    </span>
  )
}

function Ext({ href, text }: { href: string; text: string }) {
  if (!/^https?:\/\//.test(href)) return <>{text}</>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-brand underline-offset-2 hover:underline"
    >
      {text}
    </a>
  )
}

// Plain text of doc markup, for one-line places (titles, list rows).
export const plain = (text: string) =>
  text.replace(markup, (_, kind: string, inner: string) =>
    kind === "L" ? inner.slice(0, inner.lastIndexOf(",")) : inner,
  )
