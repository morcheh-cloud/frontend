"use client"

import { ChevronDown } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fieldErrors } from "@/lib/api"
import type { User, UserCreateBody, UserUpdateBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Field } from "../../../components/fields"
import { useServerPage } from "../../components/server-page"
import { useChange } from "../api"
import {
  CheckList,
  PasswordInput,
  Picker,
  Problem,
  RadioCards,
  ToggleRow,
} from "./fields"
import {
  defaultShell,
  guarded,
  NAME_HINT,
  NAME_RE,
  type SudoLevel,
  shellChoices,
  sortGroups,
  sudoLevel,
  sudoLevels,
} from "./meta"
import { useUsersActions } from "./users-actions"

const FORM_ID = "users-user-form"
const NEW_GROUP = "__new__"
// Morche's lock is an expiry date of 1970-01-02.
const LOCK_DATE = "1970-01-02"
const KEY_RE = /^(ssh-|ecdsa-|sk-)\S+\s+\S+/

// Add an account, or change one: a side sheet on desktop, a full-height
// sheet on phones. Remounted on every open.
export function UserEditor({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}) {
  const { phone } = useServerPage()
  const [pending, setPending] = useState(false)
  const title = user ? user.name : "New account"
  const form = (
    <UserForm
      user={user}
      onPending={setPending}
      onDone={() => onOpenChange(false)}
    />
  )

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        header={
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-2 pb-2">
            <Button
              variant="ghost"
              className="h-11 justify-self-start text-body"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <span aria-hidden className="truncate text-body font-medium">
              {title}
            </span>
            <Button
              type="submit"
              form={FORM_ID}
              variant="ghost"
              disabled={pending}
              className="h-11 justify-self-end text-body text-brand"
            >
              {user ? "Save" : "Add"}
            </Button>
          </div>
        }
        className="px-4 pt-5 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        {form}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>
            {user
              ? "Only what you change is sent to the server."
              : "Creates a login account on this server."}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{form}</div>
        <div className="flex items-center gap-2 border-t border-border px-6 py-4">
          <span className="flex-1" />
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {user ? "Save" : "Add account"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type Values = {
  name: string
  fullName: string
  password: string
  mustChange: boolean
  key: string
  sudo: SudoLevel
  groups: string[]
  shell: string
  home: string
  moveHome: boolean
  createHome: boolean
  uid: string
  primary: string
  system: boolean
  expires: string
}

function UserForm({
  user,
  onPending,
  onDone,
}: {
  user: User | null
  onPending: (pending: boolean) => void
  onDone: () => void
}) {
  const { server } = useServerPage()
  const a = useUsersActions()
  const o = a.overview
  const change = useChange(server.id)
  const guard = user ? guarded(o, user) : null
  const sudoGroups = new Set(o.groups.filter((g) => g.sudo).map((g) => g.name))
  const lockedByDate = user?.account_expires === LOCK_DATE

  const initial: Values = {
    name: user?.name ?? "",
    fullName: user?.full_name ?? "",
    password: "",
    mustChange: false,
    key: "",
    sudo: user ? sudoLevel(user) : "none",
    // Sudo groups follow the sudo choice, not this list.
    groups: (user?.groups ?? []).filter((g) => !sudoGroups.has(g)),
    shell: user?.shell ?? defaultShell(o),
    home: user?.home ?? "",
    moveHome: true,
    createHome: true,
    uid: "",
    primary: user?.primary_group ?? NEW_GROUP,
    system: false,
    expires: lockedByDate ? "" : (user?.account_expires ?? ""),
  }
  const [v, setV] = useState(initial)
  const [sudoTouched, setSudoTouched] = useState(false)
  const [more, setMore] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string | null>(null)
  const set = <K extends keyof Values>(k: K, value: Values[K]) =>
    setV((s) => ({ ...s, [k]: value }))

  const name = v.name.trim()
  const homeDefault = `/home/${name || "name"}`

  function validate() {
    const next: Record<string, string> = {}
    if (!user || name !== user.name) {
      if (!NAME_RE.test(name)) next.name = NAME_HINT
      else if (o.users.some((u) => u.name === name)) {
        next.name = "An account with this name exists"
      } else if (
        !user &&
        v.primary === NEW_GROUP &&
        o.groups.some((g) => g.name === name)
      ) {
        next.name = `A group named ${name} exists: pick it as the primary group under More options, or choose another name`
      }
    }
    if (/[:,\n]/.test(v.fullName)) next.full_name = "No : or , in the name"
    const home = v.home.trim()
    if (home && !home.startsWith("/")) next.home = "A full path, like /home/me"
    if (v.uid && !/^\d+$/.test(v.uid)) next.uid = "A whole number"
    if (v.key.trim() && !KEY_RE.test(v.key.trim())) {
      next.authorized_key =
        "A public key line, like ssh-ed25519 AAAA… you@laptop (the .pub file)"
    }
    return next
  }

  function createBody(): UserCreateBody {
    const groups = [...v.groups]
    return {
      name,
      create_home: v.createHome,
      full_name: v.fullName.trim() || undefined,
      password: v.password || undefined,
      must_change_password: v.password ? v.mustChange : undefined,
      authorized_key: v.key.trim() || undefined,
      sudo: v.sudo,
      groups: groups.length ? groups : undefined,
      shell: v.shell !== defaultShell(o) ? v.shell : undefined,
      home: v.home.trim() || undefined,
      uid: v.uid ? Number(v.uid) : undefined,
      primary_group: v.primary === NEW_GROUP ? undefined : v.primary,
      system: v.system || undefined,
    }
  }

  function updateBody(u: User): UserUpdateBody {
    const body: UserUpdateBody = {}
    if (name !== u.name) body.name = name
    if (v.fullName.trim() !== u.full_name) body.full_name = v.fullName.trim()
    if (v.shell !== u.shell) body.shell = v.shell
    const home = v.home.trim()
    if (home && home !== u.home) {
      body.home = home
      body.move_home = v.moveHome
    }
    if (v.primary !== u.primary_group) body.primary_group = v.primary
    const before = initial.groups
    if (
      v.groups.length !== before.length ||
      v.groups.some((g) => !before.includes(g))
    ) {
      // The full list: keep the sudo groups it is in; the sudo choice moves
      // it in or out of them after.
      body.groups = [...v.groups, ...u.groups.filter((g) => sudoGroups.has(g))]
    }
    if (!guard && !lockedByDate && v.expires !== initial.expires) {
      body.account_expires = v.expires
    }
    if (sudoTouched && v.sudo !== initial.sudo) body.sudo = v.sudo
    return body
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length) return

    let request: Parameters<typeof change.mutate>[0]
    if (user) {
      const body = updateBody(user)
      if (Object.keys(body).length === 0) return onDone()
      request = { kind: "update-user", user: user.name, body }
    } else {
      request = { kind: "create-user", body: createBody() }
    }

    setProblem(null)
    onPending(true)
    change.mutate(request, {
      onSuccess: () => {
        toast.success(user ? `${name} saved` : `${name} added`)
        onDone()
      },
      onError: (err) => {
        const f = fieldErrors(err)
        if (Object.keys(f).length) setErrors(f)
        setProblem(err.message)
      },
      onSettled: () => onPending(false),
    })
  }

  const groupItems = sortGroups(o.groups)
    .filter((g) => !g.sudo && g.name !== (user?.primary_group ?? name))
    .map((g) => ({
      value: g.name,
      label: g.name,
      hint: g.system ? "system" : undefined,
    }))
  const primaryItems = [
    ...(user
      ? []
      : [{ value: NEW_GROUP, label: `New group: ${name || "same as name"}` }]),
    ...sortGroups(o.groups).map((g) => ({
      value: g.name,
      label: `${g.name} (${g.gid})`,
    })),
  ]
  const shellItems = shellChoices(o, user?.shell).map((s) => ({
    value: s,
    label: /\/(nologin|false)$/.test(s) ? `${s} (no login)` : s,
  }))
  const canSudo = o.sudo_installed

  const advanced = (
    <>
      <Field label="Shell" hint="What runs when they log in.">
        {(p) => (
          <Picker
            id={p.id}
            items={shellItems}
            value={v.shell}
            onChange={(s) => set("shell", s)}
          />
        )}
      </Field>
      <Field
        label="Home folder"
        hint={user ? undefined : `Empty: ${homeDefault}`}
        error={errors.home}
      >
        {(p) => (
          <Input
            {...p}
            value={v.home}
            onChange={(e) => set("home", e.target.value)}
            placeholder={user ? undefined : homeDefault}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
          />
        )}
      </Field>
      {user && v.home.trim() && v.home.trim() !== user.home && (
        <ToggleRow
          check
          label="Move its files there"
          hint={`Moves everything in ${user.home} to the new folder.`}
          checked={v.moveHome}
          onChange={(on) => set("moveHome", on)}
        />
      )}
      {!user && (
        <ToggleRow
          check
          label="Create the home folder"
          hint="Made from /etc/skel. Off for service accounts that don't need one."
          checked={v.createHome}
          onChange={(on) => set("createHome", on)}
        />
      )}
      <Field
        label="Primary group"
        hint="Owns the files they create."
        error={errors.primary_group}
      >
        {(p) => (
          <Picker
            id={p.id}
            items={primaryItems}
            value={v.primary}
            onChange={(g) => set("primary", g)}
          />
        )}
      </Field>
      {!user && (
        <>
          <Field
            label="User ID"
            hint="Empty: the next free one."
            error={errors.uid}
          >
            {(p) => (
              <Input
                {...p}
                value={v.uid}
                onChange={(e) => set("uid", e.target.value)}
                inputMode="numeric"
                placeholder="Automatic"
                className="w-40 tabular-nums"
              />
            )}
          </Field>
          <ToggleRow
            check
            label="Service account"
            hint={`For a program, not a person: a user ID below ${o.uid_min}.`}
            checked={v.system}
            onChange={(on) => set("system", on)}
          />
        </>
      )}
    </>
  )

  return (
    <form
      id={FORM_ID}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-6"
    >
      {problem && <Problem>{problem}</Problem>}

      <Field
        label="Username"
        hint={
          guard
            ? `Can't be renamed: ${guard.toLowerCase()}`
            : user
              ? "Renaming also renames its personal group."
              : NAME_HINT
        }
        error={errors.name}
      >
        {(p) => (
          <Input
            {...p}
            value={v.name}
            disabled={Boolean(guard)}
            onChange={(e) => set("name", e.target.value)}
            placeholder="deploy"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="next"
            className="font-mono"
          />
        )}
      </Field>

      <Field label="Full name" hint="Optional." error={errors.full_name}>
        {(p) => (
          <Input
            {...p}
            value={v.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Jane Doe"
            autoComplete="off"
            enterKeyHint="next"
          />
        )}
      </Field>

      {!user && (
        <>
          <Field
            label="Password"
            hint="Empty: no password, so they log in with an SSH key only."
            error={errors.password}
          >
            {(p) => (
              <PasswordInput
                id={p.id}
                value={v.password}
                onChange={(s) => set("password", s)}
                invalid={Boolean(p["aria-invalid"])}
                describedBy={p["aria-describedby"]}
              />
            )}
          </Field>
          {v.password && (
            <ToggleRow
              check
              label="Ask for a new password at the first login"
              checked={v.mustChange}
              onChange={(on) => set("mustChange", on)}
            />
          )}
          <Field
            label="SSH public key"
            hint="Optional. Added to ~/.ssh/authorized_keys."
            error={errors.authorized_key}
          >
            {(p) => (
              <Textarea
                {...p}
                value={v.key}
                onChange={(e) => set("key", e.target.value)}
                placeholder="ssh-ed25519 AAAAC3Nza… you@laptop"
                rows={3}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono text-caption break-all"
              />
            )}
          </Field>
        </>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-body-sm font-medium">Sudo</legend>
        {user?.sudo === "limited" && (
          <p className="mb-1 text-caption text-muted-foreground">
            It can run some commands as root (through {user.sudo_via.join(", ")}
            ). Picking a level replaces that.
          </p>
        )}
        <RadioCards
          name="sudo"
          items={sudoLevels}
          value={v.sudo}
          disabled={Boolean(guard) || !canSudo}
          onChange={(s) => {
            set("sudo", s)
            setSudoTouched(true)
          }}
        />
        {(guard || !canSudo) && (
          <p className="text-caption text-muted-foreground">
            {guard
              ? `Can't change sudo here: ${guard.toLowerCase()}`
              : "sudo isn't installed on this server."}
          </p>
        )}
      </fieldset>

      <Field
        label="Groups"
        hint="Extra groups, e.g. docker or www-data. Sudo groups follow the choice above."
      >
        {() => (
          <CheckList
            label="Groups"
            items={groupItems}
            value={v.groups}
            onChange={(g) => set("groups", g)}
            empty="No other groups on this server."
          />
        )}
      </Field>

      {user && !guard && (
        <Field
          label="Account expires"
          hint={
            lockedByDate
              ? "It's locked; unlock it to set an expiry date."
              : "No logins after this day. Empty: never."
          }
          error={errors.account_expires}
        >
          {(p) => (
            <div className="flex gap-2">
              <Input
                {...p}
                type="date"
                value={v.expires}
                disabled={lockedByDate}
                onChange={(e) => set("expires", e.target.value)}
                className="w-48 tabular-nums"
              />
              {v.expires && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 md:h-10"
                  onClick={() => set("expires", "")}
                >
                  Never
                </Button>
              )}
            </div>
          )}
        </Field>
      )}

      {user ? (
        advanced
      ) : (
        <div className="flex flex-col gap-5 border-t border-border pt-5">
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore((m) => !m)}
            className="flex min-h-11 items-center gap-2 self-start text-body-sm font-medium outline-none focus-visible:underline md:min-h-0"
          >
            More options
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                more && "rotate-180",
              )}
            />
          </button>
          {more && advanced}
        </div>
      )}
    </form>
  )
}
