"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoaderCircle } from "lucide-react"
import { type SubmitEvent, useState } from "react"

import { Field } from "@/components/field"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { api, fieldErrors } from "@/lib/api"
import { accessKey, meKey } from "./keys"

export const PASSWORD_HINT = "At least 12 characters."

// Current password, new one, and the new one again.
export function ChangePasswordForm({
  currentLabel = "Current password",
  submitLabel = "Change password",
  onDone,
}: {
  currentLabel?: string
  submitLabel?: string
  onDone?: () => void
}) {
  const queryClient = useQueryClient()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [again, setAgain] = useState("")
  const [mismatch, setMismatch] = useState(false)

  const change = useMutation({
    mutationFn: () =>
      api.auth.changePassword({
        current_password: current,
        new_password: next,
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(meKey, user)
      queryClient.invalidateQueries({ queryKey: accessKey })
      setCurrent("")
      setNext("")
      setAgain("")
      onDone?.()
    },
  })
  const errors = fieldErrors(change.error)
  const general =
    change.error && !Object.keys(errors).length ? change.error.message : null

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const same = next === again
    setMismatch(!same)
    if (same) change.mutate()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {general && (
        <p role="alert" className="text-body-sm text-destructive">
          {general}
        </p>
      )}
      <Field label={currentLabel} error={errors.current_password}>
        {(field) => (
          <SecretInput
            {...field}
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
      </Field>
      <Field
        label="New password"
        hint={PASSWORD_HINT}
        error={errors.new_password}
      >
        {(field) => (
          <SecretInput
            {...field}
            required
            minLength={12}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        )}
      </Field>
      <Field
        label="New password again"
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
      <Button type="submit" size="lg" disabled={change.isPending}>
        {change.isPending && <LoaderCircle className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  )
}
