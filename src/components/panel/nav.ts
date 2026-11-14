import {
  Activity,
  Bell,
  BellRing,
  Boxes,
  CalendarClock,
  CircleArrowUp,
  CircleHelp,
  CircleUser,
  Container,
  Database,
  Disc3,
  FileCode,
  FileCog,
  Globe,
  HardDrive,
  HeartPulse,
  House,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  ListChecks,
  Logs,
  type LucideIcon,
  MonitorCog,
  Network,
  Palette,
  RefreshCcwDot,
  ScrollText,
  Server,
  ServerCog,
  Settings,
  ShieldCheck,
  Split,
  Warehouse,
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
// Proxmox VE: VMs and LXC containers on the clusters linked to the workspace.
export const vmsItem: NavItem = {
  href: "/vms",
  label: "Virtual machines",
  icon: MonitorCog,
}
export const networkMapItem: NavItem = {
  href: "/network",
  label: "Network map",
  icon: Waypoints,
}
// Docker / Podman on every server: containers, images, volumes, networks.
export const containersItem: NavItem = {
  href: "/containers",
  label: "Containers",
  icon: Container,
}

// The Containers section has its own sidebar (like Arcane's): clicking
// Containers swaps the main menu for these groups, with a way back.
export const dockerGroups: NavGroup[] = [
  {
    label: "Management",
    items: [
      { href: "/containers", label: "Dashboard", icon: LayoutDashboard },
      { href: "/containers/updates", label: "Updates", icon: CircleArrowUp },
      {
        href: "/containers/auto-update",
        label: "Auto-update",
        icon: RefreshCcwDot,
      },
      { href: "/containers/security", label: "Security", icon: ShieldCheck },
      { href: "/containers/projects", label: "Projects", icon: Layers },
      {
        href: "/containers/environments",
        label: "Environments",
        icon: ServerCog,
      },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/containers/list", label: "Containers", icon: Container },
      { href: "/containers/images", label: "Images", icon: Disc3 },
      { href: "/containers/networks", label: "Networks", icon: Network },
      { href: "/containers/volumes", label: "Volumes", icon: HardDrive },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/containers/alerts", label: "Alerts", icon: BellRing },
      { href: "/containers/events", label: "Event log", icon: Logs },
      {
        href: "/containers/templates",
        label: "Customization",
        icon: Palette,
        children: [
          { href: "/containers/templates", label: "Templates" },
          { href: "/containers/registries", label: "Registries" },
        ],
      },
      { href: "/containers/daemon", label: "Engine config", icon: FileCog },
      { href: "/containers/settings", label: "Settings", icon: Settings },
    ],
  },
]

// Every Containers page, children included, for breadcrumbs and phone rows.
export const dockerPages: NavItem[] = dockerGroups.flatMap((g) =>
  g.items.flatMap((item) =>
    item.children
      ? item.children.map((c) => ({
          ...c,
          icon: c.href.endsWith("registries") ? Warehouse : LayoutTemplate,
        }))
      : [item],
  ),
)

// The Containers page that owns a path: the longest match, so
// /containers/projects/x is Projects and not the Dashboard.
export function dockerPageFor(pathname: string) {
  const href = currentChild(pathname, dockerPages)
  return dockerPages.find((p) => p.href === href)
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
// Every command Morche ran on a server, and terminal replays.
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
    { href: "/settings/security", label: "Security" },
    { href: "/settings/logs", label: "Logs & archives" },
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
      vmsItem,
      networkMapItem,
      containersItem,
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
  if (section === containersItem) {
    const page = dockerPageFor(pathname)
    if (!page || page.href === section.href) return [section]
    return [section, page]
  }

  const child = section.children?.find(
    (c) => c.href === currentChild(pathname, section.children ?? []),
  )
  if (!child || child.href === section.href) return [section]
  return [section, child]
}
