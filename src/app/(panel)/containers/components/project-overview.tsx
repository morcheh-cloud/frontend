"use client"

import {
  Activity,
  ArrowUpRight,
  BellRing,
  Box,
  ChevronRight,
  Cpu,
  FileCode2,
  FolderOpen,
  Gauge,
  HeartPulse,
  Loader2,
  type LucideIcon,
  MemoryStick,
  Network,
  Pencil,
  Plug,
  RefreshCcwDot,
  ScrollText,
  ShieldCheck,
  Timer,
} from "lucide-react"
import Link from "next/link"
import { createSerializer, parseAsString } from "nuqs"
import { type ReactNode, useId, useState } from "react"
import { toast } from "sonner"

import { MultiLineChart, Tip } from "@/components/charts/time-chart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { formatSize } from "@/lib/format"
import type {
  DockerProjectContainer,
  DockerProjectDetails,
  DockerProjectStats,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { type Note, Notices } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  useDockerEvents,
  useDockerScans,
  useDockerUpdates,
  useSaveProjectMeta,
} from "../api"
import { describeEvent, keyed } from "./events-view"
import {
  ImageLogo,
  securityHref,
  splitRef,
  updatesHref,
  VulnSummary,
} from "./image-meta"
import { containerHref, Dot, imageName, type Tone } from "./meta"
import { CopyButton, Quiet } from "./parts"
import { projectSourceMeta } from "./project-actions"
import { readiness, scoreTone } from "./project-production"
import {
  CPU_FLOOR,
  containerTone,
  memoryShare,
  PortLink,
  pct,
  rate,
  Spark,
  shareTone,
  upFor,
  useServerAddress,
} from "./project-stats"
import { ProjectTrends } from "./project-trends"

export type ProjectTab =
  | "overview"
  | "containers"
  | "logs"
  | "production"
  | "alerts"
  | "auto-update"
  | "files"
  | "environment"
  | "history"
  | "git"

