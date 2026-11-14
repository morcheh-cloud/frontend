"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, LogOut } from "lucide-react"
import Link from "next/link"
import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"

import { signInsHref } from "@/app/(panel)/recordings/components/command-meta"
import { useAuth } from "@/components/auth/auth"
import { ChangePasswordForm } from "@/components/auth/change-password"
import { meKey } from "@/components/auth/keys"
import { Field } from "@/components/field"
import { PageHeader } from "@/components/panel/page-header"
import { ConfirmDialog } from "@/components/responsive-dialog"
import {
  useEndMySession,
  useEndOtherSessions,
  useMySessions,
  useSignIns,
} from "@/components/sessions/api"
import { SessionList } from "@/components/sessions/session-list"
import { SignInRows, SignInTable } from "@/components/sessions/sign-in-list"
import { ThemePicker } from "@/components/theme-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { api, fieldErrors } from "@/lib/api"

export function AccountView() {
  return (
    <>
      <PageHeader title="Account" guide="access" />
      <div className="flex w-full flex-col gap-4 py-5 md:px-6">
        <Section title="Profile">
          <Profile />
        </Section>
        <Section
          title="Appearance"
          note="Saved in this browser. System follows your device's light or dark setting."
        >
          <ThemePicker />
        </Section>
        <Section
          id="sessions"
          title="Signed-in devices"
          note="Every browser signed in to your account right now. Sign out one you don't recognise, then change your password."
        >
          <MySessions />
        </Section>
        <Section
          id="sign-ins"
          title="Recent sign-ins"
          note="Sign-ins, failed tries and sign-outs on your account."
        >
          <RecentSignIns />
        </Section>
        <Section
          id="password"
          title="Password"
          note="Changing it signs out your other browsers and closes your open terminals."
        >
          <div className="max-w-xl">
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
  id,
  title,
  note,
  children,
}: {
  id?: string
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-16 border-border max-md:border-y max-md:px-4 max-md:py-5 md:rounded-2xl md:border md:p-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10 2xl:grid-cols-[20rem_minmax(0,1fr)]"
    >
      <div>
        <h2 className="font-medium">{title}</h2>
        {note && (
          <p className="mt-1 text-body-sm text-muted-foreground">{note}</p>
        )}
      </div>
      <div className="mt-4 min-w-0 lg:mt-0">{children}</div>
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
    <form onSubmit={submit} className="grid max-w-4xl gap-4 sm:grid-cols-2">
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
      <div className="sm:col-span-2">
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
        confirmLabel="Sign out"
        pending={signOut.isPending}
        onConfirm={() => signOut.mutate()}
      />
    </>
  )
}

function MySessions() {
  const sessions = useMySessions()
  const end = useEndMySession()
  const endOthers = useEndOtherSessions()
  const [open, setOpen] = useOpen("account-sign-out-others")
  const others = (sessions.data ?? []).filter((s) => !s.current).length
  return (
    <div className="flex flex-col gap-4">
      <SessionList
        id="mine"
        items={sessions.data}
        loading={sessions.isPending}
        error={sessions.error}
        onEnd={(s) => end.mutateAsync(s.id)}
      />
      {others > 0 && (
        <div>
          <Button
            variant="outline"
            className="max-md:h-11 max-md:w-full"
            onClick={() => setOpen(true)}
          >
            <LogOut />
            Sign out the other {others === 1 ? "device" : `${others} devices`}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Sign out your other devices?"
        description="Every session but this one ends now. Your terminals stay open."
        confirmLabel="Sign out"
        pending={endOthers.isPending}
        onConfirm={() =>
          endOthers.mutate(undefined, {
            onSuccess: () => {
              toast.success("Your other devices are signed out")
              setOpen(false)
            },
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </div>
  )
}

function RecentSignIns() {
  const { user } = useAuth()
  const phone = useIsPhone()
  const list = useSignIns({ user: user.id, limit: 8 })
  const items = list.data?.pages[0]?.items ?? []
  if (list.isPending) return <Skeleton className="h-32 rounded-xl" />
  if (list.isError)
    return (
      <p className="text-body-sm text-destructive">
        Couldn't load your sign-ins: {list.error.message}
      </p>
    )
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Nothing yet. Sign-ins from now on show up here.
        </p>
      ) : phone ? (
        <div className="-mx-4 border-t border-border">
          <SignInRows items={items} showUser={false} sticky={false} />
        </div>
      ) : (
        <SignInTable items={items} showUser={false} />
      )}
      <div>
        <Button
          variant="link"
          className="h-auto px-0 max-md:h-11"
          render={<Link href={signInsHref({ user: user.id })} />}
          nativeButton={false}
        >
          See every sign-in
          <ArrowRight />
        </Button>
      </div>
    </div>
  )
}
