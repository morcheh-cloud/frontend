"use client"

import { Package, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import { api, fieldErrors } from "@/lib/api"
import type {
  CDNWAF,
  CDNWAFPackage,
  CDNWAFRule,
  CDNWAFRuleFields,
  DNSServer,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCdnSecurity, useCdnSecurityChange } from "../../../../../api"
import { Tag } from "../../../../../components/parts"
import {
  Choices,
  EditorSheet,
  RuleRow,
  SettingCard,
  SettingsSkeleton,
  splitSources,
  ToggleRow,
} from "./parts"

type Props = {
  server: DNSServer
  zone: string
  canEdit: boolean
  phone: boolean
}
type Mode = CDNWAF["mode"]

const modes: { value: Mode; label: string; hint: string }[] = [
  { value: "off", label: "Off", hint: "Requests aren't checked for attacks." },
  {
    value: "detect",
    label: "Log only",
    hint: "Attacks are recorded, nothing is blocked. Start here and watch for false alarms.",
  },
  {
    value: "protect",
    label: "Block",
    hint: "Requests that look like attacks are refused.",
  },
]

export function WafTab({ server, zone, canEdit, phone }: Props) {
  const q = useCdnSecurity(server.id, zone, "waf")
  const change = useCdnSecurityChange(server.id, zone, "waf")
  const [editorOpen, setEditorOpen] = useOpen("cdn-waf-rule")
  const [editing, setEditing] = useState<{ rule?: CDNWAFRule; key: number }>({
    key: 0,
  })
  const [deleteOpen, setDeleteOpen] = useOpen("cdn-waf-delete")
  const [toDelete, setToDelete] = useState<{
    rule?: CDNWAFRule
    pkg?: CDNWAFPackage
  }>({})

  if (q.isPending) return <SettingsSkeleton phone={phone} />
  if (!q.data)
    return (
      <Empty
        icon={ShieldCheck}
        title="Couldn't read the WAF"
        body={(q.error as Error | null)?.message ?? ""}
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  const waf = q.data
  const id = server.id
  const go = (
    run: (z: string) => Promise<CDNWAF>,
    done?: string,
    after?: () => void,
  ) =>
    change.mutate(run, {
      onSuccess: () => {
        if (done) toast.success(done)
        after?.()
      },
      onError: (e) => toast.error(e.message),
    })
  const open = (rule?: CDNWAFRule) => {
    setEditing((e) => ({ rule, key: e.key + 1 }))
    setEditorOpen(true)
  }

  return (
    <div className={cn("flex flex-col", !phone && "gap-4")}>
      <SettingCard
        phone={phone}
        title="Web application firewall"
        hint="Checks each request for attacks like SQL injection and cross-site scripting, with the rule packages below."
        action={
          waf.mode !== "off" && (
            <Tag tone={waf.mode === "protect" ? "brand" : "warning"}>
              {waf.mode === "protect" ? "Blocking" : "Logging only"}
            </Tag>
          )
        }
      >
        <Field
          label="Mode"
          hint={modes.find((m) => m.value === waf.mode)?.hint}
        >
          {() => (
            <Choices
              label="WAF mode"
              value={waf.mode}
              disabled={!canEdit || change.isPending}
              onChange={(mode) =>
                go(
                  (z) => api.dns.updateCdnWafMode(id, z, { mode }),
                  `WAF: ${modes.find((m) => m.value === mode)?.label.toLowerCase()}`,
                )
              }
              items={modes}
            />
          )}
        </Field>
      </SettingCard>

      <SettingCard
        phone={phone}
        title="Rule packages"
        hint="Sets of attack rules. Add the one for your app (WordPress, PHP…) on top of the general set."
      >
        {waf.packages.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No packages: the WAF has nothing to check with.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {waf.packages.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "flex min-h-14 items-center gap-3 px-3 py-2",
                  !p.enabled && "text-ash",
                )}
              >
                <Package className="size-4 shrink-0 text-ash" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium">{p.name}</p>
                  <p className="truncate text-caption text-muted-foreground">
                    {p.provider}
                    {p.disabled_rules > 0 && ` · ${p.disabled_rules} rules off`}
                  </p>
                </div>
                <Switch
                  checked={p.enabled}
                  disabled={!canEdit || change.isPending}
                  aria-label={`${p.name} on`}
                  onCheckedChange={(enabled) =>
                    go(
                      (z) => api.dns.setCdnWafPackage(id, z, p.id, { enabled }),
                      `${p.name} ${enabled ? "on" : "off"}`,
                    )
                  }
                />
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${p.name}`}
                    className="hover:text-destructive"
                    onClick={() => {
                      setToDelete({ pkg: p })
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && waf.available.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption text-muted-foreground">Add:</span>
            {waf.available.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={change.isPending}
                onClick={() =>
                  go(
                    (z) => api.dns.addCdnWafPackage(id, z, { id: p.id }),
                    `${p.name} added`,
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-mist px-3 text-caption text-muted-foreground outline-none hover:border-brand hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-11"
              >
                <Plus className="size-3.5" />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </SettingCard>

      <SettingCard
        phone={phone}
        title="Path rules"
        hint="Where the WAF looks or not: let webhooks and uploads through, or protect only some paths. The first match decides."
        action={
          canEdit && (
            <Button size="sm" onClick={() => open()}>
              <Plus />
              Add rule
            </Button>
          )
        }
      >
        {waf.rules.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No path rules: every path is checked.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {waf.rules.map((r, i) => (
              <RuleRow
                key={r.id}
                index={i}
                count={waf.rules.length}
                enabled={r.enabled}
                canEdit={canEdit}
                title={<span className="font-mono">{r.url_pattern}</span>}
                detail={
                  r.sources?.length
                    ? `From ${r.sources.join(", ")}`
                    : r.exceptions > 0
                      ? `${r.exceptions} package rules skipped`
                      : undefined
                }
                tag={
                  <Tag tone={r.action === "protect" ? "brand" : "muted"}>
                    {r.action === "protect" ? "Check" : "Let through"}
                  </Tag>
                }
                onToggle={(on) =>
                  go(
                    (z) =>
                      api.dns.setCdnWafRuleEnabled(id, z, r.id, {
                        enabled: on,
                      }),
                    `${r.url_pattern} ${on ? "on" : "off"}`,
                  )
                }
                onOpen={canEdit ? () => open(r) : undefined}
                onMove={(dir) => {
                  const other = waf.rules[i + dir]
                  go((z) =>
                    api.dns.moveCdnWafRule(
                      id,
                      z,
                      r.id,
                      dir < 0 ? { before: other.id } : { after: other.id },
                    ),
                  )
                }}
                menu={
                  canEdit
                    ? [
                        [
                          {
                            key: "edit",
                            label: "Edit",
                            icon: <Pencil />,
                            onSelect: () => open(r),
                          },
                        ],
                        [
                          {
                            key: "delete",
                            label: "Delete",
                            icon: <Trash2 />,
                            destructive: true,
                            onSelect: () => {
                              setToDelete({ rule: r })
                              setDeleteOpen(true)
                            },
                          },
                        ],
                      ]
                    : []
                }
              />
            ))}
          </ul>
        )}
      </SettingCard>

      <WafRuleEditor
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
        title={
          toDelete.pkg
            ? `Remove ${toDelete.pkg.name}?`
            : `Delete the rule for ${toDelete.rule?.url_pattern}?`
        }
        description={
          toDelete.pkg
            ? "The WAF stops checking with its rules. You can add it again later; rules turned off in it are forgotten."
            : undefined
        }
        confirmLabel={toDelete.pkg ? "Remove package" : "Delete rule"}
        pending={change.isPending}
        onConfirm={() => {
          const { pkg, rule } = toDelete
          if (pkg)
            go(
              (z) => api.dns.deleteCdnWafPackage(id, z, pkg.id),
              `${pkg.name} removed`,
              () => setDeleteOpen(false),
            )
          else if (rule)
            go(
              (z) => api.dns.deleteCdnWafRule(id, z, rule.id),
              "Rule deleted",
              () => setDeleteOpen(false),
            )
        }}
      />
    </div>
  )
}

function WafRuleEditor({
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
  rule?: CDNWAFRule
}) {
  const change = useCdnSecurityChange(server.id, zone, "waf")
  const [v, setV] = useState({
    url_pattern: rule?.url_pattern ?? "",
    action: rule?.action ?? ("passthrough" as CDNWAFRuleFields["action"]),
    enabled: rule?.enabled ?? true,
    sources: (rule?.sources ?? []).join("\n"),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (p: Partial<typeof v>) => {
    setV((x) => ({ ...x, ...p }))
    setErrors({})
  }

  function submit() {
    if (!v.url_pattern.trim())
      return setErrors({ url_pattern: "Which paths, like /webhooks/*" })
    const body: CDNWAFRuleFields = {
      url_pattern: v.url_pattern.trim(),
      action: v.action,
      enabled: v.enabled,
      sources: splitSources(v.sources),
    }
    change.mutate(
      (z) =>
        rule
          ? api.dns.updateCdnWafRule(server.id, z, rule.id, body)
          : api.dns.addCdnWafRule(server.id, z, body),
      {
        onSuccess: () => {
          toast.success(rule ? "Rule saved" : "Rule added")
          onOpenChange(false)
        },
        onError: (e) => {
          const f = fieldErrors(e)
          const mapped: Record<string, string> = {}
          for (const [k, m] of Object.entries(f))
            mapped[k.replace(/\[\d+\]$/, "")] ??= m
          if (Object.keys(mapped).length) setErrors(mapped)
          else toast.error(e.message)
        },
      },
    )
  }

  return (
    <EditorSheet
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? "Edit WAF path rule" : "Add WAF path rule"}
      description={`On ${zone}, at ArvanCloud`}
      formId="cdn-waf-form"
      pending={change.isPending}
      saveLabel={rule ? "Save" : "Add rule"}
      onSubmit={submit}
    >
      <Field
        label="Paths"
        error={errors.url_pattern}
        hint="* matches anything: /webhooks/* covers every webhook."
      >
        {(p) => (
          <Input
            {...p}
            value={v.url_pattern}
            onChange={(e) => set({ url_pattern: e.target.value })}
            placeholder="/webhooks/*"
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono"
          />
        )}
      </Field>
      <Field
        label="The WAF"
        hint={
          v.action === "passthrough"
            ? "Lets these requests through unchecked: for webhooks, uploads or an API that trips false alarms."
            : "Checks these requests even where a broader rule lets things through."
        }
      >
        {() => (
          <Choices
            label="Action"
            value={v.action}
            onChange={(action) => set({ action })}
            items={[
              { value: "passthrough", label: "Lets them through" },
              { value: "protect", label: "Checks them" },
            ]}
          />
        )}
      </Field>
      <Field
        label="Only from"
        error={errors.sources}
        hint="Addresses or ranges, one per line (up to 20). Empty = everyone."
      >
        {(p) => (
          <Textarea
            {...p}
            value={v.sources}
            onChange={(e) => set({ sources: e.target.value })}
            rows={3}
            spellCheck={false}
            className="font-mono text-body-sm"
            placeholder="203.0.113.0/24"
          />
        )}
      </Field>
      {rule && rule.exceptions > 0 && (
        <p className="text-caption text-muted-foreground">
          It also skips {rule.exceptions} package rules; those are changed in
          ArvanCloud's panel.
        </p>
      )}
      <ToggleRow
        label="On"
        checked={v.enabled}
        onChange={(enabled) => set({ enabled })}
      />
    </EditorSheet>
  )
}
