"use client"

import { ShieldAlert } from "lucide-react"
import { useState } from "react"

import { SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import type { DatabaseFact, DatabaseSnapshot } from "@/lib/services"
import { num } from "./format"
import {
  NoSnapshot,
  NotesFor,
  Pairs,
  Panel,
  Rows,
  Tag,
  useDashboard,
} from "./parts"

// What the database is and how it's set up: version facts, security, logins
// and settings. All read from the database; nothing here changes it.
export function DetailsTab() {
  const { snapshot: s } = useDashboard()
  if (!s) return <NoSnapshot />
  return (
    <div className="flex flex-col md:gap-4">
      <NotesFor
        notes={s.notes}
        areas={["server", "settings", "users"]}
        className="max-md:mt-3"
      />
      <div className="grid items-start md:gap-4 @4xl:grid-cols-2">
        <About s={s} />
        <Security s={s} />
      </div>
      <FactGroups facts={s.facts} />
      <Users s={s} />
      <Settings s={s} />
    </div>
  )
}

function About({ s }: { s: DatabaseSnapshot }) {
  return (
    <Panel title="Server">
      <Pairs
        items={[
          { label: "Version", value: s.version },
          { label: "Edition", value: s.edition },
          {
            label: "Started",
            value: s.started_at && timeAgo(s.started_at),
          },
          { label: "Data folder", value: s.data_dir, mono: true },
          {
            label: "Details read",
            value: s.details_at ? timeAgo(s.details_at) : "Not yet",
          },
        ]}
      />
    </Panel>
  )
}

function Security({ s }: { s: DatabaseSnapshot }) {
  const x = s.security
  const yesNo = (v: boolean | null) => (v == null ? null : v ? "Yes" : "No")
  return (
    <Panel title="Security">
      <Pairs
        items={[
          {
            label: "Morcheh's connection encrypted",
            value:
              x.encrypted === false ? (
                <Tag tone="warning">No</Tag>
              ) : (
                yesNo(x.encrypted)
              ),
          },
          {
            label: "Clients without TLS",
            value:
              x.plain_clients == null ? null : x.plain_clients > 0 ? (
                <Tag tone="warning">{num(x.plain_clients)}</Tag>
              ) : (
                "None"
              ),
          },
          { label: "Listens on", value: x.listens_on, mono: true },
          {
            label: "Password required",
            value: x.auth_disabled ? <Tag tone="warning">No</Tag> : "Yes",
          },
          {
            label: "Admin logins",
            value: x.admins == null ? null : num(x.admins),
          },
          {
            label: "Logins without a password",
            value:
              x.no_password == null ? null : x.no_password > 0 ? (
                <Tag tone="warning">{num(x.no_password)}</Tag>
              ) : (
                "None"
              ),
          },
          {
            label: "Failed logins",
            value: x.failed_logins == null ? null : num(x.failed_logins),
          },
        ]}
      />
      {x.risks.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {x.risks.map((r) => (
            <li
              key={r}
              className="flex gap-2 rounded-lg bg-warning/10 px-3 py-2 text-body-sm"
            >
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              {r}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

// Engine-specific numbers, one panel per group.
function FactGroups({ facts }: { facts: DatabaseFact[] }) {
  if (facts.length === 0) return null
  const groups = new Map<string, DatabaseFact[]>()
  for (const f of facts)
    groups.set(f.group, [...(groups.get(f.group) ?? []), f])
  return (
    <div className="grid items-start md:gap-4 @4xl:grid-cols-2 @7xl:grid-cols-3">
      {[...groups].map(([group, items]) => (
        <Panel key={group} title={group}>
          <Pairs
            items={items.map((f) => ({ label: f.label, value: f.value }))}
          />
        </Panel>
      ))}
    </div>
  )
}

function Users({ s }: { s: DatabaseSnapshot }) {
  if (s.users.length === 0) return null
  const users = [...s.users].sort(
    (a, b) => Number(b.admin) - Number(a.admin) || a.name.localeCompare(b.name),
  )
  const tags = (u: (typeof users)[number]) => (
    <span className="flex flex-wrap gap-1.5">
      {u.admin && <Tag tone="brand">Admin</Tag>}
      {u.no_password && <Tag tone="warning">No password</Tag>}
      {u.disabled && <Tag>Disabled</Tag>}
    </span>
  )
  return (
    <Panel
      title="Logins"
      caption={`${s.users.length} · ${s.users.filter((u) => u.admin).length} admin`}
      flush
    >
      <Rows
        label="Logins"
        rows={users}
        rowKey={(u) => u.name}
        empty=""
        cols={[
          {
            key: "name",
            label: "Login",
            cell: (u) => <span className="font-medium">{u.name}</span>,
          },
          { key: "tags", label: "", className: "w-full", cell: tags },
        ]}
        phone={(u) => ({ title: u.name, end: tags(u) })}
      />
    </Panel>
  )
}

function Settings({ s }: { s: DatabaseSnapshot }) {
  const [q, setQ] = useState("")
  if (s.settings.length === 0) return null
  const needle = q.trim().toLowerCase()
  const rows = s.settings.filter(
    (x) => !needle || `${x.name} ${x.value}`.toLowerCase().includes(needle),
  )
  return (
    <Panel
      title="Settings"
      caption={
        rows.length !== s.settings.length
          ? `${rows.length} of ${s.settings.length}`
          : `${s.settings.length}`
      }
      actions={
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search settings"
          label="Search settings"
          className="w-48 md:w-56"
        />
      }
      flush
    >
      <Rows
        label="Settings"
        rows={rows}
        rowKey={(x) => x.name}
        empty="Nothing matches."
        limit={40}
        cols={[
          {
            key: "name",
            label: "Name",
            cell: (x) => (
              <span className="font-mono text-caption">{x.name}</span>
            ),
          },
          {
            key: "value",
            label: "Value",
            className: "w-full",
            cell: (x) => (
              <span className="font-mono text-caption break-all">
                {x.value || "—"}
              </span>
            ),
          },
        ]}
        phone={(x) => ({
          title: <span className="font-mono text-body-sm">{x.name}</span>,
          sub: <span className="font-mono">{x.value || "—"}</span>,
        })}
      />
    </Panel>
  )
}
