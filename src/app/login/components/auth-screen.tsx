"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useEffect } from "react"

import { authStateKey, meKey } from "@/components/auth/keys"
import { safeNext } from "@/components/auth/local-data"
import { api } from "@/lib/api"
import type { PanelUser } from "@/lib/services"
import { LoginForm } from "./login-form"
import { SignupForm } from "./signup-form"

const params = {
  view: parseAsStringLiteral(["register"]),
  next: parseAsString,
}

// The one screen before the panel: creates the first admin on a new install,
// else signs in, else (when an admin has opened it) signs up.
export function AuthScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [{ view, next }, setParams] = useQueryStates(params)

  const me = useQuery({
    queryKey: meKey,
    queryFn: () => api.auth.getMe(),
    retry: false,
  })
  const state = useQuery({
    queryKey: authStateKey,
    queryFn: () => api.auth.getAuthState(),
  })

  const signedIn = !!me.data
  useEffect(() => {
    if (signedIn) router.replace(safeNext(next))
  }, [signedIn, next, router])

  function enter(user: PanelUser) {
    queryClient.setQueryData(meKey, user)
  }

  if (signedIn || me.isPending || state.isPending) return null

  if (state.data?.needs_setup) {
    return (
      <Panel
        title="Set up Morcheh"
        note="This first account becomes the admin. You add everyone else from inside."
      >
        <SignupForm
          kind="setup"
          tokenRequired={state.data.setup_token_required}
          onDone={enter}
        />
      </Panel>
    )
  }

  if (view === "register" && state.data?.registration_open) {
    return (
      <Panel
        title="Create your account"
        note="An admin approves new accounts before they can use Morcheh."
        footer={
          <>
            Already have an account?{" "}
            <TextLink onClick={() => setParams({ view: null })}>
              Sign in
            </TextLink>
          </>
        }
      >
        <SignupForm kind="register" onDone={enter} />
      </Panel>
    )
  }

  return (
    <Panel
      title="Sign in"
      footer={
        <>
          Forgot your password? Ask your Morcheh admin to reset it.
          {state.data?.registration_open && (
            <span className="mt-1 block">
              New here?{" "}
              <TextLink onClick={() => setParams({ view: "register" })}>
                Create an account
              </TextLink>
            </span>
          )}
        </>
      }
    >
      <LoginForm onSignedIn={enter} />
    </Panel>
  )
}

function Panel({
  title,
  note,
  footer,
  children,
}: {
  title: string
  note?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <div className="sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:p-8 sm:shadow-sm lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none">
        <h1 className="mb-8 text-heading font-light sm:mb-6 lg:mb-8">
          {title}
        </h1>
        {note && (
          <p className="-mt-5 mb-8 text-body-sm text-muted-foreground sm:-mt-3 sm:mb-6 lg:-mt-5 lg:mb-8">
            {note}
          </p>
        )}
        {children}
      </div>
      {footer && (
        <p className="mt-auto text-center text-body-sm text-muted-foreground sm:mt-0 sm:text-start">
          {footer}
        </p>
      )}
    </>
  )
}

function TextLink({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline md:min-h-0"
    >
      {children}
    </button>
  )
}
