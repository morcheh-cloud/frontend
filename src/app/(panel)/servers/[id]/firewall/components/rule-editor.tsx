"use client"

import { ChevronRight } from "lucide-react"
import { type FormEvent, useId, useMemo, useState } from "react"

import { Choice } from "@/components/access/choice"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ApiError, api, fieldErrors } from "@/lib/api"
import type { FilterRule, FirewallRuleBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Field } from "../../../components/fields"
import { Segmented } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { usePorts } from "../../ports/api"
import { useFirewallActions } from "./firewall-actions"
import { isSensitive, PRESETS, portName, toBody } from "./meta"
import { Chips } from "./parts"

const FORM_ID = "fw-rule-form"

type Form = {
  allow: boolean
  // limit on an allow, reject on a block
  strict: boolean
  target: string
  anyone: boolean
  from: string
  comment: string
  protocol: NonNullable<FirewallRuleBody["protocol"]>
  direction: NonNullable<FirewallRuleBody["direction"]>
  to: string
  iface: string
  outIface: string
  log: boolean
  top: boolean
  zone: string
}

function startForm(
  rule: FilterRule | undefined,
  prefill: Partial<FirewallRuleBody> | undefined,
): Form {
  const b: Partial<FirewallRuleBody> = rule ? toBody(rule) : (prefill ?? {})
  const action = b.action ?? "allow"
  return {
    allow: action === "allow" || action === "limit",
    strict: action === "limit" || action === "reject",
    target: b.service || b.port || "",
    anyone: !b.from,
    from: b.from ?? "",
    comment: b.comment ?? "",
    protocol: b.protocol ?? (rule ? "any" : "tcp"),
    direction: b.direction ?? "in",
    to: b.to ?? "",
    iface: b.interface ?? "",
    outIface: b.out_interface ?? "",
    log: b.log ?? false,
    top: false,
    zone: b.zone ?? "",
  }
}

