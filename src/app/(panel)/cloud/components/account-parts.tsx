"use client"

import {
  Cloud,
  Ellipsis,
  KeyRound,
  Lock,
  Plus,
  ShieldCheck,
  Star,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"

import { ItemMenu } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import type { CloudAccount, CloudServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAccountMenu, useCloudActions } from "./cloud-actions"
import {
  accountStatusMeta,
  type ServerState,
  StatusDot,
  serverStateMeta,
} from "./meta"
import { useCloudCan } from "./permissions"

// Pieces shared by the accounts list and an account's own page.

export const accountHref = (id: string) => `/cloud/${id}`

export function ProviderMark({
  className,
  icon = "size-5",
}: {
  className?: string
  icon?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong",
        className,
      )}
    >
      <Cloud className={icon} />
    </span>
  )
}

// Running first, then the ones that need a look, then the quiet ones.
const stateRank: Record<ServerState, number> = {
  running: 0,
  building: 1,
  deleting: 2,
  error: 3,
  unknown: 4,
  stopped: 5,
  archived: 6,
}

export const byState = (list: CloudServer[]) =>
  [...list].sort(
    (a, b) =>
      stateRank[a.state] - stateRank[b.state] || a.name.localeCompare(b.name),
  )

// One small pill per server, coloured by its state: the account's fleet at
// a glance.
export function FleetStrip({
  servers,
  max = 24,
  className,
  size = "sm",
}: {
  servers: CloudServer[]
  max?: number
  className?: string
  size?: "sm" | "lg"
}) {
  if (servers.length === 0) {
    return (
      <div
        className={cn(
          "rounded-full border border-dashed border-border",
          size === "lg" ? "h-3" : "h-2",
          className,
        )}
      />
    )
  }
  const shown = byState(servers).slice(0, max)
  const more = servers.length - shown.length
  return (
    <div
      role="img"
      aria-label={stateSummary(servers)}
      className={cn("flex items-center gap-1", className)}
    >
      {shown.map((s) => (
        <span
          key={`${s.region}-${s.id}`}
          title={`${s.name} · ${serverStateMeta[s.state].label}`}
          className={cn(
            "min-w-1.5 flex-1 rounded-full",
            size === "lg" ? "h-3 max-w-10" : "h-2 max-w-6",
            serverStateMeta[s.state].dot,
            s.task && "animate-pulse",
          )}
        />
      ))}
      {more > 0 && (
        <span className="ms-1 text-caption text-ash tabular-nums">+{more}</span>
      )}
    </div>
  )
}

export function stateCounts(servers: CloudServer[]) {
  let running = 0
  let off = 0
  let other = 0
  for (const s of servers) {
    if (s.state === "running") running++
    else if (s.state === "stopped" || s.state === "archived") off++
    else other++
  }
  return { running, off, other }
}

export function stateSummary(servers: CloudServer[]) {
  const c = stateCounts(servers)
  return [
    `${c.running} running`,
    c.off > 0 && `${c.off} off`,
    c.other > 0 && `${c.other} other`,
  ]
    .filter(Boolean)
    .join(", ")
}

export function AccountStatusLine({
  account: a,
  checking,
  className,
}: {
  account: CloudAccount
  checking: boolean
  className?: string
}) {
  const meta = accountStatusMeta[a.status]
  return (
    <span
      title={a.status_message || undefined}
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap",
        className,
      )}
    >
      <StatusDot dot={meta.dot} busy={checking} />
      <span className="text-foreground">
        {checking ? "Checking…" : meta.label}
      </span>
      {!checking && a.status === "online" && a.latency_ms != null && (
        <span className="text-muted-foreground tabular-nums">
          {a.latency_ms} ms
        </span>
      )}
    </span>
  )
}

export const broken = (a: CloudAccount) =>
  a.status !== "online" && a.status !== "unknown"

export function ChangesTag({
  allowed,
  className,
}: {
  allowed: boolean
  className?: string
}) {
  const Icon = allowed ? ShieldCheck : Lock
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        allowed ? "text-brand-strong" : "text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {allowed ? "Changes allowed" : "Read only"}
    </span>
  )
}

// ── Desktop card ─────────────────────────────────────────────────────────

