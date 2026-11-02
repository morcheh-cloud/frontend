"use client"

import { ChevronRight, Cog, Loader2, Search, ShieldCheck } from "lucide-react"

import { useNow } from "@/hooks/useNow"
import { formatSize } from "@/lib/format"
import type { Service } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, ItemMenu, StateDot } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import {
  bootHints,
  bootLabel,
  filterServices,
  serviceState,
  shortName,
  stateLabel,
  stateMeta,
  upFor,
  useServicesFilters,
} from "./meta"
import { useServiceMenu, useServicesActions } from "./services-actions"

export function ServicesList() {
  const { phone } = useServerPage()
  const a = useServicesActions()
  const { filters, setFilters } = useServicesFilters()
  const list = filterServices(a.overview.services, filters.state, filters.q)
  const now = useNow(30_000)

  if (list.length === 0) {
    const narrowed = filters.state !== "all"
    const quiet = filters.state === "failed" && !filters.q
    return (
      <Empty
        icon={Search}
        title={quiet ? "No failed services" : "No matching services"}
        body={
          quiet
            ? "Every service is running, finished fine or stopped by hand."
            : narrowed
              ? "Try All, or another search."
              : "Try another search."
        }
        action={
          narrowed && (
            <button
              type="button"
              className="text-body-sm font-medium text-brand hover:underline"
              onClick={() => setFilters({ state: "all" })}
            >
              Show all services
            </button>
          )
        }
        className="max-md:mt-4"
      />
    )
  }
  return phone ? (
    <PhoneList services={list} now={now} />
  ) : (
    <ServicesTable services={list} now={now} />
  )
}

function State({ service: s }: { service: Service }) {
  const a = useServicesActions()
  if (s.name in a.busy) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Working…
      </span>
    )
  }
  const meta = stateMeta[serviceState(s)]
  return <StateDot tone={meta.tone} label={stateLabel(s)} />
}

// ---- Desktop ----

function ServicesTable({
  services,
  now,
}: {
  services: Service[]
  now: number
}) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border">
      <table className="w-full table-fixed text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr className="h-10">
            <th className="ps-4 text-start font-medium">Service</th>
            <th className="w-32 px-3 text-start font-medium">State</th>
            <th className="hidden w-32 px-3 text-start font-medium @xl:table-cell">
              At boot
            </th>
            <th className="hidden w-28 px-3 text-start font-medium @2xl:table-cell">
              Up for
            </th>
            <th className="hidden w-24 px-3 text-end font-medium @3xl:table-cell">
              Memory
            </th>
            <th className="hidden w-24 px-3 text-end font-medium @4xl:table-cell">
              PID
            </th>
            <th className="w-12 pe-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {services.map((s) => (
            <Row key={s.name} service={s} now={now} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ service: s, now }: { service: Service; now: number }) {
  const a = useServicesActions()
  const { can } = useServerPage()
  const menu = useServiceMenu(s)
  const st = serviceState(s)
  const up = upFor(s, now)
  return (
    <tr className="h-14 hover:bg-subtle">
      <td className="max-w-0 ps-4">
        <button
          type="button"
          disabled={!can("operator")}
          onClick={() => a.details(s)}
          className="block w-full min-w-0 text-start outline-none focus-visible:underline"
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "truncate font-medium",
                st === "stopped" && "text-muted-foreground",
              )}
            >
              {shortName(s.name)}
            </span>
            {s.custom && <Tag>custom</Tag>}
            {s.need_reload && <Tag>changed on disk</Tag>}
          </span>
          {s.description && (
            <span className="block truncate text-caption text-ash">
              {s.description}
            </span>
          )}
        </button>
      </td>
      <td className="px-3" title={stateMeta[st].hint}>
        <State service={s} />
      </td>
      <td
        className={cn(
          "hidden truncate px-3 @xl:table-cell",
          s.enabled !== "enabled" && "text-muted-foreground",
        )}
        title={bootHints[s.enabled]}
      >
        {bootLabel(s)}
      </td>
      <td className="hidden px-3 whitespace-nowrap tabular-nums @2xl:table-cell">
        {up ?? <span className="text-ash">—</span>}
      </td>
      <td className="hidden px-3 text-end whitespace-nowrap tabular-nums @3xl:table-cell">
        {s.memory != null && s.main_pid > 0 ? (
          formatSize(s.memory)
        ) : (
          <span className="text-ash">—</span>
        )}
      </td>
      <td className="hidden px-3 text-end tabular-nums @4xl:table-cell">
        {s.main_pid > 0 ? s.main_pid : <span className="text-ash">—</span>}
      </td>
      <td className="pe-3">
        <ItemMenu groups={menu} label={`Actions for ${s.name}`} />
      </td>
    </tr>
  )
}

function Tag({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 text-caption whitespace-nowrap text-muted-foreground">
      {children}
    </span>
  )
}

// ---- Phone ----

function PhoneList({ services, now }: { services: Service[]; now: number }) {
  const a = useServicesActions()
  const { can } = useServerPage()
  return (
    <ul className="mt-4 divide-y divide-border border-y border-border">
      {services.map((s) => {
        const st = serviceState(s)
        const up = upFor(s, now)
        const extra = [
          up && `up ${up}`,
          s.memory != null && s.main_pid > 0 && formatSize(s.memory),
          s.enabled === "enabled" && "at boot",
        ].filter(Boolean)
        return (
          <li key={s.name}>
            <button
              type="button"
              disabled={!can("operator")}
              onClick={() => a.details(s)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none enabled:active:bg-muted"
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg",
                  s.protected
                    ? "bg-brand-soft text-brand-strong"
                    : "bg-muted text-ash",
                )}
              >
                {s.protected ? (
                  <ShieldCheck className="size-5" />
                ) : (
                  <Cog className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-body font-medium",
                    st === "stopped" && "text-muted-foreground",
                  )}
                >
                  {shortName(s.name)}
                </span>
                <span className="block truncate text-body-sm text-muted-foreground">
                  <State service={s} />
                  {extra.length > 0 && (
                    <span className="text-ash"> · {extra.join(" · ")}</span>
                  )}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ash" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
