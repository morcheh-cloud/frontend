"use client"

import { Plus, Search, Trash2, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { HostEntry, HostsOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useConfigWrite,
  useHosts,
  useResolveName,
} from "../../components/config/api"
import { isHostname, isIP } from "../../components/config/fields"
import { HistoryButton } from "../../components/config/history"
import { Notices } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { ConfigBar, NetworkTabs } from "./network-view"
import { NotYet, RefreshButton } from "./refresh"

type Row = HostEntry & { key: number; namesText: string }

let seq = 0
const toRows = (es: HostEntry[]): Row[] =>
  es.map((e) => ({ ...e, key: ++seq, namesText: e.names.join(" ") }))

function rowProblem(r: Row) {
  if (r.address.trim() && !isIP(r.address.trim())) return "Not an IP address"
  const names = r.namesText.split(/\s+/).filter(Boolean)
  if (r.address.trim() && names.length === 0) return "Give at least one name"
  const bad = names.find((n) => !isHostname(n))
  if (bad) return `${bad} is not a valid name`
  return ""
}

export function HostsTab() {
  const { server } = useServerPage()
  const q = useHosts(server.id)
  const refresh = (
    <RefreshButton busy={q.isFetching} onClick={() => q.refetch()} />
  )
  if (!q.data)
    return (
      <>
        <ConfigBar tabs={<NetworkTabs />} actions={refresh} />
        <NotYet error={q.error} what="/etc/hosts" retry={() => q.refetch()} />
      </>
    )
  // Re-mount the editor when the file changes on the server.
  return <HostsEditor key={q.data.revision} o={q.data} refresh={refresh} />
}

function HostsEditor({
  o,
  refresh,
}: {
  o: HostsOverview
  refresh: React.ReactNode
}) {
  const { server, can, phone } = useServerPage()
  const write = useConfigWrite(server.id)
  const [rows, setRows] = useState(() => toRows(o.entries))
  const [showSystem, setShowSystem] = useState(false)
  const editable = can("engineer") && o.writable
  const dirty =
    JSON.stringify(
      rows.map(({ key, namesText, ...e }) => ({
        ...e,
        names: namesText.split(/\s+/).filter(Boolean),
      })),
    ) !== JSON.stringify(o.entries)
  const problems = rows.map(rowProblem)
  const invalid = problems.some(Boolean)

  const set = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const save = () =>
    write.mutate(
      {
        kind: "hosts",
        body: {
          revision: o.revision,
          entries: rows
            .filter((r) => r.address.trim())
            .map(({ key, namesText, ...e }) => ({
              ...e,
              address: e.address.trim(),
              names: namesText.split(/\s+/).filter(Boolean),
            })),
        },
      },
      {
        onSuccess: () => toast.success("Saved /etc/hosts"),
        onError: (e) => e.status !== 409 && toast.error(e.message),
      },
    )

  const visible = rows.filter((r) => showSystem || !r.system)
  const hidden = rows.length - visible.length

  return (
    <>
      <ConfigBar
        tabs={<NetworkTabs />}
        status={
          <>
            {o.entries.filter((e) => !e.system).length} entries · this machine
            is {o.hostname}
          </>
        }
        actions={
          <>
            <ResolveButton />
            <HistoryButton area="hosts" />
            {refresh}
            {editable && (
              <Button
                size={phone ? "icon-lg" : "default"}
                className="md:h-9"
                aria-label="Add entry"
                onClick={() =>
                  setRows((rs) => [
                    ...rs,
                    {
                      key: ++seq,
                      line: 0,
                      address: "",
                      names: [],
                      namesText: "",
                      comment: "",
                      enabled: true,
                      system: false,
                    },
                  ])
                }
              >
                <Plus />
                {!phone && "Add entry"}
              </Button>
            )}
          </>
        }
      />
      <Notices
        notes={[
          ...o.problems.map((p, i) => ({ key: `p${i}`, title: p, warn: true })),
          ...(!o.writable
            ? [
                {
                  key: "ro",
                  title: "Read only: saving needs root or sudo on this server",
                },
              ]
            : []),
        ]}
      />
      <div className="flex flex-col rounded-2xl border border-border max-md:mx-4 max-md:mt-4">
        {!phone && (
          <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,14rem)_5.5rem] gap-3 border-b border-border px-4 py-2 font-label text-caption tracking-label text-ash uppercase">
            <span>Address</span>
            <span>Names</span>
            <span>Note</span>
            <span className="text-end">On</span>
          </div>
        )}
        {visible.length === 0 && (
          <p className="p-6 text-body-sm text-muted-foreground">
            No entries of your own yet. Add one to give a name to an address for
            this server only, without touching DNS.
          </p>
        )}
        {visible.map((r) => {
          const problem = problems[rows.indexOf(r)]
          return (
            <div
              key={r.key}
              className={cn(
                "grid min-w-0 gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,14rem)_5.5rem] md:items-center md:gap-3",
                !r.enabled && "opacity-60",
              )}
            >
              <Input
                aria-label="Address"
                placeholder="10.0.0.5"
                value={r.address}
                disabled={!editable}
                inputMode="decimal"
                className="font-mono"
                aria-invalid={problem.includes("address") || undefined}
                onChange={(e) => set(r.key, { address: e.target.value })}
              />
              <Input
                aria-label="Names"
                placeholder="db.internal db"
                value={r.namesText}
                disabled={!editable}
                autoCapitalize="off"
                spellCheck={false}
                className="font-mono"
                onChange={(e) => set(r.key, { namesText: e.target.value })}
              />
              <Input
                aria-label="Note"
                placeholder="What it is (optional)"
                value={r.comment}
                disabled={!editable}
                onChange={(e) => set(r.key, { comment: e.target.value })}
              />
              <div className="flex items-center justify-end gap-1">
                <Switch
                  aria-label="Use this entry"
                  checked={r.enabled}
                  disabled={!editable}
                  onCheckedChange={(v) => set(r.key, { enabled: v })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="max-md:size-11"
                  aria-label="Remove entry"
                  disabled={!editable}
                  onClick={() =>
                    setRows((rs) => rs.filter((x) => x.key !== r.key))
                  }
                >
                  <Trash2 />
                </Button>
              </div>
              {(problem || r.system) && (
                <span
                  className={cn(
                    "text-caption md:col-span-4",
                    problem ? "text-destructive" : "text-ash",
                  )}
                >
                  {problem ||
                    "The system needs this line; change it with care."}
                </span>
              )}
            </div>
          )
        })}
        {hidden > 0 && (
          <button
            type="button"
            className="px-4 py-3 text-start text-caption text-muted-foreground hover:text-foreground max-md:min-h-11"
            onClick={() => setShowSystem(true)}
          >
            Show {hidden} system lines (localhost, IPv6, this machine's name)
          </button>
        )}
      </div>
      {editable && dirty && (
        <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-md max-md:bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] max-md:mx-4">
          {invalid ? (
            <span className="flex items-center gap-2 text-body-sm text-destructive">
              <TriangleAlert className="size-4" />
              Fix the marked rows to save
            </span>
          ) : (
            <span className="text-body-sm text-muted-foreground">
              Unsaved changes to /etc/hosts
            </span>
          )}
          <div className="ms-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRows(toRows(o.entries))}
            >
              Discard
            </Button>
            <Button disabled={invalid || write.isPending} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

// What the server gets for a name, the way its programs would.
function ResolveButton() {
  const { server, can, phone } = useServerPage()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const r = useResolveName(server.id)
  if (!can("operator")) return null
  if (!open)
    return (
      <Button
        variant="outline"
        size={phone ? "icon-lg" : "default"}
        className="md:h-9"
        aria-label="Look up a name"
        onClick={() => setOpen(true)}
      >
        <Search />
        {!phone && "Look up"}
      </Button>
    )
  const res = r.data
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (isHostname(name.trim())) r.mutate({ name: name.trim() })
      }}
    >
      <Input
        autoFocus={!phone}
        placeholder="name to look up"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 w-44 font-mono"
        aria-label="Name to look up"
      />
      <Button
        type="submit"
        variant="outline"
        className="h-9"
        disabled={r.isPending}
      >
        Look up
      </Button>
      {res && (
        <span
          className={cn(
            "text-caption",
            res.ok ? "text-muted-foreground" : "text-destructive",
          )}
        >
          {res.ok
            ? `${res.answers.join(", ")} · ${res.source === "hosts" ? "from /etc/hosts" : "from DNS"} · ${res.took_ms} ms`
            : res.error}
        </span>
      )}
    </form>
  )
}
