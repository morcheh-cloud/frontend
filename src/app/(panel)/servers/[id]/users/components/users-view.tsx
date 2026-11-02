"use client"

import { Lock, Plus, RefreshCw, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { UsersOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  Loading,
  type Note,
  Notices,
  SearchBox,
  Segmented,
} from "../../components/parts"
import { SectionActions } from "../../components/section-actions"
import { useServerPage } from "../../components/server-page"
import { useUsers } from "../api"
import { GroupsTab } from "./groups"
import { isPerson, type Tab, userState, useUsersFilters } from "./meta"
import { PeopleTab } from "./people"
import { SudoTab } from "./sudo"
import { UsersActionsProvider, useUsersActions } from "./users-actions"

export function UsersView() {
  const { server, phone } = useServerPage()
  const query = useUsers(server.id)
  const o = query.data

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={query.isFetching}
      onClick={() => query.refetch()}
    >
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
    </Button>
  )

  if (!o) {
    return (
      <>
        <SectionActions>{refresh}</SectionActions>
        <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
          {query.error ? (
            <Empty
              icon={TriangleAlert}
              title="Couldn't read the accounts"
              body={query.error.message}
              className="max-md:mt-4"
              action={
                <Button variant="outline" onClick={() => query.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : (
            <Loading phone={phone} />
          )}
        </div>
      </>
    )
  }

  return (
    <UsersActionsProvider overview={o}>
      <Content refresh={refresh} />
    </UsersActionsProvider>
  )
}

function Content({ refresh }: { refresh: ReactNode }) {
  const a = useUsersActions()
  const o = a.overview
  const { filters } = useUsersFilters()

  let body: ReactNode
  if (filters.tab === "groups") body = <GroupsTab />
  else if (filters.tab === "sudo") body = <SudoTab />
  else body = <PeopleTab />

  return (
    <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
      <Bar refresh={refresh} />
      <Notices notes={notes(o)} />
      {body}
    </div>
  )
}

// Everything above the list in one row: tabs, search, the show filter, who's
// logged in or locked, and actions. Phones stack it: search + actions, then
// scrolling chips.
function Bar({ refresh }: { refresh: ReactNode }) {
  const { phone } = useServerPage()
  const a = useUsersActions()
  const o = a.overview
  const { filters, setFilters } = useUsersFilters()
  const tab = filters.tab
  const setTab = (t: Tab) =>
    setFilters({ tab: t === "people" ? null : t, q: null, show: null })

  const people = o.users.filter((u) => isPerson(o, u))
  const sudoers = o.users.filter((u) => u.sudo !== "none")
  const tabs = (
    <Segmented
      label="Show"
      items={[
        { value: "people", label: `People · ${people.length}` },
        { value: "groups", label: `Groups · ${o.groups.length}` },
        {
          value: "sudo",
          label: `Sudo · ${o.sudo_installed ? sudoers.length : "—"}`,
        },
      ]}
      value={tab}
      onChange={setTab}
    />
  )

  // People and Groups share a search box and a "regular / all" switch.
  const groups = tab === "groups"
  const search = tab !== "sudo" && (
    <SearchBox
      value={filters.q}
      onChange={(q) => setFilters({ q: q || null })}
      placeholder={
        groups ? "Search group, gid or member" : "Search name, uid or group"
      }
      label={groups ? "Search groups" : "Search accounts"}
      className="min-w-0 flex-1 md:max-w-72 md:min-w-36"
    />
  )
  const show = tab !== "sudo" && (
    <Segmented
      label={groups ? "Groups to show" : "Accounts to show"}
      items={[
        { value: "people", label: groups ? "Regular" : "People" },
        {
          value: "all",
          label: `All · ${groups ? o.groups.length : o.users.length}`,
        },
      ]}
      value={filters.show ?? "people"}
      onChange={(v) => setFilters({ show: v === "people" ? null : v })}
    />
  )

  const add = a.engineer && (
    <Button
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label={groups ? "Add group" : "Add account"}
      disabled={!a.canManage}
      onClick={() => (groups ? a.addGroup() : a.addUser())}
    >
      <Plus />
      {!phone && (groups ? "Add group" : "Add account")}
    </Button>
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          {search || <Activity o={o} className="flex-1" />}
          {refresh}
          {add}
        </div>
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {tabs}
          {show}
        </div>
        {search && <Activity o={o} />}
      </div>
    )
  }

  return (
    <div className="@container flex flex-wrap items-center gap-2">
      {tabs}
      {search && <span className="mx-1 h-5 w-px shrink-0 bg-border" />}
      {search}
      {show}
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <Activity o={o} className="me-2 hidden @4xl:flex" />
        {refresh}
        {add}
      </div>
    </div>
  )
}

// Who's logged in and how many people are locked out, as quiet text. Says
// nothing when there's nothing to say.
function Activity({ o, className }: { o: UsersOverview; className?: string }) {
  const online = o.users.filter((u) => u.sessions > 0)
  const locked = o.users.filter(
    (u) => isPerson(o, u) && userState(u) === "locked",
  ).length
  if (!online.length && !locked) return null
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 text-caption whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      {online.length > 0 && (
        <span
          className="flex items-center gap-1.5"
          title={`${online.map((u) => u.name).join(", ")} · ${o.sessions.length} ${o.sessions.length === 1 ? "session" : "sessions"}`}
        >
          <span className="size-1.5 rounded-full bg-success" />
          {online.length} logged in
        </span>
      )}
      {locked > 0 && (
        <span className="flex items-center gap-1.5" title="Locked: no logins">
          <Lock className="size-3.5 text-ash" />
          {locked} locked
        </span>
      )}
    </div>
  )
}

function notes(o: UsersOverview) {
  const out: Note[] = []
  if (o.access === "user") {
    out.push({
      key: "access",
      title: "This login can only look",
      body: "Adding, changing or removing accounts needs root, or sudo without a password.",
      warn: true,
    })
  }
  const empty = o.users.filter(
    (u) => u.password === "empty" && u.can_login && !u.locked,
  )
  if (empty.length) {
    out.push({
      key: "empty",
      title: `${empty.map((u) => u.name).join(", ")} ${empty.length === 1 ? "has" : "have"} no password at all`,
      body: "Anything that allows empty passwords lets them in without one. Set a password or lock the account.",
      warn: true,
    })
  }
  if (!o.shadow_readable) {
    out.push({
      key: "shadow",
      title: "Password details are hidden",
      body: "/etc/shadow can't be read with this login, so whether a password is set, locked or expiring is unknown.",
    })
  }
  if (!o.sudo_installed) {
    out.push({
      key: "sudo",
      title: "sudo isn't installed",
      body: "Only root can run commands as root here. Install the sudo package to give it to others.",
    })
  } else if (!o.sudo_readable) {
    out.push({
      key: "sudoers",
      title: "The sudo rules can't be read",
      body: "Who can use sudo is guessed from group membership only.",
    })
  } else if (!o.sudo_includes_dir) {
    out.push({
      key: "includedir",
      title: "/etc/sudoers doesn't read /etc/sudoers.d",
      body: "Sudo given to single accounts won't take effect. Group-based sudo still works.",
      warn: true,
    })
  }
  if (o.tools !== "shadow") {
    out.push({
      key: "tools",
      title:
        o.tools === "busybox"
          ? "This server has BusyBox account tools"
          : "No account tools were found",
      body:
        o.tools === "busybox"
          ? "Some options (expiry dates, moving homes, forced password change) aren't available."
          : "useradd/usermod (shadow) or BusyBox adduser are needed to change accounts.",
    })
  }
  if (!o.login_history) {
    out.push({
      key: "history",
      title: "Last logins aren't recorded",
      body: "This server keeps no login history (lastlog/wtmp), so last login shows as unknown.",
    })
  }
  for (const w of o.warnings) out.push({ key: w, title: w, warn: true })
  return out
}
