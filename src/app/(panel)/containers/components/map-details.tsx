"use client"

import {
  Boxes,
  ChevronRight,
  Globe,
  Network,
  ScrollText,
  Server,
  SquareArrowOutUpRight,
  X,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { formatSize } from "@/lib/format"
import type { DockerReport, DockerReportContainer } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  cid,
  type EndpointData,
  type GroupData,
  isUp,
  type Peer,
  peersOf,
} from "./map-graph"
import { containerHref, Dot, envHref } from "./meta"
import { projectHref } from "./project-actions"
import {
  containerTone,
  PortLink,
  pct,
  portLabel,
  rate,
  useServerAddress,
} from "./project-stats"
import { uptimeText } from "./report"

// What the map shows about the node you picked: a side panel on desktop,
// a bottom sheet on phones (`topology.tsx` places it).

export type Picked =
  | { type: "container"; c: DockerReportContainer }
  | { type: "group"; g: GroupData }
  | { type: "endpoint"; e: EndpointData }

export function pickedTitle(p: Picked) {
  return p.type === "container"
    ? p.c.name
    : p.type === "group"
      ? p.g.title
      : p.e.kind === "host"
        ? "This server"
        : "Outside"
}

export function DetailsHeader({
  picked,
  onClose,
}: {
  picked: Picked
  onClose: () => void
}) {
  const icon =
    picked.type === "container" ? (
      <Dot tone={containerTone(picked.c)} className="size-2.5" />
    ) : picked.type === "group" ? (
      picked.g.by === "project" ? (
        <Boxes className="size-4 text-brand-strong" />
      ) : (
        <Network className="size-4 text-brand-strong" />
      )
    ) : picked.e.kind === "host" ? (
      <Server className="size-4 text-muted-foreground" />
    ) : (
      <Globe className="size-4 text-brand-strong" />
    )
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </span>
      <h3 className="min-w-0 flex-1 truncate text-body font-medium">
        {pickedTitle(picked)}
      </h3>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Close details"
        onClick={onClose}
        className="max-md:hidden"
      >
        <X />
      </Button>
    </div>
  )
}

export function DetailsBody({
  picked,
  report,
  server,
  phone,
  onPick,
}: {
  picked: Picked
  report: DockerReport
  server: string
  phone: boolean
  // Another node, by its map id.
  onPick: (id: string) => void
}) {
  if (picked.type === "container") {
    return (
      <ContainerDetails
        c={picked.c}
        report={report}
        server={server}
        phone={phone}
        onPick={onPick}
      />
    )
  }
  if (picked.type === "group") {
    return (
      <GroupDetails
        g={picked.g}
        report={report}
        server={server}
        phone={phone}
        onPick={onPick}
      />
    )
  }
  return (
    <EndpointDetails
      e={picked.e}
      report={report}
      phone={phone}
      onPick={onPick}
    />
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <h4 className="font-label text-[11px] tracking-label text-ash uppercase">
        {title}
      </h4>
      {children}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg bg-muted/60 px-2.5 py-1.5">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className="truncate text-body-sm font-medium tabular-nums">
        {value}
      </span>
    </div>
  )
}

// Outside isn't on the map: its rows can't be picked.
const mapId = (who: string) =>
  who === "outside" ? null : who === "host" ? "host" : cid(who)

