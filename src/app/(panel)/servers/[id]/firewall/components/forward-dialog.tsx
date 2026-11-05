"use client"

import { ChevronRight } from "lucide-react"
import { type FormEvent, useState } from "react"

import { Choice } from "@/components/access/choice"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { api, fieldErrors } from "@/lib/api"
import type { FirewallForwardBody, Forward } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Field } from "../../../components/fields"
import { Segmented } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useFirewallActions } from "./firewall-actions"

const FORM_ID = "fw-forward-form"

const plainInput = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

// Asks where it arrives and where it goes; who may use it waits under More
// options.
export function ForwardDialog({
  open,
  onOpenChange,
  forward,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  forward?: Forward
}) {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const caps = o.capabilities

  const [port, setPort] = useState(forward?.port.replaceAll(":", "-") ?? "")
  const [protocol, setProtocol] = useState<FirewallForwardBody["protocol"]>(
    forward?.protocol ?? "tcp",
  )
  const [remote, setRemote] = useState(Boolean(forward?.to_address))
  const [address, setAddress] = useState(forward?.to_address ?? "")
  const [toPort, setToPort] = useState(
    forward?.to_port.replaceAll(":", "-") ?? "",
  )
  const [comment, setComment] = useState(forward?.comment ?? "")
  const [from, setFrom] = useState(forward?.from ?? "")
  const [iface, setIface] = useState(forward?.interface ?? "")
  const [zone, setZone] = useState(forward?.zone ?? "")
  const [more, setMore] = useState(Boolean(forward?.from || forward?.interface))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string>()

  const zoneValue = zone || o.default_zone || ""
  const zones = o.zones
    .filter((z) => z.active || z.default || z.name === zoneValue)
    .map((z) => ({
      value: z.name,
      label: z.default ? `${z.name} (default)` : z.name,
    }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setProblem(undefined)
    const wanted: Record<string, string> = {}
    if (!port.trim()) wanted.port = "Enter the port it arrives on"
    if (remote && !address.trim()) {
      wanted.to_address = "Enter the machine's address"
    }
    if (!remote && !toPort.trim()) {
      wanted.to_port = "Enter the port it goes to on this server"
    }
    setErrors(wanted)
    if (Object.keys(wanted).length > 0) return

    const body: FirewallForwardBody = {
      port: port.trim(),
      protocol,
      to_address: remote ? address.trim() : undefined,
      to_port: toPort.trim() || undefined,
      comment: caps.comments ? comment.trim() || undefined : undefined,
      from: caps.forward_from ? from.trim() || undefined : undefined,
      interface: caps.forward_from ? iface.trim() || undefined : undefined,
      zone: caps.zones ? zone || undefined : undefined,
    }
    const ok = await a.apply(
      () =>
        forward
          ? api.firewall.updateFirewallForward(server.id, forward.id, body)
          : api.firewall.addFirewallForward(server.id, body),
      forward ? "Forward saved" : "Forward added",
      (err) => {
        const fields = fieldErrors(err)
        setErrors(fields)
        if (Object.keys(fields).length === 0) setProblem(err.message)
        if (fields.from || fields.interface || fields.zone) setMore(true)
      },
    )
    if (ok) onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={forward ? "Edit forward" : "Forward a port"}
      description="What arrives on this port goes somewhere else."
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            type="submit"
            form={FORM_ID}
            size={phone ? "lg" : "default"}
            disabled={a.busy}
          >
            {a.busy ? "Applying…" : forward ? "Save" : "Add forward"}
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
        className="flex min-w-0 flex-col gap-4 md:-mx-6 md:max-h-[calc(100dvh-13rem)] md:overflow-y-auto md:px-6 md:pb-1"
      >
        <Field
          label="Port it arrives on"
          error={errors.port}
          hint={errors.port ? undefined : "One port, or a range like 5000-5010"}
        >
          {(p) => (
            <div className="flex items-center gap-2">
              <Input
                {...p}
                {...plainInput}
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="8080"
                inputMode="numeric"
                autoComplete="off"
              />
              <div className="flex shrink-0">
                <Segmented
                  label="Protocol"
                  items={[
                    { value: "tcp", label: "TCP" },
                    { value: "udp", label: "UDP" },
                  ]}
                  value={protocol}
                  onChange={setProtocol}
                />
              </div>
            </div>
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">Send it to</span>
          <div className="flex">
            <Segmented
              label="Send it to"
              items={[
                { value: "here", label: "This server" },
                { value: "remote", label: "Another machine" },
              ]}
              value={remote ? "remote" : "here"}
              onChange={(v) => setRemote(v === "remote")}
            />
          </div>
        </div>

        {remote && (
          <Field
            label="Machine's address"
            error={errors.to_address}
            hint={
              errors.to_address
                ? undefined
                : "An IPv4 address this server can reach"
            }
          >
            {(p) => (
              <Input
                {...p}
                {...plainInput}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="10.0.0.5"
                inputMode="url"
                autoComplete="off"
              />
            )}
          </Field>
        )}

        <Field
          label={remote ? "Port there" : "Port on this server"}
          error={errors.to_port}
          hint={
            errors.to_port
              ? undefined
              : remote
                ? "Leave it empty to use the same port"
                : "That port can then be reached directly too"
          }
        >
          {(p) => (
            <Input
              {...p}
              {...plainInput}
              value={toPort}
              onChange={(e) => setToPort(e.target.value)}
              placeholder={remote ? port.trim() || "Same port" : "80"}
              inputMode="numeric"
              autoComplete="off"
            />
          )}
        </Field>

        {caps.comments && (
          <Field label="Note" hint="Optional: what this forward is for">
            {(p) => (
              <Input
                {...p}
                value={comment}
                maxLength={120}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Staging web server"
              />
            )}
          </Field>
        )}

        {(caps.forward_from || caps.zones) && (
          <Collapsible open={more} onOpenChange={setMore}>
            <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-1 text-body-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8">
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  more && "rotate-90",
                )}
              />
              More options
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-4 pt-3">
              {caps.forward_from && (
                <>
                  <Field
                    label="Only from"
                    error={errors.from}
                    hint={
                      errors.from
                        ? undefined
                        : "One address or a network. Empty = anyone"
                    }
                  >
                    {(p) => (
                      <Input
                        {...p}
                        {...plainInput}
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        placeholder="Anyone"
                        inputMode="url"
                      />
                    )}
                  </Field>
                  <Field
                    label="Only on network interface"
                    error={errors.interface}
                  >
                    {(p) => (
                      <Input
                        {...p}
                        {...plainInput}
                        value={iface}
                        maxLength={15}
                        onChange={(e) => setIface(e.target.value)}
                        placeholder="Any"
                      />
                    )}
                  </Field>
                </>
              )}
              {caps.zones && (
                <Field label="Zone" error={errors.zone}>
                  {(p) => (
                    <Choice
                      id={p.id}
                      label="Zone"
                      value={zoneValue}
                      items={zones}
                      onChange={(z) => setZone(z === o.default_zone ? "" : z)}
                    />
                  )}
                </Field>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {problem && (
          <p className="text-body-sm break-words text-destructive">{problem}</p>
        )}
      </form>
    </ResponsiveDialog>
  )
}
