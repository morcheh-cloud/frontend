"use client"

import {
  Cog,
  Container,
  Loader2,
  type LucideIcon,
  RefreshCw,
  Search,
  Server as ServerIcon,
  SquareTerminal,
} from "lucide-react"
import { type ReactNode, useState } from "react"

import { usePorts } from "@/app/(panel)/servers/[id]/ports/api"
import { exposureMeta } from "@/app/(panel)/servers/[id]/ports/components/meta"
import { useServers } from "@/app/(panel)/servers/api"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOpen } from "@/hooks/useOpen"
import type {
  ContainerInfo,
  OpenPort,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useInspection } from "../../../api"
import { inContainer } from "../../../components/meta"

// What a picked port fills in: the address as the proxy's server reaches
// it, the port, and http or https by a guess.
export type Picked = { host: string; port: string; scheme: string }

const wildcard = (a: string) =>
  a === "0.0.0.0" || a === "::" || a === "*" || a === "[::]"
const loopback = (a: string) =>
  a.startsWith("127.") || a === "::1" || a === "localhost"

type Reach = { host: string; port?: number } | { reason: string }

// How a proxy in a container (not on the server's network) reaches what
// listens on its own server: another container on a shared network by its
// name and own port, the rest over the network's gateway (the server's
// address on it); 127.0.0.1 is the container itself.
function reachFromBox(port: OpenPort, box: ContainerInfo): Reach {
  // Names resolve only on user-defined networks, not the default bridge.
  const nets = new Set(
    box.networks.map((n) => n.name).filter((n) => n !== "bridge"),
  )
  const c = port.container
  if (c?.target_port && c.network && nets.has(c.network))
    return { host: c.name, port: c.target_port }
  const at = port.addresses
  if (at.some(wildcard)) {
    const gateway = box.networks.find((n) => n.gateway)?.gateway
    return gateway
      ? { host: gateway }
      : { reason: "The container's network has no gateway address" }
  }
  const other = at.find((a) => !loopback(a))
  if (other) return { host: other }
  return { reason: "Bound to 127.0.0.1: the container can't reach it" }
}

// How the proxy's server reaches a listener: over loopback when it's the
// same server, else over the other server's address. A listener bound to
// loopback on another server can't be reached at all.
function reach(
  port: OpenPort,
  same: boolean,
  serverHost: string,
  box?: ContainerInfo,
): Reach {
  const at = port.addresses
  if (same && box && box.network_mode !== "host") return reachFromBox(port, box)
  if (same) {
    if (at.some((a) => wildcard(a) || a.startsWith("127.")))
      return { host: "127.0.0.1" }
    if (at.includes("::1")) return { host: "::1" }
    return { host: at[0] ?? "127.0.0.1" }
  }
  if (at.some(wildcard)) return { host: serverHost }
  const other = at.find((a) => !loopback(a))
  if (other) return { host: other }
  return { reason: "Only that server itself can reach it" }
}

const httpsPorts = new Set([443, 8443, 9443, 10443])
const guessScheme = (p: OpenPort) =>
  httpsPorts.has(p.port) || /https|tls|ssl/i.test(p.service)
    ? "https://"
    : "http://"

type Group = "containers" | "services" | "other"
const groups: { key: Group; label: string; icon: LucideIcon }[] = [
  { key: "containers", label: "Docker containers", icon: Container },
  { key: "services", label: "Services", icon: Cog },
  { key: "other", label: "Other programs", icon: SquareTerminal },
]
const groupOf = (p: OpenPort): Group =>
  p.container ? "containers" : p.unit ? "services" : "other"

function title(p: OpenPort) {
  return (
    p.container?.name ||
    p.unit?.name.replace(/\.service$/, "") ||
    p.process?.name ||
    p.service ||
    `Port ${p.port}`
  )
}

function detail(p: OpenPort) {
  const bits = [
    p.service && p.service !== title(p) ? p.service : "",
    p.container?.image ?? p.unit?.description ?? "",
  ].filter(Boolean)
  return bits.join(" · ")
}

// A button that opens a list of what listens on a server (its containers,
// services and programs, from the Ports section) and fills in the address
// of the one picked.
export function PickFromServer({
  id,
  proxy: p,
  protocol,
  label = "Pick from a server",
  onPick,
  disabled,
  icon,
  className,
}: {
  // Unique per button on the page (history entry of the layer).
  id: string
  proxy: ReverseProxy
  protocol: "tcp" | "udp"
  label?: string
  onPick: (picked: Picked) => void
  disabled?: boolean
  icon?: ReactNode
  className?: string
}) {
  const [open, setOpen] = useOpen(id)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-9 md:h-8", className)}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {icon ?? <ServerIcon />}
        {label}
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Pick what to pass visitors on to"
        description="What listens on a server, from its Ports. The address is filled in as the proxy's server reaches it."
        className="sm:max-w-xl"
      >
        {open && (
          <PickerBody
            proxy={p}
            protocol={protocol}
            onPick={(picked) => {
              onPick(picked)
              setOpen(false)
            }}
          />
        )}
      </ResponsiveDialog>
    </>
  )
}

