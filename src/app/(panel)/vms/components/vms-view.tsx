"use client"

import {
  Cpu,
  Database,
  ExternalLink,
  HardDrive,
  Layers,
  Monitor,
  Plus,
  Server,
  Star,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  Empty,
  type Item,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { formatDuration, formatSize } from "@/lib/format"
import type {
  PVECluster,
  PVEGuest,
  PVENode,
  PVEProblem,
  PVEStorage,
} from "@/lib/services"
import { cn } from "@/lib/utils"

import {
  ChoiceChip,
  NoMatch,
  PageBar,
  PhoneRow,
  Rows,
  Table,
  Tag,
  Tr,
} from "../../containers/components/kit"
import { useClusters, useGuests, useInfrastructure } from "../api"
import { NodeLayer, StorageLayer } from "./infra-layers"
import {
  clusterStatusMeta,
  clusterSummary,
  contentLabels,
  GuestTile,
  guestName,
  guestProblem,
  guestState,
  guestStateMeta,
  kindLabel,
  lockLabel,
  matchGuest,
  newVmHref,
  nodeStatusMeta,
  type pageTabs,
  StatusDot,
  storageActive,
  useVmsFilters,
  vmHref,
} from "./meta"
import { ClusterProblems, CpuUsage, Usage } from "./parts"
import { useCanAddCluster, useCanCreateVm, useVmCan } from "./permissions"
import {
  proxmoxUrl,
  useClusterMenu,
  useGuestMenu,
  useVmActions,
} from "./vm-actions"

type PageTab = (typeof pageTabs)[number]

const showOptions = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "stopped", label: "Stopped" },
  { value: "templates", label: "Templates" },
  { value: "problems", label: "Needs a look" },
] as const

const kindOptions = [
  { value: "all", label: "All" },
  { value: "qemu", label: "VMs" },
  { value: "lxc", label: "Containers" },
] as const

const tabLabels: Record<PageTab, string> = {
  machines: "Machines",
  nodes: "Nodes",
  storage: "Storage",
  clusters: "Clusters",
}

// A shared storage shows once per cluster, not once per node.
function dedupeStorages(list: PVEStorage[]) {
  const seen = new Map<string, PVEStorage>()
  for (const s of list) {
    const key = s.shared
      ? `${s.cluster_id}/${s.storage}`
      : `${s.cluster_id}/${s.node}/${s.storage}`
    const had = seen.get(key)
    // Prefer an online node's view of a shared storage.
    if (!had || (!storageActive(had) && storageActive(s))) seen.set(key, s)
  }
  return [...seen.values()]
}

