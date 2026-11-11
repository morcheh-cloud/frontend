"use client"

import {
  ArrowDownUp,
  ArrowUpCircle,
  CalendarClock,
  Ellipsis,
  Eraser,
  ListRestart,
  PackageX,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  ShieldPlus,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { newCronjobHref } from "@/app/(panel)/cronjobs/components/meta"
import { useCronjobCan } from "@/app/(panel)/cronjobs/components/permissions"
import { BottomSheet } from "@/components/bottom-sheet"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { progressText } from "@/components/jobs/meta"
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
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { PackagesOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  type Item,
  ItemMenu,
  Loading,
  type Note,
  Notices,
  SearchBox,
  Segmented,
  SheetItems,
} from "../../components/parts"
import { usePowerActions } from "../../components/power/power"
import { SectionActions } from "../../components/section-actions"
import { useServerPage } from "../../components/server-page"
import { ago, fullTime } from "../../users/components/meta"
import { usePackages } from "../api"
import { HistoryTab } from "./history-tab"
import {
  managerLabels,
  type Show,
  type Sort,
  showCount,
  showLabels,
  shows,
  type Tab,
  usePackageFilters,
} from "./meta"
import { PackagesActionsProvider, usePackagesActions } from "./packages-actions"
import { InstalledTab, UpdatesTab } from "./packages-list"

// Lists older than this are called out: updates may be missing from them.
const STALE_DAYS = 7

export function PackagesView() {
  const { server, phone } = useServerPage()
  const query = usePackages(server.id)
  const o = query.data

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Read the packages again"
      disabled={query.isFetching}
      onClick={() => query.refetch()}
    >
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
    </Button>
  )

  if (!o) {
    return (
      <>
        <SectionActions>{refresh}</SectionActions>
        <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
          {query.error ? (
            <Empty
              icon={TriangleAlert}
              title="Couldn't read the packages"
              body={query.error.message}
              className="max-md:mt-4"
              action={
                <Button variant="outline" onClick={() => query.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : (
            <Loading phone={phone} />
          )}
        </div>
      </>
    )
  }

  if (o.manager === "none") {
    return (
      <>
        <SectionActions>{refresh}</SectionActions>
        <Empty
          icon={PackageX}
          title="No package manager found"
          body="Morche works with apt, dnf, yum, zypper, apk and pacman. None of them is on this server's path."
          className="max-md:mt-4"
        />
      </>
    )
  }

  return (
    <PackagesActionsProvider overview={o}>
      <Content refresh={refresh} />
    </PackagesActionsProvider>
  )
}

function Content({ refresh }: { refresh: ReactNode }) {
  const { filters } = usePackageFilters()
  let body: ReactNode
  if (filters.tab === "updates") body = <UpdatesTab />
  else if (filters.tab === "history") body = <HistoryTab />
  else body = <InstalledTab />
  return (
    <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
      <Bar refresh={refresh} />
      <Notes />
      {body}
    </div>
  )
}

// ---- Bar ----

// Tabs, search, filters, a quiet state line and the actions in one row.
// Phones stack it: search + actions, then a row of scrolling chips.
function Bar({ refresh }: { refresh: ReactNode }) {
  const { phone } = useServerPage()
  const a = usePackagesActions()
  const o = a.overview
  const { filters, setFilters } = usePackageFilters()
  const tab = filters.tab
  const installed = o.packages.filter((p) => p.state !== "config-files").length

  const tabs = (
    <Segmented
      label="Show"
      items={[
        { value: "installed", label: `Installed · ${installed}` },
        {
          value: "updates",
          label: o.updates ? `Updates · ${o.updates}` : "Updates",
        },
        ...(o.capabilities.history
          ? [{ value: "history" as const, label: "History" }]
          : []),
      ]}
      value={tab}
      onChange={(t: Tab) =>
        setFilters({
          tab: t === "installed" ? null : t,
          q: null,
          show: null,
          kind: null,
        })
      }
    />
  )

  const search = (
    <SearchBox
      value={filters.q}
      onChange={(q) => setFilters({ q: q || null })}
      placeholder={
        tab === "history" ? "Search package or command" : "Search packages"
      }
      label="Search packages"
      className="min-w-0 flex-1 md:max-w-72 md:min-w-36"
    />
  )

  const kind = tab === "updates" &&
    o.capabilities.security &&
    o.updates > 0 && (
      <Segmented
        label="Updates to show"
        items={[
          { value: "all", label: "All" },
          {
            value: "security",
            label: `Security · ${o.security_updates}`,
          },
        ]}
        value={filters.kind}
        onChange={(k) => setFilters({ kind: k === "all" ? null : k })}
      />
    )

  let primary: ReactNode = null
  if (tab === "updates" && a.canChange && o.updates > 0) {
    primary = (
      <Button
        size={phone ? "icon-lg" : "default"}
        className="md:h-9"
        aria-label="Upgrade all"
        disabled={a.locked}
        onClick={() => a.review({ action: "upgrade-all", mode: "all" })}
      >
        <ArrowUpCircle />
        {!phone && "Upgrade all"}
      </Button>
    )
  } else if (tab === "updates" && a.canRefresh) {
    primary = (
      <Button
        variant="outline"
        size={phone ? "icon-lg" : "default"}
        className="md:h-9"
        aria-label="Check for updates"
        disabled={a.locked || a.refreshing}
        onClick={a.refreshLists}
      >
        <ListRestart />
        {!phone && "Check for updates"}
      </Button>
    )
  } else if (tab !== "updates" && a.canChange) {
    primary = (
      <Button
        size={phone ? "icon-lg" : "default"}
        className="md:h-9"
        aria-label="Install package"
        disabled={a.locked}
        onClick={a.install}
      >
        <Plus />
        {!phone && "Install package"}
      </Button>
    )
  }

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          {search}
          {refresh}
          <MoreSheet />
          {primary}
        </div>
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {tabs}
          {kind}
          {tab === "installed" && <ShowChips />}
        </div>
        <State o={o} />
      </div>
    )
  }

  return (
    <div className="@container flex flex-wrap items-center gap-2">
      {tabs}
      <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      {search}
      {tab === "installed" && (
        <>
          <ShowMenu />
          <SortMenu />
        </>
      )}
      {kind}
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <State o={o} className="me-2 hidden @4xl:flex" />
        {refresh}
        <MoreMenu />
        {primary}
      </div>
    </div>
  )
}

// "APT · lists from 2h ago", or the running change.
function State({ o, className }: { o: PackagesOverview; className?: string }) {
  const a = usePackagesActions()
  if (a.job) {
    return (
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5 truncate text-caption text-muted-foreground",
          className,
        )}
      >
        <RefreshCw className="size-3.5 shrink-0 animate-spin text-brand" />
        <span className="truncate">{progressText(a.job)}</span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 truncate text-caption whitespace-nowrap text-muted-foreground",
        className,
      )}
      title={o.refreshed_at ? fullTime(o.refreshed_at) : undefined}
    >
      {managerLabels[o.manager]}
      {o.refreshed_at
        ? ` · lists from ${ago(o.refreshed_at)}`
        : " · lists never refreshed"}
    </span>
  )
}

