"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Bell,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Container,
  Database,
  Info,
  type LucideIcon,
  MonitorCog,
  Server,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  Section,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ChannelPicker } from "@/app/(panel)/monitoring/components/monitor-editor"
import {
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { useFacets } from "@/app/(panel)/servers/api"
import { TagInput } from "@/app/(panel)/servers/components/fields"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import {
  Checklist,
  ServerChecklist,
} from "@/app/(panel)/servers/components/server-checklist"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import {
  AsideCard,
  EditorLoading,
  EditorPage,
  SummaryList,
} from "@/components/editor-page"
import { Field } from "@/components/field"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { databasesQuery, pveClustersQuery } from "@/components/panel/problems"
import { useFollowWorkspace, useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { ApiError, fieldErrors } from "@/lib/api"
import type { AlertPreviewItem, AlertRule, AlertRuleBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useAlertPreview,
  useAlertRule,
  useChannels,
  useSaveAlertRule,
} from "../api"
import {
  allPresets,
  editRuleHref,
  type RuleStart,
  ruleStartOf,
} from "./rule-links"
import {
  conditionText,
  containerMetricOrder,
  databaseMetricOrder,
  forChoices,
  formatValue,
  forText,
  fromFieldValue,
  isContainerMetric,
  isDatabaseMetric,
  isPercent,
  isPveMetric,
  isStateMetric,
  type Metric,
  metricOf,
  metricOrder,
  metrics,
  type Op,
  type Preset,
  pveMetricOrder,
  repeatChoices,
  repeatText,
  ruleSentence,
  type Scope,
  type Severity,
  severityMeta,
  takesContainerFilter,
  targetOf,
  toFieldValue,
} from "./rules-meta"

// The alert rule editor: /alerts/rules/new (where it starts in the query,
// see rule-links) and /alerts/rules/[id]/edit. A full page on desktop
// (EditorPage), a native screen with its own app bar on phones.

type Family = "server" | "container" | "database" | "pve"

const families: {
  value: Family
  label: string
  icon: LucideIcon
  order: Metric[]
}[] = [
  { value: "server", label: "Servers", icon: Server, order: metricOrder },
  {
    value: "container",
    label: "Containers",
    icon: Container,
    order: containerMetricOrder,
  },
  {
    value: "database",
    label: "Databases",
    icon: Database,
    order: databaseMetricOrder,
  },
  { value: "pve", label: "Proxmox", icon: MonitorCog, order: pveMetricOrder },
]

const familyOf = (m: string): Family =>
  isPveMetric(m)
    ? "pve"
    : isDatabaseMetric(m)
      ? "database"
      : isContainerMetric(m)
        ? "container"
        : "server"

// /alerts/rules/[id]/edit reads its id from the route.
export function RuleEditorFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <RuleEditor id={id} />
}

export function RuleEditor({ id }: { id?: string }) {
  const phone = useIsPhone()
  const params = useSearchParams()
  const query = useAlertRule(id)
  if (phone === null) return null
  if (id && query.isPending) return <Loading phone={phone} />
  if (id && !query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={Bell}
          title={gone ? "This rule isn't here" : "Couldn't load the rule"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={<BackToRules />}
        />
      </div>
    )
  }
  const saved = id ? query.data : undefined
  const start = saved ? undefined : ruleStartOf(params)
  return (
    <Editor
      key={saved?.id ?? `new:${params.toString()}`}
      saved={saved}
      start={start}
      phone={phone}
    />
  )
}

function BackToRules() {
  return (
    <Button
      variant="outline"
      className="h-11 w-full md:h-9 md:w-auto"
      render={<Link href="/alerts" />}
      nativeButton={false}
    >
      Back to alert rules
    </Button>
  )
}

// Maps and sets don't survive JSON: compare their keys.
const serial = (d: Draft) =>
  JSON.stringify({
    ...d,
    servers: [...d.servers.keys()],
    databases: [...d.databases],
    clusters: [...d.clusters],
  })

function scrollToProblem() {
  requestAnimationFrame(() =>
    document
      .querySelector("[aria-invalid=true], [data-error]")
      ?.scrollIntoView({ block: "center", behavior: "smooth" }),
  )
}

function Editor({
  saved,
  start,
  phone,
}: {
  saved: AlertRule | undefined
  start: RuleStart | undefined
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  useFollowWorkspace(saved?.workspace_id)
  const ws = saved?.workspace_id ?? workspace?.id ?? ""
  const access = useAccess()
  const can = atLeast(access.workspaceLevel(ws), "engineer")
  const leave = useBackOr("/alerts")
  const channels = useChannels(ws)
  const save = useSaveAlertRule()
  // A blank new rule offers the ready-made ones.
  const offerPresets = !saved && !start

  const [d, setD] = useState(() => draftOf(saved, start))
  const [initial] = useState(() => serial(draftOf(saved, start)))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tried, setTried] = useState(false)
  const dirty = serial(d) !== initial

  usePageCrumbs(
    saved
      ? [{ href: editRuleHref(saved.id), label: saved.name }]
      : [{ href: "/alerts/rules/new", label: "New alert rule" }],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

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

  // Server and database rules cover different things: switching resets the
  // scope to everything of the new kind.
  const scopeFor = (metric: Metric): Partial<Draft> =>
    targetOf(metric) === targetOf(d.metric) ? {} : { scope: "all" }
  const pickMetric = (metric: Metric) => {
    if (metric === d.metric) return
    const m = metrics[metric]
    set({
      ...scopeFor(metric),
      metric,
      threshold: String(toFieldValue(metric, m.threshold)),
      forMinutes: String(m.forMinutes),
      op: "above",
    })
  }
  const applyPreset = (p: Preset) =>
    set({
      ...scopeFor(p.metric),
      name: p.name,
      named: true,
      metric: p.metric,
      op: p.op,
      threshold: String(toFieldValue(p.metric, p.threshold)),
      forMinutes: String(p.forMinutes),
      severity: p.severity,
    })
  const isPreset = (p: Preset) =>
    d.metric === p.metric &&
    (countsOnly(p.metric) || isStateMetric(p.metric) || d.op === p.op) &&
    (isStateMetric(p.metric) ||
      num(d.threshold) === toFieldValue(p.metric, p.threshold)) &&
    num(d.forMinutes) === p.forMinutes &&
    d.severity === p.severity

  function submit() {
    setTried(true)
    const first = Object.values(problems)[0]
    if (first) {
      toast.error(first)
      scrollToProblem()
      return
    }
    save.mutate(
      { id: saved?.id, body },
      {
        onSuccess: (r) => {
          toast.success(saved ? `${r.name} saved` : `${r.name} added`)
          leave()
        },
        onError: (err) => {
          const fields = fieldErrors(err)
          setErrors(fields)
          toast.error(Object.values(fields)[0] ?? err.message)
          scrollToProblem()
        },
      },
    )
  }

  const meta = metricOf(d.metric)
  const MetricIcon = meta.icon
  const family = familyOf(d.metric)
  const minutes = num(d.forMinutes)
  const stateMetric = isStateMetric(d.metric)
  const familyPresets = allPresets.filter((p) => familyOf(p.metric) === family)
  const sentence = `${ruleSentence({
    metric: d.metric,
    op: countsOnly(d.metric) ? "above" : d.op,
    threshold: fromFieldValue(d.metric, num(d.threshold) || 0),
    mount: d.mount.trim(),
    unit: d.unit.trim(),
    project: d.project.trim(),
    container: d.container.trim(),
    for_minutes: Number.isNaN(minutes) ? 0 : minutes,
  })}${Number.isNaN(minutes) || minutes > 0 ? "" : ` (${forText(0)})`}`
  const channelText =
    pickedChannels.length === 0
      ? "no channel"
      : `${pickedChannels.length} ${pickedChannels.length === 1 ? "channel" : "channels"}`
  const coversText =
    family === "pve"
      ? d.scope === "all"
        ? "Every cluster"
        : `${d.clusters.size} ${d.clusters.size === 1 ? "cluster" : "clusters"}`
      : family === "database"
        ? d.scope === "all"
          ? "Every database"
          : `${d.databases.size} ${d.databases.size === 1 ? "database" : "databases"}`
        : d.scope === "all"
          ? "Every server"
          : d.scope === "tags"
            ? d.tags.length
              ? `Tagged ${d.tags.join(", ")}`
              : "No tag yet"
            : `${d.servers.size} ${d.servers.size === 1 ? "server" : "servers"}`

  if (!can) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={Bell}
          title="You can't change alert rules here"
          body="Alert rules need Engineer access to this workspace."
          action={<BackToRules />}
        />
      </div>
    )
  }

  const sections = (
    <>
      <Section
        title="What to watch"
        hint="What the rule checks. Each kind covers its own things: servers, containers, databases or Proxmox clusters."
        phone={phone}
      >
        <fieldset
          aria-label="Watch"
          className="grid min-w-0 grid-cols-2 gap-2 2xl:grid-cols-4"
        >
          {families.map((f) => (
            <FamilyTile
              key={f.value}
              icon={f.icon}
              label={f.label}
              count={f.order.length}
              on={family === f.value}
              onClick={() => {
                if (family !== f.value) pickMetric(f.order[0])
              }}
            />
          ))}
        </fieldset>

        {offerPresets && familyPresets.length > 0 && (
          <div className="flex flex-col gap-2">
            <Eyebrow icon={<Sparkles />}>Ready-made</Eyebrow>
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {familyPresets.map((p) => (
                <PresetTile
                  key={p.key}
                  preset={p}
                  on={isPreset(p)}
                  onClick={() => applyPreset(p)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {offerPresets && familyPresets.length > 0 && (
            <Eyebrow>Or pick what to check</Eyebrow>
          )}
          <fieldset
            aria-label="What to check"
            className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4"
          >
            {families
              .find((f) => f.value === family)
              ?.order.map((m) => (
                <MetricTile
                  key={m}
                  metric={m}
                  on={d.metric === m}
                  onClick={() => pickMetric(m)}
                />
              ))}
          </fieldset>
          <p className="flex items-start gap-2 text-caption text-muted-foreground">
            <MetricIcon className="mt-px size-3.5 shrink-0 text-ash" />
            <span className="min-w-0">
              <span className="font-medium text-foreground">{meta.label}</span>
              {" · "}
              {meta.hint}
            </span>
          </p>
        </div>
      </Section>

      <Section
        title="When it alerts"
        hint={
          stateMetric
            ? "How long it has to stay that way before anyone hears about it."
            : "The limit, and how long it has to stay past it so short spikes stay quiet."
        }
        phone={phone}
      >
        {d.metric === "service" && (
          <Field
            label="Service"
            error={shown.unit}
            hint={
              d.unit.trim()
                ? "Alerts when this one isn't running: stopped or failed. A server without it is skipped."
                : "Empty = any service that failed. Stopped on purpose doesn't count."
            }
          >
            {(p) => (
              <Input
                {...p}
                value={d.unit}
                onChange={(e) => set({ unit: e.target.value })}
                placeholder="Any service that failed"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono placeholder:font-sans placeholder:text-ash"
              />
            )}
          </Field>
        )}

        {takesContainerFilter(d.metric) && (
          <ContainerFilter d={d} set={set} shown={shown} />
        )}

        {!stateMetric && (
          <div className="flex flex-wrap items-start gap-3">
            {!countsOnly(d.metric) && (
              <Field label="Condition">
                {() => (
                  <Segmented
                    label="Condition"
                    items={[
                      { value: "above" as const, label: "Above" },
                      { value: "below" as const, label: "Below" },
                    ]}
                    value={d.op}
                    onChange={(op) => set({ op })}
                  />
                )}
              </Field>
            )}
            <Field
              label={countsOnly(d.metric) ? "More than" : "Limit"}
              error={shown.threshold}
              className="w-40"
            >
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
                hint="Empty = whichever is fullest."
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
          label={
            d.metric === "offline" || d.metric === "db_down"
              ? "Unreachable for"
              : d.metric === "container_down"
                ? "Down for"
                : "Lasting"
          }
          error={shown.for_minutes}
          hint={
            stateMetric
              ? "Short blips (a reboot, a restart, a network hiccup) don't alert."
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

        <div
          className={cn(
            "flex items-start gap-2.5 rounded-lg bg-brand-soft px-3 py-2.5 text-body-sm text-brand-strong",
            !phone && "xl:hidden",
          )}
        >
          <Bell className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">{sentence}</span>
        </div>
      </Section>

      <Section
        title="Covers"
        hint={
          family === "pve"
            ? "Which Proxmox clusters it watches."
            : family === "database"
              ? "Which databases it watches."
              : "Which servers it watches. Every server and By tag take in ones added later."
        }
        phone={phone}
      >
        {family === "pve" ? (
          <DatabaseScope
            kind="cluster"
            ws={ws}
            workspaceName={workspace?.name}
            all={d.scope === "all"}
            onAll={(all) => set({ scope: all ? "all" : "clusters" })}
            value={d.clusters}
            onChange={(clusters) => set({ clusters })}
            error={shown.cluster_ids}
            phone={phone}
          />
        ) : family === "database" ? (
          <DatabaseScope
            kind="database"
            ws={ws}
            workspaceName={workspace?.name}
            all={d.scope === "all"}
            onAll={(all) => set({ scope: all ? "all" : "databases" })}
            value={d.databases}
            onChange={(databases) => set({ databases })}
            error={shown.database_ids}
            phone={phone}
          />
        ) : (
          <ServerScope d={d} set={set} shown={shown} phone={phone} />
        )}
      </Section>

      <Section
        title="Right now"
        hint="What it would see on what it covers, before you save. Nothing is sent from here."
        phone={phone}
      >
        <Preview
          metric={d.metric}
          query={preview}
          waiting={!ready || key !== debounced}
        />
      </Section>

      <Section
        title="Notify"
        hint="Where the alert goes, how loud it is, and whether it nags."
        phone={phone}
      >
        <ChannelPicker
          ws={ws}
          query={channels}
          value={d.channels}
          onChange={(c) => set({ channels: c })}
          error={shown.channel_ids}
          empty="firing alerts still show on the Alert rules page, the server's Metrics tab and in the menu."
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
        <ToggleRow
          id="rule-resolved"
          label="Tell when it's back to normal"
          hint="A message once the condition clears, with how long it lasted."
          checked={d.notifyResolved}
          onChange={(notifyResolved) => set({ notifyResolved })}
        />
      </Section>

      <Section
        title="Name"
        hint="Shown in the list and in every message it sends."
        phone={phone}
      >
        <Field
          label="Rule name"
          error={shown.name}
          hint={
            d.named
              ? "Clear it to follow the condition again."
              : "Follows the condition until you type one."
          }
        >
          {(p) => (
            <Input
              {...p}
              value={d.named ? d.name : autoName(d)}
              onChange={(e) =>
                set({ name: e.target.value, named: e.target.value !== "" })
              }
              maxLength={100}
            />
          )}
        </Field>
        <ToggleRow
          id="rule-enabled"
          label={saved ? "On" : "Turn on now"}
          hint={
            d.enabled
              ? "It checks from the moment it's saved."
              : "Saved but off: it checks nothing and sends nothing."
          }
          checked={d.enabled}
          onChange={(enabled) => set({ enabled })}
        />
      </Section>
    </>
  )

  const label = saved ? "Save" : "Create"
  const blocked = save.isPending || (!!saved && !dirty)

  if (phone) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={leave}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {saved ? "Edit alert rule" : "New alert rule"}
          </h1>
          <Button
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={blocked}
            onClick={submit}
          >
            {save.isPending ? "Saving…" : label}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )
  }

  return (
    <EditorPage
      icon={<MetricIcon />}
      title={saved ? saved.name : "New alert rule"}
      dirty={dirty}
      status={
        dirty
          ? "Unsaved changes"
          : saved
            ? `Saved ${timeAgo(saved.updated_at)}`
            : "Not saved yet"
      }
      onSave={blocked ? undefined : submit}
      aside={
        <>
          <AsideCard title="In plain words">
            <p className="text-body-sm">{sentence}.</p>
            <p className="mt-2 flex items-center gap-1.5 text-caption text-muted-foreground">
              <SeverityDot severity={d.severity} />
              {severityMeta[d.severity].label} to {channelText}
              {d.repeat > 0 ? `, ${repeatText(d.repeat).toLowerCase()}` : ""}
            </p>
          </AsideCard>
          <AsideCard title="Summary">
            <SummaryList
              rows={[
                ["Watches", meta.label],
                ["Covers", coversText],
                ["Severity", severityMeta[d.severity].label],
                [
                  "Tells",
                  channelText.charAt(0).toUpperCase() + channelText.slice(1),
                ],
                ["Reminds", d.repeat > 0 ? repeatText(d.repeat) : "Never"],
                ["Back to normal", d.notifyResolved ? "Says so" : "Quiet"],
                ["State", d.enabled ? "On" : "Off"],
              ]}
            />
          </AsideCard>
        </>
      }
      actions={
        <>
          <Button variant="outline" className="h-9" onClick={leave}>
            Cancel
          </Button>
          <Button className="h-9" disabled={blocked} onClick={submit}>
            {save.isPending ? "Saving…" : label}
          </Button>
        </>
      }
    >
      {sections}
    </EditorPage>
  )
}

function Eyebrow({ icon, children }: { icon?: ReactNode; children: string }) {
  return (
    <p className="flex items-center gap-1.5 font-label text-[11px] tracking-label text-ash uppercase [&>svg]:size-3.5">
      {icon}
      {children}
    </p>
  )
}

const tile =
  "flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card text-start outline-none transition-colors hover:border-mist hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:hover:bg-brand-soft"

function FamilyTile({
  icon: Icon,
  label,
  count,
  on,
  onClick,
}: {
  icon: LucideIcon
  label: string
  count: number
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(tile, "group min-h-14 px-3 py-2.5")}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-aria-pressed:bg-brand group-aria-pressed:text-primary-foreground">
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-body-sm font-medium group-aria-pressed:text-brand-strong">
          {label}
        </span>
        <span className="block truncate text-caption text-ash">
          {count} {count === 1 ? "check" : "checks"}
        </span>
      </span>
    </button>
  )
}

function PresetTile({
  preset: p,
  on,
  onClick,
}: {
  preset: Preset
  on: boolean
  onClick: () => void
}) {
  const Icon = metricOf(p.metric).icon
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(tile, "group min-h-14 px-3 py-2.5")}
    >
      <Icon className="size-4.5 shrink-0 text-ash group-aria-pressed:text-brand-strong" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium group-aria-pressed:text-brand-strong">
          {p.name}
        </span>
        <span className="block truncate text-caption text-muted-foreground">
          {conditionText({
            metric: p.metric,
            op: p.op,
            threshold: p.threshold,
          })}{" "}
          {forText(p.forMinutes)}
        </span>
      </span>
      <SeverityDot severity={p.severity} />
    </button>
  )
}

function MetricTile({
  metric,
  on,
  onClick,
}: {
  metric: Metric
  on: boolean
  onClick: () => void
}) {
  const m = metricOf(metric)
  const Icon = m.icon
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(tile, "group min-h-12 px-3 py-2")}
    >
      <Icon className="size-4 shrink-0 text-ash group-aria-pressed:text-brand-strong" />
      <span className="min-w-0 truncate text-body-sm group-aria-pressed:font-medium group-aria-pressed:text-brand-strong">
        {m.label}
      </span>
    </button>
  )
}

function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      role="img"
      aria-label={severityMeta[severity].label}
      title={severityMeta[severity].label}
      className={cn(
        "size-2 shrink-0 rounded-full",
        severity === "critical" ? "bg-destructive" : "bg-warning",
      )}
    />
  )
}

