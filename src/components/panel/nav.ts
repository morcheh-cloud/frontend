import {
  Activity,
  Bell,
  Boxes,
  CalendarClock,
  CircleHelp,
  CircleUser,
  Database,
  FileCode,
  Globe,
  HardDrive,
  HeartPulse,
  House,
  KeyRound,
  LayoutGrid,
  ListChecks,
  type LucideIcon,
  ScrollText,
  Server,
  Settings,
  Split,
  Waypoints,
  Workflow,
} from "lucide-react"

export type NavLink = { href: string; label: string }
export type NavItem = NavLink & { icon: LucideIcon; children?: NavLink[] }
export type NavGroup = { label?: string; items: NavItem[] }

// The panel's seven sections. A section with children expands in the sidebar;
// its first child is the section's own page. Only /home has a page so far.
export const homeItem: NavItem = { href: "/home", label: "Home", icon: House }
export const serversItem: NavItem = {
  href: "/servers",
  label: "Servers",
  icon: Server,
}
export const networkMapItem: NavItem = {
  href: "/network",
  label: "Network map",
  icon: Waypoints,
}
export const storageItem: NavItem = {
  href: "/storage",
  label: "Storage",
  icon: HardDrive,
}
export const dnsItem: NavItem = {
  href: "/dns",
  label: "DNS",
  icon: Globe,
}
export const proxyItem: NavItem = {
  href: "/proxy",
  label: "Reverse proxy",
  icon: Split,
}
export const databasesItem: NavItem = {
  href: "/databases",
  label: "Databases",
  icon: Database,
}
export const tasksItem: NavItem = {
  href: "/tasks",
  label: "Tasks",
  icon: ListChecks,
}
export const servicesItem: NavItem = {
  href: "/services",
  label: "Services",
  icon: Boxes,
}
export const applicationsItem: NavItem = {
  href: "/applications",
  label: "Applications",
  icon: LayoutGrid,
}
export const ansibleItem: NavItem = {
  href: "/ansible",
  label: "Ansible",
  icon: Workflow,
}
export const scriptsItem: NavItem = {
  href: "/scripts",
  label: "Scripts",
  icon: FileCode,
}
export const cronjobsItem: NavItem = {
  href: "/cronjobs",
  label: "Cron jobs",
  icon: CalendarClock,
}
export const monitoringItem: NavItem = {
  href: "/monitoring",
  label: "Monitoring",
  icon: Activity,
  children: [
    { href: "/monitoring", label: "Overview" },
    { href: "/monitoring/metrics", label: "Metrics" },
    { href: "/monitoring/logs", label: "Logs" },
  ],
}
// Uptime checks: its own section (not under Monitoring).
export const uptimeItem: NavItem = {
  href: "/uptime",
  label: "Uptime",
  icon: HeartPulse,
}
// Where notifications go (email, Telegram, Slack…), shared by every feature
// that sends one.
export const alertsItem: NavItem = {
  href: "/alerts",
  label: "Alerts",
  icon: Bell,
}
// Every command Morcheh ran on a server, and terminal replays.
export const recordingsItem: NavItem = {
  href: "/recordings",
  label: "Audit log",
  icon: ScrollText,
}
export const keysItem: NavItem = {
  href: "/keys",
  label: "SSH Keys",
  icon: KeyRound,
}
export const settingsItem: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  children: [
    { href: "/settings", label: "General" },
    { href: "/settings/members", label: "Members" },
    { href: "/settings/groups", label: "Groups" },
    { href: "/settings/workspaces", label: "Workspaces" },
  ],
}

export const accountItem: NavItem = {
  href: "/account",
  label: "Account",
  icon: CircleUser,
}

export const helpItem: NavItem = {
  href: "/help",
  label: "Help",
  icon: CircleHelp,
}

// Sidebar order. Help and Settings sit apart, pinned to the bottom.
export const navGroups: NavGroup[] = [
  { label: "Platform", items: [homeItem, tasksItem] },
  {
    label: "Infrastructure",
    items: [
      serversItem,
      networkMapItem,
      databasesItem,
      storageItem,
      dnsItem,
      proxyItem,
      servicesItem,
      applicationsItem,
      ansibleItem,
      scriptsItem,
      cronjobsItem,
      keysItem,
    ],
  },
  {
    label: "Observability",
    items: [uptimeItem, monitoringItem, alertsItem, recordingsItem],
  },
]

const allItems = [
  ...navGroups.flatMap((g) => g.items),
  helpItem,
  settingsItem,
  accountItem,
]

// An admin sees all of Settings; someone who owns a workspace manages that
// workspace; nobody else has anything there.
export function settingsFor(admin: boolean, ownsWorkspace: boolean) {
  if (admin) return settingsItem
  if (!ownsWorkspace) return null
  return { ...settingsItem, href: "/settings/workspaces", children: undefined }
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

// The child that owns the current page: the longest matching href, so
// /monitoring/metrics selects "Metrics" and not the "Overview" at /monitoring.
export function currentChild(pathname: string, children: NavLink[]) {
  let current: string | undefined
  for (const child of children) {
    if (
      isActive(pathname, child.href) &&
      child.href.length > (current?.length ?? 0)
    ) {
      current = child.href
    }
  }
  return current
}

// Where the page sits in the nav: its section, then the sub-page when it is
// not the section's own page.
export function breadcrumbFor(pathname: string): NavLink[] {
  const section = allItems.find((item) => isActive(pathname, item.href))
  if (!section) return []

  const child = section.children?.find(
    (c) => c.href === currentChild(pathname, section.children ?? []),
  )
  if (!child || child.href === section.href) return [section]
  return [section, child]
}
