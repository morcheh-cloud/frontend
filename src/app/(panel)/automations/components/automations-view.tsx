"use client"

import {
  ArrowRight,
  CloudOff,
  Ellipsis,
  Play,
  Plus,
  RefreshCw,
  SearchX,
  TriangleAlert,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import { type ReactNode, useDeferredValue, useRef, useState } from "react"

import {
  Empty,
  Facts,
  ItemMenu,
  SearchBox,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { useEventCatalog } from "@/components/events/catalog"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { automationsItem } from "@/components/panel/nav"
import { SectionLinks } from "@/components/panel/section-links"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { Automation } from "@/lib/services"
import { cn } from "@/lib/utils"
import { runActive, useAutomations } from "../api"
import { useAutomationActions } from "./automation-actions"
import { useAutomationMenu } from "./automation-menu"
import { FlowStrip, RecentStrip, stepsText, TriggerChip } from "./flow"
import {
  AutomationIcon,
  automationHref,
  failing,
  type ListShow,
  listParsers,
  NEW,
  newAutomationHref,
  StatusBadge,
  StepIcon,
  triggerText,
} from "./meta"
import { useAutomationCan } from "./permissions"
import { type Template, templates } from "./templates"

const matches = (a: Automation, show: ListShow) =>
  show === "all" ||
  (show === "on" && a.enabled) ||
  (show === "off" && !a.enabled) ||
  (show === "failing" && failing(a))

// Failing first, then on, then by name.
const sorted = (items: Automation[]) =>
  [...items].sort(
    (a, b) =>
      Number(failing(b)) - Number(failing(a)) ||
      Number(b.enabled) - Number(a.enabled) ||
      a.name.localeCompare(b.name),
  )

export function AutomationsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <View phone={phone} />
}

function View({ phone }: { phone: boolean }) {
  const can = useAutomationCan()
  const router = useRouter()
  const { workspace } = useWorkspace()
  const catalog = useEventCatalog()
  const list = useAutomations(workspace?.id)
  const [{ q, show }, setFilters] = useQueryStates(listParsers)
  const needle = useDeferredValue(q.trim().toLowerCase())
  const all = sorted(list.data ?? [])
  const searched = all.filter(
    (a) =>
      !needle ||
      [
        a.name,
        a.description,
        triggerText(a.trigger, catalog.data),
        stepsText(a.actions),
        ...(a.trigger.events ?? []),
      ].some((t) => t.toLowerCase().includes(needle)),
  )
  const items = searched.filter((a) => matches(a, show))
  const create = () => router.push(NEW)

  const header = phone && (
    <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
      <h1 className="text-heading font-light">Automations</h1>
      <HelpButton
        href={guideHref("automations")}
        label="Automations guide"
        className="ms-auto"
      />
      {can.edit && (
        <Button
          size="icon-lg"
          aria-label="New automation"
          className="rounded-full"
          onClick={create}
        >
          <Plus className="size-5" />
        </Button>
      )}
    </header>
  )

  let body: ReactNode
  if (list.isPending) body = <Placeholder phone={phone} />
  else if (list.isError && !list.data) {
    body = (
      <Empty
        icon={CloudOff}
        title="Couldn't load the automations"
        body={list.error.message}
        action={
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => list.refetch()}
          >
            Try again
          </Button>
        }
      />
    )
  } else if (all.length === 0) {
    body = <Gallery phone={phone} canEdit={can.edit} />
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={SearchX}
        title="No automation matches"
        body="Search looks at names, descriptions, events and steps."
        action={
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => setFilters({ q: null, show: null })}
          >
            Clear filters
          </Button>
        }
      />
    )
  } else if (phone) {
    body = <Rows items={items} />
  } else {
    body = (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,27rem),1fr))] gap-4">
        {items.map((a) => (
          <AutomationCard key={a.id} a={a} />
        ))}
      </div>
    )
  }

  const count = (s: ListShow) => searched.filter((a) => matches(a, s)).length
  const bad = count("failing")
  const shows: { value: ListShow; label: string }[] = [
    { value: "all", label: `All ${searched.length}` },
    { value: "on", label: `On ${count("on")}` },
    { value: "off", label: `Off ${count("off")}` },
    ...(bad > 0 || show === "failing"
      ? [{ value: "failing" as const, label: `Failing ${bad}` }]
      : []),
  ]
  const search = (
    <SearchBox
      value={q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder="Search automations"
      label="Search automations"
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )
  const filter = (
    <Segmented
      label="Show"
      items={shows}
      value={show}
      onChange={(s) => setFilters({ show: s === "all" ? null : s })}
    />
  )
  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="size-11 shrink-0 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={list.isFetching}
      onClick={() => list.refetch()}
    >
      <RefreshCw className={cn(list.isFetching && "animate-spin")} />
    </Button>
  )

  return (
    <>
      {header}
      {phone && <SectionLinks item={automationsItem} className="mt-3" />}
      <div
        className={cn(
          "flex flex-col pb-24",
          phone ? "pt-4" : "gap-4 px-6 pt-5",
        )}
      >
        {can.demo && (
          <p className="bg-subtle px-4 py-3 text-body-sm text-muted-foreground md:rounded-2xl">
            The public demo shows automations but doesn't run or change them.
          </p>
        )}
        {all.length > 0 &&
          (phone ? (
            <div className="flex flex-col gap-3 px-4 pb-3">
              <div className="flex gap-2">
                {search}
                {refresh}
              </div>
              <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
                {filter}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {search}
              {filter}
              <div className="ms-auto flex items-center gap-2">
                {refresh}
                {can.edit && (
                  <Button onClick={create}>
                    <Plus />
                    New automation
                  </Button>
                )}
              </div>
            </div>
          ))}
        {body}
      </div>
    </>
  )
}

