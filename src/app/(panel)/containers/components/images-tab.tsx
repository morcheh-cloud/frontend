"use client"

import {
  ArrowDownWideNarrow,
  CalendarClock,
  CircleArrowUp,
  Download,
  HardDriveDownload,
  Layers,
  ListFilter,
  ListTree,
  PlayCircle,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsBoolean, parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { DockerImage, Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { newCronjobHref } from "../../cronjobs/components/meta"
import { Empty, SearchBox } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useDockerImages, useDockerUsage, useRefreshDockerUsage } from "../api"
import { useDockerActions, useImageMenu } from "./docker-actions"
import {
  type ImageFacts,
  ImageLogo,
  imageLabel,
  registryOf,
  repoOf,
  risky,
  splitRef,
  useImageFacts,
  VulnSummary,
} from "./image-meta"
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
  imageName,
  shortId,
  stateOf,
  useDockerFilters,
} from "./meta"
import { StackBar } from "./parts"
import type { DockerCan } from "./permissions"

// --- Filters ---------------------------------------------------------------

const whichs = [
  "all",
  "used",
  "unused",
  "dangling",
  "updates",
  "risky",
] as const
type Which = (typeof whichs)[number]

const whichLabels: Record<Which, string> = {
  all: "All",
  used: "In use",
  unused: "Unused",
  dangling: "Dangling",
  updates: "Update available",
  risky: "Critical or high",
}

const sorts = ["size", "newest", "oldest", "name", "used"] as const
type Sort = (typeof sorts)[number]

const sortLabels: Record<Sort, string> = {
  size: "Largest first",
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name",
  used: "Most used",
}

const imageParsers = {
  which: parseAsStringLiteral(whichs).withDefault("all"),
  sort: parseAsStringLiteral(sorts).withDefault("size"),
  group: parseAsBoolean.withDefault(false),
}

function useImageFilters() {
  return useQueryStates(imageParsers, { history: "replace" })
}

const created = (i: DockerImage) => Date.parse(i.created) || 0

const sorters: Record<Sort, (x: DockerImage, y: DockerImage) => number> = {
  size: (x, y) => y.size - x.size,
  newest: (x, y) => created(y) - created(x),
  oldest: (x, y) => created(x) - created(y),
  name: (x, y) =>
    Number(x.dangling) - Number(y.dangling) ||
    imageLabel(x).localeCompare(imageLabel(y)),
  used: (x, y) => y.containers - x.containers || y.size - x.size,
}

type Group = {
  repo: string
  items: DockerImage[]
  size: number
  older: DockerImage[]
}

function groupOrder(sort: Sort) {
  return (a: Group, b: Group) => {
    if (!a.repo !== !b.repo) return a.repo ? -1 : 1
    if (sort === "name") return a.repo.localeCompare(b.repo)
    if (sort === "newest")
      return (
        Math.max(...b.items.map(created)) - Math.max(...a.items.map(created))
      )
    if (sort === "oldest")
      return (
        Math.min(...a.items.map(created)) - Math.min(...b.items.map(created))
      )
    if (sort === "used") {
      const n = (g: Group) => g.items.reduce((s, i) => s + i.containers, 0)
      return n(b) - n(a) || b.size - a.size
    }
    return b.size - a.size
  }
}

// --- Tab -------------------------------------------------------------------

