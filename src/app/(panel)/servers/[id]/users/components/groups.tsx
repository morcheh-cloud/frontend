"use client"

import { ChevronRight, Search, ShieldCheck, UsersRound } from "lucide-react"
import { useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { useOpen } from "@/hooks/useOpen"
import type { Group } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, Facts, ItemMenu, SheetItems } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { everyMember, filterGroups, useUsersFilters } from "./meta"
import { useGroupMenu, useUsersActions } from "./users-actions"

export function GroupsTab() {
  const { phone } = useServerPage()
  const a = useUsersActions()
  const { filters } = useUsersFilters()
  const show = filters.show ?? "people"
  const list = filterGroups(a.overview.groups, show, filters.q)

  if (list.length === 0) {
    return (
      <Empty
        icon={Search}
        title="No matching groups"
        body={
          show === "people"
            ? "System groups are hidden. Try All, or another search."
            : "Try another search."
        }
        className="max-md:mt-4"
      />
    )
  }
  return phone ? <GroupsList groups={list} /> : <GroupsTable groups={list} />
}

function Kind({ group: g }: { group: Group }) {
  if (g.sudo) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <ShieldCheck className="size-4 text-brand" />
        Sudo
      </span>
    )
  }
  return (
    <span className="text-muted-foreground">
      {g.system ? "System" : "Regular"}
    </span>
  )
}

// ---- Desktop ----

function GroupsTable({ groups }: { groups: Group[] }) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border">
      <table className="w-full table-fixed text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr className="h-10">
            <th className="w-48 ps-4 text-start font-medium">Group</th>
            <th className="px-3 text-start font-medium">Members</th>
            <th className="hidden w-28 px-3 text-start font-medium @xl:table-cell">
              Type
            </th>
            <th className="w-12 pe-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {groups.map((g) => (
            <GroupRow key={g.name} group={g} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupRow({ group: g }: { group: Group }) {
  const a = useUsersActions()
  const menu = useGroupMenu(g)
  return (
    <tr className="h-14 hover:bg-subtle">
      <td className="max-w-0 ps-4">
        <button
          type="button"
          disabled={!a.canManage}
          onClick={() => a.editGroup(g)}
          className="block w-full min-w-0 text-start outline-none focus-visible:underline disabled:cursor-default"
        >
          <span className="block truncate font-medium">{g.name}</span>
          <span className="block text-caption text-ash">gid {g.gid}</span>
        </button>
      </td>
      <td className="max-w-0 px-3">
        <Members group={g} />
      </td>
      <td className="hidden px-3 @xl:table-cell">
        <Kind group={g} />
      </td>
      <td className="pe-3">
        <ItemMenu groups={menu} label={`Actions for ${g.name}`} />
      </td>
    </tr>
  )
}

// Listed members, then the accounts whose primary group it is (marked).
function Members({ group: g }: { group: Group }) {
  const primary = g.primary.filter((n) => !g.members.includes(n))
  if (g.members.length + primary.length === 0) {
    return <span className="text-ash">No members</span>
  }
  return (
    <span className="block truncate">
      {g.members.join(", ")}
      {primary.length > 0 && (
        <span className="text-ash">
          {g.members.length > 0 && ", "}
          {primary.join(", ")} (primary)
        </span>
      )}
    </span>
  )
}

// ---- Phone ----

function GroupsList({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useOpen("users-group-sheet")
  const [current, setCurrent] = useState<string | null>(null)
  const group = groups.find((g) => g.name === current)
  return (
    <>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {groups.map((g) => {
          const count = everyMember(g).length
          return (
            <li key={g.name}>
              <button
                type="button"
                onClick={() => {
                  setCurrent(g.name)
                  setOpen(true)
                }}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg",
                    g.sudo
                      ? "bg-brand-soft text-brand-strong"
                      : "bg-muted text-ash",
                  )}
                >
                  {g.sudo ? (
                    <ShieldCheck className="size-5" />
                  ) : (
                    <UsersRound className="size-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">
                    {g.name}
                  </span>
                  <span className="block truncate text-body-sm text-muted-foreground">
                    {count} member{count === 1 ? "" : "s"}
                    <span className="text-ash">
                      {" "}
                      · {g.sudo ? "sudo" : g.system ? "system" : `gid ${g.gid}`}
                    </span>
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </button>
            </li>
          )
        })}
      </ul>
      {group && <GroupSheet group={group} open={open} onOpenChange={setOpen} />}
    </>
  )
}

function GroupSheet({
  group: g,
  open,
  onOpenChange,
}: {
  group: Group
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useGroupMenu(g)
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={g.name}>
      <Facts
        items={[
          { label: "GID", value: g.gid },
          { label: "Type", value: <Kind group={g} /> },
          {
            label: "Members",
            value: g.members.length ? g.members.join(", ") : "None listed",
            wide: true,
          },
          ...(g.primary.length
            ? [
                {
                  label: "Primary group of",
                  value: g.primary.join(", "),
                  wide: true,
                },
              ]
            : []),
        ]}
      />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}
