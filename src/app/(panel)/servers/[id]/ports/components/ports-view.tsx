"use client"

import {
  EthernetPort,
  Info,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { OpenPort, PortsReport } from "@/lib/services"
import { cn } from "@/lib/utils"
import { timeAgo } from "../../../components/meta"
import { useServerPage } from "../../components/server-page"
import { ContainerLimitsProvider } from "../../firewall/components/containers/limits-provider"
import { usePorts } from "../api"
import { countPorts, filterPorts, usePortFilters } from "./meta"
import { PortDetailsLayer } from "./port-details"
import { PortsList, PortsTable } from "./ports-list"

export function PortsView() {
  const { server, phone } = useServerPage()
  const query = usePorts(server.id)
  const { filters } = usePortFilters()
  const [selected, setSelected] = useState<OpenPort | null>(null)
  const [open, setOpen] = useOpen("port-details")
  const report = query.data

  function show(port: OpenPort) {
    setSelected(port)
    setOpen(true)
  }

  const refresh = (
    <Button
      variant="outline"
      size="icon-lg"
      className="shrink-0 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={query.isFetching}
      onClick={() => query.refetch()}
    >
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
    </Button>
  )
  const retry = (
    <Button variant="outline" onClick={() => query.refetch()}>
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
      Refresh
    </Button>
  )

  let body: ReactNode
  if (!report) {
    body = query.error ? (
      <Empty
        icon={TriangleAlert}
        title="Couldn't read the ports"
        body={query.error.message}
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        }
      />
    ) : (
      <Loading phone={phone} />
    )
  } else if (report.tool === "none") {
    body = (
      <Empty
        icon={EthernetPort}
        title="No tool to list sockets"
        body="Neither ss nor netstat is installed on this server. Install iproute2 (for ss) or net-tools, then refresh."
        action={retry}
      />
    )
  } else if (report.ports.length === 0) {
    body = (
      <Empty
        icon={EthernetPort}
        title="Nothing is listening"
        body="No TCP or UDP port is open on this server."
        action={retry}
      />
    )
  } else {
    const ports = filterPorts(report.ports, filters)
    body = (
      <>
        <Notices report={report} />
        <Toolbar report={report} refresh={refresh} />
        {ports.length === 0 ? (
          <Empty
            icon={Search}
            title="No matching ports"
            body="Try another search or filter."
          />
        ) : phone ? (
          <PortsList ports={ports} onSelect={show} />
        ) : (
          <PortsTable ports={ports} onSelect={show} />
        )}
      </>
    )
  }

  return (
    <ContainerLimitsProvider>
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">{body}</div>
      <PortDetailsLayer
        port={selected}
        open={open}
        onOpenChange={setOpen}
        privileged={report?.privileged ?? true}
      />
    </ContainerLimitsProvider>
  )
}

