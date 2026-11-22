"use client"

import { ArrowUpToLine, Pencil, Plus, ShieldBan, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import { api, fieldErrors } from "@/lib/api"
import type {
  CDNFirewall,
  CDNFirewallRule,
  CDNFirewallRuleFields,
  CDNFirewallSettingsPatch,
  DNSServer,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCdnSecurity, useCdnSecurityChange } from "../../../../../api"
import { ChoiceSelect } from "../../../../../components/fields"
import { Tag } from "../../../../../components/parts"
import {
  Choices,
  EditorSheet,
  RuleRow,
  SettingCard,
  SettingsSkeleton,
  ToggleRow,
} from "./parts"

type Props = {
  server: DNSServer
  zone: string
  canEdit: boolean
  phone: boolean
}
type Action = CDNFirewallRuleFields["action"]

export const firewallActions: { value: Action; label: string; hint: string }[] =
  [
    { value: "allow", label: "Let in", hint: "Skips the rules below it." },
    {
      value: "challenge",
      label: "Challenge",
      hint: "Visitors prove they're people first.",
    },
    { value: "deny", label: "Block", hint: "Answered with 403." },
    {
      value: "bypass",
      label: "Skip protections",
      hint: "Goes on to the rules below, without the checks picked.",
    },
  ]

const actionTone = (a: string) =>
  a === "deny"
    ? "destructive"
    : a === "challenge"
      ? "warning"
      : a === "allow"
        ? "brand"
        : "muted"

export const actionLabel = (a: string) =>
  firewallActions.find((x) => x.value === a)?.label ?? a

// Helper conditions, written in ArvanCloud's filter language.
const conditionFields = [
  { value: "country", label: "Country is", placeholder: "IR, DE" },
  { value: "not-country", label: "Country isn't", placeholder: "IR" },
  {
    value: "ip",
    label: "Address is in",
    placeholder: "203.0.113.5, 10.0.0.0/8",
  },
  { value: "path-contains", label: "Path contains", placeholder: "/admin" },
  { value: "path-is", label: "Path is", placeholder: "/login" },
  { value: "host", label: "Host is", placeholder: "www.example.com" },
  { value: "agent", label: "User agent contains", placeholder: "curl" },
  { value: "method", label: "Method is", placeholder: "POST" },
] as const
type ConditionField = (typeof conditionFields)[number]["value"]

const quote = (s: string) =>
  `"${s.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
const list = (v: string) => v.split(/[\s,]+/).filter(Boolean)

export function condition(field: ConditionField, value: string) {
  const v = value.trim()
  switch (field) {
    case "country":
      return `ip.geoip.country in {${list(v.toUpperCase()).map(quote).join(" ")}}`
    case "not-country":
      return `not ip.geoip.country in {${list(v.toUpperCase()).map(quote).join(" ")}}`
    case "ip":
      return `ip.src in {${list(v).join(" ")}}`
    case "path-contains":
      return `http.request.uri.path contains ${quote(v)}`
    case "path-is":
      return `http.request.uri.path eq ${quote(v)}`
    case "host":
      return `http.host eq ${quote(v)}`
    case "agent":
      return `http.user_agent contains ${quote(v)}`
    case "method":
      return `http.request.method in {${list(v.toUpperCase()).map(quote).join(" ")}}`
  }
}

const skipItems = [
  { value: "waf", label: "WAF" },
  { value: "rate_limit", label: "Rate limits" },
  { value: "challenge", label: "Challenge" },
] as const

export function FirewallTab({ server, zone, canEdit, phone }: Props) {
  const q = useCdnSecurity(server.id, zone, "firewall")
  const change = useCdnSecurityChange(server.id, zone, "firewall")
  const [editorOpen, setEditorOpen] = useOpen("cdn-fw-rule")
  const [editing, setEditing] = useState<{
    rule?: CDNFirewallRule
    key: number
  }>({ key: 0 })
  const [deleteOpen, setDeleteOpen] = useOpen("cdn-fw-delete")
  const [toDelete, setToDelete] = useState<CDNFirewallRule>()
  const [denyOpen, setDenyOpen] = useOpen("cdn-fw-deny")

  if (q.isPending) return <SettingsSkeleton phone={phone} />
  if (!q.data)
    return (
      <Empty
        icon={ShieldBan}
        title="Couldn't read the firewall"
        body={(q.error as Error | null)?.message ?? ""}
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  const fw = q.data
  const rules = fw.rules
  const id = server.id

  const go = (run: (z: string) => Promise<CDNFirewall>, done?: string) =>
    change.mutate(run, {
      onSuccess: () => done && toast.success(done),
      onError: (e) => toast.error(e.message),
    })
  const setSettings = (body: CDNFirewallSettingsPatch, done: string) =>
    go((z) => api.dns.updateCdnFirewallSettings(id, z, body), done)

  const open = (rule?: CDNFirewallRule) => {
    setEditing((e) => ({ rule, key: e.key + 1 }))
    setEditorOpen(true)
  }

  return (
    <div className={cn("flex flex-col", !phone && "gap-4")}>
      <SettingCard
        phone={phone}
        title="Firewall"
        hint="Rules ArvanCloud checks on every request before it reaches the site."
      >
        <Field
          label="When no rule matches"
          hint={
            fw.settings.default_action === "deny"
              ? "Only requests a rule lets in reach the site."
              : fw.settings.default_action === "challenge"
                ? "Everyone else proves they're a person first."
                : "Everyone else goes through."
          }
        >
          {() => (
            <Choices
              label="Default action"
              value={
                (["allow", "challenge", "deny"].includes(
                  fw.settings.default_action,
                )
                  ? fw.settings.default_action
                  : "allow") as "allow" | "challenge" | "deny"
              }
              disabled={!canEdit || change.isPending}
              onChange={(v) =>
                v === "deny"
                  ? setDenyOpen(true)
                  : setSettings({ default_action: v }, "Firewall updated")
              }
              items={[
                { value: "allow", label: "Let in" },
                { value: "challenge", label: "Challenge" },
                { value: "deny", label: "Block" },
              ]}
            />
          )}
        </Field>
        <ToggleRow
          label="Check the requested name (SNI)"
          hint="Refuse https requests made for another domain."
          checked={fw.settings.verify_sni}
          disabled={!canEdit || change.isPending}
          onChange={(verify_sni) =>
            setSettings({ verify_sni }, "Firewall updated")
          }
        />
        <ToggleRow
          label="Leave out the account's own rules"
          hint="Rules set for the whole ArvanCloud account don't apply here."
          checked={fw.settings.skip_global_firewall}
          disabled={!canEdit || change.isPending}
          onChange={(skip_global_firewall) =>
            setSettings({ skip_global_firewall }, "Firewall updated")
          }
        />
      </SettingCard>

      <SettingCard
        phone={phone}
        title="Rules"
        hint="Checked from the top; the first rule that matches decides."
        action={
          canEdit && (
            <Button size="sm" onClick={() => open()}>
              <Plus />
              Add rule
            </Button>
          )
        }
      >
        {rules.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No rules: every request gets the action above.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {rules.map((r, i) => {
              const editable = canEdit && !r.account_level
              return (
                <RuleRow
                  key={r.id}
                  index={i}
                  count={rules.length}
                  enabled={r.enabled}
                  canEdit={editable}
                  title={r.name}
                  detail={r.filter_expr}
                  tag={
                    <>
                      <Tag tone={actionTone(r.action)}>
                        {actionLabel(r.action)}
                      </Tag>
                      {r.account_level && <Tag>Account</Tag>}
                    </>
                  }
                  onToggle={(on) =>
                    go(
                      (z) =>
                        api.dns.setCdnFirewallRuleEnabled(id, z, r.id, {
                          enabled: on,
                        }),
                      `${r.name} ${on ? "on" : "off"}`,
                    )
                  }
                  onOpen={editable ? () => open(r) : undefined}
                  onMove={(dir) => {
                    const other = rules[i + dir]
                    go((z) =>
                      api.dns.moveCdnFirewallRule(
                        id,
                        z,
                        r.id,
                        dir < 0 ? { before: other.id } : { after: other.id },
                      ),
                    )
                  }}
                  menu={[
                    editable
                      ? [
                          {
                            key: "edit",
                            label: "Edit",
                            icon: <Pencil />,
                            onSelect: () => open(r),
                          },
                          ...(i > 0
                            ? [
                                {
                                  key: "top",
                                  label: "Move to the top",
                                  icon: <ArrowUpToLine />,
                                  onSelect: () =>
                                    go((z) =>
                                      api.dns.moveCdnFirewallRule(id, z, r.id, {
                                        before: rules[0].id,
                                      }),
                                    ),
                                },
                              ]
                            : []),
                        ]
                      : [],
                    editable
                      ? [
                          {
                            key: "delete",
                            label: "Delete",
                            icon: <Trash2 />,
                            destructive: true,
                            onSelect: () => {
                              setToDelete(r)
                              setDeleteOpen(true)
                            },
                          },
                        ]
                      : [],
                  ]}
                />
              )
            })}
          </ul>
        )}
      </SettingCard>

      <FirewallRuleEditor
        key={editing.key}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        server={server}
        zone={zone}
        rule={editing.rule}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${toDelete?.name}”?`}
        description={toDelete?.filter_expr}
        confirmLabel="Delete rule"
        pending={change.isPending}
        onConfirm={() =>
          toDelete &&
          change.mutate(
            (z) => api.dns.deleteCdnFirewallRule(id, z, toDelete.id),
            {
              onSuccess: () => {
                setDeleteOpen(false)
                toast.success("Rule deleted")
              },
              onError: (e) => toast.error(e.message),
            },
          )
        }
      />
      <ConfirmDialog
        open={denyOpen}
        onOpenChange={setDenyOpen}
        title="Block everything no rule lets in?"
        description="Visitors, search engines and your own tools get 403 unless a rule above lets them in. Add the Let in rules first."
        confirmLabel="Block the rest"
        pending={change.isPending}
        onConfirm={() =>
          change.mutate(
            (z) =>
              api.dns.updateCdnFirewallSettings(id, z, {
                default_action: "deny",
              }),
            {
              onSuccess: () => {
                setDenyOpen(false)
                toast.success("Firewall blocks the rest")
              },
              onError: (e) => toast.error(e.message),
            },
          )
        }
      />
    </div>
  )
}

