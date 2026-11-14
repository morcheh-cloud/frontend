"use client"

import {
  ArrowUpRight,
  HeartPulse,
  Link2,
  Monitor,
  Network,
  Pencil,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import { formatDuration, formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"

import { Meter } from "../../../../servers/[id]/components/resources"
import { statusMeta } from "../../../../servers/components/meta"
import { type Timeframe, useGuestRrd } from "../../../api"
import { guestState, kindLabel, vmHref } from "../../../components/meta"
import {
  RrdCharts,
  TimeframePicker,
  timeframes,
} from "../../../components/parts"
import { useVmActions } from "../../../components/vm-actions"
import { disksOf, mib, nicsOf, osLabel, yes } from "./config"
import { useGuestPage } from "./guest-page"
import { Pairs, Panel, TabBar, TabBody, Tag } from "./kit"

const tfValues = timeframes.map((t) => t.value)

export function OverviewTab() {
  const { guest: g, phone } = useGuestPage()
  const [tf, setTf] = useStoredChoice<Timeframe>(
    "morcheh.vms.timeframe",
    tfValues,
  )
  const rrd = useGuestRrd(g.cluster_id, g.vmid, tf)
  const running = guestState(g) === "running"

  return (
    <TabBody>
      <div className="grid min-w-0 gap-4 max-md:gap-0 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div className="flex min-w-0 flex-col gap-4 max-md:gap-0">
          {running && <LiveNow />}
          <section className="flex min-w-0 flex-col gap-3 max-md:gap-0">
            <TabBar className="max-md:border-t-0">
              {phone && (
                <span className="font-label text-caption tracking-label text-ash uppercase">
                  History
                </span>
              )}
              <div className="max-md:ms-auto max-md:max-w-full max-md:overflow-x-auto">
                <TimeframePicker value={tf} onChange={setTf} />
              </div>
              {!phone && (
                <span className="text-caption text-ash">
                  Recorded by Proxmox
                </span>
              )}
            </TabBar>
            <RrdCharts
              points={(rrd.data?.points ?? []) as Record<string, number>[]}
              kind="guest"
              loading={rrd.isLoading}
            />
            {rrd.error && (
              <p className="text-body-sm text-destructive max-md:px-4 max-md:py-3">
                Couldn't read the history: {rrd.error.message}
              </p>
            )}
          </section>
        </div>
        <div className="flex min-w-0 flex-col gap-4 max-md:gap-0">
          <About />
          <Interfaces />
          <LinkedServer />
          <Ha />
          <Notes />
        </div>
      </div>
    </TabBody>
  )
}

function Tile({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-border p-4 max-md:rounded-none max-md:border-0 max-md:px-4 max-md:py-3",
        className,
      )}
    >
      <div className="mb-2 text-caption text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}

// What it uses right now (Proxmox's own numbers, every few seconds).
function LiveNow() {
  const { guest: g } = useGuestPage()
  const cpu = Math.min(100, g.cpu * 100)
  const mem = g.maxmem ? (g.mem / g.maxmem) * 100 : 0
  const disk = g.maxdisk ? (g.disk / g.maxdisk) * 100 : 0
  // A VM's disk use is only known with the guest agent; 0 means "unknown".
  const diskKnown = g.kind === "lxc" && g.maxdisk > 0
  return (
    <div className="grid grid-cols-2 gap-4 max-md:gap-0 max-md:divide-y max-md:divide-border max-md:border-b max-md:border-border lg:grid-cols-4">
      <Tile label="CPU">
        <div className="mb-2 text-subheading font-light tabular-nums">
          {cpu > 0 && cpu < 1 ? "<1" : Math.round(cpu)}%
        </div>
        <Meter value={cpu} label="CPU" />
        <div className="mt-1.5 text-caption text-ash">
          of {g.cpus} {g.cpus === 1 ? "core" : "cores"}
        </div>
      </Tile>
      <Tile label="Memory">
        <div className="mb-2 text-subheading font-light tabular-nums">
          {formatSize(g.mem)}
        </div>
        <Meter value={mem} label="Memory" />
        <div className="mt-1.5 text-caption text-ash">
          of {formatSize(g.maxmem)}
        </div>
      </Tile>
      <Tile label="Disk">
        <div className="mb-2 text-subheading font-light tabular-nums">
          {diskKnown ? formatSize(g.disk) : formatSize(g.maxdisk)}
        </div>
        {diskKnown ? (
          <>
            <Meter value={disk} label="Disk" />
            <div className="mt-1.5 text-caption text-ash">
              of {formatSize(g.maxdisk)}
            </div>
          </>
        ) : (
          <div className="text-caption text-ash">
            Size of the boot disk. Proxmox can't see inside a VM's disks.
          </div>
        )}
      </Tile>
      <Tile label="Network since start">
        <div className="flex flex-col gap-1 text-body-sm tabular-nums">
          <span>
            <span className="text-muted-foreground">In </span>
            {formatSize(g.netin)}
          </span>
          <span>
            <span className="text-muted-foreground">Out </span>
            {formatSize(g.netout)}
          </span>
        </div>
        <div className="mt-1.5 text-caption text-ash">
          Up {formatDuration(g.uptime)}
        </div>
      </Tile>
    </div>
  )
}

function About() {
  const { guest: g } = useGuestPage()
  const c = g.config ?? {}
  const disks = disksOf(c).filter((d) => d.grows)
  const total = disks.reduce((sum, d) => sum + d.bytes, 0)
  const qemu = g.kind === "qemu"
  const cores = Number(c.cores || 1) * Number(c.sockets || 1)
  return (
    <Panel
      title="About"
      aside={
        <Link
          href={vmHref(g.cluster_id, g.vmid, "hardware")}
          className="flex items-center gap-1 text-brand hover:underline max-md:min-h-11"
        >
          Hardware
          <ArrowUpRight className="size-3.5" />
        </Link>
      }
    >
      <Pairs
        items={[
          { label: "Kind", value: `${kindLabel(g.kind)} ${g.vmid}` },
          { label: "Operating system", value: osLabel(c.ostype) },
          {
            label: "Processor",
            value: `${cores} ${cores === 1 ? "core" : "cores"}${qemu && c.cpu ? ` · ${c.cpu.split(",")[0]}` : ""}`,
          },
          { label: "Memory", value: mib(c.memory) },
          {
            label: "Disks",
            value: disks.length
              ? `${disks.length} · ${formatSize(total)} in all`
              : "",
          },
          { label: "Node", value: g.node },
          { label: "Cluster", value: g.cluster_name },
          { label: "Pool", value: g.pool },
          {
            label: "Starts with the node",
            value: g.onboot || yes(c.onboot) ? "Yes" : "No",
          },
          qemu && {
            label: "Guest agent",
            value: g.agent
              ? g.interfaces?.length
                ? "Answering"
                : "Turned on"
              : "Off",
          },
          qemu &&
            !!g.running_qemu && {
              label: "QEMU",
              value: `${g.running_qemu}${g.running_machine ? ` · ${g.running_machine}` : ""}`,
            },
          !qemu && {
            label: "Unprivileged",
            value: yes(c.unprivileged) ? "Yes" : "No",
          },
          {
            label: "Protected",
            value: yes(c.protection) ? "Yes, can't be deleted" : "",
          },
        ]}
      />
    </Panel>
  )
}

// Addresses: the agent's view for a VM, the config for a container.
function Interfaces() {
  const { guest: g } = useGuestPage()
  const nics = nicsOf(g.config ?? {}, g.kind)
  const agent = (g.interfaces ?? []).filter((i) => i.name !== "lo")
  if (nics.length === 0 && agent.length === 0) return null
  return (
    <Panel title="Network">
      <ul className="flex flex-col divide-y divide-border">
        {nics.map((n) => {
          const live = agent.find(
            (i) => i.mac && i.mac.toLowerCase() === n.mac.toLowerCase(),
          )
          const addresses = live?.addresses?.length
            ? live.addresses
            : [n.ip, n.ip6].filter((a) => a && a !== "dhcp" && a !== "auto")
          return (
            <li key={n.key} className="flex items-start gap-3 py-2.5">
              <Network className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-body-sm">
                  <span className="font-medium">
                    {g.kind === "lxc" ? n.name : n.key}
                  </span>
                  <span className="text-muted-foreground">
                    {n.bridge}
                    {n.vlan && ` · VLAN ${n.vlan}`}
                  </span>
                  {n.disconnected && <Tag tone="warning">Unplugged</Tag>}
                </div>
                {addresses.length > 0 ? (
                  <div className="mt-0.5 font-mono text-caption break-all">
                    {addresses.join("  ")}
                  </div>
                ) : (
                  <div className="mt-0.5 text-caption text-ash">
                    {n.ip === "dhcp"
                      ? "Address from DHCP"
                      : g.kind === "qemu" && !g.agent
                        ? "Turn on the guest agent to see its addresses"
                        : "No address known"}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function LinkedServer() {
  const { guest: g, can } = useGuestPage()
  const a = useVmActions()
  if (!g.link) {
    if (!can("engineer") || g.template) return null
    return (
      <Panel title="Server">
        <p className="text-body-sm text-muted-foreground">
          Link it to a server in Morche to open its terminal, files and services
          from here, and see both sides on one page.
        </p>
        <Button
          variant="outline"
          className="mt-3 max-md:w-full"
          onClick={() => a.link(g)}
        >
          <Link2 />
          Link to a server…
        </Button>
      </Panel>
    )
  }
  const status =
    statusMeta[g.link.server_status as keyof typeof statusMeta] ??
    statusMeta.unknown
  return (
    <Panel title="Server">
      <Link
        href={`/servers/${g.link.server_id}`}
        className="-mx-2 flex items-center gap-3 rounded-lg p-2 hover:bg-muted max-md:min-h-14"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Monitor className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium">
            {g.link.server_name}
          </span>
          <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        </span>
        <ArrowUpRight className="size-4 text-ash" />
      </Link>
    </Panel>
  )
}

function Ha() {
  const { guest: g, can } = useGuestPage()
  const a = useVmActions()
  if (!g.ha_managed && !g.ha_state) return null
  return (
    <Panel
      title="High availability"
      aside={
        can("engineer") && (
          <button
            type="button"
            onClick={() => a.ha(g)}
            className="flex items-center gap-1 text-brand hover:underline max-md:min-h-11"
          >
            <Pencil className="size-3.5" />
            Change
          </button>
        )
      }
    >
      <div className="flex items-center gap-3 text-body-sm">
        <HeartPulse className="size-4 text-muted-foreground" />
        <span>
          Wanted state <span className="font-medium">{g.ha_state || "—"}</span>
          {g.ha_group && (
            <span className="text-muted-foreground"> · group {g.ha_group}</span>
          )}
        </span>
      </div>
      <p className="mt-2 text-caption text-ash">
        Proxmox restarts it on another node if its node goes down. Power actions
        go through HA while it's managed.
      </p>
    </Panel>
  )
}

function Notes() {
  const { guest: g } = useGuestPage()
  if (!g.description?.trim()) return null
  return (
    <Panel title="Notes">
      <p className="text-body-sm whitespace-pre-wrap text-muted-foreground">
        {g.description.trim()}
      </p>
    </Panel>
  )
}