function useData() {
  const [f, setFilters] = useVmsFilters()
  const clusters = useClusters()
  const guests = useGuests()
  const infra = useInfrastructure()
  const all = clusters.data?.items ?? []
  const many = all.length > 1
  const needle = f.q.trim().toLowerCase()
  const inCluster = (id: string) => !f.cluster || f.cluster === id

  const machines = (guests.data?.items ?? [])
    .filter(
      (g) =>
        inCluster(g.cluster_id) &&
        (!f.node || g.node === f.node) &&
        (f.kind === "all" || g.kind === f.kind) &&
        matchGuest(g, f.q),
    )
    .filter((g) => {
      const st = guestState(g)
      switch (f.show) {
        case "running":
          return st === "running"
        case "stopped":
          return st === "stopped"
        case "templates":
          return st === "template"
        case "problems":
          return !!guestProblem(g) || !!g.lock
        default:
          return true
      }
    })
    .toSorted(
      (a, b) =>
        Number(!!guestProblem(b)) - Number(!!guestProblem(a)) ||
        a.cluster_name.localeCompare(b.cluster_name) ||
        a.vmid - b.vmid,
    )

  const nodes = (infra.data?.nodes ?? [])
    .filter(
      (n) =>
        inCluster(n.cluster_id) &&
        (!needle ||
          `${n.node} ${n.cluster_name}`.toLowerCase().includes(needle)),
    )
    .toSorted(
      (a, b) =>
        a.cluster_name.localeCompare(b.cluster_name) ||
        a.node.localeCompare(b.node, undefined, { numeric: true }),
    )

  const storages = dedupeStorages(infra.data?.storages ?? [])
    .filter(
      (s) =>
        inCluster(s.cluster_id) &&
        (!f.node || s.shared || s.node === f.node) &&
        (!needle ||
          `${s.storage} ${s.type} ${s.node} ${s.cluster_name}`
            .toLowerCase()
            .includes(needle)),
    )
    .toSorted(
      (a, b) =>
        a.cluster_name.localeCompare(b.cluster_name) ||
        Number(b.shared) - Number(a.shared) ||
        a.storage.localeCompare(b.storage) ||
        a.node.localeCompare(b.node),
    )

  const shownClusters = all
    .filter(
      (c) =>
        !needle ||
        `${c.name} ${c.cluster_name} ${c.url} ${c.description}`
          .toLowerCase()
          .includes(needle),
    )
    .toSorted(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name),
    )

  const problems = new Map<string, PVEProblem>()
  for (const p of [
    ...(guests.data?.problems ?? []),
    ...(infra.data?.problems ?? []),
  ])
    problems.set(p.cluster_id, p)

  const counts: Record<PageTab, number> = {
    machines: guests.data?.items.length ?? 0,
    nodes: infra.data?.nodes.length ?? 0,
    storage: dedupeStorages(infra.data?.storages ?? []).length,
    clusters: all.length,
  }
  const filtered =
    !!f.q ||
    !!f.cluster ||
    !!f.node ||
    (f.tab === "machines" && (f.show !== "all" || f.kind !== "all"))

  return {
    f,
    setFilters,
    clusters,
    guests,
    infra,
    all,
    many,
    machines,
    nodes,
    storages,
    shownClusters,
    problems: [...problems.values()],
    counts,
    filtered,
    fetching: clusters.isFetching || guests.isFetching || infra.isFetching,
    refresh: () => {
      clusters.refetch()
      guests.refetch()
      infra.refetch()
    },
    reset: () =>
      setFilters({
        q: null,
        show: null,
        kind: null,
        cluster: null,
        node: null,
      }),
  }
}

type Data = ReturnType<typeof useData>

export function VmsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <Vms phone={phone} />
}