function Loading({ phone }: { phone: boolean }) {
  if (!phone) return <EditorLoading />
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}

type Draft = {
  name: string
  // false = the name follows the condition until someone types one.
  named: boolean
  metric: Metric
  op: Op
  threshold: string
  mount: string
  // service: one unit; "" = any failed service.
  unit: string
  // container_*: compose project and container/service patterns; "" = any.
  project: string
  container: string
  forMinutes: string
  severity: Severity
  scope: Scope
  servers: Map<string, string>
  databases: Set<string>
  clusters: Set<string>
  tags: string[]
  repeat: number
  notifyResolved: boolean
  channels: string[] | null
  enabled: boolean
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
      unit: rule.unit,
      project: rule.project ?? "",
      container: rule.container ?? "",
      forMinutes: String(rule.for_minutes),
      severity: rule.severity as Severity,
      scope: rule.scope as Scope,
      servers: new Map(rule.server_ids.map((id) => [id, ""])),
      databases: new Set(rule.database_ids),
      clusters: new Set(rule.cluster_ids ?? []),
      tags: rule.tags,
      repeat: rule.repeat_minutes,
      notifyResolved: rule.notify_resolved,
      channels: rule.channel_ids,
      enabled: rule.enabled,
    }
  }
  const p = start?.preset
  const metric =
    p?.metric ??
    start?.metric ??
    (start?.database ? "db_down" : start?.cluster ? "pve_node_down" : "cpu")
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
    unit: start?.unit ?? "",
    project: start?.project ?? "",
    container: start?.container ?? "",
    forMinutes: String(p?.forMinutes ?? m.forMinutes),
    severity: p?.severity ?? "warning",
    scope: start?.database
      ? "databases"
      : start?.cluster
        ? "clusters"
        : start?.server
          ? "servers"
          : "all",
    servers: start?.server
      ? new Map([[start.server.id, start.server.name]])
      : new Map(),
    databases: new Set(start?.database ? [start.database] : []),
    clusters: new Set(start?.cluster ? [start.cluster] : []),
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
    unit: d.unit.trim(),
    project: d.project.trim(),
    container: d.container.trim(),
    for_minutes: 0,
  })
}

