"use client"

import {
  ChevronLeft,
  CircleSlash,
  Ellipsis,
  FlaskConical,
  Link2,
  Pencil,
  Play,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import type { ReactNode } from "react"

import { useCronjobs } from "@/app/(panel)/cronjobs/api"
import { useScripts } from "@/app/(panel)/scripts/api"
import {
  Empty,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { useServers } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { eventLabel, useEventCatalog } from "@/components/events/catalog"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { Automation, AutomationAction } from "@/lib/services"
import { cn } from "@/lib/utils"
import { runActive, useAutomation } from "../api"
import { useAutomationActions } from "./automation-actions"
import { useAutomationMenu } from "./automation-menu"
import { type Names, stepSummary, triggerSentence } from "./describe"
import { RecentStrip } from "./flow"
import {
  AutomationIcon,
  editHref,
  failing,
  LIST,
  pageParsers,
  StatusBadge,
  StepIcon,
  type StepKind,
  stepMeta,
  triggerMeta,
} from "./meta"
import { useAutomationCan } from "./permissions"
import { RunLayer, useRunParam } from "./run-layer"
import { RunsList, StatusFilter } from "./runs-list"

export function AutomationFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <AutomationPage id={id} />
}

export function AutomationPage({ id }: { id: string }) {
  const phone = useIsPhone()
  const query = useAutomation(id)
  if (phone === null) return null
  if (query.isPending) return <Loading phone={phone} />
  if (!query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={AutomationIcon}
          title={
            gone ? "This automation isn't here" : "Couldn't load the automation"
          }
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href={LIST} />}
              nativeButton={false}
            >
              Back to automations
            </Button>
          }
        />
      </div>
    )
  }
  return <Page a={query.data} phone={phone} />
}

// Names for the ids its steps hold, from lists the person can read anyway.
export function useNames(ws: string): Names {
  const scripts = useScripts(ws)
  const cronjobs = useCronjobs(ws)
  const servers = useServers({ limit: 200, sort: "name" })
  return {
    scripts: new Map((scripts.data ?? []).map((s) => [s.id, s.name])),
    cronjobs: new Map((cronjobs.data ?? []).map((s) => [s.id, s.name])),
    servers: new Map((servers.data?.items ?? []).map((s) => [s.id, s.name])),
  }
}

