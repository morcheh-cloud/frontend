import {
  Activity,
  Bell,
  Boxes,
  CircleHelp,
  CircleUser,
  Database,
  HardDrive,
  House,
  KeyRound,
  ListChecks,
  type LucideIcon,
  Server,
  Settings,
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
  children: [
    { href: "/servers", label: "All servers" },
    { href: "/servers/network", label: "Network map" },
  ],
}
export const storageItem: NavItem = {
  href: "/storage",
  label: "Storage",
  icon: HardDrive,
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
  children: [
    { href: "/services", label: "Overview" },
    { href: "/services/checks", label: "Health checks" },
  ],
}
export const monitoringItem: NavItem = {
  href: "/monitoring",
  label: "Monitoring",
  icon: Activity,
  children: [
    { href: "/monitoring", label: "Overview" },
    { href: "/monitoring/metrics", label: "Metrics" },
    { href: "/monitoring/uptime", label: "Uptime" },
    { href: "/monitoring/logs", label: "Logs" },
  ],
}
export const alertsItem: NavItem = {
  href: "/alerts",
  label: "Alerts",
  icon: Bell,
  children: [
    { href: "/alerts", label: "Overview" },
    { href: "/alerts/rules", label: "Rules" },
    { href: "/alerts/channels", label: "Channels" },
  ],
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
    items: [serversItem, databasesItem, storageItem, servicesItem, keysItem],
  },
  { label: "Observability", items: [monitoringItem, alertsItem] },
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
