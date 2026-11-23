"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { DnsOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useConfigWrite,
  useDns,
  useResolveName,
} from "../../components/config/api"
import {
  clean,
  isHostname,
  isIP,
  ListEdit,
} from "../../components/config/fields"
import { HistoryButton } from "../../components/config/history"
import { Notices } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { ConfigBar, NetworkTabs, useNetworkTab } from "./network-view"
import { NotYet, RefreshButton } from "./refresh"

const managerText: Record<string, string> = {
  resolved: "systemd-resolved",
  networkmanager: "NetworkManager",
  resolvconf: "resolvconf",
  static: "a plain /etc/resolv.conf",
}

export function DnsTab() {
  const { server } = useServerPage()
  const q = useDns(server.id)
  const refresh = (
    <RefreshButton busy={q.isFetching} onClick={() => q.refetch()} />
  )
  if (!q.data)
    return (
      <>
        <ConfigBar tabs={<NetworkTabs />} actions={refresh} />
        <NotYet
          error={q.error}
          what="the DNS settings"
          retry={() => q.refetch()}
        />
      </>
    )
  return <DnsEditor key={q.data.revision} o={q.data} refresh={refresh} />
}

function DnsEditor({
  o,
  refresh,
}: {
  o: DnsOverview
  refresh: React.ReactNode
}) {
  const { server, can } = useServerPage()
  const [, setTab] = useNetworkTab()
  const write = useConfigWrite(server.id)
  const [servers, setServers] = useState(o.servers)
  const [search, setSearch] = useState(o.search)
  const editable = o.editable && can("engineer")
  const s = clean(servers)
  const d = clean(search)
  const bad = s.some((x) => !isIP(x)) || d.some((x) => !isHostname(x))
  const dirty = s.join() !== o.servers.join() || d.join() !== o.search.join()
  const noServer = o.manager === "static" && s.length === 0

  return (
    <>
      <ConfigBar
        tabs={<NetworkTabs />}
        status={<>Managed by {managerText[o.manager] ?? o.manager}</>}
        actions={
          <>
            <HistoryButton area="dns" />
            {refresh}
          </>
        }
      />
      <Notices
        notes={
          !o.editable && o.note
            ? [
                {
                  key: "note",
                  title: o.note,
                  action: (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTab("interfaces")}
                    >
                      Open Interfaces
                    </Button>
                  ),
                },
              ]
            : []
        }
      />
      <div className="grid gap-4 max-md:px-4 max-md:pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border p-6 max-md:p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-body font-medium">DNS servers</h2>
            <p className="text-body-sm text-muted-foreground">
              {o.editable
                ? o.note || "Where this server looks names up."
                : "What /etc/resolv.conf says now."}{" "}
              {o.file && o.editable && (
                <>
                  Saved to{" "}
                  <code className="font-mono text-caption">{o.file}</code>.
                </>
              )}
            </p>
          </div>
          <Field label="Servers" hint="In order: the first one is asked first.">
            {() => (
              <ListEdit
                values={servers}
                onChange={setServers}
                placeholder="1.1.1.1"
                addLabel="Add a server"
                inputMode="decimal"
                check={isIP}
                problem="Not an IP address"
                disabled={!editable}
              />
            )}
          </Field>
          <Field
            label="Search domains"
            hint="A short name like db also tries db.<domain>."
          >
            {() => (
              <ListEdit
                values={search}
                onChange={setSearch}
                placeholder="corp.lan"
                addLabel="Add a domain"
                check={isHostname}
                problem="Not a domain"
                disabled={!editable}
              />
            )}
          </Field>
          {editable && (
            <div className="flex flex-wrap items-center gap-2">
              {noServer && (
                <span className="text-caption text-destructive">
                  Keep at least one server: without one the server can't look
                  names up.
                </span>
              )}
              <div className="ms-auto flex gap-2">
                <Button
                  variant="outline"
                  disabled={!dirty}
                  onClick={() => {
                    setServers(o.servers)
                    setSearch(o.search)
                  }}
                >
                  Discard
                </Button>
                <Button
                  disabled={!dirty || bad || noServer || write.isPending}
                  onClick={() =>
                    write.mutate(
                      {
                        kind: "dns",
                        body: { revision: o.revision, servers: s, search: d },
                      },
                      {
                        onSuccess: () => toast.success("DNS settings saved"),
                        onError: (e) =>
                          e.status !== 409 && toast.error(e.message),
                      },
                    )
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </section>
        <aside className="flex min-w-0 flex-col gap-4">
          <LookupCard servers={o.in_use} />
          {o.links.length > 0 && (
            <section className="flex flex-col gap-3 rounded-2xl border border-border p-6 max-md:p-4">
              <h2 className="text-body font-medium">In use per interface</h2>
              <ul className="flex flex-col gap-2">
                {o.links.map((l) => (
                  <li key={l.name} className="flex min-w-0 flex-col">
                    <span className="text-body-sm font-medium">{l.name}</span>
                    <span className="truncate font-mono text-caption text-muted-foreground">
                      {l.servers.join(", ") || "—"}
                      {l.search.length > 0 && ` · ${l.search.join(" ")}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}

function LookupCard({ servers }: { servers: string[] }) {
  const { server, can } = useServerPage()
  const r = useResolveName(server.id)
  const [name, setName] = useState("ubuntu.com")
  const [via, setVia] = useState("")
  if (!can("operator")) return null
  const res = r.data
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border p-6 max-md:p-4">
      <h2 className="text-body font-medium">Try a lookup</h2>
      <p className="text-caption text-muted-foreground">
        Asked from the server
        {servers.length > 0 && ` (it uses ${servers.join(", ")})`}. Pick a
        server to ask only that one.
      </p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (isHostname(name.trim()))
            r.mutate({ name: name.trim(), server: via || undefined })
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-mono"
          aria-label="Name"
          autoCapitalize="off"
        />
        <Input
          value={via}
          onChange={(e) => setVia(e.target.value)}
          placeholder="Ask this server only (optional)"
          className="font-mono"
          aria-label="DNS server"
          inputMode="decimal"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={r.isPending || (via !== "" && !isIP(via))}
        >
          {r.isPending ? "Looking up…" : "Look up"}
        </Button>
      </form>
      {res && (
        <p
          className={cn(
            "text-body-sm",
            res.ok ? "text-success" : "text-destructive",
          )}
        >
          {res.ok
            ? `${res.answers.join(", ")} in ${res.took_ms} ms`
            : res.error}
        </p>
      )}
    </section>
  )
}