function Vms({ phone }: { phone: boolean }) {
  const d = useData()
  const router = useRouter()
  const actions = useVmActions()
  const canAdd = useCanAddCluster()
  const canCreate = useCanCreateVm()

  // The node or storage whose details are open; kept while it animates out.
  const [nodeOpen, setNodeOpen] = useOpen("vms-node")
  const [node, setNode] = useState<{ cluster: string; node: string }>()
  const [storageOpen, setStorageOpen] = useOpen("vms-storage")
  const [storage, setStorage] = useState<PVEStorage | null>(null)
  const openNode = (n: Pick<PVENode, "cluster_id" | "node">) => {
    setNode({ cluster: n.cluster_id, node: n.node })
    setNodeOpen(true)
  }
  const openStorage = (s: PVEStorage) => {
    setStorage(s)
    setStorageOpen(true)
  }

  const primary = canCreate
    ? {
        label: "New machine",
        icon: <Plus />,
        run: () =>
          router.push(newVmHref({ cluster: d.f.cluster || undefined })),
      }
    : canAdd
      ? { label: "Connect cluster", icon: <Plus />, run: actions.addCluster }
      : undefined
  const more: Item[][] =
    canCreate && canAdd
      ? [
          [
            {
              key: "connect",
              label: "Connect a cluster",
              icon: <Server />,
              onSelect: actions.addCluster,
            },
          ],
        ]
      : []

  const tab = d.f.tab
  const tabs = phone ? (
    <nav aria-label="Show" className="flex gap-2">
      {(Object.keys(tabLabels) as PageTab[]).map((t) => (
        <button
          key={t}
          type="button"
          aria-current={tab === t ? "page" : undefined}
          onClick={() => d.setFilters({ tab: t })}
          className={chipClass}
        >
          {tabLabels[t]}
          <span className="tabular-nums opacity-70">{d.counts[t]}</span>
        </button>
      ))}
    </nav>
  ) : (
    <Segmented
      label="Show"
      value={tab}
      onChange={(t) => d.setFilters({ tab: t })}
      items={(Object.keys(tabLabels) as PageTab[]).map((t) => ({
        value: t,
        label: (
          <>
            {tabLabels[t]}
            <span className="ms-1.5 text-ash tabular-nums">{d.counts[t]}</span>
          </>
        ),
      }))}
    />
  )

  const clusterChip = d.many && tab !== "clusters" && (
    <ChoiceChip
      phone={phone}
      label="Cluster"
      value={d.f.cluster}
      onChange={(cluster) => d.setFilters({ cluster: cluster || null })}
      options={[
        { value: "", label: "All" },
        ...d.all.map((c) => ({ value: c.id, label: c.name })),
      ]}
    />
  )
  const filters = (
    <>
      {tab === "machines" && (
        <>
          <ChoiceChip
            phone={phone}
            label="Show"
            value={d.f.show}
            onChange={(show) => d.setFilters({ show })}
            options={showOptions}
          />
          <ChoiceChip
            phone={phone}
            label="Kind"
            value={d.f.kind}
            onChange={(kind) => d.setFilters({ kind })}
            options={kindOptions}
          />
        </>
      )}
      {clusterChip}
      {d.f.node && (tab === "machines" || tab === "storage") && (
        <Button
          variant="outline"
          className={cn(
            "shrink-0 gap-1.5",
            phone ? "h-9 rounded-full px-3.5" : "h-9",
          )}
          aria-label={`On node ${d.f.node}: show every node`}
          onClick={() => d.setFilters({ node: null })}
        >
          <span className="text-muted-foreground">Node</span>
          <span className="font-medium">{d.f.node}</span>
          <span aria-hidden className="text-ash">
            ×
          </span>
        </Button>
      )}
    </>
  )

  const search = (
    <SearchBox
      value={d.f.q}
      onChange={(q) => d.setFilters({ q: q || null })}
      placeholder={
        tab === "machines"
          ? "Search name, ID, address, tag"
          : `Search ${tabLabels[tab].toLowerCase()}`
      }
      label={`Search ${tabLabels[tab].toLowerCase()}`}
      className={phone ? "w-full min-w-0 flex-1" : "w-72"}
    />
  )

  const running = (d.guests.data?.items ?? []).filter(
    (g) => guestState(g) === "running",
  ).length
  const caption = d.guests.data && `${running} of ${d.counts.machines} running`

  let body: React.ReactNode
  if (d.clusters.isPending) body = <ListSkeleton phone={phone} />
  else if (d.all.length === 0)
    body = (
      <Empty
        icon={Layers}
        title="No Proxmox cluster yet"
        body={
          canAdd
            ? "Connect a Proxmox VE cluster (or a single node) with an API token. Its machines, nodes and storage show up here."
            : "Someone with Owner access to this workspace can connect a Proxmox VE cluster."
        }
        className="max-md:mt-6"
        action={
          canAdd && (
            <Button onClick={actions.addCluster}>
              <Plus />
              Connect a cluster
            </Button>
          )
        }
      />
    )
  else if (tab === "machines")
    body = <Machines d={d} phone={phone} onNode={(g) => openNode(g)} />
  else if (tab === "nodes")
    body = <Nodes d={d} phone={phone} onOpen={openNode} />
  else if (tab === "storage")
    body = <Storages d={d} phone={phone} onOpen={openStorage} />
  else body = <Clusters d={d} phone={phone} />

  const bar = d.all.length > 0 && (
    <PageBar
      phone={phone}
      tabs={tabs}
      search={search}
      filters={filters}
      caption={caption}
      refresh={{ busy: d.fetching, run: d.refresh }}
      primary={primary}
      more={more}
    />
  )

  const layers = (
    <>
      <NodeLayer
        open={nodeOpen}
        onOpenChange={setNodeOpen}
        cluster={node?.cluster ?? ""}
        node={node?.node ?? ""}
        onStorage={(s) => {
          setNodeOpen(false)
          // The node layer's history entry goes first, then the storage's.
          window.setTimeout(() => openStorage(s), 0)
        }}
      />
      <StorageLayer
        open={storageOpen}
        onOpenChange={setStorageOpen}
        storage={storage}
      />
    </>
  )

  if (phone) {
    return (
      <>
        <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
          <h1 className="truncate text-heading font-light">Virtual machines</h1>
          <HelpButton
            href={guideHref("virtual-machines")}
            label="Virtual machines guide"
            className="ms-auto"
          />
        </header>
        {bar}
        <ClusterProblems problems={d.problems} />
        <div className="pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {body}
        </div>
        {layers}
      </>
    )
  }
  return (
    <div className="flex flex-col gap-4 px-6 pt-5 pb-24">
      {bar}
      <ClusterProblems problems={d.problems} />
      {body}
      {layers}
    </div>
  )
}

