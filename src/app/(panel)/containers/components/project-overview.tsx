"use client"

import {
  BellRing,
  ChevronRight,
  Cpu,
  Loader2,
  MemoryStick,
  Network,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Timer,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { type ReactNode, useId, useState } from "react"
import { toast } from "sonner"

import { MultiLineChart, Tip } from "@/components/charts/time-chart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { formatSize } from "@/lib/format"
import type { DockerProjectDetails, DockerProjectStats } from "@/lib/services"
import { cn } from "@/lib/utils"
import { type Note, Notices } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useSaveProjectMeta } from "../api"
import { containerHref, Dot } from "./meta"
import { Block, CopyButton, Pairs, Quiet } from "./parts"
import { StateLabel, stateText, stoppedText } from "./project-containers"
import type { ServiceRow } from "./project-deploy"
import { readiness, scoreTone } from "./project-production"
import {
  ContainerBar,
  CPU_FLOOR,
  memoryShare,
  pct,
  portLabel,
  rate,
  Spark,
  shareTone,
  upFor,
} from "./project-stats"
import { ProjectTrends } from "./project-trends"

export type ProjectTab =
  | "overview"
  | "containers"
  | "logs"
  | "production"
  | "alerts"
  | "files"
  | "environment"
  | "history"
  | "git"

// A project's Overview: what it is (title + note), its live numbers, the
// last minutes as charts, and where its files live.
export function ProjectOverview({
  p,
  stats,
  statsPending,
  serverId,
  canManage,
  canFiles,
  firing,
  rows,
  deploying,
  phone,
  onTab,
}: {
  p: DockerProjectDetails
  stats: DockerProjectStats | undefined
  statsPending: boolean
  // Every service and container, with the state of each (project-deploy).
  rows: ServiceRow[] | undefined
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
      title: "Started outside Morche",
      body: "It lives outside the workspace's projects folder. Morche runs the same compose commands on it, and Destroy leaves its folder alone.",
    })
  }

  return (
    <div className="flex flex-col gap-6 max-md:gap-5">
      <Notices notes={notes} className="max-md:-mx-4" />
      {rows && rows.length > 0 && (
        <ServicesGlance
          rows={rows}
          serverId={serverId}
          phone={phone}
          onTab={onTab}
        />
      )}
      <Describe p={p} serverId={serverId} canEdit={canManage} phone={phone} />
      <Numbers
        stats={stats}
        pending={statsPending}
        phone={phone}
        onTab={onTab}
      />
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
        <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-2">
          {stats && stats.containers.length > 0 && (
            <ReadinessGlance
              stats={stats}
              phone={phone}
              onOpen={() => onTab("production")}
            />
          )}
          <Block
            title="Files"
            aside={
              canFiles && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTab("files")}
                >
                  Edit files
                </Button>
              )
            }
          >
            <Pairs
              className={cn(phone && "-mx-4 rounded-none border-x-0")}
              rows={[
                {
                  label: "Folder",
                  value: p.dir ? (
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-caption">
                        {p.dir}
                      </span>
                      <CopyButton value={p.dir} label="Copy the folder" />
                    </span>
                  ) : (
                    ""
                  ),
                },
                {
                  label: p.files.length > 1 ? "Compose files" : "Compose file",
                  value: p.files.join("\n"),
                  mono: true,
                },
                { label: ".env", value: p.has_env ? "Yes" : "No" },
                { label: "Services", value: p.services.join(", ") },
                { label: "Images", value: p.images.join("\n"), mono: true },
                {
                  label: "Ports",
                  value: (stats?.ports ?? []).map(portLabel).join(", "),
                  mono: true,
                },
                {
                  label: "Created",
                  value: p.created ? timeAgo(p.created) : "",
                },
              ]}
            />
          </Block>
        </div>
      </div>
    </div>
  )
}

