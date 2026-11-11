"use client"

import { BellOff, CalendarClock } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Pick } from "@/app/(panel)/uptime/components/monitor-fields"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fieldErrors } from "@/lib/api"
import { formatDuration } from "@/lib/format"
import type { AlertMute, AlertMuteBody, AlertRule } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAlertMutes, useAlertRules, useCreateMute, useEndMute } from "../api"
import { targetOf } from "./rules-meta"

// Quiet time for maintenance: alerts that fire meanwhile are recorded but not
// sent; one still firing when the mute ends is sent then.

export type MuteTarget = {
  kind: "server" | "database"
  id: string
  name: string
}

// Where the dialog starts: a rule's menu, a server's or a database's page.
export type MuteStart = { rule?: AlertRule; target?: MuteTarget }

const lengths = [
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
  { value: "240", label: "4 hours" },
  { value: "1440", label: "1 day" },
  { value: "10080", label: "1 week" },
  { value: "until", label: "Until…" },
] as const
type Length = (typeof lengths)[number]["value"]

const MAX_MINUTES = 90 * 24 * 60

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(v: string) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

// "14:30", "tomorrow 14:30" or "Tue 12 Nov, 14:30".
export function whenText(at: Date | string) {
  const d = typeof at === "string" ? new Date(at) : at
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
  const day = (x: Date) => new Date(x).setHours(0, 0, 0, 0)
  const days = Math.round((day(d) - day(new Date())) / 86_400_000)
  if (days === 0) return time
  if (days === 1) return `tomorrow ${time}`
  if (days === -1) return `yesterday ${time}`
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  })
  return `${date}, ${time}`
}

const key = (t: MuteTarget) => `${t.kind}:${t.id}`

// Servers and databases a mute could cover: the page's own, then what the
// chosen rule (or every rule) watches right now.
function targetsFor(
  rules: AlertRule[],
  ruleId: string,
  start?: MuteTarget,
): MuteTarget[] {
  const seen = new Map<string, MuteTarget>()
  if (start) seen.set(key(start), start)
  for (const r of rules) {
    if (ruleId && r.id !== ruleId) continue
    for (const s of r.states) {
      const t: MuteTarget = {
        kind: s.target_kind === "database" ? "database" : "server",
        id: s.target_id,
        name: s.target_name,
      }
      if (!seen.has(key(t))) seen.set(key(t), t)
    }
  }
  const rest = [...seen.values()]
    .filter((t) => !start || key(t) !== key(start))
    .sort((a, b) => a.name.localeCompare(b.name))
  return start ? [start, ...rest] : rest
}

export function MuteDialog({
  open,
  onOpenChange,
  start,
  phone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  start?: MuteStart
  phone: boolean
}) {
  const create = useCreateMute()
  // A fresh form every time it opens.
  const [form, setForm] = useState(0)
  const [opened, setOpened] = useState(false)
  if (open !== opened) {
    setOpened(open)
    if (open) setForm(Date.now())
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mute alerts"
      description="For maintenance or a known problem. Alerts that fire meanwhile are recorded but not sent."
      className="sm:max-w-lg"
      footer={
        <>
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="alert-mute-form"
            className="h-11 md:h-9"
            disabled={create.isPending}
          >
            <BellOff />
            {create.isPending ? "Muting…" : "Mute"}
          </Button>
        </>
      }
    >
      {open && (
        <MuteForm
          key={form}
          start={start}
          phone={phone}
          submit={(body, onErrors) =>
            create.mutate(body, {
              onSuccess: (m) => {
                toast.success(
                  m.active
                    ? `Muted until ${whenText(m.until)}`
                    : `Mute planned for ${whenText(m.starts_at)}`,
                )
                onOpenChange(false)
              },
              onError: (err) => {
                const fields = fieldErrors(err)
                onErrors(fields)
                if (Object.keys(fields).length === 0) toast.error(err.message)
              },
            })
          }
        />
      )}
    </ResponsiveDialog>
  )
}