// A project's Overview: a hero (its words, the containers as a ring, health,
// ports, ways in), the live numbers, the usage over time, then who uses what,
// what happened lately, how ready it is, its images and its files.
export function ProjectOverview({
  p,
  stats,
  statsPending,
  serverId,
  canManage,
  canFiles,
  firing,
  deploying,
  phone,
  onTab,
}: {
  p: DockerProjectDetails
  stats: DockerProjectStats | undefined
  statsPending: boolean
  // A deploy is running: containers coming and going is expected.
  deploying: boolean
  serverId: string
  canManage: boolean
  canFiles: boolean
  firing: number
  phone: boolean
  onTab: (t: ProjectTab) => void
}) {
  const notes: Note[] = []
  if (p.missing) {
    notes.push({
      key: "missing",
      title: "Its compose file isn't on the server",
      body: "The containers are still there, but the file they were made from was moved or deleted. You can stop or take them down; to deploy again, put the file back.",
      warn: true,
    })
  } else if (p.state === "partial" && !deploying) {
    notes.push({
      key: "partial",
      title: "Some of its containers aren't running",
      body: "Open the Containers tab to see which, read their logs, or Redeploy to bring every service up.",
      warn: true,
      action: (
        <Button variant="outline" size="sm" onClick={() => onTab("logs")}>
          Read the logs
        </Button>
      ),
    })
  }
  if (firing > 0) {
    notes.push({
      key: "firing",
      title: `${firing} alert ${firing === 1 ? "rule is" : "rules are"} firing for this project`,
      body: "See which one on the Alerts tab.",
      warn: true,
      action: (
        <Button variant="outline" size="sm" onClick={() => onTab("alerts")}>
          <BellRing />
          Alerts
        </Button>
      ),
    })
  }
  if (!p.managed && !p.missing) {
    notes.push({
      key: "external",
      title: `Outside the projects folder · ${projectSourceMeta[p.source].label.toLowerCase()}`,
      body: "Morche runs the same compose commands on it and edits its files in place. Destroy and Stop listing leave its folder alone.",
    })
  }
  const containers = stats?.containers ?? []

  return (
    <div className="flex flex-col gap-6 max-md:gap-5">
      <Notices notes={notes} className="max-md:-mx-4" />
      <Hero
        p={p}
        stats={stats}
        pending={statsPending}
        serverId={serverId}
        canEdit={canManage}
        canFiles={canFiles}
        firing={firing}
        phone={phone}
        onTab={onTab}
      />
      <Numbers stats={stats} pending={statsPending} phone={phone} />
      <ProjectTrends
        serverId={serverId}
        project={p.name}
        phone={phone}
        live={
          stats ? (
            <History stats={stats} phone={phone} />
          ) : (
            <Skeleton className="h-60 rounded-2xl" />
          )
        }
      />
      <div className="@container">
        <div className="flex flex-col gap-6 @5xl:flex-row @5xl:items-start">
          <div className="flex min-w-0 flex-col gap-6 @5xl:flex-[2]">
            {containers.some((c) => c.state === "running") && stats && (
              <ShareCard stats={stats} serverId={serverId} phone={phone} />
            )}
            <ImagesCard
              p={p}
              containers={containers}
              serverId={serverId}
              phone={phone}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-6 @5xl:flex-1">
            {containers.length > 0 && (
              <ReadinessCard
                containers={containers}
                phone={phone}
                onOpen={() => onTab("production")}
              />
            )}
            <ActivityCard serverId={serverId} project={p.name} phone={phone} />
            <AboutCard
              p={p}
              phone={phone}
              onFiles={canFiles ? () => onTab("files") : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Cards ------------------------------------------------------------------

// A card on desktop, a full-width group on phones (native lists, no floating
// cards on the canvas).
function Card({
  title,
  icon: Icon,
  aside,
  phone,
  className,
  children,
}: {
  title: string
  icon: LucideIcon
  aside?: ReactNode
  phone: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 border border-border bg-card",
        phone ? "-mx-4 border-x-0 p-4" : "rounded-2xl p-5",
        className,
      )}
    >
      <div className="flex min-h-8 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Icon className="size-4" />
        </span>
        <h3 className="text-body-sm font-medium">{title}</h3>
        {aside && <div className="ms-auto flex items-center">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

// --- Hero -------------------------------------------------------------------

function Hero({
  p,
  stats: s,
  pending,
  serverId,
  canEdit,
  canFiles,
  firing,
  phone,
  onTab,
}: {
  p: DockerProjectDetails
  stats: DockerProjectStats | undefined
  pending: boolean
  serverId: string
  canEdit: boolean
  canFiles: boolean
  firing: number
  phone: boolean
  onTab: (t: ProjectTab) => void
}) {
  const [editing, setEditing] = useState(false)
  const address = useServerAddress(serverId)
  const containers = s?.containers ?? []
  const ports = uniquePorts(s?.ports ?? [])
  const score = containers.length ? readiness(containers).score : undefined
  const health = healthOf(s)

  const links: { tab: ProjectTab; label: string; icon: LucideIcon }[] = [
    { tab: "containers", label: "Containers", icon: Box },
    { tab: "logs", label: "Logs", icon: ScrollText },
    { tab: "production", label: "Production", icon: ShieldCheck },
    { tab: "alerts", label: "Alerts", icon: BellRing },
    { tab: "auto-update", label: "Auto-update", icon: RefreshCcwDot },
  ]
  if (canFiles) links.push({ tab: "files", label: "Files", icon: FileCode2 })

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border border-border bg-card",
        phone ? "-mx-4 border-x-0" : "rounded-3xl",
      )}
    >
      {/* A soft indigo glow from the ring's corner; tokens, so both themes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(42rem_22rem_at_0%_0%,var(--color-brand-soft),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-0 -z-10 w-1/2 bg-[radial-gradient(28rem_18rem_at_100%_100%,var(--color-brand-soft),transparent_70%)] opacity-60"
      />
      <div
        className={cn(
          "flex flex-col",
          phone ? "gap-5 px-4 py-5" : "gap-6 p-6 lg:p-8",
        )}
      >
        <div
          className={cn(
            "flex gap-6",
            phone ? "flex-col items-center text-center" : "items-center",
          )}
        >
          {s || !pending ? (
            <Orbit
              containers={containers}
              running={s?.running ?? 0}
              total={s?.total ?? p.total}
              size={phone ? 148 : 168}
            />
          ) : (
            <Skeleton
              className={cn(
                "shrink-0 rounded-full",
                phone ? "size-37" : "size-42",
              )}
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                phone && "justify-center",
              )}
            >
              <span className="font-label text-caption tracking-label text-brand-strong uppercase">
                Compose project
              </span>
              {s && <LivePill at={s.measured_at} />}
            </div>
            {editing ? (
              <MetaForm
                p={p}
                serverId={serverId}
                phone={phone}
                onDone={() => setEditing(false)}
              />
            ) : (
              <Words
                p={p}
                canEdit={canEdit}
                phone={phone}
                onEdit={() => setEditing(true)}
              />
            )}
            <div
              className={cn("flex flex-wrap gap-2", phone && "justify-center")}
            >
              <Fact icon={HeartPulse} tone={health.tone}>
                {health.text}
              </Fact>
              {s?.since && upFor(s.since) && (
                <Fact icon={Timer}>Up {upFor(s.since)}</Fact>
              )}
              {!!s?.restarts && (
                <Fact icon={Activity} tone="warning">
                  {s.restarts} {s.restarts === 1 ? "restart" : "restarts"}
                </Fact>
              )}
              {firing > 0 && (
                <Fact icon={BellRing} tone="destructive">
                  {firing} firing
                </Fact>
              )}
              <Fact icon={Box}>
                {p.services.length}{" "}
                {p.services.length === 1 ? "service" : "services"}
              </Fact>
            </div>
          </div>
          {score !== undefined && !phone && (
            <button
              type="button"
              onClick={() => onTab("production")}
              className="group hidden shrink-0 flex-col items-center gap-2 rounded-2xl p-3 text-center outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 lg:flex"
            >
              <Ring
                value={score}
                size={88}
                className={scoreTone(score)}
                label="ready"
              />
              <span className="flex items-center gap-1 text-caption text-muted-foreground group-hover:text-foreground">
                Production ready
                <ChevronRight className="size-3.5" />
              </span>
            </button>
          )}
        </div>

        {ports.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              phone && "justify-center",
            )}
          >
            <span className="flex items-center gap-1.5 text-caption text-ash">
              <Plug className="size-3.5" />
              Published
            </span>
            {ports.map((port) => (
              <span
                key={`${port.ip}-${port.public}-${port.proto}`}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background/70 px-3 font-mono text-caption"
              >
                <PortLink p={port} address={address} />
              </span>
            ))}
          </div>
        )}

        <nav
          aria-label="Project sections"
          className={cn(
            "flex gap-2 border-t border-border pt-5",
            phone ? "-mx-4 no-scrollbar overflow-x-auto px-4" : "flex-wrap",
          )}
        >
          {links.map((l) => (
            <button
              key={l.tab}
              type="button"
              onClick={() => onTab(l.tab)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background/70 px-3.5 text-body-sm outline-none hover:border-mist hover:bg-card hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted",
                phone ? "h-11" : "h-9",
              )}
            >
              <l.icon className="size-4 text-brand" />
              {l.label}
              {l.tab === "alerts" && firing > 0 && (
                <span className="rounded-full bg-destructive px-1.5 text-caption text-white tabular-nums">
                  {firing}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </section>
  )
}

// The same published port shows once (compose often lists it per address
// family).
function uniquePorts(list: DockerProjectStats["ports"]) {
  const seen = new Set<string>()
  return list
    .filter((x) => x.public > 0)
    .filter((x) => {
      const k = `${x.public}-${x.private}-${x.proto}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((a, b) => a.public - b.public)
}

function healthOf(s: DockerProjectStats | undefined): {
  text: string
  tone: Tone
} {
  if (!s) return { text: "Waiting for numbers", tone: "muted" }
  if (s.total === 0) return { text: "No containers", tone: "muted" }
  if (s.unhealthy)
    return { text: `${s.unhealthy} unhealthy`, tone: "destructive" }
  if (s.running < s.total)
    return { text: `${s.total - s.running} not running`, tone: "warning" }
  if (s.starting) return { text: `${s.starting} starting`, tone: "warning" }
  if (s.healthy) return { text: `${s.healthy} healthy`, tone: "success" }
  return { text: "All running", tone: "success" }
}

const factTone: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-ash",
  brand: "text-brand",
}

function Fact({
  icon: Icon,
  tone = "muted",
  children,
}: {
  icon: LucideIcon
  tone?: Tone
  children: ReactNode
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 text-caption text-foreground tabular-nums">
      <Icon className={cn("size-3.5", factTone[tone])} />
      {children}
    </span>
  )
}

// "Live" with a beating dot, and how fresh the numbers are on hover.
function LivePill({ at }: { at: string }) {
  return (
    <span
      title={`Measured ${timeAgo(at)}`}
      className="inline-flex h-6 items-center gap-1.5 rounded-full bg-success/10 px-2 text-caption text-success"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      Live
    </span>
  )
}

const strokeTone: Record<Tone, string> = {
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
  muted: "stroke-mist",
  brand: "stroke-brand",
}

// The containers as a ring: one arc each, coloured by its state, with a slow
// turning orbit around it while things run.
function Orbit({
  containers,
  running,
  total,
  size,
}: {
  containers: DockerProjectContainer[]
  running: number
  total: number
  size: number
}) {
  const sorted = [...containers].sort((a, b) =>
    a.service.localeCompare(b.service),
  )
  const r = 50
  const c = 2 * Math.PI * r
  const n = sorted.length
  const gap = n > 1 ? Math.min(6, c / n / 4) : 0
  const seg = n ? c / n : c
  const all = total > 0 && running === total
  return (
    <span
      role="img"
      aria-label={`${running} of ${total} containers running`}
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 128 128" className="size-full" aria-hidden>
        {/* The orbit: a dotted ring that turns slowly. */}
        <g
          className={cn(
            "origin-center",
            running > 0 &&
              "animate-[spin_40s_linear_infinite] motion-reduce:animate-none",
          )}
        >
          <circle
            cx="64"
            cy="64"
            r="61"
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="1 7"
            strokeLinecap="round"
            className="stroke-brand/40"
          />
          {running > 0 && (
            <circle cx="64" cy="3" r="3" className="fill-brand" />
          )}
        </g>
        <g className="origin-center -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            strokeWidth="11"
            className="stroke-muted"
          />
          {sorted.map((ct, i) => (
            <circle
              key={ct.id}
              cx="64"
              cy="64"
              r={r}
              fill="none"
              strokeWidth="11"
              strokeLinecap={n === 1 ? "round" : "butt"}
              strokeDasharray={`${Math.max(0.5, seg - gap)} ${c}`}
              strokeDashoffset={-(i * seg + gap / 2)}
              className={cn(
                strokeTone[containerTone(ct)],
                "transition-[stroke] duration-500",
              )}
            >
              <title>{`${ct.name}: ${ct.status || ct.state}`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-heading font-light tabular-nums">
          {running}
          <span className="text-subheading text-ash">/{total}</span>
        </span>
        <span
          className={cn(
            "text-caption",
            all ? "text-success" : "text-muted-foreground",
          )}
        >
          {total === 0 ? "no containers" : all ? "all running" : "running"}
        </span>
      </span>
    </span>
  )
}

// The project's own words: a display title and a note for the team ("what
// this is, who owns it, how to reach it"). Saved by Morche, not in compose.
function Words({
  p,
  canEdit,
  phone,
  onEdit,
}: {
  p: DockerProjectDetails
  canEdit: boolean
  phone: boolean
  onEdit: () => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          phone && "justify-center",
        )}
      >
        <h2
          className={cn(
            "truncate font-light",
            phone ? "text-subheading" : "text-heading",
          )}
        >
          {p.title || p.name}
        </h2>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit the title and note"
            title="Edit the title and note"
            onClick={onEdit}
            className="shrink-0 text-ash"
          >
            <Pencil />
          </Button>
        )}
      </div>
      {p.title && (
        <span className="font-mono text-caption text-muted-foreground">
          {p.name}
        </span>
      )}
      {p.note ? (
        <p
          className={cn(
            "max-w-prose text-body-sm whitespace-pre-wrap text-muted-foreground",
            phone && "mx-auto",
          )}
        >
          {p.note}
        </p>
      ) : canEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "flex w-fit items-center gap-1.5 rounded-md text-body-sm text-ash outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50",
            phone && "mx-auto min-h-11",
          )}
        >
          <Pencil className="size-3.5" />
          Add a note: what it is, who looks after it, how it's reached
        </button>
      ) : null}
    </div>
  )
}

