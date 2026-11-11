"use client"

import {
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  ListChecks,
  Star,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"

import { jobSummary } from "@/app/(panel)/cronjobs/components/meta"
import { Meter } from "@/app/(panel)/servers/[id]/components/resources"
import type { ServerModel } from "@/app/(panel)/servers/components/insights/model"
import {
  address,
  OsTile,
  StatusDot,
  statusMeta,
  timeAgo,
} from "@/app/(panel)/servers/components/meta"
import { serversHref } from "@/app/(panel)/servers/components/use-filters"
import {
  AppLogo,
  appsHref,
  safeHref,
} from "@/app/(panel)/services/components/meta"
import { formatPct } from "@/components/insights/format"
import { JobRow } from "@/components/jobs/job-row"
import { problemStatuses } from "@/components/panel/problems"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Home, Issue } from "../api"
import { type HomeLive, useHomeLive } from "../live"
import { ActivityCard } from "./activity"
import { Blank, Card, CardLink } from "./card"
import { FleetCard } from "./fleet"
import { HomeEmpty } from "./home-empty"
import { MonitorsCard } from "./monitors-card"
import { HealthBar, kindItem, type Summary, summaries } from "./parts"
import { PerformanceCard } from "./performance-card"
import { Pulse } from "./pulse"
import { TrafficCard } from "./traffic-card"
import { useHomeLayout } from "./widgets"

export function HomeDesktop({
  home,
  title,
  subtitle,
}: {
  home: Home
  title: string
  subtitle: string
}) {
  const live = useHomeLive()
  const layout = useHomeLayout()
  const show = layout.shows
  const noServers = home.serverTotal === 0

  const main = [
    show("sections") && <SectionsCard key="sections" home={home} />,
    !noServers && show("performance") && <PerformanceCard key="perf" />,
    !noServers && show("fleet") && <FleetCard key="fleet" live={live} />,
    !noServers && show("servers") && (
      <ServersCard key="servers" home={home} live={live} />
    ),
    show("services") && home.apps.length > 0 && (
      <LaunchCard key="services" home={home} />
    ),
  ].filter(Boolean)
  const side = [
    show("activity") && <ActivityCard key="activity" live={live} />,
    show("monitors") && <MonitorsCard key="monitors" live={live} />,
    show("traffic") && live.hasProxies && (
      <TrafficCard key="traffic" live={live} />
    ),
    show("tasks") && <TasksCard key="tasks" home={home} />,
    show("upcoming") && <UpcomingCard key="upcoming" home={home} />,
  ].filter(Boolean)

  return (
    <div className="flex w-full flex-col gap-6 px-6 pt-6 pb-12">
      <Pulse
        home={home}
        live={live}
        title={title}
        subtitle={subtitle}
        layout={layout}
      />
      {home.ready && home.issues.length > 0 && <Attention home={home} />}
      {noServers && <HomeEmpty />}
      {(main.length > 0 || side.length > 0) && (
        <div
          className={cn(
            "grid items-start gap-6",
            main.length > 0 && side.length > 0 && "lg:grid-cols-3",
          )}
        >
          {main.length > 0 && (
            <div
              className={cn(
                "flex min-w-0 flex-col gap-6",
                side.length > 0 && "lg:col-span-2",
              )}
            >
              {main}
            </div>
          )}
          {side.length > 0 && (
            <div className="flex min-w-0 flex-col gap-6">{side}</div>
          )}
        </div>
      )}
    </div>
  )
}

// Problems first: the one place that answers "is anything wrong?".
function Attention({ home }: { home: Home }) {
  const count = home.issues.length + home.moreBroken
  return (
    <Card
      title="Needs attention"
      icon={
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <TriangleAlert className="size-4" strokeWidth={1.75} />
        </span>
      }
      action={
        <span className="text-caption text-ash tabular-nums">
          {count} {count === 1 ? "issue" : "issues"}
        </span>
      }
    >
      <ul className="grid divide-border xl:grid-cols-2 xl:gap-x-px [&>li]:border-b [&>li]:border-border">
        {home.issues.map((issue) => (
          <li key={issue.key}>
            <IssueRow issue={issue} />
          </li>
        ))}
        {home.moreBroken > 0 && (
          <li>
            <Link
              href={serversHref("/servers", {
                folder: "all",
                status: [...problemStatuses],
              })}
              className="flex h-full items-center gap-2 px-5 py-3 text-body-sm text-muted-foreground hover:bg-subtle hover:text-foreground"
            >
              And {home.moreBroken} more{" "}
              {home.moreBroken === 1 ? "server" : "servers"}
              <ChevronRight className="size-4 rtl:rotate-180" />
            </Link>
          </li>
        )}
      </ul>
    </Card>
  )
}

