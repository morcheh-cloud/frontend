import { Loader2, Server as ServerIcon } from "lucide-react"
import Image from "next/image"

import type { Server } from "@/lib/services"
import { cn } from "@/lib/utils"

type Status = Server["status"]

export const statusMeta: Record<Status, { label: string; dot: string }> = {
  online: { label: "Online", dot: "bg-success" },
  unreachable: { label: "Unreachable", dot: "bg-destructive" },
  auth_failed: { label: "Auth failed", dot: "bg-warning" },
  host_key_mismatch: { label: "Host key changed", dot: "bg-destructive" },
  error: { label: "Error", dot: "bg-destructive" },
  unknown: { label: "Not checked", dot: "bg-mist" },
}

export function StatusDot({
  status,
  checking = false,
  className,
}: {
  status: Status
  checking?: boolean
  className?: string
}) {
  if (checking) {
    return (
      <Loader2
        aria-label="Checking"
        className={cn("size-3 shrink-0 animate-spin text-ash", className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        statusMeta[status].dot,
        className,
      )}
    />
  )
}

export const authLabel = {
  password: "Password",
  private_key: "Private key",
} as const

// os-release ID → logo in public/os/ (Simple Icons, CC0, filled with the
// brand color). Derivatives that keep their parent's ID (Kubuntu, Proxmox,
// TrueNAS…) show the parent's logo.
const logos: Record<string, string> = {
  ubuntu: "ubuntu",
  debian: "debian",
  centos: "centos",
  rocky: "rockylinux",
  almalinux: "almalinux",
  rhel: "redhat",
  fedora: "fedora",
  alpine: "alpinelinux",
  arch: "archlinux",
  opensuse: "opensuse",
  "opensuse-leap": "opensuse",
  "opensuse-tumbleweed": "opensuse",
  "opensuse-microos": "opensuse",
  sles: "suse",
  sled: "suse",
  "sle-micro": "suse",
  linuxmint: "linuxmint",
  kali: "kalilinux",
  gentoo: "gentoo",
  nixos: "nixos",
  manjaro: "manjaro",
  "manjaro-arm": "manjaro",
  elementary: "elementary",
  pop: "popos",
  zorin: "zorin",
  raspbian: "raspberrypi",
  void: "voidlinux",
  endeavouros: "endeavouros",
  mx: "mxlinux",
  deepin: "deepin",
  slackware: "slackware",
  solus: "solus",
  garuda: "garudalinux",
  artix: "artixlinux",
  parrot: "parrotsecurity",
  qubes: "qubesos",
  openwrt: "openwrt",
  freebsd: "freebsd",
  openbsd: "openbsd",
  netbsd: "netbsd",
  macos: "apple",
}

// Logos drawn in our near-black: flipped to near-white in dark mode.
const inkLogos = new Set(["almalinux", "apple", "mxlinux", "slackware"])

// Two-letter monograms for systems without a logo: we only use lucide icons,
// and lucide has no distro logos.
const monograms: Record<string, string> = {
  amzn: "AL",
  ol: "OL",
  windows: "Win",
}

export function osLabel(os: Server["os"]) {
  if (!os.id) return "Unknown OS"
  return [os.name || os.id, os.version].filter(Boolean).join(" ")
}

export function OsTile({
  os,
  className,
}: {
  os: Server["os"]
  className?: string
}) {
  const logo = logos[os.id]
  if (logo) {
    return (
      <span
        title={osLabel(os)}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card",
          className,
        )}
      >
        <Image
          src={`/os/${logo}.svg`}
          alt={osLabel(os)}
          width={64}
          height={64}
          className={cn("size-[55%]", inkLogos.has(logo) && "dark:invert")}
        />
      </span>
    )
  }
  const mono = os.id
    ? (monograms[os.id] ??
      (os.name || os.id).slice(0, 2).replace(/^./, (c) => c.toUpperCase()))
    : null
  return (
    <span
      title={osLabel(os)}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-caption font-medium tracking-normal text-muted-foreground",
        className,
      )}
    >
      {mono ?? <ServerIcon className="size-4" strokeWidth={1.75} />}
    </span>
  )
}

export function sshCommand(s: Pick<Server, "host" | "port" | "username">) {
  const host = s.host.includes(":") ? `[${s.host}]` : s.host
  return s.port === 22
    ? `ssh ${s.username}@${host}`
    : `ssh -p ${s.port} ${s.username}@${host}`
}

export function address(s: Pick<Server, "host" | "port" | "username">) {
  return `${s.username}@${s.host}${s.port === 22 ? "" : `:${s.port}`}`
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]

export function timeAgo(iso: string | null) {
  if (!iso) return "Never"
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit)
    }
  }
  return "Just now"
}
