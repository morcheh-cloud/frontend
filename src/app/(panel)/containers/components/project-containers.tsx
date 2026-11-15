"use client"

import { FileText, HeartPulse, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { DockerContainer, DockerProjectContainer } from "@/lib/services"
import { cn } from "@/lib/utils"
import type { Item } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  type ContainerAction,
  LIVE_HISTORY,
  type LiveContainer,
  type ProjectLiveState,
  useProjectLiveStats,
} from "../api"
import { useContainerMenu, useDockerActions } from "./docker-actions"
import { PhoneRow, Rows, Table, Tag, Tr } from "./kit"
import {
  containerHref,
  Dot,
  exitCode,
  healthMeta,
  StatusBadge,
  stateOf,
  type Tone,
} from "./meta"
import { Quiet } from "./parts"
import type { DockerCan } from "./permissions"
import type { RowState, ServiceRow } from "./project-deploy"
import {
  CPU_FLOOR,
  containerTone,
  PortLink,
  pct,
  rate,
  Spark,
  shareTone,
  upFor,
  useServerAddress,
} from "./project-stats"

// Every service of the project: its containers with their live numbers
// (streamed about once a second), and a row for each service without one
// saying why (image downloading, the deploy failed, left out by a profile…).
export function ProjectContainers({
  serverId,
  project,
  rows,
  pending,
  can,
  phone,
  onLogs,
}: {
  serverId: string
  project: string
  rows: ServiceRow[] | undefined
  pending: boolean
  can: DockerCan
  phone: boolean
  onLogs: (service: string) => void
}) {
  const running = (rows ?? [])
    .flatMap((r) =>
      r.kind === "container" && r.c.state === "running" ? [r.c.id] : [],
    )
    .sort()
    .join(",")
  const stream = useProjectLiveStats(serverId, project, running, !!running)
  if (!rows)
    return pending ? (
      <Skeleton className="h-64 rounded-2xl" />
    ) : (
      <Quiet>Couldn't read the containers just now.</Quiet>
    )
  if (rows.length === 0)
    return (
      <Quiet>
        No containers yet. Deploy creates one for each service in the compose
        file.
      </Quiet>
    )

  if (phone)
    return (
      <div className="-mx-4">
        {running && <LiveState stream={stream} className="px-4 pb-2" />}
        <Rows>
          {rows.map((r) =>
            r.kind === "container" ? (
              <PhoneItem
                key={r.key}
                serverId={serverId}
                c={r.c}
                live={stream.byId[r.c.id]}
                activity={r.activity}
                can={can}
                onLogs={onLogs}
              />
            ) : (
              <PendingPhoneRow
                key={r.key}
                service={r.service}
                image={r.image}
                state={r.state}
              />
            ),
          )}
        </Rows>
      </div>
    )

  return (
    <div className="flex flex-col gap-2">
      {running && <LiveState stream={stream} className="self-end" />}
      <Table
        head={[
          { label: "Container" },
          { label: "State" },
          { label: "Health", className: "hidden @5xl:table-cell" },
          { label: "CPU", className: "text-end" },
          { label: "Memory", className: "text-end" },
          { label: "Disk", className: "hidden @2xl:table-cell text-end" },
          { label: "Network", className: "hidden @3xl:table-cell text-end" },
          { label: "Ports", className: "hidden @7xl:table-cell" },
          { label: "Restarts", className: "hidden @6xl:table-cell text-end" },
          {
            label: "Up for",
            className: "hidden @4xl:table-cell whitespace-nowrap",
          },
          { label: "", className: "w-10" },
        ]}
      >
        {rows.map((r) =>
          r.kind === "container" ? (
            <Row
              key={r.key}
              serverId={serverId}
              c={r.c}
              live={stream.byId[r.c.id]}
              activity={r.activity}
              can={can}
              onLogs={onLogs}
            />
          ) : (
            <PendingRow
              key={r.key}
              service={r.service}
              image={r.image}
              state={r.state}
            />
          ),
        )}
      </Table>
    </div>
  )
}

