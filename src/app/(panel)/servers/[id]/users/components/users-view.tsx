"use client"

import { Plus, RefreshCw, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { UsersOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  Loading,
  type Note,
  Notices,
  Segmented,
  Summary,
} from "../../components/parts"
import { SectionHeader } from "../../components/section-header"
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
      size="sm"
      className="max-md:h-10 max-md:flex-1"
      disabled={query.isFetching}
      onClick={() => query.refetch()}
    >
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
      Refresh
    </Button>
  )

  if (!o) {
    return (
      <>
        <SectionHeader actions={refresh} />
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
  const { filters, setFilters } = useUsersFilters()
  const tab = filters.tab
  const setTab = (t: Tab) =>
    setFilters({ tab: t === "people" ? null : t, q: null, show: null })

  const people = o.users.filter((u) => isPerson(o, u))
  const sudoers = o.users.filter((u) => u.sudo !== "none")
  const tabs: { value: Tab; label: string }[] = [
    { value: "people", label: `People · ${people.length}` },
    { value: "groups", label: `Groups · ${o.groups.length}` },
    { value: "sudo", label: `Sudo · ${sudoers.length}` },
  ]

  const groupsTab = tab === "groups"
  const add = (
    <Button
      size="sm"
      className="max-md:h-10 max-md:flex-1"
      disabled={!a.canManage}
      onClick={() => (groupsTab ? a.addGroup() : a.addUser())}
    >
      <Plus />
      {groupsTab ? "Add group" : "Add account"}
    </Button>
  )

  let body: ReactNode
  if (tab === "groups") body = <GroupsTab />
  else if (tab === "sudo") body = <SudoTab />
  else body = <PeopleTab />

  return (
    <>
      <SectionHeader
        actions={
          <>
            {refresh}
            {add}
          </>
        }
      />
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
        <OverviewSummary o={o} onTab={setTab} />
        <Notices notes={notes(o)} />
        <div className="flex [scrollbar-width:none] overflow-x-auto max-md:px-4 max-md:pt-4">
          <Segmented label="Show" items={tabs} value={tab} onChange={setTab} />
        </div>
        {body}
      </div>
    </>
  )
}

function OverviewSummary({
  o,
  onTab,
}: {
  o: UsersOverview
  onTab: (t: Tab) => void
}) {
  const { filters } = useUsersFilters()
  const people = o.users.filter((u) => isPerson(o, u))
  const sudoers = o.users.filter((u) => u.sudo !== "none")
  const locked = people.filter((u) => userState(u) === "locked").length
  const online = o.users.filter((u) => u.sessions > 0)
  return (
    <Summary
      cells={[
        {
          label: "People",
          value: people.length,
          sub: `${o.users.length - people.length} service`,
          active: filters.tab === "people",
          onClick: () => onTab("people"),
        },
        {
          label: "Can use sudo",
          value: o.sudo_installed ? sudoers.length : "—",
          sub: o.sudo_installed ? undefined : "not installed",
          active: filters.tab === "sudo",
          onClick: () => onTab("sudo"),
        },
        {
          label: "Locked",
          value: locked,
          sub: locked ? "no logins" : undefined,
        },
        {
          label: "Logged in now",
          value: online.length,
          sub:
            o.sessions.length > online.length
              ? `${o.sessions.length} sessions`
              : undefined,
          tone: online.length ? "success" : undefined,
        },
      ]}
    />
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