export function ImagesTab({
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
  const list = useDockerImages(server.id)
  const usage = useDockerUsage(server.id)
  const refreshUsage = useRefreshDockerUsage(server.id)
  const facts = useImageFacts(server.id)
  const [filters, setFilters] = useDockerFilters()
  const [f, setF] = useImageFilters()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const all = list.data ?? []
  const info = new Map<string, ImageFacts>(all.map((i) => [i.id, facts.of(i)]))
  const factsOf = (i: DockerImage) => info.get(i.id) ?? facts.of(i)

  // The newest image of each repository; unused older ones can go.
  const newest = new Map<string, number>()
  for (const i of all) {
    const r = repoOf(i)
    if (r) newest.set(r, Math.max(newest.get(r) ?? 0, created(i)))
  }
  const isOlder = (i: DockerImage) =>
    !i.dangling &&
    i.containers === 0 &&
    created(i) < (newest.get(repoOf(i)) ?? 0)

  const test: Record<Which, (i: DockerImage) => boolean> = {
    all: () => true,
    used: (i) => i.containers > 0,
    unused: (i) => i.containers === 0,
    dangling: (i) => i.dangling,
    updates: (i) => factsOf(i).update?.state === "available",
    risky: (i) => risky(factsOf(i).scan),
  }
  const n = Object.fromEntries(
    whichs.map((w) => [w, all.filter(test[w]).length]),
  ) as Record<Which, number>

  const q = filters.q.trim().toLowerCase()
  const shown = all
    .filter(
      (i) =>
        test[f.which](i) &&
        (!q ||
          i.tags.some((t) => t.toLowerCase().includes(q)) ||
          shortId(i.id).startsWith(q.replace(/^sha256:/, "")) ||
          factsOf(i).users.some((c) => c.name.toLowerCase().includes(q))),
    )
    .sort(sorters[f.sort])

  const groups: Group[] = []
  if (f.group) {
    const by = new Map<string, Group>()
    for (const i of shown) {
      const r = repoOf(i)
      let g = by.get(r)
      if (!g) {
        g = { repo: r, items: [], size: 0, older: [] }
        by.set(r, g)
        groups.push(g)
      }
      g.items.push(i)
      g.size += i.size
      if (isOlder(i)) g.older.push(i)
    }
    groups.sort(groupOrder(f.sort))
  }

  const picked = all.filter((i) => selected.has(i.id))
  const clear = () => setSelected(new Set())
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
  const reset = () => {
    setF({ which: null })
    setFilters({ q: null })
  }
  const largest = Math.max(1, ...all.map((i) => i.size))
  const rowProps = {
    server: server.id,
    can,
    largest,
    factsOf,
    isOlder,
  }

  let body: ReactNode
  if (list.isPending) body = <ImagesSkeleton phone={phone} />
  else if (list.isError && !list.data)
    body = (
      <Empty
        icon={Layers}
        title="Couldn't list the images"
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
        icon={Layers}
        title="No images"
        body="Pull one to run it, or let docker compose pull what it needs."
        className="max-md:mt-4"
        action={
          can.manage && (
            <Button onClick={() => a.pull(server.id)}>Pull an image</Button>
          )
        }
      />
    )
  else if (shown.length === 0) body = <NoMatch onReset={reset} />
  else if (phone)
    body = f.group ? (
      groups.map((g) => (
        <section key={g.repo || "-"} className="mt-4 first:mt-0">
          <GroupHead group={g} phone />
          <Rows>
            {g.items.map((i) => (
              <ImagePhoneRow key={i.id} image={i} {...rowProps} />
            ))}
          </Rows>
        </section>
      ))
    ) : (
      <Rows>
        {shown.map((i) => (
          <ImagePhoneRow key={i.id} image={i} {...rowProps} />
        ))}
      </Rows>
    )
  else {
    const ids = shown.map((i) => i.id)
    const on = ids.filter((id) => selected.has(id)).length
    const cols = 5 + (can.manage ? 1 : 0) + 1
    const row = (i: DockerImage) => (
      <ImageRow
        key={i.id}
        image={i}
        {...rowProps}
        select={
          can.manage
            ? {
                checked: selected.has(i.id),
                onChange: (v) => select([i.id], v),
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
                checked: on > 0 && on === ids.length,
                indeterminate: on > 0 && on < ids.length,
                onChange: (v) => select(ids, v),
                label: "Select every image shown",
              }
            : undefined
        }
        head={[
          { label: "Image" },
          { label: "Status" },
          { label: "Used by", className: "hidden @2xl:table-cell" },
          { label: "Size", className: "text-end" },
          { label: "Created", className: "hidden @4xl:table-cell" },
        ]}
      >
        {f.group
          ? groups.map((g) => [
              <tr key={`g-${g.repo}`} className="bg-subtle/70">
                <td colSpan={cols} className="px-4 py-2">
                  <GroupHead
                    group={g}
                    onRemoveOlder={
                      can.manage && g.older.length > 0
                        ? () => a.removeImages(server.id, g.older, clear)
                        : undefined
                    }
                  />
                </td>
              </tr>,
              ...g.items.map(row),
            ])
          : shown.map(row)}
      </Table>
    )
  }

  const unscanned = facts.scanned
    ? all.filter((i) => !factsOf(i).scan?.scanned)
    : []

  return (
    <div className="flex flex-col gap-4 max-md:gap-0">
      <PageBar
        phone={phone}
        tabs={tabs}
        aside={aside}
        search={
          <SearchBox
            value={filters.q}
            onChange={(v) => setFilters({ q: v || null })}
            placeholder="Search images"
            label="Search images"
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
              onChange={(v) => setF({ sort: v === "size" ? null : v })}
            />
            <Button
              variant="outline"
              aria-pressed={f.group}
              title="Group by repository"
              className={cn(
                "h-9 shrink-0 gap-1.5",
                phone && "rounded-full px-3.5",
                f.group && "border-brand/40 bg-brand-soft text-brand-strong",
              )}
              onClick={() => setF({ group: f.group ? null : true })}
            >
              <ListTree className="size-4" />
              {phone || f.group ? "By repository" : "Group"}
            </Button>
          </>
        }
        caption={
          facts.checkedAt
            ? `Updates checked ${timeAgo(facts.checkedAt)}`
            : undefined
        }
        refresh={{
          busy: list.isFetching,
          run: () => {
            list.refetch()
            refreshUsage()
          },
        }}
        more={
          can.manage
            ? [
                [
                  {
                    key: "import",
                    label: "Load from a storage…",
                    icon: <HardDriveDownload />,
                    onSelect: () => a.importImage(server.id),
                  },
                  {
                    key: "run",
                    label: "Run a container…",
                    icon: <PlayCircle />,
                    onSelect: () => a.runImage(server.id, ""),
                  },
                ],
                [
                  {
                    key: "schedule",
                    label: "Schedule a cleanup…",
                    icon: <CalendarClock />,
                    onSelect: () =>
                      router.push(
                        newCronjobHref({
                          action: "docker-prune",
                          server: server.id,
                          serverName: server.name,
                        }),
                      ),
                  },
                ],
              ]
            : undefined
        }
        primary={
          can.manage
            ? {
                label: "Pull image",
                icon: <Plus />,
                run: () => a.pull(server.id),
              }
            : undefined
        }
      />
      {all.length > 0 && (
        <Storage
          phone={phone}
          images={all}
          usage={usage.data?.images}
          updates={n.updates}
          risky={n.risky}
          unscanned={can.manage ? unscanned.length : 0}
          dangling={n.dangling}
          older={all.filter(isOlder).length}
          manage={can.manage}
          which={f.which}
          onWhich={(w) => setF({ which: w === "all" ? null : w })}
          onScan={() => a.scanImages(server.id, unscanned)}
          onClean={(images) =>
            a.prune(server.id, {
              images,
              containers: false,
              networks: false,
              build_cache: false,
              volumes: "none",
            })
          }
          onRemoveOlder={() =>
            a.removeImages(server.id, all.filter(isOlder), clear)
          }
        />
      )}
      <div className={cn(phone && "pt-3 pb-24")}>{body}</div>
      {!phone && picked.length > 0 && (
        <BulkBar
          count={picked.length}
          onClear={clear}
          actions={[
            {
              label: "Scan",
              icon: <ShieldCheck />,
              run: () => a.scanImages(server.id, picked),
            },
            ...(picked.some((i) => i.tags[0])
              ? [
                  {
                    label: "Pull again",
                    icon: <Download />,
                    run: () => a.pullAgain(server.id, picked),
                  },
                ]
              : []),
            {
              label: "Remove…",
              icon: <Trash2 />,
              destructive: true,
              run: () => a.removeImages(server.id, picked, clear),
            },
          ]}
        />
      )}
    </div>
  )
}

// --- Disk space strip -------------------------------------------------------

function Storage({
  phone,
  images,
  usage,
  updates,
  risky,
  unscanned,
  dangling,
  older,
  manage,
  which,
  onWhich,
  onScan,
  onClean,
  onRemoveOlder,
}: {
  phone: boolean
  images: DockerImage[]
  usage?: { size: number; reclaimable: number; count: number }
  updates: number
  risky: number
  unscanned: number
  dangling: number
  older: number
  manage: boolean
  which: Which
  onWhich: (w: Which) => void
  onScan: () => void
  onClean: (images: "dangling" | "all") => void
  onRemoveOlder: () => void
}) {
  // Docker's own numbers count shared layers once; the list's sizes don't.
  const total = usage?.size ?? images.reduce((s, i) => s + i.size, 0)
  const free =
    usage?.reclaimable ??
    images.filter((i) => i.containers === 0).reduce((s, i) => s + i.size, 0)
  const used = Math.max(0, total - free)

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
      "updates",
      updates > 0,
      <CircleArrowUp className="text-brand" />,
      `${updates} update${updates === 1 ? "" : "s"} available`,
      () => onWhich(which === "updates" ? "all" : "updates"),
      which === "updates",
    ),
    insight(
      "risky",
      risky > 0,
      <ShieldAlert className="text-destructive" />,
      `${risky} with critical or high`,
      () => onWhich(which === "risky" ? "all" : "risky"),
      which === "risky",
    ),
    insight(
      "scan",
      manage && unscanned > 0,
      <ShieldCheck />,
      `Scan ${unscanned} not scanned`,
      onScan,
    ),
    insight(
      "older",
      manage && older > 0,
      <Layers />,
      `Remove ${older} older version${older === 1 ? "" : "s"}`,
      onRemoveOlder,
    ),
    insight(
      "dangling",
      manage && dangling > 0,
      <Trash2 />,
      `Remove ${dangling} dangling`,
      () => onClean("dangling"),
    ),
    insight("clean", manage && free > 0, <Sparkles />, "Clean up…", () =>
      onClean("all"),
    ),
  ].filter(Boolean)

  const legend = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-brand" />
        {formatSize(used)} used by containers
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-mist" />
        {formatSize(free)} could be freed
      </span>
    </div>
  )
  const meter = (
    <>
      <div className="flex items-baseline gap-2">
        <span className="text-subheading font-light tabular-nums">
          {formatSize(total)}
        </span>
        <span className="text-body-sm text-muted-foreground">
          on disk · {images.length} image{images.length === 1 ? "" : "s"}
        </span>
      </div>
      <StackBar
        label="Image space"
        parts={[
          { value: used, className: "bg-brand", label: "used by containers" },
          { value: free, className: "bg-mist", label: "could be freed" },
        ]}
      />
      {legend}
    </>
  )

  if (phone) {
    return (
      <section className="mt-3 flex flex-col gap-2 border-t border-border px-4 py-3">
        {meter}
        {actions.length > 0 && (
          <div className="-mx-4 mt-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
            {actions}
          </div>
        )}
      </section>
    )
  }
  return (
    <section className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-border px-5 py-4">
      <div className="flex min-w-64 flex-1 flex-col gap-2 lg:max-w-xl">
        {meter}
      </div>
      {actions.length > 0 && (
        <div className="ms-auto flex flex-wrap justify-end gap-2">
          {actions}
        </div>
      )}
    </section>
  )
}