// "Live" while the stream sends, else what it's waiting for.
function LiveState({
  stream,
  className,
}: {
  stream: ProjectLiveState
  className?: string
}) {
  const live = stream.live && Object.keys(stream.byId).length > 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-caption text-muted-foreground",
        className,
      )}
    >
      <span className="relative flex size-2">
        {live && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            live ? "bg-success" : "bg-mist",
          )}
        />
      </span>
      {live
        ? "Live · every second"
        : stream.live
          ? "Reading the numbers…"
          : "Connecting…"}
    </span>
  )
}

// The numbers a row shows: the stream's when it has them, else the last
// measurement of the project's stats.
function numbersOf(c: DockerProjectContainer, live?: LiveContainer) {
  const n = live?.now
  const used = n ? n.memory_used : c.memory_used
  const of = c.memory_limit || n?.memory_limit || c.host_memory
  return {
    shown: !!n || c.measured,
    cpu: n ? n.cpu : c.cpu,
    used,
    share: of ? (used / of) * 100 : 0,
    rx: n ? n.net_rx_rate : c.net_rx_rate,
    tx: n ? n.net_tx_rate : c.net_tx_rate,
    read: n?.read_rate,
    write: n?.write_rate,
  }
}

// CPU history scaled to the container's limit (or at least CPU_FLOOR).
function CpuSpark({
  c,
  live,
  className,
}: {
  c: DockerProjectContainer
  live?: LiveContainer
  className?: string
}) {
  if (!live || live.cpu.length < 2)
    return <span className={cn("block", className)} aria-hidden />
  const max = c.cpu_limit > 0 ? c.cpu_limit * 100 : CPU_FLOOR
  return (
    <Spark
      values={live.cpu}
      max={max}
      slots={LIVE_HISTORY}
      className={className}
    />
  )
}

// A thin meter under the memory figure.
function MemoryMeter({ share }: { share: number }) {
  return (
    <span className="block h-1 w-full overflow-hidden rounded-full bg-muted">
      <span
        className={cn(
          "block h-full rounded-full transition-[width] duration-500",
          shareTone(share) === "brand" && "bg-brand",
          shareTone(share) === "warning" && "bg-warning",
          shareTone(share) === "destructive" && "bg-destructive",
        )}
        style={{
          width: `${Math.min(100, Math.max(share, share > 0 ? 2 : 0))}%`,
        }}
      />
    </span>
  )
}

// A state with a spinner while it's in motion.
export function StateLabel({ st }: { st: RowState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        st.tone === "destructive" && "text-destructive",
        st.tone === "brand" && "text-brand",
      )}
    >
      {st.busy && <Loader2 className="size-3.5 shrink-0 animate-spin" />}
      {st.label}
    </span>
  )
}

function PendingRow({
  service,
  image,
  state,
}: {
  service: string
  image?: string
  state: RowState
}) {
  return (
    <tr className="bg-subtle/40">
      <td className="max-w-80 px-3 py-2.5 ps-4">
        <span className="flex min-w-0 items-center gap-2">
          <Dot tone={state.tone} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{service}</span>
            <span className="block truncate text-caption text-muted-foreground">
              {image ? `No container yet · ${image}` : "No container yet"}
            </span>
          </span>
        </span>
      </td>
      <td className="px-3 py-2.5">
        <StateLabel st={state} />
      </td>
      <td
        colSpan={8}
        className={cn(
          "px-3 py-2.5 text-caption break-words",
          state.tone === "destructive"
            ? cn("text-destructive", state.error && "font-mono")
            : "text-muted-foreground",
        )}
      >
        {state.detail}
      </td>
    </tr>
  )
}

function PendingPhoneRow({
  service,
  image,
  state,
}: {
  service: string
  image?: string
  state: RowState
}) {
  return (
    <li className="flex min-h-16 flex-col justify-center gap-0.5 px-4 py-2">
      <span className="flex items-center gap-2 text-body font-medium">
        <Dot tone={state.tone} />
        <span className="truncate">{service}</span>
        <span className="ms-auto shrink-0 text-body-sm font-normal">
          <StateLabel st={state} />
        </span>
      </span>
      <span
        className={cn(
          "text-caption break-words",
          state.tone === "destructive"
            ? cn("text-destructive", state.error && "font-mono")
            : "text-muted-foreground",
        )}
      >
        {state.detail ?? image ?? "No container yet"}
      </span>
    </li>
  )
}

