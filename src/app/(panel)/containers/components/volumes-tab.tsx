"use client"

import {
  ArrowDownWideNarrow,
  HardDrive,
  HardDriveUpload,
  ListFilter,
  ListTree,
  Plus,
  Ruler,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsBoolean, parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { DockerVolume, DockerVolumeBackup, Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, SearchBox } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useDockerUsage, useDockerVolumes, useVolumeBackups } from "../api"
import { useDockerActions, useVolumeMenu } from "./docker-actions"
import {
  BulkBar,
  ChoiceChip,
  NoMatch,
  PageBar,
  PhoneRow,
  Rows,
  Table,
  Tag,
  Tr,
} from "./kit"
import {
  containerHref,
  Dot,
  stateOf,
  useDockerFilters,
  volumeHref,
} from "./meta"
import { StackBar } from "./parts"
import type { DockerCan } from "./permissions"
import { projectHref } from "./project-actions"
import { VolumeCopiesButton } from "./volume-backups"
import { volumeTitle } from "./volume-page"

// --- Filters ---------------------------------------------------------------

const whichs = ["all", "used", "unused", "anonymous", "nocopy"] as const
type Which = (typeof whichs)[number]

const whichLabels: Record<Which, string> = {
  all: "All",
  used: "In use",
  unused: "Unused",
  anonymous: "Anonymous",
  nocopy: "Never backed up",
}

const sorts = ["name", "size", "newest", "oldest", "used"] as const
type Sort = (typeof sorts)[number]

const sortLabels: Record<Sort, string> = {
  name: "Name",
  size: "Largest first",
  newest: "Newest first",
  oldest: "Oldest first",
  used: "Most used",
}

const volumeListParsers = {
  which: parseAsStringLiteral(whichs).withDefault("all"),
  sort: parseAsStringLiteral(sorts).withDefault("name"),
  group: parseAsBoolean.withDefault(false),
}

const created = (v: DockerVolume) => (v.created ? Date.parse(v.created) : 0)

const byName = (x: DockerVolume, y: DockerVolume) =>
  Number(x.anonymous) - Number(y.anonymous) ||
  (x.project ?? "").localeCompare(y.project ?? "") ||
  x.name.localeCompare(y.name)

const sorters: Record<Sort, (x: DockerVolume, y: DockerVolume) => number> = {
  name: byName,
  size: (x, y) => y.size - x.size || byName(x, y),
  newest: (x, y) => created(y) - created(x) || byName(x, y),
  oldest: (x, y) => created(x) - created(y) || byName(x, y),
  used: (x, y) => y.used_by.length - x.used_by.length || byName(x, y),
}

// The newest stored copy of each volume, and the ones being made now.
type Copies = Map<string, { last?: string; running: boolean; n: number }>

function copiesOf(items: DockerVolumeBackup[]): Copies {
  const map: Copies = new Map()
  for (const b of items) {
    const c = map.get(b.volume) ?? { running: false, n: 0 }
    if (b.state === "running") c.running = true
    if (b.state === "stored") {
      c.n++
      const at = b.finished_at ?? b.created_at
      if (!c.last || at > c.last) c.last = at
    }
    map.set(b.volume, c)
  }
  return map
}

// --- Tab -------------------------------------------------------------------

