"use client"

import { useMutation } from "@tanstack/react-query"
import { CircleAlert, LoaderCircle } from "lucide-react"
import { type SubmitEvent, useState } from "react"

import { PASSWORD_HINT } from "@/components/auth/change-password"
import { Field } from "@/components/field"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError, api, fieldErrors } from "@/lib/api"
import type { PanelUser } from "@/lib/services"

const empty = {
  first_name: "",
  full_name: "",
  username: "",
  email: "",
  password: "",
}

// The first admin (kind "setup") or someone signing up on their own. The
// backend signs them in either way.
export function SignupForm({
  kind,
  tokenRequired = false,
  onDone,
}: {
  kind: "setup" | "register"
  tokenRequired?: boolean
  onDone: (user: PanelUser) => void
}) {
  const [form, setForm] = useState(empty)
  const [again, setAgain] = useState("")
  const [token, setToken] = useState("")
  const [mismatch, setMismatch] = useState(false)

  const signup = useMutation({
    mutationFn: () =>
      kind === "setup"
        ? api.auth.authSetup({
            ...form,
            ...(tokenRequired ? { setup_token: token } : {}),
          })
        : api.auth.authRegister(form),
    onSuccess: onDone,
  })

  const errors = fieldErrors(signup.error)
  const general =
    signup.error && !Object.keys(errors).length
      ? signup.error instanceof ApiError
        ? signup.error.message
        : "Couldn't reach the server. Check your connection and try again."
      : null

  function set(key: keyof typeof empty) {
    return (event: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: event.target.value }))
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const same = form.password === again
    setMismatch(!same)
    if (same) signup.mutate()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {general && (
        <div
          role="alert"
          className="flex gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-body-sm text-foreground"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{general}</p>
        </div>
      )}

      <Field label="First name" error={errors.first_name}>
        {(field) => (
          <Input
            {...field}
            required
            autoComplete="given-name"
            enterKeyHint="next"
            value={form.first_name}
            onChange={set("first_name")}
          />
        )}
      </Field>
      <Field label="Full name" error={errors.full_name}>
        {(field) => (
          <Input
            {...field}
            required
            autoComplete="name"
            enterKeyHint="next"
            value={form.full_name}
            onChange={set("full_name")}
          />
        )}
      </Field>
      <Field label="Email" error={errors.email}>
        {(field) => (
          <Input
            {...field}
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            value={form.email}
            onChange={set("email")}
          />
        )}
      </Field>
      <Field label="Username" error={errors.username}>
        {(field) => (
          <Input
            {...field}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            value={form.username}
            onChange={set("username")}
          />
        )}
      </Field>
      <Field label="Password" hint={PASSWORD_HINT} error={errors.password}>
        {(field) => (
          <SecretInput
            {...field}
            required
            minLength={12}
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
          />
        )}
      </Field>
      <Field
        label="Password again"
        error={mismatch ? "The two passwords don't match." : undefined}
      >
        {(field) => (
          <SecretInput
            {...field}
            required
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
        )}
      </Field>
      {tokenRequired && (
        <Field
          label="Setup token"
          hint="The SETUP_TOKEN this server was started with."
          error={errors.setup_token}
        >
          {(field) => (
            <SecretInput
              {...field}
              required
              label="setup token"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          )}
        </Field>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-1 w-full"
        disabled={signup.isPending}
      >
        {signup.isPending && <LoaderCircle className="animate-spin" />}
        {kind === "setup" ? "Create admin account" : "Create account"}
      </Button>
    </form>
  )
}
