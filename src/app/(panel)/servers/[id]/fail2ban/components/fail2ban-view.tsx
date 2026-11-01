"use client"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import {
  FileCode,
  FlaskConical,
  Play,
  Power,
  PowerOff,
  RefreshCw,
  RotateCw,
  Settings2,
  ShieldBan,
  Square,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { type ReactNode, useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useOpen } from "@/hooks/useOpen"
import type { Fail2BanOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import { BarSlots, SlotTarget, useSlotFilled } from "../../components/bar-slots"
import {
  Empty,
  type Item,
  ItemMenu,
  Loading,
  type Note,
  Notices,
  Segmented,
  SheetItems,
} from "../../components/parts"
import { SectionActions } from "../../components/section-actions"
import { useServerPage } from "../../components/server-page"
import { f2bKeys, useFail2ban } from "../api"
import { ActivityTab } from "./activity"
import { BansTab } from "./bans"
import { F2bActionsProvider, useF2bActions } from "./fail2ban-actions"
import { JailsTab } from "./jails"
import { banRows, type Tab, useF2bFilters } from "./meta"
import { SettingsTab } from "./settings"

export function Fail2banView() {
  const { server, phone } = useServerPage()
  const query = useFail2ban(server.id)
  const o = query.data
  const qc = useQueryClient()
  // Also reloads the log while Activity shows it.
  const fetching = useIsFetching({ queryKey: f2bKeys.all(server.id) }) > 0

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={fetching}
      onClick={() => qc.invalidateQueries({ queryKey: f2bKeys.all(server.id) })}
    >
      <RefreshCw className={cn(fetching && "animate-spin")} />
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
              title="Couldn't read fail2ban"
              body={query.error.message}
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

  return (
    <F2bActionsProvider overview={o}>
      {o.installed ? (
        <Content refresh={refresh} />
      ) : (
        <NotInstalled refresh={refresh} />
      )}
    </F2bActionsProvider>
  )
}

function NotInstalled({ refresh }: { refresh: ReactNode }) {
  const { phone } = useServerPage()
  const a = useF2bActions()
  const o = a.overview
  const [protect, setProtect] = useState(true)

  let blocker: string | null = null
  if (o.access === "user") {
    blocker =
      "Installing needs root, or sudo without a password, for this server's login."
  } else if (!o.package_manager) {
    blocker =
      "No supported package manager was found (apt, dnf, yum, zypper, apk or pacman)."
  }

  return (
    <>
      <SectionActions>{refresh}</SectionActions>
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
        <Empty
          icon={ShieldBan}
          title="Fail2ban isn't installed"
          className="max-md:mt-4"
          body={
            <>
              <p>
                It watches the logs for repeated failed logins and blocks those
                addresses in the firewall for a while.
              </p>
              {blocker && (
                <p className="mt-2 font-medium text-foreground">{blocker}</p>
              )}
            </>
          }
          action={
            !blocker && (
              <div className="flex flex-col gap-4">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox inside is the control */}
                <label className="flex min-h-11 cursor-pointer items-start gap-3 text-start text-body-sm">
                  <Checkbox
                    checked={protect}
                    onCheckedChange={(on) => setProtect(on)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium">
                      Protect SSH right away
                    </span>
                    <span className="block text-muted-foreground">
                      Turns on the sshd jail, so repeated failed SSH logins get
                      banned.
                    </span>
                  </span>
                </label>
                <Button
                  size={phone ? "lg" : "default"}
                  disabled={a.busy}
                  onClick={() => a.install(protect)}
                >
                  Install with {o.package_manager}
                </Button>
              </div>
            )
          }
        />
      </div>
    </>
  )
}

// Start/stop, boot, text editing, testing and removal, in one menu.
function useManageItems(): Item[][] {
  const a = useF2bActions()
  const o = a.overview
  const service: Item[] = o.running
    ? [
        {
          key: "restart",
          label: "Restart",
          icon: <RotateCw />,
          disabled: a.busy,
          onSelect: () => a.service("restart"),
        },
        {
          key: "reload",
          label: "Reload configuration",
          icon: <RefreshCw />,
          disabled: a.busy,
          onSelect: () => a.service("reload"),
        },
        {
          key: "stop",
          label: "Stop",
          icon: <Square />,
          disabled: a.busy,
          onSelect: () => a.service("stop"),
        },
      ]
    : [
        {
          key: "start",
          label: "Start",
          icon: <Play />,
          disabled: a.busy,
          onSelect: () => a.service("start"),
        },
      ]
  if (o.init !== "none") {
    service.push(
      o.starts_at_boot
        ? {
            key: "boot",
            label: "Don't start at boot",
            icon: <PowerOff />,
            disabled: a.busy,
            onSelect: () => a.service("disable"),
          }
        : {
            key: "boot",
            label: "Start at boot",
            icon: <Power />,
            disabled: a.busy,
            onSelect: () => a.service("enable"),
          },
    )
  }
  return [
    service,
    [
      {
        key: "config",
        label: "Edit jail.local as text",
        icon: <FileCode />,
        onSelect: () => a.editConfig(),
      },
      {
        key: "test",
        label: "Test a filter",
        icon: <FlaskConical />,
        onSelect: () => a.test(),
      },
    ],
    [
      {
        key: "uninstall",
        label: "Uninstall…",
        icon: <Trash2 />,
        destructive: true,
        disabled: a.busy,
        onSelect: () => a.uninstall(),
      },
    ],
  ]
}

function Manage() {
  const { phone } = useServerPage()
  const items = useManageItems()
  const [open, setOpen] = useOpen("f2b-manage")

  if (!phone) {
    return (
      <ItemMenu
        groups={items}
        label="Manage fail2ban"
        trigger={
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            title="Manage fail2ban"
          >
            <Settings2 />
          </Button>
        }
      />
    )
  }
  return (
    <>
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Manage fail2ban"
        onClick={() => setOpen(true)}
      >
        <Settings2 />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Fail2ban">
        <SheetItems groups={items} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}

function Content({ refresh }: { refresh: ReactNode }) {
  const a = useF2bActions()
  const o = a.overview
  const { filters } = useF2bFilters()
  const bans = banRows(o)

  let body: ReactNode
  if (filters.tab === "bans") body = <BansTab rows={bans} />
  else if (filters.tab === "settings") body = <SettingsTab />
  else if (filters.tab === "activity") body = <ActivityTab />
  else body = <JailsTab />

  return (
    <BarSlots>
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
        <Bar refresh={refresh} bans={bans.length} />
        <Notices notes={notes(o, a)} />
        {body}
      </div>
    </BarSlots>
  )
}

// Everything above the content in one row: tabs, the tab's own search,
// filters and button (portalled in through <BarSlot>), the service's state as
// quiet text, Refresh and Manage. Phones stack it: search + buttons, then
// scrolling chips.
function Bar({ refresh, bans }: { refresh: ReactNode; bans: number }) {
  const { phone } = useServerPage()
  const o = useF2bActions().overview
  const { filters, setFilters } = useF2bFilters()
  const searching = useSlotFilled("search")

  const tabs = (
    <Segmented
      label="Show"
      items={[
        { value: "jails", label: `Jails · ${o.jails.length}` },
        { value: "bans", label: `Bans · ${o.responding ? bans : "—"}` },
        { value: "settings", label: "Settings" },
        { value: "activity", label: "Activity" },
      ]}
      value={filters.tab}
      onChange={(t: Tab) =>
        setFilters({ tab: t === "jails" ? null : t, q: null })
      }
    />
  )
  const search = (
    <SlotTarget
      slot="search"
      className="flex min-w-0 flex-1 empty:hidden md:max-w-72 md:min-w-36"
    />
  )
  const filterSlot = (
    <SlotTarget
      slot="filters"
      className="flex shrink-0 items-center gap-2 empty:hidden"
    />
  )
  const actions = (
    <SlotTarget
      slot="actions"
      className="flex shrink-0 items-center gap-2 empty:hidden"
    />
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          {search}
          {!searching && <State bans={bans} className="flex-1" />}
          {actions}
          {refresh}
          <Manage />
        </div>
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {tabs}
          {filterSlot}
        </div>
        {searching && <State bans={bans} />}
      </div>
    )
  }

  return (
    <div className="@container flex flex-wrap items-center gap-2">
      {tabs}
      {searching && <span className="mx-1 h-5 w-px shrink-0 bg-border" />}
      {search}
      {filterSlot}
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <State bans={bans} className="me-2 hidden @5xl:flex" />
        {actions}
        {refresh}
        <Manage />
      </div>
    </div>
  )
}

// Running or not, how many jails are on, and failures being counted, as one
// quiet line. Details sit in the tooltips.
function State({ bans, className }: { bans: number; className?: string }) {
  const o = useF2bActions().overview
  const active = o.jails.filter((j) => j.active).length
  const failing = o.jails.reduce(
    (n, j) => n + (j.status?.currently_failed ?? 0),
    0,
  )
  const total = o.jails.reduce((n, j) => n + (j.status?.total_banned ?? 0), 0)
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 text-caption whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <span
        className="flex items-center gap-1.5"
        title={o.version ? `fail2ban ${o.version}` : undefined}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            o.running ? "bg-success" : "bg-warning",
          )}
        />
        {o.running ? "Running" : "Stopped"}
      </span>
      <span title={`${o.jails.filter((j) => j.enabled).length} turned on`}>
        {active} active
      </span>
      {o.responding && failing > 0 && (
        <span
          title={
            total > bans
              ? `${total} banned since it started`
              : "Failed logins counted toward a ban"
          }
        >
          {failing} failing
        </span>
      )}
    </div>
  )
}

function notes(o: Fail2BanOverview, a: ReturnType<typeof useF2bActions>) {
  const out: Note[] = o.warnings.map((w) => ({
    key: w,
    title: w,
    warn: true,
  }))
  if (o.access === "user") {
    out.unshift({
      key: "access",
      title: "This login can't manage fail2ban",
      body: "Changes need root, or sudo without a password.",
      warn: true,
    })
  }
  if (!o.running) {
    out.unshift({
      key: "stopped",
      title: "Fail2ban isn't running",
      body: "Nothing is banned while it's stopped.",
      warn: true,
      action: (
        <Button
          size="sm"
          disabled={a.busy}
          onClick={() => a.service("start")}
          className="max-md:h-10"
        >
          <Play />
          Start
        </Button>
      ),
    })
  } else if (!o.responding) {
    out.unshift({
      key: "silent",
      title: "Fail2ban doesn't answer",
      body: "It's running, but jail status and bans can't be read. Try restarting it.",
      warn: true,
    })
  }
  return out
}
