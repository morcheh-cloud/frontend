"use client"

import { CircleAlert, CircleCheck, CircleDashed, Info } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useFacets } from "@/app/(panel)/servers/api"
import { TagInput } from "@/app/(panel)/servers/components/fields"
import { ServerChecklist } from "@/app/(panel)/servers/components/server-checklist"
import { ChannelPicker } from "@/app/(panel)/uptime/components/monitor-editor"
import { Field } from "@/components/field"
import { useWorkspace } from "@/components/panel/workspace"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { fieldErrors } from "@/lib/api"
import type { AlertPreviewItem, AlertRule, AlertRuleBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAlertPreview, useChannels, useSaveAlertRule } from "../api"
import {
  forChoices,
  formatValue,
  forText,
  fromFieldValue,
  isPercent,
  type Metric,
  metricOf,
  metricOrder,
  metrics,
  type Op,
  type Preset,
  presets,
  repeatChoices,
  repeatText,
  ruleSentence,
  type Scope,
  type Severity,
  severityMeta,
  toFieldValue,
} from "./rules-meta"

type Draft = {
  name: string
  // false = the name follows the condition until someone types one.
  named: boolean
  metric: Metric
  op: Op
  threshold: string
  mount: string
  forMinutes: string
  severity: Severity
  scope: Scope
  servers: Map<string, string>
  tags: string[]
  repeat: number
  notifyResolved: boolean
  channels: string[] | null
  enabled: boolean
}

// Where a new rule starts: a preset, a server (the Metrics tab), a mount.
export type RuleStart = {
  preset?: Preset
  metric?: Metric
  threshold?: number
  mount?: string
  server?: { id: string; name: string }
}

function draftOf(rule?: AlertRule, start?: RuleStart): Draft {
  if (rule) {
    return {
      name: rule.name,
      named: true,
      metric: rule.metric as Metric,
      op: rule.op as Op,
      threshold: String(toFieldValue(rule.metric, rule.threshold)),
      mount: rule.mount,
      forMinutes: String(rule.for_minutes),
      severity: rule.severity as Severity,
      scope: rule.scope as Scope,
      servers: new Map(rule.server_ids.map((id) => [id, ""])),
      tags: rule.tags,
      repeat: rule.repeat_minutes,
      notifyResolved: rule.notify_resolved,
      channels: rule.channel_ids,
      enabled: rule.enabled,
    }
  }
  const p = start?.preset
  const metric = p?.metric ?? start?.metric ?? "cpu"
  const m = metrics[metric]
  return {
    name: p?.name ?? "",
    named: !!p,
    metric,
    op: p?.op ?? "above",
    threshold: String(
      toFieldValue(metric, p?.threshold ?? start?.threshold ?? m.threshold),
    ),
    mount: start?.mount ?? "",
    forMinutes: String(p?.forMinutes ?? m.forMinutes),
    severity: p?.severity ?? "warning",
    scope: start?.server ? "servers" : "all",
    servers: start?.server
      ? new Map([[start.server.id, start.server.name]])
      : new Map(),
    tags: [],
    repeat: 0,
    notifyResolved: true,
    channels: null,
    enabled: true,
  }
}

const num = (s: string) => (s.trim() === "" ? Number.NaN : Number(s))

function autoName(d: Draft) {
  return ruleSentence({
    metric: d.metric,
    op: d.op,
    threshold: fromFieldValue(d.metric, num(d.threshold) || 0),
    mount: d.mount.trim(),
    for_minutes: 0,
  })
}

