"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useId, useState } from "react"
import { toast } from "sonner"

import { afterClose } from "@/app/(panel)/servers/[id]/components/parts"
import { Choice } from "@/components/access/choice"
import { useAuth } from "@/components/auth/auth"
import { PASSWORD_HINT } from "@/components/auth/change-password"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { fieldErrors } from "@/lib/api"
import type { PanelUser } from "@/lib/services"
import {
  useCreateMember,
  useGroups,
  useSetMemberPassword,
  useUpdateMember,
} from "../../api"
import { accessHref, displayName } from "./meta"

const roleItems = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin (full access everywhere)" },
]

export function GroupChecks({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const groups = useGroups()
  return (
    <section>
      <h2 className="mb-1 text-body-sm font-medium">Groups</h2>
      {groups.isPending ? (
        <Skeleton className="h-9 rounded-lg" />
      ) : (groups.data ?? []).length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No groups yet.</p>
      ) : (
        <ul>
          {(groups.data ?? []).map((g) => (
            <li key={g.id}>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
              <label className="flex min-h-9 items-center gap-2.5 text-body-sm max-md:min-h-11">
                <Checkbox
                  checked={value.includes(g.id)}
                  onCheckedChange={(on) =>
                    onChange(
                      on ? [...value, g.id] : value.filter((id) => id !== g.id),
                    )
                  }
                />
                {g.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Add or edit a member.
export function MemberForm({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: PanelUser
}) {
  const { user: me } = useAuth()
  const router = useRouter()
  const create = useCreateMember()
  const update = useUpdateMember()
  const formId = useId()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState(user?.first_name ?? "")
  const [fullName, setFullName] = useState(user?.full_name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [role, setRole] = useState<string>(user?.role ?? "member")
  const [groupIds, setGroupIds] = useState<string[]>(user?.group_ids ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const self = user?.id === me.id
  const pending = create.isPending || update.isPending

  const refused = (err: Error) => {
    const fields = fieldErrors(err)
    setErrors(fields)
    if (Object.keys(fields).length === 0) toast.error(err.message)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    const profile = { email, first_name: firstName, full_name: fullName }
    const memberRole = role as PanelUser["role"]
    if (user) {
      update.mutate(
        { id: user.id, ...profile, role: memberRole, group_ids: groupIds },
        {
          onSuccess: () => {
            toast.success("Member updated")
            onOpenChange(false)
          },
          onError: refused,
        },
      )
    } else {
      create.mutate(
        {
          ...profile,
          username,
          password,
          role: memberRole,
          group_ids: groupIds,
        },
        {
          onSuccess: (created) => {
            toast.success("Member added", {
              description: "They choose their own password at first sign-in.",
            })
            // Admins reach everything, so only a member has access to choose.
            if (created.role === "admin") onOpenChange(false)
            else {
              afterClose(onOpenChange, () =>
                router.push(accessHref(created.id)),
              )
            }
          },
          onError: refused,
        },
      )
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? `Edit ${displayName(user)}` : "Add member"}
      className="sm:max-w-lg"
      footer={
        <>
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            className="max-md:h-11"
            disabled={pending}
          >
            {pending ? "Saving…" : user ? "Save" : "Add member"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        {!user && (
          <Field
            label="Username"
            error={errors.username}
            hint="Used to sign in. Can't be changed later."
          >
            {(props) => (
              <Input
                {...props}
                value={username}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                required
                onChange={(e) => setUsername(e.target.value)}
              />
            )}
          </Field>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="First name" error={errors.first_name}>
            {(props) => (
              <Input
                {...props}
                value={firstName}
                autoComplete="off"
                required
                onChange={(e) => setFirstName(e.target.value)}
              />
            )}
          </Field>
          <Field label="Full name" error={errors.full_name}>
            {(props) => (
              <Input
                {...props}
                value={fullName}
                autoComplete="off"
                required
                onChange={(e) => setFullName(e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Email" error={errors.email}>
          {(props) => (
            <Input
              {...props}
              type="email"
              inputMode="email"
              value={email}
              autoCapitalize="none"
              autoComplete="off"
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        {!user && (
          <Field
            label="Temporary password"
            error={errors.password}
            hint={`${PASSWORD_HINT} They have to replace it at first sign-in.`}
          >
            {(props) => (
              <SecretInput
                {...props}
                value={password}
                label="temporary password"
                autoComplete="new-password"
                required
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
        )}
        <Field
          label="Role"
          error={errors.role}
          hint={self ? "You can't change your own role." : undefined}
        >
          {(props) => (
            <Choice
              id={props.id}
              value={role}
              items={roleItems}
              disabled={self}
              onChange={setRole}
            />
          )}
        </Field>
        <GroupChecks value={groupIds} onChange={setGroupIds} />
      </form>
    </ResponsiveDialog>
  )
}

// There is no email yet, so a forgotten password goes through an admin.
export function PasswordDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: PanelUser
}) {
  const set = useSetMemberPassword()
  const formId = useId()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    set.mutate(
      { id: user.id, password },
      {
        onSuccess: () => {
          toast.success("Temporary password set", {
            description: "Pass it on privately. They must replace it.",
          })
          onOpenChange(false)
        },
        onError: (err) => {
          const fields = fieldErrors(err)
          if (fields.password) setError(fields.password)
          else toast.error(err.message)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Temporary password for ${displayName(user)}`}
      description="They are signed out everywhere and have to choose a new password when they next sign in."
      footer={
        <>
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            className="max-md:h-11"
            disabled={set.isPending}
          >
            {set.isPending ? "Setting…" : "Set password"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <Field label="Temporary password" error={error} hint={PASSWORD_HINT}>
          {(props) => (
            <SecretInput
              {...props}
              value={password}
              label="temporary password"
              autoComplete="new-password"
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  )
}
