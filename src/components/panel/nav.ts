import {
  Bell,
  BellRing,
  Boxes,
  CalendarClock,
  CircleArrowUp,
  CircleHelp,
  CircleUser,
  Cloud,
  Container,
  Database,
  Disc3,
  FileCode,
  FileCog,
  Globe,
  HardDrive,
  HeartPulse,
  House,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  ListChecks,
  Logs,
  type LucideIcon,
  MonitorCog,
  Network,
  PackageSearch,
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

// A sub-page link. Every child is a page of its own (a route, never a tab of
// its parent's page; phones list them with `SectionLinks`). `href` may still
// carry a query: the link is then current when the URL has those values.
// `also` = more paths that belong to it (`*` = any one segment), e.g. a
// sync's own page under Syncs. `crumb` names it in the breadcrumb when it
// differs from the sidebar label.
export type NavLink = {
  href: string
  label: string
  also?: string[]
  crumb?: string
}
export type NavItem = NavLink & { icon: LucideIcon; children?: NavLink[] }
export type NavGroup = { label?: string; items: NavItem[] }

// The panel's sections. A section gets children only when its parts are
// separate things (Ansible: playbooks, modules, runs), never for tabs that
// just filter or view one list (proxy hosts vs redirections). Its first
// child is the section's own page; each other child has its own route.
export const homeItem: NavItem = { href: "/home", label: "Home", icon: House }
// The asset inventory: everything the organisation owns or pays for, with
// owners, dates and how things depend on each other.
export const assetsItem: NavItem = {
  href: "/assets",
  label: "Assets",
  icon: PackageSearch,
  children: [
    { href: "/assets", label: "Inventory", also: ["/assets/*"] },
    { href: "/assets/coverage", label: "Coverage" },
    { href: "/assets/discovery", label: "Discovery" },
    { href: "/assets/map", label: "Map" },
    { href: "/assets/owners", label: "Owners" },
    { href: "/assets/settings", label: "Settings" },
  ],
}
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
  children: [
    { href: "/vms", label: "Machines" },
    { href: "/vms/nodes", label: "Nodes" },
    { href: "/vms/storage", label: "Storage" },
    { href: "/vms/clusters", label: "Clusters" },
  ],
}
// Cloud provider accounts (ArvanCloud…); each account's page lists its servers.
export const cloudItem: NavItem = {
  href: "/cloud",
  label: "Cloud",
  icon: Cloud,
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
// Containers swaps the main menu for these groups, with a way back. Every
// page in them works on the environment (server) picked above them.
export const dockerGroups: NavGroup[] = [
  {
    label: "Management",
    items: [
      { href: "/containers", label: "Dashboard", icon: LayoutDashboard },
      { href: "/containers/updates", label: "Updates", icon: CircleArrowUp },
      { href: "/containers/security", label: "Security", icon: ShieldCheck },
      { href: "/containers/projects", label: "Projects", icon: Layers },
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
      { href: "/containers/daemon", label: "Engine config", icon: FileCog },
      { href: "/containers/settings", label: "Settings", icon: Settings },
    ],
  },
]

// The pages that cover every container server of the workspace, not the
// picked one: kept apart from the environment's menu (user rule).
export const dockerFleetGroup: NavGroup = {
  label: "All servers",
  items: [
    {
      href: "/containers/environments",
      label: "Environments",
      icon: ServerCog,
    },
    {
      href: "/containers/auto-update",
      label: "Auto-update",
      icon: RefreshCcwDot,
    },
    {
      href: "/containers/templates",
      label: "Templates",
      icon: LayoutTemplate,
    },
    { href: "/containers/registries", label: "Registries", icon: Warehouse },
    {
      href: "/containers/global-settings",
      label: "Global settings",
      icon: Globe,
    },
  ],
}

// Every Containers page, for breadcrumbs and phone rows.
export const dockerPages: NavItem[] = [...dockerGroups, dockerFleetGroup]
  .flatMap((g) => g.items)
  .flatMap((item) =>
    item.children
      ? item.children.map((c) => ({ ...c, icon: item.icon }))
      : [item],
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
  children: [
    { href: "/storage", label: "Insights" },
    { href: "/storage/list", label: "Storages", also: ["/storage/*"] },
    { href: "/storage/syncs", label: "Syncs" },
    { href: "/storage/migrations", label: "Migrations" },
  ],
}
export const dnsItem: NavItem = {
  href: "/dns",
  label: "DNS",
  icon: Globe,
  children: [
    { href: "/dns", label: "Zones" },
    { href: "/dns/servers", label: "Servers", also: ["/dns/*"] },
  ],
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
  children: [
    {
      href: "/applications",
      label: "Catalog",
      also: ["/applications/recipes"],
    },
    { href: "/applications/installed", label: "Installed" },
    { href: "/applications/updates", label: "Updates" },
    {
      href: "/applications/activity",
      label: "Activity",
      also: ["/applications/runs"],
    },
  ],
}
export const ansibleItem: NavItem = {
  href: "/ansible",
  label: "Ansible",
  icon: Workflow,
  children: [
    { href: "/ansible", label: "Playbooks", also: ["/ansible/playbooks"] },
    { href: "/ansible/modules", label: "Modules" },
    { href: "/ansible/runs", label: "Runs" },
  ],
}
export const scriptsItem: NavItem = {
  href: "/scripts",
  label: "Scripts",
  icon: FileCode,
  children: [
    { href: "/scripts", label: "Scripts" },
    { href: "/scripts/runs", label: "Runs" },
  ],
}
export const cronjobsItem: NavItem = {
  href: "/cronjobs",
  label: "Cron jobs",
  icon: CalendarClock,
}
// Uptime monitors (websites, ports, certificates, queues…), their incidents,
// and the alert rules + channels (the /alerts pages sit under it).
export const monitoringItem: NavItem = {
  href: "/monitoring",
  label: "Monitoring",
  icon: HeartPulse,
  children: [
    { href: "/monitoring", label: "Uptime" },
    { href: "/monitoring/incidents", label: "Incidents" },
    { href: "/alerts", label: "Alert rules" },
    { href: "/alerts/channels", label: "Channels", crumb: "Alert channels" },
    { href: "/alerts/activity", label: "Alert activity" },
  ],
}
// Alert rules and where notifications go (email, Telegram, Slack…). In the
// sidebar it sits under Monitoring; phones list it on its own.
export const alertsItem: NavItem = {
  href: "/alerts",
  label: "Alerts",
  icon: Bell,
}
// Every command Morche ran on a server, terminal replays and sign-ins.
export const recordingsItem: NavItem = {
  href: "/recordings",
  label: "Audit log",
  icon: ScrollText,
  children: [
    { href: "/recordings", label: "Commands" },
    { href: "/recordings/list", label: "Recordings" },
    { href: "/recordings/sign-ins", label: "Sign-ins" },
  ],
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
  { label: "Platform", items: [homeItem, assetsItem, servicesItem] },
  {
    label: "Infrastructure",
    items: [
      serversItem,
      vmsItem,
      cloudItem,
      containersItem,
      databasesItem,
      storageItem,
    ],
  },
  { label: "Network", items: [networkMapItem, dnsItem, proxyItem] },
  {
    label: "Automation",
    items: [applicationsItem, ansibleItem, scriptsItem, cronjobsItem],
  },
  {
    label: "Observability",
    items: [monitoringItem, recordingsItem, tasksItem],
  },
]

const allItems = [
  ...navGroups.flatMap((g) => g.items),
  alertsItem,
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

const pathOf = (href: string) => href.split("?")[0]

// Whether `pathname` is `pattern` or below it; `*` stands for one segment.
function under(pathname: string, pattern: string) {
  if (!pattern.includes("*")) return isActive(pathname, pattern)
  const have = pathname.split("/")
  const want = pattern.split("/")
  return (
    have.length >= want.length &&
    want.every((w, i) => w === "*" || w === have[i])
  )
}

// How well a link fits the page (-1 = not at all): the longer the matching
// path the better, and a link whose query matches beats a plain one on the
// same path.
function fit(pathname: string, search: URLSearchParams, link: NavLink) {
  const [path, query] = link.href.split("?")
  let best = -1
  if (isActive(pathname, path)) best = queryFit(path, query, search)
  for (const pattern of link.also ?? []) {
    const [p, q] = pattern.split("?")
    if (under(pathname, p)) best = Math.max(best, queryFit(p, q, search))
  }
  return best
}

function queryFit(
  path: string,
  query: string | undefined,
  search: URLSearchParams,
) {
  const want = [...new URLSearchParams(query ?? "")]
  if (!want.every(([k, v]) => search.get(k) === v)) return -1
  return path.length * 10 + want.length
}

// Whether the page belongs to the link, ignoring its query.
export function inLink(pathname: string, link: NavLink) {
  return (
    isActive(pathname, pathOf(link.href)) ||
    !!link.also?.some((p) => under(pathname, pathOf(p)))
  )
}

// The child that owns the current page: the best fit, so
// /containers/projects/x selects "Projects" and not the Dashboard.
export function currentChild(
  pathname: string,
  children: NavLink[],
  search = new URLSearchParams(),
) {
  let current: string | undefined
  let best = -1
  for (const child of children) {
    const score = fit(pathname, search, child)
    if (score > best) {
      best = score
      current = child.href
    }
  }
  return current
}

// Whether the page is inside a section (its own page or any sub-page).
export function inSection(pathname: string, item: NavItem) {
  return (
    isActive(pathname, item.href) ||
    !!item.children?.some((c) => inLink(pathname, c))
  )
}

// Where the page sits in the nav: its section, then the sub-page when it is
// on another path than the section's own page (tabs are left to the page).
export function breadcrumbFor(pathname: string): NavLink[] {
  // Sidebar sections first, so /alerts reads Monitoring › Alerts.
  const section = allItems.find((item) => inSection(pathname, item))
  if (!section) return []
  if (section === containersItem) {
    const page = dockerPageFor(pathname)
    if (!page || page.href === section.href) return [section]
    return [section, page]
  }

  const child = section.children?.find(
    (c) => c.href === currentChild(pathname, section.children ?? []),
  )
  if (!child || pathOf(child.href) === section.href) return [section]
  return [
    section,
    { href: pathOf(child.href), label: child.crumb ?? child.label },
  ]
}
