"use client"

import { FileText, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { DockerContainer, DockerProjectContainer } from "@/lib/services"
import { cn } from "@/lib/utils"
import type { Item } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useContainerMenu } from "./docker-actions"
import { PhoneRow, Rows, Table, Tag, Tr } from "./kit"
import { containerHref, Dot, healthMeta, stateOf } from "./meta"
import { Quiet } from "./parts"
import type { DockerCan } from "./permissions"
import type { RowState, ServiceRow } from "./project-deploy"
import { containerTone, pct, portLabel, rate, upFor } from "./project-stats"

// Every service of the project: its containers with their live numbers, and
// a row for each service without one saying why (image downloading, the
// deploy failed, left out by a profile…).
export function ProjectContainers({
  serverId,
  rows,
  pending,
  can,
  phone,
  onLogs,
}: {
  serverId: string
  rows: ServiceRow[] | undefined
  pending: boolean
  can: DockerCan
  phone: boolean
  onLogs: (service: string) => void
}) {
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
        <Rows>
          {rows.map((r) =>
            r.kind === "container" ? (
              <PhoneItem
                key={r.key}
                serverId={serverId}
                c={r.c}
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
    <Table
      head={[
        { label: "Container" },
        { label: "State" },
        { label: "CPU", className: "text-end" },
        { label: "Memory", className: "text-end" },
        { label: "Network", className: "hidden @3xl:table-cell text-end" },
        { label: "Ports", className: "hidden @4xl:table-cell" },
        { label: "Restarts", className: "hidden @2xl:table-cell text-end" },
        { label: "Up for", className: "hidden @2xl:table-cell" },
        { label: "", className: "w-10" },
      ]}
    >
      {rows.map((r) =>
        r.kind === "container" ? (
          <Row
            key={r.key}
            serverId={serverId}
            c={r.c}
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
        colSpan={7}
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

function memoryText(c: DockerProjectContainer) {
  if (!c.measured) return "—"
  return c.memory_limit
    ? `${formatSize(c.memory_used)} / ${formatSize(c.memory_limit)}`
    : formatSize(c.memory_used)
}

function Row({
  serverId,
  c,
  activity,
  can,
  onLogs,
}: {
  serverId: string
  c: DockerProjectContainer
  activity?: RowState
  can: DockerCan
  onLogs: (service: string) => void
}) {
  const router = useRouter()
  const menu = useMenu(serverId, c, can, onLogs)
  const st = stateText(c)
  const memShare = c.memory_limit ? (c.memory_used / c.memory_limit) * 100 : 0
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
        },
        {
          node: (
            <span className="flex flex-col gap-0.5 whitespace-nowrap">
              <span>
                {st.label}
                {c.state === "exited" && c.exit_code !== 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({c.exit_code})
                  </span>
                )}
              </span>
              {activity && (
                <span className="text-caption">
                  <StateLabel st={activity} />
                </span>
              )}
            </span>
          ),
        },
        {
          node: c.measured ? (
            <span className="flex items-center justify-end gap-2">
              {pct(c.cpu)}
              {c.cpu_limit > 0 && (
                <span className="text-caption text-ash">
                  / {c.cpu_limit} {c.cpu_limit === 1 ? "core" : "cores"}
                </span>
              )}
            </span>
          ) : (
            "—"
          ),
          className: "text-end tabular-nums whitespace-nowrap",
        },
        {
          node: (
            <span
              className={cn(
                memShare >= 90 && "text-destructive",
                memShare >= 80 && memShare < 90 && "text-warning",
              )}
            >
              {memoryText(c)}
            </span>
          ),
          className: "text-end tabular-nums whitespace-nowrap",
        },
        {
          node: c.measured
            ? `↓ ${rate(c.net_rx_rate)} ↑ ${rate(c.net_tx_rate)}`
            : "—",
          className:
            "hidden @3xl:table-cell text-end tabular-nums whitespace-nowrap text-muted-foreground",
        },
        {
          node: c.ports.length ? (
            <span className="font-mono text-caption">
              {c.ports.slice(0, 3).map(portLabel).join(", ")}
              {c.ports.length > 3 && ` +${c.ports.length - 3}`}
            </span>
          ) : (
            <span className="text-ash">—</span>
          ),
          className: "hidden @4xl:table-cell",
        },
        {
          node: c.restarts ? (
            <Tag tone={c.restarts >= 3 ? "warning" : "muted"}>{c.restarts}</Tag>
          ) : (
            <span className="text-ash">0</span>
          ),
          className: "hidden @2xl:table-cell text-end tabular-nums",
        },
        {
          node:
            c.state === "running" ? (
              upFor(c.started_at) || "—"
            ) : (
              <span className="text-ash">{stoppedText(c) || "—"}</span>
            ),
          className:
            "hidden @2xl:table-cell whitespace-nowrap text-muted-foreground",
        },
      ]}
    />
  )
}

function PhoneItem({
  serverId,
  c,
  activity,
  can,
  onLogs,
}: {
  serverId: string
  c: DockerProjectContainer
  activity?: RowState
  can: DockerCan
  onLogs: (service: string) => void
}) {
  const router = useRouter()
  const menu = useMenu(serverId, c, can, onLogs)
  const st = stateText(c)
  const bits = [activity ? activity.label : st.label]
  if (c.measured) bits.push(`CPU ${pct(c.cpu)}`, memoryText(c))
  if (c.restarts) bits.push(`${c.restarts} restarts`)
  const stopped = stoppedText(c)
  if (stopped && !c.measured) bits.push(stopped.toLowerCase())
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
          bits.join(" · ")
        )
      }
      onOpen={() => router.push(containerHref(serverId, c.name))}
      menu={menu}
    />
  )
}
