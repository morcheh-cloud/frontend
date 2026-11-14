"use client"

import {
  HardDrive,
  History,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Network,
  Pencil,
  RefreshCw,
  Server as ServerIcon,
  Settings,
  Shield,
  Star,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { type ReactNode, useEffect, useRef } from "react"
import { toast } from "sonner"

import {
  ActionSheet,
  AppBar,
  Missing,
  PageLoading,
} from "@/app/(panel)/dns/components/parts"
import {
  type Item,
  ItemMenu,
  type Note,
  Notices,
} from "@/app/(panel)/servers/[id]/components/parts"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  useCheckingAccounts,
  useCloudAccount,
  useCloudResources,
  useCloudServers,
  useRefreshAccount,
} from "../../api"
import {
  AccountStatusLine,
  accountHref,
  broken,
  ChangesTag,
  ProviderMark,
} from "../../components/account-parts"
import { useAccountMenu, useCloudActions } from "../../components/cloud-actions"
import { accountStatusMeta } from "../../components/meta"
import { useCloudCan } from "../../components/permissions"
import {
  type AccountTab,
  accountTabHref,
  buildModel,
  type Model,
  tabCounts,
  tabsOf,
  useAccountFilters,
} from "./model"
import { OverviewDesktop, OverviewPhone } from "./overview-tab"
import { plural } from "./parts"
import {
  BackupsTab,
  DisksTab,
  FirewallsTab,
  NetworksTab,
} from "./resource-tabs"
import { ServersDesktop, ServersPhone } from "./servers-tab"
import { SettingsDesktop, SettingsPhone } from "./settings-tab"

// One cloud account, in tabs: Overview, its servers, what else the provider
// holds for it (disks, firewalls, private networks, backup schedules) and
// how Morche reaches it. Read only, apart from power and rename.