function MetaForm({
  p,
  serverId,
  phone,
  onDone,
}: {
  p: DockerProjectDetails
  serverId: string
  phone: boolean
  onDone: () => void
}) {
  const save = useSaveProjectMeta()
  const titleId = useId()
  const noteId = useId()
  const [draft, setDraft] = useState({ title: p.title, note: p.note })
  const tooLong = draft.title.length > 80 || draft.note.length > 2000
  return (
    <form
      className="flex flex-col gap-3 text-start"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(
          {
            server: serverId,
            project: p.name,
            title: draft.title.trim(),
            note: draft.note.trim(),
          },
          {
            onSuccess: () => {
              onDone()
              toast.success("Saved")
            },
            onError: (err) =>
              toast.error("Couldn't save", { description: err.message }),
          },
        )
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={titleId} className="text-body-sm font-medium">
          Title
        </label>
        <Input
          id={titleId}
          value={draft.title}
          maxLength={80}
          placeholder={p.name}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <span className="text-caption text-muted-foreground">
          Shown instead of the folder name. Blank = {p.name}.
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={noteId}
          className="flex items-baseline text-body-sm font-medium"
        >
          Note
          <span
            className={cn(
              "ms-auto text-caption font-normal text-ash tabular-nums",
              draft.note.length > 2000 && "text-destructive",
            )}
          >
            {draft.note.length}/2000
          </span>
        </label>
        <Textarea
          id={noteId}
          value={draft.note}
          rows={3}
          placeholder="What it is, who looks after it, where it's reached, anything the next person should know."
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(phone && "h-11 flex-1")}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={save.isPending || tooLong}
          className={cn(phone && "h-11 flex-1")}
        >
          {save.isPending && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  )
}

