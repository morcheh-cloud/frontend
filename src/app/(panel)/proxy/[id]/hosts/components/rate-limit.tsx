"use client"

import { FlaskConical, Info, Plus } from "lucide-react"

import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ListInput } from "@/app/(panel)/dns/components/fields"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  type Draft,
  type Errors,
  freshRateRule,
  type RateRuleDraft,
  type RateStatus,
  rowKey,
} from "./draft"
import { EditorCard as Card } from "./editor-card"
import { RemoveButton, typing } from "./rows"

// The Rate limit tab: requests per second/minute (sites), open
// connections, speed, and what a refused visitor gets.

const methods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

const perItems = [
  { value: "second", label: "per second" },
  { value: "minute", label: "per minute" },
] as const

const byItems = [
  { value: "ip", label: "Each visitor apart" },
  { value: "site", label: "All visitors together" },
] as const

const modeItems = [
  { value: "nodelay", label: "Serve them at once" },
  { value: "queue", label: "Slow them to the rate" },
  { value: "delay", label: "Serve some at once, slow the rest" },
] as const

const statusItems: { value: RateStatus; label: string; hint: string }[] = [
  { value: 429, label: "429 Too Many Requests", hint: "The usual answer." },
  {
    value: 503,
    label: "503 Service Unavailable",
    hint: "Looks like the site is busy.",
  },
  {
    value: 444,
    label: "444 Close the connection",
    hint: "No answer at all; cheapest against floods.",
  },
]

// Ready-made limits for common cases.
const templates: {
  label: string
  rule: Partial<RateRuleDraft>
}[] = [
  { label: "Whole site", rule: { rate: "10", per: "second", burst: "20" } },
  {
    label: "Login form",
    rule: {
      path: "/login",
      rate: "5",
      per: "minute",
      burst: "5",
      methods: ["POST"],
    },
  },
  {
    label: "API",
    rule: { path: "/api", rate: "20", per: "second", burst: "40" },
  },
]

export function NumberInput({
  value,
  onChange,
  unit,
  placeholder = "No limit",
  ...props
}: {
  id?: string
  "aria-invalid"?: true
  "aria-describedby"?: string
  "aria-label"?: string
  value: string
  onChange: (value: string) => void
  unit?: string
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Input
        {...props}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("tabular-nums", unit && "pe-16")}
      />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-ash">
          {unit}
        </span>
      )}
    </div>
  )
}

