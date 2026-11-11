"use client"

import {
  ArrowRight,
  CalendarClock,
  Ellipsis,
  Play,
  Plus,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { Schedule } from "@/lib/services"
import { cn } from "@/lib/utils"
import { runActive, useCronjobs } from "../api"
import { useCronjobActions } from "./cronjob-actions"
import { useCronjobMenu } from "./cronjob-menu"
import {
  ActionIcon,
  actionMeta,
  cronText,
  EndLabel,
  endName,
  formatInZone,
  jobSummary,
  modeMeta,
  needsAttention,
  RunStateBadge,
  runHref,
  type Show,
  taskFacts,
  useCronjobFilters,
} from "./meta"
import { useCronjobCan } from "./permissions"

export function CronjobsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <View phone={phone} />
}

const matches = (s: Schedule, show: Show) =>
  show === "all" ||
  (show === "active" && s.enabled) ||
  (show === "paused" && !s.enabled) ||
  (show === "attention" && needsAttention(s))

function View({ phone }: { phone: boolean }) {
  const can = useCronjobCan()
  const router = useRouter()
  const { workspace } = useWorkspace()
  const list = useCronjobs(workspace?.id)
  const [{ q, show }] = useCronjobFilters()
  const needle = useDeferredValue(q.trim().toLowerCase())
  const all = list.data ?? []
  const searched = all.filter(
    (s) =>
      !needle ||
      s.name.toLowerCase().includes(needle) ||
      s.description.toLowerCase().includes(needle) ||
      jobSummary(s).toLowerCase().includes(needle) ||
      actionMeta[s.action]?.label.toLowerCase().includes(needle) ||
      s.refs.some((r) => r.name.toLowerCase().includes(needle)) ||
      [...(s.source ? [s.source] : []), ...s.destinations].some(
        (e) =>
          endName(e).toLowerCase().includes(needle) ||
          e.path.toLowerCase().includes(needle),
      ),
  )
  const items = searched.filter((s) => matches(s, show))
  const create = () => router.push("/cronjobs/new")

  const header = phone ? (
    <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
      <h1 className="text-heading font-light">Cron jobs</h1>
      <HelpButton
        href={guideHref("cronjobs")}
        label="Cron jobs guide"
        className="ms-auto"
      />
      {can.edit && (
        <Button
          size="icon-lg"
          aria-label="New cron job"
          className="rounded-full"
          onClick={create}
        >
          <Plus className="size-5" />
        </Button>
      )}
    </header>
  ) : null

  let body: ReactNode
  if (list.isPending) body = <Placeholder phone={phone} />
  else if (list.isError && !list.data) {
    body = (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center md:rounded-2xl md:border md:border-border">
        <p className="text-body-sm text-muted-foreground">
          {list.error.message}
        </p>
        <Button
          variant="outline"
          className="h-11 md:h-9"
          onClick={() => list.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  } else if (all.length === 0) {
    body = (
      <Empty
        icon={CalendarClock}
        title="No cron jobs yet"
        body="Back up a server's folder to a storage every night, copy a storage onto several servers each hour, or mirror one server to another. Morche runs them itself; nothing is installed on the servers."
        action={
          can.edit && (
            <Button className="h-11 w-full md:h-9 md:w-auto" onClick={create}>
              <Plus />
              New cron job
            </Button>
          )
        }
      />
    )
  } else if (items.length === 0) {
    body = <NoMatch phone={phone} />
  } else if (phone) {
    body = <Rows items={items} />
  } else {
    body = <Table items={items} />
  }

  return (
    <>
      {header}
      <div
        className={cn(
          "flex flex-col pb-24",
          phone ? "pt-4" : "gap-4 px-6 pt-5",
        )}
      >
        {all.length > 0 && (
          <Bar
            phone={phone}
            items={searched}
            action={
              can.edit && (
                <Button onClick={create}>
                  <Plus />
                  New cron job
                </Button>
              )
            }
          />
        )}
        {body}
      </div>
    </>
  )
}

function Bar({
  phone,
  items,
  action,
}: {
  phone: boolean
  items: Schedule[]
  action?: ReactNode
}) {
  const [{ q, show }, setFilters] = useCronjobFilters()
  const count = (s: Show) => items.filter((x) => matches(x, s)).length
  const attention = count("attention")
  const shows: { value: Show; label: string }[] = [
    { value: "all", label: `All ${items.length}` },
    { value: "active", label: `On ${count("active")}` },
    { value: "paused", label: `Paused ${count("paused")}` },
    ...(attention > 0 || show === "attention"
      ? [{ value: "attention" as const, label: `Need a look ${attention}` }]
      : []),
  ]
  const search = (
    <SearchBox
      value={q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder="Search cron jobs"
      label="Search cron jobs"
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
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-3">
        {search}
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {filter}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {search}
      {filter}
      {action && <div className="ms-auto flex gap-2">{action}</div>}
    </div>
  )
}

// ---- Desktop ----

function Th({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn("h-10 px-3 text-start font-medium", className)}
    >
      {children}
    </th>
  )
}

function Table({ items }: { items: Schedule[] }) {
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Name</Th>
            <Th className="hidden @4xl:table-cell">Does</Th>
            <Th>Schedule</Th>
            <Th className="hidden @3xl:table-cell">Next run</Th>
            <Th>Last run</Th>
            <Th className="w-14">On</Th>
            <th scope="col" className="w-28">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((s) => (
            <Row key={s.id} s={s} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ s }: { s: Schedule }) {
  const can = useCronjobCan(s.workspace_id)
  const a = useCronjobActions()
  const menu = useCronjobMenu(s)
  const busy = !!s.last_run && runActive(s.last_run.state)
  return (
    <tr className={cn("h-16 hover:bg-subtle", !s.enabled && "text-ash")}>
      <td className="max-w-80 px-3">
        <Link
          href={`/cronjobs/${s.id}`}
          className="flex items-center gap-3 outline-none hover:text-brand focus-visible:text-brand"
        >
          <span
            title={actionMeta[s.action]?.label}
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <ActionIcon action={s.action} className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "truncate font-medium",
                  s.enabled && "text-foreground",
                )}
              >
                {s.name}
              </span>
              {s.problem && (
                <span title={s.problem} className="shrink-0">
                  <TriangleAlert className="size-4 text-warning" />
                  <span className="sr-only">{s.problem}</span>
                </span>
              )}
            </span>
            <span className="block truncate text-caption text-ash @4xl:hidden">
              {jobSummary(s)}
            </span>
            {s.description && (
              <span className="hidden truncate text-caption text-ash @4xl:block">
                {s.description}
              </span>
            )}
          </span>
        </Link>
      </td>
      <td className="hidden max-w-96 px-3 @4xl:table-cell">
        {s.action === "sync" && s.source ? (
          <div className="flex flex-col gap-0.5 text-caption">
            <EndLabel end={s.source} />
            <span className="flex min-w-0 items-center gap-1.5">
              <ArrowRight className="size-3.5 shrink-0 text-ash" />
              {s.destinations.length === 1 ? (
                <EndLabel end={s.destinations[0]} />
              ) : (
                <span className="truncate text-muted-foreground">
                  {s.destinations.length} places
                </span>
              )}
              <span className="shrink-0 text-ash">
                · {modeMeta[s.options.mode]?.short}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-0.5 text-caption">
            <span className="truncate font-medium">
              {actionMeta[s.action]?.label}
            </span>
            <span className="truncate text-muted-foreground">
              {jobSummary(s)}
            </span>
          </div>
        )}
      </td>
      <td className="max-w-56 px-3">
        <span className="block truncate">{cronText(s.cron)}</span>
        <span className="block truncate text-caption text-ash">
          {s.timezone}
        </span>
      </td>
      <td className="hidden px-3 whitespace-nowrap @3xl:table-cell">
        {s.enabled && s.next_run_at ? (
          <>
            <span className="block">{timeAgo(s.next_run_at)}</span>
            <span className="block text-caption text-ash tabular-nums">
              {formatInZone(s.next_run_at, s.timezone)}
            </span>
          </>
        ) : (
          <span className="text-ash">Paused</span>
        )}
      </td>
      <td className="px-3 whitespace-nowrap">
        {s.last_run ? (
          <Link
            href={runHref(s.id, s.last_run.id)}
            className="flex flex-col hover:underline"
            title={s.last_run.error || undefined}
          >
            <RunStateBadge state={s.last_run.state} />
            <span className="text-caption text-ash">
              {timeAgo(s.last_run.at)}
            </span>
          </Link>
        ) : (
          <span className="text-ash">Never run</span>
        )}
      </td>
      <td className="px-3">
        <Switch
          checked={s.enabled}
          disabled={!can.edit}
          aria-label={s.enabled ? `Pause ${s.name}` : `Resume ${s.name}`}
          onCheckedChange={(on) => a.setEnabled(s, on)}
        />
      </td>
      <td className="pe-2">
        <div className="flex items-center justify-end gap-1">
          {can.run && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !!s.problem || a.running}
              onClick={() => a.run(s)}
            >
              <Play />
              {busy ? "Running" : "Run"}
            </Button>
          )}
          <ItemMenu groups={menu} label={`${s.name} actions`} />
        </div>
      </td>
    </tr>
  )
}

