"use client"

import {
  ArrowDownUp,
  Boxes,
  Clock,
  Cpu,
  GitBranch,
  HeartPulse,
  Layers,
  MemoryStick,
  Network,
  Plus,
  RotateCcw,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type {
  DockerFleetServer,
  DockerProject,
  DockerProjectStats,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  ItemMenu,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { useDockerProjects, useProjectStats } from "../api"
import { EnvPage } from "./env-page"
import { ChoiceChip, NoMatch, PageBar, PhoneRow, Rows, Tag } from "./kit"
import { Dot } from "./meta"
import {
  newProjectHref,
  projectHref,
  projectStateMeta,
  useProjectActions,
} from "./project-actions"
import {
  attentionOf,
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

const shows = ["all", "running", "stopped", "attention"] as const
type Show = (typeof shows)[number]
const sorts = ["name", "attention", "cpu", "memory"] as const
type Sort = (typeof sorts)[number]

const filterParsers = {
  show: parseAsStringLiteral(shows).withDefault("all"),
  sort: parseAsStringLiteral(sorts).withDefault("attention"),
  q: parseAsString.withDefault(""),
}

const sortOptions = [
  { value: "attention", label: "Needs a look first" },
  { value: "name", label: "Name" },
  { value: "cpu", label: "Most CPU" },
  { value: "memory", label: "Most memory" },
] as const satisfies readonly { value: Sort; label: string }[]

export function ProjectsPage() {
  return (
    <EnvPage title="Projects" bleed>
      {(ctx) => <ProjectsView {...ctx} />}
    </EnvPage>
  )
}

type Row = { p: DockerProject; s?: DockerProjectStats }

const isUp = (p: DockerProject) =>
  p.state === "running" || p.state === "partial"

// /containers/projects: the environment's compose projects as cards, each
// with its containers' state, live CPU and memory, health and ports.
export function ProjectsView({
  env,
  phone,
}: {
  env: DockerFleetServer
  phone: boolean
}) {
  const id = env.server_id
  const router = useRouter()
  const query = useDockerProjects(id)
  const stats = useProjectStats(id)
  const actions = useProjectActions(id, env.workspace_id)
  const [filters, setFilters] = useQueryStates(filterParsers, {
    history: "replace",
  })

  const byName = new Map(
    (stats.data?.projects ?? []).map((s) => [s.name, s] as const),
  )
  const rows: Row[] = (query.data ?? []).map((p) => ({
    p,
    s: byName.get(p.name),
  }))
  const running = rows.filter((r) => isUp(r.p)).length
  const attention = rows.filter((r) => attentionOf(r.s) > 0).length
  const q = filters.q.trim().toLowerCase()
  const shown = rows
    .filter(
      ({ p, s }) =>
        (filters.show === "all" ||
          (filters.show === "running"
            ? isUp(p)
            : filters.show === "stopped"
              ? !isUp(p)
              : attentionOf(s) > 0)) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.services.some((x) => x.toLowerCase().includes(q)) ||
          p.images.some((x) => x.toLowerCase().includes(q))),
    )
    .sort((a, b) => {
      const name = (a.p.title || a.p.name).localeCompare(b.p.title || b.p.name)
      switch (filters.sort) {
        case "name":
          return name
        case "cpu":
          return (b.s?.cpu ?? -1) - (a.s?.cpu ?? -1) || name
        case "memory":
          return (b.s?.memory_used ?? -1) - (a.s?.memory_used ?? -1) || name
        default:
          return (
            attentionOf(b.s) - attentionOf(a.s) ||
            Number(isUp(b.p)) - Number(isUp(a.p)) ||
            name
          )
      }
    })
  const open = (p: DockerProject) => router.push(projectHref(id, p.name))

  const totals = stats.data?.projects.reduce(
    (t, s) => ({
      cpu: t.cpu + s.cpu,
      memory: t.memory + s.memory_used,
      containers: t.containers + s.running,
    }),
    { cpu: 0, memory: 0, containers: 0 },
  )
  const caption = totals && totals.containers > 0 && (
    <>
      {totals.containers} running containers · CPU {pct(totals.cpu)} ·{" "}
      {formatSize(totals.memory)}
    </>
  )

  let body: ReactNode
  if (query.isPending) {
    body = phone ? (
      <Skeleton className="mx-4 h-72 rounded-2xl" />
    ) : (
      <Grid>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" />
        ))}
      </Grid>
    )
  } else if (query.isError) {
    body = (
      <Empty
        icon={Layers}
        title="Couldn't read the projects"
        body={query.error.message}
        className="max-md:mt-4"
      />
    )
  } else if (rows.length === 0) {
    body = (
      <Empty
        icon={Layers}
        title="No compose projects yet"
        body="A project is a compose file and the containers it makes. Start one from a template, paste your own compose file or deploy one from git; projects started by hand on the server show up here too."
        className="max-md:mt-4"
        action={
          actions.can.manage && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                render={<Link href={newProjectHref(id)} />}
                nativeButton={false}
              >
                <Plus />
                New project
              </Button>
              <Button
                variant="outline"
                render={<Link href={newProjectHref(id, undefined, "git")} />}
                nativeButton={false}
              >
                <GitBranch />
                From a git repository
              </Button>
              <Button
                variant="outline"
                render={<Link href="/containers/templates" />}
                nativeButton={false}
              >
                Browse templates
              </Button>
            </div>
          )
        }
      />
    )
  } else if (shown.length === 0) {
    body = (
      <NoMatch
        onReset={() => setFilters({ q: null, show: null, sort: null })}
      />
    )
  } else if (phone) {
    body = (
      <Rows>
        {shown.map(({ p, s }) => (
          <PhoneRow
            key={p.name}
            id={p.name}
            title={p.title || p.name}
            sub={<PhoneSub p={p} s={s} />}
            aside={
              s &&
              s.running > 0 && (
                <Spark
                  values={s.history.map((x) => x.cpu)}
                  max={CPU_FLOOR}
                  className="h-7 w-16"
                />
              )
            }
            onOpen={() => open(p)}
            menu={actions.menu(p)}
          />
        ))}
      </Rows>
    )
  } else {
    body = (
      <Grid>
        {shown.map(({ p, s }) => (
          <ProjectCard
            key={p.name}
            p={p}
            s={s}
            href={projectHref(id, p.name)}
            menu={<ItemMenu groups={actions.menu(p)} label="Project actions" />}
          />
        ))}
      </Grid>
    )
  }

  return (
    <>
      <PageBar
        phone={phone}
        tabs={
          <Segmented
            label="Show"
            value={filters.show}
            onChange={(v: Show) => setFilters({ show: v === "all" ? null : v })}
            items={[
              { value: "all", label: `All ${rows.length}` },
              { value: "running", label: `Running ${running}` },
              { value: "stopped", label: `Stopped ${rows.length - running}` },
              ...(attention > 0 || filters.show === "attention"
                ? [
                    {
                      value: "attention" as const,
                      label: `Needs a look ${attention}`,
                    },
                  ]
                : []),
            ]}
          />
        }
        filters={
          <ChoiceChip
            phone={phone}
            label="Sort"
            icon={<ArrowDownUp className="size-3.5 text-ash" />}
            value={filters.sort}
            options={sortOptions}
            onChange={(v) => setFilters({ sort: v === "attention" ? null : v })}
          />
        }
        search={
          <SearchBox
            value={filters.q}
            onChange={(v) => setFilters({ q: v || null })}
            placeholder="Search projects, services, images"
            label="Search projects"
            className="md:max-w-72"
          />
        }
        caption={caption}
        refresh={{
          busy: query.isFetching || stats.isFetching,
          run: () => {
            query.refetch()
            stats.refetch()
          },
        }}
        primary={
          actions.can.manage
            ? {
                label: "New project",
                icon: <Plus />,
                run: () => router.push(newProjectHref(id)),
              }
            : undefined
        }
      />
      <div className={cn(phone ? "pt-3 pb-24" : "mt-4")}>{body}</div>
      {actions.dialog}
    </>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-4">
      {children}
    </div>
  )
}