// Problems the backend would also refuse, keyed like its field errors.
function check(d: Draft): Record<string, string> {
  const e: Record<string, string> = {}
  if (d.metric !== "offline") {
    const t = num(d.threshold)
    if (Number.isNaN(t)) e.threshold = "Enter a number"
    else if (t < 0) e.threshold = "Can't be below 0"
    else if (isPercent(d.metric) && t > 100)
      e.threshold = "Use a percent from 0 to 100"
  }
  const f = num(d.forMinutes)
  if (Number.isNaN(f) || f < 0 || f > 1440 || !Number.isInteger(f))
    e.for_minutes = "Whole minutes, up to 1440 (a day)"
  if (d.metric === "disk" && d.mount.trim() && !d.mount.trim().startsWith("/"))
    e.mount = "A mount point starts with /, like /var"
  if (d.scope === "servers" && d.servers.size === 0)
    e.server_ids = "Pick at least one server"
  if (d.scope === "tags" && d.tags.length === 0)
    e.tags = "Pick at least one tag"
  return e
}

function bodyOf(d: Draft, channels: string[]): AlertRuleBody {
  return {
    name: (d.named ? d.name : autoName(d)).trim() || autoName(d),
    enabled: d.enabled,
    metric: d.metric,
    op: d.op,
    threshold:
      d.metric === "offline" ? 0 : fromFieldValue(d.metric, num(d.threshold)),
    mount: d.metric === "disk" ? d.mount.trim() : "",
    for_minutes: num(d.forMinutes),
    severity: d.severity,
    scope: d.scope,
    server_ids: d.scope === "servers" ? [...d.servers.keys()] : [],
    tags: d.scope === "tags" ? d.tags : [],
    repeat_minutes: d.repeat,
    notify_resolved: d.notifyResolved,
    channel_ids: channels,
  }
}

export function RuleEditorLayer({
  open,
  onOpenChange,
  rule,
  start,
  phone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: AlertRule
  start?: RuleStart
  phone: boolean
}) {
  const save = useSaveAlertRule()
  const [form, setForm] = useState<{ key: number; draft: Draft }>()
  // A fresh draft every time the layer opens.
  const [opened, setOpened] = useState(false)
  if (open !== opened) {
    setOpened(open)
    if (open) setForm({ key: Date.now(), draft: draftOf(rule, start) })
  }

  const submit = (
    body: AlertRuleBody,
    onErrors: (e: Record<string, string>) => void,
  ) =>
    save.mutate(
      { id: rule?.id, body },
      {
        onSuccess: (r) => {
          toast.success(rule ? `${r.name} saved` : `${r.name} added`)
          onOpenChange(false)
        },
        onError: (err) => {
          const fields = fieldErrors(err)
          onErrors(fields)
          if (Object.keys(fields).length === 0) toast.error(err.message)
        },
      },
    )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? `Edit ${rule.name}` : "New alert rule"}
      className="sm:max-w-2xl"
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
            form="alert-rule-form"
            className="h-11 md:h-9"
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : rule ? "Save" : "Add rule"}
          </Button>
        </>
      }
    >
      {form && (
        <RuleForm
          key={form.key}
          initial={form.draft}
          isNew={!rule}
          fromPreset={!rule && !start}
          phone={phone}
          onSubmit={submit}
        />
      )}
    </ResponsiveDialog>
  )
}