// The project's own words: a display title and a note for the team ("what
// this is, who owns it, how to reach it"). Saved by Morche, not in compose.
function Describe({
  p,
  serverId,
  canEdit,
  phone,
}: {
  p: DockerProjectDetails
  serverId: string
  canEdit: boolean
  phone: boolean
}) {
  const save = useSaveProjectMeta()
  const titleId = useId()
  const noteId = useId()
  const [draft, setDraft] = useState<{ title: string; note: string } | null>(
    null,
  )
  const empty = !p.title && !p.note

  if (draft) {
    const tooLong = draft.title.length > 80 || draft.note.length > 2000
    const submit = () =>
      save.mutate(
        {
          server: serverId,
          project: p.name,
          title: draft.title.trim(),
          note: draft.note.trim(),
        },
        {
          onSuccess: () => {
            setDraft(null)
            toast.success("Saved")
          },
          onError: (e) =>
            toast.error("Couldn't save", { description: e.message }),
        },
      )
    return (
      <form
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-border bg-card p-5",
          phone && "-mx-4 rounded-none border-x-0 p-4",
        )}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
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
            rows={4}
            placeholder="What it is, who looks after it, where it's reached, anything the next person should know."
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(phone && "h-11 flex-1")}
            onClick={() => setDraft(null)}
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

  if (empty && !canEdit) return null
  if (empty)
    return (
      <button
        type="button"
        onClick={() => setDraft({ title: "", note: "" })}
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-dashed border-mist p-4 text-start text-body-sm text-muted-foreground outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50",
          phone && "-mx-4 min-h-14 rounded-none border-x-0",
        )}
      >
        <Pencil className="size-4 shrink-0" />
        Add a title and a note: what this project is, who looks after it, how
        it's reached.
      </button>
    )

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border bg-card p-5",
        phone && "-mx-4 rounded-none border-x-0 p-4",
      )}
    >
      <div className="min-w-0 flex-1">
        {p.title && <p className="text-body font-medium">{p.title}</p>}
        {p.note ? (
          <p className="mt-1 text-body-sm whitespace-pre-wrap text-muted-foreground">
            {p.note}
          </p>
        ) : (
          <p className="mt-1 text-caption text-ash">No note yet.</p>
        )}
      </div>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Edit the title and note"
          title="Edit the title and note"
          onClick={() => setDraft({ title: p.title, note: p.note })}
        >
          <Pencil />
        </Button>
      )}
    </div>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  children,
  phone,
  onClick,
}: {
  icon: typeof Cpu
  label: string
  value: ReactNode
  hint?: ReactNode
  children?: ReactNode
  phone: boolean
  onClick?: () => void
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <Icon className="size-4 text-ash" />
        {label}
        {phone && (
          <span className="ms-auto text-body font-medium text-foreground tabular-nums">
            {value}
          </span>
        )}
      </span>
      {!phone && (
        <span className="text-subheading font-medium tabular-nums">
          {value}
        </span>
      )}
      {hint && (
        <span className="text-caption text-muted-foreground tabular-nums">
          {hint}
        </span>
      )}
      {children}
    </>
  )
  const cls = phone
    ? "flex w-full flex-col gap-1.5 px-4 py-3 text-start"
    : "flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border bg-card p-5 text-start"
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          cls,
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          phone ? "active:bg-muted" : "hover:border-mist hover:shadow-sm",
        )}
      >
        {body}
      </button>
    )
  return <div className={cls}>{body}</div>
}

// The live numbers: one tile each, a sparkline under the busy ones.
function Numbers({
  stats: s,
  pending,
  phone,
  onTab,
}: {
  stats: DockerProjectStats | undefined
  pending: boolean
  phone: boolean
  onTab: (t: ProjectTab) => void
}) {
  if (!s) {
    if (!pending) return null
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }
  const cores = s.cpus || 1
  const cpuShare = s.cpu / cores
  const mem = memoryShare(s)
  const slots = 120
  const tiles = [
    <Tile
      key="running"
      icon={ShieldCheck}
      label="Running"
      value={`${s.running}/${s.total}`}
      hint={
        s.unhealthy
          ? `${s.unhealthy} unhealthy`
          : s.starting
            ? `${s.starting} starting`
            : s.healthy
              ? `${s.healthy} healthy`
              : "No health checks"
      }
      phone={phone}
      onClick={() => onTab("containers")}
    >
      <ContainerBar containers={s.containers} className="mt-auto" />
    </Tile>,
    <Tile
      key="cpu"
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
        className="mt-auto"
      />
    </Tile>,
    <Tile
      key="memory"
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
        className="mt-auto"
      />
    </Tile>,
    <Tile
      key="net"
      icon={Network}
      label="Network"
      value={`↓ ${rate(s.net_rx_rate)}`}
      hint={`↑ ${rate(s.net_tx_rate)}`}
      phone={phone}
    >
      <Spark
        values={s.history.map((x) => x.net_rx + x.net_tx)}
        slots={slots}
        className="mt-auto"
      />
    </Tile>,
    <Tile
      key="restarts"
      icon={RotateCcw}
      label="Restarts"
      value={s.restarts}
      hint={
        s.restarts
          ? "By the engine, since they were made"
          : "None since they were made"
      }
      phone={phone}
      onClick={s.restarts ? () => onTab("logs") : undefined}
    />,
    <Tile
      key="up"
      icon={Timer}
      label="Up for"
      value={upFor(s.since) || "—"}
      hint={
        s.unmeasured
          ? `${s.unmeasured} not measured`
          : s.first_sample
            ? "Measuring started just now"
            : `Measured ${timeAgo(s.measured_at)}`
      }
      phone={phone}
    />,
  ]
  if (phone)
    return (
      <div className="-mx-4 divide-y divide-border border-y border-border">
        {tiles}
      </div>
    )
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles}
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

