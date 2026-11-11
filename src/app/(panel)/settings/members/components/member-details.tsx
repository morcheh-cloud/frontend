"use client"

import Link from "next/link"
import { signInsHref } from "@/app/(panel)/recordings/components/command-meta"
import {
  afterClose,
  ItemMenu,
  SheetItems,
  StateDot,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { AccessLayer, PrincipalAccess } from "@/components/access/grants"
import { useEndUserSession, useUserSessions } from "@/components/sessions/api"
import { SessionList } from "@/components/sessions/session-list"
import { Button } from "@/components/ui/button"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { PanelUser } from "@/lib/services"
import { useGroups, useMembers } from "../../api"
import { useMemberMenu, useMembersActions } from "./members-actions"
import { displayName, roleLabel, statusMeta } from "./meta"

// Who they are, what they can reach, and every action on them. Found by id so
// it follows the list as it refetches.
export function MemberDetails({
  open,
  onOpenChange,
  id,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  id: string
}) {
  const members = useMembers()
  const user = members.data?.items.find((u) => u.id === id)
  if (!user) return null
  return <Layer open={open} onOpenChange={onOpenChange} user={user} />
}

function Layer({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: PanelUser
}) {
  const phone = useIsPhone()
  const a = useMembersActions()
  // Already here, or a button right below.
  const menu = useMemberMenu(user)
    .map((group) =>
      group.filter((item) => item.key !== "details" && item.key !== "grants"),
    )
    .filter((group) => group.length > 0)
  // The layer closes first, so whatever an action opens gets its own Back entry.
  const closing = menu.map((group) =>
    group.map((item) => ({
      ...item,
      onSelect: () => afterClose(onOpenChange, item.onSelect),
    })),
  )
  const groups = useGroups()
  const names = (groups.data ?? [])
    .filter((g) => (user.group_ids ?? []).includes(g.id))
    .map((g) => g.name)
  const state = statusMeta[user.status]

  const facts = [
    { label: "Username", value: `@${user.username}` },
    { label: "Email", value: user.email },
    { label: "Role", value: roleLabel(user) },
    { label: "Groups", value: names.join(", ") || "None" },
    { label: "Last sign-in", value: timeAgo(user.last_login_at ?? null) },
  ]

  return (
    <AccessLayer
      open={open}
      onOpenChange={onOpenChange}
      title={displayName(user)}
      description={user.email}
      footer={
        !phone && (
          <ItemMenu
            groups={closing}
            label="Member actions"
            trigger={<Button variant="outline">Actions</Button>}
          />
        )
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <StateDot tone={state.tone} label={state.label} />
          {user.must_change_password && (
            <p className="mt-1 text-caption text-muted-foreground">
              Has to choose a new password at next sign-in.
            </p>
          )}
          <dl className="mt-3 divide-y divide-border text-body-sm">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-4 py-2.5">
                <dt className="w-28 shrink-0 text-muted-foreground">
                  {f.label}
                </dt>
                <dd className="min-w-0 break-words">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <PrincipalAccess
          principal={{ user_id: user.id }}
          groupIds={user.group_ids ?? []}
          note={
            user.role === "admin"
              ? "Admins have full access everywhere. This only counts if they stop being one."
              : undefined
          }
          onManage={() => afterClose(onOpenChange, () => a.manageAccess(user))}
        />
        <MemberSessions user={user} open={open} />
        {phone && <SheetItems groups={menu} onOpenChange={onOpenChange} />}
      </div>
    </AccessLayer>
  )
}

// Where they're signed in now, each with Sign out (ends that session at once).
function MemberSessions({ user, open }: { user: PanelUser; open: boolean }) {
  const sessions = useUserSessions(user.id, open)
  const end = useEndUserSession()
  return (
    <section aria-labelledby="member-sessions" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="member-sessions" className="text-body-sm font-medium">
          Signed in on
        </h3>
        <Link
          href={signInsHref({ user: user.id })}
          className="text-caption text-brand hover:underline"
        >
          Sign-in history
        </Link>
      </div>
      <SessionList
        id={`member-${user.id}`}
        items={sessions.data}
        loading={sessions.isPending && open}
        error={sessions.error}
        whose={displayName(user)}
        onEnd={(s) => end.mutateAsync({ user: user.id, session: s.id })}
      />
    </section>
  )
}