// ---- Phone ----

function Rows({ items }: { items: Schedule[] }) {
  const [open, setOpen] = useOpen("cronjob-sheet")
  const [id, setId] = useState<string | null>(null)
  // Keep the last tapped job so the sheet can animate out.
  const last = useRef<Schedule | null>(null)
  const current = items.find((s) => s.id === id) ?? last.current
  if (current) last.current = current

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((s) => (
          <li key={s.id} className="flex items-center">
            <Link
              href={`/cronjobs/${s.id}`}
              className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  s.enabled
                    ? "bg-brand-soft text-brand-strong"
                    : "bg-muted text-ash",
                )}
              >
                <ActionIcon action={s.action} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-body font-medium">
                    {s.name}
                  </span>
                  {s.problem && (
                    <TriangleAlert className="size-4 shrink-0 text-warning" />
                  )}
                </span>
                <span className="block truncate text-body-sm text-muted-foreground">
                  {s.enabled ? cronText(s.cron) : "Paused"} · {jobSummary(s)}
                </span>
                {s.last_run && (
                  <span className="mt-0.5 flex items-center gap-2">
                    <RunStateBadge
                      state={s.last_run.state}
                      className="text-caption [&_svg]:size-3.5"
                    />
                    <span className="truncate text-caption text-ash">
                      {timeAgo(s.last_run.at)}
                    </span>
                  </span>
                )}
              </span>
            </Link>
            <button
              type="button"
              aria-label={`${s.name} actions`}
              className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
              onClick={() => {
                setId(s.id)
                setOpen(true)
              }}
            >
              <Ellipsis className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      {current && <JobSheet s={current} open={open} onOpenChange={setOpen} />}
    </>
  )
}

