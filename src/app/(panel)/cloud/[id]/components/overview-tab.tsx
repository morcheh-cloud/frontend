"use client"

import {
  ArrowRight,
  CircleAlert,
  Cpu,
  HardDrive,
  History,
  LoaderCircle,
  MapPin,
  MemoryStick,
  Network,
  ServerCog,
  Server as ServerIcon,
  Shield,
  SquarePlus,
  TriangleAlert,
} from "lucide-react"
import type { ReactNode } from "react"

import { Tag } from "@/app/(panel)/dns/components/parts"
import { OsTile, timeAgo } from "@/app/(panel)/servers/components/meta"
import { Skeleton } from "@/components/ui/skeleton"
import type { CloudServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { FleetStrip, stateCounts } from "../../components/account-parts"
import { useCloudActions } from "../../components/cloud-actions"
import {
  formatMemory,
  mainAddress,
  ServerStateLabel,
  serverStateMeta,
} from "../../components/meta"
import { type AccountTab, type Model, useAccountFilters } from "./model"
import {
  Legend,
  osOf,
  Panel,
  PhoneGroup,
  PhoneRow,
  PhoneSkeleton,
  plural,
  ShareBar,
} from "./parts"

// The first tab: the account at a glance, with a way into every other tab.

// ── Shared numbers ───────────────────────────────────────────────────────

type Kpi = {
  key: string
  icon: ReactNode
  label: string
  value: string
  unit?: string
  sub: string
  // Share in use (running), 0–1; no bar without it.
  share?: number
}

function splitUnit(text: string): [string, string] {
  const i = text.lastIndexOf(" ")
  return i < 0 ? [text, ""] : [text.slice(0, i), text.slice(i + 1)]
}

function kpisOf(m: Model): Kpi[] | null {
  if (!m.servers) return null
  const t = m.totals
  const counts = stateCounts(m.servers)
  const [memValue, memUnit] = splitUnit(formatMemory(t.memory))
  const [onValue, onUnit] = splitUnit(formatMemory(t.memoryOn))
  return [
    {
      key: "servers",
      icon: <ServerIcon />,
      label: "Running",
      value: String(counts.running),
      unit: `of ${m.servers.length}`,
      sub:
        counts.running === m.servers.length
          ? "Every server is up"
          : `${m.servers.length - counts.running} not running`,
      share: m.servers.length ? counts.running / m.servers.length : undefined,
    },
    {
      key: "cpu",
      icon: <Cpu />,
      label: "Processors",
      value: String(t.cpu),
      unit: "vCPU",
      sub: `${t.cpuOn} on running servers`,
      share: t.cpu ? t.cpuOn / t.cpu : undefined,
    },
    {
      key: "memory",
      icon: <MemoryStick />,
      label: "Memory",
      value: memValue,
      unit: memUnit,
      sub: `${onValue} ${onUnit} on running servers`,
      share: t.memory ? t.memoryOn / t.memory : undefined,
    },
    {
      key: "storage",
      icon: <HardDrive />,
      label: "Storage",
      value: String(t.disk + t.volumes),
      unit: "GB",
      sub: t.volumes
        ? `${t.disk} GB server disks · ${t.volumes} GB extra disks`
        : `${t.disk} GB on server disks`,
    },
  ]
}

// What deserves a look, worst first; each leads to the tab that shows it.
type Attention = {
  key: string
  tone: "destructive" | "warning" | "brand"
  icon: ReactNode
  title: string
  body: string
  tab: AccountTab
  show?: string
}

function attentionOf(m: Model): Attention[] {
  const out: Attention[] = []
  const servers = m.servers ?? []
  const failed = servers.filter((s) => s.state === "error")
  if (failed.length) {
    out.push({
      key: "error",
      tone: "destructive",
      icon: <CircleAlert />,
      title: `${plural(failed.length, "server")} in error`,
      body: failed.map((s) => s.name).join(", "),
      tab: "servers",
      show: "other",
    })
  }
  const busy = servers.filter((s) => s.task)
  if (busy.length) {
    out.push({
      key: "busy",
      tone: "brand",
      icon: <LoaderCircle />,
      title: `${plural(busy.length, "server")} busy`,
      body: busy.map((s) => s.name).join(", "),
      tab: "servers",
      show: "other",
    })
  }
  const r = m.res
  if (r?.supported) {
    const loose = r.volumes.filter((v) => !v.server_id)
    if (loose.length) {
      out.push({
        key: "loose",
        tone: "warning",
        icon: <HardDrive />,
        title: `${plural(loose.length, "disk")} not attached`,
        body: `${m.totals.volumesLoose} GB nobody uses, still billed by the provider.`,
        tab: "disks",
        show: "loose",
      })
    }
    const full = r.backups.filter((b) => b.max > 0 && b.used >= b.max)
    if (full.length) {
      out.push({
        key: "full",
        tone: "warning",
        icon: <History />,
        title: `${plural(full.length, "backup schedule")} at the limit`,
        body: "Each new backup replaces the oldest copy.",
        tab: "backups",
      })
    }
    const covered = new Set(r.backups.map((b) => b.server_id).filter(Boolean))
    const bare = servers.filter(
      (s) => s.state === "running" && !s.backups && !covered.has(s.id),
    )
    if (bare.length) {
      out.push({
        key: "bare",
        tone: "warning",
        icon: <History />,
        title: `${plural(bare.length, "running server")} without backups`,
        body: bare.map((s) => s.name).join(", "),
        tab: "backups",
      })
    }
  }
  const unlinked = servers.filter(
    (s) => s.state === "running" && s.linked.length === 0 && mainAddress(s),
  )
  if (unlinked.length) {
    out.push({
      key: "unlinked",
      tone: "brand",
      icon: <SquarePlus />,
      title: `${plural(unlinked.length, "running server")} not in Morche`,
      body: "Add them to manage files, packages and more over SSH.",
      tab: "servers",
      show: "unlinked",
    })
  }
  return out
}

const toneTile: Record<Attention["tone"], string> = {
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  brand: "bg-brand-soft text-brand-strong",
}

// ── Desktop ──────────────────────────────────────────────────────────────

export function OverviewDesktop({ model: m }: { model: Model }) {
  const attention = attentionOf(m)
  return (
    <div className="flex flex-col gap-6">
      <FleetHero model={m} />
      <KpiRow model={m} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {attention.length > 0 && <AttentionList items={attention} />}
          <ResourceTiles model={m} />
          <ServersGlance model={m} />
        </div>
        <aside className="flex flex-col gap-6">
          <RegionsPanel model={m} />
          {m.systems.length > 0 && <SystemsPanel model={m} />}
        </aside>
      </div>
    </div>
  )
}

function FleetHero({ model: m }: { model: Model }) {
  const counts = m.servers ? stateCounts(m.servers) : null
  const n = m.servers?.length ?? m.account.server_count
  const latency = m.account.latency_ms
  return (
    <section className="flex items-center gap-8 rounded-3xl border border-border bg-card px-8 py-6 shadow-sm">
      <p className="flex shrink-0 flex-col">
        <span className="text-heading-lg leading-none font-light tabular-nums">
          {n}
        </span>
        <span className="mt-1 text-body-sm text-muted-foreground">
          server{n === 1 ? "" : "s"}
        </span>
      </p>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {m.servers ? (
          <FleetStrip servers={m.servers} size="lg" max={60} />
        ) : (
          <Skeleton className="h-3 rounded-full" />
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-muted-foreground tabular-nums">
          {counts && (
            <>
              <Legend dot="bg-success" label={`${counts.running} running`} />
              {counts.off > 0 && (
                <Legend dot="bg-mist" label={`${counts.off} off`} />
              )}
              {counts.other > 0 && (
                <Legend dot="bg-brand" label={`${counts.other} other`} />
              )}
            </>
          )}
          {m.regions.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {plural(m.regions.length, "region")}
            </span>
          )}
          <span className="ms-auto text-ash">
            {latency ? `Answers in ${latency} ms · ` : ""}
            {m.readAt ? `Read ${timeAgo(m.readAt)}` : "Reading…"}
          </span>
        </div>
      </div>
    </section>
  )
}

function KpiRow({ model: m }: { model: Model }) {
  const kpis = kpisOf(m)
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis
        ? kpis.map((k) => <KpiTile key={k.key} kpi={k} />)
        : [0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
    </div>
  )
}

function KpiTile({ kpi: k, className }: { kpi: Kpi; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand-strong [&_svg]:size-4">
          {k.icon}
        </span>
        {k.label}
      </p>
      <p className="flex items-baseline gap-1.5">
        <span className="text-heading font-light tabular-nums">{k.value}</span>
        {k.unit && (
          <span className="text-body-sm text-muted-foreground">{k.unit}</span>
        )}
      </p>
      <div className="mt-auto flex flex-col gap-2">
        {k.share !== undefined && <ShareBar share={k.share} />}
        <p className="truncate text-caption text-ash">{k.sub}</p>
      </div>
    </div>
  )
}

function AttentionList({ items }: { items: Attention[] }) {
  const f = useAccountFilters()
  return (
    <Panel icon={<TriangleAlert />} title="Needs a look" count={items.length}>
      <ul className="divide-y divide-border">
        {items.map((a) => (
          <li key={a.key}>
            <button
              type="button"
              onClick={() => {
                f.setTab(a.tab)
                if (a.show) f.setShow(a.show)
              }}
              className="group flex w-full items-center gap-3 px-5 py-3 text-start outline-none last:rounded-b-2xl hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
                  toneTile[a.tone],
                )}
              >
                {a.icon}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body-sm font-medium">{a.title}</span>
                <span className="truncate text-caption text-muted-foreground">
                  {a.body}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-ash transition-transform group-hover:translate-x-0.5 group-hover:text-foreground rtl:rotate-180" />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

type Tile = {
  tab: AccountTab
  icon: ReactNode
  label: string
  value: number
  sub: string
  share?: number
}

function tilesOf(m: Model): Tile[] | null {
  const r = m.res
  if (!r?.supported) return null
  const attached = r.volumes.filter((v) => v.server_id).length
  const own = m.firewalls.filter((f) => !f.builtin).length
  const subnets = r.networks.reduce((n, x) => n + x.subnets.length, 0)
  const copies = r.backups.reduce((n, b) => n + b.used, 0)
  return [
    {
      tab: "disks",
      icon: <HardDrive />,
      label: "Disks",
      value: r.volumes.length,
      sub: r.volumes.length
        ? `${m.totals.volumes} GB · ${attached} attached`
        : "No extra disks",
      share: r.volumes.length ? attached / r.volumes.length : undefined,
    },
    {
      tab: "firewalls",
      icon: <Shield />,
      label: "Firewalls",
      value: m.firewalls.length,
      sub: m.firewalls.length
        ? `${own} yours · ${m.firewalls.length - own} built in`
        : "None",
    },
    {
      tab: "networks",
      icon: <Network />,
      label: "Private networks",
      value: r.networks.length,
      sub: r.networks.length ? plural(subnets, "range") : "None",
    },
    {
      tab: "backups",
      icon: <History />,
      label: "Backup schedules",
      value: r.backups.length,
      sub: r.backups.length ? `${plural(copies, "copy")} kept` : "None",
    },
  ]
}

function ResourceTiles({ model: m }: { model: Model }) {
  const f = useAccountFilters()
  if (m.resPending) {
    return (
      <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }
  const tiles = tilesOf(m)
  if (!tiles) return null
  return (
    <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
      {tiles.map((t) => (
        <button
          key={t.tab}
          type="button"
          onClick={() => f.setTab(t.tab)}
          className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-start shadow-sm transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted [&_svg]:size-4">
              {t.icon}
            </span>
            {t.label}
            <ArrowRight className="ms-auto size-4 text-ash opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 rtl:rotate-180" />
          </span>
          <span className="text-subheading font-light tabular-nums">
            {t.value}
          </span>
          {t.share !== undefined && <ShareBar share={t.share} />}
          <span className="truncate text-caption text-ash">{t.sub}</span>
        </button>
      ))}
    </div>
  )
}

const GLANCE = 5

function ServersGlance({ model: m }: { model: Model }) {
  const f = useAccountFilters()
  const actions = useCloudActions()
  const list = m.servers
  return (
    <Panel
      icon={<ServerIcon />}
      title="Servers"
      count={list?.length}
      action={
        list &&
        list.length > 0 && (
          <button
            type="button"
            onClick={() => f.setTab("servers")}
            className="inline-flex items-center gap-1 rounded-md text-caption font-medium text-brand-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            See all
            <ArrowRight className="size-3.5 rtl:rotate-180" />
          </button>
        )
      }
    >
      {!list ? (
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : list.length === 0 ? (
        <p className="px-5 py-6 text-body-sm text-muted-foreground">
          No servers in this account yet. Servers made in the{" "}
          {m.account.provider_label} panel show up here within a minute.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {list.slice(0, GLANCE).map((s) => (
            <li key={`${s.region}-${s.id}`}>
              <button
                type="button"
                onClick={() => actions.details(s)}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-start outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <OsTile os={osOf(s)} className="size-8" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-sm font-medium">
                    {s.name}
                  </span>
                  <span className="truncate font-mono text-caption text-muted-foreground">
                    {mainAddress(s) || "No address"}
                  </span>
                </span>
                <span className="hidden w-40 truncate text-caption text-muted-foreground md:block">
                  {sizeLine(s)}
                </span>
                <span className="w-28">
                  <ServerStateLabel
                    server={s}
                    className={cn(
                      "text-caption",
                      s.task ? "text-brand" : serverStateMeta[s.state].tone,
                    )}
                  />
                </span>
                {s.linked[0] ? (
                  <ServerCog
                    aria-label="In Morche"
                    className="size-4 shrink-0 text-brand"
                  />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
              </button>
            </li>
          ))}
          {list.length > GLANCE && (
            <li>
              <button
                type="button"
                onClick={() => f.setTab("servers")}
                className="w-full rounded-b-2xl px-5 py-2.5 text-start text-caption font-medium text-brand-strong outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {list.length - GLANCE} more servers
              </button>
            </li>
          )}
        </ul>
      )}
    </Panel>
  )
}

const sizeLine = (s: CloudServer) =>
  [s.cpu && `${s.cpu} vCPU`, s.memory_mb && formatMemory(s.memory_mb)]
    .filter(Boolean)
    .join(" · ")

function RegionsPanel({ model: m }: { model: Model }) {
  const most = Math.max(1, ...m.regions.map((r) => r.servers))
  return (
    <Panel icon={<MapPin />} title="Regions" count={m.regions.length}>
      {m.regions.length === 0 ? (
        <p className="px-5 py-4 text-body-sm text-muted-foreground">
          {m.servers ? "No regions read yet." : "Reading…"}
        </p>
      ) : (
        <ul className="flex flex-col gap-4 px-5 py-4">
          {m.regions.map((r) => (
            <li key={r.code} className="flex flex-col gap-1.5">
              <p className="flex items-baseline gap-2 text-body-sm">
                <span className="truncate">{r.name}</span>
                {r.city && r.city !== r.name && (
                  <span className="truncate text-caption text-ash">
                    {r.city}
                  </span>
                )}
                {r.problems.length > 0 && (
                  <Tag tone="warning" className="ms-1">
                    Partly read
                  </Tag>
                )}
                <span
                  className={cn(
                    "ms-auto shrink-0 text-caption tabular-nums",
                    r.servers ? "text-foreground" : "text-ash",
                  )}
                >
                  {plural(r.servers, "server")}
                </span>
              </p>
              {/* Running share inside the region's bar. */}
              <span className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="h-full bg-success"
                  style={{ width: `${(r.running / most) * 100}%` }}
                />
                <span
                  className="h-full bg-mist"
                  style={{
                    width: `${((r.servers - r.running) / most) * 100}%`,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function SystemsPanel({ model: m }: { model: Model }) {
  return (
    <Panel icon={<ServerIcon />} title="Systems">
      <ul className="flex flex-col gap-3 px-5 py-4">
        {m.systems.map((s) => (
          <li key={s.key} className="flex items-center gap-3 text-body-sm">
            <OsTile os={osOf(s.server)} />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="text-caption text-muted-foreground tabular-nums">
              {s.n}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

// ── Phone ────────────────────────────────────────────────────────────────

export function OverviewPhone({ model: m }: { model: Model }) {
  const f = useAccountFilters()
  const kpis = kpisOf(m)
  const attention = attentionOf(m)
  const tiles = tilesOf(m)
  const counts = m.servers ? stateCounts(m.servers) : null
  const n = m.servers?.length ?? m.account.server_count

  return (
    <>
      <div className="flex flex-col gap-3 px-4 pt-5">
        <div className="flex items-end justify-between gap-4">
          <p className="flex items-baseline gap-2">
            <span className="text-heading font-light tabular-nums">{n}</span>
            <span className="text-body-sm text-muted-foreground">
              server{n === 1 ? "" : "s"}
            </span>
          </p>
          {counts && (
            <p className="flex flex-col items-end gap-0.5 pb-1.5 text-caption text-muted-foreground tabular-nums">
              <Legend dot="bg-success" label={`${counts.running} running`} />
              {counts.off + counts.other > 0 && (
                <Legend
                  dot="bg-mist"
                  label={`${counts.off + counts.other} not running`}
                />
              )}
            </p>
          )}
        </div>
        {m.servers ? (
          <FleetStrip servers={m.servers} size="lg" max={30} />
        ) : (
          <Skeleton className="h-3 rounded-full" />
        )}
        {m.readAt && (
          <p className="text-caption text-ash">Read {timeAgo(m.readAt)}</p>
        )}
      </div>

      {kpis && (
        <div className="mt-5 no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4">
          {kpis.map((k) => (
            <KpiTile
              key={k.key}
              kpi={k}
              className="w-[44%] min-w-36 shrink-0 snap-start p-4 shadow-none"
            />
          ))}
        </div>
      )}

      {attention.length > 0 && (
        <PhoneGroup title="Needs a look" count={attention.length}>
          {attention.map((a) => (
            <PhoneRow
              key={a.key}
              icon={a.icon}
              title={a.title}
              sub={a.body}
              onClick={() => {
                f.setTab(a.tab)
                if (a.show) f.setShow(a.show)
              }}
            />
          ))}
        </PhoneGroup>
      )}

      <PhoneGroup title="In this account">
        <PhoneRow
          icon={<ServerIcon />}
          title="Servers"
          sub={counts ? `${counts.running} running` : "Reading…"}
          end={m.servers?.length}
          onClick={() => f.setTab("servers")}
        />
        {m.resPending ? (
          <PhoneSkeleton />
        ) : (
          tiles?.map((t) => (
            <PhoneRow
              key={t.tab}
              icon={t.icon}
              title={t.label}
              sub={t.sub}
              end={t.value}
              onClick={() => f.setTab(t.tab)}
            />
          ))
        )}
      </PhoneGroup>

      {m.regions.length > 0 && (
        <PhoneGroup title="Regions" count={m.regions.length}>
          {m.regions.map((g) => (
            <PhoneRow
              key={g.code}
              icon={<MapPin />}
              title={g.name}
              sub={
                g.problems.length > 0
                  ? "Partly read"
                  : g.city && g.city !== g.name
                    ? g.city
                    : undefined
              }
              end={plural(g.servers, "server")}
            />
          ))}
        </PhoneGroup>
      )}

      {m.systems.length > 0 && (
        <PhoneGroup title="Systems">
          {m.systems.map((s) => (
            <li
              key={s.key}
              className="flex min-h-14 items-center gap-3 px-4 py-2.5"
            >
              <OsTile os={osOf(s.server)} className="size-9" />
              <span className="min-w-0 flex-1 truncate text-body">
                {s.label}
              </span>
              <span className="text-caption text-muted-foreground tabular-nums">
                {s.n}
              </span>
            </li>
          ))}
        </PhoneGroup>
      )}
    </>
  )
}
