"use client"

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type {
  InstalledPackage,
  PackageActionBody,
  PackageChange,
  PackagesOverview,
} from "@/lib/services"

export const tabs = ["installed", "updates", "history"] as const
export type Tab = (typeof tabs)[number]

export const shows = [
  "all",
  "manual",
  "auto",
  "held",
  "removable",
  "leftovers",
  "broken",
] as const
export type Show = (typeof shows)[number]

export const sorts = ["name", "size", "changed"] as const
export type Sort = (typeof sorts)[number]

const kinds = ["all", "security"] as const
export type Kind = (typeof kinds)[number]

export function usePackageFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("installed"),
      q: parseAsString.withDefault(""),
      show: parseAsStringLiteral(shows).withDefault("all"),
      sort: parseAsStringLiteral(sorts).withDefault("name"),
      kind: parseAsStringLiteral(kinds).withDefault("all"),
    },
    { history: "replace" },
  )
  return { filters, setFilters }
}

export const managerLabels: Record<PackagesOverview["manager"], string> = {
  apt: "APT",
  dnf: "DNF",
  yum: "YUM",
  zypper: "Zypper",
  apk: "apk",
  pacman: "pacman",
  none: "No package manager",
}

export const showLabels: Record<Show, string> = {
  all: "All",
  manual: "Installed by hand",
  auto: "Dependencies",
  held: "Held",
  removable: "Not needed",
  leftovers: "Settings left",
  broken: "Broken",
}

export const showHints: Record<Show, string> = {
  all: "Every package on the server.",
  manual: "Installed on purpose, not pulled in by another package.",
  auto: "Pulled in because another package needs it.",
  held: "Kept at their version: upgrades leave them alone.",
  removable: "Nothing needs them any more: Remove unneeded takes them.",
  leftovers: "Removed, but their configuration files are still there.",
  broken: "Half installed or half removed: the manager needs to finish.",
}

export function inShow(p: InstalledPackage, show: Show) {
  switch (show) {
    case "manual":
      return p.state === "installed" && !p.auto
    case "auto":
      return p.state === "installed" && p.auto
    case "held":
      return p.held
    case "removable":
      return p.removable
    case "leftovers":
      return p.state === "config-files"
    case "broken":
      return p.state === "broken"
    default:
      return true
  }
}

function matches(p: InstalledPackage, q: string) {
  if (!q) return true
  const t = q.trim().toLowerCase()
  return (
    p.name.toLowerCase().includes(t) ||
    (p.summary?.toLowerCase().includes(t) ?? false)
  )
}

const byName = (a: InstalledPackage, b: InstalledPackage) =>
  a.name.localeCompare(b.name)

export function installedList(
  o: PackagesOverview,
  show: Show,
  q: string,
  sort: Sort,
) {
  const list = o.packages.filter((p) => inShow(p, show) && matches(p, q))
  if (sort === "size")
    return list.sort((a, b) => b.size - a.size || byName(a, b))
  if (sort === "changed") {
    return list.sort(
      (a, b) =>
        (b.changed_at ? Date.parse(b.changed_at) : 0) -
          (a.changed_at ? Date.parse(a.changed_at) : 0) || byName(a, b),
    )
  }
  return list.sort(byName)
}

// Security fixes first, then by name.
export function updateList(o: PackagesOverview, kind: Kind, q: string) {
  return o.packages
    .filter((p) => p.latest && (kind === "all" || p.security) && matches(p, q))
    .sort((a, b) => Number(!!b.security) - Number(!!a.security) || byName(a, b))
}

export const showCount = (o: PackagesOverview, show: Show) =>
  o.packages.filter((p) => inShow(p, show)).length

// ---- Actions ----

export type Action = PackageActionBody["action"]

export const changeMeta: Record<
  PackageChange["action"],
  { label: string; verb: string; tone: "brand" | "danger" | "muted" }
> = {
  install: { label: "Install", verb: "Installed", tone: "brand" },
  upgrade: { label: "Upgrade", verb: "Upgraded", tone: "brand" },
  downgrade: { label: "Downgrade", verb: "Downgraded", tone: "danger" },
  remove: { label: "Remove", verb: "Removed", tone: "danger" },
  purge: { label: "Remove with settings", verb: "Purged", tone: "danger" },
  reinstall: { label: "Reinstall", verb: "Reinstalled", tone: "muted" },
}

// The dialog's title and button for an action.
export function actionText(b: PackageActionBody) {
  const names = b.names ?? []
  const one = names.length === 1 ? names[0] : `${names.length} packages`
  switch (b.action) {
    case "install":
      return {
        title: b.version ? `Install ${one} ${b.version}` : `Install ${one}`,
        button: "Install",
      }
    case "remove":
      return { title: `Remove ${one}`, button: "Remove" }
    case "purge":
      return { title: `Remove ${one} and its settings`, button: "Remove" }
    case "upgrade":
      return { title: `Upgrade ${one}`, button: "Upgrade" }
    case "reinstall":
      return { title: `Reinstall ${one}`, button: "Reinstall" }
    case "upgrade-all":
      return b.mode === "security"
        ? { title: "Install security updates", button: "Install" }
        : b.mode === "full"
          ? { title: "Full upgrade", button: "Upgrade" }
          : { title: "Upgrade all packages", button: "Upgrade" }
    case "autoremove":
      return { title: "Remove unneeded packages", button: "Remove" }
    case "clean":
      return { title: "Empty the package cache", button: "Empty" }
  }
}

export const destructive = (b: PackageActionBody) =>
  b.action === "remove" || b.action === "purge" || b.action === "autoremove"

// Packages the system can't run without: removing one asks for the server's
// name first. Not exhaustive; the manager's own "essential" warning backs it.
const vital = new Set([
  "apt",
  "dpkg",
  "bash",
  "coreutils",
  "libc6",
  "glibc",
  "systemd",
  "openssh-server",
  "openssh",
  "sudo",
  "rpm",
  "dnf",
  "yum",
  "zypper",
  "apk-tools",
  "pacman",
  "busybox",
  "musl",
  "util-linux",
  "login",
  "passwd",
  "linux-image-generic",
  "grub-pc",
  "grub2",
  "python3",
])

export const isVital = (name: string) => vital.has(name)

// "2.4.1-1ubuntu1" → shown whole, but long ones get cut in tables.
export function shortVersion(v: string | undefined, max = 28) {
  if (!v) return ""
  return v.length > max ? `${v.slice(0, max - 1)}…` : v
}
