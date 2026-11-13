"use client"

import { BellPlus, BellRing, Check, Plus } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { useServerAlertRules } from "@/app/(panel)/alerts/api"
import { AlertEventList } from "@/app/(panel)/alerts/components/events-list"
import { MutesNotice } from "@/app/(panel)/alerts/components/mutes"
import {
  RuleActionsProvider,
  useRuleActions,
} from "@/app/(panel)/alerts/components/rule-actions"
import {
  FiringNotice,
  RulesList,
} from "@/app/(panel)/alerts/components/rules-list"
import {
  alertsHref,
  containerPresets,
  isContainerMetric,
  metrics,
  type Preset,
  ruleCoversProject,
  ruleSentence,
} from "@/app/(panel)/alerts/components/rules-meta"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { AlertRule } from "@/lib/services"
import { cn } from "@/lib/utils"
import { EnvPage } from "./env-page"
import { PageBar } from "./kit"

// Alert rules that watch containers: the Containers sidebar's Alerts page
// (one environment) and a project page's Alerts tab (one project). The rules
// themselves live with every other alert rule (/alerts); this is a filtered
// view with ready-made container rules one click away.

type Where = { server: { id: string; name: string }; project?: string }

function watches(r: AlertRule, project?: string) {
  if (!isContainerMetric(r.metric)) return false
  return project ? ruleCoversProject(r, project) : true
}

export function useContainerRules({ server, project }: Where) {
  const rules = useServerAlertRules(server.id)
  const list = (rules.data ?? []).filter((r) => watches(r, project))
  return { rules, list }
}

// /containers/alerts
export function ContainerAlertsPage() {
  return (
    <EnvPage title="Alerts" anyState bleed>
      {({ env, phone }) => (
        <RuleActionsProvider phone={phone}>
          <AlertsBody
            where={{ server: { id: env.server_id, name: env.name } }}
            phone={phone}
            bar
          />
        </RuleActionsProvider>
      )}
    </EnvPage>
  )
}

// A project page's Alerts tab.
export function ProjectAlerts({
  server,
  project,
  phone,
}: {
  server: { id: string; name: string }
  project: string
  phone: boolean
}) {
  return (
    <RuleActionsProvider phone={phone}>
      <AlertsBody where={{ server, project }} phone={phone} />
    </RuleActionsProvider>
  )
}

function AlertsBody({
  where,
  phone,
  bar = false,
}: {
  where: Where
  phone: boolean
  bar?: boolean
}) {
  const a = useRuleActions()
  const { rules, list } = useContainerRules(where)
  const { server, project } = where
  const ids = new Set(list.map((r) => r.id))
  const create = () =>
    a.create({ metric: "container_down", server, project: project ?? "" })
  const firing = list.filter((r) =>
    r.states.some((s) => s.state === "firing"),
  ).length

  const caption = rules.isPending
    ? "Loading…"
    : list.length === 0
      ? "No rule watches these containers yet"
      : `${list.length} ${list.length === 1 ? "rule" : "rules"}${firing ? ` · ${firing} firing` : ""}`

  return (
    <div className="flex flex-col gap-6 max-md:gap-5 max-md:pb-24">
      {bar ? (
        <PageBar
          phone={phone}
          caption={
            <span className="text-caption text-muted-foreground">
              {caption}
            </span>
          }
          refresh={{ busy: rules.isFetching, run: () => rules.refetch() }}
          primary={
            a.can
              ? { label: "New rule", icon: <Plus />, run: create }
              : undefined
          }
          aside={
            phone ? undefined : (
              <Button
                variant="ghost"
                render={<Link href={alertsHref("/alerts", {})} />}
                nativeButton={false}
              >
                All alert rules
              </Button>
            )
          }
        />
      ) : (
        <div className={cn("flex items-center gap-3", phone && "px-4 pt-4")}>
          <p className="min-w-0 flex-1 text-caption text-muted-foreground">
            {caption}
          </p>
          {a.can && (
            <Button
              className="max-md:h-11"
              onClick={create}
              aria-label="New rule"
            >
              <Plus />
              New rule
            </Button>
          )}
        </div>
      )}

      {(list.length > 0 || a.canMute) && (
        <div className={cn("flex flex-col gap-3", phone && "px-4")}>
          {list.length > 0 && (
            <FiringNotice rules={list} targetId={server.id} />
          )}
          <MutesNotice serverId={server.id} canEnd={a.canMute} />
        </div>
      )}

      {rules.isPending ? (
        <div className={cn("flex flex-col gap-2", phone && "px-4")}>
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      ) : (
        list.length > 0 && (
          <Section title="Rules" phone={phone}>
            <RulesList rules={list} phone={phone} targetId={server.id} />
          </Section>
        )
      )}

      {a.can && !rules.isPending && (
        <Section
          title={list.length ? "Add another" : "Start with these"}
          caption={
            project
              ? `Ready-made rules for ${project} on ${server.name}. Each opens filled in, so you can change it before saving.`
              : `Ready-made rules for every container on ${server.name}. Name a project or a container in the form to narrow one down.`
          }
          phone={phone}
        >
          <Presets where={where} rules={list} phone={phone} />
        </Section>
      )}

      {!a.can && !rules.isPending && list.length === 0 && (
        <p
          className={cn("text-body-sm text-muted-foreground", phone && "px-4")}
        >
          Ask someone with Engineer access to this workspace to add alert rules
          for these containers.
        </p>
      )}

      <Section title="Recent alerts" phone={phone}>
        <AlertEventList
          serverId={server.id}
          limit={100}
          phone={phone}
          filter={(e) =>
            project
              ? !!e.rule_id && ids.has(e.rule_id)
              : isContainerMetric(e.metric)
          }
          emptyText={
            project
              ? "No container rule has fired for this project yet."
              : "No container rule has fired on this server yet."
          }
        />
      </Section>
    </div>
  )
}