export function Choice<T extends string | number>({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id?: string
  label?: string
  items: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v != null && onChange(v as T)}
    >
      <SelectTrigger id={id} aria-label={label} className="h-11 w-full md:h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// What a rule does, in words.
function ruleText(r: RateRuleDraft) {
  const n = Number(r.rate) || 0
  const burst = Number(r.burst) || 0
  const who = r.by === "ip" ? "each visitor" : "all visitors together"
  const where = r.path.trim() ? `under ${r.path.trim()}` : "on the whole site"
  const what = r.methods.length ? `${r.methods.join("/")} requests` : "requests"
  const extra = !burst
    ? "Anything faster is refused."
    : r.mode === "queue"
      ? `Up to ${burst} more wait their turn; beyond that they're refused.`
      : r.mode === "delay"
        ? `Up to ${burst} more: the first ${Number(r.delay) || 0} go at once, the rest wait; beyond that they're refused.`
        : `Up to ${burst} more go through at once; beyond that they're refused.`
  return `${n} ${what} per ${r.per} for ${who}, ${where}. ${extra}`
}

function RuleRow({
  rule: r,
  index,
  errors,
  phone,
  onChange,
  onRemove,
}: {
  rule: RateRuleDraft
  index: number
  errors: Errors
  phone: boolean
  onChange: (patch: Partial<RateRuleDraft>) => void
  onRemove: () => void
}) {
  const err = (f: string) => errors[`rate.${r.key}.${f}`]
  // The ones without a field of their own.
  const problem = ["per", "key", "methods"].map(err).find(Boolean)
  const n = index + 1
  return (
    <li
      className={cn(
        "flex flex-col gap-3",
        phone
          ? "border-t border-border pt-4 first:border-t-0 first:pt-0"
          : "rounded-xl border border-border p-4",
      )}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <Field label="Path" error={err("path")}>
          {(f) => (
            <Input
              {...f}
              {...typing}
              value={r.path}
              onChange={(e) => onChange({ path: e.target.value })}
              placeholder="Whole site"
              className="font-mono"
            />
          )}
        </Field>
        <Field label="Requests" error={err("rate")}>
          {(f) => (
            <div className="flex gap-2">
              <Input
                {...f}
                type="number"
                inputMode="numeric"
                min={1}
                value={r.rate}
                onChange={(e) => onChange({ rate: e.target.value })}
                className="w-24 shrink-0 tabular-nums"
              />
              <Choice
                label={`Limit ${n}: per`}
                items={perItems}
                value={r.per}
                onChange={(per) => onChange({ per })}
              />
            </div>
          )}
        </Field>
        <Field label="Counted for">
          {(f) => (
            <Choice
              id={f.id}
              items={byItems}
              value={r.by}
              onChange={(by) => onChange({ by })}
            />
          )}
        </Field>
        <div className={cn(phone && "-mt-1 flex justify-end")}>
          <RemoveButton label={`Remove limit ${n}`} onClick={onRemove} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <Field label="Extra at once (burst)" error={err("burst")}>
          {(f) => (
            <NumberInput
              {...f}
              value={r.burst}
              onChange={(burst) => onChange({ burst })}
              placeholder="0"
              unit="requests"
            />
          )}
        </Field>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem]">
          <Field label="The extra ones" error={err("mode")}>
            {(f) => (
              <Choice
                id={f.id}
                items={modeItems}
                value={r.mode}
                onChange={(mode) => onChange({ mode })}
              />
            )}
          </Field>
          {r.mode === "delay" && (
            <Field label="At once" error={err("delay")}>
              {(f) => (
                <NumberInput
                  {...f}
                  value={r.delay}
                  onChange={(delay) => onChange({ delay })}
                  placeholder="0"
                />
              )}
            </Field>
          )}
        </div>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-body-sm font-medium">
          Only these methods
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {methods.map((m) => {
            const on = r.methods.includes(m)
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange({
                    methods: on
                      ? r.methods.filter((x) => x !== m)
                      : [...r.methods, m],
                  })
                }
                className="h-9 rounded-full border border-border px-3 font-mono text-caption text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-7"
              >
                {m}
              </button>
            )
          })}
        </div>
        <p className="text-caption text-muted-foreground">
          {r.methods.length
            ? `Other methods aren't counted by this limit.`
            : "None picked: every request counts."}
        </p>
      </fieldset>
      <FieldError text={problem} />
      <p className="text-caption text-ash">{ruleText(r)}</p>
    </li>
  )
}

