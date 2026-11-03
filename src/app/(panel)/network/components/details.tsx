"use client"

import { ChevronRight, Info, TriangleAlert } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Facts } from "@/app/(panel)/servers/[id]/components/parts"
import {
  address,
  OsTile,
  StatusDot,
  statusMeta,
} from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type {
  NetInterface,
  NetworkMap,
  NetworkServer,
  Reach,
  Subnet,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  findLink,
  findNetwork,
  findServer,
  formatMs,
  interfaceKind,
  networkName,
  pingLabel,
  reachMeta,
  type Selection,
  tcpLabel,
  toneDot,
  toneText,
  viaLabel,
} from "./meta"

type Select = (selection: Selection) => void

// A server, a network or a pair of servers: a side sheet on desktop, a bottom
// sheet on phones. Drive `open` with useOpen.
export function DetailsLayer({
  map,
  selection,
  open,
  onOpenChange,
  onSelect,
  phone,
}: {
  map: NetworkMap
  selection: Selection | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: Select
  phone: boolean
}) {
  const shown = selection && describe(map, selection, onSelect)
  if (!shown) return null

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={shown.title}
        full
        header={
          <div className="px-6 pt-1 pb-3">
            <p className="truncate text-subheading font-medium">
              {shown.title}
            </p>
            <p className="truncate text-body-sm text-muted-foreground">
              {shown.subtitle}
            </p>
          </div>
        }
      >
        <div className="flex flex-col gap-5 pb-2">{shown.body}</div>
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="truncate pe-6 text-body">
            {shown.title}
          </SheetTitle>
          <SheetDescription className="truncate">
            {shown.subtitle}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
          {shown.body}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function describe(map: NetworkMap, selection: Selection, onSelect: Select) {
  if (selection.kind === "server") {
    const entry = findServer(map, selection.id)
    if (!entry) return null
    return {
      title: entry.server.name,
      subtitle: address(entry.server),
      body: <ServerDetails map={map} entry={entry} onSelect={onSelect} />,
    }
  }
  if (selection.kind === "network") {
    const network = findNetwork(map, selection.id)
    if (!network) return null
    return {
      title: networkName(network),
      subtitle: network.cidr || "Public addresses and default routes",
      body: <NetworkDetails map={map} network={network} onSelect={onSelect} />,
    }
  }
  const from = findServer(map, selection.from)
  const to = findServer(map, selection.to)
  if (!from || !to) return null
  return {
    title: `${from.server.name} ↔ ${to.server.name}`,
    subtitle: "Whether each one can reach the other",
    body: (
      <>
        <Direction
          from={from}
          to={to}
          link={findLink(map, from.server.id, to.server.id)}
        />
        <Direction
          from={to}
          to={from}
          link={findLink(map, to.server.id, from.server.id)}
        />
      </>
    ),
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 px-2 font-label text-caption tracking-label text-ash uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-border">{children}</ul>
}

function Note({ warn, children }: { warn?: boolean; children: ReactNode }) {
  const Icon = warn ? TriangleAlert : Info
  return (
    <p className="mx-2 flex gap-2 text-body-sm text-muted-foreground">
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          warn ? "text-warning" : "text-ash",
        )}
      />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}

function RowButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg p-2 text-start text-body-sm outline-none hover:bg-muted focus-visible:bg-muted active:bg-muted max-md:min-h-14"
    >
      {children}
      <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
    </button>
  )
}

