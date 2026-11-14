"use client"

import { useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { ProxyDetail } from "@/lib/services"
import { useProxyTraffic } from "../../api"
import {
  LivePanel,
  LiveState,
  LiveTiles,
  sumTraffic,
} from "../../components/live"

// The proxy's overall live numbers: every site added up. Streams count
// connections, not requests, so they get their own view when both exist.
// A proxy manager's numbers come from its own sites' logs.
export function ProxyLive({ detail }: { detail: ProxyDetail }) {
  const p = detail.proxy
  const phone = useIsPhone()
  const traffic = useProxyTraffic(p.id)
  const [kind, setKind] = useState<"web" | "stream">("web")
  const manager = !!p.manager
  const hasStream =
    !manager && detail.hosts.some((h) => h.config.type === "stream")
  const hasWeb = manager || detail.hosts.some((h) => h.config.type !== "stream")
  if (!hasStream && !hasWeb) return null

  const stream = hasStream && (!hasWeb || kind === "stream")
  const isStream = new Map(
    detail.hosts.map((h) => [h.id, h.config.type === "stream"]),
  )
  const s = sumTraffic(
    manager
      ? (traffic.data?.sites ?? []).filter((t) => t.proxy_id === p.id)
      : (traffic.data?.hosts ?? []).filter(
          (t) => (isStream.get(t.host_id) ?? false) === stream,
        ),
  )
  const source = traffic.data?.sources.find((x) => x.proxy_id === p.id)
  const minutes = traffic.data?.minutes ?? 30
  const state = (
    <LiveState
      data={traffic.data}
      error={traffic.error}
      note={
        source && !source.ok
          ? `couldn't read the access log${manager ? "s" : ""}`
          : undefined
      }
      noteTitle={source?.error}
    />
  )
  const switcher = hasStream && hasWeb && (
    <Segmented
      label="Numbers for"
      value={stream ? "stream" : "web"}
      onChange={setKind}
      items={[
        { value: "web", label: "Sites" },
        { value: "stream", label: "Streams" },
      ]}
    />
  )

  if (phone) {
    return (
      <section aria-label="Live numbers" className="flex flex-col pb-4">
        <div className="flex min-h-11 items-center gap-3 px-4 pb-2">
          {state}
          {switcher && <span className="ms-auto">{switcher}</span>}
        </div>
        <LiveTiles
          s={s}
          stream={stream}
          minutes={minutes}
          pending={traffic.isPending}
        />
      </section>
    )
  }
  return (
    <LivePanel
      s={s}
      stream={stream}
      minutes={minutes}
      start={traffic.data?.start}
      pending={traffic.isPending}
      state={
        <span className="flex items-center gap-4">
          {state}
          {switcher}
        </span>
      }
    />
  )
}