function MuteForm({
  start,
  phone,
  submit,
}: {
  start?: MuteStart
  phone: boolean
  submit: (
    body: AlertMuteBody,
    onErrors: (e: Record<string, string>) => void,
  ) => void
}) {
  const rules = useAlertRules().data ?? []
  const fixed = start?.target
  // A page's own server or database only takes rules that watch its kind.
  const choices = rules
    .filter((r) => !fixed || targetOf(r.metric) === fixed.kind)
    .sort((a, b) => a.name.localeCompare(b.name))

  const [ruleId, setRuleId] = useState(start?.rule?.id ?? "")
  const [where, setWhere] = useState(fixed ? key(fixed) : "")
  const [when, setWhen] = useState<"now" | "later">("now")
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60_000)
    d.setMinutes(0, 0, 0)
    return toLocalInput(d)
  })
  const [length, setLength] = useState<Length>("60")
  const [until, setUntil] = useState("")
  const [note, setNote] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const rule = rules.find((r) => r.id === ruleId) ?? start?.rule
  const targets = targetsFor(rules, ruleId, fixed)
  const target = targets.find((t) => key(t) === where)
  // A target the new rule doesn't watch falls back to everywhere.
  const pickRule = (id: string) => {
    setRuleId(id)
    if (where && where !== (fixed && key(fixed))) {
      if (!targetsFor(rules, id, fixed).some((t) => key(t) === where))
        setWhere("")
    }
  }

  const from = when === "later" ? fromLocalInput(startsAt) : new Date()
  const to =
    length === "until"
      ? fromLocalInput(until)
      : from && new Date(from.getTime() + Number(length) * 60_000)

  const check = () => {
    const e: Record<string, string> = {}
    const now = Date.now()
    if (when === "later") {
      if (!from) e.starts_at = "Pick when it starts"
      else if (from.getTime() <= now) e.starts_at = "Pick a time from now on"
      else if (from.getTime() - now > 365 * 86_400_000)
        e.starts_at = "Plan it within a year"
    }
    if (length === "until") {
      if (!to) e.until = "Pick when it ends"
      else if (from && to <= from) e.until = "The end must be after the start"
      else if (from && to.getTime() - from.getTime() > MAX_MINUTES * 60_000)
        e.until = "A mute lasts 90 days at most"
    }
    if (note.length > 500) e.note = "Keep it under 500 characters"
    return e
  }

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    const e = check()
    setErrors(e)
    if (Object.keys(e).length > 0) return
    const body: AlertMuteBody = {}
    if (ruleId) body.rule_id = ruleId
    if (target) {
      body.target_kind = target.kind
      body.target_id = target.id
    }
    if (when === "later" && from) body.starts_at = from.toISOString()
    if (length === "until" && to) body.until = to.toISOString()
    else body.minutes = Number(length)
    if (note.trim()) body.note = note.trim()
    submit(body, (fields) =>
      setErrors({
        starts_at: fields.starts_at,
        until: fields.until ?? fields.minutes,
        note: fields.note,
        target: fields.target_id ?? fields.target_kind,
      }),
    )
  }

  const whoText = rule ? `Alerts from ${rule.name}` : "Every alert"
  const whereText = target
    ? ` on ${target.name}`
    : fixed || targets.length > 0
      ? " everywhere"
      : ""
  const span =
    from && to && to > from
      ? formatDuration((to.getTime() - from.getTime()) / 1000)
      : ""

  return (
    <form
      id="alert-mute-form"
      onSubmit={onSubmit}
      className="flex flex-col gap-5 pb-2"
      noValidate
    >
      <Field
        label="Which alerts"
        hint={
          rule
            ? undefined
            : choices.length > 0
              ? "Every rule, or pick one."
              : undefined
        }
      >
        {(p) => (
          <Pick
            id={p.id}
            phone={phone}
            value={ruleId}
            onChange={pickRule}
            items={[
              { value: "", label: "Every rule" },
              ...choices.map((r) => ({
                value: r.id,
                label: r.name,
                detail: r.enabled ? undefined : "Off",
              })),
            ]}
          />
        )}
      </Field>

      {targets.length > 0 && (
        <Field label="Where" error={errors.target}>
          {(p) => (
            <Pick
              id={p.id}
              phone={phone}
              value={where}
              onChange={setWhere}
              items={[
                { value: "", label: "Everywhere" },
                ...targets.map((t) => ({
                  value: key(t),
                  label: t.name,
                  detail: t.kind === "database" ? "Database" : "Server",
                })),
              ]}
            />
          )}
        </Field>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium">Starts</span>
        <Segmented
          label="Starts"
          items={[
            { value: "now" as const, label: "Now" },
            { value: "later" as const, label: "Later" },
          ]}
          value={when}
          onChange={setWhen}
        />
        {when === "later" && (
          <Field label="Starts at" error={errors.starts_at} className="mt-2">
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={startsAt}
                min={toLocalInput(new Date())}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            )}
          </Field>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium">For how long</span>
        <div className="flex flex-wrap gap-2">
          {lengths.map((l) => (
            <button
              key={l.value}
              type="button"
              aria-pressed={length === l.value}
              onClick={() => {
                setLength(l.value)
                if (l.value === "until" && !until && from)
                  setUntil(
                    toLocalInput(new Date(from.getTime() + 2 * 3_600_000)),
                  )
              }}
              className="inline-flex h-10 items-center rounded-full border border-border px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
            >
              {l.label}
            </button>
          ))}
        </div>
        {length === "until" && (
          <Field
            label="Ends at"
            error={errors.until}
            hint={!errors.until && "90 days at most."}
            className="mt-2"
          >
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={until}
                min={toLocalInput(from ?? new Date())}
                onChange={(e) => setUntil(e.target.value)}
              />
            )}
          </Field>
        )}
        {length !== "until" && errors.until && (
          <p className="text-caption text-destructive">{errors.until}</p>
        )}
      </div>

      <Field
        label="Note"
        error={errors.note}
        hint={!errors.note && "Optional. Shown to everyone who sees the mute."}
      >
        {(p) => (
          <Input
            {...p}
            value={note}
            maxLength={500}
            placeholder="Kernel upgrade, back by 15:00"
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>

      {from && to && to > from && (
        <Callout icon={<CalendarClock />}>
          <span className="text-foreground">
            {whoText}
            {whereText} won't be sent{" "}
            {when === "now" ? "from now" : `from ${whenText(from)}`} until{" "}
            {whenText(to)}
            {span && ` (${span})`}.
          </span>{" "}
          They're still recorded; one still firing when the mute ends is sent
          then. You can end it early.
        </Callout>
      )}
    </form>
  )
}

// Mutes on now or planned: on /alerts every one, on a server's or a
// database's page those that cover it.
export function MutesNotice({
  serverId,
  databaseId,
  canEnd,
  className,
}: {
  serverId?: string
  databaseId?: string
  canEnd: boolean
  className?: string
}) {
  const q = serverId
    ? { server_id: serverId }
    : databaseId
      ? { database_id: databaseId }
      : {}
  const mutes = useAlertMutes(q).data ?? []
  if (mutes.length === 0) return null
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col divide-y divide-border rounded-2xl border bg-subtle",
        className,
      )}
    >
      {mutes.map((m) => (
        <MuteRow key={m.id} m={m} canEnd={canEnd} />
      ))}
    </div>
  )
}

