"use client"

import { ShieldCheck, TriangleAlert } from "lucide-react"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { BarSlot } from "../../components/bar-slots"
import { Empty, Loading, SearchBox } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useFirewallLog } from "../api"
import { useFirewallActions } from "./firewall-actions"
import {
  type BlockedRow,
  groupEvents,
  portName,
  useFirewallFilters,
} from "./meta"

const when = (at: string) => {
  const t = new Date(at)
  if (Number.isNaN(t.getTime())) return at
  return t.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Who's been knocking: one row per address and port, the busiest first, each
// a click from being blocked for good or let in.
export function LogTab() {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const logging = o.defaults.logging !== "off"
  const query = useFirewallLog(server.id, true)
  const { filters, setFilters } = useFirewallFilters()
  const rows = useMemo(
    () => groupEvents(query.data?.events ?? []),
    [query.data],
  )
  const q = filters.q.trim().toLowerCase()
  const shown = rows.filter(
    (r) =>
      !q ||
      `${r.source} ${r.port} ${portName(r.port) ?? ""}`
        .toLowerCase()
        .includes(q),
  )

  const search = rows.length > 0 && (
    <BarSlot slot="search">
      <SearchBox
        value={filters.q}
        onChange={(v) => setFilters({ q: v || null })}
        placeholder="Search blocked"
        label="Search address or port"
        className="w-full md:w-full"
      />
    </BarSlot>
  )

  if (!query.data) {
    if (query.error) {
      return (
        <Empty
          icon={TriangleAlert}
          title="Couldn't read the log"
          className="max-md:mt-4"
          body={query.error.message}
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          }
        />
      )
    }
    return <Loading phone={phone} />
  }

  if (rows.length === 0) {
    return (
      <Empty
        icon={ShieldCheck}
        title={logging ? "Nothing blocked lately" : "Logging is off"}
        className="max-md:mt-4"
        body={
          logging
            ? "Blocked connections show up here as they happen."
            : "Turn it on to see who's being blocked."
        }
        action={
          !logging &&
          a.manage && (
            <Button
              className="max-md:h-11 max-md:w-full"
              disabled={a.busy || a.locked}
              onClick={() =>
                a.apply(
                  () =>
                    api.firewall.updateFirewallSettings(server.id, {
                      logging: o.backend === "firewalld" ? "all" : "low",
                    }),
                  "Logging turned on",
                )
              }
            >
              Turn on logging
            </Button>
          )
        }
      />
    )
  }

  return (
    <>
      {search}
      {phone ? (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {shown.map((r) => (
            <li key={r.key} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-mono text-body-sm">
                  {r.source}
                </span>
                <span className="shrink-0 text-caption text-muted-foreground">
                  {r.count}×
                </span>
              </div>
              <p className="text-caption text-muted-foreground">
                {target(r)} · {when(r.last)}
              </p>
              <Actions row={r} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border text-caption text-ash">
                <th className="py-2 ps-4 text-start font-normal">From</th>
                <th className="px-4 py-2 text-start font-normal">Tried</th>
                <th className="px-4 py-2 text-end font-normal">Times</th>
                <th className="px-4 py-2 text-start font-normal">Last</th>
                <th className="w-48" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((r) => (
                <tr key={r.key}>
                  <td className="py-2 ps-4 font-mono text-caption">
                    {r.source}
                  </td>
                  <td className="px-4 py-2">{target(r)}</td>
                  <td className="px-4 py-2 text-end tabular-nums">{r.count}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                    {when(r.last)}
                  </td>
                  <td className="py-1.5 pe-3">
                    <Actions row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-caption text-ash max-md:px-4 max-md:py-3">
        The latest blocked connections, read from {query.data.source}.
      </p>
    </>
  )
}

const target = (r: BlockedRow) => {
  const name = portName(r.port)
  const port = r.port ? `${r.port}/${r.protocol.toLowerCase()}` : r.protocol
  return name ? `${name} · ${port}` : port
}

function Actions({ row }: { row: BlockedRow }) {
  const { phone } = useServerPage()
  const a = useFirewallActions()
  if (!a.manage) return null
  const size = phone ? "lg" : "sm"
  const proto = row.protocol.toLowerCase()
  return (
    <div className="flex justify-end gap-2 max-md:grid max-md:grid-cols-2">
      <Button
        variant="outline"
        size={size}
        disabled={a.locked}
        onClick={() =>
          a.addRule({
            action: "allow",
            from: row.source,
            port: row.port ? String(row.port) : undefined,
            protocol: proto === "tcp" || proto === "udp" ? proto : "any",
          })
        }
      >
        Allow
      </Button>
      <Button
        variant="outline"
        size={size}
        disabled={a.locked}
        onClick={() => a.blockAddress(row.source)}
      >
        Block address
      </Button>
    </div>
  )
}
