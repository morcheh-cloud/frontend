"use client"

import { Plus, UsersRound } from "lucide-react"

import {
  Empty,
  ItemMenu,
  Loading,
  SearchBox,
  Segmented,
  SheetItems,
  StateDot,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useAuth } from "@/components/auth/auth"
import { BottomSheet } from "@/components/bottom-sheet"
import { PageHeader } from "@/components/panel/page-header"
import { Button } from "@/components/ui/button"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { PanelUser } from "@/lib/services"
import { useGroups, useMembers } from "../../api"
import { useMemberMenu, useMembersActions } from "./members-actions"
import {
  displayName,
  roleLabel,
  statusMeta,
  statusTabs,
  useMemberFilters,
} from "./meta"

export function MembersView() {
  const phone = useIsPhone()
  const a = useMembersActions()
  const { filters, setFilters } = useMemberFilters()
  const members = useMembers({
    status: filters.status === "all" ? undefined : filters.status,
    q: filters.q || undefined,
  })
  if (phone === null) return null

  const counts = new Map(
    (members.data?.counts ?? []).map((c) => [c.value, c.count]),
  )
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0)
  const tabs = statusTabs.map((t) => {
    const n = t.value === "all" ? total : (counts.get(t.value) ?? 0)
    return { value: t.value, label: n ? `${t.label} ${n}` : t.label }
  })
  const items = members.data?.items ?? []

  const add = (
    <Button className="max-md:h-11" onClick={a.add}>
      <Plus />
      Add member
    </Button>
  )
  const search = (
    <SearchBox
      value={filters.q}
      onChange={(q) => setFilters({ q: q || null })}
      placeholder="Search name, username, email…"
      label="Search members"
      className="w-full md:max-w-xs"
    />
  )
  const segmented = (
    <Segmented
      label="Status"
      items={tabs}
      value={filters.status}
      onChange={(status) =>
        setFilters({ status: status === "all" ? null : status })
      }
    />
  )

  return (
    <>
      <PageHeader
        title="Members"
        guide="access"
        description="Who can sign in, and what they can reach."
        actions={!phone && add}
      />
      {phone ? (
        <div className="flex flex-col gap-3 px-4 pt-4">
          <div className="flex items-center gap-2">
            {search}
            <Button
              size="icon-lg"
              aria-label="Add member"
              className="shrink-0 rounded-full"
              onClick={a.add}
            >
              <Plus className="size-5" />
            </Button>
          </div>
          <div className="-mx-4 overflow-x-auto px-4">{segmented}</div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-6 pt-5">
          {segmented}
          {search}
        </div>
      )}

      {members.isPending ? (
        <Loading phone={phone} />
      ) : members.isError ? (
        <p className="px-4 py-6 text-body-sm text-destructive md:px-6">
          {members.error.message}
        </p>
      ) : items.length === 0 ? (
        <Empty
          icon={UsersRound}
          title="Nobody here"
          body={
            filters.q || filters.status !== "all"
              ? "Try another search or status."
              : "Add the first member."
          }
        />
      ) : phone ? (
        <ul className="mt-2 divide-y divide-border border-y border-border">
          {items.map((u) => (
            <PhoneRow key={u.id} user={u} />
          ))}
        </ul>
      ) : (
        <div className="px-6 py-5">
          <Table items={items} />
        </div>
      )}
    </>
  )
}

function Table({ items }: { items: PanelUser[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border text-start text-caption text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 text-start font-normal">Name</th>
            <th className="px-4 py-2.5 text-start font-normal">Email</th>
            <th className="px-4 py-2.5 text-start font-normal">Role</th>
            <th className="px-4 py-2.5 text-start font-normal">Status</th>
            <th className="px-4 py-2.5 text-start font-normal">Groups</th>
            <th className="px-4 py-2.5 text-start font-normal">Last sign-in</th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((u) => (
            <TableRow key={u.id} user={u} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function useGroupNames(user: PanelUser) {
  const groups = useGroups()
  return (groups.data ?? [])
    .filter((g) => (user.group_ids ?? []).includes(g.id))
    .map((g) => g.name)
    .join(", ")
}

function TableRow({ user: u }: { user: PanelUser }) {
  const a = useMembersActions()
  const { user: me } = useAuth()
  const menu = useMemberMenu(u)
  const groups = useGroupNames(u)
  const state = statusMeta[u.status]
  const open = () => (u.status === "pending" ? a.manageAccess(u) : a.details(u))
  return (
    <tr className="h-14 hover:bg-subtle">
      <td className="max-w-64 px-4">
        <button
          type="button"
          className="block max-w-full text-start"
          onClick={open}
        >
          <span className="block truncate font-medium">
            {displayName(u)}
            {u.id === me.id && (
              <span className="ms-1.5 font-normal text-ash">You</span>
            )}
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            @{u.username}
          </span>
        </button>
      </td>
      <td className="max-w-56 truncate px-4 text-muted-foreground">
        {u.email}
      </td>
      <td className="px-4">{roleLabel(u)}</td>
      <td className="px-4">
        <StateDot tone={state.tone} label={state.label} />
      </td>
      <td className="max-w-40 truncate px-4 text-muted-foreground">
        {groups || "—"}
      </td>
      <td className="px-4 whitespace-nowrap text-muted-foreground">
        {timeAgo(u.last_login_at ?? null)}
      </td>
      <td className="pe-2 text-end">
        <ItemMenu groups={menu} label={`Actions for ${displayName(u)}`} />
      </td>
    </tr>
  )
}

function PhoneRow({ user: u }: { user: PanelUser }) {
  const a = useMembersActions()
  const menu = useMemberMenu(u)
  const [open, setOpen] = useOpen(`member-sheet-${u.id}`)
  const state = statusMeta[u.status]
  return (
    <li>
      <button
        type="button"
        className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start active:bg-muted"
        onClick={() => (u.status === "pending" ? setOpen(true) : a.details(u))}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{displayName(u)}</span>
          <span className="block truncate text-body-sm text-muted-foreground">
            @{u.username} · {roleLabel(u)}
          </span>
        </span>
        <StateDot tone={state.tone} label={state.label} />
      </button>
      <BottomSheet open={open} onOpenChange={setOpen} title={displayName(u)}>
        <SheetItems groups={menu} onOpenChange={setOpen} />
      </BottomSheet>
    </li>
  )
}
