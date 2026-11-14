import {
  Activity,
  Bell,
  Bot,
  Box,
  ChartLine,
  Cloud,
  Code,
  Container,
  Cpu,
  Database,
  DatabaseBackup,
  FileCode,
  Flame,
  Gauge,
  GitBranch,
  GitFork,
  Globe,
  HardDrive,
  HeartPulse,
  Hexagon,
  KeyRound,
  Layers,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  Network,
  Package,
  Rocket,
  ScrollText,
  Search,
  Server,
  Shield,
  ShieldCheck,
  SquareTerminal,
  Video,
  Workflow,
  Wrench,
} from "lucide-react"
import Image from "next/image"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import { softwareBroken } from "@/components/panel/problems"
import type {
  Recipe,
  RecipeLink,
  SoftwareInstall,
  SoftwareRun,
} from "@/lib/services"
import { cn } from "@/lib/utils"

export type RunAction = SoftwareRun["action"]

// ---- Icons ----

// The lucide icons a recipe may name. A name not listed falls back to one
// for its kind, so a custom recipe never breaks the page.
export const recipeIcons: Record<string, LucideIcon> = {
  activity: Activity,
  bell: Bell,
  bot: Bot,
  box: Box,
  "chart-line": ChartLine,
  cloud: Cloud,
  code: Code,
  container: Container,
  cpu: Cpu,
  database: Database,
  "database-backup": DatabaseBackup,
  "file-code": FileCode,
  flame: Flame,
  gauge: Gauge,
  "git-branch": GitBranch,
  "git-fork": GitFork,
  globe: Globe,
  "hard-drive": HardDrive,
  "heart-pulse": HeartPulse,
  hexagon: Hexagon,
  "key-round": KeyRound,
  layers: Layers,
  "layout-dashboard": LayoutDashboard,
  lock: Lock,
  mail: Mail,
  "message-square": MessageSquare,
  network: Network,
  package: Package,
  rocket: Rocket,
  "scroll-text": ScrollText,
  search: Search,
  server: Server,
  shield: Shield,
  "shield-check": ShieldCheck,
  terminal: SquareTerminal,
  video: Video,
  workflow: Workflow,
  wrench: Wrench,
}

const kindIcons: Record<Recipe["kind"], LucideIcon> = {
  package: Package,
  script: FileCode,
}

export function iconOf(r: { icon?: string; kind: Recipe["kind"] }) {
  return (r.icon && recipeIcons[r.icon]) || kindIcons[r.kind]
}

// Brand logos in public/apps (Simple Icons 16.36.0, filled with the brand
// color). A recipe names one in `logo`; a name we don't ship falls back to
// the icon.
// Logos of retired recipes stay: earlier installs still show them.
export const appLogos = [
  "docker",
  "git",
  "gitea",
  "grafana",
  "htop",
  "k3s",
  "mariadb",
  "minio",
  "mysql",
  "n8n",
  "nginx",
  "nodedotjs",
  "podman",
  "portainer",
  "postgresql",
  "prometheus",
  "python",
  "qemu",
  "rclone",
  "redis",
  "tailscale",
  "uptimekuma",
  "vaultwarden",
  "wireguard",
  "wordpress",
]
// Near-black logos: turned light in the dark theme.
export const inkLogos = new Set(["mariadb", "tailscale", "vaultwarden"])

const tileSizes = {
  xs: "size-5 rounded-md",
  sm: "size-8 rounded-lg",
  md: "size-10 rounded-xl",
  lg: "size-12 rounded-2xl",
}

export function RecipeIcon({
  recipe,
  className,
  size = "md",
}: {
  recipe: { icon?: string; logo?: string; kind: Recipe["kind"] }
  className?: string
  size?: "xs" | "sm" | "md" | "lg"
}) {
  const logo = recipe.logo && appLogos.includes(recipe.logo) && recipe.logo
  if (logo) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center border border-border bg-card",
          tileSizes[size],
          size === "xs" && "border-0 bg-transparent",
          className,
        )}
      >
        <Image
          src={`/apps/${logo}.svg`}
          alt=""
          width={64}
          height={64}
          className={cn(
            size === "xs" ? "size-4" : "size-[55%]",
            inkLogos.has(logo) && "dark:invert",
          )}
        />
      </span>
    )
  }
  const Icon = iconOf(recipe)
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center bg-brand-soft text-brand-strong",
        tileSizes[size],
        size === "xs" && "[&_svg]:size-3",
        size === "sm" && "[&_svg]:size-4",
        size === "md" && "[&_svg]:size-5",
        size === "lg" && "[&_svg]:size-6",
        className,
      )}
    >
      <Icon />
    </span>
  )
}

// ---- Labels ----

