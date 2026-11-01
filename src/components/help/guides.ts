import {
  CalendarClock,
  EthernetPort,
  FolderOpen,
  LayoutDashboard,
  type LucideIcon,
  Rocket,
  Server,
  ShieldBan,
  SquareTerminal,
  Users,
} from "lucide-react"

export type GuideMeta = {
  slug: string
  title: string
  summary: string
  icon: LucideIcon
  group: string
  // Extra words the help search should match.
  keywords: string[]
  // Pages whose header links here. `*` matches one path segment; a `#id`
  // suffix opens the guide at that section.
  routes: string[]
}

// Every guide, in reading order. A new feature ships with its guide: add an
// entry here (with the routes it covers) and its content in
// app/(panel)/help/content/. The help index, the article pages and the
// "Guide" link in each page's header follow.
export const guides: GuideMeta[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "What Morcheh does, how the panel is laid out, and a first setup.",
    icon: Rocket,
    group: "Basics",
    keywords: ["intro", "workspace", "navigation", "phone", "mobile"],
    routes: ["/home"],
  },
  {
    slug: "servers",
    title: "Servers",
    summary:
      "Add servers over SSH, organize them with folders and tags, and read their status.",
    icon: Server,
    group: "Basics",
    keywords: [
      "add",
      "ssh",
      "password",
      "private key",
      "folder",
      "tag",
      "favorite",
      "host key",
      "status",
      "filter",
      "delete",
    ],
    routes: ["/servers", "/servers/*/settings#server-settings"],
  },
  {
    slug: "server-overview",
    title: "Server overview",
    summary:
      "A server's page: live CPU, memory, disk and network, and what each status means.",
    icon: LayoutDashboard,
    group: "Basics",
    keywords: ["resources", "cpu", "memory", "disk", "uptime", "live", "load"],
    routes: ["/servers/*"],
  },
  {
    slug: "terminal",
    title: "Terminal",
    summary:
      "Shells in the browser that keep running across reloads, with tabs and history.",
    icon: SquareTerminal,
    group: "On a server",
    keywords: ["shell", "ssh", "console", "tabs", "copy", "paste", "keyboard"],
    routes: ["/servers/*/terminal"],
  },
  {
    slug: "files",
    title: "Files",
    summary:
      "Browse, edit, upload and download files over SFTP, and fix permissions.",
    icon: FolderOpen,
    group: "On a server",
    keywords: [
      "sftp",
      "upload",
      "download",
      "editor",
      "permissions",
      "chmod",
      "zip",
      "archive",
    ],
    routes: ["/servers/*/files"],
  },
  {
    slug: "cron",
    title: "Cron jobs",
    summary:
      "Schedule commands, run them on demand, and see systemd timers and periodic scripts.",
    icon: CalendarClock,
    group: "On a server",
    keywords: ["schedule", "crontab", "timer", "systemd", "backup", "periodic"],
    routes: ["/servers/*/cron"],
  },
  {
    slug: "ports",
    title: "Open ports",
    summary:
      "What listens on which port, who owns it, and which ports are exposed.",
    icon: EthernetPort,
    group: "On a server",
    keywords: [
      "network",
      "listen",
      "docker",
      "firewall",
      "exposed",
      "database",
    ],
    routes: ["/servers/*/ports"],
  },
  {
    slug: "fail2ban",
    title: "Fail2ban",
    summary:
      "Ban addresses that keep failing to log in: jails, bans, filters and good defaults.",
    icon: ShieldBan,
    group: "On a server",
    keywords: ["ban", "brute force", "jail", "security", "regex", "ssh"],
    routes: ["/servers/*/fail2ban"],
  },
  {
    slug: "users",
    title: "Users & groups",
    summary:
      "Add, lock and remove accounts, manage groups and decide who can use sudo.",
    icon: Users,
    group: "On a server",
    keywords: ["account", "user", "group", "sudo", "password", "lock", "root"],
    routes: ["/servers/*/users"],
  },
]

export function guideFor(slug: string) {
  return guides.find((g) => g.slug === slug)
}

export function guideHref(slug: string, anchor?: string) {
  return anchor ? `/help/${slug}#${anchor}` : `/help/${slug}`
}

function matches(pattern: string, pathname: string) {
  const want = pattern.split("/")
  const have = pathname.replace(/\/$/, "").split("/")
  return (
    want.length === have.length &&
    want.every((s, i) => s === "*" || s === have[i])
  )
}

// The guide for a page, and the link into it, if it has one.
export function guideForPath(pathname: string) {
  for (const guide of guides) {
    for (const route of guide.routes) {
      const [pattern, anchor] = route.split("#")
      if (matches(pattern, pathname)) {
        return { guide, href: guideHref(guide.slug, anchor) }
      }
    }
  }
  return undefined
}