export function VolumesTab({
  server,
  phone,
  can,
  tabs,
  aside,
}: {
  server: Server
  phone: boolean
  can: DockerCan
  tabs: ReactNode
  aside?: ReactNode
}) {
  const a = useDockerActions()
  const router = useRouter()
  // Sizes cost a du over every volume: only when asked (or sorted by size).
  const [measure, setMeasure] = useState(false)
  const [filters, setFilters] = useDockerFilters()
  const [f, setF] = useQueryStates(volumeListParsers, { history: "replace" })
  const sizes = measure || f.sort === "size"
  const list = useDockerVolumes(server.id, sizes)
  const usage = useDockerUsage(server.id)
  const backups = useVolumeBackups(server.id)
  const copies = copiesOf(backups.data?.items ?? [])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const all = list.data ?? []
  const measured = sizes && !list.isPlaceholderData && !!list.data
  const test: Record<Which, (v: DockerVolume) => boolean> = {
    all: () => true,
    used: (v) => v.used_by.length > 0,
    unused: (v) => v.used_by.length === 0,
    anonymous: (v) => v.anonymous,
    nocopy: (v) => !copies.get(v.name)?.n,
  }
  const n = Object.fromEntries(
    whichs.map((w) => [w, all.filter(test[w]).length]),
  ) as Record<Which, number>

  const q = filters.q.trim().toLowerCase()
  const shown = all
    .filter(
      (v) =>
        test[f.which](v) &&
        (!q ||
          v.name.toLowerCase().includes(q) ||
          (v.project ?? "").toLowerCase().includes(q) ||
          v.used_by.some((r) => r.name.toLowerCase().includes(q))),
    )
    .sort(sorters[f.sort])

  const groups: { project: string; items: DockerVolume[] }[] = []
  if (f.group) {
    const by = new Map<string, DockerVolume[]>()
    for (const v of shown) {
      const k = v.project ?? ""
      if (!by.has(k)) by.set(k, [])
      by.get(k)?.push(v)
    }
    for (const [project, items] of by) groups.push({ project, items })
    groups.sort((x, y) =>
      !x.project !== !y.project
        ? x.project
          ? -1
          : 1
        : x.project.localeCompare(y.project),
    )
  }

  const picked = all.filter((v) => selected.has(v.name))
  const clear = () => setSelected(new Set())
  function select(names: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const k of names) {
        if (on) next.add(k)
        else next.delete(k)
      }
      return next
    })
  }
  const reset = () => {
    setF({ which: null })
    setFilters({ q: null })
  }
  const open = (v: DockerVolume) => router.push(volumeHref(server.id, v.name))
  const largest = Math.max(1, ...all.map((v) => v.size))
  const rowProps = {
    server: server.id,
    can,
    copies,
    measured,
    largest,
    open,
  }

  let body: ReactNode
  if (list.isPending) body = <VolumesSkeleton phone={phone} />
  else if (list.isError && !list.data)
    body = (
      <Empty
        icon={HardDrive}
        title="Couldn't list the volumes"
        body={list.error.message}
        className="max-md:mt-4"
        action={
          <Button variant="outline" onClick={() => list.refetch()}>
            Try again
          </Button>
        }
      />
    )
  else if (all.length === 0)
    body = (
      <Empty
        icon={HardDrive}
        title="No volumes"
        body="Volumes keep a container's data when it's removed or recreated. Compose projects make theirs on the way up."
        className="max-md:mt-4"
        action={
          can.manage && (
            <Button onClick={() => a.newVolume(server.id)}>New volume</Button>
          )
        }
      />
    )
  else if (shown.length === 0) body = <NoMatch onReset={reset} />
  else if (phone)
    body = f.group ? (
      groups.map((g) => (
        <section key={g.project || "-"} className="mt-4 first:mt-0">
          <GroupHead server={server.id} project={g.project} items={g.items} />
          <Rows>
            {g.items.map((v) => (
              <VolumePhoneRow key={v.name} v={v} {...rowProps} />
            ))}
          </Rows>
        </section>
      ))
    ) : (
      <Rows>
        {shown.map((v) => (
          <VolumePhoneRow key={v.name} v={v} {...rowProps} />
        ))}
      </Rows>
    )
  else {
    const names = shown.map((v) => v.name)
    const on = names.filter((k) => selected.has(k)).length
    const cols = 6 + (can.manage ? 1 : 0) + 1
    const row = (v: DockerVolume) => (
      <VolumeRow
        key={v.name}
        v={v}
        {...rowProps}
        select={
          can.manage
            ? {
                checked: selected.has(v.name),
                onChange: (x) => select([v.name], x),
              }
            : undefined
        }
      />
    )
    body = (
      <Table
        selectAll={
          can.manage
            ? {
                checked: on > 0 && on === names.length,
                indeterminate: on > 0 && on < names.length,
                onChange: (x) => select(names, x),
                label: "Select every volume shown",
              }
            : undefined
        }
        head={[
          { label: "Volume" },
          { label: "Used by" },
          { label: "Size", className: "text-end" },
          { label: "Last copy", className: "hidden @2xl:table-cell" },
          { label: "Created", className: "hidden @4xl:table-cell" },
          { label: "Driver", className: "hidden @5xl:table-cell" },
        ]}
      >
        {f.group
          ? groups.map((g) => [
              <tr key={`g-${g.project}`} className="bg-subtle/70">
                <td colSpan={cols} className="px-4 py-2">
                  <GroupHead
                    server={server.id}
                    project={g.project}
                    items={g.items}
                  />
                </td>
              </tr>,
              ...g.items.map(row),
            ])
          : shown.map(row)}
      </Table>
    )
  }

  const measureButton = (
    <Button
      variant="outline"
      size={phone ? "icon-lg" : "sm"}
      className="md:h-9"
      aria-label="Measure sizes"
      title="Measure every volume's size (du on the server)"
      disabled={sizes && list.isFetching}
      onClick={() => (sizes ? list.refetch() : setMeasure(true))}
    >
      <Ruler className={cn(sizes && list.isFetching && "animate-pulse")} />
      {!phone &&
        (sizes && list.isFetching
          ? "Measuring…"
          : measured
            ? "Measure again"
            : "Measure sizes")}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4 max-md:gap-0">
      <PageBar
        phone={phone}
        tabs={tabs}
        aside={
          <>
            {!phone && measureButton}
            <VolumeCopiesButton
              server={server.id}
              serverName={server.name}
              can={can}
              phone={phone}
            />
            {aside}
          </>
        }
        search={
          <SearchBox
            value={filters.q}
            onChange={(v) => setFilters({ q: v || null })}
            placeholder="Search volumes"
            label="Search volumes"
            className="min-w-0 flex-1 md:max-w-72 md:min-w-40"
          />
        }
        filters={
          <>
            <ChoiceChip<Which>
              phone={phone}
              label="Show"
              icon={<ListFilter className="size-4 text-ash" />}
              value={f.which}
              options={whichs
                .filter((w) => w === f.which || w === "all" || n[w] > 0)
                .map((w) => ({
                  value: w,
                  label: `${whichLabels[w]} · ${n[w]}`,
                }))}
              onChange={(v) => setF({ which: v === "all" ? null : v })}
            />
            <ChoiceChip<Sort>
              phone={phone}
              label="Sort"
              icon={<ArrowDownWideNarrow className="size-4 text-ash" />}
              value={f.sort}
              options={sorts.map((s) => ({ value: s, label: sortLabels[s] }))}
              onChange={(v) => setF({ sort: v === "name" ? null : v })}
            />
            <Button
              variant="outline"
              aria-pressed={f.group}
              title="Group by compose project"
              className={cn(
                "h-9 shrink-0 gap-1.5",
                phone && "rounded-full px-3.5",
                f.group && "border-brand/40 bg-brand-soft text-brand-strong",
              )}
              onClick={() => setF({ group: f.group ? null : true })}
            >
              <ListTree className="size-4" />
              {phone || f.group ? "By project" : "Group"}
            </Button>
            {phone && measureButton}
          </>
        }
        refresh={{
          busy: list.isFetching,
          run: () => {
            list.refetch()
            usage.refetch()
            backups.refetch()
          },
        }}
        primary={
          can.manage
            ? {
                label: "New volume",
                icon: <Plus />,
                run: () => a.newVolume(server.id),
              }
            : undefined
        }
      />
      {all.length > 0 && (
        <Space
          phone={phone}
          volumes={all}
          usage={usage.data?.volumes}
          measured={measured}
          unused={n.unused}
          nocopy={n.nocopy}
          manage={can.manage}
          which={f.which}
          onWhich={(w) => setF({ which: w === "all" ? null : w })}
          onRemove={(vs) => a.removeVolumes(server.id, vs, clear)}
        />
      )}
      <div className={cn(phone && "pt-3 pb-24")}>{body}</div>
      {!phone && picked.length > 0 && (
        <BulkBar
          count={picked.length}
          onClear={clear}
          actions={[
            ...(picked.length === 1
              ? [
                  {
                    label: "Back up…",
                    icon: <HardDriveUpload />,
                    run: () => a.backupVolume(server.id, picked[0]),
                  },
                ]
              : []),
            {
              label: "Remove…",
              icon: <Trash2 />,
              destructive: true,
              run: () => a.removeVolumes(server.id, picked, clear),
            },
          ]}
        />
      )}
    </div>
  )
}

