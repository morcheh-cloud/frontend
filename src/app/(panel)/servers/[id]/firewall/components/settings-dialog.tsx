"use client"

import { useState } from "react"

import { Choice } from "@/components/access/choice"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { FirewallSettingsBody } from "@/lib/services"
import { Field } from "../../../components/fields"
import { useServerPage } from "../../components/server-page"
import { useFirewallActions } from "./firewall-actions"

const policies = [
  { value: "deny", label: "Block" },
  { value: "reject", label: "Refuse" },
  { value: "allow", label: "Allow" },
]

const LOGGING = {
  ufw: ["off", "low", "medium", "high", "full"],
  firewalld: ["off", "all", "unicast", "broadcast", "multicast"],
}

const label = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

// A value the form doesn't offer (ufw's routed "disabled", an unset one) still
// has to show as itself.
function withCurrent(items: { value: string; label: string }[], value: string) {
  if (!value || items.some((i) => i.value === value)) return items
  return [{ value, label: label(value) }, ...items]
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const start = {
    incoming: o.defaults.incoming,
    outgoing: o.defaults.outgoing,
    routed: o.defaults.routed,
    logging: o.defaults.logging,
    default_zone: o.default_zone ?? "",
  }
  const [form, setForm] = useState(start)
  const set = (key: keyof typeof start) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }))
  const zones = o.capabilities.zones
  const levels = LOGGING[o.backend === "firewalld" ? "firewalld" : "ufw"]

  const body: Record<string, string> = {}
  for (const key of Object.keys(form) as (keyof typeof form)[]) {
    if (form[key] !== start[key]) body[key] = form[key]
  }
  const dirty = Object.keys(body).length > 0

  async function submit() {
    const ok = await a.apply(
      () =>
        api.firewall.updateFirewallSettings(
          server.id,
          body as FirewallSettingsBody,
        ),
      "Settings saved",
    )
    if (ok) onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Firewall settings"
      description="What happens to traffic no rule mentions."
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            size={phone ? "lg" : "default"}
            disabled={a.busy || !dirty}
            onClick={submit}
          >
            {a.busy ? "Applying…" : "Save"}
          </Button>
          <Button
            size={phone ? "lg" : "default"}
            variant={phone ? "ghost" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {zones && o.zones.length > 0 && (
          <Field
            label="Default zone"
            hint="The zone of every interface not given one"
          >
            {(p) => (
              <Choice
                id={p.id}
                label="Default zone"
                value={form.default_zone}
                items={o.zones.map((z) => ({ value: z.name, label: z.name }))}
                onChange={set("default_zone")}
              />
            )}
          </Field>
        )}
        <Field
          label="Incoming"
          hint="Block is the safe choice: only what your rules allow gets in"
        >
          {(p) => (
            <Choice
              id={p.id}
              label="Incoming"
              value={form.incoming}
              items={withCurrent(policies, form.incoming)}
              onChange={set("incoming")}
            />
          )}
        </Field>
        {o.capabilities.outbound && (
          <Field
            label="Outgoing"
            hint="Leave on Allow unless you've listed everything this server needs"
          >
            {(p) => (
              <Choice
                id={p.id}
                label="Outgoing"
                value={form.outgoing}
                items={withCurrent(policies, form.outgoing)}
                onChange={set("outgoing")}
              />
            )}
          </Field>
        )}
        {o.capabilities.routed && (
          <Field
            label="Routed"
            hint="Traffic passing through this server, like a VPN or containers"
          >
            {(p) => (
              <Choice
                id={p.id}
                label="Routed"
                value={form.routed}
                items={withCurrent(policies, form.routed)}
                onChange={set("routed")}
              />
            )}
          </Field>
        )}
        <Field
          label="Logging"
          hint="Blocked connections show in the Blocked tab once this is on"
        >
          {(p) => (
            <Choice
              id={p.id}
              label="Logging"
              value={form.logging}
              items={withCurrent(
                levels.map((v) => ({ value: v, label: label(v) })),
                form.logging,
              )}
              onChange={set("logging")}
            />
          )}
        </Field>
      </div>
    </ResponsiveDialog>
  )
}
