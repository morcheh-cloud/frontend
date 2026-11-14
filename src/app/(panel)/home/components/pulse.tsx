"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowUpRight,
  LayoutGrid,
  Plus,
  RefreshCw,
  RotateCcw,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Sparkline } from "@/app/(panel)/proxy/components/live"
import type { StripState } from "@/components/charts/time-chart"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/utils"
import type { Home } from "../api"
import { type Health, type HomeLive, healthOf } from "../live"
import { toneText } from "./card"
import { type Kpi, kpis } from "./kpis"
import { HealthBar, useAddActions } from "./parts"
import { type HomeLayout, widgets } from "./widgets"

const ringStroke = {
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
} as const

// The workspace's health score as a ring: green when everything is fine,
// amber or red by the worst thing it counts.
export function HealthRing({
  health,
  size = 112,
  className,
}: {
  health: Health | null
  size?: number
  className?: string
}) {
  const r = 42
  const c = 2 * Math.PI * r
  const score = health?.score ?? 0
  return (
    <div
      role="img"
      aria-label={
        health
          ? `Health ${health.score} out of 100: ${health.label}`
          : "Health not known yet"
      }
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        {health && (
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            className={cn(
              "transition-[stroke-dashoffset] duration-700",
              ringStroke[health.tone],
            )}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-light tabular-nums",
            size >= 96 ? "text-heading" : "text-subheading",
          )}
        >
          {health ? health.score : "–"}
        </span>
        {size >= 96 && (
          <span
            className={cn(
              "text-caption",
              health ? toneText[health.tone] : "text-ash",
            )}
          >
            {health?.label ?? "Checking"}
          </span>
        )}
      </span>
    </div>
  )
}

