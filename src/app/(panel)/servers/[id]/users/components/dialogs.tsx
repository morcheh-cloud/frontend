"use client"

import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fieldErrors } from "@/lib/api"
import type { Group, User } from "@/lib/services"
import { Field } from "../../../components/fields"
import { useServerPage } from "../../components/server-page"
import { useChange } from "../api"
import {
  CheckList,
  PasswordInput,
  Problem,
  RadioCards,
  ToggleRow,
} from "./fields"
import {
  displayName,
  isPerson,
  NAME_HINT,
  NAME_RE,
  type SudoLevel,
  sortUsers,
  sudoLevel,
  sudoLevels,
  viaLabel,
} from "./meta"
import { useUsersActions } from "./users-actions"

type LayerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Footer({
  label,
  pending,
  destructive,
  form,
  onCancel,
}: {
  label: string
  pending: boolean
  destructive?: boolean
  form: string
  onCancel: () => void
}) {
  const { phone } = useServerPage()
  return (
    <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
      <Button
        type="submit"
        form={form}
        size={phone ? "lg" : "default"}
        variant={destructive ? "destructive" : "default"}
        disabled={pending}
      >
        {label}
      </Button>
      <Button
        type="button"
        size={phone ? "lg" : "default"}
        variant={phone ? "ghost" : "outline"}
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  )
}

function Form({
  id,
  onSubmit,
  children,
}: {
  id: string
  onSubmit: () => void
  children: ReactNode
}) {
  return (
    <form
      id={id}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      {children}
    </form>
  )
}

// ---- Password ----