// A rule has more knobs than anyone needs daily: the form asks what, who and
// why, and the rest waits under More options.
export function RuleEditor({
  open,
  onOpenChange,
  rule,
  prefill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: FilterRule
  prefill?: Partial<FirewallRuleBody>
}) {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const caps = o.capabilities
  const [form, setForm] = useState(() => startForm(rule, prefill))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState<string>()
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  const moreId = useId()

  const advanced =
    form.strict ||
    form.direction !== "in" ||
    Boolean(form.to || form.iface || form.outIface || form.zone) ||
    form.log
  const [more, setMore] = useState(advanced)

  const target = form.target.trim()
  const isPort = /^[\d\s,:-]+$/.test(target)
  const port = isPort ? target.replaceAll(" ", "") : ""
  const service = target && !isPort ? target : ""

  const risky = form.allow && form.anyone && isSensitive(port)
  const zoneValue = form.zone || o.default_zone || ""
  // A zone no interface or address uses does nothing, and its rules aren't
  // listed: a rule added there would simply vanish.
  const zones = o.zones
    .filter((z) => z.active || z.default || z.name === zoneValue)
    .map((z) => ({
      value: z.name,
      label: z.default ? `${z.name} (default)` : z.name,
    }))

  function body(): FirewallRuleBody {
    let action: FirewallRuleBody["action"] = form.allow ? "allow" : "block"
    if (form.strict) action = form.allow ? "limit" : "reject"
    return {
      action,
      direction: form.direction,
      port: port || undefined,
      service: service || undefined,
      // Without a port the choice has no meaning for a new rule.
      protocol: service || (!port && !rule) ? "any" : form.protocol,
      from: form.anyone ? undefined : form.from.trim() || undefined,
      to: form.to.trim() || undefined,
      interface: form.iface.trim() || undefined,
      out_interface: form.outIface.trim() || undefined,
      comment: form.comment.trim() || undefined,
      zone: caps.zones ? form.zone || undefined : undefined,
      log: form.log || undefined,
      top: form.top || undefined,
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setProblem(undefined)
    if (!target && form.anyone) {
      setErrors({ target: "Enter a port or a service, or pick an address" })
      return
    }
    if (!form.anyone && !form.from.trim()) {
      setErrors({ from: "Enter an address or a network" })
      return
    }
    setErrors({})
    const data = body()
    const ok = await a.apply(
      () =>
        rule
          ? api.firewall.updateFirewallRule(server.id, rule.id, data)
          : api.firewall.addFirewallRule(server.id, data),
      rule ? "Rule saved" : "Rule added",
      (err) => {
        const fields = fieldErrors(err)
        const { port: p, service: s, ...rest } = fields
        if (p || s) rest.target = p ?? s
        setErrors(rest)
        if (Object.keys(rest).length === 0) setProblem(err.message)
        if (fields.protocol || fields.to || fields.interface) setMore(true)
        if (err instanceof ApiError && err.status >= 500) {
          setProblem(err.message)
        }
      },
    )
    if (ok) onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? "Edit rule" : "Add a rule"}
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            type="submit"
            form={FORM_ID}
            size={phone ? "lg" : "default"}
            disabled={a.busy}
          >
            {a.busy ? "Applying…" : rule ? "Save" : "Add rule"}
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
        <div className="flex">
          <Segmented
            label="Action"
            items={[
              { value: "allow", label: "Allow" },
              { value: "block", label: "Block" },
            ]}
            value={form.allow ? "allow" : "block"}
            onChange={(v) => set({ allow: v === "allow", strict: false })}
          />
        </div>

        <Field
          label="Port or service"
          error={errors.target}
          hint={
            !errors.target
              ? `${portName(port) ? `${portName(port)}. ` : ""}A port, a range like 5000-5010, or a list like 80,443`
              : undefined
          }
        >
          {(p) => (
            <Input
              {...p}
              value={form.target}
              onChange={(e) => set({ target: e.target.value })}
              placeholder="443"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
            />
          )}
        </Field>
        {!rule && open && (
          <Shortcuts
            onPick={(target, protocol) => set({ target, protocol })}
            value={port}
          />
        )}

        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">
            {form.allow ? "Who can connect" : "Who is stopped"}
          </span>
          <div className="flex">
            <Segmented
              label="Who"
              items={[
                { value: "anyone", label: "Anyone" },
                { value: "address", label: "Specific address" },
              ]}
              value={form.anyone ? "anyone" : "address"}
              onChange={(v) => set({ anyone: v === "anyone" })}
            />
          </div>
          {!form.anyone && (
            <Field
              label="Address"
              error={errors.from}
              hint={
                errors.from
                  ? undefined
                  : "One address, or a network like 10.0.0.0/8"
              }
            >
              {(p) => (
                <div className="flex gap-2">
                  <Input
                    {...p}
                    value={form.from}
                    onChange={(e) => set({ from: e.target.value })}
                    placeholder="203.0.113.7"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {o.your_ip && (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 max-md:h-11"
                      onClick={() => set({ from: o.your_ip })}
                    >
                      Use mine
                    </Button>
                  )}
                </div>
              )}
            </Field>
          )}
          {risky && (
            <p className="text-body-sm text-warning">
              This would put {portName(port) ?? "this port"} on the open
              internet. Limit it to an address if you can.
            </p>
          )}
        </div>

        {caps.comments && (
          <Field label="Note" hint="Optional: what this rule is for">
            {(p) => (
              <Input
                {...p}
                value={form.comment}
                maxLength={120}
                onChange={(e) => set({ comment: e.target.value })}
                placeholder="Office VPN"
              />
            )}
          </Field>
        )}

        <Collapsible open={more} onOpenChange={setMore}>
          <CollapsibleTrigger
            id={moreId}
            className="flex min-h-11 w-full items-center gap-1 text-body-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
          >
            <ChevronRight
              className={cn("size-4 transition-transform", more && "rotate-90")}
            />
            More options
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-4 pt-3">
            <Switchy
              label={form.allow ? "Rate limit" : "Answer with a refusal"}
              hint={
                form.allow
                  ? "Slows down an address that opens many connections. Good for SSH."
                  : "Tells the other side it was refused, instead of ignoring it."
              }
              checked={form.strict}
              onChange={(strict) => set({ strict })}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Protocol" error={errors.protocol}>
                {(p) => (
                  <Choice
                    id={p.id}
                    label="Protocol"
                    value={form.protocol}
                    items={[
                      { value: "tcp", label: "TCP" },
                      { value: "udp", label: "UDP" },
                      { value: "any", label: "TCP and UDP" },
                    ]}
                    onChange={(v) => set({ protocol: v as Form["protocol"] })}
                  />
                )}
              </Field>
              {(caps.outbound || caps.routed) && (
                <Field label="Direction">
                  {(p) => (
                    <Choice
                      id={p.id}
                      label="Direction"
                      value={form.direction}
                      items={[
                        { value: "in", label: "Incoming" },
                        ...(caps.outbound
                          ? [{ value: "out", label: "Outgoing" }]
                          : []),
                        ...(caps.routed
                          ? [{ value: "routed", label: "Routed" }]
                          : []),
                      ]}
                      onChange={(v) =>
                        set({ direction: v as Form["direction"] })
                      }
                    />
                  )}
                </Field>
              )}
              {caps.zones && (
                <Field label="Zone">
                  {(p) => (
                    <Choice
                      id={p.id}
                      label="Zone"
                      value={zoneValue}
                      items={zones}
                      onChange={(zone) =>
                        set({ zone: zone === o.default_zone ? "" : zone })
                      }
                    />
                  )}
                </Field>
              )}
              <Field
                label="To this address"
                error={errors.to}
                hint="Only for traffic to this address of the server"
              >
                {(p) => (
                  <Input
                    {...p}
                    value={form.to}
                    onChange={(e) => set({ to: e.target.value })}
                    placeholder="Any"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                )}
              </Field>
              {caps.interface && (
                <Field label="Network interface" error={errors.interface}>
                  {(p) => (
                    <Input
                      {...p}
                      value={form.iface}
                      maxLength={15}
                      onChange={(e) => set({ iface: e.target.value })}
                      placeholder="Any"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  )}
                </Field>
              )}
              {caps.routed && form.direction === "routed" && (
                <Field label="Leaving through" error={errors.out_interface}>
                  {(p) => (
                    <Input
                      {...p}
                      value={form.outIface}
                      maxLength={15}
                      onChange={(e) => set({ outIface: e.target.value })}
                      placeholder="Any"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  )}
                </Field>
              )}
            </div>
            <Switchy
              label="Log matches"
              hint="Writes a line to the server's log each time this rule applies."
              checked={form.log}
              onChange={(log) => set({ log })}
            />
            {!rule && form.allow && !caps.zones && (
              <Switchy
                label="Put it first"
                hint="Checked before the other allow rules. Block rules always go first."
                checked={form.top}
                onChange={(top) => set({ top })}
              />
            )}
          </CollapsibleContent>
        </Collapsible>

        {problem && (
          <p className="text-body-sm break-words text-destructive">{problem}</p>
        )}
      </form>
    </ResponsiveDialog>
  )
}