// --- Rows ------------------------------------------------------------------

type RowProps = {
  image: DockerImage
  server: string
  can: DockerCan
  largest: number
  factsOf: (i: DockerImage) => ImageFacts
  isOlder: (i: DockerImage) => boolean
}

function NameLine({ image: i, older }: { image: DockerImage; older: boolean }) {
  if (!i.tags[0]) {
    return (
      <span className="flex min-w-0 items-center">
        <span className="truncate font-medium text-muted-foreground">
          &lt;none&gt;
        </span>
        <Tag tone="warning">Dangling</Tag>
      </span>
    )
  }
  const [repo, tag] = splitRef(i.tags[0])
  return (
    <span className="flex min-w-0 items-center">
      <span className="truncate">
        <span className="font-medium">{repo}</span>
        <span className="text-muted-foreground">:{tag}</span>
      </span>
      {older && <Tag>Older</Tag>}
    </span>
  )
}

function StatusCell({ facts }: { facts: ImageFacts }) {
  const { update, scan } = facts
  return (
    <span className="flex flex-col gap-0.5 text-caption">
      {update?.state === "available" && (
        <span className="inline-flex items-center gap-1 font-medium text-brand">
          <CircleArrowUp className="size-3.5" />
          Update available
        </span>
      )}
      {scan?.scanned && scan.counts ? (
        <span className="inline-flex items-center gap-1">
          {risky(scan) ? (
            <ShieldAlert className="size-3.5 text-destructive" />
          ) : (
            <ShieldCheck className="size-3.5 text-ash" />
          )}
          <VulnSummary counts={scan.counts} />
        </span>
      ) : scan?.error ? (
        <span className="text-destructive">Scan failed</span>
      ) : (
        update?.state !== "available" && (
          <span className="text-ash">Not scanned</span>
        )
      )}
    </span>
  )
}