const chipClass =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none active:bg-muted aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:font-medium aria-[current=page]:text-background"

function ListSkeleton({ phone }: { phone: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col",
        phone ? "divide-y divide-border px-4" : "gap-2",
      )}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
          key={i}
          className={phone ? "my-3 h-10" : "h-12 rounded-lg"}
        />
      ))}
    </div>
  )
}

function Loading({
  phone,
  error,
  retry,
}: {
  phone: boolean
  error?: Error | null
  retry: () => void
}) {
  if (!error) return <ListSkeleton phone={phone} />
  return (
    <Empty
      icon={Server}
      title="Couldn't load this list"
      body={error.message}
      action={
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      }
    />
  )
}

// ---- machines

function GuestTags({ g }: { g: PVEGuest }) {
  const problem = guestProblem(g)
  return (
    <>
      {g.lock && <Tag tone="warning">{lockLabel(g.lock)}</Tag>}
      {problem && <Tag tone="warning">{problem}</Tag>}
      {g.ha_state && !problem && <Tag>HA</Tag>}
      {g.tags.slice(0, 2).map((t) => (
        <Tag key={t}>{t}</Tag>
      ))}
    </>
  )
}

function Machines({
  d,
  phone,
  onNode,
}: {
  d: Data
  phone: boolean
  onNode: (g: PVEGuest) => void
}) {
  const router = useRouter()
  const menu = useGuestMenu()
  if (!d.guests.data)
    return (
      <Loading
        phone={phone}
        error={d.guests.error}
        retry={() => d.guests.refetch()}
      />
    )
  if (d.machines.length === 0) {
    if (d.filtered) return <NoMatch onReset={d.reset} />
    return (
      <Empty
        icon={Monitor}
        title="No machines yet"
        body="Create a VM or a container from a template, or in Proxmox itself; it shows up here within seconds."
        className="max-md:mt-6"
      />
    )
  }
  const open = (g: PVEGuest) => router.push(vmHref(g.cluster_id, g.vmid))

  if (phone) {
    return (
      <Rows>
        {d.machines.map((g) => {
          const st = guestStateMeta[guestState(g)]
          return (
            <PhoneRow
              key={`${g.cluster_id}/${g.vmid}`}
              id={`vm-${g.cluster_id}-${g.vmid}`}
              lead={<GuestTile guest={g} className="size-10" />}
              title={guestName(g)}
              sub={
                <span className="flex items-center gap-1.5">
                  <StatusDot tone={st.dot} />
                  {[
                    g.lock ? lockLabel(g.lock) : st.label,
                    g.vmid,
                    g.node,
                    g.ips[0],
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              }
              onOpen={() => open(g)}
              menu={menu(g)}
            />
          )
        })}
      </Rows>
    )
  }

  return (
    <Table
      head={[
        { label: "Name" },
        { label: "State" },
        { label: "Node", className: "hidden @3xl:table-cell" },
        { label: "CPU", className: "hidden @4xl:table-cell" },
        { label: "Memory", className: "hidden @4xl:table-cell" },
        { label: "Address", className: "hidden @5xl:table-cell" },
        { label: "Server", className: "hidden @6xl:table-cell" },
      ]}
    >
      {d.machines.map((g) => {
        const st = guestState(g)
        const meta = guestStateMeta[st]
        const on = st === "running"
        return (
          <Tr
            key={`${g.cluster_id}/${g.vmid}`}
            label={guestName(g)}
            onOpen={() => open(g)}
            menu={menu(g, { open: false })}
            cells={[
              {
                node: (
                  <span className="flex items-center gap-3">
                    <GuestTile guest={g} className="size-8" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {guestName(g)}
                        <GuestTags g={g} />
                      </span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {kindLabel(g.kind)} {g.vmid}
                        {d.many && ` · ${g.cluster_name}`}
                      </span>
                    </span>
                  </span>
                ),
              },
              {
                node: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <StatusDot tone={meta.dot} />
                    {meta.label}
                    {on && g.uptime > 0 && (
                      <span className="text-caption text-ash">
                        {formatDuration(g.uptime)}
                      </span>
                    )}
                  </span>
                ),
              },
              {
                className: "hidden @3xl:table-cell",
                node: (
                  <button
                    type="button"
                    onClick={() => onNode(g)}
                    className="whitespace-nowrap hover:underline"
                  >
                    {g.node}
                  </button>
                ),
              },
              {
                className: "hidden @4xl:table-cell",
                node: on ? (
                  <CpuUsage cpu={g.cpu} cores={g.cpus} />
                ) : (
                  <span className="text-ash">
                    {g.cpus} {g.cpus === 1 ? "core" : "cores"}
                  </span>
                ),
              },
              {
                className: "hidden @4xl:table-cell",
                node: on ? (
                  <Usage used={g.mem} total={g.maxmem} label="Memory" />
                ) : (
                  <span className="text-ash">{formatSize(g.maxmem)}</span>
                ),
              },
              {
                className: "hidden @5xl:table-cell font-mono text-caption",
                node: g.ips[0] ?? <span className="text-ash">—</span>,
              },
              {
                className: "hidden @6xl:table-cell",
                node: g.link ? (
                  <Link
                    href={`/servers/${g.link.server_id}`}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap hover:underline"
                  >
                    <Server className="size-3.5 text-ash" />
                    {g.link.server_name}
                  </Link>
                ) : (
                  <span className="text-ash">—</span>
                ),
              },
            ]}
          />
        )
      })}
    </Table>
  )
}

// ---- nodes

function Nodes({
  d,
  phone,
  onOpen,
}: {
  d: Data
  phone: boolean
  onOpen: (n: PVENode) => void
}) {
  const router = useRouter()
  const can = useVmCan()
  if (!d.infra.data)
    return (
      <Loading
        phone={phone}
        error={d.infra.error}
        retry={() => d.infra.refetch()}
      />
    )
  if (d.nodes.length === 0) {
    if (d.filtered) return <NoMatch onReset={d.reset} />
    return (
      <Empty
        icon={Cpu}
        title="No nodes answered"
        body="Check the clusters' connection on the Clusters tab."
      />
    )
  }
  const menu = (n: PVENode): Item[][] => {
    const url = d.all.find((c) => c.id === n.cluster_id)?.url
    return [
      [
        {
          key: "open",
          label: "Details",
          icon: <Cpu />,
          onSelect: () => onOpen(n),
        },
        {
          key: "machines",
          label: "Show its machines",
          icon: <Monitor />,
          onSelect: () =>
            d.setFilters({
              tab: "machines",
              cluster: d.many ? n.cluster_id : null,
              node: n.node,
            }),
        },
        {
          key: "storage",
          label: "Show its storage",
          icon: <HardDrive />,
          onSelect: () =>
            d.setFilters({
              tab: "storage",
              cluster: d.many ? n.cluster_id : null,
              node: n.node,
            }),
        },
      ],
      can(n.cluster_id, "engineer") && n.status === "online"
        ? [
            {
              key: "new",
              label: "New machine here",
              icon: <Plus />,
              onSelect: () =>
                router.push(newVmHref({ cluster: n.cluster_id, node: n.node })),
            },
          ]
        : [],
      url
        ? [
            {
              key: "proxmox",
              label: "Open in Proxmox",
              icon: <ExternalLink />,
              onSelect: () =>
                window.open(
                  `${url.replace(/\/+$/, "")}/#v1:0:=node%2F${n.node}`,
                  "_blank",
                  "noopener",
                ),
            },
          ]
        : [],
    ]
  }

  if (phone) {
    return (
      <Rows>
        {d.nodes.map((n) => {
          const st = nodeStatusMeta[n.status]
          return (
            <PhoneRow
              key={`${n.cluster_id}/${n.node}`}
              id={`node-${n.cluster_id}-${n.node}`}
              lead={<NodeTile online={n.status === "online"} />}
              title={n.node}
              sub={
                <span className="flex items-center gap-1.5">
                  <StatusDot tone={st.dot} />
                  {n.status === "online"
                    ? `CPU ${Math.round(n.cpu * 100)}% · ${n.running} of ${n.guests} running`
                    : st.label}
                </span>
              }
              onOpen={() => onOpen(n)}
              menu={menu(n)}
            />
          )
        })}
      </Rows>
    )
  }

  return (
    <Table
      head={[
        { label: "Node" },
        { label: "CPU" },
        { label: "Memory" },
        { label: "Disk", className: "hidden @4xl:table-cell" },
        { label: "Machines", className: "hidden @3xl:table-cell" },
        { label: "Up for", className: "hidden @5xl:table-cell" },
      ]}
    >
      {d.nodes.map((n) => {
        const st = nodeStatusMeta[n.status]
        const on = n.status === "online"
        return (
          <Tr
            key={`${n.cluster_id}/${n.node}`}
            label={n.node}
            onOpen={() => onOpen(n)}
            menu={menu(n)}
            cells={[
              {
                node: (
                  <span className="flex items-center gap-3">
                    <NodeTile online={on} className="size-8" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {n.node}
                      </span>
                      <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                        <StatusDot tone={st.dot} />
                        {st.label}
                        {d.many && ` · ${n.cluster_name}`}
                      </span>
                    </span>
                  </span>
                ),
              },
              {
                node: on ? (
                  <CpuUsage cpu={n.cpu} cores={n.max_cpu} />
                ) : (
                  <span className="text-ash">—</span>
                ),
              },
              {
                node: on ? (
                  <Usage used={n.mem} total={n.max_mem} label="Memory" />
                ) : (
                  <span className="text-ash">—</span>
                ),
              },
              {
                className: "hidden @4xl:table-cell",
                node: on ? (
                  <Usage used={n.disk} total={n.max_disk} label="Disk" />
                ) : (
                  <span className="text-ash">—</span>
                ),
              },
              {
                className: "hidden @3xl:table-cell whitespace-nowrap",
                node: (
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() =>
                      d.setFilters({
                        tab: "machines",
                        cluster: d.many ? n.cluster_id : null,
                        node: n.node,
                      })
                    }
                  >
                    {n.running} of {n.guests} running
                  </button>
                ),
              },
              {
                className: "hidden @5xl:table-cell whitespace-nowrap",
                node: n.uptime ? (
                  formatDuration(n.uptime)
                ) : (
                  <span className="text-ash">—</span>
                ),
              },
            ]}
          />
        )
      })}
    </Table>
  )
}