// The container menu takes the list's shape; these fields are all it reads.
function asContainer(serverId: string, c: DockerProjectContainer) {
  return {
    id: c.id,
    name: c.name,
    image: c.image,
    image_id: "",
    created: "",
    mounts: [],
    networks: [],
    ports: [],
    server_id: serverId,
    service: c.service,
    state: c.state,
    status: c.status,
    health: c.health === "none" ? "" : c.health,
  } satisfies DockerContainer
}

function useMenu(
  serverId: string,
  c: DockerProjectContainer,
  can: DockerCan,
  onLogs: (service: string) => void,
): Item[][] {
  const groups = useContainerMenu(serverId, asContainer(serverId, c), can)
  // "Logs" here jumps to the project's Logs tab, filtered to this service.
  return groups.map((g) =>
    g.map((it) =>
      it.key === "logs"
        ? {
            ...it,
            label: "Logs",
            icon: <FileText />,
            onSelect: () => onLogs(c.service),
          }
        : it,
    ),
  )
}

type Badge = { label: string; tone: Tone; busy?: boolean; title?: string }

const underWay: Record<ContainerAction, string> = {
  start: "Starting…",
  stop: "Stopping…",
  restart: "Restarting…",
  pause: "Pausing…",
  unpause: "Resuming…",
}

// The container's state as a badge; an action sent from here wins while it
// runs, so a restart shows at once instead of only in a toast.
export function stateBadge(
  c: DockerProjectContainer,
  act?: ContainerAction,
): Badge {
  if (act) return { label: underWay[act], tone: "brand", busy: true }
  if (c.oom_killed)
    return {
      label: "Out of memory",
      tone: "destructive",
      title: "The kernel stopped it for using more memory than it may.",
    }
  if (c.state === "restarting")
    return {
      label: "Restarting",
      tone: "warning",
      busy: true,
      title: "Docker is starting it again (its restart policy).",
    }
  if (c.state === "removing")
    return { label: "Removing", tone: "warning", busy: true }
  if (c.state === "exited") {
    const code = c.exit_code || exitCode(c.status)
    return code
      ? { label: `Exited · ${code}`, tone: "destructive", title: c.status }
      : { label: "Stopped", tone: "muted", title: c.status }
  }
  if (c.state === "created")
    return {
      label: "Created",
      tone: c.error ? "destructive" : "muted",
      title: "Created, not started",
    }
  const s = stateOf(c)
  return { label: s.label, tone: s.tone }
}

// Its health check's verdict; null when there's nothing to say (no check,
// not running, or an action is under way and the old verdict would mislead).
export function healthBadge(
  c: DockerProjectContainer,
  act?: ContainerAction,
): Badge | null {
  if (act || c.state !== "running" || c.health === "none") return null
  if (c.health === "starting")
    return {
      label: "Checking",
      tone: "warning",
      busy: true,
      title: "The health check hasn't passed yet since it started.",
    }
  return {
    ...healthMeta[c.health],
    title:
      c.health === "healthy"
        ? "Its health check passes."
        : "Its health check keeps failing: look at its logs.",
  }
}

function StateCell({ b }: { b: Badge }) {
  return (
    <StatusBadge tone={b.tone} label={b.label} busy={b.busy} title={b.title} />
  )
}

function HealthCell({ b }: { b: Badge }) {
  return (
    <StatusBadge
      tone={b.tone}
      label={b.label}
      busy={b.busy}
      title={b.title}
      icon={<HeartPulse />}
    />
  )
}

export function stateText(c: DockerProjectContainer) {
  const s = stateOf(c)
  if (c.oom_killed)
    return { label: "Out of memory", tone: "destructive" as const }
  if (c.health !== "none" && c.state === "running") return healthMeta[c.health]
  if (c.state === "created")
    return {
      label: "Created, not started",
      tone: c.error ? ("destructive" as const) : ("muted" as const),
    }
  return { label: s.label, tone: containerTone(c) }
}

