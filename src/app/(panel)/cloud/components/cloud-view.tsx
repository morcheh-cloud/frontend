"use client"

import {
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Ellipsis,
  KeyRound,
  Plus,
  RefreshCw,
  Server,
} from "lucide-react"
import Link from "next/link"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useRef, useState } from "react"

import {
  Empty,
  type Item,
  ItemMenu,
  type Note,
  Notices,
  SearchBox,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type {
  CloudAccount,
  CloudAccountRead,
  CloudServer,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { chipClass, Tag, Th } from "../../dns/components/parts"
import {
  serverKey,
  useCheckingAccounts,
  useCloudAccounts,
  useCloudServers,
  useRefreshCloud,
} from "../api"
import {
  AccountCard,
  AccountCardSkeleton,
  AccountPhoneRow,
  AddAccountCard,
} from "./account-parts"
import { useAccountMenu, useCloudActions, useServerMenu } from "./cloud-actions"
import {
  accountStatusMeta,
  mainAddress,
  osText,
  ServerStateLabel,
  serverStateMeta,
  sizeText,
} from "./meta"
import { useCanAddCloud, useCloudCan } from "./permissions"

const tabs = ["accounts", "servers"] as const
const states = ["all", "running", "stopped", "other"] as const
type StateFilter = (typeof states)[number]

const stateLabels: Record<StateFilter, string> = {
  all: "All",
  running: "Running",
  stopped: "Off",
  other: "Other",
}

export const cloudFilters = {
  tab: parseAsStringLiteral(tabs).withDefault("accounts"),
  q: parseAsString.withDefault(""),
  account: parseAsString.withDefault(""),
  state: parseAsStringLiteral(states).withDefault("all"),
}

const useFilters = () => useQueryStates(cloudFilters, { history: "replace" })

const stateOf = (s: CloudServer): Exclude<StateFilter, "all"> =>
  s.state === "running" || s.state === "stopped" ? s.state : "other"

const sortAccounts = (list: CloudAccount[]) =>
  [...list].sort(
    (a, b) =>
      Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name),
  )

function useData() {
  const accounts = useCloudAccounts()
  const all = sortAccounts(accounts.data?.items ?? [])
  const servers = useCloudServers(all.length > 0)
  const [filters, setFilters] = useFilters()
  const { tab, q, state } = filters
  // A filter on an account that's gone shows everything.
  const account = all.some((a) => a.id === filters.account)
    ? filters.account
    : ""
  const byId = new Map(all.map((a) => [a.id, a]))
  const needle = q.trim().toLowerCase()
  const items = servers.data?.items ?? []
  const inAccount = items.filter((s) => !account || s.account_id === account)
  const counts: Record<StateFilter, number> = {
    all: inAccount.length,
    running: 0,
    stopped: 0,
    other: 0,
  }
  for (const s of inAccount) counts[stateOf(s)]++
  const shownServers = inAccount
    .filter((s) => state === "all" || stateOf(s) === state)
    .filter(
      (s) =>
        !needle ||
        [
          s.name,
          s.account_name,
          s.region_name,
          s.region,
          s.plan,
          osText(s),
          ...s.addresses.map((a) => a.ip),
        ].some((v) => v?.toLowerCase().includes(needle)),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
  const shownAccounts = all.filter(
    (a) =>
      !needle ||
      [a.name, a.description, a.provider_label].some((v) =>
        v.toLowerCase().includes(needle),
      ),
  )
  const filtering = !!needle || !!account || state !== "all"
  const serversOf = new Map<string, CloudServer[]>()
  for (const s of items) {
    const list = serversOf.get(s.account_id)
    if (list) list.push(s)
    else serversOf.set(s.account_id, [s])
  }
  return {
    serversOf,
    accounts,
    servers,
    all,
    byId,
    tab,
    q,
    account,
    state,
    setFilters,
    counts,
    shownServers,
    shownAccounts,
    filtering,
    serverCount: items.length,
  }
}

type Data = ReturnType<typeof useData>

// What went wrong reading each account, and accounts that see nothing.
function useNotes(d: Data): Note[] {
  const a = useCloudActions()
  const can = useCloudCan()
  const reads = d.servers.data?.accounts ?? []
  const notes: Note[] = []
  for (const r of reads) {
    if (d.account && r.id !== d.account) continue
    const account = d.byId.get(r.id)
    if (r.status !== "online") {
      // The account's card already says so.
      if (d.tab === "accounts") continue
      notes.push({
        key: `${r.id}-status`,
        warn: true,
        title: `Couldn't read ${r.name}`,
        body: r.message || accountStatusMeta[statusKey(r)].label,
        action: account && can(account, "owner") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => a.editAccount(account)}
          >
            Edit key
          </Button>
        ),
      })
      continue
    }
    for (const p of r.problems) {
      notes.push({
        key: `${r.id}-${p.region}`,
        warn: true,
        title: `${r.name}: couldn't read ${p.region}`,
        body: `${p.message} The other regions are shown.`,
      })
    }
    const count = d.servers.data?.items.filter((s) => s.account_id === r.id)
    if (d.tab === "servers" && count?.length === 0 && !r.problems.length) {
      notes.push({
        key: `${r.id}-empty`,
        title: `${r.name} sees no servers`,
        body: "The key works. If the account has servers, the key's access policy probably doesn't cover Cloud Server: check it in the provider's panel.",
      })
    }
  }
  return notes
}

