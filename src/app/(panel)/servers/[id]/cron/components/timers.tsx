"use client"

import {
  ChevronRight,
  Ellipsis,
  FileCode,
  Loader2,
  Play,
  Power,
  PowerOff,
  Timer,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOpen } from "@/hooks/useOpen"
import type { CronScript, CronTimer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { timeAgo } from "../../../components/meta"
import { useServerPage } from "../../components/server-page"
import { useTimerAction } from "../api"
import { useCronActions } from "./cron-actions"
import { formatAt } from "./schedule"

type Action = "run" | "enable" | "disable"

const actionDone: Record<Action, string> = {
  run: "started",
  enable: "turned on",
  disable: "turned off",
}

function useTimer() {
  const { server } = useServerPage()
  const { overview } = useCronActions()
  const m = useTimerAction(server.id)
  const allowed = overview.access !== "user"
  function act(t: CronTimer, action: Action) {
    m.mutate(
      { unit: t.unit, action },
      {
        onSuccess: () => toast.success(`${t.unit} ${actionDone[action]}`),
        onError: (e) => toast.error(e.message),
      },
    )
  }
  return { act, allowed, pending: m.isPending ? m.variables?.unit : null }
}

function timerItems(t: CronTimer) {
  const items: { key: Action; icon: ReactNode; label: string }[] = [
    { key: "run", icon: <Play />, label: "Run now" },
  ]
  if (t.enabled === "enabled") {
    items.push({ key: "disable", icon: <PowerOff />, label: "Turn off" })
  } else if (t.enabled === "disabled") {
    items.push({ key: "enable", icon: <Power />, label: "Turn on" })
  }
  return items
}

// How the service's last run went, as a short label and a tone.
function lastResult(t: CronTimer) {
  if (t.running) return { label: "Running", tone: "text-brand" }
  if (!t.last) return { label: "Never run", tone: "text-ash" }
  if (t.result === "success" || t.result === "") {
    return { label: "Succeeded", tone: "text-success" }
  }
  const code = t.exit_status ? ` (exit ${t.exit_status})` : ""
  return { label: `Failed: ${t.result}${code}`, tone: "text-destructive" }
}

function TimerState({ t }: { t: CronTimer }) {
  if (!t.active) return <span className="text-ash">Off</span>
  return <span className="text-muted-foreground">{t.enabled}</span>
}

export function TimersView({ timers }: { timers: CronTimer[] }) {
  const { phone } = useServerPage()
  if (timers.length === 0) {
    return (
      <p className="text-body-sm text-muted-foreground max-md:px-4 max-md:pt-4">
        No systemd timers on this server.
      </p>
    )
  }
  return phone ? (
    <TimersList timers={timers} />
  ) : (
    <TimersTable timers={timers} />
  )
}

function TimersTable({ timers }: { timers: CronTimer[] }) {
  const { clock } = useCronActions()
  const { act, allowed, pending } = useTimer()
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr className="h-10">
            <th scope="col" className="ps-4 text-start font-medium">
              Timer
            </th>
            <th
              scope="col"
              className="hidden px-3 text-start font-medium @2xl:table-cell"
            >
              Schedule
            </th>
            <th scope="col" className="w-32 px-3 text-start font-medium">
              Next run
            </th>
            <th
              scope="col"
              className="hidden w-44 px-3 text-start font-medium @xl:table-cell"
            >
              Last run
            </th>
            <th
              scope="col"
              className="hidden w-24 px-3 text-start font-medium @3xl:table-cell"
            >
              State
            </th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {timers.map((t) => {
            const r = lastResult(t)
            return (
              <tr key={t.unit} className="h-16 hover:bg-subtle">
                <td className="max-w-0 ps-4">
                  <span className="block truncate font-medium">
                    {t.description || t.unit}
                  </span>
                  <span className="block truncate font-mono text-caption text-ash">
                    {t.unit} → {t.service}
                  </span>
                </td>
                <td className="hidden max-w-0 px-3 @2xl:table-cell">
                  <span className="block truncate font-mono text-caption text-muted-foreground">
                    {t.schedule.join(" · ") || "—"}
                  </span>
                </td>
                <td
                  className="px-3 whitespace-nowrap text-muted-foreground"
                  title={t.next ? formatAt(t.next, clock) : undefined}
                >
                  {t.next ? (
                    timeAgo(t.next)
                  ) : (
                    <span className="text-ash">—</span>
                  )}
                </td>
                <td className="hidden max-w-0 px-3 @xl:table-cell">
                  <span
                    className="block truncate text-muted-foreground"
                    title={t.last ? formatAt(t.last, clock) : undefined}
                  >
                    {t.last ? timeAgo(t.last) : "—"}
                  </span>
                  <span className={cn("block truncate text-caption", r.tone)}>
                    {r.label}
                  </span>
                </td>
                <td className="hidden px-3 @3xl:table-cell">
                  <TimerState t={t} />
                </td>
                <td className="pe-3">
                  {allowed && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${t.unit}`}
                            disabled={pending === t.unit}
                          />
                        }
                      >
                        {pending === t.unit ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Ellipsis />
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {timerItems(t).map((item) => (
                          <DropdownMenuItem
                            key={item.key}
                            onClick={() => act(t, item.key)}
                          >
                            {item.icon}
                            {item.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TimersList({ timers }: { timers: CronTimer[] }) {
  const { clock } = useCronActions()
  const { act, allowed } = useTimer()
  const [open, setOpen] = useOpen("cron-timer-sheet")
  const [unit, setUnit] = useState<string | null>(null)
  const current = timers.find((t) => t.unit === unit)

  return (
    <>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {timers.map((t) => {
          const r = lastResult(t)
          return (
            <li key={t.unit}>
              <button
                type="button"
                onClick={() => {
                  setUnit(t.unit)
                  setOpen(true)
                }}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg",
                    t.active
                      ? "bg-brand-soft text-brand-strong"
                      : "bg-muted text-ash",
                  )}
                >
                  <Timer className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">
                    {t.description || t.unit}
                  </span>
                  <span className="block truncate text-body-sm text-muted-foreground">
                    {t.next ? `Next ${timeAgo(t.next)}` : "Not scheduled"}
                    <span className={cn("ms-1", r.tone)}>· {r.label}</span>
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </button>
            </li>
          )
        })}
      </ul>
      {current && (
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title={current.description || current.unit}
        >
          <dl className="mx-2 mb-3 grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm">
            <div className="col-span-2">
              <dt className="text-caption text-ash">Unit</dt>
              <dd className="mt-0.5 font-mono text-caption break-all">
                {current.unit} → {current.service}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-caption text-ash">Schedule</dt>
              <dd className="mt-0.5 font-mono text-caption break-all">
                {current.schedule.join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ash">Next run</dt>
              <dd className="mt-0.5 font-medium">
                {current.next ? formatAt(current.next, clock) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ash">Last run</dt>
              <dd className="mt-0.5 font-medium">
                {current.last ? formatAt(current.last, clock) : "Never"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-caption text-ash">Result</dt>
              <dd
                className={cn("mt-0.5 font-medium", lastResult(current).tone)}
              >
                {lastResult(current).label}
              </dd>
            </div>
          </dl>
          {allowed ? (
            <ul className="divide-y divide-border">
              {timerItems(current).map((item) => (
                <li key={item.key}>
                  <SheetAction
                    icon={item.icon}
                    label={item.label}
                    onClick={() => {
                      act(current, item.key)
                      setOpen(false)
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 pb-2 text-body-sm text-muted-foreground">
              Starting or changing timers needs root or sudo.
            </p>
          )}
        </BottomSheet>
      )}
    </>
  )
}

// ---- Periodic scripts (/etc/cron.daily and friends) ----

const periodOrder = ["15min", "hourly", "daily", "weekly", "monthly", "yearly"]

export function ScriptsView({ scripts }: { scripts: CronScript[] }) {
  const { phone } = useServerPage()
  const a = useCronActions()
  const allowed = a.overview.access !== "user"
  const groups = [...Map.groupBy(scripts, (s) => s.period)].sort(
    ([x], [y]) => rank(x) - rank(y),
  )

  if (scripts.length === 0) {
    return (
      <p className="text-body-sm text-muted-foreground max-md:px-4 max-md:pt-4">
        No periodic scripts on this server.
      </p>
    )
  }

  function run(s: CronScript) {
    a.run({ title: basename(s.path), command: s.path, user: "root" })
  }

  return (
    <div className="flex flex-col gap-4 max-md:gap-0">
      <p className="text-body-sm text-muted-foreground max-md:px-4 max-md:pt-4">
        Scripts in these folders run in turn, once per period, as root.
      </p>
      {groups.map(([period, list]) =>
        phone ? (
          <section key={period} className="mt-4">
            <h3 className="px-4 pb-1.5 font-label text-caption tracking-label text-muted-foreground uppercase">
              {period}
            </h3>
            <ul className="divide-y divide-border border-y border-border">
              {list.map((s) => (
                <li
                  key={s.path}
                  className="flex min-h-14 items-center gap-3 px-4"
                >
                  <FileCode className="size-5 shrink-0 text-ash" />
                  <span className="min-w-0 flex-1 truncate font-mono text-body-sm">
                    {s.path}
                  </span>
                  {allowed && (
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`Run ${s.path}`}
                      onClick={() => run(s)}
                    >
                      <Play />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section
            key={period}
            className="overflow-hidden rounded-2xl border border-border"
          >
            <h3 className="flex h-10 items-center border-b border-border bg-subtle px-4 font-label text-caption tracking-label text-muted-foreground uppercase">
              {period}
            </h3>
            <ul className="divide-y divide-border">
              {list.map((s) => (
                <li
                  key={s.path}
                  className="flex h-12 items-center gap-3 px-4 hover:bg-subtle"
                >
                  <FileCode className="size-4 shrink-0 text-ash" />
                  <span className="min-w-0 flex-1 truncate font-mono text-caption">
                    {s.path}
                  </span>
                  {allowed && (
                    <Button variant="ghost" size="sm" onClick={() => run(s)}>
                      <Play />
                      Run now
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  )
}

function rank(period: string) {
  const i = periodOrder.indexOf(period)
  return i < 0 ? periodOrder.length : i
}

const basename = (p: string) => p.slice(p.lastIndexOf("/") + 1)