// --- Live numbers -----------------------------------------------------------

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  children,
  phone,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  children?: ReactNode
  phone: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden border border-border bg-card",
        phone ? "rounded-2xl" : "rounded-2xl",
      )}
    >
      <div className={cn("flex flex-col gap-1", phone ? "p-3.5" : "p-5 pb-3")}>
        <span className="flex items-center gap-2 text-caption text-muted-foreground">
          <Icon className="size-3.5 text-brand" />
          {label}
        </span>
        <span
          className={cn(
            "truncate font-light tabular-nums",
            phone ? "text-subheading" : "text-heading",
          )}
        >
          {value}
        </span>
        {hint && (
          <span className="truncate text-caption text-ash tabular-nums">
            {hint}
          </span>
        )}
      </div>
      {/* The sparkline runs to the card's edges. */}
      <div className="mt-auto">{children}</div>
    </div>
  )
}

function Numbers({
  stats: s,
  pending,
  phone,
}: {
  stats: DockerProjectStats | undefined
  pending: boolean
  phone: boolean
}) {
  const grid = "grid grid-cols-2 gap-3 xl:grid-cols-4"
  if (!s) {
    if (!pending) return null
    return (
      <div className={grid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    )
  }
  const cores = s.cpus || 1
  const cpuShare = s.cpu / cores
  const mem = memoryShare(s)
  const slots = 120
  const spark = phone ? "h-10" : "h-14"
  const pids = s.containers.reduce((t, c) => t + (c.pids || 0), 0)
  return (
    <div className={grid}>
      <Tile
        icon={Cpu}
        label="CPU"
        value={pct(s.cpu)}
        hint={`${pct(cpuShare)} of ${cores} ${cores === 1 ? "core" : "cores"}`}
        phone={phone}
      >
        <Spark
          values={s.history.map((x) => x.cpu)}
          max={CPU_FLOOR}
          slots={slots}
          tone={shareTone(cpuShare)}
          className={spark}
        />
      </Tile>
      <Tile
        icon={MemoryStick}
        label="Memory"
        value={formatSize(s.memory_used)}
        hint={
          mem.of
            ? `${pct(mem.share)} of ${formatSize(mem.of)}${mem.limited ? " limit" : ""}`
            : undefined
        }
        phone={phone}
      >
        <Spark
          values={s.history.map((x) => x.memory)}
          max={mem.limited ? mem.of : undefined}
          slots={slots}
          tone={shareTone(mem.share)}
          className={spark}
        />
      </Tile>
      <Tile
        icon={Network}
        label="Network"
        value={rate(s.net_rx_rate + s.net_tx_rate)}
        hint={`↓ ${rate(s.net_rx_rate)} · ↑ ${rate(s.net_tx_rate)}`}
        phone={phone}
      >
        <Spark
          values={s.history.map((x) => x.net_rx + x.net_tx)}
          slots={slots}
          className={spark}
        />
      </Tile>
      <Tile
        icon={Gauge}
        label="Processes"
        value={pids || "—"}
        hint={
          s.unmeasured
            ? `${s.unmeasured} not measured`
            : `Measured ${timeAgo(s.measured_at)}`
        }
        phone={phone}
      >
        <div
          className={cn(
            "flex items-end gap-0.5 px-5 pb-4",
            phone && "px-3.5 pb-3",
          )}
        >
          <ProcessBars containers={s.containers} />
        </div>
      </Tile>
    </div>
  )
}

// Processes per running container as small columns: the busy ones stand out.
function ProcessBars({ containers }: { containers: DockerProjectContainer[] }) {
  const list = containers
    .filter((c) => c.state === "running")
    .sort((a, b) => b.pids - a.pids)
  const top = Math.max(1, ...list.map((c) => c.pids))
  if (list.length === 0)
    return <span className="h-8 w-full border-b border-dashed border-mist" />
  return (
    <div className="flex h-8 w-full items-end gap-1" aria-hidden>
      {list.map((c) => (
        <span
          key={c.id}
          title={`${c.name}: ${c.pids} processes`}
          className="min-w-1 flex-1 rounded-t-sm bg-brand/60"
          style={{ height: `${Math.max(8, (c.pids / top) * 100)}%` }}
        />
      ))}
    </div>
  )
}

const swatch = { brand: "bg-brand", quiet: "bg-muted-foreground" }

const clock = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

// The last minutes the backend has kept (while someone was looking).
function History({
  stats: s,
  phone,
}: {
  stats: DockerProjectStats
  phone: boolean
}) {
  const h = s.history
  const cardClass = cn(
    "flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-5",
    phone && "-mx-4 rounded-none border-x-0 p-4",
  )
  if (h.length < 3)
    return (
      <div className={cardClass}>
        <p className="text-body-sm font-medium">Last minutes</p>
        <Quiet>
          Collecting: a point every few seconds while this page is open. The
          chart fills in shortly.
        </Quiet>
      </div>
    )
  const starts = h.map((x) => Date.parse(x.at))
  const gaps = starts.slice(1).map((t, i) => t - starts[i])
  const size = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 10_000
  const b = { starts, size }
  const span = (starts.at(-1) ?? 0) - starts[0]
  const memTop = memoryShare(s)
  const height = phone ? 150 : 180
  const at = (i: number) => clock.format(starts[i])
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className={cardClass}>
        <div className="flex items-baseline gap-2">
          <p className="text-body-sm font-medium">CPU</p>
          <span className="text-caption text-ash">
            last {Math.max(1, Math.round(span / 60_000))} min · % of one core
          </span>
        </div>
        <MultiLineChart
          buckets={b}
          series={[{ key: "cpu", values: h.map((x) => x.cpu), tone: "brand" }]}
          format={pct}
          height={height}
          label="CPU over the last minutes"
          tooltip={(i) => (
            <Tip
              title={at(i)}
              rows={[
                { label: "CPU", value: pct(h[i].cpu), swatch: swatch.brand },
              ]}
            />
          )}
        />
      </div>
      <div className={cardClass}>
        <div className="flex items-baseline gap-2">
          <p className="text-body-sm font-medium">Memory</p>
          <span className="text-caption text-ash">
            {memTop.limited
              ? `of ${formatSize(memTop.of)} in limits`
              : "used by its containers"}
          </span>
        </div>
        <MultiLineChart
          buckets={b}
          series={[
            { key: "mem", values: h.map((x) => x.memory), tone: "brand" },
          ]}
          max={memTop.limited ? memTop.of : undefined}
          format={(v) => formatSize(v)}
          height={height}
          label="Memory over the last minutes"
          tooltip={(i) => (
            <Tip
              title={at(i)}
              rows={[
                {
                  label: "Memory",
                  value: formatSize(h[i].memory),
                  swatch: swatch.brand,
                },
                {
                  label: "Network in",
                  value: rate(h[i].net_rx),
                  swatch: swatch.quiet,
                },
                {
                  label: "Network out",
                  value: rate(h[i].net_tx),
                  swatch: swatch.quiet,
                },
              ]}
            />
          )}
        />
      </div>
    </div>
  )
}