// "stopped 3 minutes ago"; Docker gives year 1 for one that never ran.
export function stoppedText(c: DockerProjectContainer) {
  if (c.state === "running" || !c.finished_at) return ""
  if (new Date(c.finished_at).getFullYear() < 2000) return ""
  return `Stopped ${timeAgo(c.finished_at)}`
}

function memoryText(c: DockerProjectContainer, used: number) {
  return c.memory_limit
    ? `${formatSize(used)} / ${formatSize(c.memory_limit)}`
    : formatSize(used)
}

function Row({
  serverId,
  c,
  live,
  activity,
  can,
  onLogs,
}: {
  serverId: string
  c: DockerProjectContainer
  live?: LiveContainer
  activity?: RowState
  can: DockerCan
  onLogs: (service: string) => void
}) {
  const router = useRouter()
  const menu = useMenu(serverId, c, can, onLogs)
  const act = useDockerActions().busy.get(c.id)
  const st = stateText(c)
  const state = stateBadge(c, act)
  const health = healthBadge(c, act)
  const n = numbersOf(c, live)
  const address = useServerAddress(serverId)
  return (
    <Tr
      onOpen={() => router.push(containerHref(serverId, c.name))}
      menu={menu}
      label={c.name}
      cells={[
        {
          node: (
            <span className="flex min-w-0 items-center gap-2">
              <Dot tone={st.tone} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-caption text-muted-foreground">
                  {c.service} · {c.image}
                </span>
                {c.error && (
                  <span className="mt-0.5 block font-mono text-caption break-words whitespace-normal text-destructive">
                    {c.error}
                  </span>
                )}
              </span>
            </span>
          ),
          className: "max-w-60 @7xl:max-w-80",
        },
        {
          node: (
            <span className="flex flex-col items-start gap-1 whitespace-nowrap">
              <StateCell b={state} />
              {health && (
                <span className="@5xl:hidden">
                  <HealthCell b={health} />
                </span>
              )}
              {activity && (
                <span className="text-caption">
                  <StateLabel st={activity} />
                </span>
              )}
            </span>
          ),
        },
        {
          node: health ? (
            <HealthCell b={health} />
          ) : (
            <span
              className="text-caption whitespace-nowrap text-ash"
              title={
                c.healthcheck || c.health !== "none"
                  ? undefined
                  : "Its image or compose file sets no health check."
              }
            >
              {c.state === "running" && !act ? "No check" : "—"}
            </span>
          ),
          className: "hidden @5xl:table-cell whitespace-nowrap",
        },
        {
          node: n.shown ? (
            <span className="flex items-center justify-end gap-2">
              <CpuSpark
                c={c}
                live={live}
                className="hidden h-6 w-16 @5xl:block"
              />
              <span className="flex min-w-14 flex-col items-end">
                <span>{pct(n.cpu)}</span>
                {c.cpu_limit > 0 && (
                  <span className="text-caption text-ash">
                    of {c.cpu_limit} {c.cpu_limit === 1 ? "core" : "cores"}
                  </span>
                )}
              </span>
            </span>
          ) : (
            <span className="text-ash">—</span>
          ),
          className: "text-end tabular-nums whitespace-nowrap",
        },
        {
          node: n.shown ? (
            <span
              className={cn(
                "ms-auto flex flex-col items-end gap-1",
                c.memory_limit ? "w-36" : "w-20",
              )}
            >
              <span
                className={cn(
                  n.share >= 90 && "text-destructive",
                  n.share >= 80 && n.share < 90 && "text-warning",
                )}
              >
                {memoryText(c, n.used)}
              </span>
              <MemoryMeter share={n.share} />
            </span>
          ) : (
            <span className="text-ash">—</span>
          ),
          className: "text-end tabular-nums whitespace-nowrap",
        },
        {
          node:
            n.read === undefined || n.write === undefined ? (
              <span className="text-ash">—</span>
            ) : (
              <span className="ms-auto flex w-24 flex-col items-end">
                <span>
                  <span className="text-ash">R</span> {rate(n.read)}
                </span>
                <span>
                  <span className="text-ash">W</span> {rate(n.write)}
                </span>
              </span>
            ),
          className:
            "hidden @2xl:table-cell text-end tabular-nums whitespace-nowrap text-muted-foreground",
        },
        {
          node: n.shown ? (
            <span className="ms-auto flex w-24 flex-col items-end">
              <span>
                <span className="text-ash">↓</span> {rate(n.rx)}
              </span>
              <span>
                <span className="text-ash">↑</span> {rate(n.tx)}
              </span>
            </span>
          ) : (
            <span className="text-ash">—</span>
          ),
          className:
            "hidden @3xl:table-cell text-end tabular-nums whitespace-nowrap text-muted-foreground",
        },
        {
          node: c.ports.length ? (
            <span className="flex flex-wrap gap-x-2 font-mono text-caption">
              {c.ports.slice(0, 3).map((p) => (
                <PortLink
                  key={`${p.ip}|${p.public}|${p.private}|${p.proto}`}
                  p={p}
                  address={address}
                />
              ))}
              {c.ports.length > 3 && (
                <span className="text-ash">+{c.ports.length - 3}</span>
              )}
            </span>
          ) : (
            <span className="text-ash">—</span>
          ),
          className: "hidden @7xl:table-cell",
        },
        {
          node: c.restarts ? (
            <Tag tone={c.restarts >= 3 ? "warning" : "muted"}>{c.restarts}</Tag>
          ) : (
            <span className="text-ash">0</span>
          ),
          className: "hidden @6xl:table-cell text-end tabular-nums",
        },
        {
          node:
            c.state === "running" ? (
              upFor(c.started_at) || "—"
            ) : (
              <span className="text-ash">{stoppedText(c) || "—"}</span>
            ),
          className:
            "hidden @4xl:table-cell whitespace-nowrap text-muted-foreground",
        },
      ]}
    />
  )
}