function UsedByCell({
  server,
  image,
  facts,
}: {
  server: string
  image: DockerImage
  facts: ImageFacts
}) {
  if (image.containers === 0) return <span className="text-ash">Unused</span>
  const users = facts.users
  if (users.length === 0) {
    return `${image.containers} container${image.containers === 1 ? "" : "s"}`
  }
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {users.slice(0, 2).map((c) => (
        <Link
          key={c.id}
          href={containerHref(server, c.name)}
          className="flex min-w-0 items-center gap-1.5 hover:underline"
        >
          <Dot tone={stateOf(c).tone} />
          <span className="truncate">{c.name}</span>
        </Link>
      ))}
      {users.length > 2 && (
        <span className="text-caption text-ash">
          and {users.length - 2} more
        </span>
      )}
    </span>
  )
}

function SizeCell({ size, largest }: { size: number; largest: number }) {
  return (
    <span className="ms-auto flex w-20 flex-col items-end gap-1">
      <span className="tabular-nums">{formatSize(size)}</span>
      <span aria-hidden className="h-1 w-full rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-brand/60"
          style={{ width: `${Math.max(3, (size / largest) * 100)}%` }}
        />
      </span>
    </span>
  )
}

function ImageRow({
  image: i,
  server,
  can,
  largest,
  factsOf,
  isOlder,
  select,
}: RowProps & {
  select?: { checked: boolean; onChange: (on: boolean) => void }
}) {
  const a = useDockerActions()
  const menu = useImageMenu(server, i, can)
  const facts = factsOf(i)
  return (
    <Tr
      label={imageLabel(i)}
      menu={menu}
      select={select}
      onOpen={() => a.image(server, i, can)}
      cells={[
        {
          node: (
            <span className="flex min-w-0 items-center gap-3">
              <ImageLogo repo={repoOf(i)} className="size-8" />
              <span className="flex min-w-0 flex-col">
                <NameLine image={i} older={isOlder(i)} />
                <span className="truncate text-caption text-ash">
                  <span className="font-mono">{shortId(i.id)}</span>
                  {i.tags.length > 1 &&
                    ` · also ${i.tags.slice(1).map(imageName).join(", ")}`}
                </span>
              </span>
            </span>
          ),
          className: "max-w-96",
        },
        { node: <StatusCell facts={facts} /> },
        {
          node: <UsedByCell server={server} image={i} facts={facts} />,
          className: "hidden max-w-56 @2xl:table-cell",
        },
        {
          node: <SizeCell size={i.size} largest={largest} />,
          className: "text-end",
        },
        {
          node: (
            <span className="text-muted-foreground">{timeAgo(i.created)}</span>
          ),
          className: "hidden whitespace-nowrap @4xl:table-cell",
        },
      ]}
    />
  )
}

