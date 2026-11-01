"use client"

import { Ellipsis, Pencil, ShieldAlert } from "lucide-react"
import type { ReactNode } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { User } from "@/lib/services"
import {
  afterClose,
  Facts,
  type Item,
  ItemMenu,
  SheetItems,
  StateDot,
} from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import {
  ago,
  day,
  displayName,
  fullTime,
  guarded,
  stateMeta,
  sudoLabel,
  userState,
  viaLabel,
} from "./meta"
import { useUserMenu, useUsersActions } from "./users-actions"

type Fact = { label: string; value: ReactNode; wide?: boolean; mono?: boolean }

// Everything known about one account, with what can be done to it.
export function UserDetails({
  open,
  onOpenChange,
  user: u,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}) {
  const { phone } = useServerPage()
  const a = useUsersActions()
  const menu = useUserMenu(u)
  const facts = userFacts(u, a.overview.login_history)
  const state = userState(u)
  const guard = guarded(a.overview, u)
  const subtitle = [displayName(u), `uid ${u.uid}`].filter(Boolean).join(" · ")

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={u.name}
        header={
          <div className="px-6 pt-1 pb-3">
            <p className="truncate text-subheading font-medium">{u.name}</p>
            <p className="truncate text-body-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        }
      >
        <Facts
          items={[
            {
              label: "Status",
              value: (
                <StateDot
                  tone={stateMeta[state].tone}
                  label={stateMeta[state].label}
                />
              ),
            },
            ...facts,
          ]}
        />
        {guard && <GuardNote reason={guard} />}
        <SheetItems groups={menu} onOpenChange={onOpenChange} />
      </BottomSheet>
    )
  }

  // Items close this sheet first, so the layer they open gets the Back entry.
  const closing = menu.map((group) =>
    group.map(
      (item): Item => ({
        ...item,
        onSelect: () => afterClose(onOpenChange, item.onSelect),
      }),
    ),
  )
  const edit = closing[0][0]

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{u.name}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-2 text-body-sm">
            <StateDot
              tone={stateMeta[state].tone}
              label={stateMeta[state].label}
            />
            <span className="text-muted-foreground">
              · {stateMeta[state].hint}
            </span>
          </div>
          {guard && (
            <div className="mt-4">
              <GuardNote reason={guard} />
            </div>
          )}
          <dl className="mt-4 divide-y divide-border text-body-sm">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-4 py-2.5">
                <dt className="w-32 shrink-0 text-muted-foreground">
                  {f.label}
                </dt>
                <dd
                  className={
                    f.mono
                      ? "min-w-0 font-mono text-caption break-all whitespace-pre-line"
                      : "min-w-0 break-words"
                  }
                >
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex items-center gap-2 border-t border-border px-6 py-4">
          <Button disabled={edit.disabled} onClick={edit.onSelect}>
            <Pencil />
            Edit
          </Button>
          <ItemMenu
            groups={closing}
            label={`More actions for ${u.name}`}
            trigger={
              <Button variant="outline" size="icon" aria-label="More actions">
                <Ellipsis />
              </Button>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function GuardNote({ reason }: { reason: string }) {
  return (
    <p className="mx-2 mb-3 flex gap-3 rounded-2xl border border-border p-4 text-body-sm text-muted-foreground md:mx-0 md:mb-0">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-ash" />
      <span>
        {reason} Morcheh won't lock, remove or rename it, or change its sudo, so
        it can't cut off its own access.
      </span>
    </p>
  )
}

function userFacts(u: User, history: boolean): Fact[] {
  const groups = [
    u.primary_group,
    ...u.groups.filter((g) => g !== u.primary_group),
  ]
  const login = u.last_login
  let lastLogin: ReactNode = "Never"
  if (login) {
    lastLogin = (
      <span title={fullTime(login.time)}>
        {ago(login.time)}
        {login.from && (
          <span className="text-muted-foreground"> from {login.from}</span>
        )}
      </span>
    )
  } else if (!history) {
    lastLogin = <span className="text-muted-foreground">Not recorded</span>
  }

  let password: string
  if (u.password === "set") {
    password = u.password_changed
      ? `Set, changed ${day(u.password_changed)}`
      : "Set"
  } else if (u.password === "empty") password = "Empty: no password asked"
  else if (u.password === "unset") password = "None (key or no login)"
  else password = "Unknown (shadow unreadable)"
  if (u.must_change_password) password += " · must change at next login"

  let keys: string
  if (u.ssh_keys < 0) keys = "Can't read authorized_keys"
  else if (u.ssh_keys === 0) keys = "None"
  else keys = `${u.ssh_keys} authorized key${u.ssh_keys === 1 ? "" : "s"}`

  return [
    { label: "Sudo", value: sudoFact(u) },
    { label: "Groups", value: groups.join(", "), wide: true },
    { label: "Last login", value: lastLogin },
    {
      label: "Logged in now",
      value:
        u.sessions > 0
          ? `${u.sessions} session${u.sessions === 1 ? "" : "s"}`
          : "No",
    },
    { label: "Password", value: password, wide: true },
    ...(u.password_expires
      ? [{ label: "Password expires", value: day(u.password_expires) }]
      : []),
    {
      label: "Account expires",
      value:
        u.account_expires === "1970-01-02"
          ? "Locked by Morcheh"
          : u.account_expires
            ? day(u.account_expires)
            : "Never",
    },
    { label: "SSH keys", value: keys },
    {
      label: "Home",
      value: u.home_exists ? u.home : `${u.home} (missing)`,
      wide: true,
      mono: true,
    },
    { label: "Shell", value: u.shell, wide: true, mono: true },
    { label: "UID / GID", value: `${u.uid} / ${u.gid}` },
  ]
}

function sudoFact(u: User) {
  if (u.sudo === "none") return "None"
  const via = u.sudo_via.map(viaLabel).join(", ")
  return (
    <>
      {sudoLabel(u)}
      {via && <span className="text-muted-foreground"> · through {via}</span>}
    </>
  )
}