function NodeTile({
  online,
  className,
}: {
  online: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        online ? "bg-brand-soft text-brand-strong" : "bg-muted text-ash",
        className,
      )}
    >
      <Cpu className="size-1/2" />
    </span>
  )
}

// ---- storage

function Storages({
  d,
  phone,
  onOpen,
}: {
  d: Data
  phone: boolean
  onOpen: (s: PVEStorage) => void
}) {
  if (!d.infra.data)
    return (
      <Loading
        phone={phone}
        error={d.infra.error}
        retry={() => d.infra.refetch()}
      />
    )
  if (d.storages.length === 0) {
    if (d.filtered) return <NoMatch onReset={d.reset} />
    return (
      <Empty
        icon={Database}
        title="No storage answered"
        body="Check the clusters' connection on the Clusters tab."
      />
    )
  }
  const holds = (s: PVEStorage) =>
    s.content.map((c) => contentLabels[c] ?? c).join(", ")
  const where = (s: PVEStorage) => (s.shared ? "Every node" : s.node)
  const menu = (s: PVEStorage): Item[][] => [
    [
      {
        key: "open",
        label: "Browse",
        icon: <Database />,
        onSelect: () => onOpen(s),
      },
    ],
  ]

  if (phone) {
    return (
      <Rows>
        {d.storages.map((s) => (
          <PhoneRow
            key={`${s.cluster_id}/${s.node}/${s.storage}`}
            id={`st-${s.cluster_id}-${s.node}-${s.storage}`}
            lead={<StorageTile active={storageActive(s)} />}
            title={s.storage}
            sub={`${where(s)} · ${s.total ? `${formatSize(s.used)} of ${formatSize(s.total)}` : s.status}`}
            onOpen={() => onOpen(s)}
            menu={menu(s)}
          />
        ))}
      </Rows>
    )
  }

  return (
    <Table
      head={[
        { label: "Storage" },
        { label: "Where" },
        { label: "Holds", className: "hidden @4xl:table-cell" },
        { label: "Used" },
      ]}
    >
      {d.storages.map((s) => (
        <Tr
          key={`${s.cluster_id}/${s.node}/${s.storage}`}
          label={s.storage}
          onOpen={() => onOpen(s)}
          menu={menu(s)}
          cells={[
            {
              node: (
                <span className="flex items-center gap-3">
                  <StorageTile active={storageActive(s)} className="size-8" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {s.storage}
                      {s.shared && <Tag tone="brand">Shared</Tag>}
                      {!storageActive(s) && (
                        <Tag tone="warning">{s.status || "Off"}</Tag>
                      )}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {s.type}
                      {d.many && ` · ${s.cluster_name}`}
                    </span>
                  </span>
                </span>
              ),
            },
            { className: "whitespace-nowrap", node: where(s) },
            {
              className:
                "hidden @4xl:table-cell max-w-72 truncate text-muted-foreground",
              node: holds(s),
            },
            { node: <Usage used={s.used} total={s.total} label="Used" /> },
          ]}
        />
      ))}
    </Table>
  )
}

