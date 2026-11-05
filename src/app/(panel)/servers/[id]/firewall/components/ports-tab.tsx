"use client"

import { Plug, TriangleAlert } from "lucide-react"
import { useMemo, useState } from "react"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import type { OpenPort } from "@/lib/services"
import { BarSlot } from "../../components/bar-slots"
import {
  Empty,
  Loading,
  type Note,
  Notices,
  SearchBox,
} from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { usePorts } from "../../ports/api"
import { useFirewallActions } from "./firewall-actions"
import { type PortState, portName, portState, useFirewallFilters } from "./meta"

type Row = { port: OpenPort; state: PortState; ssh: boolean; name: string }

const stateLabel = (s: PortState) => {
  if (s.state === "off") return "Firewall off"
  if (s.state === "open") return "Open to anyone"
  if (s.state === "blocked") return "Blocked"
  return s.from.length === 1
    ? `Only ${s.from[0]}`
    : `${s.from.length} addresses`
}

const stateTone = (s: PortState) => {
  if (s.state === "open") return "bg-success"
  if (s.state === "limited") return "bg-brand"
  if (s.state === "blocked") return "bg-destructive"
  return "bg-mist"
}

// The question people actually ask: what's reachable right now, and what
// does closing it take.
export function PortsTab() {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const query = usePorts(server.id)
  const { filters, setFilters } = useFirewallFilters()
  const [closeOpen, setCloseOpen] = useOpen("fw-close-port")
  const [closing, setClosing] = useState<Row>()

  const all = query.data?.ports
  const rows = useMemo(() => {
    const seen = new Map<string, Row>()
    for (const p of all ?? []) {
      if (p.exposure === "local") continue
      const key = `${p.protocol}/${p.port}`
      if (seen.has(key)) continue
      seen.set(key, {
        port: p,
        state: portState(o, p),
        ssh: p.port === o.ssh_port,
        name:
          portName(p.port) ?? p.service ?? p.container?.name ?? p.process ?? "",
      })
    }
    return [...seen.values()].sort((x, y) => x.port.port - y.port.port)
  }, [all, o])

  const q = filters.q.trim().toLowerCase()
  const shown = rows.filter(
    (r) => !q || `${r.port.port} ${r.name}`.toLowerCase().includes(q),
  )
  const hidden = (all ?? []).filter((p) => p.exposure === "local").length

  const search = (
    <BarSlot slot="search">
      <SearchBox
        value={filters.q}
        onChange={(v) => setFilters({ q: v || null })}
        placeholder="Search ports"
        label="Search ports"
        className="w-full md:w-full"
      />
    </BarSlot>
  )

  if (!query.data) {
    return (
      <>
        {search}
        {query.error ? (
          <Empty
            icon={TriangleAlert}
            title="Couldn't read the ports"
            className="max-md:mt-4"
            body={query.error.message}
            action={
              <Button variant="outline" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <Loading phone={phone} />
        )}
      </>
    )
  }

  const notes: Note[] = []
  if (
    rows.some((r) => r.port.container && r.port.container.network !== "host")
  ) {
    notes.push({
      key: "docker",
      warn: true,
      title: "Docker ports skip these rules",
      body: "Docker publishes its ports ahead of ufw and firewalld, so a rule here won't close them. Publish them on 127.0.0.1 instead.",
    })
  }

  function close(row: Row) {
    setClosing(row)
    setCloseOpen(true)
  }

  const closeByRule =
    o.defaults.incoming !== "allow" && closing?.state.allowing.length

  async function confirmClose() {
    if (!closing) return
    const { port, protocol } = closing.port
    const label = `Port ${port} closed`
    if (closeByRule) {
      const ids = closing.state.allowing.map((r) => r.id)
      await a.apply(
        () => api.firewall.deleteFirewallRules(server.id, { ids }),
        label,
      )
    } else {
      await a.apply(
        () =>
          api.firewall.addFirewallRule(server.id, {
            action: "block",
            port: String(port),
            protocol,
          }),
        label,
      )
    }
    setCloseOpen(false)
  }

  // Rules that hold more than this one port go with it.
  const also = closing?.state.allowing.filter(
    (r) => r.port !== String(closing.port.port),
  )

  return (
    <>
      {search}
      <Notices notes={notes} />
      {shown.length === 0 ? (
        <Empty
          icon={Plug}
          title={q ? "No ports match" : "Nothing listens for other machines"}
          className="max-md:mt-4"
          body={
            q
              ? "Try another search."
              : "Every service on this server only listens to itself."
          }
        />
      ) : phone ? (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {shown.map((r) => (
            <li
              key={`${r.port.protocol}/${r.port.port}`}
              className="flex min-h-14 items-center gap-3 px-4 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-medium">
                  {r.name || `Port ${r.port.port}`}
                </span>
                <span className="flex items-center gap-1.5 truncate text-caption text-muted-foreground">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${stateTone(r.state)}`}
                  />
                  {r.port.port}/{r.port.protocol} · {stateLabel(r.state)}
                </span>
              </span>
              <Action row={r} onClose={close} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border text-caption text-ash">
                <th className="py-2 ps-4 text-start font-normal">Port</th>
                <th className="px-4 py-2 text-start font-normal">Service</th>
                <th className="px-4 py-2 text-start font-normal">
                  Who can reach it
                </th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((r) => (
                <tr key={`${r.port.protocol}/${r.port.port}`}>
                  <td className="py-2 ps-4 whitespace-nowrap">
                    <span className="font-medium">{r.port.port}</span>
                    <span className="text-caption text-muted-foreground">
                      /{r.port.protocol}
                    </span>
                  </td>
                  <td className="max-w-64 truncate px-4 py-2 text-muted-foreground">
                    {r.name}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span
                        className={`size-1.5 rounded-full ${stateTone(r.state)}`}
                      />
                      {stateLabel(r.state)}
                    </span>
                  </td>
                  <td className="py-1.5 pe-3 text-end">
                    <Action row={r} onClose={close} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hidden > 0 && (
        <p className="text-caption text-ash max-md:px-4 max-md:py-3">
          {hidden === 1 ? "1 port listens" : `${hidden} ports listen`} on this
          server only and can't be reached from outside.
        </p>
      )}
      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title={`Close port ${closing?.port.port}?`}
        description={
          also?.length
            ? `This deletes the rule that opens it, which also covers ${also.map((r) => r.port).join(", ")}.`
            : `Other machines won't reach ${closing?.name || "it"} any more. The service itself keeps running.`
        }
        confirmLabel="Close port"
        pending={a.busy}
        onConfirm={confirmClose}
      />
    </>
  )
}

function Action({ row, onClose }: { row: Row; onClose: (row: Row) => void }) {
  const { phone } = useServerPage()
  const a = useFirewallActions()
  if (!a.manage || row.ssh) return null
  const size = phone ? "lg" : "sm"
  const { state, allowing } = row.state
  if (state === "off") {
    if (allowing.length > 0) return null
    return <AllowButton row={row} size={size} />
  }
  if (state === "blocked") return <AllowButton row={row} size={size} />
  return (
    <Button
      variant="outline"
      size={size}
      disabled={a.locked}
      onClick={() => onClose(row)}
    >
      Close
    </Button>
  )
}

function AllowButton({ row, size }: { row: Row; size: "lg" | "sm" }) {
  const a = useFirewallActions()
  return (
    <Button
      variant="outline"
      size={size}
      disabled={a.locked}
      onClick={() =>
        a.addRule({
          action: "allow",
          port: String(row.port.port),
          protocol: row.port.protocol,
        })
      }
    >
      Allow
    </Button>
  )
}
