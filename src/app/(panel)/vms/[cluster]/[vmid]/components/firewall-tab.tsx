"use client"

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpFromLine,
  Ellipsis,
  Pencil,
  Plus,
  Power,
  Shield,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type {
  PVEFirewall,
  PVEFirewallOptions,
  PVEFirewallRule,
} from "@/lib/services"
import { cn } from "@/lib/utils"

import {
  Empty,
  type Item,
  ItemMenu,
  Segmented,
} from "../../../../servers/[id]/components/parts"
import { useFirewallChange, useGuestFirewall } from "../../../api"
import { CheckRow, Pick } from "../../../components/form-parts"
import { Footer } from "../../../components/guest-dialogs"
import { TabLoading, useGuestPage } from "./guest-page"
import { MenuRow, Panel, TabBar, TabBody, Tag } from "./kit"

type Policy = PVEFirewallOptions["policy_in"]
type Direction = "in" | "out"

// Proxmox's built-in macros people reach for most; any other name typed
// in the field is sent as is.
const macros = [
  "SSH",
  "HTTP",
  "HTTPS",
  "Web",
  "DNS",
  "Ping",
  "SMTP",
  "IMAPS",
  "MySQL",
  "PostgreSQL",
  "RDP",
  "NTP",
] as const

const policyItems: { value: Policy; label: string; detail?: string }[] = [
  { value: "", label: "Proxmox default", detail: "in: drop · out: accept" },
  { value: "ACCEPT", label: "Allow" },
  { value: "DROP", label: "Drop", detail: "silently" },
  { value: "REJECT", label: "Reject", detail: "answers 'refused'" },
]

const actionTone = (a: string) =>
  a === "ACCEPT"
    ? "success"
    : a === "DROP" || a === "REJECT"
      ? "destructive"
      : "brand"

const actionLabel = (a: string) =>
  a === "ACCEPT"
    ? "Allow"
    : a === "DROP"
      ? "Drop"
      : a === "REJECT"
        ? "Reject"
        : a

// "SSH" / "tcp 80,443" / "any".
function whatText(r: PVEFirewallRule) {
  if (r.type === "group") return `Security group ${r.action}`
  if (r.macro) return r.dport ? `${r.macro} · port ${r.dport}` : r.macro
  const proto = r.proto || "any"
  return r.dport ? `${proto} ${r.dport}` : proto
}

function sideText(r: PVEFirewallRule) {
  const from = r.source || "anywhere"
  const to = r.dest || "this machine"
  return r.type === "out"
    ? `to ${r.dest || "anywhere"}`
    : `from ${from}${r.dest ? ` to ${to}` : ""}`
}

const blankRule = (type: Direction = "in"): PVEFirewallRule => ({
  pos: 0,
  type,
  action: "ACCEPT",
  enable: true,
  source: "",
  dest: "",
  proto: "tcp",
  dport: "",
  sport: "",
  iface: "",
  macro: "",
  comment: "",
  log: "",
})

type Layer =
  | { kind: "edit"; rule: PVEFirewallRule | null; preset?: PVEFirewallRule }
  | { kind: "delete"; rule: PVEFirewallRule }
  | null