// A glance at the production checklist with a way into it.
function ReadinessGlance({
  stats,
  phone,
  onOpen,
}: {
  stats: DockerProjectStats
  phone: boolean
  onOpen: () => void
}) {
  const r = readiness(stats.containers)
  const tone = scoreTone(r.score)
  return (
    <Block
      title="Ready for production"
      aside={
        <Button variant="ghost" size="sm" onClick={onOpen}>
          Checklist
        </Button>
      }
    >
      <div className="flex items-center gap-4">
        <Ring value={r.score} className={tone} />
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium">
            {r.failed === 0
              ? "Every check passes"
              : `${r.failed} ${r.failed === 1 ? "thing" : "things"} to fix`}
          </p>
          <ul className="mt-1 flex flex-col gap-0.5 text-caption text-muted-foreground">
            {r.top.slice(0, 3).map((t) => (
              <li key={t} className="truncate">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Block>
  )
}

export function Ring({
  value,
  className,
  size = 56,
}: {
  value: number
  className?: string
  size?: number
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
          strokeDasharray={`${(c * Math.max(0, Math.min(100, value))) / 100} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-caption font-medium text-foreground tabular-nums">
        {Math.round(value)}
      </span>
    </span>
  )
}

// Each service at a glance: its containers' states, or why it has none yet.
function ServicesGlance({
  rows,
  serverId,
  phone,
  onTab,
}: {
  rows: ServiceRow[]
  serverId: string
  phone: boolean
  onTab: (t: ProjectTab) => void
}) {
  const router = useRouter()
  const items = rows.map((r) => {
    if (r.kind === "pending")
      return {
        key: r.key,
        tone: r.state.tone,
        name: r.service,
        sub: r.image,
        state: r.state,
        detail: r.state.detail,
        bad: r.state.tone === "destructive",
        mono: !!r.state.error,
        open: () => onTab("containers"),
      }
    const st = stateText(r.c)
    return {
      key: r.key,
      tone: st.tone,
      name: r.c.name,
      sub: r.c.service,
      state: r.activity ?? { label: st.label, tone: st.tone },
      detail:
        r.c.error ||
        (r.c.state === "running" ? upFor(r.c.started_at) : stoppedText(r.c)),
      bad: !!r.c.error,
      mono: !!r.c.error,
      open: () => router.push(containerHref(serverId, r.c.name)),
    }
  })
  const waiting = rows.filter((r) => r.kind === "pending").length
  return (
    <Block
      title="Services"
      aside={
        <span className="text-caption text-muted-foreground">
          {rows.length - waiting}{" "}
          {rows.length - waiting === 1 ? "container" : "containers"}
          {waiting > 0 && ` · ${waiting} without one`}
        </span>
      }
    >
      <ul className={cn("flex flex-col", phone ? "-mx-4" : "-mx-2")}>
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              onClick={it.open}
              className={cn(
                "flex w-full items-center gap-3 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted",
                phone
                  ? "min-h-14 px-4 py-2"
                  : "min-h-11 rounded-lg px-2 py-1.5",
              )}
            >
              <Dot tone={it.tone} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-body-sm font-medium">
                    {it.name}
                  </span>
                  {it.sub && it.sub !== it.name && !phone && (
                    <span className="truncate text-caption text-ash">
                      {it.sub}
                    </span>
                  )}
                </span>
                {it.detail && (
                  <span
                    className={cn(
                      "text-caption",
                      it.bad
                        ? cn(
                            "break-words text-destructive",
                            it.mono && "font-mono",
                          )
                        : "truncate text-muted-foreground",
                    )}
                  >
                    {it.detail}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-body-sm">
                <StateLabel st={it.state} />
              </span>
              <ChevronRight className="size-4 shrink-0 text-ash" />
            </button>
          </li>
        ))}
      </ul>
    </Block>
  )
}
