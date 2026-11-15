"use client"

import { Cloud, CloudOff, Plus, RefreshCw } from "lucide-react"
import { parseAsString, useQueryStates } from "nuqs"
import { useRef, useState } from "react"

import {
  Empty,
  type Item,
  type Note,
  Notices,
  SearchBox,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { CloudAccount, CloudServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
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
import { useAccountMenu, useCloudActions } from "./cloud-actions"
import { useCanAddCloud } from "./permissions"

// Servers live on each account's page; this page lists the accounts.
const useFilters = () =>
  useQueryStates({ q: parseAsString.withDefault("") }, { history: "replace" })

const sortAccounts = (list: CloudAccount[]) =>
  [...list].sort(
    (a, b) =>
      Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name),
  )

function useData() {
  const accounts = useCloudAccounts()
  const all = sortAccounts(accounts.data?.items ?? [])
  const servers = useCloudServers(all.length > 0)
  const [{ q }, setFilters] = useFilters()
  const needle = q.trim().toLowerCase()
  const shownAccounts = all.filter(
    (a) =>
      !needle ||
      [a.name, a.description, a.provider_label].some((v) =>
        v.toLowerCase().includes(needle),
      ),
  )
  const serversOf = new Map<string, CloudServer[]>()
  for (const s of servers.data?.items ?? []) {
    const list = serversOf.get(s.account_id)
    if (list) list.push(s)
    else serversOf.set(s.account_id, [s])
  }
  return {
    serversOf,
    accounts,
    servers,
    all,
    byId: new Map(all.map((a) => [a.id, a])),
    q,
    setFilters,
    shownAccounts,
  }
}

type Data = ReturnType<typeof useData>

// Regions an account couldn't read (a failed account says so on its card).
function useNotes(d: Data): Note[] {
  const notes: Note[] = []
  for (const r of d.servers.data?.accounts ?? []) {
    if (r.status !== "online") continue
    for (const p of r.problems) {
      notes.push({
        key: `${r.id}-${p.region}`,
        warn: true,
        title: `${r.name}: couldn't read ${p.region}`,
        body: `${p.message} The other regions are shown.`,
      })
    }
  }
  return notes
}

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
            <SearchBox
              value={d.q}
              onChange={(q) => d.setFilters({ q: q || null })}
              placeholder="Search accounts"
              label="Search accounts"
            />
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
          <AccountGrid
            d={d}
            onAdd={canAdd && !d.q ? actions.addAccount : undefined}
          />
        </>
      )}
    </div>
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

// ── Phones ────────────────────────────────────────────────────────────────

function CloudMobile() {
  const actions = useCloudActions()
  const canAdd = useCanAddCloud()
  const d = useData()
  const notes = useNotes(d)
  const refresh = useRefreshCloud()
  const checking = useCheckingAccounts()
  const accountMenu = useAccountMenu()
  const [sheetOpen, setSheetOpen] = useOpen("cloud-row-sheet")
  const [sheetId, setSheetId] = useState<string | null>(null)
  // Keep the last tapped row so its sheet can animate out.
  const last = useRef<{ title: string; groups: Item[][] } | null>(null)

  let current = last.current
  const tapped = sheetId ? d.byId.get(sheetId) : undefined
  if (tapped) current = { title: tapped.name, groups: accountMenu(tapped) }
  if (current) last.current = current

  const busy = refresh.isPending || d.servers.isFetching

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
          <SearchBox
            value={d.q}
            onChange={(q) => d.setFilters({ q: q || null })}
            placeholder="Search accounts"
            label="Search accounts"
            className="mx-4 mt-4"
          />
          <Notices notes={notes} />
          <div className="pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {d.shownAccounts.length === 0 ? (
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
                      setSheetId(a.id)
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
    </>
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
