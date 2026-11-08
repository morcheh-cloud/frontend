"use client"

import {
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  ListChecks,
  Plus,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { jobSummary } from "@/app/(panel)/cronjobs/components/meta"
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
import { JobRow } from "@/components/jobs/job-row"
import { problemStatuses } from "@/components/panel/problems"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Home, Issue } from "../api"
import { HomeEmpty } from "./home-empty"
import {
  HealthBar,
  kindItem,
  type Summary,
  summaries,
  useAddActions,
} from "./parts"

export function HomeDesktop({
  home,
  title,
  subtitle,
}: {
  home: Home
  title: string
  subtitle: string
}) {
  return (
    <div className="flex w-full flex-col gap-6 px-6 pt-6 pb-12">
      <header className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="font-label text-caption tracking-label text-ash uppercase">
            {home.workspace?.name ?? "Home"}
          </p>
          <h1 className="mt-1 truncate text-heading font-light">{title}</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        <AddMenu />
      </header>

      {home.ready ? (
        <Attention home={home} />
      ) : (
        <Skeleton className="h-16 rounded-2xl" />
      )}

      <section
        aria-label="Overview"
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6"
      >
        {summaries(home).map((s) => (
          <SummaryTile key={s.key} summary={s} ready={home.ready} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {home.serverTotal === 0 ? <HomeEmpty /> : <ServersCard home={home} />}
          {home.apps.length > 0 && <LaunchCard home={home} />}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <TasksCard home={home} />
          <UpcomingCard home={home} />
        </div>
      </div>
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
      <DropdownMenuContent align="end" className="w-48">
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

function Card({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <header className="flex h-14 items-center gap-3 border-b border-border px-6">
        {icon}
        <h2 className="min-w-0 flex-1 truncate text-body font-medium">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  )
}

function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-body-sm text-muted-foreground hover:text-foreground"
    >
      {children}
    </Link>
  )
}

// Problems first: the one place that answers "is anything wrong?".
function Attention({ home }: { home: Home }) {
  if (home.issues.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4 shadow-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
          <CircleCheck className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-medium">All systems normal</p>
          <p className="text-caption text-muted-foreground">
            Servers, databases, storage, DNS and cron jobs are all fine. Morcheh
            keeps checking them on its own.
          </p>
        </div>
      </div>
    )
  }
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
      <ul className="divide-y divide-border">
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
              className="flex items-center gap-2 px-6 py-3 text-body-sm text-muted-foreground hover:bg-subtle hover:text-foreground"
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
  return (
    <Link
      href={issue.href}
      className="group flex items-center gap-4 px-6 py-3 outline-none hover:bg-subtle focus-visible:bg-muted"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-medium">{issue.name}</span>
        <span className="truncate text-caption text-muted-foreground">
          {issue.detail || label}
        </span>
      </span>
      <span className="w-24 shrink-0 text-caption text-ash max-lg:hidden">
        {label}
      </span>
      <span
        className={cn(
          "flex w-40 shrink-0 items-center gap-2 text-body-sm",
          issue.tone === "warning" ? "text-warning" : "text-destructive",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 rounded-full",
            issue.tone === "warning" ? "bg-warning" : "bg-destructive",
          )}
        />
        <span className="truncate">{issue.status}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
    </Link>
  )
}

function SummaryTile({
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
      className="group flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Icon className="size-4.5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
          {s.label}
        </span>
        {s.alert > 0 ? (
          <span className="rounded-full bg-destructive px-2 text-caption font-medium text-white tabular-nums">
            {s.alert}
          </span>
        ) : (
          <ArrowUpRight className="size-4 text-ash opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </span>
      {known ? (
        <span className="text-heading font-light tabular-nums">{s.total}</span>
      ) : (
        <Skeleton className="h-10 w-12" />
      )}
      <span className="flex flex-col gap-2">
        {s.tally ? (
          <HealthBar tally={known ? s.tally : undefined} />
        ) : (
          <span className="h-1.5" />
        )}
        <span className="truncate text-caption text-muted-foreground">
          {known ? s.caption : " "}
        </span>
      </span>
    </Link>
  )
}

function ServersCard({ home }: { home: Home }) {
  const { servers } = home
  return (
    <Card
      title={servers.favorites ? "Favorite servers" : "Servers"}
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
        <div className="flex flex-col gap-3 p-6">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {servers.items.map((s) => (
            <li key={s.id}>
              <Link
                href={`/servers/${s.id}`}
                className="flex items-center gap-4 px-6 py-3 outline-none hover:bg-subtle focus-visible:bg-muted"
              >
                <OsTile os={s.os} className="size-9" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-sm font-medium">
                    {s.name}
                  </span>
                  <span className="truncate text-caption text-muted-foreground">
                    {address(s)}
                  </span>
                </span>
                <span className="flex w-36 shrink-0 items-center gap-2 text-body-sm text-muted-foreground">
                  <StatusDot status={s.status} />
                  <span className="truncate">{statusMeta[s.status].label}</span>
                </span>
                <span className="w-16 shrink-0 text-end text-caption text-ash tabular-nums max-xl:hidden">
                  {s.status === "online" && s.latency_ms !== null
                    ? `${s.latency_ms} ms`
                    : "—"}
                </span>
                <span className="w-28 shrink-0 text-end text-caption text-ash max-xl:hidden">
                  {s.status === "online" ? "Seen " : "Last seen "}
                  {timeAgo(s.last_seen_at).toLowerCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!servers.pending && !servers.favorites && (
        <p className="border-t border-border px-6 py-3 text-caption text-ash">
          Star a server on the Servers page to keep it here.
        </p>
      )}
    </Card>
  )
}

// One click to the team's web tools. Opens the service itself; one without
// a web address opens on the Services page.
function LaunchCard({ home }: { home: Home }) {
  return (
    <Card
      title="Services"
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
                <ArrowUpRight className="size-4 shrink-0 text-ash opacity-0 transition-opacity group-hover:opacity-100" />
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
    <Card title="Tasks" action={<CardLink href="/tasks">View all</CardLink>}>
      {home.jobs.length === 0 ? (
        <Blank
          icon={<ListChecks className="size-5" strokeWidth={1.75} />}
          text="Copies, archives and installs run here in the background."
        />
      ) : (
        <ul className="divide-y divide-border">
          {home.jobs.map((job) => (
            <li key={job.id}>
              <JobRow job={job} className="[&>button]:px-6" />
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
          text="Scheduled file syncs and backups show here before they run."
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
                className="flex items-center gap-3 px-6 py-3 outline-none hover:bg-subtle focus-visible:bg-muted"
              >
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

function Blank({
  icon,
  text,
  action,
}: {
  icon: ReactNode
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-ash">
        {icon}
      </span>
      <p className="max-w-60 text-body-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  )
}