const unitRe = /^[A-Za-z0-9:_.@\\-]+$/
// A project or container name, * and ? as wildcards (the backend's rule).
const patternRe = /^[A-Za-z0-9*?][A-Za-z0-9_.*?-]*$/

// Problems the backend would also refuse, keyed like its field errors.
function check(d: Draft): Record<string, string> {
  const e: Record<string, string> = {}
  if (!isStateMetric(d.metric)) {
    const t = num(d.threshold)
    if (Number.isNaN(t)) e.threshold = "Enter a number"
    else if (t < 0) e.threshold = "Can't be below 0"
    else if (
      (isPercent(d.metric) || d.metric === "container_memory") &&
      t > 100
    )
      e.threshold = "Use a percent from 0 to 100"
    else if (d.metric === "container_cpu" && t > 12800)
      e.threshold = "Up to 12800 (128 cores)"
    else if (countsOnly(d.metric) && (t > 1000 || !Number.isInteger(t)))
      e.threshold = "A whole number up to 1000"
  }
  if (takesContainerFilter(d.metric)) {
    for (const k of ["project", "container"] as const) {
      const v = d[k].trim()
      if (v && !patternRe.test(v))
        e[k] = "Letters, digits, - _ . and the wildcards * ?"
    }
  }
  const f = num(d.forMinutes)
  if (Number.isNaN(f) || f < 0 || f > 1440 || !Number.isInteger(f))
    e.for_minutes = "Whole minutes, up to 1440 (a day)"
  if (d.metric === "disk" && d.mount.trim() && !d.mount.trim().startsWith("/"))
    e.mount = "A mount point starts with /, like /var"
  if (d.metric === "service" && d.unit.trim() && !unitRe.test(d.unit.trim()))
    e.unit = "A unit name, like nginx or nginx.service"
  if (d.scope === "servers" && d.servers.size === 0)
    e.server_ids = "Pick at least one server"
  if (d.scope === "databases" && d.databases.size === 0)
    e.database_ids = "Pick at least one database"
  if (d.scope === "clusters" && d.clusters.size === 0)
    e.cluster_ids = "Pick at least one cluster"
  if (d.scope === "tags" && d.tags.length === 0)
    e.tags = "Pick at least one tag"
  return e
}

