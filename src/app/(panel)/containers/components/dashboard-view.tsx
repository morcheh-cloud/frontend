"use client"

import {
  ChevronRight,
  CircleCheck,
  type LucideIcon,
  Plus,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import type { ReactNode } from "react"

import {
  dockerFleetGroup,
  dockerGroups,
  dockerPages,
} from "@/components/panel/nav"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  DockerContainer,
  DockerEvent,
  DockerFleetServer,
  DockerImageScan,
  DockerReport,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { Segmented } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  useDockerEvents,
  useDockerNetworks,
  useDockerProjects,
  useDockerReport,
  useDockerScans,
  useDockerUpdates,
  useDockerVolumes,
} from "../api"
import { useDockerEnv } from "../env"
import {
  EventsChart,
  MemoryLimits,
  NetworkUsage,
  ProjectUsage,
  StateBreakdown,
  TroubleList,
} from "./dashboard-stats"
import { type EnvCtx, EnvPage } from "./env-page"
import { describeEvent, keyed } from "./events-view"
import { Containers, Host } from "./fleet-view"
import { PageBar } from "./kit"
import {
  ContainerState,
  containerHref,
  Dot,
  dockerHref,
  engineName,
  envHref,
  isProblem,
  viaLabel,
} from "./meta"
import { StackBar } from "./parts"
import { useDockerCan } from "./permissions"
import {
  newProjectHref,
  projectHref,
  projectStateMeta,
} from "./project-actions"
import {
  ContainersReport,
  KpiTiles,
  PhoneContainerRows,
  PhoneKpis,
  ReportLoading,
  TopConsumers,
  UsageCard,
} from "./report"
import { severities } from "./security-view"
import { ContainerMap } from "./topology"

export function DashboardPage() {
  const [{ tab }] = useQueryStates(dashboardParsers)
  return (
    <EnvPage title="Containers" root bleed fill={tab === "map"}>
      {(ctx) => <Dashboard {...ctx} />}
    </EnvPage>
  )
}

const RECENT = { hours: 24, type: "", exec: false } as const

function risky(s: DockerImageScan) {
  return !!s.counts && s.counts.critical + s.counts.high > 0
}

// Everything the Dashboard shows, read once for both layouts.
function useDashboard(env: DockerFleetServer) {
  const id = env.server_id
  const { fleet } = useDockerEnv()
  const containers = (fleet.data?.containers ?? []).filter(
    (c) => c.server_id === id,
  )
  const problems = containers.filter(isProblem)
  const updates = useDockerUpdates(id)
  const scans = useDockerScans(id)
  const projects = useDockerProjects(id)
  const events = useDockerEvents(id, RECENT)
  const networks = useDockerNetworks(id)
  const volumes = useDockerVolumes(id, false)
  const report = useDockerReport(id)
  const queries = [
    fleet,
    report,
    updates,
    scans,
    projects,
    events,
    networks,
    volumes,
  ]
  return {
    id,
    report,
    containers,
    problems,
    updates,
    scans,
    projects,
    events,
    networks,
    volumes,
    busy: queries.some((q) => q.isFetching),
    refresh: () => {
      for (const q of queries) q.refetch()
    },
  }
}

type Data = ReturnType<typeof useDashboard>

const dashTabs = [
  "overview",
  "map",
  "resources",
  "containers",
  "activity",
] as const
type DashTab = (typeof dashTabs)[number]

const tabLabel: Record<DashTab, string> = {
  overview: "Overview",
  map: "Map",
  resources: "Resources",
  containers: "Containers",
  activity: "Activity",
}

export const dashboardParsers = {
  tab: parseAsStringLiteral(dashTabs).withDefault("overview"),
}

const dashboardSerializer = createSerializer({
  env: parseAsString,
  ...dashboardParsers,
})

// A Dashboard tab on one environment.
export function dashboardHref(server: string, tab: DashTab = "overview") {
  return dashboardSerializer("/containers", { env: server, tab })
}

