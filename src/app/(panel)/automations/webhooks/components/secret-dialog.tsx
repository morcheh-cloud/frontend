"use client"

import { TriangleAlert } from "lucide-react"

import { CredentialRow } from "@/components/credentials"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"

// A signing secret, shown once (after create or rotate). The value lives in
// the caller's state only and is gone when this closes.
export function SecretDialog({
  open,
  onOpenChange,
  secret,
  rotated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: string
  rotated?: boolean
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={rotated ? "Your new signing secret" : "Copy the signing secret"}
      className="sm:max-w-lg"
      footer={
        <Button
          className="max-md:h-11 max-md:w-full"
          onClick={() => onOpenChange(false)}
        >
          I've copied it
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="flex gap-2.5 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5 text-body-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            <span className="font-medium">It won't be shown again.</span>{" "}
            <span className="text-muted-foreground">
              {rotated
                ? "The old secret stopped working just now: put this one in your endpoint."
                : "Lost it? Make a new one from the webhook's Settings."}
            </span>
          </span>
        </p>
        <CredentialRow
          label="Signing secret"
          value={secret}
          copyLabel="secret"
          wrap
        />
        <p className="text-body-sm text-muted-foreground">
          Your endpoint uses it to check{" "}
          <code className="font-mono text-caption">X-Morche-Signature</code> on
          every delivery: the HMAC-SHA256 of the timestamp, a dot and the body.
          The webhook's page has code to copy for Node.js, Python and Go.
        </p>
      </div>
    </ResponsiveDialog>
  )
}

// A new webhook's secret, handed from the New page to the webhook's own page
// (which opens in its place and shows it once). Memory only: a reload loses
// it, which is the point.
let handed: { id: string; secret: string } | null = null

export function handSecret(id: string, secret: string) {
  handed = { id, secret }
}

// Read in a state initializer (twice under StrictMode, so no side effect),
// then dropped by an effect once the page holds it.
export function peekSecret(id: string) {
  return handed?.id === id ? handed.secret : null
}

export function dropSecret(id: string) {
  if (handed?.id === id) handed = null
}