export const kindLabels: Record<Recipe["kind"], string> = {
  package: "Package",
  script: "Script",
}

export const kindHints: Record<Recipe["kind"], string> = {
  package: "Installed with the server's package manager (apt, dnf…).",
  script: "Installed by a script from the vendor.",
}

export const statusLabels: Record<SoftwareInstall["status"], string> = {
  installing: "Installing",
  installed: "Installed",
  updating: "Updating",
  failed: "Failed",
  removing: "Removing",
  missing: "Not found",
}

export const actionLabels: Record<RunAction, string> = {
  install: "Install",
  update: "Update",
  uninstall: "Uninstall",
  "upgrade-system": "System upgrade",
}

// What a person sees in one word for an install: the worst news first.
export function installTone(i: SoftwareInstall) {
  if (i.status === "failed" || i.status === "missing") return "bad"
  if (i.status !== "installed") return "busy"
  if (i.update_available) return "update"
  return "ok"
}

export function installText(i: SoftwareInstall) {
  if (i.status !== "installed") return statusLabels[i.status]
  if (i.update_available) return "Update available"
  return "Installed"
}

export function InstallStatus({
  install,
  className,
}: {
  install: SoftwareInstall
  className?: string
}) {
  const tone = installTone(install)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap",
        tone === "bad" && "text-destructive",
        tone === "busy" && "text-brand",
        tone === "update" && "text-brand",
        tone === "ok" && "text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          tone === "bad" && "bg-destructive",
          (tone === "busy" || tone === "update") && "bg-brand",
          tone === "busy" && "animate-pulse",
          tone === "ok" && "bg-success",
        )}
      />
      {installText(install)}
    </span>
  )
}

export function versionText(i: Pick<SoftwareInstall, "version" | "latest">) {
  if (!i.version) return "—"
  return i.version
}

// ---- Links ----

// The address of a recipe link on one server: the port is a parameter's
// value (or its default) or a number.
export function linkHref(
  link: RecipeLink,
  host: string,
  params: Record<string, string>,
  recipe?: Recipe,
) {
  let port = link.port
  if (!/^\d+$/.test(port)) {
    port =
      params[port] ||
      recipe?.params?.find((p) => p.name === link.port)?.default ||
      ""
  }
  if (!port || !host) return ""
  // Only http(s), and a path that stays on this host: a custom recipe is
  // typed by a person, so nothing in it may turn into another kind of link.
  const scheme = link.scheme === "https" ? "https" : "http"
  const path =
    link.path?.startsWith("/") && !link.path.startsWith("//") ? link.path : ""
  const h = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host
  const plain =
    (scheme === "http" && port === "80") ||
    (scheme === "https" && port === "443")
  return `${scheme}://${h}${plain ? "" : `:${port}`}${path}`
}

// ---- URL state of /applications ----

export const tabs = ["catalog", "installed", "updates", "activity"] as const
export type Tab = (typeof tabs)[number]

export const tabLabels: Record<Tab, string> = {
  catalog: "Catalog",
  installed: "Installed",
  updates: "Updates",
  activity: "Activity",
}

const shows = ["all", "updates", "problems"] as const
export const showLabels: Record<(typeof shows)[number], string> = {
  all: "All",
  updates: "Updates",
  problems: "Problems",
}

const runShows = ["all", "running", "failed", "succeeded"] as const
export const runShowLabels: Record<(typeof runShows)[number], string> = {
  all: "All",
  running: "Running",
  failed: "Failed",
  succeeded: "Succeeded",
}

const filters = {
  tab: parseAsStringLiteral(tabs).withDefault("catalog"),
  q: parseAsString.withDefault(""),
  cat: parseAsString.withDefault(""),
  show: parseAsStringLiteral(shows).withDefault("all"),
  runs: parseAsStringLiteral(runShows).withDefault("all"),
}

export function useApplicationsFilters() {
  return useQueryStates(filters, { history: "replace" })
}

export const applicationsHref = createSerializer(filters)

export const runHref = (id: string) => `/applications/runs/${id}`
export const recipeHref = (recordId: string) =>
  `/applications/recipes/${recordId}`

// ---- Filtering ----

export function matchRecipe(r: Recipe, q: string) {
  if (!q) return true
  const t = q.toLowerCase()
  return [r.name, r.id, r.summary, r.category, r.description ?? ""].some((s) =>
    s.toLowerCase().includes(t),
  )
}

export function matchInstall(i: SoftwareInstall, q: string) {
  if (!q) return true
  const t = q.toLowerCase()
  return [i.name, i.recipe_id, i.server_name, i.version].some((s) =>
    s.toLowerCase().includes(t),
  )
}

// Same rule as the menu's red count.
export const installProblem = softwareBroken
