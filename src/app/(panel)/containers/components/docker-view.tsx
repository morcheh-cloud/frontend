"use client"

import {
  CircleStop,
  Container,
  FolderGit2,
  List,
  LoaderCircle,
  Play,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { DockerEngine, DockerNetwork, Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  Notices,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  useDockerContainers,
  useDockerEngine,
  useDockerImages,
  useDockerNetworks,
  useDockerUsage,
  useDockerVolumes,
  useRefreshDockerUsage,
} from "../api"
import {
  ContainerRows,
  ContainersTable,
  type ServerInfo,
} from "./container-list"
import { useDockerActions, useNetworkMenu } from "./docker-actions"
import { ImagesTab } from "./images-tab"
import {
  BulkBar,
  NoMatch,
  PageBar,
  PhoneRow,
  Rows,
  Table,
  Tag,
  Tr,
} from "./kit"
import {
  byContainer,
  counts,
  type DockerTab,
  engineName,
  engineStateMeta,
  groupByProject,
  matches,
  type Show,
  showLabels,
  useDockerFilters,
  viaLabel,
} from "./meta"
import { Block, Pairs, StackBar } from "./parts"
import { type DockerCan, useDockerCan } from "./permissions"
import { VolumesTab } from "./volumes-tab"

type Ctx = {
  server: Server
  phone: boolean
  can: DockerCan
  tabs: ReactNode
}

// One server's Docker: its containers grouped by compose project, images,
// volumes, networks and the engine itself. Used by /containers/[server] and
// the server's Containers tab.
export function DockerView({
  server,
  phone,
  aside,
  section,
}: {
  server: Server
  phone: boolean
  // Extra buttons at the end of the desktop toolbar (e.g. Open server).
  aside?: ReactNode
  // One section only, without the section tabs: the Containers pages, where
  // the sidebar picks the section.
  section?: DockerTab
}) {
  const engine = useDockerEngine(server.id)
  const can = useDockerCan(server.id, server.workspace_id)
  const [filters, setFilters] = useDockerFilters()
  const ready = engine.data?.state === "ready"
  const containers = useDockerContainers(server.id, ready)
  const images = useDockerImages(server.id, ready)
  const volumes = useDockerVolumes(server.id, false, ready)
  const networks = useDockerNetworks(server.id, ready)

  if (engine.isPending) return <ViewSkeleton phone={phone} />
  if (engine.isError && !engine.data) {
    return (
      <Empty
        icon={TriangleAlert}
        title="Couldn't reach the engine"
        body={engine.error.message || "The server didn't answer. Try again."}
        className="max-md:mt-4"
        action={
          <Button variant="outline" onClick={() => engine.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  if (!ready) return <EngineState server={server} engine={engine.data} />

  const count = (n?: number) => (n === undefined ? "" : ` · ${n}`)
  const tab = section ?? filters.tab
  const tabs = section ? null : (
    <Segmented<DockerTab>
      label="Section"
      items={[
        {
          value: "containers",
          label: `Containers${count(containers.data?.length)}`,
        },
        { value: "images", label: `Images${count(images.data?.length)}` },
        { value: "volumes", label: `Volumes${count(volumes.data?.length)}` },
        {
          value: "networks",
          label: `Networks${count(networks.data?.length)}`,
        },
        { value: "system", label: "System" },
      ]}
      value={filters.tab}
      onChange={(tab) =>
        setFilters({
          tab: tab === "containers" ? null : tab,
          q: null,
          show: null,
        })
      }
    />
  )
  const ctx: Ctx = { server, phone, can, tabs }
  return (
    <>
      {tab === "containers" && <ContainersTab ctx={ctx} aside={aside} />}
      {tab === "images" && <ImagesTab {...ctx} aside={aside} />}
      {tab === "volumes" && <VolumesTab {...ctx} aside={aside} />}
      {tab === "networks" && <NetworksTab ctx={ctx} aside={aside} />}
      {tab === "system" && (
        <SystemTab ctx={ctx} engine={engine.data} aside={aside} />
      )}
    </>
  )
}

// --- Toolbar ---------------------------------------------------------------

function Bar(
  props: Omit<Parameters<typeof PageBar>[0], "phone" | "tabs"> & { ctx: Ctx },
) {
  const { ctx, ...rest } = props
  return <PageBar phone={ctx.phone} tabs={ctx.tabs} {...rest} />
}

function Body({ ctx, children }: { ctx: Ctx; children: ReactNode }) {
  return <div className={cn(ctx.phone && "pt-3 pb-24")}>{children}</div>
}

// --- Containers ------------------------------------------------------------

function ContainersTab({ ctx, aside }: { ctx: Ctx; aside?: ReactNode }) {
  const { server, phone } = ctx
  const a = useDockerActions()
  const list = useDockerContainers(server.id)
  const [filters, setFilters] = useDockerFilters()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const all = list.data ?? []
  const n = counts(all)
  const q = filters.q.trim()
  const shown = all.filter((c) => matches(c, q, filters.show))
  const groups = filters.flat
    ? [
        {
          key: "all",
          project: "",
          containers: [...shown].sort(byContainer),
          running: 0,
          problems: 0,
        },
      ]
    : groupByProject(shown)
  const info = new Map<string, ServerInfo>([
    [
      server.id,
      {
        workspace: server.workspace_id,
        name: server.name,
        address: server.host,
      },
    ],
  ])
  const picked = all.filter((c) => selected.has(c.id))

  function select(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const filterChips = (
    <>
      <Segmented<Show>
        label="Show"
        items={(["all", "running", "stopped", "problems"] as const).map(
          (v) => ({ value: v, label: `${showLabels[v]} · ${n[v]}` }),
        )}
        value={filters.show}
        onChange={(v) => setFilters({ show: v === "all" ? null : v })}
      />
      {!phone && (
        <Button
          variant={filters.flat ? "secondary" : "ghost"}
          size="icon"
          className="size-9"
          aria-pressed={filters.flat}
          aria-label={filters.flat ? "Group by project" : "Show one list"}
          title={filters.flat ? "Group by project" : "Show one list"}
          onClick={() => setFilters({ flat: filters.flat ? null : true })}
        >
          {filters.flat ? <FolderGit2 /> : <List />}
        </Button>
      )}
    </>
  )

  let body: ReactNode
  if (list.isPending) body = <ListSkeleton phone={phone} />
  else if (all.length === 0) {
    body = (
      <Empty
        icon={Container}
        title="No containers yet"
        body="Containers started on this server (docker run, docker compose up, Portainer…) show up here by themselves."
        className="max-md:mt-4"
      />
    )
  } else if (shown.length === 0) {
    body = (
      <NoMatch
        text={
          filters.show === "problems" && !q
            ? "Nothing needs a look: every container runs or stopped cleanly."
            : undefined
        }
        onReset={() => setFilters({ q: null, show: null })}
      />
    )
  } else if (phone) {
    body = <ContainerRows groups={groups} servers={info} />
  } else {
    body = (
      <ContainersTable
        groups={groups}
        servers={info}
        selected={ctx.can.operate ? selected : undefined}
        onSelect={ctx.can.operate ? select : undefined}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 max-md:gap-0">
      <Bar
        ctx={ctx}
        aside={aside}
        search={
          <SearchBox
            value={filters.q}
            onChange={(v) => setFilters({ q: v || null })}
            placeholder="Search name, image, project or port"
            label="Search containers"
            className="min-w-0 flex-1 md:max-w-72 md:min-w-36"
          />
        }
        filters={filterChips}
        caption={
          list.data &&
          `${n.running} of ${n.all} running${groupByProject(all).filter((g) => g.project).length ? ` · ${groupByProject(all).filter((g) => g.project).length} projects` : ""}`
        }
        refresh={{ busy: list.isFetching, run: () => list.refetch() }}
      />
      <Body ctx={ctx}>{body}</Body>
      {!phone && picked.length > 0 && (
        <BulkBar
          count={picked.length}
          onClear={() => setSelected(new Set())}
          actions={[
            {
              label: "Start",
              icon: <Play />,
              run: () =>
                a.runMany(
                  server.id,
                  picked.filter((c) => c.state !== "running"),
                  "start",
                ),
            },
            {
              label: "Stop",
              icon: <CircleStop />,
              run: () =>
                a.runMany(
                  server.id,
                  picked.filter((c) => c.state === "running"),
                  "stop",
                ),
            },
            {
              label: "Restart",
              icon: <RotateCw />,
              run: () => a.runMany(server.id, picked, "restart"),
            },
            ...(ctx.can.manage
              ? [
                  {
                    label: "Remove…",
                    icon: <Trash2 />,
                    destructive: true,
                    run: () =>
                      a.remove(server.id, picked, () => setSelected(new Set())),
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  )
}

// --- Networks --------------------------------------------------------------

function NetworksTab({ ctx, aside }: { ctx: Ctx; aside?: ReactNode }) {
  const { server, phone, can } = ctx
  const a = useDockerActions()
  const list = useDockerNetworks(server.id)
  const [filters, setFilters] = useDockerFilters()
  const all = [...(list.data ?? [])].sort(
    (x, y) =>
      Number(x.builtin) - Number(y.builtin) ||
      y.containers.length - x.containers.length ||
      x.name.localeCompare(y.name),
  )
  const q = filters.q.trim().toLowerCase()
  const shown = all.filter(
    (n) =>
      !q ||
      n.name.toLowerCase().includes(q) ||
      n.driver.toLowerCase().includes(q) ||
      n.subnets.some((s) => s.subnet.includes(q)),
  )

  let body: ReactNode
  if (list.isPending) body = <ListSkeleton phone={phone} />
  else if (shown.length === 0)
    body = <NoMatch onReset={() => setFilters({ q: null })} />
  else if (phone)
    body = (
      <Rows>
        {shown.map((n) => (
          <NetworkPhoneRow key={n.id} n={n} ctx={ctx} />
        ))}
      </Rows>
    )
  else
    body = (
      <Table
        head={[
          { label: "Name" },
          { label: "Driver" },
          { label: "Subnet", className: "hidden @2xl:table-cell" },
          { label: "Containers", className: "text-end" },
          { label: "Created", className: "hidden @3xl:table-cell" },
        ]}
      >
        {shown.map((n) => (
          <NetworkRow key={n.id} n={n} ctx={ctx} />
        ))}
      </Table>
    )

  return (
    <div className="flex flex-col gap-4 max-md:gap-0">
      <Bar
        ctx={ctx}
        aside={aside}
        search={
          <SearchBox
            value={filters.q}
            onChange={(v) => setFilters({ q: v || null })}
            placeholder="Search name, driver or subnet"
            label="Search networks"
            className="min-w-0 flex-1 md:max-w-64 md:min-w-36"
          />
        }
        caption={
          list.data &&
          `${all.filter((n) => !n.builtin).length} of your own · ${all.filter((n) => n.builtin).length} built in`
        }
        refresh={{ busy: list.isFetching, run: () => list.refetch() }}
        primary={
          can.manage
            ? {
                label: "New network",
                icon: <Plus />,
                run: () => a.newNetwork(server.id),
              }
            : undefined
        }
      />
      <Body ctx={ctx}>{body}</Body>
    </div>
  )
}

function NetworkRow({ n, ctx }: { n: DockerNetwork; ctx: Ctx }) {
  const a = useDockerActions()
  const menu = useNetworkMenu(ctx.server.id, n, ctx.can)
  return (
    <Tr
      label={n.name}
      menu={menu}
      onOpen={() => a.network(ctx.server.id, n.id, ctx.can)}
      cells={[
        {
          node: (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {n.name}
                {n.builtin && <Tag>Built in</Tag>}
                {n.internal && <Tag>Internal</Tag>}
              </span>
              {n.project && (
                <span className="truncate text-caption text-ash">
                  {n.project}
                </span>
              )}
            </span>
          ),
        },
        { node: <span className="text-muted-foreground">{n.driver}</span> },
        {
          node: (
            <span className="font-mono text-caption text-muted-foreground">
              {n.subnets.map((s) => s.subnet).join(", ") || "—"}
            </span>
          ),
          className: "hidden @2xl:table-cell",
        },
        {
          node: n.containers.length || <span className="text-ash">0</span>,
          className: "text-end tabular-nums",
        },
        {
          node: (
            <span className="text-muted-foreground">
              {n.created ? timeAgo(n.created) : "—"}
            </span>
          ),
          className: "hidden @3xl:table-cell",
        },
      ]}
    />
  )
}

function NetworkPhoneRow({ n, ctx }: { n: DockerNetwork; ctx: Ctx }) {
  const a = useDockerActions()
  const menu = useNetworkMenu(ctx.server.id, n, ctx.can)
  return (
    <PhoneRow
      id={n.id}
      title={n.name}
      sub={[
        n.driver,
        n.subnets[0]?.subnet,
        `${n.containers.length} container${n.containers.length === 1 ? "" : "s"}`,
        n.builtin ? "built in" : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      menu={menu}
      onOpen={() => a.network(ctx.server.id, n.id, ctx.can)}
    />
  )
}

// --- System ----------------------------------------------------------------

function SystemTab({
  ctx,
  engine: e,
  aside,
}: {
  ctx: Ctx
  engine: DockerEngine
  aside?: ReactNode
}) {
  const { server, can } = ctx
  const a = useDockerActions()
  const usage = useDockerUsage(server.id)
  const refreshUsage = useRefreshDockerUsage(server.id)
  const engine = useDockerEngine(server.id)
  return (
    <div className="flex flex-col gap-4 max-md:gap-0">
      <Bar
        ctx={ctx}
        aside={aside}
        refresh={{
          busy:
            usage.isFetching || !!usage.data?.measuring || engine.isFetching,
          run: () => {
            refreshUsage()
            engine.refetch()
          },
        }}
        primary={
          can.manage
            ? {
                label: "Clean up",
                icon: <Sparkles />,
                run: () => a.prune(server.id),
              }
            : undefined
        }
      />
      {e.warnings.length > 0 && (
        <Notices
          className="max-md:mt-3"
          notes={e.warnings.map((w) => ({ key: w, title: w, warn: true }))}
        />
      )}
      <SystemPanels server={server} engine={e} phone={ctx.phone} />
    </div>
  )
}

// Disk use with clean-up buttons, and the engine's facts. Also on the
// Containers dashboard.
export function SystemPanels({
  server,
  engine: e,
  phone,
}: {
  server: Server
  engine: DockerEngine
  phone: boolean
}) {
  const can = useDockerCan(server.id, server.workspace_id)
  const a = useDockerActions()
  const usage = useDockerUsage(server.id)
  const u = usage.data
  const kinds = u
    ? [
        {
          key: "images",
          label: "Images",
          row: u.images,
          className: "bg-brand",
          preset: { images: "all" as const },
        },
        {
          key: "containers",
          label: "Containers",
          row: u.containers,
          className: "bg-success",
          preset: { containers: true },
        },
        {
          key: "volumes",
          label: "Volumes",
          row: u.volumes,
          className: "bg-warning",
          preset: { volumes: "anonymous" as const },
        },
        {
          key: "cache",
          label: "Build cache",
          row: u.build_cache,
          className: "bg-ash",
          preset: { cache: true },
        },
      ]
    : []

  return (
    <div
      className={cn(
        "grid gap-6",
        phone ? "px-4 pt-4 pb-24" : "grid-cols-1 xl:grid-cols-2",
      )}
    >
      <Block
        title="Disk use"
        aside={
          u && (
            <span className="text-caption text-muted-foreground">
              {formatSize(u.total)} · {formatSize(u.reclaimable)} can be freed
            </span>
          )
        }
      >
        {usage.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-48 rounded-xl" />
            <p className="flex items-center gap-2 text-caption text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              The engine is measuring every image, container and volume. With a
              lot of data this takes a while; after that it opens at once.
            </p>
          </div>
        ) : !u ? (
          <p className="text-body-sm text-muted-foreground">
            Couldn't read it: {usage.error?.message}
          </p>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <StackBar
              className="h-3"
              label="Disk use"
              parts={kinds.map((k) => ({
                value: k.row.size,
                className: k.className,
                label: k.label,
              }))}
            />
            <ul className="divide-y divide-border">
              {kinds.map((k) => (
                <li
                  key={k.key}
                  className="flex min-h-11 items-center gap-3 py-2 text-body-sm"
                >
                  <span
                    className={cn("size-2.5 shrink-0 rounded-sm", k.className)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{k.label}</span>
                    <span className="block text-caption text-muted-foreground">
                      {k.row.count} · {k.row.active} in use
                    </span>
                  </span>
                  <span className="text-end tabular-nums">
                    {formatSize(k.row.size)}
                    {k.row.reclaimable > 0 && (
                      <span className="block text-caption text-muted-foreground">
                        {formatSize(k.row.reclaimable)} unused
                      </span>
                    )}
                  </span>
                  {can.manage && (
                    <Button
                      variant="ghost"
                      size={phone ? "icon-lg" : "icon-sm"}
                      aria-label={`Clean up ${k.label.toLowerCase()}`}
                      title={`Clean up ${k.label.toLowerCase()}`}
                      disabled={k.row.reclaimable <= 0}
                      onClick={() => a.prune(server.id, k.preset)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-1.5 border-t border-border pt-3 text-caption text-ash">
              {u.measuring ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Measuring again… these are from{" "}
                  {timeAgo(u.measured_at).toLowerCase()}
                </>
              ) : (
                <>Measured {timeAgo(u.measured_at).toLowerCase()}</>
              )}
            </p>
          </div>
        )}
      </Block>
      <Block title="Engine">
        <Pairs
          rows={[
            {
              label: "Engine",
              value: `${engineName(e)} ${e.version ?? ""}`.trim(),
            },
            { label: "API", value: e.api_version },
            {
              label: "Reached",
              value: [
                e.via ? (viaLabel[e.via] ?? e.via) : "",
                e.as_root ? "as root" : "",
              ]
                .filter(Boolean)
                .join(", "),
            },
            {
              label: "Containers",
              value: `${e.running} running, ${e.paused} paused, ${e.stopped} stopped`,
            },
            { label: "Images", value: String(e.images) },
            {
              label: "Host",
              value: [
                e.os,
                e.arch,
                e.cpus ? `${e.cpus} CPUs` : "",
                e.memory ? formatSize(e.memory) : "",
              ]
                .filter(Boolean)
                .join(" · "),
            },
            { label: "Kernel", value: e.kernel, mono: true },
            { label: "Storage driver", value: e.driver },
            { label: "Logging driver", value: e.logging_driver },
            {
              label: "Cgroups",
              value: e.cgroup_version ? `v${e.cgroup_version}` : "",
            },
            { label: "Data folder", value: e.root_dir, mono: true },
            {
              label: "Swarm",
              value: e.swarm && e.swarm !== "inactive" ? e.swarm : "",
            },
          ]}
        />
      </Block>
    </div>
  )
}

// --- Engine not ready ------------------------------------------------------

function EngineState({
  server,
  engine,
}: {
  server: Server
  engine?: DockerEngine
}) {
  const state = engine?.state ?? "error"
  const meta = engineStateMeta[state]
  const action: Record<string, ReactNode> = {
    "not-installed": (
      <Button render={<Link href="/applications" />} nativeButton={false}>
        Install from Applications
      </Button>
    ),
    stopped: (
      <Button
        variant="outline"
        render={<Link href={`/servers/${server.id}/services?q=docker`} />}
        nativeButton={false}
      >
        Open the server's services
      </Button>
    ),
    "no-access": (
      <Button
        variant="outline"
        render={<Link href={`/servers/${server.id}/users`} />}
        nativeButton={false}
      >
        Open the server's users
      </Button>
    ),
  }
  return (
    <Empty
      icon={state === "not-installed" ? Container : TriangleAlert}
      title={
        state === "not-installed"
          ? `No container engine on ${server.name}`
          : meta.label
      }
      body={
        <>
          {meta.hint}
          {engine?.message && (
            <span className="mt-2 block font-mono text-caption break-all text-ash">
              {engine.message}
            </span>
          )}
        </>
      }
      className="max-md:mt-4"
      action={action[state]}
    />
  )
}

// --- Loading ---------------------------------------------------------------

function ListSkeleton({ phone }: { phone: boolean }) {
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4">
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }
  return <Skeleton className="h-96 rounded-2xl" />
}

function ViewSkeleton({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone && "px-4 pt-4")}>
      <Skeleton className="h-9 rounded-lg" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
}