// /containers: the current environment at a glance, in tabs: Overview
// (what needs a look), Map (who talks to whom), Resources (where the CPU,
// memory and traffic go), Containers (every one, filterable) and Activity
// (what the engine did). Every block leads to the page that acts on it.
function Dashboard({ env, phone }: EnvCtx) {
  const d = useDashboard(env)
  const can = useDockerCan(env.server_id, env.workspace_id)
  const router = useRouter()
  const [{ tab }, setQuery] = useQueryStates(dashboardParsers, {
    history: "replace",
  })
  const setTab = (t: DashTab) => setQuery({ tab: t === "overview" ? null : t })
  const engine = [
    env.version && `${engineName(env)} ${env.version}`,
    env.via && (viaLabel[env.via] ?? env.via),
  ]
    .filter(Boolean)
    .join(" · ")
  const counts: Partial<Record<DashTab, ReactNode>> = {
    containers: d.report.data?.containers.length,
    overview: d.problems.length > 0 && (
      <span
        role="img"
        aria-label={`${d.problems.length} need a look`}
        className="size-1.5 rounded-full bg-destructive"
      />
    ),
  }

  return (
    <>
      <PageBar
        phone={phone}
        tabs={
          phone ? (
            <TabChips tab={tab} onChange={setTab} counts={counts} />
          ) : (
            <Segmented
              label="Dashboard"
              value={tab}
              onChange={setTab}
              items={dashTabs.map((t) => ({
                value: t,
                label: (
                  <span className="flex items-center gap-1.5">
                    {tabLabel[t]}
                    {counts[t] !== undefined && counts[t] !== false && (
                      <span className="text-caption text-ash tabular-nums">
                        {counts[t]}
                      </span>
                    )}
                  </span>
                ),
              }))}
            />
          )
        }
        caption={engine}
        refresh={{ busy: d.busy, run: d.refresh }}
        primary={
          can.manage
            ? {
                label: "New project",
                icon: <Plus />,
                run: () => router.push(newProjectHref(env.server_id)),
              }
            : undefined
        }
      />
      {phone ? (
        <PhoneDashboard env={env} d={d} tab={tab} />
      ) : (
        <DesktopDashboard env={env} d={d} tab={tab} />
      )}
    </>
  )
}

function TabChips({
  tab,
  onChange,
  counts,
}: {
  tab: DashTab
  onChange: (t: DashTab) => void
  counts: Partial<Record<DashTab, ReactNode>>
}) {
  return (
    <>
      {dashTabs.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={tab === t}
          onClick={() => onChange(t)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted aria-pressed:border-transparent aria-pressed:bg-foreground aria-pressed:font-medium aria-pressed:text-background"
        >
          {tabLabel[t]}
          {counts[t] !== undefined && counts[t] !== false && (
            <span className="text-caption tabular-nums opacity-70">
              {counts[t]}
            </span>
          )}
        </button>
      ))}
    </>
  )
}

// Report-based tabs wait for the report (or say why it isn't there).
function WithReport({
  d,
  children,
}: {
  d: Data
  children: (report: DockerReport) => ReactNode
}) {
  if (d.report.data) return children(d.report.data)
  if (d.report.isError) return <ReportError d={d} />
  return <ReportLoading />
}

function Row({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  )
}

function Wide({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">{children}</div>
  )
}

