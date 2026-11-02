"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LogOut } from "lucide-react"
import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/auth"
import { ChangePasswordForm } from "@/components/auth/change-password"
import { meKey } from "@/components/auth/keys"
import { Field } from "@/components/field"
import { PageHeader } from "@/components/panel/page-header"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import { api, fieldErrors } from "@/lib/api"

export function AccountView() {
  return (
    <>
      <PageHeader
        title="Account"
        guide="access"
        description="Your name, your password, and where you're signed in."
      />
      <div className="flex w-full flex-col gap-4 py-5 md:px-6">
        <Section title="Profile">
          <Profile />
        </Section>
        <Section
          title="Password"
          note="Changing it signs out your other browsers and closes your open terminals."
        >
          <div className="max-w-md">
            <ChangePasswordForm
              currentLabel="Current password"
              submitLabel="Change password"
              onDone={() => toast.success("Password changed")}
            />
          </div>
        </Section>
        <Section
          title="Sign out everywhere"
          note="Ends every session, this one included, and closes your open terminals."
        >
          <SignOutEverywhere />
        </Section>
      </div>
    </>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section className="border-border max-md:border-y max-md:px-4 max-md:py-5 md:rounded-2xl md:border md:p-6">
      <h2 className="font-medium">{title}</h2>
      {note && (
        <p className="mt-1 text-body-sm text-muted-foreground">{note}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Profile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState(user.first_name)
  const [fullName, setFullName] = useState(user.full_name)
  const [email, setEmail] = useState(user.email)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useMutation({
    mutationFn: () =>
      api.auth.updateMe({
        email,
        first_name: firstName,
        full_name: fullName,
      }),
    onSuccess: (me) => {
      queryClient.setQueryData(meKey, me)
      toast.success("Profile saved")
    },
    onError: (err) => {
      const fields = fieldErrors(err)
      setErrors(fields)
      if (Object.keys(fields).length === 0) toast.error(err.message)
    },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    save.mutate()
  }
  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
      <Field label="Username" hint="Can't be changed.">
        {(props) => <Input {...props} value={user.username} disabled />}
      </Field>
      <Field label="First name" error={errors.first_name}>
        {(props) => (
          <Input
            {...props}
            value={firstName}
            autoComplete="given-name"
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
            autoComplete="name"
            required
            onChange={(e) => setFullName(e.target.value)}
          />
        )}
      </Field>
      <Field label="Email" error={errors.email}>
        {(props) => (
          <Input
            {...props}
            type="email"
            inputMode="email"
            value={email}
            autoCapitalize="none"
            autoComplete="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      <div>
        <Button type="submit" className="max-md:h-11" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  )
}

function SignOutEverywhere() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useOpen("account-sign-out")
  const signOut = useMutation({
    mutationFn: () => api.auth.authLogoutAll(),
    onSuccess: () => {
      queryClient.clear()
      window.location.assign("/login")
    },
    onError: (err) => toast.error(err.message),
  })
  return (
    <>
      <Button
        variant="outline"
        className="max-md:h-11"
        onClick={() => setOpen(true)}
      >
        <LogOut />
        Sign out everywhere
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Sign out everywhere?"
        description="Every session ends, this one included, and your open terminals close."
        confirmLabel="Sign out"
        pending={signOut.isPending}
        onConfirm={() => signOut.mutate()}
      />
    </>
  )
}
