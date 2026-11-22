"use client"

import { Gauge, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import { api, fieldErrors } from "@/lib/api"
import type {
  CDNRateLimit,
  CDNRateLimitRule,
  CDNRateLimitRuleFields,
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
  splitSources,
  ToggleRow,
} from "./parts"

type Props = {
  server: DNSServer
  zone: string
  canEdit: boolean
  phone: boolean
}
type Method = NonNullable<CDNRateLimitRuleFields["methods"]>[number]

const methods: Method[] = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"]

const windows = [
  { value: "1", label: "second" },
  { value: "10", label: "10 seconds" },
  { value: "60", label: "minute" },
  { value: "600", label: "10 minutes" },
  { value: "3600", label: "hour" },
  { value: "86400", label: "day" },
]

export function seconds(s: number) {
  if (s % 86400 === 0) return `${s / 86400} day${s === 86400 ? "" : "s"}`
  if (s % 3600 === 0) return `${s / 3600} h`
  if (s % 60 === 0) return `${s / 60} min`
  return `${s} s`
}

// "100 requests a minute · then blocked 5 min".
export function rateSentence(r: CDNRateLimitRuleFields) {
  const per = windows.find((w) => Number(w.value) === r.time_duration)
  const window = per
    ? `a ${per.label}`.replace("a 10", "per 10")
    : `per ${seconds(r.time_duration)}`
  const then =
    r.action === "challenge"
      ? "then challenged"
      : `then blocked${r.block_duration ? ` ${seconds(r.block_duration)}` : ""}`
  return `${r.rate} request${r.rate === 1 ? "" : "s"} ${window} · ${then}`
}

export function RateLimitTab({ server, zone, canEdit, phone }: Props) {
  const q = useCdnSecurity(server.id, zone, "rate-limit")
  const change = useCdnSecurityChange(server.id, zone, "rate-limit")
  const [editorOpen, setEditorOpen] = useOpen("cdn-rl-rule")
  const [editing, setEditing] = useState<{
    rule?: CDNRateLimitRule
    key: number
  }>({ key: 0 })
  const [deleteOpen, setDeleteOpen] = useOpen("cdn-rl-delete")
  const [toDelete, setToDelete] = useState<CDNRateLimitRule>()
  const [exclude, setExclude] = useState<string | null>(null)

  if (q.isPending) return <SettingsSkeleton phone={phone} />
  if (!q.data)
    return (
      <Empty
        icon={Gauge}
        title="Couldn't read the rate limits"
        body={(q.error as Error | null)?.message ?? ""}
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  const rl = q.data
  const rules = rl.rules
  const id = server.id
  const excludeText = exclude ?? rl.settings.exclude_sources.join("\n")
  const excludeDirty =
    exclude !== null &&
    splitSources(exclude).join(",") !== rl.settings.exclude_sources.join(",")

  const go = (
    run: (z: string) => Promise<CDNRateLimit>,
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
  const open = (rule?: CDNRateLimitRule) => {
    setEditing((e) => ({ rule, key: e.key + 1 }))
    setEditorOpen(true)
  }

  return (
    <div className={cn("flex flex-col", !phone && "gap-4")}>
      <SettingCard
        phone={phone}
        title="Rate limiting"
        hint="Caps how many requests one visitor makes, so floods and brute force don't reach the site."
      >
        <ToggleRow
          label="Spot floods by itself"
          hint="ArvanCloud's own DDoS detection on top of the rules below."
          checked={rl.settings.ddos_detection}
          disabled={!canEdit || change.isPending}
          onChange={(ddos_detection) =>
            go(
              (z) =>
                api.dns.updateCdnRateLimitSettings(id, z, { ddos_detection }),
              "Rate limiting updated",
            )
          }
        />
        <Field
          label="Never limit"
          hint="Addresses or ranges, one per line: your office, monitoring, other servers."
        >
          {(p) => (
            <Textarea
              {...p}
              value={excludeText}
              disabled={!canEdit}
              onChange={(e) => setExclude(e.target.value)}
              rows={3}
              spellCheck={false}
              className="font-mono text-body-sm"
              placeholder={"203.0.113.0/24\n198.51.100.7"}
            />
          )}
        </Field>
        {excludeDirty && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={change.isPending}
              onClick={() =>
                go(
                  (z) =>
                    api.dns.updateCdnRateLimitSettings(id, z, {
                      exclude_sources: splitSources(excludeText),
                    }),
                  "Saved",
                  () => setExclude(null),
                )
              }
            >
              Save addresses
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExclude(null)}>
              Discard
            </Button>
          </div>
        )}
      </SettingCard>

      <SettingCard
        phone={phone}
        title="Rules"
        hint="Each counts a visitor's requests to matching paths; the first rule that matches applies."
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
          <div className="flex flex-col gap-2">
            <p className="text-body-sm text-muted-foreground">
              No rules. A common start: limit the login page to a few tries a
              minute.
            </p>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    url_pattern: "/login",
                    rate: 5,
                    time_duration: 60,
                    block_duration: 900,
                    label: "Login: 5 a minute",
                  },
                  {
                    url_pattern: "/api/*",
                    rate: 100,
                    time_duration: 60,
                    block_duration: 60,
                    label: "API: 100 a minute",
                  },
                ].map((p) => (
                  <Button
                    key={p.url_pattern}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      go(
                        (z) =>
                          api.dns.addCdnRateLimitRule(id, z, {
                            url_pattern: p.url_pattern,
                            rate: p.rate,
                            time_duration: p.time_duration,
                            block_duration: p.block_duration,
                            action: "block",
                            enabled: true,
                          }),
                        "Rule added",
                      )
                    }
                  >
                    <Plus />
                    {p.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {rules.map((r, i) => (
              <RuleRow
                key={r.id}
                index={i}
                count={rules.length}
                enabled={r.enabled}
                canEdit={canEdit}
                title={<span className="font-mono">{r.url_pattern}</span>}
                detail={rateSentence(r)}
                tag={
                  <>
                    {(r.methods?.length ?? 0) > 0 && (
                      <Tag>{r.methods?.join(", ")}</Tag>
                    )}
                    {(r.exclude_sources?.length ?? 0) > 0 && (
                      <Tag>{r.exclude_sources?.length} excluded</Tag>
                    )}
                  </>
                }
                onToggle={(on) =>
                  go(
                    (z) =>
                      api.dns.setCdnRateLimitRuleEnabled(id, z, r.id, {
                        enabled: on,
                      }),
                    `${r.url_pattern} ${on ? "on" : "off"}`,
                  )
                }
                onOpen={canEdit ? () => open(r) : undefined}
                onMove={(dir) => {
                  const other = rules[i + dir]
                  go((z) =>
                    api.dns.moveCdnRateLimitRule(
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
                              setToDelete(r)
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

      <RateRuleEditor
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
        title={`Delete the limit on ${toDelete?.url_pattern}?`}
        description={toDelete && rateSentence(toDelete)}
        confirmLabel="Delete rule"
        pending={change.isPending}
        onConfirm={() =>
          toDelete &&
          go(
            (z) => api.dns.deleteCdnRateLimitRule(id, z, toDelete.id),
            "Rule deleted",
            () => setDeleteOpen(false),
          )
        }
      />
    </div>
  )
}

function RateRuleEditor({
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
  rule?: CDNRateLimitRule
}) {
  const change = useCdnSecurityChange(server.id, zone, "rate-limit")
  const [v, setV] = useState({
    url_pattern: rule?.url_pattern ?? "/",
    rate: String(rule?.rate ?? 60),
    time_duration: String(rule?.time_duration ?? 60),
    burst: rule?.burst != null ? String(rule.burst) : "",
    block_duration: String(rule?.block_duration ?? 300),
    action: rule?.action ?? ("block" as CDNRateLimitRuleFields["action"]),
    enabled: rule?.enabled ?? true,
    methods: rule?.methods ?? ([] as Method[]),
    exclude: (rule?.exclude_sources ?? []).join("\n"),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (p: Partial<typeof v>) => {
    setV((x) => ({ ...x, ...p }))
    setErrors({})
  }
  const num = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : Number.NaN)
  const windowKnown = windows.some((w) => w.value === v.time_duration)

  function submit() {
    const missing: Record<string, string> = {}
    if (!v.url_pattern.trim()) missing.url_pattern = "Which paths, like /api/*"
    if (!(num(v.rate) >= 1)) missing.rate = "At least 1"
    if (!(num(v.time_duration) >= 1))
      missing.time_duration = "Seconds, at least 1"
    if (v.burst && !(num(v.burst) >= 1)) missing.burst = "A whole number"
    if (Object.keys(missing).length) return setErrors(missing)
    const body: CDNRateLimitRuleFields = {
      url_pattern: v.url_pattern.trim(),
      rate: num(v.rate),
      time_duration: num(v.time_duration),
      action: v.action,
      enabled: v.enabled,
      methods: v.methods,
      exclude_sources: splitSources(v.exclude),
      ...(v.burst && { burst: num(v.burst) }),
      ...(v.action === "block" && { block_duration: num(v.block_duration) }),
    }
    change.mutate(
      (z) =>
        rule
          ? api.dns.updateCdnRateLimitRule(server.id, z, rule.id, body)
          : api.dns.addCdnRateLimitRule(server.id, z, body),
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
      title={rule ? "Edit rate limit" : "Add rate limit"}
      description={`On ${zone}, at ArvanCloud`}
      formId="cdn-rl-form"
      pending={change.isPending}
      saveLabel={rule ? "Save" : "Add rule"}
      onSubmit={submit}
    >
      <Field
        label="Paths"
        error={errors.url_pattern}
        hint="* matches anything: /api/* covers every API path."
      >
        {(p) => (
          <Input
            {...p}
            value={v.url_pattern}
            onChange={(e) => set({ url_pattern: e.target.value })}
            placeholder="/api/*"
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono"
          />
        )}
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
        <Field label="Requests" error={errors.rate}>
          {(p) => (
            <Input
              {...p}
              value={v.rate}
              onChange={(e) => set({ rate: e.target.value })}
              inputMode="numeric"
            />
          )}
        </Field>
        <Field label="Per" error={errors.time_duration}>
          {(p) =>
            windowKnown ? (
              <ChoiceSelect
                id={p.id}
                value={v.time_duration}
                onChange={(time_duration) => set({ time_duration })}
                items={windows}
              />
            ) : (
              <Input
                {...p}
                value={v.time_duration}
                onChange={(e) => set({ time_duration: e.target.value })}
                inputMode="numeric"
                placeholder="Seconds"
              />
            )
          }
        </Field>
      </div>
      <Field
        label="Over the limit"
        hint={
          v.action === "challenge"
            ? "Visitors prove they're people, then go on."
            : "Answered with 429 for a while."
        }
      >
        {() => (
          <Choices
            label="Action"
            value={v.action}
            onChange={(action) => set({ action })}
            items={[
              { value: "block", label: "Block" },
              { value: "challenge", label: "Challenge" },
            ]}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {v.action === "block" && (
          <Field label="Block for (seconds)" error={errors.block_duration}>
            {(p) => (
              <Input
                {...p}
                value={v.block_duration}
                onChange={(e) => set({ block_duration: e.target.value })}
                inputMode="numeric"
              />
            )}
          </Field>
        )}
        <Field
          label="Burst"
          error={errors.burst}
          hint="Extra requests let through at once."
        >
          {(p) => (
            <Input
              {...p}
              value={v.burst}
              onChange={(e) => set({ burst: e.target.value })}
              inputMode="numeric"
              placeholder="None"
            />
          )}
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-body-sm font-medium">
          Methods counted
        </legend>
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => {
            const on = v.methods.includes(m)
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set({
                    methods: on
                      ? v.methods.filter((x) => x !== m)
                      : [...v.methods, m],
                  })
                }
                className="h-9 rounded-full border border-border px-3.5 font-mono text-caption text-muted-foreground outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:h-11"
              >
                {m}
              </button>
            )
          })}
        </div>
        <p className="text-caption text-muted-foreground">
          {v.methods.length
            ? `Only ${v.methods.join(", ")} requests count.`
            : "None picked: every method counts."}
        </p>
      </fieldset>
      <Field
        label="Never limit"
        error={errors.exclude_sources}
        hint="Addresses or ranges, one per line."
      >
        {(p) => (
          <Textarea
            {...p}
            value={v.exclude}
            onChange={(e) => set({ exclude: e.target.value })}
            rows={2}
            spellCheck={false}
            className="font-mono text-body-sm"
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