// ---- Desktop ----

function AutomationCard({ a }: { a: Automation }) {
  const can = useAutomationCan(a.workspace_id)
  const act = useAutomationActions()
  const menu = useAutomationMenu(a)
  const busy = a.recent.some((r) => runActive(r.status))
  const last = a.recent.find((r) => r.status !== "skipped")
  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
        !a.enabled && "bg-subtle",
      )}
    >
      <div className="flex items-start gap-3 p-5 pb-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            failing(a)
              ? "bg-destructive/10 text-destructive"
              : a.enabled
                ? "bg-brand-soft text-brand-strong"
                : "bg-muted text-ash",
          )}
        >
          <AutomationIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={automationHref(a.id)}
            className="block truncate text-body font-medium outline-none after:absolute after:inset-0 after:rounded-2xl hover:text-brand focus-visible:text-brand"
          >
            {a.name}
          </Link>
          <p className="truncate text-caption text-muted-foreground">
            {a.description || stepsText(a.actions)}
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <Switch
            checked={a.enabled}
            disabled={!can.edit}
            aria-label={a.enabled ? `Turn off ${a.name}` : `Turn on ${a.name}`}
            onCheckedChange={(on) => act.setEnabled(a, on)}
          />
          <ItemMenu groups={menu} label={`${a.name} actions`} />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3 px-5 pb-4">
        <TriggerChip trigger={a.trigger} className="self-start" />
        <FlowStrip trigger={a.trigger} actions={a.actions} />
      </div>

      {a.problem && (
        <p className="mx-5 mb-4 flex gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-caption text-destructive">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-2 min-w-0">{a.problem}</span>
        </p>
      )}

      <div className="mt-auto flex items-center gap-4 border-t border-border px-5 py-3">
        <div className="relative z-10">
          <RecentStrip automationId={a.id} recent={a.recent} />
        </div>
        <div className="min-w-0 flex-1 text-caption">
          {last ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <StatusBadge
                status={busy ? "running" : last.status}
                className="text-caption [&_svg]:size-3.5"
              />
              <span className="truncate text-ash">
                {timeAgo(last.created_at)}
              </span>
            </span>
          ) : (
            <span className="text-ash">Never ran</span>
          )}
          <span className="flex min-w-0 items-center gap-1 text-ash">
            <UserRound className="size-3 shrink-0" />
            <span className="truncate">
              {a.run_as_name ? `Runs as ${a.run_as_name}` : "Runs as nobody"}
            </span>
          </span>
        </div>
        {can.run && (
          <Button
            variant="outline"
            size="sm"
            className="relative z-10 shrink-0"
            disabled={busy || !!a.problem || act.running}
            onClick={() => act.run(a)}
          >
            <Play />
            {busy ? "Running" : "Run"}
          </Button>
        )}
      </div>
    </article>
  )
}

// ---- Phone ----

