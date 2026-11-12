"use client"

import {
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Container,
  Cpu,
  HardDrive,
  HeartPulse,
  Layers,
  MemoryStick,
  RefreshCw,
  SearchX,
  ServerOff,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { formatSize } from "@/lib/format"
import type { DockerFleet, DockerFleetServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { Meter } from "../../servers/[id]/components/resources"
import { OsTile, timeAgo } from "../../servers/components/meta"
import { useDockerFleet } from "../api"
import { useDockerEnv } from "../env"
import {
  ContainerRows,
  ContainersTable,
  type ServerInfo,
} from "./container-list"
import {
  byAttention,
  byContainer,
  counts,
  Dot,
  engineName,
  engineStateMeta,
  envHref,
  fleetOs,
  fleetTrouble,
  matches,
  type Show,
  showLabels,
  useFleetFilters,
  viaLabel,
} from "./meta"
import { StackBar } from "./parts"

// The Containers page: every server of the workspace that runs Docker or
// Podman, as cards with their numbers, or every container on them in one
// list.
export function FleetView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <Fleet phone={phone} />
}

// Servers with an engine (or one that can't be read right now) come first;
// those without one and those offline fold away at the bottom.
function split(list: DockerFleetServer[]) {
  const shown: DockerFleetServer[] = []
  const away: DockerFleetServer[] = []
  for (const s of [...list].sort(byAttention)) {
    if (s.state === "not-installed" || (s.state === "offline" && !s.total))
      away.push(s)
    else shown.push(s)
  }
  return { shown, away }
}

function infoOf(data?: DockerFleet) {
  return new Map<string, ServerInfo>(
    (data?.servers ?? []).map((s) => [
      s.server_id,
      { workspace: s.workspace_id, name: s.name, address: s.address },
    ]),
  )
}

function Fleet({ phone }: { phone: boolean }) {
  const fleet = useDockerFleet()
  const [filters, setFilters] = useFleetFilters()
  const { shown, away } = split(fleet.data?.servers ?? [])
  const q = filters.q.trim().toLowerCase()
  const servers = shown.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q),
  )
  const containers = fleet.data?.containers ?? []
  const n = counts(containers)
  const listed = containers.filter((c) => matches(c, q, filters.show))
  const view = filters.view
  const info = infoOf(fleet.data)

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={fleet.isFetching}
      onClick={() => fleet.refetch()}
    >
      <RefreshCw className={cn(fleet.isFetching && "animate-spin")} />
    </Button>
  )
  const views = (
    <Segmented
      label="View"
      items={[
        { value: "servers", label: `Servers · ${shown.length}` },
        { value: "containers", label: `Containers · ${containers.length}` },
      ]}
      value={view}
      onChange={(v) =>
        setFilters({ view: v === "servers" ? null : v, show: null })
      }
    />
  )
  const shows = view === "containers" && (
    <Segmented<Show>
      label="Show"
      items={(["all", "running", "stopped", "problems"] as const).map((v) => ({
        value: v,
        label: `${showLabels[v]} · ${n[v]}`,
      }))}
      value={filters.show}
      onChange={(v) => setFilters({ show: v === "all" ? null : v })}
    />
  )
  const search = (
    <SearchBox
      value={filters.q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder={
        view === "servers"
          ? "Search servers"
          : "Search name, image, project or port"
      }
      label={view === "servers" ? "Search servers" : "Search containers"}
      className="min-w-0 flex-1 md:max-w-72 md:min-w-36"
    />
  )
  const trouble = shown.reduce((sum, s) => sum + fleetTrouble(s), 0)
  const caption = fleet.data && (
    <span className="hidden text-caption whitespace-nowrap text-muted-foreground @4xl:inline">
      {n.running} of {n.all} running
      {trouble > 0 && (
        <span className="text-destructive"> · {trouble} need a look</span>
      )}
      {fleet.dataUpdatedAt > 0 && (
        <> · Updated {timeAgo(new Date(fleet.dataUpdatedAt).toISOString())}</>
      )}
    </span>
  )

  let body: ReactNode
  if (fleet.isPending) {
    body = phone ? <PhoneSkeleton /> : <CardsSkeleton />
  } else if (fleet.isError && !fleet.data) {
    body = (
      <Empty
        icon={TriangleAlert}
        title="Couldn't load containers"
        body={fleet.error.message || "The server didn't answer. Try again."}
        className="max-md:mt-4"
        action={
          <Button variant="outline" onClick={() => fleet.refetch()}>
            Try again
          </Button>
        }
      />
    )
  } else if (shown.length === 0) {
    body = (
      <>
        <Empty
          icon={Container}
          title="No server runs Docker yet"
          body={
            away.length > 0
              ? "None of the servers in this workspace has Docker or Podman. Install it on one (for example from Applications) and its containers show up here by themselves."
              : "Add a server first: once it has Docker or Podman, its containers, images, volumes and networks show up here."
          }
          className="max-md:mt-4"
          action={
            <Button
              variant="outline"
              render={
                <Link href={away.length ? "/applications" : "/servers"} />
              }
              nativeButton={false}
            >
              {away.length ? "Open Applications" : "Go to Servers"}
            </Button>
          }
        />
        <Away list={away} phone={phone} />
      </>
    )
  } else if (view === "servers") {
    body =
      servers.length === 0 ? (
        <NoMatch onReset={() => setFilters({ q: null })} />
      ) : (
        <>
          {phone ? (
            <ul className="divide-y divide-border border-y border-border">
              {servers.map((s) => (
                <ServerRow key={s.server_id} s={s} />
              ))}
            </ul>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-4">
              {servers.map((s) => (
                <ServerCard key={s.server_id} s={s} />
              ))}
            </div>
          )}
          {!q && <Away list={away} phone={phone} />}
        </>
      )
  } else if (listed.length === 0) {
    body = (
      <NoMatch
        problems={filters.show === "problems" && !q}
        onReset={() => setFilters({ q: null, show: null })}
      />
    )
  } else {
    const groups = [
      {
        key: "all",
        project: "",
        containers: [...listed].sort(byContainer),
        running: 0,
        problems: 0,
      },
    ]
    body = phone ? (
      <ContainerRows groups={groups} servers={info} showServer />
    ) : (
      <ContainersTable groups={groups} servers={info} showServer />
    )
  }

  if (phone) {
    return (
      <>
        <PhoneBar />
        <div className="flex flex-col gap-3 px-4 pt-4">
          <div className="flex items-center gap-2">
            {search}
            {refresh}
          </div>
          {shown.length > 0 && (
            <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
              {views}
              {shows}
            </div>
          )}
        </div>
        <div className="pt-3 pb-24">{body}</div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-6 pt-5 pb-24">
      <div className="@container flex items-center gap-2">
        {views}
        {shows}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        {search}
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <span className="me-2">{caption}</span>
          {refresh}
        </div>
      </div>
      {body}
    </div>
  )
}

function NoMatch({
  problems = false,
  onReset,
}: {
  problems?: boolean
  onReset: () => void
}) {
  return (
    <Empty
      icon={SearchX}
      title={problems ? "Nothing needs a look" : "Nothing matches"}
      body={
        problems
          ? "Every container is running or stopped cleanly, and every health check passes."
          : "Try another search or filter."
      }
      className="max-md:mt-4"
      action={
        <Button variant="outline" onClick={onReset}>
          Show all
        </Button>
      }
    />
  )
}

// --- Server card (desktop) -------------------------------------------------

// A stale sample (the server's monitor stopped) is shown with its age.
const STALE = 5 * 60_000

function pct(used: number, total: number) {
  return total > 0 ? (used / total) * 100 : 0
}

function ServerCard({ s }: { s: DockerFleetServer }) {
  const current = useDockerEnv().id === s.server_id
  const ready = s.state === "ready"
  const meta = engineStateMeta[s.state]
  const trouble = fleetTrouble(s)
  return (
    <Link
      href={envHref(s.server_id)}
      className={cn(
        "group flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
        trouble > 0 && "border-destructive/40",
      )}
    >
      <div className="flex items-start gap-3 p-5 pb-4">
        <OsTile os={fleetOs(s)} className="size-10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-body font-medium">{s.name}</span>
            {s.podman && <Tag>Podman</Tag>}
            {current && <CurrentTag />}
          </div>
          <p className="truncate text-caption text-muted-foreground">
            {s.address}
            {s.version && ` · ${engineName(s)} ${s.version}`}
          </p>
        </div>
        {ready ? (
          trouble > 0 ? (
            <span className="flex shrink-0 items-center gap-1.5 text-caption font-medium text-destructive">
              <TriangleAlert className="size-3.5" />
              {trouble} need{trouble === 1 ? "s" : ""} a look
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5 text-caption text-muted-foreground">
              <Dot tone="success" />
              Healthy
            </span>
          )
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 text-caption text-muted-foreground">
            <Dot tone={meta.tone} />
            {meta.label}
          </span>
        )}
      </div>

      {ready ? (
        <>
          <Containers s={s} />
          <Host s={s} />
          <div className="mt-auto flex items-center gap-4 border-t border-border px-5 py-3 text-caption text-muted-foreground">
            <Stat icon={Layers} label="Images" value={s.images} />
            <Stat icon={Boxes} label="Projects" value={s.projects} />
            {s.via && (
              <span className="ms-auto truncate text-ash">
                {viaLabel[s.via] ?? s.via}
              </span>
            )}
            <ChevronRight className="size-4 shrink-0 text-ash transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </div>
        </>
      ) : (
        <div className="mt-auto flex items-start gap-3 border-t border-border px-5 py-4 text-body-sm">
          <TriangleAlert
            className={cn(
              "mt-0.5 size-4 shrink-0",
              meta.tone === "destructive" ? "text-destructive" : "text-warning",
              s.state === "offline" && "text-ash",
            )}
          />
          <div className="min-w-0">
            <p>{meta.hint}</p>
            {s.message && (
              <p className="mt-1 line-clamp-2 font-mono text-caption break-all text-muted-foreground">
                {s.message}
              </p>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}

function CurrentTag() {
  return (
    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-caption font-medium text-brand-strong">
      Current
    </span>
  )
}

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"

function PhoneBar() {
  const back = useBack("/containers")
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-12 items-center gap-1 px-1">
        <div className="flex w-22 shrink-0">
          <button
            type="button"
            aria-label="Back"
            onClick={back}
            className={barButton}
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </button>
        </div>
        <h1 className="min-w-0 flex-1 truncate text-center text-body font-medium">
          Environments
        </h1>
        <div className="flex w-22 shrink-0 justify-end">
          <HelpButton
            href={guideHref("containers", "environments")}
            label="Containers guide"
          />
        </div>
      </div>
    </header>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-label text-[10px] tracking-label text-muted-foreground uppercase">
      {children}
    </span>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers
  label: string
  value: number
}) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3.5 text-ash" />
      <span className="font-medium text-foreground tabular-nums">{value}</span>
      {label}
    </span>
  )
}

function stateParts(s: DockerFleetServer) {
  const stoppedClean = Math.max(0, s.stopped - s.failed)
  return [
    {
      value: s.running - s.unhealthy,
      className: "bg-success",
      label: "running",
    },
    { value: s.unhealthy, className: "bg-destructive", label: "unhealthy" },
    { value: s.restarting, className: "bg-warning", label: "restarting" },
    { value: s.paused, className: "bg-ash", label: "paused" },
    { value: s.failed, className: "bg-destructive/60", label: "failed" },
    { value: stoppedClean, className: "bg-mist", label: "stopped" },
  ]
}

// Running/total, a bar of states and the health checks.
export function Containers({ s }: { s: DockerFleetServer }) {
  const checks = s.healthy + s.unhealthy + s.starting
  const stoppedClean = Math.max(0, s.stopped - s.failed)
  return (
    <div className="flex flex-col gap-3 px-5 pb-4">
      <div className="flex items-baseline gap-2">
        <span className="text-heading leading-none font-light tabular-nums">
          {s.running}
        </span>
        <span className="text-body-sm text-muted-foreground">
          of {s.total} running
        </span>
      </div>
      <StackBar parts={stateParts(s)} label="Containers" />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
        {s.unhealthy > 0 && (
          <Legend tone="destructive" text={`${s.unhealthy} unhealthy`} />
        )}
        {s.failed > 0 && (
          <Legend tone="destructive" text={`${s.failed} failed`} />
        )}
        {s.restarting > 0 && (
          <Legend tone="warning" text={`${s.restarting} restarting`} />
        )}
        {s.paused > 0 && <Legend tone="muted" text={`${s.paused} paused`} />}
        {stoppedClean > 0 && (
          <Legend tone="muted" text={`${stoppedClean} stopped`} />
        )}
        {checks > 0 && (
          <span className="flex items-center gap-1.5">
            <HeartPulse className="size-3.5 text-ash" />
            {s.healthy}/{checks} healthy
            {s.starting > 0 && `, ${s.starting} starting`}
          </span>
        )}
        {s.total === 0 && <span>No containers yet</span>}
      </div>
    </div>
  )
}

function Legend({
  tone,
  text,
}: {
  tone: "destructive" | "warning" | "muted"
  text: string
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5",
        tone === "destructive" && "text-destructive",
      )}
    >
      <Dot tone={tone} />
      {text}
    </span>
  )
}

// CPU, memory and disk from the server's monitor.
export function Host({ s }: { s: DockerFleetServer }) {
  const h = s.host
  if (!h) {
    return (
      <div className="border-t border-border px-5 py-4 text-caption text-muted-foreground">
        No resource samples yet: they appear once the server's metrics are
        collected.
      </div>
    )
  }
  const stale = Date.now() - new Date(h.at).getTime() > STALE
  const fullest =
    h.disk_max_mount && h.disk_max_percent > pct(h.disk_used, h.disk_total) + 5
  return (
    <div className="flex flex-col gap-2.5 border-t border-border px-5 py-4">
      <Gauge
        icon={Cpu}
        label="CPU"
        value={h.cpu_percent}
        detail={`${h.cores} core${h.cores === 1 ? "" : "s"} · load ${h.load1.toFixed(2)}`}
      />
      <Gauge
        icon={MemoryStick}
        label="Memory"
        value={pct(h.mem_used, h.mem_total)}
        detail={`${formatSize(h.mem_used)} / ${formatSize(h.mem_total)}`}
      />
      <Gauge
        icon={HardDrive}
        label="Disk"
        value={pct(h.disk_used, h.disk_total)}
        detail={`${formatSize(h.disk_used)} / ${formatSize(h.disk_total)}`}
      />
      {fullest && (
        <p className="text-caption text-muted-foreground">
          Fullest:{" "}
          <span
            className={cn(
              "font-mono",
              h.disk_max_percent >= 90
                ? "text-destructive"
                : h.disk_max_percent >= 80 && "text-warning",
            )}
          >
            {h.disk_max_mount} {Math.round(h.disk_max_percent)}%
          </span>
        </p>
      )}
      {stale && <p className="text-caption text-ash">As of {timeAgo(h.at)}</p>}
    </div>
  )
}

function Gauge({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Cpu
  label: string
  value: number
  detail: string
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-caption">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 text-ash" />
        {label}
      </span>
      <Meter value={value} label={`${label} ${Math.round(value)}%`} />
      <span className="w-36 truncate text-end text-muted-foreground tabular-nums">
        <span className="font-medium text-foreground">
          {Math.round(value)}%
        </span>{" "}
        · {detail}
      </span>
    </div>
  )
}

// --- Server row (phone) ----------------------------------------------------

function ServerRow({ s }: { s: DockerFleetServer }) {
  const current = useDockerEnv().id === s.server_id
  const ready = s.state === "ready"
  const meta = engineStateMeta[s.state]
  const trouble = fleetTrouble(s)
  const h = s.host
  return (
    <li>
      <Link
        href={envHref(s.server_id)}
        className="flex min-h-18 items-center gap-3 px-4 py-3 active:bg-muted"
      >
        <OsTile os={fleetOs(s)} className="size-10" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-body font-medium">{s.name}</span>
            {s.podman && <Tag>Podman</Tag>}
            {current && <CurrentTag />}
          </span>
          {ready ? (
            <>
              <span className="flex items-center gap-2 text-caption text-muted-foreground">
                <span className="tabular-nums">
                  <span className="font-medium text-foreground">
                    {s.running}
                  </span>
                  /{s.total} running
                </span>
                {trouble > 0 && (
                  <span className="text-destructive">
                    · {trouble} need{trouble === 1 ? "s" : ""} a look
                  </span>
                )}
              </span>
              <StackBar
                parts={stateParts(s)}
                label="Containers"
                className="h-1.5"
              />
              {h && (
                <span className="text-caption text-muted-foreground tabular-nums">
                  CPU {Math.round(h.cpu_percent)}% · Memory{" "}
                  {Math.round(pct(h.mem_used, h.mem_total))}% · Disk{" "}
                  {Math.round(pct(h.disk_used, h.disk_total))}%
                </span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <Dot tone={meta.tone} />
              {meta.label}
            </span>
          )}
        </span>
        <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
      </Link>
    </li>
  )
}

// --- Servers without an engine ----------------------------------------------

function Away({ list, phone }: { list: DockerFleetServer[]; phone: boolean }) {
  const [open, setOpen] = useState(false)
  if (list.length === 0) return null
  return (
    <section
      className={cn(
        "mt-2",
        phone ? "mt-6" : "rounded-2xl border border-border",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2 text-start text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          phone ? "min-h-11 px-4" : "rounded-2xl px-5 py-3",
        )}
      >
        <ServerOff className="size-4 text-ash" />
        {list.length} server{list.length === 1 ? "" : "s"} without a container
        engine, or offline
        <ChevronDown
          className={cn(
            "ms-auto size-4 text-ash transition-transform",
            !open && "-rotate-90",
          )}
        />
      </button>
      {open && (
        <ul
          className={cn(
            "divide-y divide-border border-t border-border",
            phone && "border-b",
          )}
        >
          {list.map((s) => {
            const meta = engineStateMeta[s.state]
            return (
              <li key={s.server_id}>
                <Link
                  href={`/servers/${s.server_id}`}
                  className={cn(
                    "flex min-h-11 items-center gap-3 text-body-sm hover:bg-subtle/60 active:bg-muted",
                    phone ? "px-4 py-2" : "px-5 py-2.5",
                  )}
                >
                  <OsTile os={fleetOs(s)} className="size-7" />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="hidden truncate text-caption text-ash sm:inline">
                    {s.address}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-caption text-muted-foreground">
                    <Dot tone={meta.tone} />
                    {meta.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// --- Loading ---------------------------------------------------------------

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <Skeleton key={i} className="h-80 rounded-2xl" />
      ))}
    </div>
  )
}

function PhoneSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4">
      {Array.from({ length: 4 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
  )
}