export function FirewallTab() {
  const { guest: g, phone, can } = useGuestPage()
  const q = useGuestFirewall(g.cluster_id, g.vmid)
  const change = useFirewallChange(g.cluster_id, g.vmid)
  const edit = can("engineer")
  const [layer, setLayer] = useState<Layer>(null)
  const [open, setOpen] = useOpen("vm-firewall")
  const show = (l: Layer) => {
    setLayer(l)
    setOpen(true)
  }

  if (q.isLoading) return <TabLoading />
  if (q.isError) {
    return (
      <Empty
        icon={Shield}
        title="Couldn't read the firewall"
        body={q.error.message}
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  const fw = q.data as PVEFirewall
  const rules = [...fw.rules].sort((a, b) => a.pos - b.pos)
  const o = fw.options

  const setOptions = (patch: Partial<PVEFirewallOptions>) =>
    change.mutate(
      { kind: "options", options: { ...o, ...patch } },
      { onError: (e) => toast.error(e.message) },
    )
  const move = (r: PVEFirewallRule, to: number) =>
    change.mutate(
      { kind: "move", pos: r.pos, to },
      { onError: (e) => toast.error(e.message) },
    )
  const toggle = (r: PVEFirewallRule) =>
    change.mutate(
      { kind: "update", pos: r.pos, rule: { ...r, enable: !r.enable } },
      { onError: (e) => toast.error(e.message) },
    )

  const menu = (r: PVEFirewallRule, i: number): Item[][] =>
    edit
      ? [
          [
            {
              key: "edit",
              label: "Edit…",
              icon: <Pencil />,
              onSelect: () => show({ kind: "edit", rule: r }),
            },
            {
              key: "toggle",
              label: r.enable ? "Turn off" : "Turn on",
              icon: <Power />,
              onSelect: () => toggle(r),
            },
            {
              key: "copy",
              label: "Duplicate…",
              icon: <Plus />,
              onSelect: () =>
                show({ kind: "edit", rule: null, preset: { ...r, pos: 0 } }),
            },
          ],
          [
            {
              key: "up",
              label: "Move up",
              icon: <ArrowUp />,
              disabled: i === 0,
              onSelect: () => move(r, rules[i - 1].pos),
            },
            {
              key: "down",
              label: "Move down",
              icon: <ArrowDown />,
              disabled: i === rules.length - 1,
              onSelect: () => move(r, rules[i + 1].pos),
            },
          ],
          [
            {
              key: "delete",
              label: "Delete…",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => show({ kind: "delete", rule: r }),
            },
          ],
        ]
      : []

  const addButton = edit && (
    <Button
      size={phone ? "lg" : "sm"}
      onClick={() => show({ kind: "edit", rule: null })}
      className="max-md:w-full"
    >
      <Plus />
      Add rule
    </Button>
  )

  return (
    <TabBody>
      {!o.enable && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-body-sm max-md:rounded-none max-md:border-x-0 max-md:border-t-0">
          <ShieldOff className="size-4 shrink-0 text-warning" />
          <span className="flex-1">
            The firewall is off for this machine, so the rules below do nothing.
            It also needs the cluster's firewall on, and <b>firewall=1</b> on
            each network card.
          </span>
          {edit && (
            <Button
              size="sm"
              disabled={change.isPending}
              onClick={() => setOptions({ enable: true })}
            >
              Turn on
            </Button>
          )}
        </div>
      )}

      <div className="grid min-w-0 gap-4 max-md:gap-0 xl:grid-cols-[22rem_1fr]">
        <Panel title="Settings">
          <fieldset
            disabled={!edit || change.isPending}
            className="flex flex-col gap-4"
          >
            <label
              htmlFor="vm-firewall-on"
              className="flex min-h-11 items-center gap-3"
            >
              <span className="flex-1">
                <span className="block text-body-sm font-medium">
                  Firewall on
                </span>
                <span className="block text-caption text-muted-foreground">
                  Filter this machine's traffic with the rules.
                </span>
              </span>
              <Switch
                id="vm-firewall-on"
                checked={o.enable}
                disabled={!edit || change.isPending}
                onCheckedChange={(v) => setOptions({ enable: v })}
              />
            </label>
            <Field label="Incoming, when no rule matches">
              {(p) => (
                <Pick<Policy>
                  {...p}
                  value={o.policy_in}
                  onChange={(v) => setOptions({ policy_in: v })}
                  items={policyItems}
                />
              )}
            </Field>
            <Field label="Outgoing, when no rule matches">
              {(p) => (
                <Pick<Policy>
                  {...p}
                  value={o.policy_out}
                  onChange={(v) => setOptions({ policy_out: v })}
                  items={policyItems.map((i) =>
                    i.value === "" ? { ...i, detail: "accept" } : i,
                  )}
                />
              )}
            </Field>
            <CheckRow
              checked={o.dhcp}
              onChange={(v) => setOptions({ dhcp: v })}
              label="Allow DHCP"
              text="Lets the machine get its address automatically."
            />
            <CheckRow
              checked={o.macfilter}
              onChange={(v) => setOptions({ macfilter: v })}
              label="MAC filter"
              text="Drops traffic sent from another card's MAC address."
            />
            <CheckRow
              checked={o.ipfilter}
              onChange={(v) => setOptions({ ipfilter: v })}
              label="IP filter"
              text="Drops traffic from addresses not set on the machine (anti-spoofing)."
            />
          </fieldset>
        </Panel>

        <Panel
          title={`Rules · ${rules.length}`}
          aside={!phone && addButton}
          flush
        >
          {phone && edit && <div className="px-4 pb-3">{addButton}</div>}
          {rules.length === 0 ? (
            <p className="px-5 pt-2 pb-6 text-body-sm text-muted-foreground max-md:px-4">
              No rules yet. With the default policy, nothing can reach this
              machine once the firewall is on: add one for SSH first.
              {edit && (
                <Button
                  variant="link"
                  className="h-auto p-0 ps-1"
                  onClick={() =>
                    show({
                      kind: "edit",
                      rule: null,
                      preset: { ...blankRule(), macro: "SSH", proto: "" },
                    })
                  }
                >
                  Allow SSH
                </Button>
              )}
            </p>
          ) : phone ? (
            <ul className="divide-y divide-border">
              {rules.map((r, i) => (
                <li key={r.pos} className={cn(!r.enable && "opacity-60")}>
                  <MenuRow
                    id={`fw-${r.pos}`}
                    phone
                    label={`Rule ${r.pos + 1}`}
                    icon={
                      r.type === "group" ? (
                        <Users />
                      ) : r.type === "out" ? (
                        <ArrowUpFromLine />
                      ) : (
                        <ArrowDownToLine />
                      )
                    }
                    title={
                      <>
                        {r.type !== "group" && (
                          <Tag tone={actionTone(r.action)}>
                            {actionLabel(r.action)}
                          </Tag>
                        )}
                        <span>{whatText(r)}</span>
                        {!r.enable && <Tag>Off</Tag>}
                      </>
                    }
                    sub={[r.type !== "group" && sideText(r), r.comment]
                      .filter(Boolean)
                      .join(" · ")}
                    groups={menu(r, i)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto [contain:inline-size]">
              <table className="w-full text-body-sm">
                <thead className="text-caption text-muted-foreground">
                  <tr className="border-b border-border text-start">
                    <th className="w-10 px-5 py-2 text-start font-normal">#</th>
                    <th className="w-12 py-2 text-start font-normal">On</th>
                    <th className="py-2 text-start font-normal">Direction</th>
                    <th className="py-2 text-start font-normal">Action</th>
                    <th className="py-2 text-start font-normal">What</th>
                    <th className="py-2 text-start font-normal">Where</th>
                    <th className="py-2 text-start font-normal">Note</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rules.map((r, i) => (
                    <tr
                      key={r.pos}
                      className={cn(
                        "align-middle",
                        !r.enable && "text-muted-foreground",
                      )}
                    >
                      <td className="px-5 py-2.5 text-ash tabular-nums">
                        {i + 1}
                      </td>
                      <td className="py-2.5">
                        <Switch
                          size="sm"
                          checked={r.enable}
                          disabled={!edit || change.isPending}
                          aria-label={r.enable ? "Turn off" : "Turn on"}
                          onCheckedChange={() => toggle(r)}
                        />
                      </td>
                      <td className="py-2.5 pe-3">
                        {r.type === "group" ? (
                          "Group"
                        ) : r.type === "out" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <ArrowUpFromLine className="size-3.5 text-ash" />
                            Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <ArrowDownToLine className="size-3.5 text-ash" />
                            In
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pe-3">
                        <Tag tone={actionTone(r.action)}>
                          {actionLabel(r.action)}
                        </Tag>
                      </td>
                      <td className="py-2.5 pe-3 font-mono text-caption">
                        {whatText(r)}
                      </td>
                      <td className="max-w-64 truncate py-2.5 pe-3 font-mono text-caption">
                        {r.type === "group" ? "" : sideText(r)}
                        {r.iface && ` · ${r.iface}`}
                      </td>
                      <td className="max-w-64 truncate py-2.5 pe-3 text-muted-foreground">
                        {r.comment}
                      </td>
                      <td className="pe-3">
                        {edit && (
                          <ItemMenu
                            label={`Rule ${i + 1}`}
                            groups={menu(r, i)}
                            trigger={
                              <button
                                type="button"
                                aria-label={`Rule ${i + 1} actions`}
                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <Ellipsis className="size-4" />
                              </button>
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <TabBar className="max-md:border-0">
        <p className="text-caption text-muted-foreground">
          Rules are checked top to bottom and the first match wins. This is
          Proxmox's firewall on the node, in front of the machine; the machine's
          own firewall (ufw, firewalld) is separate.
        </p>
      </TabBar>

      {layer?.kind === "edit" && (
        <RuleDialog
          open={open}
          onOpenChange={setOpen}
          rule={layer.rule}
          preset={layer.preset}
        />
      )}
      {layer?.kind === "delete" && (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete this rule?"
          description={`${actionLabel(layer.rule.action)} ${whatText(layer.rule)}${layer.rule.comment ? ` (${layer.rule.comment})` : ""}`}
          confirmLabel="Delete rule"
          pending={change.isPending}
          onConfirm={() =>
            change.mutate(
              { kind: "delete", pos: layer.rule.pos },
              {
                onSuccess: () => setOpen(false),
                onError: (e) => toast.error(e.message),
              },
            )
          }
        />
      )}
    </TabBody>
  )
}

type What = "macro" | "port"

function RuleDialog({
  open,
  onOpenChange,
  rule,
  preset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: PVEFirewallRule | null
  preset?: PVEFirewallRule
}) {
  const { guest: g } = useGuestPage()
  const change = useFirewallChange(g.cluster_id, g.vmid)
  const start = rule ?? preset ?? blankRule()
  const [r, setR] = useState<PVEFirewallRule>(start)
  const [what, setWhat] = useState<What>(start.macro ? "macro" : "port")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (patch: Partial<PVEFirewallRule>) =>
    setR((x) => ({ ...x, ...patch }))
  const group = r.type === "group"

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const bad: Record<string, string> = {}
    if (group && !r.action.trim()) bad.action = "The security group's name."
    if (!group && what === "macro" && !r.macro.trim())
      bad.macro = "Pick a service, or switch to Port."
    if (
      r.dport &&
      !/^[0-9,:\s-]+$/.test(r.dport) &&
      !/^[a-z0-9,-]+$/i.test(r.dport)
    )
      bad.dport = "Ports like 80, 443 or 8000:8100."
    setErrors(bad)
    if (Object.keys(bad).length) return
    const body: PVEFirewallRule = {
      ...r,
      macro: group || what !== "macro" ? "" : r.macro.trim(),
      proto: group || what === "macro" ? "" : r.proto,
      dport: r.dport.replace(/\s+/g, ""),
      sport: r.sport.replace(/\s+/g, ""),
      source: r.source.trim(),
      dest: r.dest.trim(),
      comment: r.comment.trim(),
    }
    change.mutate(
      rule
        ? { kind: "update", pos: rule.pos, rule: body }
        : { kind: "add", rule: body },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          const fe = fieldErrors(err)
          setErrors(fe)
          if (!Object.keys(fe).length) toast.error(err.message)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? "Edit rule" : "Add a rule"}
      className="sm:max-w-lg"
      footer={
        <Footer
          form="vm-fw-rule"
          pending={change.isPending}
          label={rule ? "Save" : "Add rule"}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id="vm-fw-rule" onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Segmented<PVEFirewallRule["type"]>
            label="Direction"
            value={r.type}
            onChange={(type) =>
              set({
                type,
                action: type === "group" ? "" : r.action || "ACCEPT",
              })
            }
            items={[
              { value: "in", label: "Incoming" },
              { value: "out", label: "Outgoing" },
              { value: "group", label: "Group" },
            ]}
          />
          {!group && (
            <Segmented<string>
              label="Action"
              value={r.action}
              onChange={(action) => set({ action })}
              items={[
                { value: "ACCEPT", label: "Allow" },
                { value: "DROP", label: "Drop" },
                { value: "REJECT", label: "Reject" },
              ]}
            />
          )}
        </div>

        {group ? (
          <Field
            label="Security group"
            hint="A group made on the cluster's firewall (Datacenter › Firewall › Security group)."
            error={errors.action}
          >
            {(p) => (
              <Input
                {...p}
                value={r.action}
                onChange={(e) => set({ action: e.target.value })}
                autoCapitalize="none"
                placeholder="webservers"
              />
            )}
          </Field>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Segmented<What>
                label="Match"
                value={what}
                onChange={setWhat}
                items={[
                  { value: "port", label: "Protocol and port" },
                  { value: "macro", label: "Known service" },
                ]}
              />
              {what === "macro" ? (
                <Field
                  label="Service"
                  hint="A Proxmox macro: it knows the ports and protocols."
                  error={errors.macro}
                >
                  {(p) => (
                    <>
                      <Input
                        {...p}
                        list="pve-macros"
                        value={r.macro}
                        onChange={(e) => set({ macro: e.target.value })}
                        autoCapitalize="none"
                        placeholder="SSH"
                      />
                      <datalist id="pve-macros">
                        {macros.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                      <div className="flex flex-wrap gap-1.5">
                        {macros.slice(0, 7).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => set({ macro: m })}
                            className={cn(
                              "h-8 rounded-full border border-border px-3 text-caption hover:bg-muted max-md:h-9",
                              r.macro === m &&
                                "border-brand bg-brand-soft text-brand-strong",
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </Field>
              ) : (
                <div className="grid grid-cols-[8rem_1fr] gap-3">
                  <Field label="Protocol">
                    {(p) => (
                      <Pick
                        {...p}
                        value={r.proto}
                        onChange={(proto) => set({ proto })}
                        items={[
                          { value: "tcp", label: "TCP" },
                          { value: "udp", label: "UDP" },
                          { value: "icmp", label: "ICMP" },
                          { value: "", label: "Any" },
                        ]}
                      />
                    )}
                  </Field>
                  <Field
                    label="Port"
                    hint="80, 443 or 8000:8100"
                    error={errors.dport}
                  >
                    {(p) => (
                      <Input
                        {...p}
                        value={r.dport}
                        disabled={r.proto === "icmp" || r.proto === ""}
                        onChange={(e) => set({ dport: e.target.value })}
                        inputMode="numeric"
                        placeholder="Any"
                        className="font-mono"
                      />
                    )}
                  </Field>
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="From"
                hint="Address, range or +ipset. Blank = anywhere."
                error={errors.source}
              >
                {(p) => (
                  <Input
                    {...p}
                    value={r.source}
                    onChange={(e) => set({ source: e.target.value })}
                    autoCapitalize="none"
                    placeholder="Anywhere"
                    className="font-mono"
                  />
                )}
              </Field>
              <Field label="To" hint="Blank = any." error={errors.dest}>
                {(p) => (
                  <Input
                    {...p}
                    value={r.dest}
                    onChange={(e) => set({ dest: e.target.value })}
                    autoCapitalize="none"
                    placeholder="Any"
                    className="font-mono"
                  />
                )}
              </Field>
            </div>
          </>
        )}

        <Field label="Note" error={errors.comment}>
          {(p) => (
            <Input
              {...p}
              value={r.comment}
              onChange={(e) => set({ comment: e.target.value })}
              placeholder="Why this rule is here"
            />
          )}
        </Field>

        <details className="group rounded-lg border border-border px-3 py-2">
          <summary className="cursor-pointer text-body-sm text-muted-foreground">
            More options
          </summary>
          <div className="flex flex-col gap-3 pt-3">
            {!group && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Network card"
                  hint="net0… Blank = all."
                  error={errors.iface}
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={r.iface}
                      onChange={(e) => set({ iface: e.target.value })}
                      autoCapitalize="none"
                      placeholder="All"
                      className="font-mono"
                    />
                  )}
                </Field>
                <Field label="Source port" error={errors.sport}>
                  {(p) => (
                    <Input
                      {...p}
                      value={r.sport}
                      onChange={(e) => set({ sport: e.target.value })}
                      inputMode="numeric"
                      placeholder="Any"
                      className="font-mono"
                    />
                  )}
                </Field>
              </div>
            )}
            <Field label="Log matches">
              {(p) => (
                <Pick
                  {...p}
                  value={r.log}
                  onChange={(log) => set({ log })}
                  items={[
                    { value: "", label: "Don't log" },
                    { value: "info", label: "Info" },
                    { value: "warning", label: "Warning" },
                    { value: "err", label: "Error" },
                  ]}
                />
              )}
            </Field>
            <CheckRow
              checked={r.enable}
              onChange={(enable) => set({ enable })}
              label="Rule on"
            />
          </div>
        </details>
      </form>
    </ResponsiveDialog>
  )
}