export function PasswordDialog({
  open,
  onOpenChange,
  user,
}: LayerProps & { user: User }) {
  const { server } = useServerPage()
  const change = useChange(server.id)
  const [password, setPassword] = useState("")
  const [mustChange, setMustChange] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!password) return setError("Type or generate a password")
    setError(null)
    change.mutate(
      {
        kind: "password",
        user: user.name,
        body: { password, must_change_password: mustChange || undefined },
      },
      {
        onSuccess: () => {
          toast.success(`Password set for ${user.name}`)
          onOpenChange(false)
        },
        onError: (e) => setError(e.message),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Set ${user.name}'s password`}
      description="It's hashed before it leaves Morche. Their SSH keys keep working."
      footer={
        <Footer
          form="users-password"
          label="Set password"
          pending={change.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form id="users-password" onSubmit={submit}>
        <Field label="New password" error={error ?? undefined}>
          {(p) => (
            <PasswordInput
              id={p.id}
              value={password}
              onChange={setPassword}
              invalid={Boolean(p["aria-invalid"])}
              describedBy={p["aria-describedby"]}
            />
          )}
        </Field>
        <ToggleRow
          check
          label="Ask for a new one at the next login"
          hint="They log in with this one, then must pick their own."
          checked={mustChange}
          onChange={setMustChange}
        />
      </Form>
    </ResponsiveDialog>
  )
}

// ---- Sudo ----

export function SudoDialog({
  open,
  onOpenChange,
  user,
}: LayerProps & { user: User }) {
  const { server } = useServerPage()
  const a = useUsersActions()
  const change = useChange(server.id)
  const [level, setLevel] = useState<SudoLevel>(sudoLevel(user))
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (level === sudoLevel(user) && user.sudo !== "limited") {
      return onOpenChange(false)
    }
    setError(null)
    change.mutate(
      { kind: "update-user", user: user.name, body: { sudo: level } },
      {
        onSuccess: () => {
          toast.success(
            level === "none"
              ? `${user.name} can't use sudo any more`
              : `${user.name} can use sudo`,
          )
          onOpenChange(false)
        },
        onError: (e) => setError(e.message),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Sudo for ${user.name}`}
      description={
        a.overview.sudo_group
          ? `Morche uses the ${a.overview.sudo_group} group, or its own file in /etc/sudoers.d, and checks it with visudo before saving.`
          : "Morche writes its own file in /etc/sudoers.d and checks it with visudo before saving."
      }
      footer={
        <Footer
          form="users-sudo"
          label="Save"
          pending={change.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form id="users-sudo" onSubmit={submit}>
        {error && <Problem>{error}</Problem>}
        {user.sudo !== "none" && user.sudo_via.length > 0 && (
          <p className="text-body-sm text-muted-foreground">
            Now through {user.sudo_via.map(viaLabel).join(", ")}.
          </p>
        )}
        <RadioCards
          name="sudo-level"
          items={sudoLevels}
          value={level}
          onChange={setLevel}
        />
      </Form>
    </ResponsiveDialog>
  )
}

// ---- Lock ----

export function LockDialog({
  open,
  onOpenChange,
  user,
}: LayerProps & { user: User }) {
  const { server } = useServerPage()
  const change = useChange(server.id)
  const [logout, setLogout] = useState(user.sessions > 0)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    change.mutate(
      { kind: "lock", user: user.name, locked: true, logout },
      {
        onSuccess: () => {
          toast.success(`${user.name} is locked`)
          onOpenChange(false)
        },
        onError: (e) => setError(e.message),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Lock ${user.name}?`}
      description="No more logins, with the password or an SSH key. Everything else stays: unlock it to give access back."
      footer={
        <Footer
          form="users-lock"
          label="Lock"
          destructive
          pending={change.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form id="users-lock" onSubmit={submit}>
        {error && <Problem>{error}</Problem>}
        <ToggleRow
          check
          label="Log them out now"
          hint={
            user.sessions > 0
              ? `Ends their ${user.sessions} open session${user.sessions === 1 ? "" : "s"} and every process they run.`
              : "Ends every process they run (they aren't logged in now)."
          }
          checked={logout}
          onChange={setLogout}
        />
      </Form>
    </ResponsiveDialog>
  )
}

// ---- Remove ----

export function RemoveUserDialog({
  open,
  onOpenChange,
  user,
}: LayerProps & { user: User }) {
  const { server } = useServerPage()
  const change = useChange(server.id)
  const [removeHome, setRemoveHome] = useState(false)
  const [force, setForce] = useState(user.sessions > 0)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    change.mutate(
      { kind: "delete-user", user: user.name, removeHome, force },
      {
        onSuccess: () => {
          toast.success(`${user.name} removed`)
          onOpenChange(false)
        },
        onError: (e) => setError(e.message),
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${user.name}?`}
      description="The account, its personal group and its sudo rules are deleted. This can't be undone."
      footer={
        <Footer
          form="users-remove"
          label="Remove account"
          destructive
          pending={change.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form id="users-remove" onSubmit={submit}>
        {error && <Problem>{error}</Problem>}
        <ToggleRow
          check
          label="Delete the home folder too"
          hint={
            user.home_exists
              ? `${user.home} and its mail spool. Off: the files stay, owned by a number.`
              : `${user.home} doesn't exist.`
          }
          disabled={!user.home_exists}
          checked={removeHome}
          onChange={setRemoveHome}
        />
        <ToggleRow
          check
          label="End its processes first"
          hint={
            user.sessions > 0
              ? "It's logged in now; an account with running processes can't be removed."
              : "Needed when it still runs something (a service, a cron job)."
          }
          checked={force}
          onChange={setForce}
        />
      </Form>
    </ResponsiveDialog>
  )
}

// ---- Groups ----

export function GroupEditor({
  open,
  onOpenChange,
  group,
}: LayerProps & { group: Group | null }) {
  const { server } = useServerPage()
  const a = useUsersActions()
  const o = a.overview
  const change = useChange(server.id)
  const [name, setName] = useState(group?.name ?? "")
  const [members, setMembers] = useState(group?.members ?? [])
  const [gid, setGid] = useState("")
  const [system, setSystem] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string | null>(null)
  const target = name.trim()

  function submit() {
    const next: Record<string, string> = {}
    if (!group || target !== group.name) {
      if (!NAME_RE.test(target)) next.name = NAME_HINT
      else if (o.groups.some((g) => g.name === target)) {
        next.name = "A group with this name exists"
      }
    }
    if (gid && !/^\d+$/.test(gid)) next.gid = "A whole number"
    setErrors(next)
    if (Object.keys(next).length) return

    let request: Parameters<typeof change.mutate>[0]
    if (group) {
      const body: { name?: string; members?: string[] } = {}
      if (target !== group.name) body.name = target
      const before = group.members
      if (
        members.length !== before.length ||
        members.some((m) => !before.includes(m))
      ) {
        body.members = members
      }
      if (Object.keys(body).length === 0) return onOpenChange(false)
      request = { kind: "update-group", group: group.name, body }
    } else {
      request = {
        kind: "create-group",
        body: {
          name: target,
          gid: gid ? Number(gid) : undefined,
          system: system || undefined,
          members: members.length ? members : undefined,
        },
      }
    }

    setProblem(null)
    change.mutate(request, {
      onSuccess: () => {
        toast.success(group ? `${target} saved` : `Group ${target} added`)
        onOpenChange(false)
      },
      onError: (e) => {
        const f = fieldErrors(e)
        if (Object.keys(f).length) setErrors(f)
        setProblem(e.message)
      },
    })
  }

  const people = sortUsers(o.users).map((u) => ({
    value: u.name,
    label: u.name,
    hint: isPerson(o, u) ? displayName(u) || undefined : "service",
  }))

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={group ? `Group ${group.name}` : "New group"}
      description={
        group?.sudo
          ? "Members of this group can use sudo."
          : "Members share access to the files and devices owned by the group."
      }
      footer={
        <Footer
          form="users-group"
          label={group ? "Save" : "Add group"}
          pending={change.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form id="users-group" onSubmit={submit}>
        {problem && <Problem>{problem}</Problem>}
        <Field
          label="Name"
          hint={group ? undefined : NAME_HINT}
          error={errors.name}
        >
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="deployers"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          )}
        </Field>
        <Field
          label="Members"
          hint={
            group && group.primary.length > 0
              ? `Also the primary group of ${group.primary.join(", ")}.`
              : undefined
          }
        >
          {() => (
            <CheckList
              label="Members"
              items={people}
              value={members}
              onChange={setMembers}
              empty="No accounts."
            />
          )}
        </Field>
        {!group && (
          <>
            <Field
              label="Group ID"
              hint="Empty: the next free one."
              error={errors.gid}
            >
              {(p) => (
                <Input
                  {...p}
                  value={gid}
                  onChange={(e) => setGid(e.target.value)}
                  inputMode="numeric"
                  placeholder="Automatic"
                  className="w-40 tabular-nums"
                />
              )}
            </Field>
            <ToggleRow
              check
              label="System group"
              hint={`For services: a group ID below ${o.uid_min}.`}
              checked={system}
              onChange={setSystem}
            />
          </>
        )}
      </Form>
    </ResponsiveDialog>
  )
}

export function removeGroupBlocker(g: Group) {
  if (g.primary.length) {
    return `It's the primary group of ${g.primary.join(", ")}; change theirs first.`
  }
  return null
}