// Counted metrics only fire above a whole number ("more than N").
const countsOnly = (m: string) =>
  m === "container_restarts" ||
  m === "container_vulns_critical" ||
  m === "container_vulns_high"

function bodyOf(d: Draft, channels: string[]): AlertRuleBody {
  return {
    name: (d.named ? d.name : autoName(d)).trim() || autoName(d),
    enabled: d.enabled,
    metric: d.metric,
    op: countsOnly(d.metric) ? "above" : d.op,
    threshold: isStateMetric(d.metric)
      ? 0
      : fromFieldValue(d.metric, num(d.threshold)),
    mount: d.metric === "disk" ? d.mount.trim() : "",
    unit: d.metric === "service" ? d.unit.trim() : "",
    ...(takesContainerFilter(d.metric)
      ? { project: d.project.trim(), container: d.container.trim() }
      : {}),
    for_minutes: num(d.forMinutes),
    severity: d.severity,
    scope: d.scope,
    server_ids: d.scope === "servers" ? [...d.servers.keys()] : [],
    tags: d.scope === "tags" ? d.tags : [],
    database_ids: d.scope === "databases" ? [...d.databases] : [],
    cluster_ids: d.scope === "clusters" ? [...d.clusters] : [],
    repeat_minutes: d.repeat,
    notify_resolved: d.notifyResolved,
    channel_ids: channels,
  }
}
// Every server, chosen ones, or by tag.
function ServerScope({
  d,
  set,
  shown,
  phone,
}: {
  d: Draft
  set: (patch: Partial<Draft>) => void
  shown: Record<string, string>
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  const facets = useFacets()
  return (
    <>
      <Segmented
        label="Servers"
        items={[
          { value: "all" as const, label: "Every server" },
          { value: "servers" as const, label: "Chosen servers" },
          { value: "tags" as const, label: "By tag" },
        ]}
        value={d.scope === "databases" ? "all" : d.scope}
        onChange={(scope) => set({ scope })}
      />
      {d.scope === "all" && (
        <p className="text-caption text-muted-foreground">
          Every server in {workspace?.name ?? "this workspace"}, including ones
          added later.
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
            data-error={shown.server_ids ? "" : undefined}
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
    </>
  )
}
// Which containers a container rule watches: a compose project and/or a
// container (its name or its compose service), both with wildcards.
function ContainerFilter({
  d,
  set,
  shown,
}: {
  d: Draft
  set: (patch: Partial<Draft>) => void
  shown: Record<string, string>
}) {
  const named = !!(d.project.trim() || d.container.trim())
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Project" error={shown.project}>
          {(p) => (
            <Input
              {...p}
              value={d.project}
              onChange={(e) => set({ project: e.target.value })}
              placeholder="Any project"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono placeholder:font-sans placeholder:text-ash"
            />
          )}
        </Field>
        <Field label="Container or service" error={shown.container}>
          {(p) => (
            <Input
              {...p}
              value={d.container}
              onChange={(e) => set({ container: e.target.value })}
              placeholder="Any container"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono placeholder:font-sans placeholder:text-ash"
            />
          )}
        </Field>
      </div>
      <p className="text-caption text-muted-foreground">
        {d.metric === "container_down"
          ? named
            ? "Alerts when one of these isn't running, whatever the reason."
            : "Nothing named: only crashes (an error exit) and restart loops alert, containers stopped on purpose stay quiet."
          : "Empty = every container."}{" "}
        <span className="text-ash">
          * and ? are wildcards: <span className="font-mono">web-*</span>.
        </span>
      </p>
    </div>
  )
}

// Every database / cluster of the workspace, or the ticked ones.
function DatabaseScope({
  kind,
  ws,
  workspaceName,
  all,
  onAll,
  value,
  onChange,
  error,
  phone,
}: {
  kind: "database" | "cluster"
  ws: string
  workspaceName?: string
  all: boolean
  onAll: (all: boolean) => void
  value: Set<string>
  onChange: (v: Set<string>) => void
  error?: string
  phone: boolean
}) {
  const dbs = useQuery({ ...databasesQuery, enabled: kind === "database" })
  const pve = useQuery({ ...pveClustersQuery, enabled: kind === "cluster" })
  const list = kind === "cluster" ? pve : dbs
  const [q, setQ] = useState("")
  const rows: { id: string; name: string; meta: string; paused?: boolean }[] =
    kind === "cluster"
      ? (pve.data?.items ?? [])
          .filter((x) => x.workspace_id === ws)
          .map((x) => ({
            id: x.id,
            name: x.name,
            meta: x.cluster_name || x.url,
          }))
      : (dbs.data?.items ?? [])
          .filter((x) => x.workspace_id === ws)
          .map((x) => ({
            id: x.id,
            name: x.name,
            meta: x.host,
            paused: x.paused,
          }))
  const mine = rows.sort((a, b) => a.name.localeCompare(b.name))
  const noun = kind === "cluster" ? "cluster" : "database"
  const needle = q.trim().toLowerCase()
  const items = needle
    ? mine.filter((x) => `${x.name} ${x.meta}`.toLowerCase().includes(needle))
    : mine
  return (
    <>
      <Segmented
        label={kind === "cluster" ? "Clusters" : "Databases"}
        items={[
          { value: "all" as const, label: `Every ${noun}` },
          { value: "databases" as const, label: `Chosen ${noun}s` },
        ]}
        value={all ? "all" : "databases"}
        onChange={(v) => onAll(v === "all")}
      />
      {all ? (
        <p className="text-caption text-muted-foreground">
          Every {kind === "cluster" ? "Proxmox cluster" : "database"} in{" "}
          {workspaceName ?? "this workspace"}, including ones added later.
          {kind === "cluster" ? "" : " Paused ones are skipped."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div
            className={cn(
              "overflow-hidden rounded-lg border",
              error ? "border-destructive" : "border-border",
            )}
          >
            {mine.length > 6 && (
              <div className="border-b border-border p-2">
                <SearchBox
                  value={q}
                  onChange={setQ}
                  placeholder={`Search ${noun}s`}
                  label={`Search ${noun}s`}
                  className="w-full md:w-full"
                />
              </div>
            )}
            <Checklist
              empty={
                needle ? `No ${noun} matches.` : `There are no ${noun}s yet.`
              }
              items={items.map((x) => ({
                id: x.id,
                label: x.name,
                meta: x.meta,
                status: x.paused ? "Paused" : undefined,
              }))}
              checked={(id) => value.has(id)}
              onToggle={(id, on) => {
                const next = new Set(value)
                if (on) next.add(id)
                else next.delete(id)
                onChange(next)
              }}
              loading={list.isPending}
              tall={!phone}
            />
          </div>
          <p
            data-error={error ? "" : undefined}
            className={cn(
              "text-caption",
              error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {error ??
              `${value.size} ${value.size === 1 ? noun : `${noun}s`} ticked`}
          </p>
        </div>
      )}
    </>
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
        {isPveMetric(metric)
          ? "It covers no Proxmox cluster yet. Add one under Virtual machines, or tick some."
          : isDatabaseMetric(metric)
            ? "It covers no database yet. Add one under Databases, or tick some."
            : "It covers no server yet. Pick servers, or a tag some servers have."}
      </Callout>
    )
  }
  const met = items.filter((i) => i.met).length
  const noun = isPveMetric(metric)
    ? "cluster"
    : isDatabaseMetric(metric)
      ? "database"
      : "server"
  if (metric === "service" || isContainerMetric(metric)) {
    return (
      <p className="text-body-sm text-muted-foreground">
        It covers {items.length} {items.length === 1 ? "server" : "servers"}.
        <span className="text-caption text-ash">
          {" "}
          ·{" "}
          {metric === "service"
            ? "services are read with the next sample (every minute)"
            : "containers are read with the next sample (every minute); servers without Docker or Podman are skipped"}
        </span>
      </p>
    )
  }
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
            {items.length === 1 ? `${noun} meets` : `${noun}s meet`} it now
          </span>
        )}
        <span className="text-caption text-ash">
          {" "}
          ·{" "}
          {noun === "server"
            ? "from each server's last sample"
            : noun === "cluster"
              ? "from each cluster's last read"
              : "from each database's last check"}
        </span>
      </p>
      <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {items.slice(0, 50).map((i) => (
          <PreviewRow key={i.target_id} item={i} metric={metric} />
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
  const state = isStateMetric(metric)
  const value = state
    ? item.value === undefined
      ? item.detail || "Not checked yet"
      : item.met
        ? item.detail || "Yes"
        : "Fine"
    : item.value === undefined
      ? item.detail || "No sample yet"
      : `${formatValue(metric, item.value)}${item.detail ? ` · ${item.detail}` : ""}`
  const Icon =
    item.value === undefined
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
      <span className="min-w-0 flex-1 truncate">{item.target_name}</span>
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