export function RateLimitEditor({
  proxy: p,
  draft: d,
  set,
  errors,
  phone,
}: {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  const stream = d.type === "stream"
  const rules = d.rateRules
  const patchRule = (key: string, patch: Partial<RateRuleDraft>) =>
    set({
      rateRules: rules.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    })
  const add = (rule: Partial<RateRuleDraft> = {}) =>
    set({
      rateRules: [...rules, { ...freshRateRule(), ...rule, key: rowKey() }],
    })
  const limited =
    rules.some((r) => r.rate.trim()) ||
    !!(d.connPerIp || d.connTotal || d.downloadKbs || d.uploadKbs)

  return (
    <>
      {!stream && (
        <Card
          title="Requests"
          hint="How many requests may come in a second or a minute. A short burst above the rate can be let through, the rest is refused."
          count={rules.length}
          phone={phone}
        >
          {rules.length > 0 && (
            <ul className="flex flex-col gap-3">
              {rules.map((r, i) => (
                <RuleRow
                  key={r.key}
                  rule={r}
                  index={i}
                  errors={errors}
                  phone={phone}
                  onChange={(patch) => patchRule(r.key, patch)}
                  onRemove={() =>
                    set({ rateRules: rules.filter((x) => x.key !== r.key) })
                  }
                />
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => add()}
            >
              <Plus />
              Add limit
            </Button>
            <span className="text-caption text-ash">or start from</span>
            {templates.map((t) => (
              <Button
                key={t.label}
                variant="ghost"
                size="sm"
                className="h-11 md:h-8"
                onClick={() => add(t.rule)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          {rules.length > 1 && (
            <Callout icon={<Info />}>
              Every limit that matches a request counts it, and the strictest
              one decides. A limit on a path covers everything under it.
            </Callout>
          )}
        </Card>
      )}

      <Card
        title="Connections"
        hint={
          stream
            ? "How many connections may be open at the same time."
            : "How many connections may be open at the same time. Good against slow clients holding the site busy."
        }
        phone={phone}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Per visitor"
            hint="Browsers open about 6 per site."
            error={errors["rate_limit.conn_per_ip"]}
          >
            {(f) => (
              <NumberInput
                {...f}
                value={d.connPerIp}
                onChange={(connPerIp) => set({ connPerIp })}
                unit="at once"
              />
            )}
          </Field>
          <Field
            label={stream ? "For the whole forward" : "For the whole site"}
            hint="Protects what's behind the proxy."
            error={errors["rate_limit.conn_total"]}
          >
            {(f) => (
              <NumberInput
                {...f}
                value={d.connTotal}
                onChange={(connTotal) => set({ connTotal })}
                unit="at once"
              />
            )}
          </Field>
        </div>
      </Card>

      <Card
        title="Speed"
        hint="Caps how fast each connection moves data. A visitor with several connections gets this on each."
        phone={phone}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={stream ? "To the client" : "Downloads"}
            hint="Sent to the visitor."
            error={errors["rate_limit.download_kbs"]}
          >
            {(f) => (
              <NumberInput
                {...f}
                value={d.downloadKbs}
                onChange={(downloadKbs) => set({ downloadKbs })}
                unit="KB/s"
              />
            )}
          </Field>
          {stream ? (
            <Field
              label="From the client"
              hint="Read from the visitor."
              error={errors["rate_limit.upload_kbs"]}
            >
              {(f) => (
                <NumberInput
                  {...f}
                  value={d.uploadKbs}
                  onChange={(uploadKbs) => set({ uploadKbs })}
                  unit="KB/s"
                />
              )}
            </Field>
          ) : (
            d.downloadKbs.trim() && (
              <Field
                label="Full speed first"
                hint="Pages load fast; only big downloads slow down."
                error={errors["rate_limit.full_speed_mb"]}
              >
                {(f) => (
                  <NumberInput
                    {...f}
                    value={d.fullSpeedMb}
                    onChange={(fullSpeedMb) => set({ fullSpeedMb })}
                    placeholder="0"
                    unit="MB"
                  />
                )}
              </Field>
            )
          )}
        </div>
      </Card>

      <Card
        title="When a limit is hit"
        hint={limited ? undefined : "Applies once you set a limit above."}
        phone={phone}
      >
        {!stream && (
          <Field
            label="Answer"
            hint={statusItems.find((s) => s.value === d.rateStatus)?.hint}
            error={errors["rate_limit.status"]}
          >
            {(f) => (
              <Choice<RateStatus>
                id={f.id}
                items={statusItems}
                value={d.rateStatus}
                onChange={(rateStatus) => set({ rateStatus })}
              />
            )}
          </Field>
        )}
        <Field
          label="Never limit"
          hint="Your office, monitoring, other servers of yours. One address or range per line."
          error={errors["rate_limit.exempt"]}
        >
          {(f) => (
            <ListInput
              {...f}
              value={d.rateExempt}
              onChange={(rateExempt) => set({ rateExempt })}
              placeholder="No addresses"
            />
          )}
        </Field>
        <ToggleRow
          id="rate-dry-run"
          label="Try it out first"
          hint={`Nobody is slowed or refused: ${p.kind_label} only writes who would have been to its error log. Needs nginx 1.17.6 or newer.`}
          checked={d.rateDryRun}
          onChange={(rateDryRun) => set({ rateDryRun })}
        />
        {d.rateDryRun && limited && (
          <Callout icon={<FlaskConical />} tone="warning">
            Trying out: the limits are counted but not enforced. Turn this off
            once the log looks right.
          </Callout>
        )}
      </Card>
    </>
  )
}