function PeerList({
  list,
  bytes,
  phone,
  onPick,
  empty,
}: {
  list: Peer[]
  bytes: boolean
  phone: boolean
  onPick: (id: string) => void
  empty: string
}) {
  if (!list.length) {
    return <p className="text-caption text-ash">{empty}</p>
  }
  return (
    <ul className="-mx-1 flex flex-col">
      {list.map((p) => {
        const id = mapId(p.id)
        const row = cn(
          "flex w-full min-w-0 items-center gap-2 rounded-lg px-1 text-start text-body-sm outline-none",
          phone ? "min-h-11" : "min-h-8",
        )
        const body = (
          <>
            {!id && <Globe className="size-3.5 shrink-0 text-brand" />}
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            {p.port > 0 && (
              <span className="shrink-0 font-mono text-caption tracking-normal text-muted-foreground">
                :{p.port}
              </span>
            )}
            <span className="shrink-0 text-caption text-ash tabular-nums">
              {bytes ? rate(p.up + p.down) : `${p.connections} conn`}
            </span>
          </>
        )
        return (
          <li key={`${p.id}:${p.port}`}>
            {id ? (
              <button
                type="button"
                onClick={() => onPick(id)}
                className={cn(row, "hover:bg-muted focus-visible:bg-muted")}
              >
                {body}
              </button>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ContainerDetails({
  c,
  report,
  server,
  phone,
  onPick,
}: {
  c: DockerReportContainer
  report: DockerReport
  server: string
  phone: boolean
  onPick: (id: string) => void
}) {
  const up = isUp(c) && c.measured
  const share = report.cpus > 0 ? c.cpu / report.cpus : c.cpu
  const peers = peersOf(report, c.id)
  const address = useServerAddress(server)
  const seen = new Set<string>()
  const published = c.ports.filter((p) => {
    const k = portLabel(p)
    if (p.public <= 0 || seen.has(k)) return false
    seen.add(k)
    return true
  })
  const size = phone ? "lg" : "sm"
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body-sm">{uptimeText(c)}</p>
        <p className="truncate font-mono text-caption tracking-normal text-ash">
          {c.image}
        </p>
        {c.project && (
          <Link
            href={projectHref(server, c.project)}
            className="flex w-fit items-center gap-1 text-caption text-muted-foreground outline-none hover:text-brand focus-visible:text-brand"
          >
            <Boxes className="size-3.5" />
            {c.project}
            {c.service && c.service !== c.name && ` · ${c.service}`}
          </Link>
        )}
      </div>
      {up && (
        <div className="grid grid-cols-2 gap-1.5">
          <Fact label="CPU" value={pct(share)} />
          <Fact
            label="Memory"
            value={
              <>
                {formatSize(c.memory_used)}
                {c.memory_limit > 0 && (
                  <span className="font-normal text-ash">
                    {" "}
                    / {formatSize(c.memory_limit)}
                  </span>
                )}
              </>
            }
          />
          <Fact
            label="Network"
            value={`↓ ${rate(c.net_rx_rate)} ↑ ${rate(c.net_tx_rate)}`}
          />
          <Fact
            label="Processes · restarts"
            value={`${c.pids} · ${c.restarts}`}
          />
        </div>
      )}
      <Section title="Talks to">
        <PeerList
          list={peers.out}
          bytes={report.link_bytes}
          phone={phone}
          onPick={onPick}
          empty="No open connections out."
        />
      </Section>
      <Section title="Reached by">
        <PeerList
          list={peers.into}
          bytes={report.link_bytes}
          phone={phone}
          onPick={onPick}
          empty="Nothing connected in right now."
        />
      </Section>
      {(published.length > 0 || c.listening.length > 0) && (
        <Section title="Ports">
          <p className="flex flex-wrap gap-x-3 font-mono text-caption tracking-normal break-all">
            {published.map((p) => (
              <PortLink key={portLabel(p)} p={p} address={address} />
            ))}
            {published.length === 0 && (
              <span className="text-muted-foreground">
                Listens on {c.listening.map((p) => `:${p}`).join(" ")} (not
                published)
              </span>
            )}
          </p>
        </Section>
      )}
      {c.networks.length > 0 && (
        <Section title="Networks">
          <ul className="flex flex-col gap-1">
            {c.networks.map((n) => (
              <li
                key={n.network}
                className="flex min-w-0 items-center gap-2 text-body-sm"
              >
                <Network className="size-3.5 shrink-0 text-ash" />
                <span className="min-w-0 flex-1 truncate">{n.network}</span>
                <span className="shrink-0 font-mono text-caption tracking-normal text-muted-foreground">
                  {n.ipv4 || n.ipv6}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size={size}
          nativeButton={false}
          render={<Link href={containerHref(server, c.name)} />}
        >
          <SquareArrowOutUpRight />
          Open
        </Button>
        <Button
          size={size}
          variant="outline"
          nativeButton={false}
          render={<Link href={containerHref(server, c.name, "logs")} />}
        >
          <ScrollText />
          Logs
        </Button>
      </div>
    </div>
  )
}

function GroupDetails({
  g,
  report,
  server,
  phone,
  onPick,
}: {
  g: GroupData
  report: DockerReport
  server: string
  phone: boolean
  onPick: (id: string) => void
}) {
  const list = g.ids
    .map((id) => report.containers.find((c) => c.id === id))
    .filter((c) => !!c)
  const cpu = list.reduce((n, c) => n + (isUp(c) ? c.cpu : 0), 0)
  const memory = list.reduce((n, c) => n + (isUp(c) ? c.memory_used : 0), 0)
  const share = report.cpus > 0 ? cpu / report.cpus : cpu
  const href =
    g.by === "project" && g.key !== "\u0000none"
      ? projectHref(server, g.key)
      : g.by === "network"
        ? envHref(server, "/containers/networks")
        : null
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid grid-cols-3 gap-1.5">
        <Fact label="Running" value={`${g.running}/${g.ids.length}`} />
        <Fact label="CPU" value={pct(share)} />
        <Fact label="Memory" value={formatSize(memory)} />
      </div>
      <Section title="Containers">
        <ul className="-mx-1 flex flex-col">
          {list.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(cid(c.id))}
                className={cn(
                  "flex w-full min-w-0 items-center gap-2 rounded-lg px-1 text-start text-body-sm outline-none hover:bg-muted focus-visible:bg-muted",
                  phone ? "min-h-11" : "min-h-8",
                )}
              >
                <Dot tone={containerTone(c)} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {isUp(c) && c.measured && (
                  <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                    {pct(report.cpus > 0 ? c.cpu / report.cpus : c.cpu)}
                  </span>
                )}
                <ChevronRight className="size-3.5 shrink-0 text-ash rtl:rotate-180" />
              </button>
            </li>
          ))}
        </ul>
      </Section>
      {href && (
        <Button
          size={phone ? "lg" : "sm"}
          variant="outline"
          className="w-fit"
          nativeButton={false}
          render={<Link href={href} />}
        >
          {g.by === "project" ? <Boxes /> : <Network />}
          {g.by === "project" ? "Open the project" : "Networks"}
        </Button>
      )}
    </div>
  )
}

function EndpointDetails({
  report,
  phone,
  onPick,
}: {
  e: EndpointData
  report: DockerReport
  phone: boolean
  onPick: (id: string) => void
}) {
  const peers = peersOf(report, "host")
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Section title="Connects in to">
        <PeerList
          list={peers.out}
          bytes={report.link_bytes}
          phone={phone}
          onPick={onPick}
          empty="No open connections in right now."
        />
      </Section>
      <Section title="Reached from">
        <PeerList
          list={peers.into}
          bytes={report.link_bytes}
          phone={phone}
          onPick={onPick}
          empty="No open connections out right now."
        />
      </Section>
    </div>
  )
}
