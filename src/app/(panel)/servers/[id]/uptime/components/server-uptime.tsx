"use client"

import { Box, HeartPulse, Network, Plus, Radar, Workflow } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { useServerMonitors } from "@/app/(panel)/uptime/api"
import { newMonitorHref } from "@/app/(panel)/uptime/components/meta"
import { useUptimeCan } from "@/app/(panel)/uptime/components/permissions"
import { UptimeActionsProvider } from "@/app/(panel)/uptime/components/uptime-actions"
import {
  MonitorRows,
  MonitorTable,
} from "@/app/(panel)/uptime/components/uptime-view"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty } from "../../components/parts"
import { SectionActions } from "../../components/section-actions"
import { useServerPage } from "../../components/server-page"

// Monitors tied to this server (checked from it, or about it). They live
// under /uptime; adding one here starts with this server picked.
export function ServerUptime() {
  return (
    <UptimeActionsProvider>
      <View />
    </UptimeActionsProvider>
  )
}

const start = (s: Server, kind: string, port?: number) =>
  newMonitorHref("/uptime/new", {
    server: s.id,
    kind,
    host: kind === "ping" || kind === "tcp" ? s.host : null,
    port: port ? String(port) : null,
  })

function View() {
  const { server, phone } = useServerPage()
  const can = useUptimeCan(server.workspace_id)
  const list = useServerMonitors(server.id)
  const items = list.data ?? []

  // One-tap starts for what's worth watching on any server.
  const quick: { label: string; icon: ReactNode; href: string }[] = [
    { label: "Ping it", icon: <Radar />, href: start(server, "ping") },
    {
      label: `SSH port ${server.port}`,
      icon: <Network />,
      href: start(server, "tcp", server.port),
    },
    {
      label: "A systemd service",
      icon: <Workflow />,
      href: start(server, "systemd"),
    },
    { label: "A container", icon: <Box />, href: start(server, "docker") },
  ]

  const add = can.edit && (
    <Button
      className={phone ? "h-11 flex-1" : undefined}
      render={
        <Link href={newMonitorHref("/uptime/new", { server: server.id })} />
      }
      nativeButton={false}
    >
      <Plus />
      New monitor
    </Button>
  )

  if (list.isPending) {
    return (
      <div className={cn("flex flex-col gap-2", phone && "px-4 pt-4")}>
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    )
  }
  if (list.isError && !list.data) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="text-body-sm text-muted-foreground">
          {list.error.message}
        </p>
        <Button
          variant="outline"
          className="h-11 md:h-9"
          onClick={() => list.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className={cn(phone && "px-4 pt-4")}>
        <Empty
          icon={HeartPulse}
          title="Nothing watches this server yet"
          body="Monitors check it on a schedule and alert your team when it stops answering: ping it, watch its SSH port, or check a service or container from inside it."
          action={
            can.edit && (
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:justify-center">
                {quick.map((q) => (
                  <Button
                    key={q.label}
                    variant="outline"
                    className="h-11 md:h-9"
                    render={<Link href={q.href} />}
                    nativeButton={false}
                  >
                    {q.icon}
                    {q.label}
                  </Button>
                ))}
              </div>
            )
          }
        />
      </div>
    )
  }

  const down = items.filter((m) => !m.paused && m.status === "down").length
  return (
    <div className={cn("flex flex-col", phone ? "gap-3" : "gap-4")}>
      <SectionActions>
        <span
          className={cn(
            "me-auto self-center text-caption text-muted-foreground",
            phone && "hidden",
          )}
        >
          {items.length} {items.length === 1 ? "monitor" : "monitors"}
          {down > 0 && <span className="text-destructive"> · {down} down</span>}
        </span>
        {add}
      </SectionActions>
      {phone ? <MonitorRows items={items} /> : <MonitorTable items={items} />}
      <p
        className={cn("text-caption text-ash", phone ? "px-4" : "text-center")}
      >
        Every monitor, with its incidents and reports, is under{" "}
        <Link href="/uptime" className="text-brand hover:underline">
          Uptime
        </Link>
        .
      </p>
    </div>
  )
}