function JobSheet({
  s,
  open,
  onOpenChange,
}: {
  s: Schedule
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useCronjobMenu(s)
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={s.name}>
      {s.problem && (
        <p className="mx-2 mb-3 flex gap-2 rounded-2xl bg-subtle p-4 text-body-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          {s.problem}
        </p>
      )}
      <Facts
        items={[
          { label: "Does", value: actionMeta[s.action]?.label ?? s.action },
          ...taskFacts(s),
          { label: "Schedule", value: cronText(s.cron) },
          {
            label: "Next run",
            value:
              s.enabled && s.next_run_at
                ? formatInZone(s.next_run_at, s.timezone)
                : "Paused",
          },
        ]}
      />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

function Placeholder({ phone }: { phone: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden border-border",
        phone ? "border-y" : "rounded-2xl border",
      )}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-16 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ms-auto h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

function NoMatch({ phone }: { phone: boolean }) {
  const [, setFilters] = useCronjobFilters()
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-12 text-center text-body-sm text-muted-foreground",
        !phone && "rounded-2xl border border-border",
      )}
    >
      No cron job matches.
      <Button
        variant="outline"
        className="h-11 md:h-9"
        onClick={() => setFilters({ q: null, show: null })}
      >
        Clear filters
      </Button>
    </div>
  )
}