export function AccountPageView() {
  const { id } = useParams<{ id: string }>()
  const isPhone = useIsPhone()
  const router = useRouter()
  const { account, pending, error, refetch } = useCloudAccount(id)
  const servers = useCloudServers(!!account)
  const resources = useCloudResources(id, !!account)

  usePageCrumbs(account ? [{ href: accountHref(id), label: account.name }] : [])
  useFollowWorkspace(account?.workspace_id)

  // Removed while open (here or elsewhere): back to the list.
  const seen = useRef(false)
  useEffect(() => {
    if (account) seen.current = true
    else if (seen.current && !pending) router.replace("/cloud")
  }, [account, pending, router])

  if (isPhone === null) return null
  if (!account) {
    if (pending) return <PageLoading />
    const gone = error instanceof ApiError && error.status === 404
    return (
      <Missing
        title={gone ? "No such account" : "Couldn't load the account"}
        body={
          gone
            ? "It was removed, or you don't have access to it."
            : (error?.message ?? "Something went wrong.")
        }
        href="/cloud"
        label="All accounts"
        onRetry={gone ? undefined : () => refetch()}
      />
    )
  }

  const model = buildModel(account, servers, resources)
  return isPhone ? (
    <AccountPhone model={model} />
  ) : (
    <AccountDesktop model={model} />
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────

const tabMeta: Record<AccountTab, { label: string; icon: ReactNode }> = {
  overview: { label: "Overview", icon: <LayoutDashboard /> },
  servers: { label: "Servers", icon: <ServerIcon /> },
  disks: { label: "Disks", icon: <HardDrive /> },
  firewalls: { label: "Firewalls", icon: <Shield /> },
  networks: { label: "Networks", icon: <Network /> },
  backups: { label: "Backups", icon: <History /> },
  settings: { label: "Settings", icon: <Settings /> },
}

// The tab in the URL, or Overview when this account doesn't have it.
function useCurrentTab(m: Model) {
  const f = useAccountFilters()
  const tabs = tabsOf(m)
  const tab = tabs.includes(f.tab) ? f.tab : "overview"
  return { f, tabs, tab, counts: tabCounts(m) }
}

function TabBody({
  model: m,
  tab,
  phone,
}: {
  model: Model
  tab: AccountTab
  phone: boolean
}) {
  switch (tab) {
    case "overview":
      return phone ? <OverviewPhone model={m} /> : <OverviewDesktop model={m} />
    case "servers":
      return phone ? <ServersPhone model={m} /> : <ServersDesktop model={m} />
    case "disks":
      return <DisksTab model={m} phone={phone} />
    case "firewalls":
      return <FirewallsTab model={m} phone={phone} />
    case "networks":
      return <NetworksTab model={m} phone={phone} />
    case "backups":
      return <BackupsTab model={m} phone={phone} />
    case "settings":
      return phone ? <SettingsPhone model={m} /> : <SettingsDesktop model={m} />
  }
}

// A plain click switches tabs in place; a modified one opens a new tab.
const plainClick = (e: React.MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

// ── Shared ───────────────────────────────────────────────────────────────

function useNotes(m: Model): Note[] {
  const actions = useCloudActions()
  const can = useCloudCan()
  const a = m.account
  const notes: Note[] = []
  if (broken(a)) {
    notes.push({
      key: "account",
      warn: a.status === "auth_failed" || a.status === "blocked",
      title: accountStatusMeta[a.status].label,
      body: a.status_message,
      action: can(a, "owner") ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.editAccount(a)}
        >
          Edit key
        </Button>
      ) : undefined,
    })
  }
  if (m.serversError) {
    notes.push({
      key: "servers",
      title: "Couldn't read the servers",
      body: m.serversError.message,
    })
  }
  if (m.resError && !broken(a)) {
    notes.push({
      key: "resources",
      warn: true,
      title: "Couldn't read disks, firewalls and networks",
      body: m.resError.message,
    })
  }
  for (const r of m.regions) {
    if (r.problems.length === 0) continue
    notes.push({
      key: `region-${r.code}`,
      warn: true,
      title: `Part of ${r.name} couldn't be read`,
      body: r.problems.join(" · "),
    })
  }
  return notes
}

function useReadAgain(id: string) {
  const refresh = useRefreshAccount(id)
  return {
    pending: refresh.isPending,
    run: () =>
      refresh.mutate(undefined, {
        onError: (e) => toast.error(e.message),
      }),
  }
}

// ── Desktop ──────────────────────────────────────────────────────────────

function AccountDesktop({ model: m }: { model: Model }) {
  const notes = useNotes(m)
  const { tab } = useCurrentTab(m)
  return (
    <div className="flex flex-col pb-24">
      <Header model={m} />
      <TabNav model={m} />
      <div className="flex flex-col gap-6 px-6 pt-6">
        <Notices notes={notes} />
        <TabBody model={m} tab={tab} phone={false} />
      </div>
    </div>
  )
}

function HeaderIcon({
  label,
  children,
}: {
  label: string
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} aria-label={label} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

// Who the account is, and the few things done to it often.
function Header({ model: m }: { model: Model }) {
  const a = m.account
  const actions = useCloudActions()
  const can = useCloudCan()
  const menu = useAccountMenu()
  const checking = useCheckingAccounts().has(a.id)
  const again = useReadAgain(a.id)

  return (
    <header className="flex items-center gap-4 px-6 pt-5 pb-4">
      <ProviderMark className="size-12 rounded-2xl" icon="size-6" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex min-w-0 items-center gap-2">
          <span dir="auto" className="truncate text-subheading font-normal">
            {a.name}
          </span>
          <span className="shrink-0 text-body-sm text-ash">
            {a.provider_label}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-caption">
          <AccountStatusLine account={a} checking={checking} />
          <ChangesTag allowed={a.allow_changes} />
          {a.key_hint && (
            <span
              title="The API key ends with these characters"
              className="inline-flex items-center gap-1.5 text-muted-foreground"
            >
              <KeyRound className="size-3.5" />
              <span className="font-mono">…{a.key_hint}</span>
            </span>
          )}
          {m.regions.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-3.5" />
              {plural(m.regions.length, "region")}
            </span>
          )}
          {a.description && (
            <span
              dir="auto"
              className="max-w-md truncate text-muted-foreground"
            >
              {a.description}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <HeaderIcon label="Read again">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={again.pending}
            onClick={again.run}
          >
            <RefreshCw className={cn(again.pending && "animate-spin")} />
          </Button>
        </HeaderIcon>
        {can(a, "owner") && (
          <HeaderIcon label="Edit account">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => actions.editAccount(a)}
            >
              <Pencil />
            </Button>
          </HeaderIcon>
        )}
        <HeaderIcon
          label={a.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={a.favorite}
            disabled={!can(a, "operator")}
            onClick={() => actions.toggleFavorite(a)}
          >
            <Star className={cn(a.favorite && "fill-brand text-brand")} />
          </Button>
        </HeaderIcon>
        <ItemMenu groups={menu(a)} label={`${a.name} actions`} />
      </div>
    </header>
  )
}

const tabClass =
  "relative flex h-11 shrink-0 items-center gap-2 rounded-lg px-2.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full hover:text-foreground hover:after:bg-mist focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:bg-brand [&_svg]:size-4 [&_svg]:shrink-0"

function TabNav({ model: m }: { model: Model }) {
  const { f, tabs, tab, counts } = useCurrentTab(m)
  return (
    <nav
      aria-label="Account sections"
      className="sticky top-[calc(3rem+1px)] z-20 border-b border-border bg-background/90 px-4 backdrop-blur-md"
    >
      <div className="no-scrollbar flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t}
            href={accountTabHref(m.account.id, t)}
            aria-current={t === tab ? "page" : undefined}
            onClick={(e) => {
              if (!plainClick(e)) return
              e.preventDefault()
              f.setTab(t)
            }}
            className={tabClass}
          >
            {tabMeta[t].icon}
            {tabMeta[t].label}
            {counts[t] !== undefined && (
              <span className="text-caption font-normal text-ash tabular-nums">
                {counts[t]}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}

// ── Phone ────────────────────────────────────────────────────────────────

function AccountPhone({ model: m }: { model: Model }) {
  const a = m.account
  const back = useBack("/cloud")
  const notes = useNotes(m)
  const menu = useAccountMenu()
  const checking = useCheckingAccounts().has(a.id)
  const again = useReadAgain(a.id)
  const [sheet, setSheet] = useOpen("cloud-account-sheet")
  const { tab } = useCurrentTab(m)

  const groups: Item[][] = [
    [
      {
        key: "read",
        label: "Read again",
        icon: <RefreshCw />,
        disabled: again.pending,
        onSelect: again.run,
      },
    ],
    ...menu(a),
  ]

  return (
    <div className="pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <AppBar
        title={a.name}
        subtitle={
          <>
            <span className="min-w-0 truncate">{a.provider_label}</span>
            <span aria-hidden>·</span>
            <AccountStatusLine
              account={a}
              checking={checking}
              className="shrink-0"
            />
          </>
        }
        path={accountHref(a.id)}
        onBack={back}
        onMenu={() => setSheet(true)}
        menuLabel="Account actions"
      >
        <PhoneTabs model={m} />
      </AppBar>
      {notes.length > 0 && (
        <div className="px-4 pt-4">
          <Notices notes={notes} />
        </div>
      )}
      <TabBody model={m} tab={tab} phone />
      <ActionSheet
        open={sheet}
        onOpenChange={setSheet}
        title={a.name}
        groups={groups}
      />
    </div>
  )
}

function PhoneTabs({ model: m }: { model: Model }) {
  const { f, tabs, tab, counts } = useCurrentTab(m)
  const current = useRef<HTMLButtonElement>(null)
  // Links can land on a late tab: centre its chip, again when the counts
  // arrive and widen the chips. Only the row scrolls, never the page.
  const widths = tabs.map((t) => counts[t] ?? "").join()
  // biome-ignore lint/correctness/useExhaustiveDependencies: on tab or chip size change
  useEffect(() => {
    const el = current.current
    const row = el?.parentElement
    if (!el || !row) return
    row.scrollLeft = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2
  }, [tab, widths])
  return (
    <nav
      aria-label="Account sections"
      className="relative no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2.5"
    >
      {tabs.map((t) => (
        <button
          key={t}
          ref={t === tab ? current : undefined}
          type="button"
          aria-current={t === tab ? "page" : undefined}
          onClick={() => f.setTab(t)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none active:bg-muted aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:font-medium aria-[current=page]:text-background"
        >
          {tabMeta[t].label}
          {counts[t] !== undefined && (
            <span className="tabular-nums opacity-70">{counts[t]}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
