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
import { SectionHeader } from "../../components/section-header"
import { useServerPage } from "../../components/server-page"
import { usePorts } from "../api"
import { filterPorts, summarize, usePortFilters } from "./meta"
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

  const actions = (
    <>
      {report && (
        <span className="hidden self-center text-caption text-ash md:inline">
          Updated {timeAgo(report.collected_at).toLowerCase()}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        className="max-md:h-10 max-md:flex-1"
        disabled={query.isFetching}
        onClick={() => query.refetch()}
      >
        <RefreshCw className={cn(query.isFetching && "animate-spin")} />
        {query.isFetching ? "Scanning…" : "Refresh"}
      </Button>
    </>
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
      />
    )
  } else if (report.ports.length === 0) {
    body = (
      <Empty
        icon={EthernetPort}
        title="Nothing is listening"
        body="No TCP or UDP port is open on this server."
      />
    )
  } else {
    const ports = filterPorts(report.ports, filters)
    body = (
      <>
        <Summary report={report} />
        <Notices report={report} />
        <Toolbar />
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
    <>
      <SectionHeader actions={actions} />
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">{body}</div>
      <PortDetailsLayer
        port={selected}
        open={open}
        onOpenChange={setOpen}
        privileged={report?.privileged ?? true}
      />
    </>
  )
}

// Counts across the top; tapping one filters the list by it.
function Summary({ report }: { report: PortsReport }) {
  const { filters, setFilters } = usePortFilters()
  const s = summarize(report)
  const cells: {
    label: string
    value: number
    active?: boolean
    warn?: boolean
    onClick?: () => void
  }[] = [
    {
      label: "Listening",
      value: s.total,
      active: !filters.exposure,
      onClick: () => setFilters({ exposure: null }),
    },
    {
      label: "Public",
      value: s.public,
      active: filters.exposure === "public",
      onClick: () => setFilters({ exposure: "public" }),
    },
    { label: "Containers", value: s.containers },
    { label: "Exposed databases", value: s.risky, warn: s.risky > 0 },
  ]
  return (
    <div className="grid grid-cols-2 divide-border border-border max-md:mt-4 max-md:border-y md:grid-cols-4 md:divide-x md:rounded-2xl md:border">
      {cells.map((c, i) => {
        const content = (
          <>
            <span
              className={cn(
                "text-subheading font-medium tabular-nums",
                c.warn && "text-warning",
              )}
            >
              {c.value}
            </span>
            <span className="text-caption text-muted-foreground">
              {c.label}
            </span>
          </>
        )
        const className = cn(
          "flex min-h-16 flex-col items-start justify-center px-4 py-3 text-start max-md:odd:border-e md:px-5 max-md:[&:nth-child(-n+2)]:border-b",
          i === 0 && "md:rounded-s-2xl",
          i === cells.length - 1 && "md:rounded-e-2xl",
        )
        return c.onClick ? (
          <button
            key={c.label}
            type="button"
            aria-pressed={c.active}
            onClick={c.onClick}
            className={cn(
              className,
              "outline-none hover:bg-subtle active:bg-muted aria-pressed:bg-subtle",
            )}
          >
            {content}
          </button>
        ) : (
          <div key={c.label} className={className}>
            {content}
          </div>
        )
      })}
    </div>
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

const exposureChips = [
  { value: null, label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "local", label: "Local" },
] as const

const protoChips = [
  { value: null, label: "TCP & UDP" },
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
] as const

function Toolbar() {
  const { filters, setFilters } = usePortFilters()
  return (
    <div className="flex flex-col gap-3 max-md:px-4 max-md:pt-4 md:flex-row md:items-center">
      <div className="relative md:w-72">
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
      <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <Segmented
          items={exposureChips}
          value={filters.exposure}
          onChange={(exposure) => setFilters({ exposure })}
        />
        <Segmented
          items={protoChips}
          value={filters.proto}
          onChange={(proto) => setFilters({ proto })}
        />
      </div>
    </div>
  )
}

function Segmented<T extends string | null>({
  items,
  value,
  onChange,
}: {
  items: readonly { value: T; label: string }[]
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
