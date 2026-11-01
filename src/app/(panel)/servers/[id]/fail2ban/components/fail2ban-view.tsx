"use client"

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
import {
  Empty,
  type Item,
  ItemMenu,
  Loading,
  type Note,
  Notices,
  Segmented,
  SheetItems,
  Summary,
} from "../../components/parts"
import { SectionHeader } from "../../components/section-header"
import { useServerPage } from "../../components/server-page"
import { useFail2ban } from "../api"
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

  const refresh = (
    <Button
      variant="outline"
      size="sm"
      className="max-md:h-10 max-md:flex-1"
      disabled={query.isFetching}
      onClick={() => query.refetch()}
    >
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
      Refresh
    </Button>
  )

  if (!o) {
    return (
      <>
        <SectionHeader actions={refresh} />
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
      <SectionHeader actions={refresh} />
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
          <Button variant="outline" size="sm">
            <Settings2 />
            Manage
          </Button>
        }
      />
    )
  }
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-10 flex-1"
        onClick={() => setOpen(true)}
      >
        <Settings2 />
        Manage
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
  const { filters, setFilters } = useF2bFilters()
  const bans = banRows(o)
  const tab = filters.tab
  const setTab = (t: Tab) =>
    setFilters({ tab: t === "jails" ? null : t, q: null })

  const tabs: { value: Tab; label: string }[] = [
    { value: "jails", label: `Jails · ${o.jails.length}` },
    { value: "bans", label: `Bans · ${bans.length}` },
    { value: "settings", label: "Settings" },
    { value: "activity", label: "Activity" },
  ]

  let body: ReactNode
  if (tab === "bans") body = <BansTab rows={bans} />
  else if (tab === "settings") body = <SettingsTab />
  else if (tab === "activity") body = <ActivityTab />
  else body = <JailsTab />

  return (
    <>
      <SectionHeader
        actions={
          <>
            {refresh}
            <Manage />
          </>
        }
      />
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
        <OverviewSummary o={o} bans={bans.length} onTab={setTab} />
        <Notices notes={notes(o, a)} />
        <div className="flex [scrollbar-width:none] overflow-x-auto max-md:px-4 max-md:pt-4">
          <Segmented label="Show" items={tabs} value={tab} onChange={setTab} />
        </div>
        {body}
      </div>
    </>
  )
}

function OverviewSummary({
  o,
  bans,
  onTab,
}: {
  o: Fail2BanOverview
  bans: number
  onTab: (t: Tab) => void
}) {
  const { filters } = useF2bFilters()
  const active = o.jails.filter((j) => j.active).length
  const failing = o.jails.reduce(
    (n, j) => n + (j.status?.currently_failed ?? 0),
    0,
  )
  const total = o.jails.reduce((n, j) => n + (j.status?.total_banned ?? 0), 0)
  return (
    <Summary
      cells={[
        {
          label: "Service",
          value: o.running ? "Running" : "Stopped",
          tone: o.running ? undefined : "warning",
          sub: o.version ? `v${o.version}` : undefined,
        },
        {
          label: "Jails active",
          value: active,
          sub: `of ${o.jails.filter((j) => j.enabled).length} on`,
          active: filters.tab === "jails",
          onClick: () => onTab("jails"),
        },
        {
          label: "Banned now",
          value: o.responding ? bans : "—",
          sub:
            o.responding && total > bans ? `${total} since start` : undefined,
          active: filters.tab === "bans",
          onClick: () => onTab("bans"),
        },
        {
          label: "Failures being counted",
          value: o.responding ? failing : "—",
          active: filters.tab === "activity",
          onClick: () => onTab("activity"),
        },
      ]}
    />
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
