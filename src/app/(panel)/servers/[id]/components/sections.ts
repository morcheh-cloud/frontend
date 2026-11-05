import {
  CalendarClock,
  ChartLine,
  Cpu,
  Database,
  EthernetPort,
  FileCode,
  FolderOpen,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  type LucideIcon,
  Package,
  PackageCheck,
  ScrollText,
  ServerCog,
  Settings,
  Shield,
  ShieldBan,
  ShieldCheck,
  SquareTerminal,
  Users,
  UsersRound,
} from "lucide-react"

import { atLeast, type Level } from "@/components/auth/level"

export type Section = {
  // URL segment under /servers/[id]; "" is the overview itself.
  slug: string
  label: string
  icon: LucideIcon
  summary: string
  // Built sections have their own folder in servers/[id]/; the rest render
  // the [section] placeholder, listing what is planned.
  ready?: boolean
  planned?: string[]
  // Desktop: the section fills the area under the tabs edge to edge (no
  // padding, no SectionActions), e.g. the terminal.
  bleed?: boolean
}

export type SectionGroup = { label?: string; sections: Section[] }

// Everything a server page can manage, in nav order. To add a feature: add
// (or flip `ready` on) its entry here and create servers/[id]/<slug>/page.tsx.
// The desktop tabs, the phone overview list and the breadcrumbs follow.
export const sectionGroups: SectionGroup[] = [
  {
    sections: [
      {
        slug: "",
        label: "Overview",
        icon: LayoutDashboard,
        summary: "Status, system and connection at a glance.",
        ready: true,
      },
    ],
  },
  {
    label: "System",
    sections: [
      {
        slug: "services",
        label: "Services",
        icon: ServerCog,
        summary: "The systemd units running on this server.",
        ready: true,
        planned: [
          "See every unit with its state, uptime and memory",
          "Start, stop, restart and enable a service",
          "Read a unit's recent journal without leaving the page",
        ],
      },
      {
        slug: "processes",
        label: "Processes",
        icon: Cpu,
        summary: "What is using CPU and memory right now.",
        planned: [
          "A live, sortable process list",
          "Send a signal or kill a process",
        ],
      },
      {
        slug: "packages",
        label: "Packages",
        icon: Package,
        summary: "Installed packages and pending updates.",
        planned: [
          "Search installed packages (apt, dnf, apk…)",
          "See available and security updates",
          "Upgrade one package or everything",
        ],
      },
      {
        slug: "users",
        label: "Users & groups",
        icon: Users,
        summary: "Local accounts, groups and sudo rights.",
        ready: true,
      },
      {
        slug: "storage",
        label: "Storage",
        icon: HardDrive,
        summary: "Disks, mounts and what fills them.",
        planned: [
          "Usage per mount, with warnings before a disk fills",
          "Find the largest directories",
        ],
      },
    ],
  },
  {
    label: "Network",
    sections: [
      {
        slug: "firewall",
        label: "Firewall",
        icon: Shield,
        ready: true,
        summary:
          "Open or close ports and block addresses, with ufw or firewalld. A change that could lock you out undoes itself.",
      },
      {
        slug: "ports",
        label: "Open ports",
        icon: EthernetPort,
        summary:
          "What listens on which port, and which service or container owns it.",
        ready: true,
      },
    ],
  },
  {
    label: "Security",
    sections: [
      {
        slug: "fail2ban",
        label: "Fail2ban",
        icon: ShieldBan,
        summary: "Ban addresses that keep failing to log in.",
        ready: true,
      },
      {
        slug: "ssh-hardening",
        label: "SSH hardening",
        icon: ShieldCheck,
        summary: "How sshd lets people in, checked against good practice.",
        planned: [
          "Audit sshd_config: root login, passwords, ciphers",
          "Fix a finding in one click, with a test login before it applies",
        ],
      },
      {
        slug: "updates",
        label: "Automatic updates",
        icon: PackageCheck,
        summary: "Security updates installed without you.",
        planned: [
          "Turn on unattended-upgrades or dnf-automatic",
          "See what was updated and whether a reboot is waiting",
        ],
      },
    ],
  },
  {
    label: "Automation",
    sections: [
      {
        slug: "cron",
        label: "Cron jobs",
        icon: CalendarClock,
        ready: true,
        summary: "Scheduled jobs for every user on the server.",
        planned: [
          "Every crontab and systemd timer in one list",
          "Add or edit a job with a readable schedule (“every day at 03:00”)",
          "Run a job now and see its output",
        ],
      },
      {
        slug: "scripts",
        label: "Scripts",
        icon: FileCode,
        summary: "Saved commands to run here or on many servers.",
        planned: [
          "Run a saved script and stream its output",
          "Keep a history of who ran what",
        ],
      },
    ],
  },
  {
    label: "Files & logs",
    sections: [
      {
        slug: "files",
        label: "Files",
        icon: FolderOpen,
        summary: "Browse, edit, upload and download over SFTP.",
        ready: true,
        bleed: true,
      },
      {
        slug: "logs",
        label: "Logs",
        icon: ScrollText,
        summary: "The journal and log files, searchable and live.",
        planned: [
          "Tail the journal or any log file",
          "Filter by unit, level and time",
        ],
      },
    ],
  },
  {
    label: "Monitoring",
    sections: [
      {
        slug: "databases",
        label: "Databases",
        icon: Database,
        summary: "Health and live activity of the databases on this server.",
        ready: true,
      },
      {
        slug: "metrics",
        label: "Metrics",
        icon: ChartLine,
        summary: "CPU, memory, disk and network over time.",
        planned: [
          "Charts for the last hour, day and month",
          "Alert rules for this server",
        ],
      },
    ],
  },
  {
    label: "Access",
    sections: [
      {
        slug: "terminal",
        label: "Terminal",
        icon: SquareTerminal,
        summary: "Shells on this server, in the browser.",
        ready: true,
        bleed: true,
      },
      {
        slug: "access",
        label: "Panel access",
        icon: UsersRound,
        summary: "Who can use this server in Morcheh, and how far.",
        ready: true,
      },
      {
        slug: "keys",
        label: "Authorized keys",
        icon: KeyRound,
        summary: "Who can log in to this server with an SSH key.",
        planned: [
          "List and remove keys in authorized_keys",
          "Add a key from your SSH Keys library",
        ],
      },
    ],
  },
]

// Pinned below the groups, like the panel's own Settings.
export const settingsSection: Section = {
  slug: "settings",
  label: "Settings",
  icon: Settings,
  summary: "Connection, organization, host key and deletion.",
  ready: true,
}

const all = [...sectionGroups.flatMap((g) => g.sections), settingsSection]

// The level each section needs; everything else opens from Viewer up. Keep in
// step with the backend's policy table.
const MIN: Record<string, Level> = {
  files: "operator",
  terminal: "engineer",
  settings: "owner",
  access: "owner",
}

export function sectionMin(section: Section): Level {
  return MIN[section.slug] ?? "viewer"
}

// The groups as this level sees them: no links to what would only refuse.
export function sectionsFor(level: string) {
  return sectionGroups
    .map((g) => ({
      ...g,
      sections: g.sections.filter((s) => atLeast(level, sectionMin(s))),
    }))
    .filter((g) => g.sections.length > 0)
}

export function sectionFor(slug: string) {
  return all.find((s) => s.slug === slug)
}

export function sectionHref(serverId: string, slug: string) {
  return slug ? `/servers/${serverId}/${slug}` : `/servers/${serverId}`
}