export function AccountCard({
  account: a,
  servers,
  checking,
}: {
  account: CloudAccount
  servers: CloudServer[] | undefined
  checking: boolean
}) {
  const actions = useCloudActions()
  const can = useCloudCan()
  const menu = useAccountMenu()
  const counts = servers ? stateCounts(servers) : null
  const bad = broken(a)

  return (
    <article className="group/card relative flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:ring-3 focus-within:ring-ring/50 hover:shadow-md">
      <div className="flex items-start gap-3 p-5 pb-0">
        <ProviderMark />
        <div className="min-w-0 flex-1 pt-0.5">
          <Link
            href={accountHref(a.id)}
            className="block truncate text-body font-medium outline-none group-hover/card:text-brand-strong after:absolute after:inset-0 after:rounded-2xl"
          >
            {a.name}
          </Link>
          <p className="truncate text-caption text-ash">
            {a.description || a.provider_label}
          </p>
        </div>
        <div className="relative z-10 -me-2 -mt-1 flex items-center">
          <button
            type="button"
            aria-label={
              a.favorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={a.favorite}
            disabled={!can(a, "operator")}
            onClick={() => actions.toggleFavorite(a)}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg text-ash outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:hover:bg-muted enabled:hover:text-foreground",
              !a.favorite &&
                "opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100",
            )}
          >
            <Star
              className={cn("size-4", a.favorite && "fill-brand text-brand")}
            />
          </button>
          <ItemMenu groups={menu(a)} label={`${a.name} actions`} />
        </div>
      </div>

      <div className="px-5 pt-3 text-body-sm">
        <AccountStatusLine account={a} checking={checking} />
      </div>

      {bad ? (
        <div
          className={cn(
            "mx-5 mt-4 flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-body-sm",
            a.status === "auth_failed" || a.status === "blocked"
              ? "bg-warning/10"
              : "bg-destructive/10",
          )}
        >
          <TriangleAlert
            className={cn(
              "mt-0.5 size-4 shrink-0",
              a.status === "auth_failed" || a.status === "blocked"
                ? "text-warning"
                : "text-destructive",
            )}
          />
          <span className="line-clamp-3 min-w-0 flex-1 text-foreground">
            {a.status_message || accountStatusMeta[a.status].label}
          </span>
          {can(a, "owner") && (
            <Button
              variant="outline"
              size="sm"
              className="relative z-10 shrink-0 bg-card"
              onClick={() => actions.editAccount(a)}
            >
              Edit key
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-end gap-4 px-5 pt-5">
            <p className="flex items-baseline gap-2">
              <span className="text-heading font-light tabular-nums">
                {a.server_count}
              </span>
              <span className="text-body-sm text-muted-foreground">
                server{a.server_count === 1 ? "" : "s"}
              </span>
            </p>
            {counts && a.server_count > 0 && (
              <p className="ms-auto flex flex-col items-end gap-0.5 pb-1.5 text-caption text-muted-foreground tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot dot="bg-success" />
                  {counts.running} running
                </span>
                {counts.off + counts.other > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot dot="bg-mist" />
                    {counts.off + counts.other} not running
                  </span>
                )}
              </p>
            )}
          </div>
          <FleetStrip servers={servers ?? []} className="mx-5 mt-3" />
        </>
      )}

      <footer className="mt-5 flex items-center gap-3 border-t border-border px-5 py-3 text-caption">
        <ChangesTag allowed={a.allow_changes} />
        {a.key_hint && (
          <span
            title="The API key ends with these characters"
            className="inline-flex items-center gap-1 text-ash"
          >
            <KeyRound className="size-3.5" />
            <span className="font-mono">…{a.key_hint}</span>
          </span>
        )}
        <span className="ms-auto truncate text-ash">
          {a.last_checked_at
            ? `Checked ${timeAgo(a.last_checked_at)}`
            : "Not checked yet"}
        </span>
      </footer>
    </article>
  )
}

export function AddAccountCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-mist p-6 text-center text-muted-foreground transition-colors outline-none hover:border-brand/50 hover:bg-subtle hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Plus className="size-5" />
      </span>
      <span>
        <span className="block text-body-sm font-medium text-foreground">
          Add account
        </span>
        <span className="mt-0.5 block text-caption">
          Another API key, another company or project
        </span>
      </span>
    </button>
  )
}

export function AccountCardSkeleton() {
  return (
    <div className="flex h-56 flex-col gap-4 rounded-2xl border border-border p-5">
      <div className="flex items-center gap-3">
        <span className="size-11 animate-pulse rounded-lg bg-muted" />
        <span className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
      <span className="mt-auto h-8 w-16 animate-pulse rounded bg-muted" />
      <span className="h-2 animate-pulse rounded-full bg-muted" />
    </div>
  )
}

// ── Phone row ────────────────────────────────────────────────────────────

export function AccountPhoneRow({
  account: a,
  servers,
  checking,
  onMore,
}: {
  account: CloudAccount
  servers: CloudServer[] | undefined
  checking: boolean
  onMore: () => void
}) {
  const bad = broken(a)
  return (
    <li className="flex items-stretch">
      <Link
        href={accountHref(a.id)}
        className="flex min-w-0 flex-1 gap-3 py-3.5 ps-4 pe-1 outline-none active:bg-muted"
      >
        <ProviderMark className="mt-0.5 size-10" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-body font-medium">{a.name}</span>
            {a.favorite && (
              <Star
                aria-label="Favorite"
                className="size-3.5 shrink-0 fill-brand text-brand"
              />
            )}
          </span>
          <span className="flex items-center gap-2 text-caption text-muted-foreground">
            <AccountStatusLine account={a} checking={checking} />
            {!bad && (
              <span className="truncate tabular-nums">
                · {a.server_count} server{a.server_count === 1 ? "" : "s"},{" "}
                {a.running_count} running
              </span>
            )}
          </span>
          {bad ? (
            <span className="line-clamp-2 text-caption text-muted-foreground">
              {a.status_message}
            </span>
          ) : (
            <FleetStrip servers={servers ?? []} max={18} className="mt-1" />
          )}
        </span>
      </Link>
      <button
        type="button"
        aria-label={`${a.name} actions`}
        onClick={onMore}
        className="me-1 flex size-11 shrink-0 items-center justify-center self-center rounded-full text-ash outline-none active:bg-muted"
      >
        <Ellipsis className="size-5" />
      </button>
    </li>
  )
}