const statusKey = (r: CloudAccountRead) =>
  (r.status in accountStatusMeta
    ? r.status
    : "error") as keyof typeof accountStatusMeta

export function CloudView() {
  const isPhone = useIsPhone()
  if (isPhone === null) return null
  return isPhone ? <CloudMobile /> : <CloudDesktop />
}

function CloudDesktop() {
  const actions = useCloudActions()
  const canAdd = useCanAddCloud()
  const d = useData()
  const notes = useNotes(d)
  const refresh = useRefreshCloud()
  const busy = refresh.isPending || d.servers.isFetching

  return (
    <div className="flex flex-col gap-4 px-6 pt-5 pb-24">
      {d.accounts.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4">
          <AccountCardSkeleton />
          <AccountCardSkeleton />
          <AccountCardSkeleton />
        </div>
      ) : d.accounts.isError && !d.accounts.data ? (
        <Failed error={d.accounts.error} onRetry={() => d.accounts.refetch()} />
      ) : d.all.length === 0 ? (
        <NoAccounts onAdd={canAdd ? actions.addAccount : undefined} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Show"
              value={d.tab}
              onChange={(tab) => d.setFilters({ tab })}
              items={[
                { value: "accounts", label: `Accounts · ${d.all.length}` },
                { value: "servers", label: `Servers · ${d.serverCount}` },
              ]}
            />
            <SearchBox
              value={d.q}
              onChange={(q) => d.setFilters({ q: q || null })}
              placeholder={
                d.tab === "servers"
                  ? "Search name, address, region"
                  : "Search accounts"
              }
              label={d.tab === "servers" ? "Search servers" : "Search accounts"}
            />
            {d.tab === "servers" && (
              <>
                {d.all.length > 1 && (
                  <FilterMenu
                    label="Account"
                    value={d.account}
                    onChange={(account) =>
                      d.setFilters({ account: account || null })
                    }
                    options={[
                      { value: "", label: "All accounts" },
                      ...d.all.map((a) => ({ value: a.id, label: a.name })),
                    ]}
                  />
                )}
                <FilterMenu
                  label="State"
                  value={d.state}
                  onChange={(state) =>
                    d.setFilters({
                      state: state === "all" ? null : (state as StateFilter),
                    })
                  }
                  options={states.map((s) => ({
                    value: s,
                    label: stateLabels[s],
                    count: d.counts[s],
                  }))}
                />
              </>
            )}
            <span className="flex-1" />
            {d.servers.data && (
              <span className="hidden text-caption text-ash xl:inline">
                Read {timeAgo(d.servers.data.read_at)}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Read again from the provider"
              title="Read again from the provider"
              disabled={busy}
              onClick={() =>
                refresh.mutate(undefined, {
                  onError: (e) => d.servers.refetch().then(() => e),
                })
              }
            >
              <RefreshCw className={cn(busy && "animate-spin")} />
            </Button>
            {canAdd && (
              <Button onClick={() => actions.addAccount()}>
                <Plus />
                Add account
              </Button>
            )}
          </div>
          <Notices notes={notes} />
          {d.tab === "servers" ? (
            <ServersTable d={d} />
          ) : (
            <AccountGrid
              d={d}
              onAdd={canAdd && !d.q ? actions.addAccount : undefined}
            />
          )}
        </>
      )}
    </div>
  )
}

function FilterMenu({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; count?: number }[]
}) {
  const current = options.find((o) => o.value === value) ?? options[0]
  const on = value !== options[0].value
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-1.5 px-3",
              on && "border-brand/50 text-brand-strong",
            )}
          />
        }
      >
        <span className="text-muted-foreground">{label}:</span>
        <span className="max-w-40 truncate">{current.label}</span>
        <ChevronDown className="size-4 text-ash" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((o) => (
              <DropdownMenuRadioItem key={o.value} value={o.value}>
                <span className="flex-1 truncate">{o.label}</span>
                {o.count != null && (
                  <span className="text-caption text-ash tabular-nums">
                    {o.count}
                  </span>
                )}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ServersTable({ d }: { d: Data }) {
  if (d.servers.isPending) return <TableSkeleton />
  if (d.servers.isError && !d.servers.data) {
    return (
      <Empty
        icon={CloudOff}
        title="Couldn't read the servers"
        body={d.servers.error.message}
        action={
          <Button variant="outline" onClick={() => d.servers.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  if (d.shownServers.length === 0) return <NoServers d={d} />
  const manyAccounts = d.all.length > 1 && !d.account
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Name</Th>
            <Th>State</Th>
            {manyAccounts && <Th>Account</Th>}
            <Th>Region</Th>
            <Th>Address</Th>
            <Th className="hidden @4xl:table-cell">Size</Th>
            <Th className="hidden @3xl:table-cell">In Morche</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {d.shownServers.map((s) => (
            <ServerRow key={serverKey(s)} server={s} account={manyAccounts} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ServerRow({
  server: s,
  account,
}: {
  server: CloudServer
  account: boolean
}) {
  const a = useCloudActions()
  const menu = useServerMenu()
  const address = mainAddress(s)
  const linked = s.linked[0]
  return (
    <tr className="h-14 hover:bg-subtle">
      <td className="max-w-72 px-3">
        <button
          type="button"
          onClick={() => a.details(s)}
          className="block max-w-full text-start outline-none hover:text-brand focus-visible:text-brand"
        >
          <span className="block truncate font-medium">{s.name}</span>
          {osText(s) && (
            <span className="block truncate text-caption text-ash">
              {osText(s)}
            </span>
          )}
        </button>
      </td>
      <td className="px-3">
        <ServerStateLabel
          server={s}
          className={serverStateMeta[s.state].tone}
        />
      </td>
      {account && (
        <td className="max-w-48 truncate px-3 text-muted-foreground">
          {s.account_name}
        </td>
      )}
      <td className="px-3 whitespace-nowrap text-muted-foreground">
        {s.region_name || s.region}
      </td>
      <td className="px-3">
        {address ? (
          <button
            type="button"
            title="Copy"
            onClick={() => a.copy(address, "Address")}
            className="rounded font-mono text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {address}
          </button>
        ) : (
          <span className="text-ash">—</span>
        )}
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
        {sizeText(s) || "—"}
      </td>
      <td className="hidden px-3 @3xl:table-cell">
        {linked ? (
          <Link
            href={`/servers/${linked.id}`}
            className="inline-flex max-w-40 items-center gap-1.5 truncate text-brand hover:underline"
          >
            {linked.name}
          </Link>
        ) : (
          <span className="text-ash">—</span>
        )}
      </td>
      <td className="pe-3">
        <ItemMenu
          groups={menu(s, { details: true })}
          label={`${s.name} actions`}
        />
      </td>
    </tr>
  )
}

function AccountGrid({ d, onAdd }: { d: Data; onAdd?: () => void }) {
  const checking = useCheckingAccounts()
  if (d.shownAccounts.length === 0) {
    return (
      <Empty icon={Cloud} title="No account matches" body="Try another name." />
    )
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4">
      {d.shownAccounts.map((a) => (
        <AccountCard
          key={a.id}
          account={a}
          servers={d.servers.data ? (d.serversOf.get(a.id) ?? []) : undefined}
          checking={checking.has(a.id)}
        />
      ))}
      {onAdd && <AddAccountCard onAdd={onAdd} />}
    </div>
  )
}

function NoServers({ d }: { d: Data }) {
  return (
    <Empty
      icon={Server}
      title={d.filtering ? "No server matches" : "No servers to show"}
      body={
        d.filtering
          ? "Try another name, account or state."
          : "The accounts are connected but see no servers. If you expected some, check each key's access policy in the provider's panel."
      }
      action={
        d.filtering && (
          <Button
            variant="outline"
            onClick={() =>
              d.setFilters({ q: null, account: null, state: null })
            }
          >
            Clear filters
          </Button>
        )
      }
    />
  )
}

function NoAccounts({ onAdd }: { onAdd?: () => void }) {
  return (
    <Empty
      icon={Cloud}
      title={onAdd ? "Connect a cloud account" : "No cloud accounts to show"}
      body={
        onAdd
          ? "Add an ArvanCloud API key and its servers show up here: their state, size and addresses, with power and rename when you allow changes. Add as many accounts as you have keys."
          : "Nothing here is shared with you yet. Ask the workspace owner to add an account."
      }
      action={
        onAdd && (
          <Button onClick={onAdd}>
            <Plus />
            Add account
          </Button>
        )
      }
    />
  )
}

function Failed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Empty
      icon={CloudOff}
      title="Couldn't load cloud accounts"
      body={error.message || "The server didn't answer. Try again."}
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-14 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="ms-auto h-4 w-56" />
        </div>
      ))}
    </div>
  )
}

// ── Phones ────────────────────────────────────────────────────────────────

function CloudMobile() {
  const actions = useCloudActions()
  const canAdd = useCanAddCloud()
  const d = useData()
  const notes = useNotes(d)
  const refresh = useRefreshCloud()
  const checking = useCheckingAccounts()
  const serverMenu = useServerMenu()
  const accountMenu = useAccountMenu()
  const [sheetOpen, setSheetOpen] = useOpen("cloud-row-sheet")
  const [sheet, setSheet] = useState<
    { kind: "server"; key: string } | { kind: "account"; id: string } | null
  >(null)
  const [pickOpen, setPickOpen] = useOpen("cloud-account-pick")
  // Keep the last tapped row so its sheet can animate out.
  const last = useRef<{ title: string; groups: Item[][] } | null>(null)

  let current = last.current
  if (sheet?.kind === "server") {
    const s = d.servers.data?.items.find((x) => serverKey(x) === sheet.key)
    if (s) current = { title: s.name, groups: serverMenu(s, { details: true }) }
  } else if (sheet?.kind === "account") {
    const a = d.byId.get(sheet.id)
    if (a) current = { title: a.name, groups: accountMenu(a) }
  }
  if (current) last.current = current

  const busy = refresh.isPending || d.servers.isFetching
  const accountName = d.account ? d.byId.get(d.account)?.name : undefined

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <h1 className="text-heading font-light">Cloud</h1>
        <HelpButton
          href={guideHref("cloud")}
          label="Cloud guide"
          className="ms-auto"
        />
        {d.all.length > 0 && (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Read again from the provider"
            disabled={busy}
            onClick={() => refresh.mutate()}
          >
            <RefreshCw className={cn("size-5", busy && "animate-spin")} />
          </Button>
        )}
        {canAdd && (
          <Button
            size="icon-lg"
            aria-label="Add account"
            className="rounded-full"
            onClick={() => actions.addAccount()}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </header>

      {d.accounts.isPending ? (
        <ListSkeleton />
      ) : d.accounts.isError && !d.accounts.data ? (
        <Failed error={d.accounts.error} onRetry={() => d.accounts.refetch()} />
      ) : d.all.length === 0 ? (
        <NoAccounts onAdd={canAdd ? actions.addAccount : undefined} />
      ) : (
        <>
          <div className="flex flex-col gap-3 pt-4">
            <SearchBox
              value={d.q}
              onChange={(q) => d.setFilters({ q: q || null })}
              placeholder={
                d.tab === "servers" ? "Search servers" : "Search accounts"
              }
              label={d.tab === "servers" ? "Search servers" : "Search accounts"}
              className="mx-4"
            />
            <nav
              aria-label="Show"
              className="no-scrollbar flex gap-2 overflow-x-auto px-4"
            >
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-current={d.tab === t ? "page" : undefined}
                  onClick={() => d.setFilters({ tab: t })}
                  className={chipClass}
                >
                  {t === "servers" ? "Servers" : "Accounts"}
                  <span className="tabular-nums opacity-70">
                    {t === "servers" ? d.serverCount : d.all.length}
                  </span>
                </button>
              ))}
              {d.tab === "servers" && (
                <>
                  <span aria-hidden className="w-px shrink-0 bg-border" />
                  {d.all.length > 1 && (
                    <button
                      type="button"
                      aria-current={d.account ? "page" : undefined}
                      onClick={() => setPickOpen(true)}
                      className={chipClass}
                    >
                      <span className="max-w-32 truncate">
                        {accountName ?? "All accounts"}
                      </span>
                      <ChevronDown className="size-4" />
                    </button>
                  )}
                  {states.slice(1).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-current={d.state === s ? "page" : undefined}
                      onClick={() =>
                        d.setFilters({ state: d.state === s ? null : s })
                      }
                      className={chipClass}
                    >
                      {stateLabels[s]}
                      <span className="tabular-nums opacity-70">
                        {d.counts[s]}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </nav>
          </div>
          <Notices notes={notes} />
          <div className="pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {d.tab === "servers" ? (
              d.servers.isPending ? (
                <ListSkeleton />
              ) : d.servers.isError && !d.servers.data ? (
                <Empty
                  icon={CloudOff}
                  title="Couldn't read the servers"
                  body={d.servers.error.message}
                  action={
                    <Button
                      variant="outline"
                      className="h-11 w-full"
                      onClick={() => d.servers.refetch()}
                    >
                      Try again
                    </Button>
                  }
                />
              ) : d.shownServers.length === 0 ? (
                <NoServers d={d} />
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {d.shownServers.map((s) => (
                    <PhoneRow
                      key={serverKey(s)}
                      label={`${s.name} actions`}
                      onOpen={() => actions.details(s)}
                      onMore={() => {
                        setSheet({ kind: "server", key: serverKey(s) })
                        setSheetOpen(true)
                      }}
                      title={s.name}
                      status={
                        <ServerStateLabel
                          server={s}
                          className={cn(
                            "text-caption",
                            serverStateMeta[s.state].tone,
                          )}
                        />
                      }
                      line={[
                        mainAddress(s),
                        s.region_name || s.region,
                        d.all.length > 1 && !d.account && s.account_name,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      aside={
                        s.linked.length > 0 && <Tag tone="brand">In Morche</Tag>
                      }
                    />
                  ))}
                </ul>
              )
            ) : d.shownAccounts.length === 0 ? (
              <Empty
                icon={Cloud}
                title="No account matches"
                body="Try another name."
              />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {d.shownAccounts.map((a) => (
                  <AccountPhoneRow
                    key={a.id}
                    account={a}
                    servers={
                      d.servers.data ? (d.serversOf.get(a.id) ?? []) : undefined
                    }
                    checking={checking.has(a.id)}
                    onMore={() => {
                      setSheet({ kind: "account", id: a.id })
                      setSheetOpen(true)
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {current && (
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={current.title}
        >
          <SheetItems groups={current.groups} onOpenChange={setSheetOpen} />
        </BottomSheet>
      )}
      <BottomSheet open={pickOpen} onOpenChange={setPickOpen} title="Account">
        <ul className="divide-y divide-border">
          {[{ id: "", name: "All accounts" }, ...d.all].map((a) => (
            <li key={a.id}>
              <SheetAction
                icon={<KeyRound />}
                label={a.name}
                trailing={
                  d.account === a.id ? (
                    <Check className="size-5 text-brand" />
                  ) : undefined
                }
                onClick={() => {
                  d.setFilters({ account: a.id || null })
                  setPickOpen(false)
                }}
              />
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  )
}

function PhoneRow({
  title,
  status,
  line,
  aside,
  label,
  onOpen,
  onMore,
}: {
  title: string
  status: ReactNode
  line: string
  aside?: ReactNode
  label: string
  onOpen: () => void
  onMore: () => void
}) {
  return (
    <li className="flex items-center">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 text-start outline-none active:bg-muted"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-body font-medium">{title}</span>
            {status}
          </span>
          {line && (
            <span className="block truncate text-body-sm text-muted-foreground">
              {line}
            </span>
          )}
        </span>
        {aside}
      </button>
      <button
        type="button"
        aria-label={label}
        onClick={onMore}
        className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
      >
        <Ellipsis className="size-5" />
      </button>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul className="mt-3 divide-y divide-border border-y border-border">
      {Array.from({ length: 4 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <li key={i} className="flex h-[4.5rem] items-center gap-3 px-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </li>
      ))}
    </ul>
  )
}
