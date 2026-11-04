import {
  Boxes,
  CalendarClock,
  Database,
  EthernetPort,
  FolderOpen,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Network,
  Power,
  Rocket,
  Server,
  ServerCog,
  ShieldBan,
  SquareTerminal,
  Users,
  Workflow,
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
// app/help/content/. The help index, the article pages and the
// "Guide" link in each page's header follow.
export const guides: GuideMeta[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "What Morcheh does, how the panel is laid out, and a first setup.",
    icon: Rocket,
    group: "Basics",
    keywords: [
      "intro",
      "workspace",
      "navigation",
      "phone",
      "mobile",
      "search",
      "command palette",
      "ctrl k",
      "shortcuts",
    ],
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
      "credentials",
      "show password",
      "reveal",
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
    slug: "network-map",
    title: "Network map",
    summary:
      "See which servers share a network and which can reach each other, on one canvas.",
    icon: Network,
    group: "Basics",
    keywords: [
      "network",
      "topology",
      "graph",
      "subnet",
      "lan",
      "vpn",
      "wireguard",
      "tailscale",
      "docker",
      "ping",
      "reachability",
      "firewall",
      "matrix",
    ],
    routes: ["/network"],
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
      "Browse, edit, upload and download files over SFTP, fix permissions and see what takes the disk space.",
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
      "disk usage",
      "du",
      "ncdu",
      "space",
      "full",
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
  {
    slug: "services",
    title: "Services",
    summary:
      "Start, stop and restart services, read their logs live, override their settings and run your own apps.",
    icon: ServerCog,
    group: "On a server",
    keywords: [
      "systemd",
      "systemctl",
      "openrc",
      "daemon",
      "unit",
      "journal",
      "journalctl",
      "logs",
      "override",
      "enable",
      "boot",
      "failed",
      "nginx",
    ],
    routes: ["/servers/*/services"],
  },
  {
    slug: "power",
    title: "Reboot & shut down",
    summary:
      "Reboot or shut down a server, now or on a timer, and see when a reboot is needed.",
    icon: Power,
    group: "On a server",
    keywords: [
      "reboot",
      "restart",
      "shutdown",
      "power off",
      "schedule",
      "uptime",
      "kernel",
    ],
    routes: [],
  },
  {
    slug: "databases",
    title: "Databases",
    summary:
      "Watch PostgreSQL, MySQL, SQL Server, MongoDB and Redis: health checks, live sessions, slow queries and replication.",
    icon: Database,
    group: "Infrastructure",
    keywords: [
      "postgres",
      "postgresql",
      "mysql",
      "mariadb",
      "sql server",
      "mssql",
      "mongodb",
      "redis",
      "monitoring",
      "health",
      "check",
      "limit",
      "mute",
      "session",
      "kill",
      "blocking",
      "lock",
      "slow query",
      "explain",
      "replication",
      "replica",
      "tls",
      "docker",
      "connection string",
    ],
    routes: ["/databases", "/databases/*", "/servers/*/databases"],
  },
  {
    slug: "service-launcher",
    title: "Services",
    summary:
      "Your team's web services in one place: open them in a click and copy their logins, with access levels and a log.",
    icon: Boxes,
    group: "Infrastructure",
    keywords: [
      "web service",
      "app",
      "launcher",
      "bookmark",
      "link",
      "dashboard",
      "portainer",
      "grafana",
      "login",
      "account",
      "username",
      "password",
      "copy password",
      "shared sheet",
      "spreadsheet",
      "category",
      "drag",
      "favicon",
      "logo",
      "critical",
      "log",
      "activity",
    ],
    routes: ["/services"],
  },
  {
    slug: "ansible",
    title: "Ansible",
    summary:
      "Write playbooks, run them on servers picked by name, tag or folder, and follow each task live.",
    icon: Workflow,
    group: "Infrastructure",
    keywords: [
      "playbook",
      "automation",
      "inventory",
      "yaml",
      "run",
      "deploy",
      "configuration",
      "check mode",
      "dry run",
      "diff",
      "recap",
      "become",
      "sudo",
      "python",
    ],
    routes: ["/ansible", "/ansible/playbooks/*", "/ansible/runs/*"],
  },
  {
    slug: "cronjobs",
    title: "Sync cron jobs",
    summary:
      "Copy folders on a schedule between servers and storages: backups, mirrors and dated snapshots, run by Morcheh itself.",
    icon: CalendarClock,
    group: "Infrastructure",
    keywords: [
      "schedule",
      "sync",
      "backup",
      "mirror",
      "snapshot",
      "copy",
      "storage",
      "server",
      "rsync",
      "timer",
      "@every",
      "timezone",
      "retention",
      "exclude",
    ],
    routes: ["/cronjobs", "/cronjobs/*", "/cronjobs/*/edit"],
  },
  {
    slug: "storage",
    title: "Storage",
    summary:
      "Connect S3, FTP, SFTP and WebDAV storages, browse them and send files to and from your servers.",
    icon: HardDrive,
    group: "Storage",
    keywords: [
      "s3",
      "minio",
      "bucket",
      "ftp",
      "ftps",
      "sftp",
      "webdav",
      "nextcloud",
      "backup",
      "transfer",
      "send",
      "import",
      "copy from storage",
      "share link",
      "r2",
      "credentials",
      "password",
      "secret key",
      "access key",
    ],
    routes: ["/storage", "/storage/*"],
  },
  {
    slug: "tasks",
    title: "Tasks",
    summary:
      "Follow, cancel and retry the copies, archives and downloads that run in the background.",
    icon: ListChecks,
    group: "Storage",
    keywords: [
      "job",
      "jobs",
      "queue",
      "background",
      "progress",
      "cancel",
      "retry",
      "download from url",
      "compress",
      "extract",
      "transfer",
    ],
    routes: ["/tasks"],
  },
  {
    slug: "access",
    title: "Members and access",
    summary:
      "Accounts, groups, workspaces and the four access levels: who can see and do what.",
    icon: KeyRound,
    group: "Administration",
    keywords: [
      "user",
      "users",
      "member",
      "admin",
      "role",
      "permission",
      "permissions",
      "rbac",
      "group",
      "workspace",
      "viewer",
      "operator",
      "engineer",
      "owner",
      "block",
      "approve",
      "registration",
      "sign up",
      "password",
      "login",
      "setup token",
      "reset admin",
      "reset-admin",
      "forgot password",
      "locked out",
    ],
    routes: [
      "/settings",
      "/settings/members",
      "/settings/members/*/access#grants",
      "/settings/groups",
      "/settings/groups/*/access#grants",
      "/settings/workspaces#workspaces",
      "/settings/workspaces/*#grants",
      "/servers/*/access#grants",
      "/account#account",
    ],
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