function Page({ a, phone }: { a: Automation; phone: boolean }) {
  const router = useRouter()
  const can = useAutomationCan(a.workspace_id)
  const act = useAutomationActions()
  const back = useBack(LIST)
  const { run, open, close } = useRunParam()
  const [{ status, page }, setQuery] = useQueryStates(pageParsers)
  const [sheet, setSheet] = useOpen("automation-page-menu")
  const menu = useAutomationMenu(a, {
    onPage: true,
    after: () => router.replace(LIST),
  })
  const names = useNames(a.workspace_id)
  const catalog = useEventCatalog()

  usePageCrumbs([{ href: `${LIST}/${a.id}`, label: a.name }])

  const busy = a.recent.some((r) => runActive(r.status))
  const blocked = !!a.problem || busy || act.running
  const state = failing(a) ? "Needs a look" : a.enabled ? "On" : "Off"

  const buttons = (
    <>
      {can.edit && (
        <Button
          variant="outline"
          className={phone ? "h-11 flex-1" : "h-9"}
          onClick={() => act.test(a)}
        >
          <FlaskConical />
          Test
        </Button>
      )}
      {can.run && (
        <Button
          className={phone ? "h-11 flex-1" : "h-9"}
          disabled={blocked}
          onClick={() => act.run(a)}
        >
          <Play />
          {busy ? "Running…" : "Run now"}
        </Button>
      )}
    </>
  )

  const problem = a.problem && (
    <div
      className={cn(
        "flex items-start gap-3 bg-destructive/5 px-4 py-3 text-body-sm",
        !phone && "rounded-2xl",
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-destructive">It can't run</p>
        <p className="mt-0.5 break-words text-muted-foreground">{a.problem}</p>
      </div>
      {can.edit && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-md:h-11"
          render={<Link href={editHref(a.id)} />}
          nativeButton={false}
        >
          Fix
        </Button>
      )}
    </div>
  )

  const runs = (
    <section
      className={cn(
        "flex flex-col",
        phone ? "border-t border-border" : "rounded-2xl border border-border",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 px-4 py-3",
          !phone && "px-5",
        )}
      >
        <h2 className="text-body font-medium">Runs</h2>
        <div
          className={cn(
            "[scrollbar-width:none] overflow-x-auto",
            phone ? "-mx-4 w-[calc(100%+2rem)] px-4" : "ms-auto",
          )}
        >
          <StatusFilter
            value={status}
            onChange={(s) => setQuery({ status: s, page: null })}
          />
        </div>
      </div>
      <div className="border-t border-border">
        <RunsList
          ws={a.workspace_id}
          automation={a.id}
          status={status}
          page={page}
          setPage={(p) => setQuery({ page: p === 1 ? null : p })}
          onOpen={open}
          phone={phone}
          empty={
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-body-sm text-muted-foreground">
              <CircleSlash className="size-5 text-ash" />
              {a.trigger.kind === "event"
                ? "No runs yet. It runs the next time a matching event happens, or press Run now."
                : a.trigger.kind === "webhook"
                  ? "No runs yet. Call its incoming URL, or press Run now."
                  : "No runs yet. Press Run now."}
            </div>
          }
        />
      </div>
    </section>
  )

  const layer = <RunLayer runId={run} onClose={close} phone={phone} />

  if (phone) {
    return (
      <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {a.name}
          </h1>
          <HelpButton
            href={guideHref("automations")}
            label="Automations guide"
          />
          {menu.some((g) => g.length > 0) && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="More"
              onClick={() => setSheet(true)}
            >
              <Ellipsis className="size-5" />
            </Button>
          )}
        </header>
        <div className="flex flex-col gap-1 px-4 pt-4 pb-3">
          <p className="flex items-center gap-2 text-body-sm">
            <StateDot a={a} />
            <span className="font-medium">{state}</span>
            <span className="text-muted-foreground">
              · {a.run_as_name ? `Runs as ${a.run_as_name}` : "Runs as nobody"}
            </span>
          </p>
          {a.description && (
            <p className="text-body-sm text-muted-foreground">
              {a.description}
            </p>
          )}
        </div>
        {problem}
        {(can.run || can.edit) && (
          <div className="flex gap-2 px-4 py-3">{buttons}</div>
        )}
        <Pipeline a={a} names={names} phone />
        <HookCard a={a} phone />
        <Facts a={a} phone />
        {runs}
        <BottomSheet open={sheet} onOpenChange={setSheet} title={a.name}>
          <SheetItems groups={menu} onOpenChange={setSheet} />
        </BottomSheet>
        {layer}
      </div>
    )
  }

  const TriggerIcon = triggerMeta[a.trigger.kind].icon
  return (
    <div className="flex flex-col gap-5 px-6 pt-5 pb-12">
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex items-start gap-4 p-6 pb-5">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl",
              failing(a)
                ? "bg-destructive/10 text-destructive"
                : a.enabled
                  ? "bg-brand-soft text-brand-strong"
                  : "bg-muted text-ash",
            )}
          >
            <AutomationIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-subheading font-medium">{a.name}</h1>
              <span
                className={cn(
                  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption font-medium",
                  failing(a)
                    ? "bg-destructive/10 text-destructive"
                    : a.enabled
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground",
                )}
              >
                <StateDot a={a} />
                {state}
              </span>
            </div>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-body-sm text-muted-foreground">
              <TriggerIcon className="size-4 shrink-0 text-ash" />
              <span className="truncate">
                {triggerSentence(a.trigger, catalog.data, names)}
              </span>
            </p>
            {a.description && (
              <p className="mt-1 line-clamp-2 text-caption text-ash">
                {a.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {buttons}
            {can.edit && (
              <Button
                variant="outline"
                className="h-9"
                render={<Link href={editHref(a.id)} />}
                nativeButton={false}
              >
                <Pencil />
                Edit
              </Button>
            )}
            <ItemMenu
              groups={menu
                .slice(1)
                .map((g) => g.filter((i) => i.key !== "edit"))}
              label="Automation actions"
            />
          </div>
        </div>
        <div className="border-t border-border bg-subtle px-6 py-5">
          <Pipeline a={a} names={names} phone={false} />
        </div>
        <Facts a={a} phone={false} />
      </section>
      {problem}
      <HookCard a={a} phone={false} />
      {runs}
      {layer}
    </div>
  )
}

function StateDot({ a }: { a: Automation }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full",
        failing(a) ? "bg-destructive" : a.enabled ? "bg-success" : "bg-mist",
      )}
    />
  )
}

// The trigger and its steps as connected cards, each with what it does.
function Pipeline({
  a,
  names,
  phone,
}: {
  a: Automation
  names: Names
  phone: boolean
}) {
  const catalog = useEventCatalog()
  const t = a.trigger
  const TriggerIcon = triggerMeta[t.kind].icon
  const trigger = (
    <Node
      icon={<TriggerIcon className="size-5" />}
      accent
      eyebrow="Starts"
      title={
        t.kind === "event"
          ? (t.events ?? []).map((e) => eventLabel(catalog.data, e)).join(", ")
          : triggerMeta[t.kind].label
      }
      text={
        t.kind === "event"
          ? triggerSentence(t, catalog.data, names).replace(
              /^When [^(]*/,
              "",
            ) || "Any of these, anywhere in the workspace"
          : triggerMeta[t.kind].hint
      }
      phone={phone}
    />
  )
  const steps = a.actions.map((s, i) => (
    <Node
      key={s.id || i}
      icon={<StepIcon kind={s.kind} className="size-5" />}
      eyebrow={`Step ${i + 1}${s.continue_on_error ? " · goes on if it fails" : ""}`}
      title={s.label || stepMeta[s.kind as StepKind]?.label}
      text={stepSummary(s as AutomationAction, names)}
      phone={phone}
    />
  ))
  if (phone) {
    return (
      <section className="border-t border-border p-4">
        <h2 className="mb-3 text-body font-medium">What it does</h2>
        <ol className="flex flex-col">
          {[trigger, ...steps].map((n, i, all) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: in order
              key={i}
              className="relative pb-3 last:pb-0"
            >
              {i < all.length - 1 && (
                <span
                  aria-hidden
                  className="absolute start-5 top-10 bottom-0 w-px bg-border"
                />
              )}
              {n}
            </li>
          ))}
        </ol>
      </section>
    )
  }
  return (
    <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3">
      {[trigger, ...steps].map((n, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: in order
          key={i}
          className="relative min-w-0"
        >
          {n}
        </li>
      ))}
    </ol>
  )
}