function ServerDetails({
  map,
  entry,
  onSelect,
}: {
  map: NetworkMap
  entry: NetworkServer
  onSelect: Select
}) {
  const s = entry.server
  const interfaces = (entry.host?.interfaces ?? []).filter(
    (i) => i.kind !== "loopback" && i.kind !== "veth",
  )
  const others = map.servers.filter((o) => o.server.id !== s.id)
  return (
    <>
      <div className="flex items-center gap-3 px-2">
        <OsTile os={s.os} className="size-10" />
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-body-sm">
          <StatusDot status={s.status} />
          <span className="truncate">{statusMeta[s.status].label}</span>
          {s.latency_ms != null && s.status === "online" && (
            <span className="text-muted-foreground">{s.latency_ms} ms</span>
          )}
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/servers/${s.id}`} />}
        >
          Open server
        </Button>
      </div>

      {!entry.scanned && (
        <Note warn>
          Couldn't read this server{entry.error ? `: ${entry.error}` : "."} The
          others still tried to reach it.
        </Note>
      )}
      {entry.host?.unsupported && (
        <Note warn>
          This server has no <code className="font-mono">ip</code> tool, so its
          addresses couldn't be read. Install iproute2 to see them.
        </Note>
      )}

      {interfaces.length > 0 && (
        <Section title="Interfaces">
          <Rows>
            {interfaces.map((i) => (
              <InterfaceRow key={i.name} iface={i} />
            ))}
          </Rows>
        </Section>
      )}

      {(entry.host?.routes.length ?? 0) > 0 && (
        <Section title="Default routes">
          <Rows>
            {entry.host?.routes.map((r) => (
              <li
                key={`${r.family}${r.gateway}${r.interface}`}
                className="p-2 font-mono text-caption tracking-normal"
              >
                {r.gateway ? `via ${r.gateway}` : "direct"}
                {r.interface && ` on ${r.interface}`}
              </li>
            ))}
          </Rows>
        </Section>
      )}

      {others.length > 0 && (
        <Section title="Reaches">
          <Rows>
            {others.map(({ server: o }) => (
              <li key={o.id}>
                <RowButton
                  onClick={() =>
                    onSelect({ kind: "link", from: s.id, to: o.id })
                  }
                >
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  <ReachText link={findLink(map, s.id, o.id)} />
                </RowButton>
              </li>
            ))}
          </Rows>
        </Section>
      )}
    </>
  )
}

function InterfaceRow({ iface: i }: { iface: NetInterface }) {
  const kind = [i.label, interfaceKind[i.kind]].filter(Boolean).join(" · ")
  return (
    <li className="p-2">
      <p className="flex items-center gap-2 text-body-sm">
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 rounded-full",
            i.state === "up"
              ? "bg-success"
              : i.state === "down"
                ? "bg-destructive"
                : "bg-mist",
          )}
        />
        <span className="font-mono font-medium">{i.name}</span>
        <span className="min-w-0 truncate text-muted-foreground">{kind}</span>
        <span className="ms-auto shrink-0 text-caption text-ash">
          {i.state === "up" ? "Up" : i.state === "down" ? "Down" : "Unknown"}
        </span>
      </p>
      {i.addresses.map((a) => (
        <p
          key={a.ip}
          className="ms-4 font-mono text-caption tracking-normal break-all text-muted-foreground"
        >
          {a.ip}/{a.prefix}
        </p>
      ))}
      {i.attached > 0 && (
        <p className="ms-4 text-caption text-ash">{i.attached} attached</p>
      )}
    </li>
  )
}

function ReachText({ link }: { link: Reach | undefined }) {
  const status = link?.status ?? "unknown"
  const meta = reachMeta[status]
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-caption tracking-normal">
      <span
        aria-hidden
        className={cn("size-2 rounded-full", toneDot[meta.tone])}
      />
      <span
        className={
          status === "open" ? "text-muted-foreground" : toneText[meta.tone]
        }
      >
        {status === "open" && link?.ping_ms != null
          ? formatMs(link.ping_ms)
          : meta.label}
      </span>
    </span>
  )
}

function NetworkDetails({
  map,
  network: n,
  onSelect,
}: {
  map: NetworkMap
  network: Subnet
  onSelect: Select
}) {
  const routed = map.networks.filter((o) => o.internet)
  const servers = new Set(n.members.map((m) => m.server_id))
  return (
    <>
      {n.kind !== "internet" && (
        <Facts
          items={[
            { label: "Range", value: n.cidr, mono: true },
            { label: "Servers", value: servers.size },
            {
              label: "Gateway",
              value: n.gateways.length ? n.gateways.join("\n") : "None seen",
              mono: n.gateways.length > 0,
            },
            {
              label: "Default route",
              value: n.internet ? "Goes out through here" : "No",
            },
          ]}
        />
      )}
      {n.kind === "lan" && servers.size > 1 && (
        <Note>
          The same range on two servers usually means one network, but two sites
          can use the same private range. Reachability shows whether they really
          connect.
        </Note>
      )}
      {n.members.length > 0 && (
        <Section title={n.kind === "internet" ? "Public addresses" : "Members"}>
          <Rows>
            {n.members.map((m) => (
              <li key={`${m.server_id}${m.interface}${m.ip}`}>
                <RowButton
                  onClick={() => onSelect({ kind: "server", id: m.server_id })}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {findServer(map, m.server_id)?.server.name ?? m.server_id}
                  </span>
                  <span className="shrink-0 font-mono text-caption tracking-normal text-muted-foreground">
                    {m.ip} · {m.interface}
                  </span>
                </RowButton>
              </li>
            ))}
          </Rows>
        </Section>
      )}
      {n.kind === "internet" && routed.length > 0 && (
        <Section title="Networks with a default route">
          <Rows>
            {routed.map((o) => (
              <li key={o.id}>
                <RowButton
                  onClick={() => onSelect({ kind: "network", id: o.id })}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {networkName(o)}
                  </span>
                  <span className="shrink-0 font-mono text-caption tracking-normal text-muted-foreground">
                    {o.cidr}
                  </span>
                </RowButton>
              </li>
            ))}
          </Rows>
        </Section>
      )}
    </>
  )
}

function Direction({
  from,
  to,
  link,
}: {
  from: NetworkServer
  to: NetworkServer
  link: Reach | undefined
}) {
  const status = link?.status ?? "unknown"
  const meta = reachMeta[status]
  return (
    <Section title={`${from.server.name} → ${to.server.name}`}>
      <p className="flex items-center gap-2 px-2 text-body-sm font-medium">
        <span
          aria-hidden
          className={cn("size-2 shrink-0 rounded-full", toneDot[meta.tone])}
        />
        {meta.label}
        {link?.ping_ms != null && (
          <span className="font-normal text-muted-foreground">
            {formatMs(link.ping_ms)}
          </span>
        )}
      </p>
      <p className="mt-0.5 px-2 text-body-sm text-muted-foreground">
        {meta.hint}
      </p>
      {(link?.probes.length ?? 0) > 0 && (
        <ul className="mt-2 divide-y divide-border">
          {link?.probes.map((p) => (
            <li key={`${p.address}:${p.port}`} className="p-2">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-mono text-body-sm break-all">
                  {p.address}:{p.port}
                </span>
                <span className="text-caption text-ash">{viaLabel[p.via]}</span>
              </p>
              <p className="text-body-sm text-muted-foreground">
                {tcpLabel[p.tcp]} · Ping: {pingLabel[p.ping]}
                {p.ping_ms != null && ` (${formatMs(p.ping_ms)})`}
              </p>
              {p.route && (
                <p className="font-mono text-caption tracking-normal break-all text-ash">
                  {p.route}
                </p>
              )}
              {p.message && p.tcp !== "open" && (
                <p className="font-mono text-caption tracking-normal break-all text-ash">
                  {p.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