function ImagePhoneRow({ image: i, server, can, factsOf, isOlder }: RowProps) {
  const a = useDockerActions()
  const menu = useImageMenu(server, i, can)
  const facts = factsOf(i)
  const update = facts.update?.state === "available"
  const danger = risky(facts.scan)
  const sub = [
    formatSize(i.size),
    i.dangling
      ? "dangling"
      : i.containers > 0
        ? `${i.containers} using it`
        : isOlder(i)
          ? "older, unused"
          : "unused",
    timeAgo(i.created),
  ].join(" · ")
  return (
    <PhoneRow
      id={i.id}
      title={imageLabel(i)}
      sub={sub}
      menu={menu}
      lead={<ImageLogo repo={repoOf(i)} />}
      aside={
        (update || danger) && (
          <span className="flex items-center gap-1.5">
            {update && (
              <CircleArrowUp
                aria-label="Update available"
                className="size-4 text-brand"
              />
            )}
            {danger && (
              <ShieldAlert
                aria-label="Critical or high vulnerabilities"
                className="size-4 text-destructive"
              />
            )}
          </span>
        )
      }
      onOpen={() => a.image(server, i, can)}
    />
  )
}

function GroupHead({
  group: g,
  phone,
  onRemoveOlder,
}: {
  group: Group
  phone?: boolean
  onRemoveOlder?: () => void
}) {
  const registry = registryOf(g.repo)
  return (
    <div
      className={cn("flex items-center gap-3", phone && "bg-subtle px-4 py-2")}
    >
      {g.repo && !phone && <ImageLogo repo={g.repo} className="size-6" />}
      <span className="min-w-0 truncate text-body-sm font-medium">
        {g.repo
          ? registry
            ? g.repo.slice(registry.length + 1)
            : g.repo
          : "Untagged"}
      </span>
      {registry && (
        <span className="hidden truncate text-caption text-ash sm:inline">
          {registry}
        </span>
      )}
      <span className="shrink-0 text-caption text-muted-foreground">
        {g.items.length} · {formatSize(g.size)}
      </span>
      {onRemoveOlder && (
        <Button
          variant="ghost"
          size="sm"
          className="ms-auto h-7 text-muted-foreground"
          onClick={onRemoveOlder}
        >
          <Trash2 />
          Remove {g.older.length} older
        </Button>
      )}
    </div>
  )
}

function ImagesSkeleton({ phone }: { phone: boolean }) {
  if (phone) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border p-4">
      {Array.from({ length: 6 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
        <div key={i} className="flex items-center gap-3 py-1.5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="ms-auto h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