function Switchy({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI switch inside is the control
    <label className="flex min-h-11 cursor-pointer items-start justify-between gap-4 text-body-sm">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </label>
  )
}

// What's actually listening here first: that's nearly always what a new rule
// is for. Then the usual suspects.
function Shortcuts({
  value,
  onPick,
}: {
  value: string
  onPick: (port: string, protocol: Form["protocol"]) => void
}) {
  const { server } = useServerPage()
  const { data } = usePorts(server.id)
  const items = useMemo(() => {
    const out = new Map<string, { label: string; protocol: Form["protocol"] }>()
    for (const p of data?.ports ?? []) {
      if (p.exposure === "local" || out.size >= 4) continue
      out.set(String(p.port), {
        label: portName(p.port) ?? p.service ?? String(p.port),
        protocol: p.protocol,
      })
    }
    for (const p of PRESETS) {
      if (!out.has(p.port)) {
        out.set(p.port, { label: p.label, protocol: p.protocol })
      }
    }
    return [...out].slice(0, 10)
  }, [data])
  return (
    <div className="-mt-2 flex [scrollbar-width:none] gap-2 overflow-x-auto md:flex-wrap">
      <Chips
        items={items.map(([port, p]) => ({ value: port, label: p.label }))}
        value={value}
        onChange={(port) => {
          const item = items.find(([k]) => k === port)
          if (item) onPick(item[0], item[1].protocol)
        }}
      />
    </div>
  )
}