function IssueRow({ issue }: { issue: Issue }) {
  const { icon: Icon, label } = kindItem[issue.kind]
  const bad = issue.tone === "destructive"
  return (
    <Link
      href={issue.href}
      className="group flex items-center gap-3 px-5 py-3 outline-none hover:bg-subtle focus-visible:bg-muted"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          bad
            ? "bg-destructive/10 text-destructive"
            : "bg-warning/10 text-warning",
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-body-sm font-medium">
            {issue.name}
          </span>
          <span className="shrink-0 text-caption text-ash">{label}</span>
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {issue.detail || label}
        </span>
      </span>
      <span
        className={cn(
          "max-w-40 shrink-0 truncate text-body-sm",
          bad ? "text-destructive" : "text-warning",
        )}
      >
        {issue.status}
      </span>
      <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
    </Link>
  )
}

// Every section's count and health in one card.
function SectionsCard({ home }: { home: Home }) {
  return (
    <Card title="Sections">
      <ul className="grid grid-cols-2 md:grid-cols-3">
        {summaries(home).map((s) => (
          <li
            key={s.key}
            className="min-w-0 border-border not-last:border-b max-md:odd:border-e md:[&:nth-child(3n+1)]:border-e md:[&:nth-child(3n+2)]:border-e"
          >
            <SectionTile summary={s} ready={home.ready} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SectionTile({
  summary: s,
  ready,
}: {
  summary: Summary
  ready: boolean
}) {
  const Icon = s.icon
  const known = ready && s.total !== undefined
  return (
    <Link
      href={s.href}
      className="group flex h-full min-w-0 flex-col gap-3 px-5 py-4 outline-none hover:bg-subtle focus-visible:bg-muted"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
          {s.label}
        </span>
        {s.alert > 0 ? (
          <span className="rounded-full bg-destructive px-2 text-caption font-medium text-white tabular-nums">
            {s.alert}
          </span>
        ) : (
          <ArrowUpRight className="size-4 text-ash opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        )}
      </span>
      <span className="flex items-end gap-3">
        {known ? (
          <span className="text-subheading leading-none font-light tabular-nums">
            {s.total}
          </span>
        ) : (
          <Skeleton className="h-6 w-8" />
        )}
        {s.tally && (
          <HealthBar
            tally={known ? s.tally : undefined}
            className="mb-1 min-w-0 flex-1"
          />
        )}
      </span>
      <span className="truncate text-caption text-muted-foreground">
        {known ? s.caption : " "}
      </span>
    </Link>
  )
}

function ServersCard({ home, live }: { home: Home; live: HomeLive }) {
  const { servers } = home
  const byId = new Map<string, ServerModel>(
    (live.model?.servers ?? []).map((s) => [s.id, s]),
  )
  return (
    <Card
      title={servers.favorites ? "Favorite servers" : "Servers"}
      icon={
        servers.favorites ? (
          <Star className="size-4 text-ash" strokeWidth={1.75} />
        ) : undefined
      }
      action={
        <CardLink
          href={
            servers.favorites
              ? serversHref("/servers", { folder: "favorites" })
              : "/servers"
          }
        >
          View all
        </CardLink>
      }
    >
      {servers.pending ? (
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : (
        <div className="@container">
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem] gap-4 border-b border-border px-5 py-2 text-caption text-ash @xl:grid @xl:grid-cols-[minmax(0,1fr)_8rem_repeat(3,5.5rem)] @3xl:grid-cols-[minmax(0,1fr)_8rem_repeat(3,5.5rem)_4rem]">
            <span>Server</span>
            <span>Status</span>
            <span>CPU</span>
            <span>Memory</span>
            <span>Disk</span>
            <span className="hidden text-end @3xl:block">Ping</span>
          </div>
          <ul className="divide-y divide-border">
            {servers.items.map((s) => {
              const r = byId.get(s.id)?.latest
              const online = s.status === "online"
              const mem = r?.mem_total_bytes
                ? (100 * r.mem_used_bytes) / r.mem_total_bytes
                : null
              return (
                <li key={s.id}>
                  <Link
                    href={`/servers/${s.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-4 px-5 py-2.5 outline-none hover:bg-subtle focus-visible:bg-muted @xl:grid-cols-[minmax(0,1fr)_8rem_repeat(3,5.5rem)] @3xl:grid-cols-[minmax(0,1fr)_8rem_repeat(3,5.5rem)_4rem]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <OsTile os={s.os} className="size-9" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-body-sm font-medium">
                          {s.name}
                        </span>
                        <span className="truncate text-caption text-muted-foreground">
                          {address(s)}
                        </span>
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2 text-body-sm text-muted-foreground">
                        <StatusDot status={s.status} />
                        <span className="truncate">
                          {statusMeta[s.status].label}
                        </span>
                      </span>
                      <span className="truncate text-caption text-ash">
                        {online ? "Seen " : "Last seen "}
                        {timeAgo(s.last_seen_at).toLowerCase()}
                      </span>
                    </span>
                    <Usage value={online ? r?.cpu_percent : null} label="CPU" />
                    <Usage value={online ? mem : null} label="Memory" />
                    <Usage
                      value={online ? r?.disk_max_percent : null}
                      label="Disk"
                    />
                    <span className="hidden text-end text-caption text-ash tabular-nums @3xl:block">
                      {online && s.latency_ms !== null
                        ? `${s.latency_ms} ms`
                        : "—"}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {!servers.pending && !servers.favorites && (
        <p className="border-t border-border px-5 py-3 text-caption text-ash">
          Star a server on the Servers page to keep it here.
        </p>
      )}
    </Card>
  )
}

function Usage({
  value,
  label,
}: {
  value: number | null | undefined
  label: string
}) {
  return (
    <span className="hidden min-w-0 flex-col gap-1 @xl:flex">
      {value == null ? (
        <span className="text-caption text-ash">—</span>
      ) : (
        <>
          <span className="text-caption text-muted-foreground tabular-nums">
            {formatPct(value)}
          </span>
          <Meter value={value} label={label} className="h-1.5" />
        </>
      )}
    </span>
  )
}

// One click to the team's web tools. Opens the service itself; one without
// a web address opens on the Services page.
function LaunchCard({ home }: { home: Home }) {
  return (
    <Card
      title="Services"
      caption={home.appCount ? `${home.appCount} in this workspace` : undefined}
      action={<CardLink href="/services">View all</CardLink>}
    >
      <ul className="grid grid-cols-2 gap-1 p-3 md:grid-cols-3 xl:grid-cols-4">
        {home.apps.map((app) => {
          const href = safeHref(app.address)
          const body = (
            <>
              <AppLogo app={app} size={32} className="rounded-lg" />
              <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                {app.name}
              </span>
              {href && (
                <ArrowUpRight className="size-4 shrink-0 text-ash opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
              )}
            </>
          )
          const cls =
            "group flex items-center gap-3 rounded-lg p-3 outline-none hover:bg-subtle focus-visible:bg-muted"
          return (
            <li key={app.id}>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                >
                  {body}
                </a>
              ) : (
                <Link
                  href={appsHref("/services", { q: app.name })}
                  className={cls}
                >
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function TasksCard({ home }: { home: Home }) {
  return (
    <Card
      title="Tasks"
      caption={home.activeJobs ? `${home.activeJobs} running` : undefined}
      action={<CardLink href="/tasks">View all</CardLink>}
    >
      {home.jobs.length === 0 ? (
        <Blank
          icon={<ListChecks className="size-5" strokeWidth={1.75} />}
          text="Copies, archives and installs run here in the background."
        />
      ) : (
        <ul className="divide-y divide-border">
          {home.jobs.map((job) => (
            <li key={job.id}>
              <JobRow job={job} className="[&>button]:px-5" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function UpcomingCard({ home }: { home: Home }) {
  return (
    <Card
      title="Coming up"
      action={<CardLink href="/cronjobs">Cron jobs</CardLink>}
    >
      {home.upcoming.length === 0 ? (
        <Blank
          icon={<CalendarClock className="size-5" strokeWidth={1.75} />}
          text="Scheduled syncs, backups and upgrades show here before they run."
          action={
            <Link
              href="/cronjobs/new"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              New cron job
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {home.upcoming.map((c) => (
            <li key={c.id}>
              <Link
                href={`/cronjobs/${c.id}`}
                className="flex items-center gap-3 px-5 py-3 outline-none hover:bg-subtle focus-visible:bg-muted"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <CalendarClock className="size-4" strokeWidth={1.75} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-sm font-medium">
                    {c.name}
                  </span>
                  <span className="truncate text-caption text-muted-foreground">
                    {jobSummary(c)}
                  </span>
                </span>
                <span className="shrink-0 text-caption text-ash">
                  {timeAgo(c.next_run_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