function Side({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-4">{children}</div>
}

function DesktopDashboard({
  env,
  d,
  tab,
}: {
  env: DockerFleetServer
  d: Data
  tab: DashTab
}) {
  const report = d.report.data
  if (tab === "map") {
    return (
      <div className="mt-4">
        <WithReport d={d}>
          {(r) => <ContainerMap report={r} server={d.id} phone={false} />}
        </WithReport>
      </div>
    )
  }
  if (tab === "resources") {
    return (
      <div className="mt-4 flex flex-col gap-4">
        <WithReport d={d}>
          {(r) => (
            <>
              <Row>
                <Wide>
                  <UsageCard report={r} />
                  <ProjectUsage report={r} server={d.id} phone={false} />
                </Wide>
                <Side>
                  <TopConsumers report={r} server={d.id} />
                  <MemoryLimits report={r} server={d.id} phone={false} />
                  <NetworkUsage report={r} server={d.id} phone={false} />
                </Side>
              </Row>
            </>
          )}
        </WithReport>
      </div>
    )
  }
  if (tab === "containers") {
    return (
      <div className="mt-4">
        <WithReport d={d}>
          {(r) => <ContainersReport report={r} server={d.id} full />}
        </WithReport>
      </div>
    )
  }
  if (tab === "activity") {
    return (
      <div className="mt-4">
        <Row>
          <Wide>
            <EventsChart events={d.events.data?.items ?? []} phone={false} />
            <EventsCard d={d} limit={40} />
          </Wide>
          <Side>
            {report && (
              <TroubleList report={report} server={d.id} phone={false} />
            )}
            <UpdatesCard d={d} />
          </Side>
        </Row>
      </div>
    )
  }
  return (
    <div className="mt-4 flex flex-col gap-4">
      {report ? (
        <KpiTiles report={report} />
      ) : d.report.isError ? (
        <ReportError d={d} />
      ) : (
        <ReportLoading />
      )}
      <Attention d={d} />
      <Row>
        <Wide>
          <ProjectsCard d={d} />
          <UpdatesCard d={d} />
          <SecurityCard d={d} />
          <EventsCard
            d={d}
            limit={8}
            href={dashboardHref(d.id, "activity")}
            link="All activity"
          />
        </Wide>
        <Side>
          {report && <StateBreakdown report={report} phone={false} />}
          {report && <TopConsumers report={report} server={d.id} />}
          <EngineCard env={env} />
        </Side>
      </Row>
    </div>
  )
}

function ReportError({ d }: { d: Data }) {
  return (
    <section
      aria-label="Report"
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"
    >
      <TriangleAlert className="size-5 shrink-0 text-warning" />
      <p className="min-w-0 flex-1 text-body-sm">
        Couldn't read the report: {d.report.error?.message}
      </p>
    </section>
  )
}

// --- Desktop cards -----------------------------------------------------------

function Card({
  title,
  href,
  link,
  children,
  className,
}: {
  title: string
  href?: string
  link?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <h2 className="text-body-sm font-medium">{title}</h2>
        {href && (
          <Link
            href={href}
            className="ms-auto flex items-center gap-0.5 text-caption text-muted-foreground outline-none hover:text-brand focus-visible:text-brand"
          >
            {link ?? "Open"}
            <ChevronRight className="size-3.5 rtl:rotate-180" />
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}

function Quiet({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 pb-4 text-body-sm text-muted-foreground">{children}</p>
  )
}

function Loading() {
  return (
    <div className="flex flex-col gap-2 px-5 pb-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  )
}

function Attention({ d }: { d: Data }) {
  const list = d.problems.slice(0, 6)
  if (d.problems.length === 0) {
    return (
      <section
        aria-label="Needs a look"
        className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"
      >
        <CircleCheck className="size-5 shrink-0 text-success" />
        <div className="min-w-0">
          <p className="text-body-sm font-medium">Nothing needs a look</p>
          <p className="text-caption text-muted-foreground">
            No container is failing, restarting or unhealthy.
          </p>
        </div>
      </section>
    )
  }
  return (
    <Card
      title={`Needs a look · ${d.problems.length}`}
      href={dockerHref(d.id, { show: "problems" })}
      link="All of them"
      className="border-destructive/40"
    >
      <ul className="divide-y divide-border border-t border-border">
        {list.map((c) => (
          <ContainerLine key={c.id} c={c} server={d.id} />
        ))}
      </ul>
    </Card>
  )
}

function ContainerLine({ c, server }: { c: DockerContainer; server: string }) {
  return (
    <li>
      <Link
        href={containerHref(server, c.name)}
        className="flex items-center gap-3 px-5 py-2.5 outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
          {c.name}
        </span>
        <span className="hidden min-w-0 truncate font-mono text-caption text-ash md:block md:max-w-60">
          {c.image}
        </span>
        <ContainerState c={c} className="text-caption" />
      </Link>
    </li>
  )
}

function ProjectsCard({ d }: { d: Data }) {
  const items = [...(d.projects.data ?? [])].sort(
    (a, b) =>
      Number(b.state === "partial") - Number(a.state === "partial") ||
      a.name.localeCompare(b.name),
  )
  const running = items.filter(
    (p) => p.state === "running" || p.state === "partial",
  ).length
  return (
    <Card
      title={
        d.projects.data
          ? `Projects · ${running} of ${items.length} running`
          : "Projects"
      }
      href={envHref(d.id, "/containers/projects")}
      link="All projects"
    >
      {d.projects.isPending ? (
        <Loading />
      ) : d.projects.isError ? (
        <Quiet>Couldn't read the projects: {d.projects.error.message}</Quiet>
      ) : items.length === 0 ? (
        <Quiet>
          No compose projects yet. Start one from a{" "}
          <Link href="/containers/templates" className="text-brand">
            template
          </Link>
          .
        </Quiet>
      ) : (
        <ul className="grid border-t border-border sm:grid-cols-2">
          {items.slice(0, 8).map((p) => {
            const meta = projectStateMeta[p.state]
            return (
              <li
                key={p.name}
                className="border-b border-border last:border-b-0 sm:odd:border-e [&:nth-last-child(-n+2)]:sm:border-b-0"
              >
                <Link
                  href={projectHref(d.id, p.name)}
                  className="flex items-center gap-3 px-5 py-2.5 outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
                >
                  <Dot tone={meta.tone} />
                  <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                    {p.total > 0 ? `${p.running}/${p.total}` : meta.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
})

function EventLine({ e, server }: { e: DockerEvent; server: string }) {
  const what = describeEvent(e)
  const name = e.name || e.image || e.id.slice(0, 12)
  return (
    <li className="flex items-center gap-3 px-5 py-2">
      <time
        dateTime={e.time}
        className="w-16 shrink-0 text-caption whitespace-nowrap text-ash tabular-nums"
      >
        {timeFormat.format(new Date(e.time))}
      </time>
      <span className="min-w-0 flex-1 truncate text-body-sm">
        {e.type === "container" && e.action !== "destroy" && e.name ? (
          <Link
            href={containerHref(server, e.name)}
            className="font-medium outline-none hover:text-brand focus-visible:text-brand"
          >
            {name}
          </Link>
        ) : (
          <span className="font-medium">{name}</span>
        )}
      </span>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5 text-caption text-muted-foreground",
          what.tone === "destructive" && "text-destructive",
          what.tone === "warning" && "text-warning",
        )}
      >
        <Dot tone={what.tone} />
        {what.text}
      </span>
    </li>
  )
}

function EventsCard({
  d,
  limit,
  href,
  link,
}: {
  d: Data
  limit: number
  href?: string
  link?: string
}) {
  const items = d.events.data?.items ?? []
  return (
    <Card
      title="Last 24 hours"
      href={href ?? envHref(d.id, "/containers/events")}
      link={link ?? "Event log"}
    >
      {d.events.isPending ? (
        <Loading />
      ) : d.events.isError && !d.events.data ? (
        <Quiet>Couldn't read the events: {d.events.error.message}</Quiet>
      ) : items.length === 0 ? (
        <Quiet>Quiet: the engine reported nothing in the last 24 hours.</Quiet>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {keyed(items.slice(0, limit)).map(({ e, key }) => (
            <EventLine key={key} e={e} server={d.id} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function EngineCard({ env }: { env: DockerFleetServer }) {
  return (
    <Card
      title={env.name}
      href={envHref(env.server_id, "/containers/list")}
      link="Containers"
    >
      <Containers s={env} />
      <Host s={env} />
    </Card>
  )
}

function UpdatesCard({ d }: { d: Data }) {
  const data = d.updates.data
  const available = (data?.items ?? []).filter((u) => u.state === "available")
  const failed = (data?.items ?? []).filter((u) => u.state === "error").length
  return (
    <Card
      title={data ? `Updates · ${data.available}` : "Updates"}
      href={envHref(d.id, "/containers/updates")}
      link="Review"
    >
      {d.updates.isPending ? (
        <Loading />
      ) : d.updates.isError ? (
        <Quiet>Couldn't read updates: {d.updates.error.message}</Quiet>
      ) : !data?.checked_at ? (
        <Quiet>Not checked yet. Open Updates and press Check now.</Quiet>
      ) : (
        <>
          {available.length === 0 ? (
            <Quiet>Every image in use is up to date.</Quiet>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {available.slice(0, 5).map((u) => (
                <li
                  key={u.image}
                  className="flex items-center gap-2 px-5 py-2 text-body-sm"
                >
                  <Dot tone="brand" />
                  <span className="min-w-0 flex-1 truncate font-mono text-caption">
                    {u.image}
                  </span>
                  <span className="shrink-0 text-caption text-muted-foreground">
                    {u.containers.length} container
                    {u.containers.length === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-border px-5 py-2.5 text-caption text-ash">
            Checked {timeAgo(data.checked_at)}
            {failed > 0 && (
              <span className="text-warning">
                {" "}
                · {failed} couldn't be checked
              </span>
            )}
          </p>
        </>
      )}
    </Card>
  )
}

function SecurityCard({ d }: { d: Data }) {
  const data = d.scans.data
  const scanned = (data?.items ?? []).filter((s) => s.scanned)
  const worst = scanned
    .filter(risky)
    .sort(
      (a, b) =>
        (b.counts?.critical ?? 0) - (a.counts?.critical ?? 0) ||
        (b.counts?.high ?? 0) - (a.counts?.high ?? 0),
    )
  const totals = data?.totals
  return (
    <Card
      title="Vulnerabilities"
      href={envHref(d.id, "/containers/security")}
      link="Security"
    >
      {d.scans.isPending ? (
        <Loading />
      ) : d.scans.isError ? (
        <Quiet>Couldn't read the scans: {d.scans.error.message}</Quiet>
      ) : scanned.length === 0 || !totals ? (
        <Quiet>No image scanned yet. Scan them from Security.</Quiet>
      ) : (
        <>
          <div className="flex flex-col gap-2.5 px-5 pb-4">
            <StackBar
              label="Findings"
              parts={severities.map((s) => ({
                value: totals[s.key],
                className: s.bar,
                label: s.label.toLowerCase(),
              }))}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
              {severities
                .filter((s) => s.key !== "unknown")
                .map((s) => (
                  <span key={s.key}>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        totals[s.key] > 0 && s.text,
                      )}
                    >
                      {totals[s.key]}
                    </span>{" "}
                    {s.label.toLowerCase()}
                  </span>
                ))}
            </div>
            <p className="text-caption text-ash">
              {scanned.length} of {data?.items.length} images scanned
              {totals.fixable > 0 && ` · ${totals.fixable} have a fix`}
            </p>
          </div>
          {worst.length > 0 && (
            <ul className="divide-y divide-border border-t border-border">
              {worst.slice(0, 4).map((s) => (
                <li
                  key={s.image_id}
                  className="flex items-center gap-2 px-5 py-2"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-caption">
                    {s.tags[0] ?? s.image}
                  </span>
                  <span className="shrink-0 text-caption tabular-nums">
                    {s.counts?.critical ? (
                      <span className="text-destructive">
                        {s.counts.critical} critical
                      </span>
                    ) : (
                      <span className="text-warning">
                        {s.counts?.high} high
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}

// --- Phone -------------------------------------------------------------------

function PhoneDashboard({
  env,
  d,
  tab,
}: {
  env: DockerFleetServer
  d: Data
  tab: DashTab
}) {
  if (tab === "map") {
    return (
      <div className="pt-3">
        <WithReport d={d}>
          {(r) => <ContainerMap report={r} server={d.id} phone />}
        </WithReport>
      </div>
    )
  }
  if (tab === "resources") {
    return (
      <div className="flex flex-col pt-4 pb-24">
        <WithReport d={d}>
          {(r) => (
            <>
              <PhoneKpis report={r} />
              <section aria-label="Usage" className="mt-6">
                <h2 className="px-4 pb-2 font-label text-caption tracking-label text-ash uppercase">
                  Usage
                </h2>
                <UsageCard report={r} phone />
              </section>
              <ProjectUsage report={r} server={d.id} phone />
              <MemoryLimits report={r} server={d.id} phone />
              <NetworkUsage report={r} server={d.id} phone />
            </>
          )}
        </WithReport>
      </div>
    )
  }
  if (tab === "containers") {
    return (
      <div className="flex flex-col pb-24">
        <WithReport d={d}>
          {(r) => (
            <PhoneGroup
              title={`${r.containers.length} containers · problems first`}
            >
              <PhoneContainerRows
                report={r}
                server={d.id}
                limit={r.containers.length}
              />
            </PhoneGroup>
          )}
        </WithReport>
      </div>
    )
  }
  if (tab === "activity") {
    const items = d.events.data?.items ?? []
    return (
      <div className="flex flex-col pb-24">
        <EventsChart events={items} phone />
        {d.report.data && (
          <TroubleList report={d.report.data} server={d.id} phone />
        )}
        {items.length > 0 && (
          <PhoneGroup title="Last 24 hours">
            {keyed(items.slice(0, 40)).map(({ e, key }) => (
              <EventLine key={key} e={e} server={d.id} />
            ))}
          </PhoneGroup>
        )}
        <Link
          href={envHref(d.id, "/containers/events")}
          className="mx-4 mt-4 flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border text-body-sm active:bg-muted"
        >
          Open the event log
          <ChevronRight className="size-4 text-ash rtl:rotate-180" />
        </Link>
      </div>
    )
  }
  return <PhoneOverview env={env} d={d} />
}

// Phones have no sidebar: the Overview lists every Containers page, each
// with its number, like a native app's home screen.
function PhoneOverview({ env, d }: { env: DockerFleetServer; d: Data }) {
  const icon = (href: string) =>
    dockerPages.find((p) => p.href === href)?.icon ?? ChevronRight
  const updates = d.updates.data?.available
  const totals = d.scans.data?.totals
  const risk = totals ? totals.critical + totals.high : undefined
  const projects = d.projects.data
  const values: Record<string, { text?: string; alert?: boolean }> = {
    "/containers/updates": {
      text: updates
        ? `${updates} available`
        : updates === 0
          ? "Up to date"
          : "",
      alert: !!updates,
    },
    "/containers/security": {
      text: risk
        ? `${risk} critical or high`
        : risk === 0
          ? "None serious"
          : "",
      alert: !!risk,
    },
    "/containers/projects": {
      text: projects ? String(projects.length) : String(env.projects),
    },
    "/containers/list": {
      text: `${env.running}/${env.total} running`,
      alert: d.problems.length > 0,
    },
    "/containers/images": { text: String(env.images) },
    "/containers/networks": {
      text: d.networks.data ? String(d.networks.data.length) : "",
    },
    "/containers/volumes": {
      text: d.volumes.data ? String(d.volumes.data.length) : "",
    },
  }
  const scoped = (href: string) =>
    [
      "/containers/updates",
      "/containers/security",
      "/containers/projects",
      "/containers/list",
      "/containers/images",
      "/containers/networks",
      "/containers/volumes",
      "/containers/events",
    ].includes(href)
      ? envHref(d.id, href)
      : href

  return (
    <div className="flex flex-col pt-4 pb-24">
      {d.report.data ? (
        <PhoneKpis report={d.report.data} />
      ) : (
        <div className="border-y border-border">
          <Containers s={env} />
        </div>
      )}

      {d.problems.length > 0 && (
        <PhoneGroup title={`Needs a look · ${d.problems.length}`}>
          {d.problems.slice(0, 5).map((c) => (
            <li key={c.id}>
              <Link
                href={containerHref(d.id, c.name)}
                className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-muted"
              >
                <TriangleAlert className="size-5 shrink-0 text-destructive" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium">
                    {c.name}
                  </span>
                  <ContainerState
                    c={c}
                    className="text-caption text-muted-foreground"
                  />
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </PhoneGroup>
      )}

      {d.report.data && <StateBreakdown report={d.report.data} phone />}

      {[...dockerGroups, dockerFleetGroup].map((g) => (
        <PhoneGroup key={g.label} title={g.label ?? ""}>
          {g.items
            .flatMap((item) =>
              item.children
                ? item.children.map((c) => ({ ...c, icon: icon(c.href) }))
                : [item],
            )
            .filter((item) => item.href !== "/containers")
            .map((item) => (
              <PhoneLink
                key={item.href}
                href={scoped(item.href)}
                icon={item.icon}
                label={item.label}
                value={values[item.href]?.text}
                alert={values[item.href]?.alert}
              />
            ))}
        </PhoneGroup>
      ))}

      {(d.events.data?.items.length ?? 0) > 0 && (
        <PhoneGroup title="Last 24 hours">
          {keyed(d.events.data?.items.slice(0, 5) ?? []).map(({ e, key }) => (
            <EventLine key={key} e={e} server={d.id} />
          ))}
        </PhoneGroup>
      )}
    </div>
  )
}

function PhoneGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="mt-6">
      <h2 className="px-4 pb-2 font-label text-caption tracking-label text-ash uppercase">
        {title}
      </h2>
      <ul className="divide-y divide-border border-y border-border">
        {children}
      </ul>
    </section>
  )
}

function PhoneLink({
  href,
  icon: Icon,
  label,
  value,
  alert,
}: {
  href: string
  icon: LucideIcon
  label: string
  value?: string
  alert?: boolean
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-12 items-center gap-3 px-4 active:bg-muted"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-body">{label}</span>
        {value && (
          <span
            className={cn(
              "shrink-0 text-body-sm text-muted-foreground tabular-nums",
              alert && "font-medium text-destructive",
            )}
          >
            {value}
          </span>
        )}
        <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
      </Link>
    </li>
  )
}