function RuleForm({
  initial,
  isNew,
  fromPreset,
  phone,
  onSubmit,
}: {
  initial: Draft
  isNew: boolean
  fromPreset: boolean
  phone: boolean
  onSubmit: (
    body: AlertRuleBody,
    onErrors: (e: Record<string, string>) => void,
  ) => void
}) {
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""
  const channels = useChannels()
  const facets = useFacets()
  const [d, setD] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tried, setTried] = useState(false)
  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }))
    setErrors({})
  }

  const problems = check(d)
  const shown = tried ? { ...problems, ...errors } : errors
  // null = a new rule that takes the workspace's default channels.
  const pickedChannels =
    d.channels ??
    (channels.data ?? []).filter((c) => c.is_default).map((c) => c.id)
  const body = bodyOf(d, pickedChannels)

  // The preview follows the form half a second behind.
  const ready = Object.keys(problems).length === 0
  const key = ready ? JSON.stringify(body) : ""
  const [debounced, setDebounced] = useState(key)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(key), 500)
    return () => clearTimeout(t)
  }, [key])
  const preview = useAlertPreview(debounced ? JSON.parse(debounced) : null)

  const pickMetric = (metric: Metric) => {
    const m = metrics[metric]
    set({
      metric,
      threshold: String(toFieldValue(metric, m.threshold)),
      forMinutes: String(m.forMinutes),
      op: "above",
    })
  }
  const applyPreset = (p: Preset) =>
    set({
      name: p.name,
      named: true,
      metric: p.metric,
      op: p.op,
      threshold: String(toFieldValue(p.metric, p.threshold)),
      forMinutes: String(p.forMinutes),
      severity: p.severity,
    })

  const meta = metricOf(d.metric)
  const minutes = num(d.forMinutes)

  return (
    <form
      id="alert-rule-form"
      noValidate
      className="flex flex-col gap-6 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (Object.keys(problems).length > 0) return
        onSubmit(body, setErrors)
      }}
    >
      {fromPreset && (
        <Group title="Start from">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p)}
                className="inline-flex h-9 items-center rounded-full border border-dashed border-mist px-3 text-body-sm text-muted-foreground hover:bg-muted hover:text-foreground md:h-8"
              >
                {p.name}
              </button>
            ))}
          </div>
        </Group>
      )}

      <Group title="Watch">
        <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <legend className="sr-only">Metric</legend>
          {metricOrder.map((m) => {
            const Icon = metrics[m].icon
            const on = d.metric === m
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => pickMetric(m)}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-lg border px-3 text-start text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on
                    ? "border-brand bg-brand-soft font-medium text-brand-strong"
                    : "border-border hover:bg-subtle",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{metrics[m].label}</span>
              </button>
            )
          })}
        </fieldset>
        <p className="text-caption text-muted-foreground">{meta.hint}</p>

        {d.metric !== "offline" && (
          <div className="flex flex-wrap items-end gap-3">
            <Segmented
              label="Condition"
              items={[
                { value: "above" as const, label: "Above" },
                { value: "below" as const, label: "Below" },
              ]}
              value={d.op}
              onChange={(op) => set({ op })}
            />
            <Field label="Threshold" error={shown.threshold} className="w-40">
              {(p) => (
                <div className="relative">
                  <Input
                    {...p}
                    value={d.threshold}
                    onChange={(e) => set({ threshold: e.target.value })}
                    inputMode="decimal"
                    className="pe-20 tabular-nums"
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-ash">
                    {meta.unit}
                  </span>
                </div>
              )}
            </Field>
            {d.metric === "disk" && (
              <Field
                label="Filesystem"
                error={shown.mount}
                className="min-w-40 flex-1"
              >
                {(p) => (
                  <Input
                    {...p}
                    value={d.mount}
                    onChange={(e) => set({ mount: e.target.value })}
                    placeholder="Any (the fullest)"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="font-mono placeholder:font-sans placeholder:text-ash"
                  />
                )}
              </Field>
            )}
          </div>
        )}

        <Field
          label={d.metric === "offline" ? "Unreachable for" : "Lasting"}
          error={shown.for_minutes}
          hint={
            d.metric === "offline"
              ? "Short blips (a reboot, a network hiccup) don't alert."
              : "It has to stay that way this long, so short spikes don't alert."
          }
        >
          {(p) => (
            <div className="flex flex-wrap items-center gap-1.5">
              {forChoices.map((m) => (
                <Chip
                  key={m}
                  on={minutes === m}
                  onClick={() => set({ forMinutes: String(m) })}
                >
                  {m === 0 ? "At once" : m < 60 ? `${m} min` : "1 hour"}
                </Chip>
              ))}
              <div className="relative w-28">
                <Input
                  {...p}
                  value={d.forMinutes}
                  onChange={(e) =>
                    set({ forMinutes: e.target.value.replace(/\D/g, "") })
                  }
                  inputMode="numeric"
                  aria-label="Minutes"
                  className="pe-11 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-caption text-ash">
                  min
                </span>
              </div>
            </div>
          )}
        </Field>
      </Group>

      <Group title="On">
        <Segmented
          label="Servers"
          items={[
            { value: "all" as const, label: "Every server" },
            { value: "servers" as const, label: "Chosen servers" },
            { value: "tags" as const, label: "By tag" },
          ]}
          value={d.scope}
          onChange={(scope) => set({ scope })}
        />
        {d.scope === "all" && (
          <p className="text-caption text-muted-foreground">
            Every server in {workspace?.name ?? "this workspace"}, including
            ones added later.
          </p>
        )}
        {d.scope === "servers" && (
          <div className="flex flex-col gap-1.5">
            <div
              className={cn(
                "overflow-hidden rounded-lg border",
                shown.server_ids ? "border-destructive" : "border-border",
              )}
            >
              <ServerChecklist
                value={d.servers}
                onChange={(servers) => set({ servers })}
                phone={phone}
              />
            </div>
            <p
              className={cn(
                "text-caption",
                shown.server_ids ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {shown.server_ids ??
                `${d.servers.size} ${d.servers.size === 1 ? "server" : "servers"} ticked`}
            </p>
          </div>
        )}
        {d.scope === "tags" && (
          <Field
            label="Tags"
            error={shown.tags}
            hint="Servers with any of these tags, including ones tagged later."
          >
            {(p) => (
              <TagInput
                id={p.id}
                value={d.tags}
                onChange={(tags) => set({ tags })}
                suggestions={facets.data?.tags.map((t) => t.value)}
                invalid={!!shown.tags}
              />
            )}
          </Field>
        )}
      </Group>

      <Group title="Right now">
        <Preview
          metric={d.metric}
          query={preview}
          waiting={!ready || key !== debounced}
        />
      </Group>

      <Group title="Tell">
        <ChannelPicker
          ws={ws}
          query={channels}
          value={d.channels}
          onChange={(c) => set({ channels: c })}
          error={shown.channel_ids}
          empty="firing alerts still show here, on the server's Metrics tab and in the menu."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Severity" hint={severityMeta[d.severity].hint}>
            {() => (
              <Segmented
                label="Severity"
                items={(["warning", "critical"] as const).map((s) => ({
                  value: s,
                  label: severityMeta[s].label,
                }))}
                value={d.severity}
                onChange={(severity) => set({ severity })}
              />
            )}
          </Field>
          <Field label="Remind" hint="While it keeps firing.">
            {() => (
              <Segmented
                label="Remind"
                items={repeatChoices.map((m) => ({
                  value: String(m),
                  label:
                    m === 0 ? "Never" : repeatText(m).replace("Every ", ""),
                }))}
                value={String(d.repeat)}
                onChange={(v) => set({ repeat: Number(v) })}
              />
            )}
          </Field>
        </div>
        <label
          htmlFor="rule-resolved"
          className="flex min-h-11 items-center justify-between gap-4"
        >
          <span>
            <span className="block text-body-sm font-medium">
              Tell when it's back to normal
            </span>
            <span className="block text-caption text-muted-foreground">
              A message once the condition clears, with how long it lasted.
            </span>
          </span>
          <Switch
            id="rule-resolved"
            checked={d.notifyResolved}
            onCheckedChange={(notifyResolved) => set({ notifyResolved })}
          />
        </label>
      </Group>

      <Group title="Name">
        <Field
          label="Rule name"
          error={shown.name}
          hint={
            d.named
              ? "Shown in the alert messages."
              : "Follows the condition until you type one."
          }
        >
          {(p) => (
            <Input
              {...p}
              value={d.named ? d.name : autoName(d)}
              onChange={(e) => set({ name: e.target.value, named: true })}
              maxLength={100}
            />
          )}
        </Field>
        {isNew && (
          <label
            htmlFor="rule-enabled"
            className="flex min-h-11 items-center justify-between gap-4"
          >
            <span className="text-body-sm font-medium">Turn on now</span>
            <Switch
              id="rule-enabled"
              checked={d.enabled}
              onCheckedChange={(enabled) => set({ enabled })}
            />
          </label>
        )}
        <p className="text-caption text-muted-foreground">
          {ruleSentence({
            metric: d.metric,
            op: d.op,
            threshold: fromFieldValue(d.metric, num(d.threshold) || 0),
            mount: d.mount.trim(),
            for_minutes: Number.isNaN(minutes) ? 0 : minutes,
          })}
          {Number.isNaN(minutes) || minutes > 0 ? "" : ` (${forText(0)})`} →{" "}
          {severityMeta[d.severity].label.toLowerCase()} to{" "}
          {pickedChannels.length === 0
            ? "no channel"
            : `${pickedChannels.length} ${pickedChannels.length === 1 ? "channel" : "channels"}`}
          .
        </p>
      </Group>
    </form>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-label text-caption tracking-label text-ash uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="inline-flex h-10 items-center rounded-full border border-border px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
    >
      {children}
    </button>
  )
}

