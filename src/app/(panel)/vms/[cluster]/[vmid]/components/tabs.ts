import {
  Camera,
  Cloud,
  Cpu,
  HardDriveDownload,
  History,
  LayoutDashboard,
  type LucideIcon,
  Shield,
  SquareTerminal,
} from "lucide-react"

import type { Level } from "@/components/auth/level"
import type { PVEGuest } from "@/lib/services"

import { type VmTab, vmTabs } from "../../../components/meta"

export type TabMeta = {
  label: string
  icon: LucideIcon
  // The least a person needs to open it (the backend refuses below that).
  min: Level
  // Whether the machine has it at all (a container has no cloud-init).
  has?: (g: Pick<PVEGuest, "kind" | "template">) => boolean
}

export const tabMeta: Record<VmTab, TabMeta> = {
  overview: { label: "Overview", icon: LayoutDashboard, min: "viewer" },
  console: {
    label: "Console",
    icon: SquareTerminal,
    min: "engineer",
    has: (g) => !g.template,
  },
  hardware: { label: "Hardware", icon: Cpu, min: "viewer" },
  snapshots: {
    label: "Snapshots",
    icon: Camera,
    min: "viewer",
    has: (g) => !g.template,
  },
  backups: { label: "Backups", icon: HardDriveDownload, min: "viewer" },
  "cloud-init": {
    label: "Cloud-init",
    icon: Cloud,
    min: "engineer",
    has: (g) => g.kind === "qemu",
  },
  firewall: { label: "Firewall", icon: Shield, min: "viewer" },
  activity: { label: "Activity", icon: History, min: "viewer" },
}

export function tabOf(pathname: string): VmTab {
  const last = pathname.split("/").filter(Boolean).at(-1) ?? ""
  return (vmTabs as readonly string[]).includes(last)
    ? (last as VmTab)
    : "overview"
}

// The tabs this machine has; `can` hides the ones above the person's level.
export function tabsFor(
  g: Pick<PVEGuest, "kind" | "template">,
  can: (min: Level) => boolean,
) {
  return vmTabs.filter((t) => {
    const m = tabMeta[t]
    return (!m.has || m.has(g)) && can(m.min)
  })
}
