"use client"

import {
  Clock,
  ListFilter,
  LogIn,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useDeferredValue } from "react"

import {
  Failed,
  Placeholder,
} from "@/app/(panel)/scripts/components/scripts-view"
import { Empty, SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { useMembers } from "@/app/(panel)/settings/api"
import { useAccess } from "@/components/auth/auth"
import { useSignIns } from "@/components/sessions/api"
import { kindChoices } from "@/components/sessions/meta"
import { SignInRows, SignInTable } from "@/components/sessions/sign-in-list"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  chipClass,
  FilterChip,
  FilterMenu,
  type FilterSpec,
} from "./command-filters"
import { signInPeriods, useCommandFilters } from "./command-meta"

const periodLabels: Record<(typeof signInPeriods)[number] | "any", string> = {
  any: "Any time",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
}

const cleared = { q: null, user: null, result: null, since: null, fresh: null }

// The sign-in log: every sign-in, failed try, sign-out and ended session.
// Admins see every account; others only their own.
export function SignInsBrowser({
  phone,
  leading,
}: {
  phone: boolean
  leading?: ReactNode
}) {
  const { admin } = useAccess()
  const [v, setFilters] = useCommandFilters()
  const q = useDeferredValue(v.q.trim())
  const list = useSignIns({
    q: q || undefined,
    user: (admin && v.user) || undefined,
    kind: v.result ?? undefined,
    since: v.since ?? undefined,
    new_only: v.fresh || undefined,
    limit: 100,
  })
  const members = useMembers({}, admin).data?.items ?? []
  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const filtered = !!(v.q || v.user || v.result || v.since || v.fresh)

  const specs: FilterSpec[] = [
    {
      key: "result",
      label: "Any result",
      title: "What happened",
      allLabel: "Any result",
      icon: ListFilter,
      options: kindChoices.map((k) => ({ value: k.value, label: k.label })),
      value: v.result ? [v.result] : [],
      onChange: ([r]) => setFilters({ result: (r as typeof v.result) ?? null }),
    },
  ]
  if (admin)
    specs.push({
      key: "user",
      label: "Every account",
      title: "Account",
      allLabel: "Every account",
      icon: User,
      options: members.map((m) => ({
        value: m.id,
        label: m.full_name || m.username,
        hint: m.full_name ? m.username : undefined,
      })),
      value: v.user ? [v.user] : [],
      onChange: ([u]) => setFilters({ user: u ?? null }),
    })
  specs.push({
    key: "since",
    label: periodLabels.any,
    title: "When",
    allLabel: periodLabels.any,
    icon: Clock,
    options: signInPeriods.map((p) => ({ value: p, label: periodLabels[p] })),
    value: v.since ? [v.since] : [],
    onChange: ([p]) => setFilters({ since: (p as typeof v.since) ?? null }),
  })

  const search = (
    <SearchBox
      value={v.q}
      onChange={(q) => setFilters({ q: q || null })}
      placeholder={admin ? "Search accounts and addresses" : "Search addresses"}
      label="Search by account name or the start of an address"
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )
  const freshChip = (
    <button
      type="button"
      aria-pressed={v.fresh}
      title="Only sign-ins from a network the account hadn't used before"
      onClick={() => setFilters({ fresh: v.fresh ? null : true })}
      className={cn(chipClass, !phone && "md:h-9 md:px-3")}
    >
      <Sparkles className="size-4" />
      New addresses
    </button>
  )
  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={list.isFetching}
      onClick={() => list.refetch()}
    >
      <RefreshCw className={cn(list.isFetching && "animate-spin")} />
    </Button>
  )
  const security = admin && (
    <Button
      variant="outline"
      className="h-9"
      render={<Link href="/settings/security" />}
      nativeButton={false}
    >
      <ShieldCheck />
      Security settings
    </Button>
  )

  const bar = phone ? (
    <div className="flex flex-col gap-3 pb-3">
      {leading && <div className="px-4">{leading}</div>}
      <div className="flex items-center gap-2 px-4">
        {search}
        {refresh}
      </div>
      <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto px-4">
        {specs.map((f) => (
          <FilterChip key={f.key} f={f} />
        ))}
        {freshChip}
        {filtered && (
          <button
            type="button"
            onClick={() => setFilters(cleared)}
            className="h-11 shrink-0 px-2 text-body-sm text-brand"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      {leading}
      {leading && <span className="mx-1 h-5 w-px bg-border" />}
      {search}
      {specs.map((f) => (
        <FilterMenu key={f.key} f={f} />
      ))}
      {freshChip}
      {filtered && (
        <Button
          variant="ghost"
          className="h-9 px-2 text-brand"
          onClick={() => setFilters(cleared)}
        >
          Clear
        </Button>
      )}
      <span className="ms-auto" />
      {refresh}
      {security}
    </div>
  )

  let body: ReactNode
  if (list.isPending) body = <Placeholder phone={phone} />
  else if (list.isError && !list.data)
    body = <Failed error={list.error} onRetry={() => list.refetch()} />
  else if (items.length === 0)
    body = filtered ? (
      <Empty
        icon={LogIn}
        title="No matching sign-ins"
        body="Try another search, or fewer filters."
        action={
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => setFilters(cleared)}
          >
            Clear filters
          </Button>
        }
      />
    ) : (
      <Empty
        icon={LogIn}
        title="No sign-ins yet"
        body="Sign-ins, failed tries and sign-outs show up here from now on."
      />
    )
  else
    body = (
      <>
        {phone ? (
          <SignInRows items={items} showUser={admin} />
        ) : (
          <SignInTable
            items={items}
            showUser={admin}
            onPick={(value) => setFilters({ q: value })}
          />
        )}
        {list.hasNextPage && (
          <div className={cn("flex justify-center", phone ? "py-4" : "pt-2")}>
            <Button
              variant="outline"
              className="h-11 md:h-9"
              disabled={list.isFetchingNextPage}
              onClick={() => list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? "Loading…" : "Show older"}
            </Button>
          </div>
        )}
      </>
    )

  return (
    <>
      {bar}
      {body}
    </>
  )
}