function FirewallRuleEditor({
  open,
  onOpenChange,
  server,
  zone,
  rule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: DNSServer
  zone: string
  rule?: CDNFirewallRule
}) {
  const change = useCdnSecurityChange(server.id, zone, "firewall")
  const [v, setV] = useState<CDNFirewallRuleFields>(() => ({
    name: rule?.name ?? "",
    filter_expr: rule?.filter_expr ?? "",
    action: rule?.action ?? "deny",
    enabled: rule?.enabled ?? true,
    note: rule?.note ?? "",
    skip: rule?.skip ?? ["waf", "rate_limit"],
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [field, setField] = useState<ConditionField>("country")
  const [value, setValue] = useState("")
  const [join, setJoin] = useState<"and" | "or">("and")
  const set = (p: Partial<CDNFirewallRuleFields>) => {
    setV((x) => ({ ...x, ...p }))
    setErrors({})
  }
  const meta = conditionFields.find((f) => f.value === field)

  function addCondition() {
    if (!value.trim()) return
    const c = condition(field, value)
    set({
      filter_expr: v.filter_expr.trim()
        ? `(${v.filter_expr.trim()}) ${join} ${c}`
        : c,
    })
    setValue("")
  }

  function submit() {
    const missing: Record<string, string> = {}
    if (!v.name.trim()) missing.name = "Give it a name"
    if (v.filter_expr.trim().length < 3)
      missing.filter_expr = "Say which requests it's for"
    if (Object.keys(missing).length) return setErrors(missing)
    const body: CDNFirewallRuleFields = {
      name: v.name.trim(),
      filter_expr: v.filter_expr.trim(),
      action: v.action,
      enabled: v.enabled,
      ...(v.note?.trim() && { note: v.note.trim() }),
      ...(v.action === "bypass" && { skip: v.skip ?? [] }),
    }
    change.mutate(
      (z) =>
        rule
          ? api.dns.updateCdnFirewallRule(server.id, z, rule.id, body)
          : api.dns.addCdnFirewallRule(server.id, z, body),
      {
        onSuccess: () => {
          toast.success(rule ? "Rule saved" : "Rule added")
          onOpenChange(false)
        },
        onError: (e) => {
          const f = fieldErrors(e)
          if (Object.keys(f).length) setErrors(f)
          else setErrors({ filter_expr: e.message })
        },
      },
    )
  }

  return (
    <EditorSheet
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? "Edit firewall rule" : "Add firewall rule"}
      description={`On ${zone}, at ArvanCloud`}
      formId="cdn-fw-form"
      pending={change.isPending}
      saveLabel={rule ? "Save" : "Add rule"}
      onSubmit={submit}
    >
      <Field label="Name" error={errors.name}>
        {(p) => (
          <Input
            {...p}
            value={v.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Block bad bots"
          />
        )}
      </Field>
      <Field
        label="Then"
        hint={firewallActions.find((a) => a.value === v.action)?.hint}
      >
        {() => (
          <Choices
            label="Action"
            value={v.action}
            onChange={(action) => set({ action })}
            items={firewallActions}
          />
        )}
      </Field>
      {v.action === "bypass" && (
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 text-body-sm font-medium">Skip</legend>
          {skipItems.map((s) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside
            <label
              key={s.value}
              className="flex items-center gap-2 text-body-sm max-md:min-h-11"
            >
              <Checkbox
                checked={v.skip?.includes(s.value) ?? false}
                onCheckedChange={(on) =>
                  set({
                    skip: on
                      ? [...(v.skip ?? []), s.value]
                      : (v.skip ?? []).filter((x) => x !== s.value),
                  })
                }
              />
              {s.label}
            </label>
          ))}
        </fieldset>
      )}
      <Field
        label="For requests where"
        error={errors.filter_expr}
        hint="ArvanCloud's filter language. Use the helper below, or write it: and, or, not, in {…}, contains, eq."
      >
        {(p) => (
          <Textarea
            {...p}
            value={v.filter_expr}
            onChange={(e) => set({ filter_expr: e.target.value })}
            rows={4}
            spellCheck={false}
            autoCapitalize="none"
            className="font-mono text-body-sm"
            placeholder={
              'ip.geoip.country in {"IR"} and http.request.uri.path contains "/admin"'
            }
          />
        )}
      </Field>
      <div className="flex flex-col gap-2 rounded-xl bg-subtle p-3">
        <span className="text-body-sm font-medium">Add a condition</span>
        <div className="grid gap-2 md:grid-cols-[11rem_minmax(0,1fr)]">
          <ChoiceSelect
            value={field}
            onChange={setField}
            items={conditionFields.map((f) => ({
              value: f.value,
              label: f.label,
            }))}
          />
          <Input
            aria-label="Value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addCondition()
              }
            }}
            placeholder={meta?.placeholder}
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono"
          />
        </div>
        <div className="flex items-center gap-2">
          {v.filter_expr.trim() && (
            <Choices
              label="Join"
              value={join}
              onChange={setJoin}
              items={[
                { value: "and", label: "And" },
                { value: "or", label: "Or" },
              ]}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-md:h-10"
            disabled={!value.trim()}
            onClick={addCondition}
          >
            <Plus />
            Add
          </Button>
        </div>
      </div>
      <Field label="Note" hint="Optional: why it's there.">
        {(p) => (
          <Input
            {...p}
            value={v.note ?? ""}
            onChange={(e) => set({ note: e.target.value })}
          />
        )}
      </Field>
      <ToggleRow
        label="On"
        checked={v.enabled}
        onChange={(enabled) => set({ enabled })}
      />
    </EditorSheet>
  )
}
