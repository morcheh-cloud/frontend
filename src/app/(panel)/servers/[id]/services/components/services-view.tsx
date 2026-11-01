"use client"

import { Cog, Plus, RefreshCw, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { ServicesOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  Loading,
  type Note,
  Notices,
  SearchBox,
  Segmented,
} from "../../components/parts"
import { SectionActions } from "../../components/section-actions"
import { useServerPage } from "../../components/server-page"
import { useDaemonReload, useServices } from "../api"
import {
  inFilter,
  type StateFilter,
  serviceState,
  shortName,
  useServicesFilters,
} from "./meta"
import { ServicesActionsProvider, useServicesActions } from "./services-actions"
import { ServicesList } from "./services-list"

export function ServicesView() {
  const { server, phone } = useServerPage()
  const query = useServices(server.id)
  const o = query.data

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={query.isFetching}
      onClick={() => query.refetch()}
    >
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
    </Button>
  )

  if (!o || o.init === "none") {
    let body: ReactNode = <Loading phone={phone} />
    if (query.error) {
      body = (
        <Empty
          icon={TriangleAlert}
          title="Couldn't read the services"
          body={query.error.message}
          className="max-md:mt-4"
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          }
        />
      )
    } else if (o) {
      body = (
        <Empty
          icon={Cog}
          title="No service manager"
          body="Neither systemd nor OpenRC runs on this server (common in containers), so there are no services to manage here. Its processes still show in the terminal (ps, top)."
          className="max-md:mt-4"
        />
      )
    }
    return (
      <>
        <SectionActions>{refresh}</SectionActions>
        <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
          {body}
        </div>
      </>
    )
  }

  return (
    <ServicesActionsProvider overview={o}>
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
        <Bar refresh={refresh} />
        <Notes />
        <ServicesList />
      </div>
    </ServicesActionsProvider>
  )
}

// Everything above the list in one row: state tabs with counts, search, the
// service manager's own state, and actions. Phones stack it: search +
// actions, then scrolling chips.
function Bar({ refresh }: { refresh: ReactNode }) {
  const { phone } = useServerPage()
  const a = useServicesActions()
  const o = a.overview
  const { filters, setFilters } = useServicesFilters()
  const count = (f: StateFilter) =>
    o.services.filter((s) => inFilter(s, f)).length

  const tabs = (
    <Segmented
      label="Show"
      items={[
        { value: "running", label: `Running · ${count("running")}` },
        { value: "failed", label: `Failed · ${count("failed")}` },
        { value: "stopped", label: `Stopped · ${count("stopped")}` },
        { value: "all", label: `All · ${o.services.length}` },
      ]}
      value={filters.state}
      onChange={(state) =>
        setFilters({ state: state === "running" ? null : state })
      }
    />
  )
  const search = (
    <SearchBox
      value={filters.q}
      onChange={(q) => setFilters({ q: q || null })}
      placeholder="Search name or description"
      label="Search services"
      className="min-w-0 flex-1 md:max-w-72 md:min-w-36"
    />
  )
  const add = a.systemd && (
    <Button
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label="New service"
      disabled={!a.canManage}
      onClick={a.create}
    >
      <Plus />
      {!phone && "New service"}
    </Button>
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          {search}
          {refresh}
          {add}
        </div>
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {tabs}
        </div>
        <Manager o={o} />
      </div>
    )
  }

  return (
    <div className="@container flex items-center gap-2">
      {tabs}
      <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      {search}
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <Manager o={o} className="me-2 hidden @4xl:flex" />
        {refresh}
        {add}
      </div>
    </div>
  )
}

const systemStates: Record<string, string> = {
  running: "all fine",
  degraded: "a unit failed",
  starting: "still booting",
  initializing: "still booting",
  stopping: "shutting down",
  maintenance: "maintenance mode",
}

// "systemd 255 · degraded": the service manager and how the system is doing.
function Manager({
  o,
  className,
}: {
  o: ServicesOverview
  className?: string
}) {
  const name = o.init === "systemd" ? "systemd" : "OpenRC"
  // "systemd 259 (259.9-0ubuntu0.1)" → "259"
  const version = o.version?.match(/\d+(\.\d+)*/)?.[0]
  const state = o.state && (systemStates[o.state] ?? o.state)
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-caption whitespace-nowrap text-muted-foreground",
        className,
      )}
      title={o.version}
    >
      {o.state && (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            o.state === "running" ? "bg-success" : "bg-warning",
          )}
        />
      )}
      {[version ? `${name} ${version}` : name, state]
        .filter(Boolean)
        .join(" · ")}
    </span>
  )
}

function Notes() {
  const { server } = useServerPage()
  const a = useServicesActions()
  const o = a.overview
  const { filters, setFilters } = useServicesFilters()
  const reload = useDaemonReload(server.id)
  const out: Note[] = []

  if (o.access === "user") {
    out.push({
      key: "access",
      title: "This login can only look",
      body: "Starting, stopping and changing services needs root, or sudo without a password.",
      warn: true,
    })
  }
  const failed = o.services.filter((s) => serviceState(s) === "failed")
  if (failed.length && filters.state !== "failed") {
    const names = failed.slice(0, 3).map((s) => shortName(s.name))
    out.push({
      key: "failed",
      title: `${failed.length} ${failed.length === 1 ? "service has" : "services have"} failed: ${names.join(", ")}${failed.length > 3 ? "…" : ""}`,
      body: "Open one to read why in its logs.",
      warn: true,
      action: (
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => setFilters({ state: "failed", q: null })}
        >
          Show
        </Button>
      ),
    })
  }
  const stale = o.services.filter((s) => s.need_reload)
  if (stale.length && a.systemd) {
    out.push({
      key: "reload",
      title: `${stale.length === 1 ? `${shortName(stale[0].name)}'s unit file` : `${stale.length} unit files`} changed on disk`,
      body: "systemd still runs the old version until it reloads them (daemon-reload). Running services keep going.",
      action: (
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          disabled={!a.canManage || reload.isPending}
          onClick={() =>
            reload.mutate(undefined, {
              onSuccess: () => toast.success("systemd reloaded its units"),
              onError: (e) => toast.error(e.message),
            })
          }
        >
          Reload systemd
        </Button>
      ),
    })
  }
  if (o.init === "openrc") {
    out.push({
      key: "openrc",
      title: "This server runs OpenRC",
      body: "Start, stop, restart and start at boot work here. Masking, signals, overrides and new services need systemd.",
    })
  }
  for (const w of o.warnings) out.push({ key: w, title: w, warn: true })
  return <Notices notes={out} />
}