function MuteRow({ m, canEnd }: { m: AlertMute; canEnd: boolean }) {
  const end = useEndMute()
  const left = formatDuration(
    Math.max(60, (new Date(m.until).getTime() - Date.now()) / 1000),
  )
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <BellOff
        className={cn(
          "mt-0.5 size-4 shrink-0",
          m.active ? "text-foreground" : "text-ash",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body-sm">
          <span className="font-medium">
            {m.rule_name || "Every rule"}
            {m.target_name ? ` on ${m.target_name}` : " everywhere"}
          </span>
          <span className="text-muted-foreground">
            {m.active
              ? ` · muted until ${whenText(m.until)} (${left} left)`
              : ` · planned ${whenText(m.starts_at)} – ${whenText(m.until)}`}
          </span>
        </p>
        {(m.note || m.created_by_name) && (
          <p className="text-caption text-muted-foreground">
            {m.note && <span className="text-foreground">{m.note}</span>}
            {m.note && m.created_by_name && " · "}
            {m.created_by_name && `by ${m.created_by_name}`}
          </p>
        )}
      </div>
      {canEnd && (
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 md:h-7"
          disabled={end.isPending}
          onClick={() =>
            end.mutate(m.id, {
              onSuccess: () =>
                toast.success(m.active ? "Mute ended" : "Planned mute dropped"),
              onError: (e) => toast.error(e.message),
            })
          }
        >
          {m.active ? "End now" : "Drop"}
        </Button>
      )}
    </div>
  )
}