export function Pulse({
  home,
  live,
  title,
  subtitle,
  layout,
}: {
  home: Home
  live: HomeLive
  title: string
  subtitle: string
  layout: HomeLayout
}) {
  const health = healthOf(home)
  const issues = home.issues.length + home.moreBroken
  const down = home.issues.filter((i) => i.tone === "destructive").length
  return (
    <section
      aria-label="Workspace health"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-6 px-6 py-5">
        <HealthRing health={health} />
        <div className="min-w-0 flex-1">
          <p className="font-label text-caption tracking-label text-ash uppercase">
            {home.workspace?.name ?? "Home"}
          </p>
          <h1 className="mt-1 truncate text-heading font-light">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground">
            <span>{subtitle}</span>
            {down > 0 && <Chip tone="destructive">{down} down</Chip>}
            {issues - down > 0 && (
              <Chip tone="warning">{issues - down} need a look</Chip>
            )}
            {health && (
              <span className="text-caption text-ash">
                {health.ok + health.warn + health.bad} things checked
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <Updated at={home.updatedAt} />
          <RefreshButton />
          <Customize layout={layout} />
          <AddMenu />
        </div>
      </div>
      {layout.shows("pulse") && (
        <ul className="grid grid-cols-2 border-t border-border sm:grid-cols-3 xl:grid-cols-6">
          {kpis(home, live).map((k) => (
            <li
              key={k.key}
              className="min-w-0 border-border max-xl:border-b [&:not(:last-child)]:border-e"
            >
              <KpiTile kpi={k} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Chip({
  tone,
  children,
}: {
  tone: "destructive" | "warning"
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium",
        tone === "destructive"
          ? "bg-destructive/10 text-destructive"
          : "bg-warning/10 text-warning",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "destructive" ? "bg-destructive" : "bg-warning",
        )}
      />
      {children}
    </span>
  )
}

function Updated({ at }: { at: number }) {
  const now = useNow(5000)
  if (!at) return null
  const s = Math.max(0, Math.round((now - at) / 1000))
  const text =
    s < 10 ? "just now" : s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`
  return (
    <span className="me-1 flex items-center gap-2 text-caption whitespace-nowrap text-ash max-lg:hidden">
      <span className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
        <span className="relative size-2 rounded-full bg-success" />
      </span>
      Live · updated {text}
    </span>
  )
}

export function useRefreshAll() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  return {
    busy,
    run: async () => {
      setBusy(true)
      try {
        await qc.refetchQueries({ type: "active" })
      } finally {
        setBusy(false)
      }
    },
  }
}

function RefreshButton() {
  const r = useRefreshAll()
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh"
            disabled={r.busy}
            onClick={r.run}
          />
        }
      >
        <RefreshCw className={cn(r.busy && "animate-spin")} />
      </TooltipTrigger>
      <TooltipContent>Refresh everything</TooltipContent>
    </Tooltip>
  )
}

function Customize({ layout }: { layout: HomeLayout }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Customize Home"
                  className="relative"
                />
              }
            />
          }
        >
          <LayoutGrid />
          {layout.hiddenCount > 0 && (
            <span className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-brand" />
          )}
        </TooltipTrigger>
        <TooltipContent>Customize Home</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 gap-0 p-0">
        <WidgetSwitches layout={layout} />
      </PopoverContent>
    </Popover>
  )
}

// The list of cards with a switch each; shared by the desktop popover and
// the phone sheet.
export function WidgetSwitches({ layout }: { layout: HomeLayout }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <p className="flex-1 text-body-sm font-medium">Show on Home</p>
        <Button
          variant="ghost"
          size="sm"
          disabled={layout.hiddenCount === 0}
          onClick={layout.reset}
        >
          <RotateCcw />
          Reset
        </Button>
      </div>
      <ul className="flex flex-col py-1">
        {widgets.map((w) => (
          <li key={w.id}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: the Switch renders the control */}
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 text-body-sm hover:bg-subtle md:min-h-9">
              <span className="flex-1">{w.label}</span>
              <Switch
                checked={layout.shows(w.id)}
                onCheckedChange={(on) => layout.set(w.id, on)}
              />
            </label>
          </li>
        ))}
      </ul>
      <p className="border-t border-border px-4 py-3 text-caption text-ash">
        Problems always show. Your choice is kept on this browser.
      </p>
    </div>
  )
}

function AddMenu() {
  const actions = useAddActions()
  if (actions.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>
        <Plus />
        Add
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Add to this workspace</DropdownMenuLabel>
          {actions.map((a) => (
            <DropdownMenuItem key={a.label} onClick={a.run}>
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const stripColor: Record<StripState, string> = {
  ok: "bg-success",
  some: "bg-warning",
  down: "bg-destructive",
  none: "bg-muted",
}

// A compact availability strip: one bar per bucket.
export function MiniStrip({
  states,
  className,
}: {
  states: StripState[]
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("flex h-6 items-stretch gap-px", className)}
    >
      {states.map((s, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: one per bucket
          key={i}
          className={cn("min-w-0 flex-1 rounded-[2px]", stripColor[s])}
        />
      ))}
    </span>
  )
}

export function KpiChart({ kpi, className }: { kpi: Kpi; className?: string }) {
  if (kpi.strip) return <MiniStrip states={kpi.strip} className={className} />
  if (kpi.spark && kpi.spark.length > 1)
    return (
      <Sparkline
        values={kpi.spark}
        tone={kpi.sparkTone}
        className={cn("h-6 w-full", className)}
      />
    )
  if (kpi.tally)
    return (
      <span className={cn("flex h-6 items-center", className)}>
        <HealthBar tally={kpi.tally} className="w-full" />
      </span>
    )
  return <span className={cn("h-6", className)} />
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon
  return (
    <Link
      href={kpi.href}
      className="group flex h-full min-w-0 flex-col gap-2 px-5 py-4 outline-none hover:bg-subtle focus-visible:bg-muted"
    >
      <span className="flex items-center gap-2 text-caption text-muted-foreground">
        <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate">{kpi.label}</span>
        <ArrowUpRight className="size-3.5 shrink-0 text-ash opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </span>
      {kpi.value === null ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <span
          className={cn(
            "truncate text-heading leading-none font-light tabular-nums",
            kpi.tone && toneText[kpi.tone],
          )}
        >
          {kpi.value}
        </span>
      )}
      <KpiChart kpi={kpi} />
      <span className="truncate text-caption text-ash">{kpi.sub}</span>
    </Link>
  )
}
