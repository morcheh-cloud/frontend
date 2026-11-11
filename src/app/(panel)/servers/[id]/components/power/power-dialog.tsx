"use client"

import { TriangleAlert } from "lucide-react"
import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fieldErrors } from "@/lib/api"
import type { PowerOverview } from "@/lib/services"
import { Field } from "../../../components/fields"
import { Picker, Problem } from "../../users/components/fields"
import { Segmented } from "../parts"
import { useServerPage } from "../server-page"
import { type PowerAction, usePowerAction } from "./api"
import { actionMeta, clock, delays } from "./meta"

type When = "now" | "later"

// Reboot or shut down, now or in a while, with an optional note to whoever is
// logged in. Shutting down asks for the server's name: Morche can't turn it
// back on.
export function PowerDialog({
  open,
  onOpenChange,
  action,
  overview: o,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: PowerAction
  overview: PowerOverview
}) {
  const { server, phone } = useServerPage()
  const run = usePowerAction(server.id)
  const meta = actionMeta[action]
  const [when, setWhen] = useState<When>("now")
  const [delay, setDelay] = useState("5")
  const [message, setMessage] = useState("")
  const [typed, setTyped] = useState("")
  const [error, setError] = useState<string | null>(null)

  const later = when === "later" && o.can_schedule
  const mustType = action === "poweroff" && !later
  const confirmed = !mustType || typed.trim() === server.name
  const at = new Date(Date.now() + Number(delay) * 60_000)

  function submit() {
    if (!confirmed) return setError(`Type ${server.name} to confirm`)
    setError(null)
    run.mutate(
      {
        action,
        delay_minutes: later ? Number(delay) : undefined,
        message: message.trim() || undefined,
      },
      {
        onSuccess: (r) => {
          onOpenChange(false)
          toast(
            r.scheduled
              ? `${meta.noun} scheduled for ${clock(r.at)}`
              : `${meta.sent} ${server.name}`,
          )
        },
        onError: (err) => {
          const f = fieldErrors(err)
          setError(f.delay_minutes ?? f.message ?? err.message)
        },
      },
    )
  }

  const label = later ? `Schedule ${meta.verb.toLowerCase()}` : meta.now
  const footer = (
    <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
      <Button
        type="submit"
        form="power-form"
        size={phone ? "lg" : "default"}
        variant={action === "poweroff" ? "destructive" : "default"}
        disabled={run.isPending || !confirmed}
      >
        {run.isPending ? "Sending…" : label}
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
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${meta.verb} ${server.name}?`}
      description={meta.effect}
      footer={footer}
    >
      <form
        id="power-form"
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          submit()
        }}
      >
        {o.can_schedule ? (
          <div className="flex flex-col gap-3">
            <Segmented
              label="When"
              items={[
                { value: "now", label: "Now" },
                { value: "later", label: "Later" },
              ]}
              value={when}
              onChange={setWhen}
            />
            {later && (
              <Field
                label="In"
                hint={`At ${clock(at.toISOString())}. Logged-in users are warned before it happens; you can cancel until then.`}
              >
                {(p) => (
                  <Picker
                    id={p.id}
                    items={delays}
                    value={delay}
                    onChange={setDelay}
                  />
                )}
              </Field>
            )}
          </div>
        ) : (
          <p className="text-caption text-muted-foreground">
            This server has no systemd, so it can only {meta.verb.toLowerCase()}{" "}
            right now, not on a timer.
          </p>
        )}

        {(o.sessions > 0 || later) && (
          <Field
            label="Message to logged-in users"
            hint={
              o.sessions > 0
                ? `${o.sessions} ${o.sessions === 1 ? "session is" : "sessions are"} open. Optional.`
                : "Optional."
            }
          >
            {(p) => (
              <Input
                {...p}
                value={message}
                maxLength={200}
                placeholder={meta.placeholder}
                onChange={(e) => setMessage(e.target.value)}
              />
            )}
          </Field>
        )}

        {o.container && (
          <Warning>
            This server runs in a container. {meta.verb} usually stops the
            container, and it only comes back if its restart policy says so.
          </Warning>
        )}

        {mustType && (
          <>
            <Warning>
              Morche can't turn it back on. You'll need your provider's console,
              a power button or Wake-on-LAN.
            </Warning>
            <Field label={`Type ${server.name} to confirm`}>
              {(p) => (
                <Input
                  {...p}
                  value={typed}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setTyped(e.target.value)}
                />
              )}
            </Field>
          </>
        )}

        {error && <Problem>{error}</Problem>}
      </form>
    </ResponsiveDialog>
  )
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-subtle p-4 text-body-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      <p className="min-w-0">{children}</p>
    </div>
  )
}