function Node({
  icon,
  eyebrow,
  title,
  text,
  accent,
  phone,
}: {
  icon: ReactNode
  eyebrow: string
  title: string
  text: string
  accent?: boolean
  phone: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-3",
        !phone && "h-full rounded-2xl border border-border bg-card p-4",
      )}
    >
      <span
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center rounded-xl",
          accent
            ? "bg-brand text-primary-foreground"
            : "border border-border bg-card text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-label text-[11px] tracking-label text-ash uppercase">
          {eyebrow}
        </p>
        <p className="truncate text-body-sm font-medium" title={title}>
          {title}
        </p>
        <p className="line-clamp-2 text-caption break-words text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  )
}

function Facts({ a, phone }: { a: Automation; phone: boolean }) {
  const last = a.recent.find((r) => r.status !== "skipped")
  const rows: [string, ReactNode][] = [
    [
      "Last run",
      last ? (
        <span key="last" className="inline-flex items-center gap-1.5">
          <StatusBadge status={last.status} className="text-body-sm" />
          <span className="font-normal text-ash">
            {timeAgo(last.created_at)}
          </span>
        </span>
      ) : (
        "Never"
      ),
    ],
    [
      "Last 10",
      a.recent.length ? (
        <RecentStrip key="strip" automationId={a.id} recent={a.recent} />
      ) : (
        <span key="none" className="text-ash">
          No runs yet
        </span>
      ),
    ],
    [
      "Runs as",
      a.run_as_name || (
        <span key="nobody" className="text-destructive">
          Nobody: save it again
        </span>
      ),
    ],
    [
      "Cooldown",
      a.cooldown_seconds
        ? `${a.cooldown_seconds >= 120 ? `${Math.round(a.cooldown_seconds / 60)} min` : `${a.cooldown_seconds} s`} per subject`
        : "None",
    ],
    [
      "At most",
      a.max_runs_per_hour ? `${a.max_runs_per_hour} runs an hour` : "No limit",
    ],
  ]
  if (phone) {
    return (
      <section className="border-t border-border p-4">
        <dl className="flex flex-col gap-3 text-body-sm">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex min-h-6 items-center justify-between gap-4"
            >
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 text-end font-medium break-words">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    )
  }
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] divide-x divide-border border-t border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 px-6 py-4">
          <dt className="text-caption text-ash">{label}</dt>
          <dd className="mt-1 flex min-h-6 items-center truncate text-body-sm font-medium">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// The incoming URL of an automation started by one: set or not; the URL
// itself is only shown when made.
function HookCard({ a, phone }: { a: Automation; phone: boolean }) {
  const can = useAutomationCan(a.workspace_id)
  const act = useAutomationActions()
  if (a.trigger.kind !== "webhook") return null
  return (
    <section
      className={cn(
        "flex items-start gap-3",
        phone
          ? "border-t border-border p-4"
          : "rounded-2xl border border-border p-5",
        !a.has_hook && !phone && "border-dashed",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          a.has_hook ? "bg-brand-soft text-brand-strong" : "bg-muted text-ash",
        )}
      >
        <Link2 className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium">
          {a.has_hook ? "Incoming URL is set" : "No incoming URL yet"}
        </p>
        <p className="text-caption text-muted-foreground">
          {a.has_hook
            ? "It was shown once when it was made. Lost it? Make a new one: the old one stops at once."
            : "It starts when its secret URL is called. Make the URL and give it to your CI or tool."}
        </p>
        {can.edit && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant={a.has_hook ? "outline" : "default"}
              size="sm"
              className="max-md:h-11"
              onClick={() => act.makeHook(a)}
            >
              <Link2 />
              {a.has_hook ? "Make a new URL" : "Make the URL"}
            </Button>
            {a.has_hook && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive max-md:h-11"
                onClick={() => act.removeHook(a)}
              >
                Remove it
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone ? "p-4" : "px-6 pt-5")}>
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}