// What the rule would see on each covered server, from their last samples.
function Preview({
  metric,
  query,
  waiting,
}: {
  metric: string
  query: ReturnType<typeof useAlertPreview>
  waiting: boolean
}) {
  const items = query.data ?? []
  if (!query.data && (waiting || query.isPending)) {
    return (
      <p className="text-caption text-muted-foreground">
        {waiting ? "Finish the condition to see it." : "Checking…"}
      </p>
    )
  }
  if (query.isError && !query.data) {
    return (
      <p className="text-caption text-destructive">{query.error.message}</p>
    )
  }
  if (items.length === 0) {
    return (
      <Callout icon={<Info />}>
        It covers no server yet. Pick servers, or a tag some servers have.
      </Callout>
    )
  }
  const met = items.filter((i) => i.met).length
  return (
    <div className={cn("flex flex-col gap-2", waiting && "opacity-60")}>
      <p className="text-body-sm">
        {met > 0 ? (
          <span className="font-medium text-warning">
            Meets it now on {met} of {items.length}
          </span>
        ) : (
          <span className="text-muted-foreground">
            None of the {items.length}{" "}
            {items.length === 1 ? "server meets" : "servers meet"} it now
          </span>
        )}
        <span className="text-caption text-ash">
          {" "}
          · from each server's last sample
        </span>
      </p>
      <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {items.slice(0, 50).map((i) => (
          <PreviewRow key={i.server_id} item={i} metric={metric} />
        ))}
      </ul>
      {items.length > 50 && (
        <p className="text-caption text-ash">And {items.length - 50} more.</p>
      )}
    </div>
  )
}

function PreviewRow({
  item,
  metric,
}: {
  item: AlertPreviewItem
  metric: string
}) {
  const value =
    metric === "offline"
      ? item.detail || item.status
      : item.value === undefined
        ? item.detail || "No sample yet"
        : `${formatValue(metric, item.value)}${item.detail ? ` · ${item.detail}` : ""}`
  const Icon =
    item.value === undefined && metric !== "offline"
      ? CircleDashed
      : item.met
        ? CircleAlert
        : CircleCheck
  return (
    <li className="flex min-h-10 items-center gap-2.5 px-3 py-1.5 text-body-sm">
      <Icon
        className={cn(
          "size-4 shrink-0",
          Icon === CircleDashed
            ? "text-ash"
            : item.met
              ? "text-warning"
              : "text-success",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{item.server_name}</span>
      <span
        className={cn(
          "shrink-0 truncate text-caption tabular-nums",
          item.met ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </li>
  )
}