// --- Who uses what ----------------------------------------------------------

// Shades of the one accent, biggest first; the rest share a quiet grey.
const shades = [
  "bg-brand",
  "bg-brand/75",
  "bg-brand/55",
  "bg-brand/40",
  "bg-brand/25",
]
const SHOWN = 5

type Share = { key: string; name: string; value: number; shade: string }

function sharesOf(
  list: DockerProjectContainer[],
  pick: (c: DockerProjectContainer) => number,
): Share[] {
  const sorted = list
    .map((c) => ({ c, v: Math.max(0, pick(c)) }))
    .sort((a, b) => b.v - a.v)
  const head = sorted.slice(0, SHOWN).map((x, i) => ({
    key: x.c.id,
    name: x.c.service || x.c.name,
    value: x.v,
    shade: shades[i],
  }))
  const rest = sorted.slice(SHOWN).reduce((t, x) => t + x.v, 0)
  if (sorted.length > SHOWN)
    head.push({
      key: "others",
      name: `${sorted.length - SHOWN} more`,
      value: rest,
      shade: "bg-mist",
    })
  return head
}

// How the project's CPU, memory and traffic split between its containers:
// stacked bars in shades of indigo, with the biggest few named.
function ShareCard({
  stats: s,
  serverId,
  phone,
}: {
  stats: DockerProjectStats
  serverId: string
  phone: boolean
}) {
  const running = s.containers.filter((c) => c.state === "running")
  const metrics = [
    {
      key: "memory",
      label: "Memory",
      icon: MemoryStick,
      shares: sharesOf(running, (c) => c.memory_used),
      format: (v: number) => formatSize(v),
    },
    {
      key: "cpu",
      label: "CPU",
      icon: Cpu,
      shares: sharesOf(running, (c) => c.cpu),
      format: pct,
    },
    {
      key: "net",
      label: "Network",
      icon: Network,
      shares: sharesOf(running, (c) => c.net_rx_rate + c.net_tx_rate),
      format: rate,
    },
  ]
  return (
    <Card title="Who uses what" icon={Activity} phone={phone}>
      <div className="flex flex-col gap-5">
        {metrics.map((m) => {
          const total = m.shares.reduce((t, x) => t + x.value, 0)
          const lead = m.shares[0]
          return (
            <div key={m.key} className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 items-baseline gap-2 text-body-sm">
                <m.icon className="size-3.5 shrink-0 self-center text-ash" />
                <span className="font-medium">{m.label}</span>
                <span className="text-caption text-ash tabular-nums">
                  {m.format(total)}
                </span>
                {lead && total > 0 && (
                  <span className="ms-auto truncate text-caption text-muted-foreground">
                    <span className="text-foreground">{lead.name}</span> takes{" "}
                    {Math.round((lead.value / total) * 100)}%
                  </span>
                )}
              </div>
              <div
                role="img"
                aria-label={`${m.label}: ${m.shares
                  .map((x) => `${x.name} ${m.format(x.value)}`)
                  .join(", ")}`}
                className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted"
              >
                {total > 0 &&
                  m.shares
                    .filter((x) => x.value > 0)
                    .map((x) => (
                      <span
                        key={x.key}
                        title={`${x.name}: ${m.format(x.value)}`}
                        className={cn(
                          "h-full transition-[flex-grow] duration-700",
                          x.shade,
                        )}
                        style={{ flexGrow: x.value, flexBasis: 0 }}
                      />
                    ))}
              </div>
            </div>
          )
        })}
      </div>
      {/* One legend for all three: the memory order names the shades. */}
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 @lg:grid-cols-2">
        {metrics[0].shares.map((x) => {
          const c = running.find((ct) => ct.id === x.key)
          const body = (
            <>
              <span className={cn("size-2.5 shrink-0 rounded-sm", x.shade)} />
              <span className="min-w-0 flex-1 truncate">{x.name}</span>
              <span className="shrink-0 text-caption text-ash tabular-nums">
                {formatSize(x.value)}
                {c && ` · ${pct(c.cpu)}`}
              </span>
            </>
          )
          return (
            <li key={x.key}>
              {c ? (
                <Link
                  href={containerHref(serverId, c.name)}
                  className={cn(
                    "-mx-2 flex items-center gap-2 rounded-lg px-2 text-body-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                    phone ? "min-h-11" : "min-h-8",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-2 text-body-sm text-muted-foreground",
                    phone ? "min-h-11" : "min-h-8",
                  )}
                >
                  {body}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

// --- Activity ---------------------------------------------------------------

const eventsSerializer = createSerializer({
  env: parseAsString,
  q: parseAsString,
})

const timeline: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-mist",
  brand: "bg-brand",
}

// What happened to the project's containers in the last day, newest first.
function ActivityCard({
  serverId,
  project,
  phone,
}: {
  serverId: string
  project: string
  phone: boolean
}) {
  const events = useDockerEvents(serverId, {
    hours: 24,
    type: "container",
    exec: false,
  })
  const mine = (events.data?.items ?? [])
    .filter((e) => e.project === project)
    // Kill comes with every stop; the stop says it better.
    .filter((e) => !["kill", "create", "destroy"].includes(e.action))
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
  const shown = keyed(mine.slice(0, 8))
  return (
    <Card
      title="Last 24 hours"
      icon={Timer}
      phone={phone}
      aside={
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              href={eventsSerializer("/containers/events", {
                env: serverId,
                q: project,
              })}
            />
          }
          nativeButton={false}
        >
          Event log
          <ArrowUpRight />
        </Button>
      }
    >
      {events.isPending ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 rounded-lg" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-subtle px-4 py-5">
          <span className="flex size-9 items-center justify-center rounded-full bg-success/10 text-success">
            <HeartPulse className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-body-sm font-medium">A quiet day</p>
            <p className="text-caption text-muted-foreground">
              No container started, stopped or failed health checks.
            </p>
          </div>
        </div>
      ) : (
        <ol className="relative flex flex-col">
          {/* The line the dots sit on. */}
          <span
            aria-hidden
            className="absolute inset-y-2 start-[5px] w-px bg-border"
          />
          {shown.map(({ e, key }) => {
            const d = describeEvent(e)
            return (
              <li
                key={key}
                className={cn(
                  "relative flex min-w-0 items-center gap-3 ps-6",
                  phone ? "min-h-11" : "min-h-9",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute start-0 size-[11px] rounded-full border-2 border-card",
                    timeline[d.tone],
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-body-sm">
                  <span className="font-medium">
                    {(e.name ?? "").replace(`${project}-`, "") || e.name}
                  </span>{" "}
                  <span
                    className={cn(
                      d.tone === "destructive"
                        ? "text-destructive"
                        : d.tone === "warning"
                          ? "text-warning"
                          : "text-muted-foreground",
                    )}
                  >
                    {d.text.toLowerCase()}
                  </span>
                </span>
                <time
                  dateTime={e.time}
                  title={new Date(e.time).toLocaleString()}
                  className="shrink-0 text-caption text-ash tabular-nums"
                >
                  {timeAgo(e.time)}
                </time>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}

// --- Readiness --------------------------------------------------------------

function ReadinessCard({
  containers,
  phone,
  onOpen,
}: {
  containers: DockerProjectContainer[]
  phone: boolean
  onOpen: () => void
}) {
  const r = readiness(containers)
  const tone = scoreTone(r.score)
  return (
    <Card
      title="Ready for production"
      icon={ShieldCheck}
      phone={phone}
      aside={
        <Button variant="ghost" size="sm" onClick={onOpen}>
          Checklist
          <ChevronRight />
        </Button>
      }
    >
      <div className="flex items-center gap-5">
        <Ring value={r.score} size={84} className={tone} label="of 100" />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium">
            {r.failed === 0
              ? "Every check passes"
              : `${r.failed} ${r.failed === 1 ? "thing" : "things"} to fix`}
          </p>
          <p className="text-caption text-muted-foreground">
            {r.pending > 0
              ? `${r.pending} waiting for a redeploy`
              : r.suggestions > 0
                ? `${r.suggestions} more suggestions`
                : "Restart policy, limits, health, logs, tags"}
          </p>
        </div>
      </div>
      {r.top.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {r.top.slice(0, 3).map((t) => {
            const [svc, ...rest] = t.split(": ")
            return (
              <li
                key={t}
                className="flex min-w-0 items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-body-sm"
              >
                <Dot tone="warning" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{svc}</span>{" "}
                  <span className="text-muted-foreground">
                    {rest.join(": ")}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function Ring({
  value,
  className,
  size = 56,
  label,
}: {
  value: number
  className?: string
  size?: number
  // A word under the number, for the bigger rings.
  label?: string
}) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 56 56" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="5"
          className="stroke-muted"
        />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          stroke="currentColor"
          className="transition-[stroke-dasharray] duration-700"
          strokeDasharray={`${(c * Math.max(0, Math.min(100, value))) / 100} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
        <span
          className={cn(
            "font-medium tabular-nums",
            size >= 80 ? "text-subheading font-light" : "text-caption",
          )}
        >
          {Math.round(value)}
        </span>
        {label && size >= 80 && (
          <span className="text-[10px] leading-none text-ash">{label}</span>
        )}
      </span>
    </span>
  )
}

// --- Images -----------------------------------------------------------------

// The images the project runs, with what the Updates and Security pages know
// about each: a newer version waiting, known vulnerabilities.
function ImagesCard({
  p,
  containers,
  serverId,
  phone,
}: {
  p: DockerProjectDetails
  containers: DockerProjectContainer[]
  serverId: string
  phone: boolean
}) {
  const updates = useDockerUpdates(serverId)
  const scans = useDockerScans(serverId)
  const refs = [
    ...new Set(containers.length ? containers.map((c) => c.image) : p.images),
  ].filter(Boolean)
  if (refs.length === 0) return null
  const items = refs
    .map((ref) => {
      const ids = new Set(
        containers.filter((c) => c.image === ref).map((c) => c.id),
      )
      const name = imageName(ref)
      const update = updates.data?.items.find(
        (u) =>
          u.containers.some((x) => ids.has(x.id)) ||
          imageName(u.image) === name,
      )
      const scan = scans.data?.items.find(
        (x) =>
          x.containers.some((ct) => ids.has(ct.id)) ||
          x.tags.some((t) => imageName(t) === name),
      )
      const [repo, tag] = splitRef(ref)
      return { ref, repo, tag, update, scan, users: ids.size }
    })
    .sort((a, b) => a.repo.localeCompare(b.repo))
  const waiting = items.filter((i) => i.update?.state === "available").length
  return (
    <Card
      title="Images"
      className="@container"
      icon={Box}
      phone={phone}
      aside={
        waiting > 0 ? (
          <Link
            href={updatesHref(serverId)}
            className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-soft px-2.5 text-caption text-brand-strong hover:underline"
          >
            {waiting} {waiting === 1 ? "update" : "updates"}
          </Link>
        ) : (
          <span className="text-caption text-ash">{items.length}</span>
        )
      }
    >
      <ul
        className={cn(
          "grid grid-cols-1 gap-x-4 @xl:grid-cols-2",
          phone ? "-mx-4" : "-mx-2",
        )}
      >
        {items.map((i) => (
          <li
            key={i.ref}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg",
              phone ? "min-h-14 px-4 py-2" : "p-2",
            )}
          >
            <ImageLogo repo={i.repo} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-body-sm font-medium">
                  {i.repo.split("/").at(-1)}
                </span>
                <span className="max-w-28 shrink-0 truncate rounded-md bg-muted px-1.5 font-mono text-[11px] leading-5 text-muted-foreground">
                  {i.tag}
                </span>
                {i.update?.state === "available" && (
                  <Link
                    href={updatesHref(serverId, i.repo)}
                    className="shrink-0 rounded-md bg-brand-soft px-1.5 text-[11px] leading-5 text-brand-strong hover:underline"
                  >
                    New version
                  </Link>
                )}
              </span>
              <span className="truncate text-caption text-ash">
                {i.scan?.counts ? (
                  <Link
                    href={securityHref(serverId, i.repo)}
                    className="hover:underline"
                  >
                    <VulnSummary counts={i.scan.counts} />
                  </Link>
                ) : (
                  <>
                    {i.repo.includes("/") ? i.repo : "Docker Hub"}
                    {i.users > 1 && ` · ${i.users} containers`}
                  </>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// --- About ------------------------------------------------------------------

function AboutCard({
  p,
  phone,
  onFiles,
}: {
  p: DockerProjectDetails
  phone: boolean
  onFiles?: () => void
}) {
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: p.files.length > 1 ? "Compose files" : "Compose file",
      value: p.files.length ? (
        <span className="flex flex-col font-mono text-caption">
          {p.files.map((f) => (
            <span key={f} className="truncate" title={f}>
              {f.split("/").at(-1)}
            </span>
          ))}
        </span>
      ) : (
        <span className="text-ash">None found</span>
      ),
    },
    { label: ".env", value: p.has_env ? "Yes" : "No" },
    { label: "Found", value: projectSourceMeta[p.source].hint },
  ]
  if (p.created) rows.push({ label: "Created", value: timeAgo(p.created) })
  return (
    <Card
      title="Files"
      icon={FolderOpen}
      phone={phone}
      aside={
        onFiles && (
          <Button variant="ghost" size="sm" onClick={onFiles}>
            Edit files
            <ChevronRight />
          </Button>
        )
      }
    >
      {p.dir && (
        <div className="flex min-w-0 items-center gap-2 rounded-xl bg-subtle py-1.5 ps-3 pe-1.5">
          <FolderOpen className="size-4 shrink-0 text-ash" />
          <span
            className="min-w-0 flex-1 truncate font-mono text-caption"
            title={p.dir}
          >
            {p.dir}
          </span>
          <CopyButton value={p.dir} label="Copy the folder" />
        </div>
      )}
      <dl className="flex flex-col gap-2 text-body-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex min-w-0 gap-3">
            <dt className="w-28 shrink-0 text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 flex-1 break-words">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
