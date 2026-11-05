"use client"

import { type FormEvent, useState } from "react"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, fieldErrors } from "@/lib/api"
import { Field } from "../../../components/fields"
import { useServerPage } from "../../components/server-page"
import { useFirewallActions } from "./firewall-actions"

const FORM_ID = "fw-block-form"

// The most common job of all, so it asks for nothing but the address.
export function BlockDialog({
  open,
  onOpenChange,
  address,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  address: string
}) {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const [from, setFrom] = useState(address)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string>()
  const value = from.trim()
  const self = value !== "" && value === o.your_ip

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!value) {
      setError("Enter an address or a network")
      return
    }
    setError(undefined)
    const ok = await a.apply(
      () =>
        api.firewall.addFirewallRule(server.id, {
          action: "block",
          from: value,
          comment: comment.trim() || undefined,
        }),
      `${value} blocked`,
      (err) => setError(fieldErrors(err).from ?? err.message),
    )
    if (ok) onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Block an address"
      description="Everything from this address is dropped, on every port. It goes before your other rules."
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            type="submit"
            form={FORM_ID}
            size={phone ? "lg" : "default"}
            disabled={a.busy}
          >
            {a.busy ? "Applying…" : "Block"}
          </Button>
          <Button
            type="button"
            size={phone ? "lg" : "default"}
            variant={phone ? "ghost" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4"
      >
        <Field
          label="Address"
          error={error}
          hint={
            self
              ? "This is your own address. You'd lose the servers it reaches directly."
              : "One address, or a network like 203.0.113.0/24"
          }
        >
          {(p) => (
            <Input
              {...p}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="203.0.113.7"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>
        {o.capabilities.comments && (
          <Field label="Note" hint="Optional: why it's blocked">
            {(p) => (
              <Input
                {...p}
                value={comment}
                maxLength={120}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Port scan"
              />
            )}
          </Field>
        )}
      </form>
    </ResponsiveDialog>
  )
}
