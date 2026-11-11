"use client"

import {
  CircleStop,
  Copy,
  Pause,
  Play,
  Search as SearchIcon,
  Unplug,
} from "lucide-react"
import { useState } from "react"

import {
  Facts,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { DatabaseActivity, DatabaseSnapshot } from "@/lib/services"
import { cn } from "@/lib/utils"
import { killKinds, useDashboardActions } from "./dashboard-actions"
import { num, secs } from "./format"
import { NoSnapshot, NotesFor, Panel, Rows, Tag, useDashboard } from "./parts"

type Show = "all" | "active" | "idle_tx" | "waiting"

const isIdleTx = (s: DatabaseActivity) => /idle in transaction/i.test(s.state)
const isActive = (s: DatabaseActivity) =>
  !isIdleTx(s) && !/^(idle|sleep|sleeping)$/i.test(s.state)

// Who is connected and what they run. Updates every few seconds; "Hold"
// freezes the list to read or act on a row that would otherwise move.
export function ActivityTab() {
  const { snapshot: live, phone } = useDashboard()
  const [held, setHeld] = useState<DatabaseSnapshot | null>(null)
  const [show, setShow] = useState<Show>("all")
  const [view, setView] = useState<"list" | "tree">("list")
  const [q, setQ] = useState("")
  const s = held ?? live
  if (!s) return <NoSnapshot />

  const c = s.connections
  const sessions = s.sessions
  const blocking = sessions.some((x) => x.blocked_by.length > 0)
  const needle = q.trim().toLowerCase()
  const filtered = sessions.filter((x) => {
    if (show === "active" && !isActive(x)) return false
    if (show === "idle_tx" && !isIdleTx(x)) return false
    if (show === "waiting" && x.blocked_by.length === 0 && !x.wait) return false
    if (!needle) return true
    return [x.id, x.user, x.client, x.app, x.database, x.state, x.query]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  })

  const hold = (
    <Button
      variant="outline"
      size={phone ? "icon-lg" : "icon"}
      aria-label={held ? "Resume updates" : "Hold updates"}
      title={held ? "Resume updates" : "Hold updates"}
      aria-pressed={!!held}
      onClick={() => setHeld(held ? null : (live ?? null))}
    >
      {held ? <Play /> : <Pause />}
    </Button>
  )
  const showItems = [
    { value: "all", label: `All · ${num(sessions.length)}` },
    { value: "active", label: `Active · ${num(c.active)}` },
    { value: "idle_tx", label: `Idle in transaction · ${num(c.idle_in_tx)}` },
    { value: "waiting", label: `Waiting · ${num(c.blocked)}` },
  ] as const
  const caption = (
    <span className="text-caption text-ash">
      {held
        ? "Held — not updating"
        : `${num(c.total)} connected${c.max ? ` of ${num(c.max)}` : ""}${c.reserved ? ` · ${num(c.reserved)} reserved for admins` : ""}`}
    </span>
  )

  return (
    <div className="flex flex-col md:gap-4">
      {phone ? (
        <div className="flex flex-col gap-3 pt-3">
          <div className="flex items-center gap-2 px-4">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Search sessions"
              label="Search sessions"
              className="min-w-0 flex-1"
            />
            {hold}
          </div>
          <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
            <Segmented
              label="Show"
              items={showItems}
              value={show}
              onChange={setShow}
            />
          </div>
          <div className="px-4">{caption}</div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="View"
            items={[
              { value: "list", label: "Sessions" },
              { value: "tree", label: "Who blocks whom" },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "list" && (
            <>
              <SearchBox
                value={q}
                onChange={setQ}
                placeholder="Search user, client, query…"
                label="Search sessions"
              />
              <Segmented
                label="Show"
                items={showItems}
                value={show}
                onChange={setShow}
              />
            </>
          )}
          <div className="ms-auto flex items-center gap-3">
            {caption}
            {hold}
          </div>
        </div>
      )}
      <NotesFor notes={s.notes} areas={["sessions"]} />
      {(phone || view === "tree") && blocking && (
        <BlockingTree sessions={sessions} />
      )}
      {(phone || view === "tree") && !blocking && !phone && (
        <Panel title="Who blocks whom">
          <p className="text-body-sm text-muted-foreground">
            No session is waiting on another one's lock right now.
          </p>
        </Panel>
      )}
      {(phone || view === "list") && (
        <Sessions sessions={filtered} total={sessions.length} />
      )}
      {s.waits.length > 0 && (phone || view === "list") && (
        <Panel title="What sessions wait on" flush>
          <Rows
            label="Waits"
            rows={[...s.waits].sort((a, b) => b.count - a.count)}
            rowKey={(w) => w.event}
            cols={[
              {
                key: "event",
                label: "Wait",
                cell: (w) => (
                  <span className="font-mono text-caption">{w.event}</span>
                ),
              },
              {
                key: "count",
                label: "Sessions",
                end: true,
                cell: (w) => num(w.count),
              },
            ]}
            phone={(w) => ({ title: w.event, end: num(w.count) })}
            empty="Nothing is waiting."
          />
        </Panel>
      )}
    </div>
  )
}

function useSessionMenu() {
  const { database: d, engineer } = useDashboard()
  const a = useDashboardActions()
  const kinds = killKinds(d.engine)
  return (x: DatabaseActivity): Item[][] => {
    const first: Item[] = []
    if (x.query) {
      if (engineer && d.engine !== "redis") {
        first.push({
          key: "explain",
          label: "Explain…",
          icon: <SearchIcon />,
          onSelect: () => a.explain({ query: x.query, database: x.database }),
        })
      }
      first.push({
        key: "copy",
        label: "Copy query",
        icon: <Copy />,
        onSelect: () => a.copy(x.query, "Query"),
      })
    }
    const stop: Item[] = []
    if (engineer) {
      if (kinds.statement) {
        stop.push({
          key: "cancel",
          label: "Cancel statement…",
          icon: <CircleStop />,
          disabled: x.ours || !isActive(x),
          onSelect: () => a.kill(x, false),
        })
      }
      stop.push({
        key: "close",
        label: `${kinds.connection}…`,
        icon: <Unplug />,
        destructive: true,
        disabled: x.ours,
        onSelect: () => a.kill(x, true),
      })
    }
    return [first, stop]
  }
}

function Sessions({
  sessions,
  total,
}: {
  sessions: DatabaseActivity[]
  total: number
}) {
  const { engineer } = useDashboard()
  const menu = useSessionMenu()
  const [open, setOpen] = useOpen("database-session-sheet")
  const [picked, setPicked] = useState<DatabaseActivity | null>(null)
  // Longest running first: that's what someone opens this to find.
  const rows = [...sessions].sort(
    (a, b) =>
      (b.seconds ?? -1) - (a.seconds ?? -1) ||
      (b.tx_seconds ?? -1) - (a.tx_seconds ?? -1),
  )

  return (
    <Panel
      title="Sessions"
      caption={
        total !== sessions.length ? `${sessions.length} of ${total}` : undefined
      }
      flush
    >
      <Rows
        label="Sessions"
        rows={rows}
        rowKey={(x) => x.id}
        empty={total ? "No session matches." : "No sessions."}
        cols={[
          {
            key: "id",
            label: "ID",
            cell: (x) => (
              <span className="flex items-center gap-1.5 font-mono text-caption">
                {x.id}
                {x.ours && <Tag>Morche</Tag>}
              </span>
            ),
          },
          {
            key: "who",
            label: "Who",
            cell: (x) => (
              <span className="block max-w-56 min-w-0">
                <span className="block truncate">
                  {x.user || "—"}
                  {x.client && (
                    <span className="text-muted-foreground"> @ {x.client}</span>
                  )}
                </span>
                {x.app && (
                  <span className="block truncate text-caption text-muted-foreground">
                    {x.app}
                  </span>
                )}
              </span>
            ),
          },
          {
            key: "db",
            label: "Database",
            className: "hidden @4xl:table-cell",
            cell: (x) => x.database || "—",
          },
          {
            key: "state",
            label: "State",
            cell: (x) => <SessionState session={x} />,
          },
          {
            key: "running",
            label: "Running",
            end: true,
            cell: (x) => (x.seconds != null ? secs(x.seconds) : "—"),
          },
          {
            key: "tx",
            label: "Transaction",
            end: true,
            className: "hidden @3xl:table-cell",
            cell: (x) => (x.tx_seconds != null ? secs(x.tx_seconds) : "—"),
          },
          {
            key: "query",
            label: "Statement",
            className: "w-full",
            cell: (x) =>
              x.query ? (
                <span
                  title={x.query}
                  className="line-clamp-2 font-mono text-caption break-all text-muted-foreground"
                >
                  {x.query}
                </span>
              ) : (
                <span className="text-caption text-ash">
                  {engineer ? "—" : "Hidden (needs Engineer)"}
                </span>
              ),
          },
          {
            key: "menu",
            label: "",
            cell: (x) => (
              <ItemMenu groups={menu(x)} label={`Session ${x.id} actions`} />
            ),
          },
        ]}
        phone={(x) => ({
          title: (
            <>
              {x.user || x.id}
              {x.client && (
                <span className="text-muted-foreground"> @ {x.client}</span>
              )}
            </>
          ),
          sub: x.query || x.state,
          end: x.seconds != null ? secs(x.seconds) : undefined,
        })}
        onOpen={(x) => {
          setPicked(x)
          setOpen(true)
        }}
      />
      {picked && (
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title={`Session ${picked.id}`}
        >
          <Facts
            items={[
              { label: "User", value: picked.user || "—" },
              { label: "Client", value: picked.client || "—" },
              { label: "Database", value: picked.database || "—" },
              { label: "App", value: picked.app || "—" },
              {
                label: "State",
                value: picked.state + (picked.wait ? ` · ${picked.wait}` : ""),
              },
              {
                label: "Running",
                value: picked.seconds != null ? secs(picked.seconds) : "—",
              },
              ...(picked.tx_seconds != null
                ? [
                    {
                      label: "Transaction open",
                      value: secs(picked.tx_seconds),
                    },
                  ]
                : []),
              ...(picked.blocked_by.length
                ? [
                    {
                      label: "Waiting for",
                      value: picked.blocked_by.join(", "),
                    },
                  ]
                : []),
              ...(picked.query
                ? [
                    {
                      label: "Statement",
                      value: picked.query,
                      wide: true,
                      mono: true,
                    },
                  ]
                : []),
            ]}
          />
          <SheetItems groups={menu(picked)} onOpenChange={setOpen} />
        </BottomSheet>
      )}
    </Panel>
  )
}

function SessionState({ session: x }: { session: DatabaseActivity }) {
  const waiting = x.blocked_by.length > 0
  const idleTx = isIdleTx(x)
  return (
    <span className="flex flex-col">
      <span
        className={cn(
          "whitespace-nowrap",
          waiting && "text-warning",
          idleTx && "text-warning",
        )}
      >
        {waiting ? `Waiting on ${x.blocked_by.join(", ")}` : x.state || "—"}
      </span>
      {x.wait && (
        <span className="font-mono text-caption whitespace-nowrap text-muted-foreground">
          {x.wait}
        </span>
      )}
    </span>
  )
}

type Node = { session: DatabaseActivity; children: Node[] }

// Chains of waiting: the session holding the lock on top, those stuck
// behind it below. Roots are the ones nobody blocks.
function blockingTree(sessions: DatabaseActivity[]): Node[] {
  const byId = new Map(sessions.map((s) => [s.id, s]))
  const kids = new Map<string, DatabaseActivity[]>()
  for (const s of sessions) {
    for (const b of s.blocked_by) {
      kids.set(b, [...(kids.get(b) ?? []), s])
    }
  }
  const build = (s: DatabaseActivity, seen: Set<string>): Node => {
    seen.add(s.id)
    return {
      session: s,
      children: (kids.get(s.id) ?? [])
        .filter((k) => !seen.has(k.id))
        .map((k) => build(k, seen)),
    }
  }
  const roots = sessions.filter(
    (s) => kids.has(s.id) && s.blocked_by.every((b) => !byId.has(b)),
  )
  const seen = new Set<string>()
  return roots.map((r) => build(r, seen))
}

function BlockingTree({ sessions }: { sessions: DatabaseActivity[] }) {
  const menu = useSessionMenu()
  const roots = blockingTree(sessions)
  const count = (n: Node): number =>
    n.children.length + n.children.reduce((t, c) => t + count(c), 0)
  return (
    <Panel
      title="Who blocks whom"
      caption={`${roots.length} ${roots.length === 1 ? "session holds" : "sessions hold"} others up`}
      flush
    >
      <ul className="divide-y divide-border">
        {roots.map((n) => (
          <li key={n.session.id} className="py-2">
            <p className="px-5 pb-1 text-caption text-warning max-md:px-4">
              Holding up {count(n)} {count(n) === 1 ? "session" : "sessions"}
            </p>
            <TreeNode node={n} depth={0} menu={menu} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function TreeNode({
  node,
  depth,
  menu,
}: {
  node: Node
  depth: number
  menu: (x: DatabaseActivity) => Item[][]
}) {
  const { phone } = useDashboard()
  const x = node.session
  return (
    <>
      <div
        className="flex items-start gap-3 py-1.5 pe-5 text-body-sm max-md:pe-4"
        style={{ paddingInlineStart: `${1.25 + depth * 1.5}rem` }}
      >
        {depth > 0 && (
          <span aria-hidden className="text-ash">
            └
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-caption">{x.id}</span>
            <span>
              {x.user}
              {x.client && (
                <span className="text-muted-foreground"> @ {x.client}</span>
              )}
            </span>
            <span className="text-caption text-muted-foreground">
              {x.state}
              {x.seconds != null && ` · ${secs(x.seconds)}`}
              {x.tx_seconds != null && ` · transaction ${secs(x.tx_seconds)}`}
            </span>
          </span>
          {x.query && (
            <span className="line-clamp-2 font-mono text-caption break-all text-muted-foreground">
              {x.query}
            </span>
          )}
        </span>
        {/* Phones act from the session list below, through its sheet. */}
        {!phone && (
          <ItemMenu groups={menu(x)} label={`Session ${x.id} actions`} />
        )}
      </div>
      {node.children.map((c) => (
        <TreeNode key={c.session.id} node={c} depth={depth + 1} menu={menu} />
      ))}
    </>
  )
}
