"use client"

// The colors and icons a service, a category or a workspace can wear. Keys
// are what the backend stores; the colors are the --color-svc-* tokens.

import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  Box,
  Boxes,
  Calendar,
  ChartLine,
  Cloud,
  Code,
  Container,
  Cpu,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  Monitor,
  Network,
  Router,
  Server,
  Settings,
  Shield,
  Store,
  Terminal,
  Ticket,
  Users,
  Workflow,
  Wrench,
} from "lucide-react"

import { cn } from "@/lib/utils"

export const appColorKeys = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "indigo",
  "violet",
  "pink",
] as const
export type AppColor = (typeof appColorKeys)[number]

// Written out in full so Tailwind sees every class.
export const appColors: Record<
  AppColor,
  { dot: string; tile: string; label: string }
> = {
  slate: { dot: "bg-svc-slate", tile: "bg-svc-slate", label: "Slate" },
  red: { dot: "bg-svc-red", tile: "bg-svc-red", label: "Red" },
  orange: { dot: "bg-svc-orange", tile: "bg-svc-orange", label: "Orange" },
  amber: { dot: "bg-svc-amber", tile: "bg-svc-amber", label: "Amber" },
  green: { dot: "bg-svc-green", tile: "bg-svc-green", label: "Green" },
  teal: { dot: "bg-svc-teal", tile: "bg-svc-teal", label: "Teal" },
  blue: { dot: "bg-svc-blue", tile: "bg-svc-blue", label: "Blue" },
  indigo: { dot: "bg-svc-indigo", tile: "bg-svc-indigo", label: "Indigo" },
  violet: { dot: "bg-svc-violet", tile: "bg-svc-violet", label: "Violet" },
  pink: { dot: "bg-svc-pink", tile: "bg-svc-pink", label: "Pink" },
}

export const colorOf = (key: string) =>
  appColors[key as AppColor] ?? appColors.slate

// The icons that can stand in for a picture. Keys are what the backend
// stores in `logo_icon`.
export const appIcons: Record<string, LucideIcon> = {
  globe: Globe,
  server: Server,
  database: Database,
  "hard-drive": HardDrive,
  cloud: Cloud,
  container: Container,
  box: Box,
  boxes: Boxes,
  "git-branch": GitBranch,
  code: Code,
  terminal: Terminal,
  workflow: Workflow,
  "chart-line": ChartLine,
  gauge: Gauge,
  activity: Activity,
  bell: Bell,
  shield: Shield,
  lock: Lock,
  "key-round": KeyRound,
  network: Network,
  router: Router,
  cpu: Cpu,
  monitor: Monitor,
  "layout-dashboard": LayoutDashboard,
  mail: Mail,
  "message-square": MessageSquare,
  users: Users,
  ticket: Ticket,
  calendar: Calendar,
  "file-text": FileText,
  "book-open": BookOpen,
  store: Store,
  bot: Bot,
  wrench: Wrench,
  settings: Settings,
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: AppColor
  onChange: (color: AppColor) => void
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-body-sm font-medium">Color</legend>
      <div
        role="radiogroup"
        aria-label="Color"
        className="flex flex-wrap gap-1"
      >
        {appColorKeys.map((key) => (
          // biome-ignore lint/a11y/useSemanticElements: color swatches; radio inputs can't be styled as these
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            aria-label={appColors[key].label}
            title={appColors[key].label}
            onClick={() => onChange(key)}
            className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8"
          >
            <span
              className={cn(
                "size-6 rounded-full ring-offset-2 ring-offset-background md:size-5",
                appColors[key].dot,
                value === key && "ring-2 ring-foreground",
              )}
            />
          </button>
        ))}
      </div>
    </fieldset>
  )
}