function PhoneSub({ p, s }: { p: DockerProject; s?: DockerProjectStats }) {
  const meta = projectStateMeta[p.state]
  const bits: string[] = []
  if (p.total > 0) bits.push(`${p.running}/${p.total} running`)
  if (s && s.running > 0) {
    bits.push(`CPU ${pct(s.cpu)}`)
    bits.push(formatSize(s.memory_used))
  }
  if (s && s.unhealthy > 0) bits.push(`${s.unhealthy} unhealthy`)
  // "2/2 running" already says Running; other states keep their label.
  const label = p.state === "running" && p.total > 0 ? [] : [meta.label]
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Dot tone={attentionOf(s) === 2 ? "destructive" : meta.tone} />
      <span className="truncate">{[...label, ...bits].join(" · ")}</span>
    </span>
  )
}

// One project as a card. The title is the link; its `after:` covers the card
// so the whole card opens the project while the menu stays clickable.
function ProjectCard({
  p,
  s,
  href,
  menu,
}: {
  p: DockerProject
  s?: DockerProjectStats
  href: string
  menu: ReactNode
}) {
  const meta = projectStateMeta[p.state]
  const need = attentionOf(s)
  const live = !!s && s.running > 0
  const mem = s ? memoryShare(s) : null
  const cores = s?.cpus || 1
  const cpuShare = s ? s.cpu / cores : 0
  const ports = s?.ports ?? []
  const restarts = s?.restarts ?? 0

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        need === 2
          ? "border-destructive/40"
          : need === 1
            ? "border-warning/40"
            : "border-border",
      )}
    >
      <header className="flex items-start gap-3">
        <span
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-xl",
            p.state === "running" && need === 0
              ? "bg-brand-soft text-brand-strong"
              : need === 2
                ? "bg-destructive/10 text-destructive"
                : need === 1 || p.state === "partial"
                  ? "bg-warning/10 text-warning"
                  : "bg-muted text-muted-foreground",
          )}
        >
          <Layers className="size-5" />
          {live && (
            <span className="absolute -end-0.5 -top-0.5 flex size-3">
              <span
                className={cn(
                  "absolute inset-0 animate-ping rounded-full opacity-40 motion-reduce:hidden",
                  need ? "bg-warning" : "bg-success",
                )}
              />
              <span
                className={cn(
                  "relative size-3 rounded-full border-2 border-card",
                  need ? "bg-warning" : "bg-success",
                )}
              />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body font-medium">
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {p.title || p.name}
            </Link>
          </h3>
          <p className="flex items-center gap-1.5 truncate text-caption text-muted-foreground">
            <Dot tone={meta.tone} />
            {meta.label}
            {p.title && (
              <span className="truncate font-mono text-ash">· {p.name}</span>
            )}
            {!p.managed && <Tag>External</Tag>}
          </p>
        </div>
        <div className="relative z-10 -me-2 -mt-1">{menu}</div>
      </header>

      {p.note && (
        <p className="-mt-1 line-clamp-2 text-body-sm text-muted-foreground">
          {p.note}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2 text-caption">
          <span className="text-body-sm font-medium tabular-nums">
            {p.running}/{p.total}
          </span>
          <span className="text-muted-foreground">
            {p.total === 1 ? "container" : "containers"} running
          </span>
          <span className="ms-auto flex items-center gap-2">
            {s && s.healthy + s.unhealthy + s.starting > 0 && <Health s={s} />}
          </span>
        </div>
        <ContainerBar containers={s?.containers ?? []} />
      </div>

      {live && s && mem ? (
        <div className="grid grid-cols-2 gap-3">
          <Metric
            icon={Cpu}
            label="CPU"
            value={pct(s.cpu)}
            hint={`${pct(cpuShare)} of ${cores} ${cores === 1 ? "core" : "cores"}`}
          >
            <Spark
              values={s.history.map((x) => x.cpu)}
              max={CPU_FLOOR}
              tone={shareTone(cpuShare)}
            />
          </Metric>
          <Metric
            icon={MemoryStick}
            label="Memory"
            value={formatSize(s.memory_used)}
            hint={
              mem.of
                ? `${pct(mem.share)} of ${mem.limited ? "its limits" : "the server"}`
                : ""
            }
          >
            <Spark
              values={s.history.map((x) => x.memory)}
              tone={shareTone(mem.share)}
            />
          </Metric>
        </div>
      ) : (
        <div className="flex h-[5.75rem] items-center justify-center rounded-xl border border-dashed border-border text-caption text-ash">
          {p.state === "not-deployed"
            ? "Not deployed yet: Deploy starts its services"
            : s && s.running === 0
              ? "Nothing running, so nothing to measure"
              : measureHint(s, p)}
        </div>
      )}

      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-caption">
        <Fact icon={Boxes} label="Services">
          {p.services.length || "—"}
        </Fact>
        <Fact icon={Clock} label="Up for">
          {live ? upFor(s?.since) || "—" : "—"}
        </Fact>
        <Fact icon={RotateCcw} label="Restarts">
          <span className={cn(restarts > 0 && "text-warning")}>{restarts}</span>
        </Fact>
      </dl>

      {(ports.length > 0 || (live && s)) && (
        <div className="-mt-1 flex flex-wrap items-center gap-1.5 text-caption">
          {ports.slice(0, 3).map((x) => (
            <span
              key={`${x.ip}|${x.public}|${x.private}|${x.proto}`}
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {portLabel(x)}
            </span>
          ))}
          {ports.length > 3 && (
            <span className="text-ash">+{ports.length - 3}</span>
          )}
          {live && s && (
            <span
              className="ms-auto inline-flex items-center gap-1 text-muted-foreground tabular-nums"
              title="Network: received / sent"
            >
              <Network className="size-3.5 text-ash" />↓ {rate(s.net_rx_rate)} ↑{" "}
              {rate(s.net_tx_rate)}
            </span>
          )}
        </div>
      )}
    </article>
  )
}

function measureHint(s: DockerProjectStats | undefined, p: DockerProject) {
  if (!s) return p.total > 0 ? "Measuring…" : "No containers"
  return "Measuring…"
}

function Health({ s }: { s: DockerProjectStats }) {
  return (
    <span className="inline-flex items-center gap-2">
      <HeartPulse className="size-3.5 text-ash" />
      {s.unhealthy > 0 && (
        <span className="text-destructive">{s.unhealthy} unhealthy</span>
      )}
      {s.starting > 0 && (
        <span className="text-warning">{s.starting} starting</span>
      )}
      {s.healthy > 0 && (
        <span className="text-muted-foreground">{s.healthy} healthy</span>
      )}
    </span>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  children,
}: {
  icon: typeof Cpu
  label: string
  value: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-subtle px-3 pt-2.5 pb-1.5">
      <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <Icon className="size-3.5 text-ash" />
        {label}
      </span>
      <span className="text-subheading font-light tabular-nums">{value}</span>
      <span className="truncate text-[11px] text-ash">{hint}</span>
      {children}
    </div>
  )
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Cpu
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-ash">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="truncate font-medium tabular-nums">{children}</dd>
    </div>
  )
}
