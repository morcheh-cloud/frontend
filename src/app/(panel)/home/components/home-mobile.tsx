"use client"

import { ChevronRight, Plus, RefreshCw, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { afterClose } from "@/app/(panel)/servers/[id]/components/parts"
import type { ServerModel } from "@/app/(panel)/servers/components/insights/model"
import {
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
import {
  byState,
  stateMeta,
  stateOf,
  uptimeText,
} from "@/app/(panel)/uptime/components/meta"
import { monitorHref } from "@/app/(panel)/uptime/components/monitor-menu"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { formatPct } from "@/components/insights/format"
import { JobRow } from "@/components/jobs/job-row"
import { problemStatuses } from "@/components/panel/problems"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import type { Home } from "../api"
import { type HomeLive, healthOf, useHomeLive } from "../live"
import { useActivity } from "./activity"
import { toneText, toneTile } from "./card"
import { usageOf } from "./fleet"
import { HomeEmpty } from "./home-empty"
import { kpis } from "./kpis"
import { HealthBar, kindItem, summaries, useAddActions } from "./parts"
import { HealthRing, KpiChart, useRefreshAll, WidgetSwitches } from "./pulse"
import { type HomeLayout, useHomeLayout } from "./widgets"

// Phones: one full-screen list of grouped rows, like a native app's home.
// The health ring and key numbers sit on top, a row of swipeable tiles.
export function HomeMobile({
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

  return (
    <div className="flex flex-col pb-6">
      <header className="flex items-start gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">{title}</h1>
          <p className="truncate text-body-sm text-muted-foreground">
            {home.workspace?.name ?? subtitle}
          </p>
        </div>
        <RefreshButton />
        <AddButton />
        <HelpButton
          href={guideHref("getting-started", "home")}
          label="Home guide"
          className="-me-3"
        />
      </header>

      <PulseRow home={home} subtitle={subtitle} />
      {show("pulse") && <KpiRow home={home} live={live} />}

      {home.ready && home.issues.length > 0 && <Issues home={home} />}

      {show("sections") && <Overview home={home} />}

      {noServers && (
        <div className="px-4 pt-6">
          <HomeEmpty />
        </div>
      )}

      {show("activity") && <Activity live={live} />}
      {show("monitors") && <Monitors live={live} />}
      {!noServers && show("servers") && <Servers home={home} live={live} />}
      {show("services") && <Services home={home} />}

      {show("tasks") && home.jobs.length > 0 && (
        <Group title="Tasks" more="/tasks">
          {home.jobs.slice(0, 4).map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </Group>
      )}

      {show("upcoming") && home.upcoming.length > 0 && (
        <Group title="Coming up" more="/cronjobs">
          {home.upcoming.map((c) => (
            <Row
              key={c.id}
              href={`/cronjobs/${c.id}`}
              title={c.name}
              subtitle={`Runs ${timeAgo(c.next_run_at).toLowerCase()}`}
            />
          ))}
        </Group>
      )}

      <CustomizeRow layout={layout} />
    </div>
  )
}

function PulseRow({ home, subtitle }: { home: Home; subtitle: string }) {
  const health = healthOf(home)
  const down = home.issues.filter((i) => i.tone === "destructive").length
  const look = home.issues.length + home.moreBroken - down
  return (
    <section
      aria-label="Workspace health"
      className="flex items-center gap-4 px-4 pt-5"
    >
      <HealthRing health={health} size={64} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "text-body font-medium",
            health ? toneText[health.tone] : "text-muted-foreground",
          )}
        >
          {health ? `Health ${health.label.toLowerCase()}` : "Checking…"}
        </span>
        <span className="text-body-sm text-muted-foreground">
          {!home.ready
            ? subtitle
            : down + look === 0
              ? "Nothing needs a look right now."
              : [down > 0 && `${down} down`, look > 0 && `${look} need a look`]
                  .filter(Boolean)
                  .join(" · ")}
        </span>
        {health && (
          <span className="text-caption text-ash">
            {health.ok + health.warn + health.bad} things checked
          </span>
        )}
      </div>
    </section>
  )
}

// Key numbers as a row of tiles that scrolls sideways and snaps.
function KpiRow({ home, live }: { home: Home; live: HomeLive }) {
  return (
    <ul className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-5 pb-1">
      {kpis(home, live).map((k) => {
        const Icon = k.icon
        return (
          <li key={k.key} className="w-40 shrink-0 snap-start">
            <Link
              href={k.href}
              className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 active:bg-muted"
            >
              <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{k.label}</span>
              </span>
              {k.value === null ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span
                  className={cn(
                    "truncate text-subheading leading-none font-light tabular-nums",
                    k.tone && toneText[k.tone],
                  )}
                >
                  {k.value}
                </span>
              )}
              <KpiChart kpi={k} />
              <span className="truncate text-caption text-ash">{k.sub}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Issues({ home }: { home: Home }) {
  return (
    <Group title="Needs attention">
      {home.issues.map((issue) => {
        const Icon = kindItem[issue.kind].icon
        const bad = issue.tone === "destructive"
        return (
          <Row
            key={issue.key}
            href={issue.href}
            icon={
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg",
                  bad ? toneTile.destructive : toneTile.warning,
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
            }
            title={issue.name}
            subtitle={
              <span className={bad ? "text-destructive" : "text-warning"}>
                {issue.status}
                {issue.detail && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {issue.detail}
                  </span>
                )}
              </span>
            }
          />
        )
      })}
      {home.moreBroken > 0 && (
        <Row
          href={serversHref("/servers", {
            folder: "all",
            status: [...problemStatuses],
          })}
          title={`And ${home.moreBroken} more ${home.moreBroken === 1 ? "server" : "servers"}`}
        />
      )}
    </Group>
  )
}

function Overview({ home }: { home: Home }) {
  return (
    <Group title="Overview">
      {summaries(home).map((s) => {
        const Icon = s.icon
        const known = home.ready && s.total !== undefined
        return (
          <Row
            key={s.key}
            href={s.href}
            icon={
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
            }
            title={s.label}
            subtitle={
              <span className="flex flex-col gap-1.5">
                <span className="truncate">{known ? s.caption : "…"}</span>
                {s.tally && known && s.tally.total > 0 && (
                  <HealthBar tally={s.tally} className="h-1 max-w-40" />
                )}
              </span>
            }
            trailing={
              <span className="flex items-center gap-2">
                {s.alert > 0 && (
                  <span className="rounded-full bg-destructive px-2 text-caption font-medium text-white tabular-nums">
                    {s.alert}
                  </span>
                )}
                <span className="text-body text-muted-foreground tabular-nums">
                  {known ? s.total : ""}
                </span>
              </span>
            }
          />
        )
      })}
    </Group>
  )
}

function Activity({ live }: { live: HomeLive }) {
  const items = useActivity(live).slice(0, 5)
  if (items.length === 0) return null
  return (
    <Group title="Activity">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Row
            key={item.key}
            href={item.href}
            icon={
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg",
                  toneTile[item.tone],
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
            }
            title={item.title}
            subtitle={item.detail || undefined}
            trailing={
              <time
                dateTime={item.at}
                className="shrink-0 text-caption text-ash"
              >
                {timeAgo(item.at)}
              </time>
            }
          />
        )
      })}
    </Group>
  )
}

function Monitors({ live }: { live: HomeLive }) {
  const all = [...(live.monitors ?? [])].sort(byState)
  if (all.length === 0) return null
  const up = all.filter((m) => stateOf(m) === "up").length
  return (
    <Group title={`Uptime · ${up} of ${all.length} up`} more="/uptime">
      {all.slice(0, 4).map((m) => {
        const state = stateMeta[stateOf(m)]
        return (
          <Row
            key={m.id}
            href={monitorHref(m.id)}
            icon={
              <span className="flex size-10 items-center justify-center">
                <span
                  aria-hidden
                  className={cn("size-2.5 rounded-full", state.dot)}
                />
              </span>
            }
            title={m.name}
            subtitle={
              <span className={state.text}>
                {state.label}
                {m.last_latency_ms != null && stateOf(m) !== "paused" && (
                  <span className="text-ash"> · {m.last_latency_ms} ms</span>
                )}
              </span>
            }
            trailing={
              <span className="text-caption text-muted-foreground tabular-nums">
                {uptimeText(m.uptime_24h)}
              </span>
            }
          />
        )
      })}
    </Group>
  )
}

function Servers({ home, live }: { home: Home; live: HomeLive }) {
  const items = home.servers.items
  if (items.length === 0) return null
  const byId = new Map<string, ServerModel>(
    (live.model?.servers ?? []).map((s) => [s.id, s]),
  )
  return (
    <Group
      title={home.servers.favorites ? "Favorite servers" : "Servers"}
      more={
        home.servers.favorites
          ? serversHref("/servers", { folder: "favorites" })
          : "/servers"
      }
    >
      {items.map((s) => {
        const m = byId.get(s.id)
        const cpu = m ? usageOf(m, "cpu") : null
        const mem = m ? usageOf(m, "memory") : null
        return (
          <Row
            key={s.id}
            href={`/servers/${s.id}`}
            icon={<OsTile os={s.os} className="size-10" />}
            title={s.name}
            subtitle={
              <span className="flex items-center gap-1.5">
                <StatusDot status={s.status} />
                {statusMeta[s.status].label}
                {s.status !== "online" && (
                  <span className="text-ash">
                    · seen {timeAgo(s.last_seen_at).toLowerCase()}
                  </span>
                )}
              </span>
            }
            trailing={
              cpu !== null &&
              mem !== null && (
                <span className="flex w-20 flex-col gap-1 text-caption text-muted-foreground tabular-nums">
                  <MiniUse label="CPU" value={cpu} />
                  <MiniUse label="Mem" value={mem} />
                </span>
              )
            }
          />
        )
      })}
    </Group>
  )
}

function MiniUse({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 90 ? "bg-destructive" : value >= 80 ? "bg-warning" : "bg-brand"
  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex justify-between">
        <span className="text-ash">{label}</span>
        {formatPct(value)}
      </span>
      <span className="h-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", tone)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </span>
    </span>
  )
}

function Services({ home }: { home: Home }) {
  if (home.apps.length === 0) return null
  return (
    <section className="pt-6">
      <GroupTitle title="Services" more="/services" />
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-1">
        {home.apps.map((app) => {
          const href = safeHref(app.address)
          const body = (
            <>
              <AppLogo app={app} size={40} className="rounded-xl" />
              <span className="w-full truncate text-center text-caption">
                {app.name}
              </span>
            </>
          )
          const cls =
            "flex w-18 flex-col items-center gap-1.5 rounded-lg p-2 active:bg-muted"
          return (
            <li key={app.id} className="shrink-0">
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
    </section>
  )
}

function GroupTitle({ title, more }: { title: string; more?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2">
      <h2 className="font-label text-caption tracking-label text-ash uppercase">
        {title}
      </h2>
      {more && (
        <Link
          href={more}
          className="-my-3 -me-2 flex min-h-11 items-center px-2 text-body-sm text-brand"
        >
          See all
        </Link>
      )}
    </div>
  )
}

function Group({
  title,
  more,
  children,
}: {
  title: string
  more?: string
  children: ReactNode
}) {
  return (
    <section className="pt-6">
      <GroupTitle title={title} more={more} />
      <div className="divide-y divide-border border-y border-border">
        {children}
      </div>
    </section>
  )
}

function Row({
  href,
  icon,
  title,
  subtitle,
  trailing,
}: {
  href: string
  icon?: ReactNode
  title: string
  subtitle?: ReactNode
  trailing?: ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-muted"
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">{title}</span>
        {subtitle && (
          <span className="truncate text-caption text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {trailing}
      <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
    </Link>
  )
}

function RefreshButton() {
  const refresh = useRefreshAll()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Refresh"
      className="-my-2 size-11"
      disabled={refresh.busy}
      onClick={refresh.run}
    >
      <RefreshCw className={cn("size-5", refresh.busy && "animate-spin")} />
    </Button>
  )
}

function AddButton() {
  const actions = useAddActions()
  const [open, setOpen] = useOpen("home-add")
  if (actions.length === 0) return null
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Add"
        className="-my-2 size-11"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-5" />
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Add to this workspace"
      >
        {actions.map((a) => (
          <SheetAction
            key={a.label}
            icon={<Plus />}
            label={a.label}
            onClick={() => afterClose(setOpen, a.run)}
          />
        ))}
      </BottomSheet>
    </>
  )
}

function CustomizeRow({ layout }: { layout: HomeLayout }) {
  const [open, setOpen] = useOpen("home-customize")
  return (
    <>
      <div className="px-4 pt-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-body-sm text-muted-foreground active:bg-muted"
        >
          <SlidersHorizontal className="size-4" />
          Customize Home
          {layout.hiddenCount > 0 && (
            <span className="text-ash">· {layout.hiddenCount} hidden</span>
          )}
        </button>
      </div>
      <BottomSheet open={open} onOpenChange={setOpen} title="Customize Home">
        <WidgetSwitches layout={layout} />
      </BottomSheet>
    </>
  )
}
