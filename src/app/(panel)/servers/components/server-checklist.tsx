"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { SearchBox } from "../[id]/components/parts"
import { useServers } from "../api"

// Ticks servers, across searches: what's ticked stays ticked when the search
// hides it, so the map holds their names too.
export function ServerChecklist({
  value,
  onChange,
  phone,
  canPick,
}: {
  value: Map<string, string>
  onChange: (servers: Map<string, string>) => void
  phone: boolean
  // Servers this choice can't apply to aren't offered.
  canPick?: (server: Server) => boolean
}) {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])
  const list = useServers({ q: query || undefined, limit: 100, sort: "name" })
  const all = list.data?.items ?? []
  const items = canPick ? all.filter(canPick) : all
  const allOn = items.length > 0 && items.every((s) => value.has(s.id))

  const toggleAll = () => {
    const servers = new Map(value)
    for (const s of items) {
      if (allOn) servers.delete(s.id)
      else servers.set(s.id, s.name)
    }
    onChange(servers)
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border p-2">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search servers"
          label="Search servers"
          className="min-w-0 flex-1 md:w-auto"
        />
        {items.length > 1 && (
          <Button
            variant="ghost"
            className="h-11 shrink-0 text-muted-foreground md:h-9"
            onClick={toggleAll}
          >
            {allOn ? "Untick all" : "Tick all"}
          </Button>
        )}
      </div>
      <Checklist
        empty={query ? "No server matches." : "There are no servers yet."}
        items={items.map((s) => ({
          id: s.id,
          label: s.name,
          meta: s.host,
          status: s.status,
        }))}
        checked={(id) => value.has(id)}
        onToggle={(id, on) => {
          const servers = new Map(value)
          if (on) servers.set(id, items.find((s) => s.id === id)?.name ?? "")
          else servers.delete(id)
          onChange(servers)
        }}
        loading={list.isPending}
        tall={!phone}
      />
      {list.data && list.data.total > all.length && (
        <p className="border-t border-border px-4 py-2 text-caption text-ash">
          Showing {all.length} of {list.data.total}. Search to find the rest.
        </p>
      )}
    </>
  )
}

export type CheckItem = {
  id: string
  label: string
  meta?: string
  depth?: number
  status?: string
}

export function Checklist({
  items,
  checked,
  onToggle,
  empty,
  loading,
  tall,
}: {
  items: CheckItem[]
  checked: (id: string) => boolean
  onToggle: (id: string, on: boolean) => void
  empty: string
  loading?: boolean
  tall?: boolean
}) {
  if (loading) {
    return (
      <p className="px-4 py-6 text-body-sm text-muted-foreground">Loading…</p>
    )
  }
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-body-sm text-muted-foreground">{empty}</p>
    )
  }
  return (
    <ul
      className={cn(
        "divide-y divide-border overflow-y-auto",
        tall ? "max-h-72" : "max-h-[45dvh]",
      )}
    >
      {items.map((item) => {
        const on = checked(item.id)
        return (
          <li key={item.id}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
            <label
              className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-subtle md:min-h-10"
              style={
                item.depth
                  ? { paddingInlineStart: 16 + item.depth * 20 }
                  : undefined
              }
            >
              <Checkbox
                checked={on}
                onCheckedChange={(v) => onToggle(item.id, !!v)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-medium">
                  {item.label}
                </span>
                {item.meta && (
                  <span className="block truncate text-caption text-ash">
                    {item.meta}
                  </span>
                )}
              </span>
              {item.status && item.status !== "online" && (
                <span className="shrink-0 text-caption text-muted-foreground">
                  {statusWord(item.status)}
                </span>
              )}
            </label>
          </li>
        )
      })}
    </ul>
  )
}

function statusWord(s: string) {
  switch (s) {
    case "unknown":
      return "Not checked"
    case "unreachable":
      return "Unreachable"
    case "auth_failed":
      return "Login failed"
    case "host_key_mismatch":
      return "Key mismatch"
    default:
      return s
  }
}
