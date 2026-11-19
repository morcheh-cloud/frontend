"use client"

import {
  ArrowRight,
  CalendarClock,
  PackageSearch,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react"
import Link from "next/link"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { Asset } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAssets } from "../api"
import { useAssetActions } from "./asset-actions"
import {
  AssetIcon,
  assetHref,
  assetsHref,
  dateText,
  dueDates,
  type IssueKey,
  inDays,
  issueMeta,
  issueOrder,
  issuesOf,
  kindOf,
  StatusLabel,
  yearlyCost,
} from "./meta"
import { OwnerChip } from "./parts"
import { useAssetsCan } from "./permissions"
import { AssetsShell } from "./shell"

export function CoverageView() {
  const phone = useIsPhone()
  const query = useAssets()
  if (phone === null) return null
  return (
    <AssetsShell phone={phone} title="Coverage" section="coverage">
      {query.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <Empty
          icon={PackageSearch}
          title="Couldn't load the inventory"
          body={query.error.message}
        />
      ) : (
        <Coverage items={query.data} phone={phone} />
      )}
    </AssetsShell>
  )
}

function Ring({ value, label }: { value: number; label: string }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className={cn(
            value >= 90
              ? "stroke-success"
              : value >= 60
                ? "stroke-brand"
                : "stroke-warning",
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-subheading font-light tabular-nums">
          {value}%
        </span>
        <span className="text-[10px] text-ash">{label}</span>
      </div>
    </div>
  )
}

function Coverage({ items, phone }: { items: Asset[]; phone: boolean }) {
  const can = useAssetsCan()
  const actions = useAssetActions()
  const live = items.filter((a) => a.lifecycle !== "retired")
  const pct = (n: number) =>
    live.length ? Math.round((n / live.length) * 100) : 100
  const owned = live.filter((a) => a.owner.from !== "none").length
  const classified = live.filter((a) => a.environment && a.criticality).length
  const clean = live.filter((a) => issuesOf(a).length === 0).length
  const coming = live
    .flatMap((a) => dueDates(a).map((d) => ({ a, d })))
    .filter(({ d }) => d.days <= 60)
    .sort((x, y) => x.d.days - y.d.days)
  const spend = new Map<string, number>()
  for (const a of live) {
    const y = yearlyCost(a)
    if (y) spend.set(a.currency || "—", (spend.get(a.currency || "—") ?? 0) + y)
  }
  const byIssue = issueOrder
    .map((k) => ({ k, list: items.filter((a) => issuesOf(a).includes(k)) }))
    .filter((x) => x.list.length > 0)

  if (items.length === 0)
    return (
      <Empty
        icon={PackageSearch}
        title="Nothing to measure yet"
        body="Coverage shows what's missing an owner, what expires soon and what needs a look, once the inventory has assets."
      />
    )

  return (
    <div className={cn("grid gap-4", phone && "px-4")}>
      {/* Hero */}
      <section className="grid gap-4 rounded-3xl border border-border p-5 md:p-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex items-center gap-5">
          <Ring value={pct(clean)} label="in order" />
          <div>
            <p className="text-heading font-light tabular-nums">
              {live.length}
            </p>
            <p className="text-body-sm text-muted-foreground">assets in use</p>
            <p className="mt-1 text-caption text-ash">
              {live.length - clean} need a look · {items.length - live.length}{" "}
              retired
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            icon={UserRound}
            label="Have an owner"
            value={`${pct(owned)}%`}
            hint={`${live.length - owned} without`}
            href={assetsHref("/assets", { owner: "none" })}
            bar={pct(owned)}
          />
          <Kpi
            icon={ShieldCheck}
            label="Classified"
            value={`${pct(classified)}%`}
            hint="Environment + criticality set"
            bar={pct(classified)}
          />
          <Kpi
            icon={CalendarClock}
            label="Dates in 60 days"
            value={String(coming.length)}
            hint={
              coming[0]
                ? `Next: ${coming[0].a.name} ${inDays(coming[0].d.days)}`
                : "Nothing coming up"
            }
          />
          <Kpi
            icon={Wallet}
            label="Recurring per year"
            value={
              spend.size
                ? [...spend]
                    .map(
                      ([c, n]) =>
                        `${Math.round(n).toLocaleString()} ${c === "—" ? "" : c}`,
                    )
                    .join(" · ")
                : "—"
            }
            hint="Monthly and yearly costs written down"
          />
        </div>
      </section>

      <div
        className={cn(
          "grid gap-4",
          !phone && "xl:grid-cols-[minmax(0,1fr)_24rem]",
        )}
      >
        {/* Issues */}
        <div className="grid min-w-0 content-start gap-4">
          {byIssue.length === 0 ? (
            <Empty
              icon={ShieldCheck}
              title="Everything is in order"
              body="Every asset has an owner, nothing is expired, and reviews are up to date."
            />
          ) : (
            byIssue.map(({ k, list }) => (
              <IssueCard
                key={k}
                issue={k}
                list={list}
                onAssign={
                  can.edit && (k === "no-owner" || k === "owner-gone")
                    ? () => actions.bulk(list.map((a) => a.id))
                    : undefined
                }
              />
            ))
          )}
        </div>

        {/* Calendar */}
        <section className="min-w-0 self-start rounded-2xl border border-border p-5">
          <h2 className="font-label text-[11px] tracking-label text-ash uppercase">
            Coming up
          </h2>
          {coming.length === 0 ? (
            <p className="mt-3 text-body-sm text-ash">
              No dates in the next 60 days.
            </p>
          ) : (
            <ol className="relative mt-4 grid gap-4 border-s border-border ps-4">
              {coming.slice(0, 15).map(({ a, d }) => (
                <li key={`${a.id}-${d.key}`} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -start-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-background",
                      d.days < 0
                        ? "bg-destructive"
                        : d.days <= 14
                          ? "bg-warning"
                          : "bg-brand",
                    )}
                  />
                  <Link
                    href={assetHref(a.id)}
                    className="block truncate text-body-sm font-medium hover:underline"
                  >
                    {a.name}
                  </Link>
                  <p className="text-caption text-muted-foreground">
                    {d.label} {inDays(d.days)} · {dateText(d.date)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  href,
  bar,
}: {
  icon: typeof UserRound
  label: string
  value: string
  hint: string
  href?: string
  bar?: number
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-caption text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="mt-2 block truncate text-subheading font-light tabular-nums">
        {value}
      </span>
      {bar != null && (
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted">
          <span
            className={cn(
              "block h-full rounded-full",
              bar >= 90 ? "bg-success" : bar >= 60 ? "bg-brand" : "bg-warning",
            )}
            style={{ width: `${bar}%` }}
          />
        </span>
      )}
      <span className="mt-1.5 block truncate text-caption text-ash">
        {hint}
      </span>
    </>
  )
  const cls = "min-w-0 rounded-2xl bg-subtle px-4 py-3"
  return href ? (
    <Link href={href} className={cn(cls, "hover:bg-muted")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function IssueCard({
  issue,
  list,
  onAssign,
}: {
  issue: IssueKey
  list: Asset[]
  onAssign?: () => void
}) {
  const m = issueMeta[issue]
  return (
    <section className="overflow-hidden rounded-2xl border border-border">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg text-body-sm font-medium tabular-nums",
            m.severity === 2
              ? "bg-destructive/10 text-destructive"
              : m.severity === 1
                ? "bg-warning/12 text-warning"
                : "bg-muted text-muted-foreground",
          )}
        >
          {list.length}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-body-sm font-medium">{m.label}</h2>
          <p className="text-caption text-muted-foreground">{m.hint}</p>
        </div>
        {onAssign && (
          <Button size="sm" variant="outline" onClick={onAssign}>
            Give them an owner
          </Button>
        )}
        <Link
          href={assetsHref("/assets", { issue })}
          className="inline-flex items-center gap-1 text-caption text-brand"
        >
          All
          <ArrowRight className="size-3" />
        </Link>
      </header>
      <ul className="divide-y divide-border">
        {list.slice(0, 5).map((a) => (
          <li key={a.id}>
            <Link
              href={assetHref(a.id)}
              className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-subtle"
            >
              <AssetIcon asset={a} className="size-7 [&>svg]:size-4" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm">{a.name}</span>
                <span className="block truncate text-caption text-muted-foreground">
                  {kindOf(a.kind).label}
                </span>
              </span>
              <span className="hidden max-w-48 sm:block">
                {issue === "down" || issue === "gone" ? (
                  <StatusLabel asset={a} />
                ) : (
                  <OwnerChip asset={a} compact />
                )}
              </span>
            </Link>
          </li>
        ))}
        {list.length > 5 && (
          <li className="px-4 py-2 text-caption text-ash">
            and {list.length - 5} more
          </li>
        )}
      </ul>
    </section>
  )
}
