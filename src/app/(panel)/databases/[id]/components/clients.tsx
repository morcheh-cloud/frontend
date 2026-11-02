"use client"

import { Copy } from "lucide-react"
import { useState } from "react"

import {
  Facts,
  SearchBox,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { useOpen } from "@/hooks/useOpen"
import type { DatabaseClient } from "@/lib/services"
import { useDashboardActions } from "./dashboard-actions"
import { num } from "./format"
import { NoSnapshot, NotesFor, Panel, Rows, Tag, useDashboard } from "./parts"

type Show = "all" | "new"

const list = (xs: string[]) => (xs.length ? xs.join(", ") : "—")

// Who is connected, grouped by address: which logins, databases and apps
// each one uses. "New" = an address that first showed up in the last day.
export function ClientsTab() {
  const { snapshot: s, phone } = useDashboard()
  const a = useDashboardActions()
  const [q, setQ] = useState("")
  const [show, setShow] = useState<Show>("all")
  const [open, setOpen] = useOpen("database-client-sheet")
  const [picked, setPicked] = useState<DatabaseClient | null>(null)
  if (!s) return <NoSnapshot />

  const fresh = s.clients.filter((c) => c.new).length
  const needle = q.trim().toLowerCase()
  const rows = s.clients
    .filter((c) => show === "all" || c.new)
    .filter(
      (c) =>
        !needle ||
        [c.address, ...c.users, ...c.databases, ...c.apps]
          .join(" ")
          .toLowerCase()
          .includes(needle),
    )
    .sort((x, y) => Number(y.new) - Number(x.new) || y.total - x.total)

  const filters = (
    <Segmented
      label="Show"
      items={[
        { value: "all", label: `All ${s.clients.length}` },
        { value: "new", label: `New ${fresh}` },
      ]}
      value={show}
      onChange={setShow}
    />
  )
  const search = (
    <SearchBox
      value={q}
      onChange={setQ}
      placeholder="Search address, user, app"
      label="Search clients"
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )

  return (
    <div className="flex flex-col md:gap-4">
      {phone ? (
        <div className="flex flex-col gap-3 px-4 pt-3">
          {search}
          <div>{filters}</div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {search}
          {filters}
          <span className="ms-auto text-caption text-ash">
            {num(s.connections.total)} connections from {s.clients.length}{" "}
            {s.clients.length === 1 ? "address" : "addresses"}
          </span>
        </div>
      )}
      <NotesFor notes={s.notes} areas={["sessions"]} />
      <Panel
        title="Clients"
        caption={
          rows.length !== s.clients.length
            ? `${rows.length} of ${s.clients.length}`
            : undefined
        }
        flush
      >
        <Rows
          label="Clients"
          rows={rows}
          rowKey={(c) => c.address}
          empty={
            s.clients.length
              ? "Nothing matches."
              : "Nobody else is connected right now."
          }
          cols={[
            {
              key: "addr",
              label: "Address",
              cell: (c) => (
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-mono text-caption">
                    {c.address || "local socket"}
                  </span>
                  {c.new && <Tag tone="brand">New</Tag>}
                </span>
              ),
            },
            {
              key: "total",
              label: "Connections",
              end: true,
              cell: (c) => num(c.total),
            },
            {
              key: "active",
              label: "Active",
              end: true,
              cell: (c) => num(c.active),
            },
            { key: "users", label: "Users", cell: (c) => list(c.users) },
            {
              key: "dbs",
              label: "Databases",
              className: "hidden @3xl:table-cell",
              cell: (c) => list(c.databases),
            },
            {
              key: "apps",
              label: "Apps",
              className: "hidden @4xl:table-cell w-full",
              cell: (c) => list(c.apps),
            },
          ]}
          phone={(c) => ({
            title: (
              <span className="flex items-center gap-2">
                <span className="truncate font-mono text-body-sm">
                  {c.address || "local socket"}
                </span>
                {c.new && <Tag tone="brand">New</Tag>}
              </span>
            ),
            sub: [...c.users, ...c.apps].join(" · ") || undefined,
            end: `${num(c.active)}/${num(c.total)}`,
          })}
          onOpen={(c) => {
            setPicked(c)
            setOpen(true)
          }}
        />
      </Panel>
      {picked && (
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title={picked.address || "Local socket"}
        >
          <Facts
            items={[
              { label: "Connections", value: num(picked.total) },
              { label: "Active", value: num(picked.active) },
              { label: "Users", value: list(picked.users), wide: true },
              { label: "Databases", value: list(picked.databases), wide: true },
              { label: "Apps", value: list(picked.apps), wide: true },
            ]}
          />
          {picked.address && (
            <SheetItems
              groups={[
                [
                  {
                    key: "copy",
                    label: "Copy address",
                    icon: <Copy />,
                    onSelect: () => a.copy(picked.address, "Address"),
                  },
                ],
              ]}
              onOpenChange={setOpen}
            />
          )}
        </BottomSheet>
      )}
    </div>
  )
}