function Section({
  title,
  caption,
  phone,
  children,
}: {
  title: string
  caption?: string
  phone: boolean
  children: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className={cn(phone && "px-4")}>
        <h3 className="text-body-sm font-medium">{title}</h3>
        {caption && (
          <p className="text-caption text-muted-foreground">{caption}</p>
        )}
      </div>
      {children}
    </section>
  )
}

// Has a rule like this preset already? Same metric, and (on a project) it
// names this project or none.
function hasLike(rules: AlertRule[], p: Preset) {
  return rules.some((r) => r.metric === p.metric && r.enabled)
}

function Presets({
  where,
  rules,
  phone,
}: {
  where: Where
  rules: AlertRule[]
  phone: boolean
}) {
  const a = useRuleActions()
  const { server, project } = where
  const add = (p: Preset) =>
    a.create({
      preset: {
        ...p,
        name:
          project && p.metric !== "docker_engine"
            ? `${project}: ${p.name}`
            : p.name,
      },
      server,
      project: p.metric === "docker_engine" ? "" : (project ?? ""),
    })
  const items = containerPresets.map((p) => ({
    p,
    on: hasLike(rules, p),
    Icon: metrics[p.metric].icon,
    sentence: ruleSentence({
      metric: p.metric,
      op: p.op,
      threshold: p.threshold,
      mount: "",
      for_minutes: p.forMinutes,
      project: p.metric === "docker_engine" ? "" : project,
    }),
  }))

  if (phone) {
    return (
      <ul className="divide-y divide-border border-y border-border">
        {items.map(({ p, on, Icon, sentence }) => (
          <li key={p.key}>
            <button
              type="button"
              onClick={() => add(p)}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start active:bg-muted"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-medium">
                  {p.name}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {sentence}
                </span>
              </span>
              {on ? (
                <span className="flex shrink-0 items-center gap-1 text-caption text-success">
                  <Check className="size-3.5" />
                  On
                </span>
              ) : (
                <BellPlus className="size-5 shrink-0 text-brand" />
              )}
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3">
      {items.map(({ p, on, Icon, sentence }) => (
        <div
          key={p.key}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                p.severity === "critical"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-warning/10 text-warning",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-medium">{p.name}</p>
              <p className="text-caption text-muted-foreground">{sentence}</p>
            </div>
          </div>
          <div className="mt-auto flex items-center gap-2">
            <span className="text-caption text-ash">
              {p.severity === "critical" ? "Critical" : "Warning"}
            </span>
            {on && (
              <span className="flex items-center gap-1 text-caption text-success">
                <Check className="size-3.5" />
                Already watched
              </span>
            )}
            <Button
              variant={on ? "ghost" : "outline"}
              size="sm"
              className="ms-auto"
              onClick={() => add(p)}
            >
              {on ? <Plus /> : <BellRing />}
              {on ? "Another" : "Add"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// The Security page's "Alert me": a rule on critical vulnerabilities in the
// running containers' images, or a link to the rules once one exists.
export function VulnAlertButton({
  server,
  phone,
}: {
  server: { id: string; name: string }
  phone: boolean
}) {
  return (
    <RuleActionsProvider phone={phone}>
      <VulnAlert server={server} phone={phone} />
    </RuleActionsProvider>
  )
}

function VulnAlert({
  server,
  phone,
}: {
  server: { id: string; name: string }
  phone: boolean
}) {
  const a = useRuleActions()
  const { rules, list } = useContainerRules({ server })
  if (rules.isPending) return null
  const on = list.some(
    (r) =>
      r.enabled &&
      (r.metric === "container_vulns_critical" ||
        r.metric === "container_vulns_high"),
  )
  if (on)
    return (
      <Button
        variant="ghost"
        className={cn(phone && "h-11")}
        render={<Link href="/containers/alerts" />}
        nativeButton={false}
      >
        <BellRing />
        Alerts on
      </Button>
    )
  if (!a.can) return null
  const preset = containerPresets.find(
    (p) => p.metric === "container_vulns_critical",
  )
  return (
    <Button
      variant="outline"
      className={cn(phone && "h-11")}
      onClick={() => a.create({ preset, server, project: "" })}
    >
      <BellPlus />
      Alert me
    </Button>
  )
}