function Rows({ items }: { items: Automation[] }) {
  const [open, setOpen] = useOpen("automation-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<Automation | null>(null)
  const current = items.find((a) => a.id === id) ?? last.current
  if (current) last.current = current
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((a) => (
          <li key={a.id} className="flex items-center">
            <Link
              href={automationHref(a.id)}
              className="flex min-h-[4.75rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  failing(a)
                    ? "bg-destructive/10 text-destructive"
                    : a.enabled
                      ? "bg-brand-soft text-brand-strong"
                      : "bg-muted text-ash",
                )}
              >
                <AutomationIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-body font-medium">
                    {a.name}
                  </span>
                  {a.problem && (
                    <TriangleAlert className="size-4 shrink-0 text-warning" />
                  )}
                </span>
                <PhoneTrigger a={a} />
                <span className="mt-1 flex items-center gap-2">
                  <RecentStrip
                    automationId={a.id}
                    recent={a.recent}
                    className="pointer-events-none h-4 [&>*]:max-h-4"
                  />
                  <span className="truncate text-caption text-ash">
                    {!a.enabled
                      ? "Off"
                      : a.last_run_at
                        ? timeAgo(a.last_run_at)
                        : "Never ran"}
                  </span>
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label={`${a.name} actions`}
              className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
              onClick={() => {
                setId(a.id)
                setOpen(true)
              }}
            >
              <Ellipsis className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <AutomationSheet a={current} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

function PhoneTrigger({ a }: { a: Automation }) {
  const catalog = useEventCatalog()
  return (
    <span className="block truncate text-body-sm text-muted-foreground">
      {triggerText(a.trigger, catalog.data)} · {stepsText(a.actions)}
    </span>
  )
}

function AutomationSheet({
  a,
  open,
  onOpenChange,
}: {
  a: Automation
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useAutomationMenu(a)
  const catalog = useEventCatalog()
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={a.name}>
      {a.problem && (
        <p className="mx-2 mb-3 flex gap-2 rounded-2xl bg-subtle p-4 text-body-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          {a.problem}
        </p>
      )}
      <Facts
        items={[
          {
            label: "Starts",
            value: triggerText(a.trigger, catalog.data),
            wide: true,
          },
          { label: "Does", value: stepsText(a.actions), wide: true },
          { label: "State", value: a.enabled ? "On" : "Off" },
          { label: "Runs as", value: a.run_as_name || "Nobody" },
        ]}
      />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

// ---- No automations yet: the templates ----

function Gallery({ phone, canEdit }: { phone: boolean; canEdit: boolean }) {
  return (
    <section
      className={cn(
        "flex flex-col gap-6",
        phone ? "px-4" : "rounded-3xl border border-border p-8",
      )}
    >
      <div className="flex flex-col items-start gap-3 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
            <AutomationIcon className="size-6" />
          </span>
          <h2 className="mt-4 text-subheading font-medium">
            Let Morche react for you
          </h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            When an alert fires, a server goes offline or a backup fails, an
            automation does what you'd do by hand: restart the service, clean
            up, check again, tell the team. Start from one of these or build
            your own.
          </p>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            className="h-11 shrink-0 max-md:w-full md:h-9"
            render={<Link href={NEW} />}
            nativeButton={false}
          >
            <Plus />
            Start from scratch
          </Button>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-3">
        {templates.map((t) => (
          <TemplateCard key={t.key} t={t} canEdit={canEdit} />
        ))}
      </div>
    </section>
  )
}

export function TemplateCard({
  t,
  canEdit,
  onPick,
  className,
}: {
  t: Template
  canEdit: boolean
  // In the editor: apply in place instead of following a link.
  onPick?: () => void
  className?: string
}) {
  const Icon = t.icon
  const inner = (
    <>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground group-hover:bg-brand-soft group-hover:text-brand-strong">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium">{t.name}</p>
          <p className="mt-0.5 line-clamp-3 text-caption text-muted-foreground">
            {t.description}
          </p>
        </div>
      </div>
      <div className="mt-auto flex min-w-0 items-center gap-1.5 pt-1 text-caption text-ash">
        <span className="truncate">{t.when}</span>
        {t.actions.map((a, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: steps in order
            key={i}
            className="flex shrink-0 items-center gap-1.5"
          >
            <ArrowRight className="size-3" />
            <StepIcon kind={a.kind} className="size-3.5" />
          </span>
        ))}
      </div>
    </>
  )
  const cls = cn(
    "group flex min-h-36 min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-start transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
    className,
  )
  if (!canEdit) return <div className={cls}>{inner}</div>
  if (onPick)
    return (
      <button type="button" className={cls} onClick={onPick}>
        {inner}
      </button>
    )
  return (
    <Link href={newAutomationHref(t.key)} className={cls}>
      {inner}
    </Link>
  )
}

function Placeholder({ phone }: { phone: boolean }) {
  if (phone)
    return (
      <div className="divide-y divide-border border-y border-border">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
            key={i}
            className="flex h-[4.75rem] items-center gap-3 px-4"
          >
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        ))}
      </div>
    )
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,27rem),1fr))] gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </div>
  )
}