const showOrder = shows

function ShowMenu() {
  const a = usePackagesActions()
  const { filters, setFilters } = usePackageFilters()
  const count = (s: Show) => showCount(a.overview, s)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-1.5 px-3",
              filters.show !== "all" && "border-brand/50 text-brand-strong",
            )}
          />
        }
      >
        <SlidersHorizontal className="size-4" />
        {filters.show === "all"
          ? "All packages"
          : `${showLabels[filters.show]} · ${count(filters.show)}`}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.show}
            onValueChange={(v) =>
              setFilters({ show: v === "all" ? null : (v as Show) })
            }
          >
            {showOrder
              .filter((s) => s === "all" || s === filters.show || count(s) > 0)
              .map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  <span className="flex-1">{showLabels[s]}</span>
                  <span className="text-caption text-ash tabular-nums">
                    {count(s)}
                  </span>
                </DropdownMenuRadioItem>
              ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const sortLabels: Record<Sort, string> = {
  name: "Name",
  size: "Size",
  changed: "Last changed",
}

function SortMenu() {
  const { filters, setFilters } = usePackageFilters()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="h-9 gap-1.5 px-3" />}
        aria-label={`Sort by ${sortLabels[filters.sort]}`}
      >
        <ArrowDownUp className="size-4" />
        {sortLabels[filters.sort]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.sort}
            onValueChange={(v) =>
              setFilters({ sort: v === "name" ? null : (v as Sort) })
            }
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ShowChips() {
  const a = usePackagesActions()
  const { filters, setFilters } = usePackageFilters()
  return showOrder
    .filter(
      (s) => s === "all" || s === filters.show || showCount(a.overview, s) > 0,
    )
    .map((s) => (
      <button
        key={s}
        type="button"
        aria-pressed={filters.show === s}
        onClick={() => setFilters({ show: s === "all" ? null : s })}
        className="h-11 shrink-0 rounded-full border border-border px-4 text-body-sm whitespace-nowrap text-muted-foreground aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
      >
        {showLabels[s]}
        {s !== "all" && ` · ${showCount(a.overview, s)}`}
      </button>
    ))
}

// ---- More actions ----

function useMoreItems(): Item[][] {
  const a = usePackagesActions()
  const { server } = useServerPage()
  const cron = useCronjobCan(server.workspace_id)
  const router = useRouter()
  const o = a.overview
  const caps = o.capabilities
  const off = a.locked

  const lists: Item[] = []
  if (a.canRefresh) {
    lists.push({
      key: "refresh",
      label: "Check for updates",
      icon: <ListRestart />,
      disabled: off || a.refreshing,
      onSelect: a.refreshLists,
    })
  }
  if (a.canChange && o.updates > 0) {
    lists.push({
      key: "upgrade-all",
      label: `Upgrade all (${o.updates})`,
      icon: <ArrowUpCircle />,
      disabled: off,
      onSelect: () => a.review({ action: "upgrade-all", mode: "all" }),
    })
  }
  if (a.canChange && caps.security && o.security_updates > 0) {
    lists.push({
      key: "security",
      label: `Install security updates (${o.security_updates})`,
      icon: <ShieldPlus />,
      disabled: off,
      onSelect: () => a.review({ action: "upgrade-all", mode: "security" }),
    })
  }
  if (a.canChange && o.manager === "apt") {
    lists.push({
      key: "full",
      label: "Full upgrade…",
      icon: <Sparkles />,
      disabled: off,
      onSelect: () => a.review({ action: "upgrade-all", mode: "full" }),
    })
  }

  const tidy: Item[] = []
  if (a.canChange && caps.autoremove) {
    tidy.push({
      key: "autoremove",
      label: o.removable
        ? `Remove unneeded (${o.removable})`
        : "Remove unneeded",
      icon: <PackageX />,
      disabled: off || o.removable === 0,
      onSelect: () => a.review({ action: "autoremove" }),
    })
  }
  if (a.canChange) {
    tidy.push({
      key: "clean",
      label:
        o.cache_bytes > 0
          ? `Empty the cache (${formatSize(o.cache_bytes)})`
          : "Empty the cache",
      icon: <Eraser />,
      disabled: off || o.cache_bytes === 0,
      onSelect: () => a.review({ action: "clean" }),
    })
  }

  const auto: Item[] = []
  if (a.canChange && caps.auto_updates && o.auto_updates.supported) {
    const on = o.auto_updates.enabled
    auto.push({
      key: "auto",
      label: on ? "Turn automatic updates off" : "Turn automatic updates on",
      icon: <ShieldCheck />,
      stay: true,
      disabled: a.autoPending || (!on && !!o.auto_updates.missing),
      trailing: (
        <Switch
          checked={on}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none"
        />
      ),
      onSelect: () => a.setAutoUpdates(!on),
    })
  }
  // A cron job that upgrades this server on a schedule (Engineer on the
  // workspace to save one, Engineer on the server to upgrade it).
  if (a.canChange && cron.edit) {
    auto.push({
      key: "schedule",
      label: "Schedule upgrades…",
      icon: <CalendarClock />,
      onSelect: () =>
        router.push(
          newCronjobHref({
            action: "package-upgrade",
            server: server.id,
            serverName: server.name,
          }),
        ),
    })
  }
  return [lists, tidy, auto]
}

function MoreMenu() {
  const groups = useMoreItems()
  return (
    <ItemMenu
      groups={groups}
      label="More package actions"
      trigger={
        <Button
          variant="outline"
          size="icon"
          className="md:size-9"
          aria-label="More package actions"
        >
          <Ellipsis />
        </Button>
      }
    />
  )
}

function MoreSheet() {
  const groups = useMoreItems()
  const [open, setOpen] = useOpen("packages-more")
  if (groups.every((g) => g.length === 0)) return null
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="More package actions"
        onClick={() => setOpen(true)}
      >
        <Ellipsis />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Packages">
        <SheetItems groups={groups} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}

// ---- Notices ----

function Notes() {
  const { can } = useServerPage()
  const a = usePackagesActions()
  const o = a.overview
  const jobs = useJobActions()
  const power = usePowerActions()
  const { filters, setFilters } = usePackageFilters()
  const out: Note[] = []

  if (a.job) {
    out.push({
      key: "job",
      title: a.job.title,
      body: `${progressText(a.job)}. Other package changes wait until it ends.`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => a.job && jobs.show(a.job.id)}
        >
          Details
        </Button>
      ),
    })
  }
  if (o.access === "user") {
    out.push({
      key: "access",
      title: "This login can only look",
      body: "Installing, upgrading or removing packages needs root, or sudo without a password.",
      warn: true,
    })
  }
  if (o.reboot_required) {
    const list = o.reboot_packages ?? []
    out.push({
      key: "reboot",
      title: "Restart the server to finish the updates",
      body: list.length
        ? `Waiting on ${list.slice(0, 5).join(", ")}${list.length > 5 ? ` and ${list.length - 5} more` : ""}.`
        : "Some updated parts (often the kernel) only take effect after a restart.",
      warn: true,
      action: can("operator") ? (
        <Button
          variant="outline"
          size="sm"
          disabled={!!power.blocked}
          title={power.blocked ?? undefined}
          onClick={() => power.ask("reboot")}
        >
          <Power />
          Restart…
        </Button>
      ) : undefined,
    })
  }
  const broken = showCount(o, "broken")
  if (broken > 0) {
    out.push({
      key: "broken",
      title: `${broken} ${broken === 1 ? "package is" : "packages are"} half installed`,
      body: "A change was cut off. Reinstall them, or run the manager's repair by hand in the terminal (apt: dpkg --configure -a).",
      warn: true,
      action:
        filters.show !== "broken" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ tab: null, show: "broken", q: null })}
          >
            Show
          </Button>
        ) : undefined,
    })
  }
  if (filters.tab !== "history" && o.refreshed_at) {
    const days = (Date.now() - Date.parse(o.refreshed_at)) / 86_400_000
    if (days > STALE_DAYS) {
      out.push({
        key: "stale",
        title: `The package lists are ${Math.floor(days)} days old`,
        body: "Newer updates may be missing. Check for updates to download fresh lists.",
        action: a.canRefresh ? (
          <Button
            variant="outline"
            size="sm"
            disabled={a.locked || a.refreshing}
            onClick={a.refreshLists}
          >
            Check now
          </Button>
        ) : undefined,
      })
    }
  }
  if (filters.tab === "installed" && o.security_updates > 0) {
    out.push({
      key: "security",
      title: `${o.security_updates} security ${o.security_updates === 1 ? "update is" : "updates are"} waiting`,
      body: "They fix known weaknesses in installed packages.",
      warn: true,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setFilters({
              tab: "updates",
              kind: "security",
              q: null,
              show: null,
            })
          }
        >
          Show
        </Button>
      ),
    })
  }
  if (
    filters.tab === "installed" &&
    filters.show === "all" &&
    o.removable > 0 &&
    o.capabilities.autoremove
  ) {
    out.push({
      key: "removable",
      title: `${o.removable} ${o.removable === 1 ? "package isn't" : "packages aren't"} needed any more`,
      body: "They were pulled in by packages since removed.",
      action: (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ show: "removable" })}
          >
            Show
          </Button>
          {a.canChange && (
            <Button
              variant="outline"
              size="sm"
              disabled={a.locked}
              onClick={() => a.review({ action: "autoremove" })}
            >
              Remove them
            </Button>
          )}
        </div>
      ),
    })
  }
  if (filters.tab === "updates") {
    const au = o.auto_updates
    if (o.capabilities.auto_updates && au.supported) {
      out.push({
        key: "auto",
        title: au.enabled
          ? "Automatic updates are on"
          : "Automatic updates are off",
        body: [
          au.enabled
            ? (au.detail ?? "The server installs updates by itself.")
            : au.missing
              ? `Turning them on needs ${au.missing} installed first.`
              : (au.detail ??
                "Turn them on to have security updates installed by the server itself."),
          !au.missing && au.tool,
        ]
          .filter(Boolean)
          .join(" · "),
        action: a.canChange ? (
          au.missing && !au.enabled ? (
            <Button
              variant="outline"
              size="sm"
              disabled={a.locked}
              onClick={() =>
                a.review({ action: "install", names: [au.missing ?? ""] })
              }
            >
              Install {au.missing}
            </Button>
          ) : (
            <Switch
              checked={au.enabled}
              disabled={a.autoPending}
              aria-label="Automatic updates"
              onCheckedChange={(on) => a.setAutoUpdates(on)}
            />
          )
        ) : undefined,
      })
    }
  }
  if (o.truncated) {
    out.push({
      key: "truncated",
      title: "Not every package is listed",
      body: "The list was cut short. Search to find a package.",
    })
  }
  for (const w of o.warnings) out.push({ key: w, title: w, warn: true })
  return <Notices notes={out} />
}