function PhoneItem({
  serverId,
  c,
  live,
  activity,
  can,
  onLogs,
}: {
  serverId: string
  c: DockerProjectContainer
  live?: LiveContainer
  activity?: RowState
  can: DockerCan
  onLogs: (service: string) => void
}) {
  const router = useRouter()
  const menu = useMenu(serverId, c, can, onLogs)
  const act = useDockerActions().busy.get(c.id)
  const st = stateText(c)
  const state = stateBadge(c, act)
  const health = healthBadge(c, act)
  const n = numbersOf(c, live)
  // The state and health sit as badges at the end; this line says the rest.
  const bits = [activity ? activity.label : c.service]
  if (c.restarts)
    bits.push(`${c.restarts} restart${c.restarts === 1 ? "" : "s"}`)
  const stopped = stoppedText(c)
  if (stopped && !n.shown) bits.push(stopped.toLowerCase())
  // The numbers get a line of their own, so they never get cut off.
  const usage = n.shown ? [`CPU ${pct(n.cpu)}`, memoryText(c, n.used)] : []
  if (n.shown && n.read !== undefined && n.write !== undefined)
    usage.push(`R ${rate(n.read)}`, `W ${rate(n.write)}`)
  return (
    <PhoneRow
      id={c.id}
      title={
        <span className="flex items-center gap-2">
          <Dot tone={st.tone} />
          <span className="truncate">{c.name}</span>
        </span>
      }
      sub={
        c.error ? (
          <span className="text-destructive">{c.error}</span>
        ) : (
          <>
            <span className="block truncate">{bits.join(" · ")}</span>
            {usage.length > 0 && (
              <span className="block truncate text-foreground tabular-nums">
                {usage.join(" · ")}
              </span>
            )}
          </>
        )
      }
      aside={
        <span className="flex flex-col items-end gap-1">
          <StateCell b={state} />
          {health && <HealthCell b={health} />}
        </span>
      }
      onOpen={() => router.push(containerHref(serverId, c.name))}
      menu={menu}
    />
  )
}
