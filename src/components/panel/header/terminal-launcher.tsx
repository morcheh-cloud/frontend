"use client"

import { useQuery } from "@tanstack/react-query"
import { Search, SquareTerminal, Star } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { sectionHref } from "@/app/(panel)/servers/[id]/components/sections"
import { OsTile, StatusDot } from "@/app/(panel)/servers/components/meta"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDebounced } from "@/hooks/useDebounced"
import { api } from "@/lib/api"
import type { Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useWorkspace } from "../workspace"
import { HeaderIcon, headerIconClass } from "./header-icon"

// The header's terminal button: open a shell on any server in two clicks.
// Shows the servers whose terminal was opened from here lately and the
// favourites; typing searches the workspace. Only servers this person may
// open a terminal on (Engineer) are listed.

const RECENT = "morche.header.terminals"

type Recent = { id: string; workspace: string }

function readRecent(): Recent[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT) ?? "[]")
    return Array.isArray(v) ? v.filter((r) => r?.id && r?.workspace) : []
  } catch {
    return []
  }
}

function rememberRecent(entry: Recent) {
  try {
    const list = [entry, ...readRecent().filter((r) => r.id !== entry.id)]
    localStorage.setItem(RECENT, JSON.stringify(list.slice(0, 5)))
  } catch {}
}

export function TerminalLauncher() {
  const [open, setOpen] = useState(false)
  const { workspace } = useWorkspace()
  const ws = workspace?.id
  if (!ws) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <HeaderIcon
        label="Open a terminal"
        render={<PopoverTrigger className={headerIconClass} />}
      >
        <SquareTerminal />
      </HeaderIcon>
      <PopoverContent align="end" className="w-80 gap-0 overflow-hidden p-0">
        {open && <Launcher workspace={ws} onDone={() => setOpen(false)} />}
      </PopoverContent>
    </Popover>
  )
}

function Launcher({
  workspace,
  onDone,
}: {
  workspace: string
  onDone: () => void
}) {
  const router = useRouter()
  const { serverLevel } = useAccess()
  const [q, setQ] = useState("")
  const query = useDebounced(q.trim(), 150)
  const [recent, setRecent] = useState<Recent[]>([])
  useEffect(() => setRecent(readRecent()), [])

  const canShell = (s: Server) =>
    atLeast(serverLevel(s.id, s.workspace_id), "engineer")

  const found = useQuery({
    queryKey: ["servers", "list", { q: query, limit: 8 }],
    queryFn: () => api.servers.listServers({ q: query, limit: 8 }),
    enabled: !!query,
  })
  const favorites = useQuery({
    queryKey: ["servers", "list", { favorites: true, limit: 20 }],
    queryFn: () => api.servers.listServers({ favorites: true, limit: 20 }),
    enabled: !query,
  })
  // Fills the list when few servers are recent or starred.
  const some = useQuery({
    queryKey: ["servers", "list", { limit: 8 }],
    queryFn: () => api.servers.listServers({ limit: 8 }),
    enabled: !query,
  })
  const recentIds = recent
    .filter((r) => r.workspace === workspace)
    .map((r) => r.id)
  const recentServers = useQuery({
    queryKey: ["header-terminals", recentIds],
    queryFn: () =>
      Promise.all(
        recentIds.map((id) => api.servers.getServer(id).catch(() => null)),
      ),
    enabled: !query && recentIds.length > 0,
  })

  const sections: { label: string; items: Server[] }[] = query
    ? [{ label: "Servers", items: (found.data?.items ?? []).filter(canShell) }]
    : (() => {
        const recents = (recentServers.data ?? [])
          .filter((s): s is Server => !!s)
          .filter(canShell)
        const seen = new Set(recents.map((s) => s.id))
        const favs = (favorites.data?.items ?? [])
          .filter(canShell)
          .filter((s) => !seen.has(s.id))
          .slice(0, 6)
        for (const s of favs) seen.add(s.id)
        const room = Math.max(0, 6 - recents.length - favs.length)
        const rest = (some.data?.items ?? [])
          .filter(canShell)
          .filter((s) => !seen.has(s.id))
          .slice(0, room)
        return [
          { label: "Recent", items: recents },
          { label: "Favorites", items: favs },
          { label: "Servers", items: rest },
        ].filter((s) => s.items.length > 0)
      })()

  const all = sections.flatMap((s) => s.items)
  const loading = query
    ? found.isPending
    : favorites.isPending ||
      some.isPending ||
      (recentIds.length > 0 && recentServers.isPending)

  const pick = (s: Server) => {
    rememberRecent({ id: s.id, workspace })
    onDone()
  }

  return (
    <>
      <div className="relative border-b border-border p-2">
        <Search className="pointer-events-none absolute start-4.5 top-1/2 size-4 -translate-y-1/2 text-ash" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !all[0]) return
            e.preventDefault()
            pick(all[0])
            router.push(sectionHref(all[0].id, "terminal"))
          }}
          placeholder="Find a server…"
          aria-label="Find a server"
          autoFocus={matchMedia("(pointer: fine)").matches}
          className="h-9 border-0 bg-subtle ps-8 shadow-none focus-visible:ring-0 md:h-9"
        />
      </div>
      <div className="max-h-[60vh] overflow-y-auto py-1">
        {loading ? (
          <p className="px-4 py-6 text-center text-body-sm text-muted-foreground">
            Loading…
          </p>
        ) : all.length === 0 ? (
          <Empty query={query} />
        ) : (
          sections.map((section) => (
            <div key={section.label} className="py-1">
              <p className="px-4 pt-1 pb-1.5 font-label text-caption tracking-label text-ash uppercase">
                {section.label}
              </p>
              {section.items.map((s) => (
                <ServerRow key={s.id} server={s} onPick={() => pick(s)} />
              ))}
            </div>
          ))
        )}
      </div>
      <Link
        href="/servers"
        onClick={onDone}
        className="border-t border-border px-4 py-2.5 text-center text-body-sm text-brand outline-none hover:bg-muted focus-visible:bg-muted"
      >
        All servers
      </Link>
    </>
  )
}

function ServerRow({ server, onPick }: { server: Server; onPick: () => void }) {
  const offline = server.status !== "online" && server.status !== "unknown"
  return (
    <Link
      href={sectionHref(server.id, "terminal")}
      onClick={onPick}
      className="group flex items-center gap-3 px-4 py-2 outline-none hover:bg-muted focus-visible:bg-muted"
    >
      <span className="relative shrink-0">
        <OsTile os={server.os} className="size-8" />
        <StatusDot
          status={server.status}
          className="absolute -end-0.5 -bottom-0.5 ring-2 ring-popover"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span dir="auto" className="truncate text-body-sm font-medium">
            {server.name}
          </span>
          {server.favorite && (
            <Star className="size-3 shrink-0 fill-current text-ash" />
          )}
        </span>
        <span
          className={cn(
            "truncate text-caption",
            offline ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {offline ? "Can't connect right now" : server.host}
        </span>
      </span>
      <SquareTerminal className="size-4 shrink-0 text-ash opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </Link>
  )
}

function Empty({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
      <p className="text-body-sm font-medium">
        {query ? "No server matches" : "Nothing here yet"}
      </p>
      <p className="text-caption text-muted-foreground">
        {query
          ? "Only servers you can open a terminal on are listed."
          : "Search for a server, or star one to keep it here."}
      </p>
    </div>
  )
}