function StorageTile({
  active,
  className,
}: {
  active: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        active ? "bg-muted text-muted-foreground" : "bg-muted text-ash",
        className,
      )}
    >
      <Database className="size-1/2" />
    </span>
  )
}

// ---- clusters

function Clusters({ d, phone }: { d: Data; phone: boolean }) {
  const menu = useClusterMenu()
  if (d.shownClusters.length === 0) return <NoMatch onReset={d.reset} />
  const open = (c: PVECluster) =>
    d.setFilters({ tab: "machines", cluster: c.id, node: null })

  if (phone) {
    return (
      <Rows>
        {d.shownClusters.map((c) => (
          <PhoneRow
            key={c.id}
            id={`cluster-${c.id}`}
            lead={<ClusterTile c={c} />}
            title={c.name}
            sub={
              <span className="flex items-center gap-1.5">
                <StatusDot tone={clusterStatusMeta[c.status].dot} />
                {clusterSummary(c)}
              </span>
            }
            onOpen={() => open(c)}
            menu={menu(c)}
          />
        ))}
      </Rows>
    )
  }
  return (
    <Table
      head={[
        { label: "Cluster" },
        { label: "State" },
        { label: "Proxmox", className: "hidden @3xl:table-cell" },
        { label: "Address", className: "hidden @4xl:table-cell" },
        { label: "Checked", className: "hidden @5xl:table-cell" },
      ]}
    >
      {d.shownClusters.map((c) => (
        <Tr
          key={c.id}
          label={c.name}
          onOpen={() => open(c)}
          menu={menu(c)}
          cells={[
            {
              node: (
                <span className="flex items-center gap-3">
                  <ClusterTile c={c} className="size-8" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      {c.name}
                      {c.favorite && (
                        <Star
                          aria-label="Favorite"
                          className="size-3.5 fill-current text-ash"
                        />
                      )}
                    </span>
                    {(c.cluster_name || c.description) && (
                      <span className="block truncate text-caption text-muted-foreground">
                        {c.description || c.cluster_name}
                      </span>
                    )}
                  </span>
                </span>
              ),
            },
            {
              node: (
                <span className="flex items-center gap-2">
                  <StatusDot tone={clusterStatusMeta[c.status].dot} />
                  <span className="whitespace-nowrap">{clusterSummary(c)}</span>
                </span>
              ),
            },
            {
              className: "hidden @3xl:table-cell whitespace-nowrap",
              node: c.version || <span className="text-ash">—</span>,
            },
            {
              className:
                "hidden @4xl:table-cell max-w-64 truncate font-mono text-caption",
              node: (
                <a
                  href={proxmoxUrl(c)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {c.url.replace(/^https?:\/\//, "")}
                </a>
              ),
            },
            {
              className:
                "hidden @5xl:table-cell whitespace-nowrap text-muted-foreground",
              node: (
                <>
                  {timeAgo(c.last_checked_at ?? null)}
                  {c.latency_ms ? ` · ${c.latency_ms} ms` : ""}
                </>
              ),
            },
          ]}
        />
      ))}
    </Table>
  )
}

function ClusterTile({ c, className }: { c: PVECluster; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        c.status === "online"
          ? "bg-brand-soft text-brand-strong"
          : "bg-muted text-ash",
        className,
      )}
    >
      <Layers className="size-1/2" />
    </span>
  )
}