// Why some of the picture may be missing, and how to fill it in.
function Notices({ report }: { report: PortsReport }) {
  const { server } = useServerPage()
  const user = server.username
  const notes: { key: string; title: string; body: ReactNode }[] = []

  const hidden = report.ports.filter((p) => !p.process && !p.container).length
  if (!report.privileged && hidden > 0) {
    notes.push({
      key: "priv",
      title: `${hidden} ${hidden === 1 ? "port's" : "ports'"} process is hidden`,
      body: (
        <>
          {user} isn't root and sudo asks for a password, so only {user}'s own
          processes are named. Log in as root, or allow{" "}
          <code className="font-mono text-caption">sudo -n</code> for this user,
          to see every owner.
        </>
      ),
    })
  }
  if (report.docker.status === "denied") {
    notes.push({
      key: "docker",
      title: `${report.docker.runtime === "podman" ? "Podman" : "Docker"} is installed, but ${user} can't use it`,
      body: (
        <>
          Add {user} to the docker group (
          <code className="font-mono text-caption">
            sudo usermod -aG docker {user}
          </code>
          ) to see which container each port belongs to.
        </>
      ),
    })
  } else if (report.docker.status === "error") {
    notes.push({
      key: "docker",
      title: "Couldn't list containers",
      body: report.docker.message || "The container runtime didn't answer.",
    })
  }
  if (notes.length === 0) return null

  return (
    <div className="flex flex-col gap-2 max-md:mt-4 max-md:gap-0 max-md:divide-y max-md:divide-border max-md:border-y max-md:border-border">
      {notes.map((n) => (
        <div
          key={n.key}
          className="flex gap-3 p-4 text-body-sm md:rounded-2xl md:border md:border-border md:bg-subtle md:px-5 md:py-3"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-ash" />
          <div className="min-w-0">
            <p className="font-medium">{n.title}</p>
            <p className="text-muted-foreground">{n.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Search, filters and Refresh. Phones put Refresh beside the search box.
function Toolbar({
  report,
  refresh,
}: {
  report: PortsReport
  refresh: ReactNode
}) {
  const { filters, setFilters } = usePortFilters()
  const n = countPorts(report.ports)
  // Containers and exposed databases narrow the list further; a chip with
  // nothing to show is left out unless it's on.
  const showChips = [
    { value: "containers", label: "Containers", count: n.containers },
    {
      value: "exposed",
      label: "Exposed databases",
      count: n.exposed,
      warn: n.exposed > 0,
    },
  ] as const
  const shown = showChips.filter((c) => c.count > 0 || filters.show === c.value)
  return (
    <div className="flex flex-col gap-3 max-md:px-4 max-md:pt-4 md:flex-row md:items-center">
      <div className="flex gap-2 md:contents">
        <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setFilters({ q: e.target.value || null })}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setFilters({ q: null })
                e.currentTarget.blur()
              }
            }}
            placeholder="Port, service, process or container"
            aria-label="Search ports"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-11 w-full rounded-lg border border-input bg-card ps-9 pe-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setFilters({ q: null })}
              className="absolute end-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-ash hover:text-foreground md:size-7"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 md:order-last md:ms-auto">
          <span className="text-caption whitespace-nowrap text-ash max-md:hidden">
            Updated {timeAgo(report.collected_at).toLowerCase()}
          </span>
          {refresh}
        </div>
      </div>
      <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 md:mx-0 md:min-w-0 md:flex-wrap md:overflow-visible md:px-0">
        <Segmented
          items={[
            { value: null, label: "All", count: n.total },
            { value: "public", label: "Public", count: n.public },
            { value: "private", label: "Private", count: n.private },
            { value: "local", label: "Local", count: n.local },
          ]}
          value={filters.exposure}
          onChange={(exposure) => setFilters({ exposure })}
        />
        <Segmented
          items={[
            { value: null, label: "TCP & UDP" },
            { value: "tcp", label: "TCP", count: n.tcp },
            { value: "udp", label: "UDP", count: n.udp },
          ]}
          value={filters.proto}
          onChange={(proto) => setFilters({ proto })}
        />
        {shown.length > 0 && (
          <Segmented
            items={shown}
            value={filters.show}
            onChange={(show) =>
              setFilters({ show: filters.show === show ? null : show })
            }
          />
        )}
      </div>
    </div>
  )
}

function Segmented<T extends string | null>({
  items,
  value,
  onChange,
}: {
  items: readonly {
    value: T
    label: string
    count?: number
    warn?: boolean
  }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="flex shrink-0 rounded-lg bg-muted p-0.5">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className="h-10 rounded-md px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm md:h-8"
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={cn(
                "ms-1.5 text-ash tabular-nums",
                item.warn && "font-medium text-warning",
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Info
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center md:rounded-2xl md:border md:border-border">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-body font-medium">{title}</h3>
      <p className="mt-1 max-w-md text-body-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function Loading({ phone }: { phone: boolean }) {
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <Skeleton className="h-32 rounded-2xl" />
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }
  return (
    <>
      <Skeleton className="h-[4.5rem] rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </>
  )
}
