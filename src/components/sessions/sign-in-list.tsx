"use client"

import { Fragment } from "react"

import type { SignInEntry } from "@/lib/services"
import { cn } from "@/lib/utils"
import { deviceIcon, deviceName, eventText, kindMeta, type Tone } from "./meta"

const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
})
const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: "short" })
const fullFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "medium",
})

function dayOf(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return "Today"
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return "Yesterday"
  return dayFmt.format(d)
}

// Rows grouped under their day, newest first (as the backend sends them).
function byDay(items: SignInEntry[]) {
  const groups: { day: string; items: SignInEntry[] }[] = []
  for (const e of items) {
    const day = dayOf(e.at)
    const last = groups.at(-1)
    if (last?.day === day) last.items.push(e)
    else groups.push({ day, items: [e] })
  }
  return groups
}

const toneDot: Record<Tone, string> = {
  ok: "bg-success",
  bad: "bg-destructive",
  quiet: "bg-mist",
}

function Mark({ e, className }: { e: SignInEntry; className?: string }) {
  const tone = kindMeta[e.kind]?.tone ?? "quiet"
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        toneDot[tone],
        className,
      )}
    />
  )
}

function Tags({ e }: { e: SignInEntry }) {
  return (
    <>
      {e.new_address && (
        <span
          title="First sign-in to this account from this network"
          className="inline-flex h-5 shrink-0 items-center rounded-full bg-warning/10 px-2 text-caption text-warning"
        >
          New address
        </span>
      )}
      {e.answer === "not_me" && (
        <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-destructive/10 px-2 text-caption text-destructive">
          Not them
        </span>
      )}
      {e.answer === "me" && (
        <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-muted px-2 text-caption text-muted-foreground">
          Confirmed
        </span>
      )}
      {e.kind === "signed_in" && e.current && (
        <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-brand-soft px-2 text-caption text-brand-strong">
          This device
        </span>
      )}
      {e.kind === "signed_in" && !e.current && e.session_open && (
        <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-success/10 px-2 text-caption text-success">
          Still signed in
        </span>
      )}
    </>
  )
}

// A value that narrows the list when clicked (an address or an account).
function Pick({
  value,
  onPick,
  className,
  children,
}: {
  value: string
  onPick?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  if (!onPick) return <span className={className}>{children}</span>
  return (
    <button
      type="button"
      title={`Show only ${value}`}
      onClick={() => onPick(value)}
      className={cn(
        "max-w-full truncate rounded-sm text-start outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function SignInTable({
  items,
  showUser,
  onPick,
}: {
  items: SignInEntry[]
  showUser: boolean
  onPick?: (q: string) => void
}) {
  const cols = showUser ? 5 : 4
  return (
    <div className="overflow-x-auto rounded-2xl border border-border [contain:inline-size]">
      <table className="w-full min-w-[52rem] table-fixed text-body-sm">
        <colgroup>
          <col className="w-24" />
          {showUser && <col className="w-44" />}
          <col />
          <col className="w-56" />
          <col className="w-48" />
        </colgroup>
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <th scope="col" className="h-10 px-3 text-start font-medium">
              Time
            </th>
            {showUser && (
              <th scope="col" className="h-10 px-3 text-start font-medium">
                Account
              </th>
            )}
            <th scope="col" className="h-10 px-3 text-start font-medium">
              What happened
            </th>
            <th scope="col" className="h-10 px-3 text-start font-medium">
              Device
            </th>
            <th scope="col" className="h-10 px-3 text-start font-medium">
              Address
            </th>
          </tr>
        </thead>
        <tbody>
          {byDay(items).map((g) => (
            <Fragment key={g.day}>
              <tr className="border-b border-border bg-subtle/60">
                <th
                  colSpan={cols}
                  scope="colgroup"
                  className="h-8 px-3 text-start text-caption font-medium text-ash"
                >
                  {g.day}
                </th>
              </tr>
              {g.items.map((e) => {
                const Icon = deviceIcon[e.device_kind] ?? deviceIcon.other
                return (
                  <tr
                    key={e.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td
                      className="h-12 px-3 text-caption whitespace-nowrap text-muted-foreground tabular-nums"
                      title={fullFmt.format(new Date(e.at))}
                    >
                      {timeFmt.format(new Date(e.at))}
                    </td>
                    {showUser && (
                      <td className="truncate px-3">
                        <Pick
                          value={e.username}
                          onPick={onPick}
                          className={cn(!e.user_id && "text-muted-foreground")}
                        >
                          {e.username || "—"}
                        </Pick>
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <Mark e={e} />
                        <span
                          className={cn(
                            "truncate",
                            e.kind === "failed" && "text-destructive",
                          )}
                        >
                          {eventText(e)}
                        </span>
                        <Tags e={e} />
                      </span>
                    </td>
                    <td className="px-3">
                      <span
                        className="flex min-w-0 items-center gap-1.5 text-muted-foreground"
                        title={e.user_agent}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{deviceName(e)}</span>
                      </span>
                    </td>
                    <td className="truncate px-3 font-mono text-caption tabular-nums">
                      <Pick value={e.ip} onPick={onPick}>
                        {e.ip}
                      </Pick>
                    </td>
                  </tr>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SignInRows({
  items,
  showUser,
  sticky = true,
}: {
  items: SignInEntry[]
  showUser: boolean
  sticky?: boolean
}) {
  return (
    <div className="flex flex-col">
      {byDay(items).map((g) => (
        <section key={g.day}>
          <h3
            className={cn(
              "border-b border-border bg-background/95 px-4 py-2 text-caption font-medium text-ash backdrop-blur",
              sticky && "sticky top-0 z-[1]",
            )}
          >
            {g.day}
          </h3>
          <ul>
            {g.items.map((e) => {
              const Icon = deviceIcon[e.device_kind] ?? deviceIcon.other
              return (
                <li
                  key={e.id}
                  className="flex min-h-16 items-start gap-3 border-b border-border px-4 py-2.5"
                >
                  <Mark e={e} className="mt-1.5" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={cn(
                          "min-w-0",
                          e.kind === "failed" && "text-destructive",
                        )}
                      >
                        {showUser && (
                          <span className="font-medium text-foreground">
                            {e.username || "—"}:{" "}
                          </span>
                        )}
                        {eventText(e)}
                      </span>
                      <Tags e={e} />
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 text-caption text-ash">
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {[
                          timeFmt.format(new Date(e.at)),
                          deviceName(e),
                          e.ip,
                        ].join(" · ")}
                      </span>
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