// --- Space strip -----------------------------------------------------------

function Space({
  phone,
  volumes,
  usage,
  measured,
  unused,
  nocopy,
  manage,
  which,
  onWhich,
  onRemove,
}: {
  phone: boolean
  volumes: DockerVolume[]
  usage?: { size: number; reclaimable: number; count: number }
  measured: boolean
  unused: number
  nocopy: number
  manage: boolean
  which: Which
  onWhich: (w: Which) => void
  onRemove: (vs: DockerVolume[]) => void
}) {
  // Docker's own numbers when it has them; the measured list otherwise.
  const sum = (vs: DockerVolume[]) =>
    vs.reduce((s, v) => s + Math.max(0, v.size), 0)
  const total = usage?.size ?? (measured ? sum(volumes) : undefined)
  const free =
    usage?.reclaimable ??
    (measured ? sum(volumes.filter((v) => !v.used_by.length)) : undefined)
  const leftovers = volumes.filter((v) => v.anonymous && !v.used_by.length)

  const insight = (
    key: string,
    show: boolean,
    icon: ReactNode,
    label: string,
    run: () => void,
    active?: boolean,
  ) =>
    show && (
      <Button
        key={key}
        variant="outline"
        size="sm"
        className={cn(
          "shrink-0",
          phone && "h-9 rounded-full px-3.5",
          active && "border-brand/40 bg-brand-soft text-brand-strong",
        )}
        aria-pressed={active}
        onClick={run}
      >
        {icon}
        {label}
      </Button>
    )

  const actions = [
    insight(
      "unused",
      unused > 0,
      <ListFilter />,
      `${unused} unused`,
      () => onWhich(which === "unused" ? "all" : "unused"),
      which === "unused",
    ),
    insight(
      "nocopy",
      nocopy > 0,
      <ShieldAlert className="text-warning" />,
      `${nocopy} never backed up`,
      () => onWhich(which === "nocopy" ? "all" : "nocopy"),
      which === "nocopy",
    ),
    insight(
      "leftovers",
      manage && leftovers.length > 0,
      <Trash2 />,
      `Remove ${leftovers.length} unused anonymous`,
      () => onRemove(leftovers),
    ),
  ].filter(Boolean)

  const used = total !== undefined && free !== undefined ? total - free : 0
  const meter = (
    <>
      <div className="flex items-baseline gap-2">
        <span className="text-subheading font-light tabular-nums">
          {total !== undefined ? formatSize(total) : `${volumes.length}`}
        </span>
        <span className="text-body-sm text-muted-foreground">
          {total !== undefined
            ? `on disk · ${volumes.length} volume${volumes.length === 1 ? "" : "s"}`
            : `volume${volumes.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {total !== undefined && free !== undefined && (
        <>
          <StackBar
            label="Volume space"
            parts={[
              { value: used, className: "bg-brand", label: "in use" },
              { value: free, className: "bg-mist", label: "unused" },
            ]}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full bg-brand" />
              {formatSize(used)} used by containers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full bg-mist" />
              {formatSize(free)} in unused volumes
            </span>
          </div>
        </>
      )}
    </>
  )

  if (phone)
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex flex-col gap-2">{meter}</div>
        {actions.length > 0 && (
          <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
            {actions}
          </div>
        )}
      </div>
    )
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-border px-5 py-4">
      <div className="flex min-w-64 flex-1 flex-col gap-2 md:max-w-md">
        {meter}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">{actions}</div>
      )}
    </div>
  )
}

// --- Rows ------------------------------------------------------------------

type RowProps = {
  v: DockerVolume
  server: string
  can: DockerCan
  copies: Copies
  measured: boolean
  largest: number
  open: (v: DockerVolume) => void
}

function copyText(c?: { last?: string; running: boolean }) {
  if (c?.running) return "Backing up…"
  return c?.last ? timeAgo(c.last) : undefined
}

function VolumeRow({
  v,
  server,
  can,
  copies,
  measured,
  largest,
  open,
  select,
}: RowProps & {
  select?: { checked: boolean; onChange: (on: boolean) => void }
}) {
  const menu = useVolumeMenu(server, v, can)
  const copy = copyText(copies.get(v.name))
  return (
    <Tr
      label={volumeTitle(v)}
      menu={menu}
      onOpen={() => open(v)}
      select={select}
      cells={[
        {
          node: (
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <HardDrive className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">
                  {volumeTitle(v)}
                  {v.anonymous && <Tag>Anonymous</Tag>}
                </span>
                {v.project && (
                  <span className="truncate text-caption text-ash">
                    {v.project}
                  </span>
                )}
              </span>
            </span>
          ),
        },
        {
          node: <UsedChips server={server} v={v} />,
          className: "max-w-72",
        },
        {
          node: measured ? (
            v.size >= 0 ? (
              <span className="inline-flex flex-col items-end gap-1">
                <span>{formatSize(v.size)}</span>
                <span className="block h-1 w-16 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-brand/70"
                    style={{
                      width: `${Math.max(2, (v.size / largest) * 100)}%`,
                    }}
                  />
                </span>
              </span>
            ) : (
              <span className="text-ash">—</span>
            )
          ) : (
            <span className="text-ash">—</span>
          ),
          className: "text-end tabular-nums",
        },
        {
          node: copy ? (
            <span className="text-muted-foreground">{copy}</span>
          ) : (
            <span className="text-ash">Never</span>
          ),
          className: "hidden @2xl:table-cell whitespace-nowrap",
        },
        {
          node: (
            <span className="text-muted-foreground">
              {v.created ? timeAgo(v.created) : "—"}
            </span>
          ),
          className: "hidden @4xl:table-cell whitespace-nowrap",
        },
        {
          node: <span className="text-muted-foreground">{v.driver}</span>,
          className: "hidden @5xl:table-cell",
        },
      ]}
    />
  )
}

// The containers using a volume, as links with their state.
function UsedChips({ server, v }: { server: string; v: DockerVolume }) {
  if (v.used_by.length === 0) return <span className="text-ash">Unused</span>
  const first = v.used_by.slice(0, 2)
  const more = v.used_by.length - first.length
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      {first.map((r) => (
        <Link
          key={r.id}
          href={containerHref(server, r.name || r.id)}
          title={`${r.name} · ${stateOf(r).label}`}
          className="inline-flex max-w-44 items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-caption hover:bg-muted"
        >
          <Dot tone={stateOf(r).tone} />
          <span className="truncate">{r.name}</span>
        </Link>
      ))}
      {more > 0 && (
        <span
          className="text-caption text-muted-foreground"
          title={v.used_by
            .slice(2)
            .map((r) => r.name)
            .join(", ")}
        >
          +{more}
        </span>
      )}
    </span>
  )
}

function VolumePhoneRow({ v, server, can, copies, measured, open }: RowProps) {
  const menu = useVolumeMenu(server, v, can)
  const used =
    v.used_by.length === 0
      ? "Unused"
      : v.used_by.length === 1
        ? v.used_by[0].name
        : `${v.used_by[0].name} +${v.used_by.length - 1}`
  const copy = copyText(copies.get(v.name))
  return (
    <PhoneRow
      id={v.name}
      title={volumeTitle(v)}
      lead={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <HardDrive className="size-5" />
        </span>
      }
      sub={[
        used,
        v.project,
        measured && v.size >= 0 ? formatSize(v.size) : null,
        copy ? `copy ${copy}` : null,
        v.anonymous ? "anonymous" : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      menu={menu}
      onOpen={() => open(v)}
    />
  )
}

function GroupHead({
  server,
  project,
  items,
}: {
  server: string
  project: string
  items: DockerVolume[]
}) {
  const size = items.reduce((s, v) => s + Math.max(0, v.size), 0)
  return (
    <div className="flex items-baseline gap-2 max-md:px-4 max-md:pb-2">
      {project ? (
        <Link
          href={projectHref(server, project)}
          className="font-medium hover:underline"
        >
          {project}
        </Link>
      ) : (
        <span className="font-medium">No project</span>
      )}
      <span className="text-caption text-muted-foreground">
        {items.length} volume{items.length === 1 ? "" : "s"}
        {size > 0 && ` · ${formatSize(size)}`}
      </span>
    </div>
  )
}

function VolumesSkeleton({ phone }: { phone: boolean }) {
  if (phone)
    return (
      <div className="flex flex-col gap-3 px-4 pt-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    )
  return <Skeleton className="h-80 rounded-2xl" />
}