function PickerBody({
  proxy: p,
  protocol,
  onPick,
}: {
  proxy: ReverseProxy
  protocol: "tcp" | "udp"
  onPick: (picked: Picked) => void
}) {
  const [serverId, setServerId] = useState(p.server_id)
  const [q, setQ] = useState("")
  const servers = useServers({ limit: 200 })
  const list = (servers.data?.items ?? [])
    .slice()
    .sort(
      (a, b) =>
        Number(b.id === p.server_id) - Number(a.id === p.server_id) ||
        a.name.localeCompare(b.name),
    )
  const server = list.find((s) => s.id === serverId)
  const same = serverId === p.server_id
  const serverName = server?.name ?? p.server_name
  const ports = usePorts(serverId)
  const boxed = inContainer(p)
  const inspection = useInspection(p.id, boxed)
  const box = inspection.data?.container
  const bridged = boxed && box?.network_mode !== "host"
  const gateway = box?.networks.find((n) => n.gateway)?.gateway

  const needle = q.trim().toLowerCase()
  const rows = (ports.data?.ports ?? [])
    .filter((x) => x.protocol === protocol)
    .filter(
      (x) =>
        !needle ||
        [
          title(x),
          detail(x),
          String(x.port),
          x.process?.name ?? "",
          x.container?.compose_service ?? "",
        ].some((t) => t.toLowerCase().includes(needle)),
    )
    .sort((a, b) => a.port - b.port)

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Server">
          {(f) => (
            <Select
              items={list.map((s) => ({ value: s.id, label: s.name }))}
              value={serverId}
              onValueChange={(v) => v && setServerId(v)}
            >
              <SelectTrigger id={f.id} className="h-11 w-full md:h-10">
                <SelectValue>
                  <span className="truncate">{serverName}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {list.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="truncate">{s.name}</span>
                    {s.id === p.server_id && (
                      <span className="ms-auto shrink-0 text-caption text-ash">
                        The proxy's
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Search">
          {(f) => (
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
              <Input
                {...f}
                type="search"
                enterKeyHint="search"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, image or port"
                className="ps-9"
              />
            </div>
          )}
        </Field>
      </div>

      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <span className="min-w-0 flex-1">
          {!same
            ? `On another server: reached over ${server?.host || "its address"}.`
            : bridged
              ? `The proxy runs in the container ${p.container}: containers on its network are reached by name, the rest of ${serverName} over ${gateway || "the network's gateway"} (the server's firewall must let the container in).`
              : `On ${serverName} itself: reached over 127.0.0.1.`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Read the ports again"
          onClick={() => ports.refetch()}
          disabled={ports.isFetching}
          className="max-md:size-11"
        >
          <RefreshCw className={cn(ports.isFetching && "animate-spin")} />
        </Button>
      </div>

      {same && bridged && !box ? (
        <p className="flex items-center gap-2 py-8 text-body-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Reading the proxy's container…
        </p>
      ) : ports.isPending ? (
        <p className="flex items-center gap-2 py-8 text-body-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Reading what listens on {serverName}…
        </p>
      ) : ports.isError ? (
        <p className="py-6 text-body-sm text-destructive">
          Couldn't read the ports of {serverName}: {ports.error.message}
        </p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-body-sm text-muted-foreground">
          {needle
            ? "Nothing matches."
            : `Nothing listens on ${protocol.toUpperCase()} on ${serverName}.`}
        </p>
      ) : (
        <div className="-mx-4 flex max-h-[min(60vh,28rem)] flex-col overflow-y-auto px-4 md:mx-0 md:px-0">
          {groups.map((g) => {
            const items = rows.filter((x) => groupOf(x) === g.key)
            if (!items.length) return null
            return (
              <section key={g.key} className="flex flex-col">
                <h3 className="sticky top-0 z-10 bg-popover py-2 font-label text-caption tracking-label text-ash uppercase">
                  {g.label}
                </h3>
                <ul className="flex flex-col">
                  {items.map((x) => (
                    <PortRow
                      key={`${x.protocol}/${x.port}/${x.addresses.join(",")}`}
                      port={x}
                      icon={g.icon}
                      to={reach(x, same, server?.host ?? "", box)}
                      self={
                        same &&
                        (boxed
                          ? x.container?.name === p.container
                          : x.process?.name === p.kind)
                      }
                      onPick={onPick}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
      {ports.data && !ports.data.privileged && (
        <p className="text-caption text-ash">
          Read without root: some programs show only their port.
        </p>
      )}
    </div>
  )
}

function PortRow({
  port: x,
  icon: Icon,
  to,
  self,
  onPick,
}: {
  port: OpenPort
  icon: LucideIcon
  to: Reach
  // The proxy itself (nginx on 80/443): passing visitors to it loops.
  self: boolean
  onPick: (picked: Picked) => void
}) {
  const reason = self
    ? "That's the proxy itself"
    : "reason" in to
      ? to.reason
      : ""
  const host = "host" in to ? to.host : ""
  const at = "host" in to && to.port ? to.port : x.port
  const shown = host.includes(":") ? `[${host}]` : host
  const sub = detail(x)
  const Exposure = exposureMeta[x.exposure].icon
  return (
    <li>
      <button
        type="button"
        disabled={!!reason}
        onClick={() =>
          onPick({ host, port: String(at), scheme: guessScheme(x) })
        }
        className="flex min-h-14 w-full items-center gap-3 rounded-lg p-2 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted disabled:pointer-events-none disabled:opacity-50 max-md:-mx-2 max-md:w-[calc(100%+1rem)]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium">
            {title(x)}
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {reason || sub || exposureMeta[x.exposure].label}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-mono text-caption text-foreground tabular-nums">
            {reason ? x.port : `${shown}:${at}`}
          </span>
          <span className="flex items-center gap-1 text-caption text-ash">
            <Exposure className="size-3" />
            {exposureMeta[x.exposure].label}
          </span>
        </span>
      </button>
    </li>
  )
}
