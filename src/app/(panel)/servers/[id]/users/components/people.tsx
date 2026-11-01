"use client"

import { ChevronRight, Search, ShieldCheck, UserRound } from "lucide-react"

import type { User } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, ItemMenu, StateDot } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import {
  ago,
  displayName,
  filterUsers,
  fullTime,
  stateMeta,
  sudoLabel,
  userState,
  useUsersFilters,
} from "./meta"
import { useUserMenu, useUsersActions } from "./users-actions"

export function PeopleTab() {
  const { phone } = useServerPage()
  const a = useUsersActions()
  const o = a.overview
  const { filters } = useUsersFilters()
  const show = filters.show ?? "people"
  const list = filterUsers(o, show, filters.q)

  if (list.length === 0) {
    return (
      <Empty
        icon={Search}
        title="No matching accounts"
        body={
          show === "people"
            ? "Service accounts are hidden. Try All, or another search."
            : "Try another search."
        }
        className="max-md:mt-4"
      />
    )
  }
  return phone ? <UsersList users={list} /> : <UsersTable users={list} />
}

// ---- Desktop ----

function UsersTable({ users }: { users: User[] }) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border">
      <table className="w-full table-fixed text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr className="h-10">
            <th className="ps-4 text-start font-medium">Account</th>
            <th className="w-36 px-3 text-start font-medium">Status</th>
            <th className="hidden w-44 px-3 text-start font-medium @xl:table-cell">
              Sudo
            </th>
            <th className="hidden px-3 text-start font-medium @4xl:table-cell">
              Groups
            </th>
            <th className="hidden w-40 px-3 text-start font-medium @2xl:table-cell">
              Last login
            </th>
            <th className="w-12 pe-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <UserRow key={u.name} user={u} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserRow({ user: u }: { user: User }) {
  const a = useUsersActions()
  const menu = useUserMenu(u)
  const state = userState(u)
  const others = u.groups.filter((g) => g !== u.primary_group)
  return (
    <tr className="h-16 hover:bg-subtle">
      <td className="max-w-0 ps-4">
        <button
          type="button"
          onClick={() => a.details(u)}
          className="block w-full min-w-0 text-start outline-none focus-visible:underline"
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "truncate font-medium",
                state === "locked" && "text-muted-foreground",
              )}
            >
              {u.name}
            </span>
            {u.sessions > 0 && (
              <span className="shrink-0 rounded-full bg-muted px-2 text-caption text-muted-foreground">
                online
              </span>
            )}
          </span>
          <span className="block truncate text-caption text-ash">
            {[displayName(u), `uid ${u.uid}`].filter(Boolean).join(" · ")}
          </span>
        </button>
      </td>
      <td className="px-3" title={stateMeta[state].hint}>
        <StateDot tone={stateMeta[state].tone} label={stateMeta[state].label} />
      </td>
      <td
        className={cn(
          "hidden truncate px-3 @xl:table-cell",
          u.sudo === "none" && "text-ash",
        )}
      >
        {sudoLabel(u)}
      </td>
      <td className="hidden max-w-0 truncate px-3 text-muted-foreground @4xl:table-cell">
        {others.length ? (
          others.join(", ")
        ) : (
          <span className="text-ash">—</span>
        )}
      </td>
      <td className="hidden px-3 whitespace-nowrap @2xl:table-cell">
        <LastLogin user={u} />
      </td>
      <td className="pe-3">
        <ItemMenu groups={menu} label={`Actions for ${u.name}`} />
      </td>
    </tr>
  )
}

function LastLogin({ user: u }: { user: User }) {
  const { overview } = useUsersActions()
  const l = u.last_login
  if (!l) {
    return (
      <span className="text-ash">
        {overview.login_history ? "Never" : "Not recorded"}
      </span>
    )
  }
  return (
    <span title={[fullTime(l.time), l.from].filter(Boolean).join(" · ")}>
      {ago(l.time)}
    </span>
  )
}

// ---- Phone ----

function UsersList({ users }: { users: User[] }) {
  const a = useUsersActions()
  return (
    <ul className="mt-4 divide-y divide-border border-y border-border">
      {users.map((u) => {
        const state = userState(u)
        return (
          <li key={u.name}>
            <button
              type="button"
              onClick={() => a.details(u)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg",
                  u.sudo !== "none"
                    ? "bg-brand-soft text-brand-strong"
                    : "bg-muted text-ash",
                )}
              >
                {u.sudo !== "none" ? (
                  <ShieldCheck className="size-5" />
                ) : (
                  <UserRound className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-body font-medium",
                    state === "locked" && "text-muted-foreground",
                  )}
                >
                  {u.name}
                  {displayName(u) && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {displayName(u)}
                    </span>
                  )}
                </span>
                <span className="block truncate text-body-sm text-muted-foreground">
                  <StateDot
                    tone={stateMeta[state].tone}
                    label={stateMeta[state].label}
                  />
                  {u.sudo !== "none" && (
                    <span className="text-ash"> · sudo</span>
                  )}
                  {u.sessions > 0 && (
                    <span className="text-ash"> · online</span>
                  )}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ash" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
