"use client"

import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import {
  CopyPlus,
  Ellipsis,
  FileCode,
  History,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Settings2,
  Shield,
  ShieldBan,
  ShieldOff,
  TriangleAlert,
} from "lucide-react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { JobBar, progressText } from "@/components/jobs/meta"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { FirewallOverview, Job } from "@/lib/services"
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
import { portKeys } from "../../ports/api"
import {
  firewallKeys,
  useFirewall,
  useInstallFirewall,
  useInstallJob,
} from "../api"
import { FirewallActionsProvider, useFirewallActions } from "./firewall-actions"
import { ForwardsTab } from "./forwards-tab"
import { LogTab } from "./log-tab"
import { canCopy, type Tab, useFirewallFilters } from "./meta"
import { PendingBanner } from "./pending-banner"
import { PortsTab } from "./ports-tab"
import { RulesTab } from "./rules"

const TOOL: Record<FirewallOverview["backend"], string> = {
  ufw: "ufw",
  firewalld: "firewalld",
  nftables: "nftables",
  iptables: "iptables",
  none: "",
}

export function FirewallView() {
  const { server, phone } = useServerPage()
  const qc = useQueryClient()
  const query = useFirewall(server.id)
  const fetching = useIsFetching({ queryKey: firewallKeys.all(server.id) }) > 0
  const o = query.data

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={fetching}
      onClick={() => {
        qc.invalidateQueries({ queryKey: firewallKeys.all(server.id) })
        qc.invalidateQueries({ queryKey: portKeys.list(server.id) })
      }}
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
              title="Couldn't read the firewall"
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

  if (o.access === "user") {
    return (
      <>
        <SectionActions>{refresh}</SectionActions>
        <Empty
          icon={Shield}
          title="This login can't read the firewall"
          className="max-md:mt-4"
          body="Reading and changing it needs root, or sudo without a password, for this server's login."
        />
      </>
    )
  }

  return (
    <FirewallActionsProvider overview={o}>
      {o.backend === "none" ? (
        <NotInstalled refresh={refresh} />
      ) : (
        <Content refresh={refresh} />
      )}
    </FirewallActionsProvider>
  )
}

function NotInstalled({ refresh }: { refresh: ReactNode }) {
  const { server, phone, can } = useServerPage()
  const jobs = useJobActions()
  const o = useFirewallActions().overview
  const job = useInstallJob(server.id)
  const install = useInstallFirewall(server.id)

  return (
    <>
      <SectionActions>{refresh}</SectionActions>
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
        {job ? (
          <Empty
            icon={Shield}
            title={`Installing ${o.recommended}…`}
            className="max-md:mt-4"
            body="It keeps running on the server if you leave this page."
            action={<InstallProgress job={job} />}
          />
        ) : (
          <Empty
            icon={ShieldOff}
            title="No firewall on this server"
            className="max-md:mt-4"
            body={
              o.recommended
                ? `Installing ${o.recommended} doesn't turn it on or change anything yet. You decide what stays open first.`
                : "Install ufw or firewalld by hand: no supported package manager was found."
            }
            action={
              o.recommended &&
              can("engineer") && (
                <Button
                  size={phone ? "lg" : "default"}
                  className="max-md:w-full"
                  disabled={install.isPending}
                  onClick={() =>
                    install.mutate(undefined, {
                      onSuccess: (job) => jobs.track(job),
                      onError: (err) => toast.error(err.message),
                    })
                  }
                >
                  Install {o.recommended}
                </Button>
              )
            }
          />
        )}
      </div>
    </>
  )
}

function InstallProgress({ job }: { job: Job }) {
  const { phone } = useServerPage()
  const jobs = useJobActions()
  return (
    <div className="flex w-full flex-col gap-3 md:w-80">
      <JobBar job={job} />
      <p className="truncate text-caption text-muted-foreground">
        {progressText(job)}
      </p>
      <Button
        variant="outline"
        size={phone ? "lg" : "default"}
        onClick={() => jobs.show(job.id)}
      >
        View details
      </Button>
    </div>
  )
}

function Content({ refresh }: { refresh: ReactNode }) {
  const { can } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const { filters } = useFirewallFilters()

  let body: ReactNode = <RulesTab />
  if (filters.tab === "ports") body = <PortsTab />
  else if (filters.tab === "forwarding" && o.capabilities.forwards) {
    body = <ForwardsTab />
  } else if (filters.tab === "log" && can("operator")) body = <LogTab />

  return (
    <BarSlots>
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
        <Bar refresh={refresh} />
        <PendingBanner />
        <Notices notes={notes(o, a.manage, a.locked, a.turnOn, can)} />
        {body}
      </div>
    </BarSlots>
  )
}

function notes(
  o: FirewallOverview,
  manage: boolean,
  locked: boolean,
  turnOn: () => void,
  can: (min: "engineer") => boolean,
): Note[] {
  const out: Note[] = []
  if (!o.capabilities.manage) {
    out.push({
      key: "readonly",
      title: `${TOOL[o.backend]} is shown read-only`,
      body: "Morcheh changes ufw and firewalld. Rules managed another way stay untouched.",
    })
  } else if (!o.active) {
    out.push({
      key: "off",
      warn: true,
      title: "The firewall is off",
      body: "Every port this server listens on can be reached. The rules below aren't applied.",
      action: manage && (
        <Button disabled={locked} className="max-md:h-11" onClick={turnOn}>
          Turn on
        </Button>
      ),
    })
  } else if (!o.starts_at_boot && can("engineer")) {
    out.push({
      key: "boot",
      warn: true,
      title: "It won't come back after a reboot",
      body: "The firewall runs now but isn't set to start at boot. Turning it off and on again sets that.",
    })
  }
  for (const w of o.warnings ?? []) out.push({ key: w, warn: true, title: w })
  return out
}

// Everything used daily stays in the row; the rest sits behind ⋯. Phones stack
// it: search + buttons, then scrolling chips.
function Bar({ refresh }: { refresh: ReactNode }) {
  const { phone, can } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const { filters, setFilters } = useFirewallFilters()
  const searching = useSlotFilled("search")
  const forwarding = filters.tab === "forwarding" && o.capabilities.forwards

  const tabs = (
    <Segmented
      label="Show"
      items={[
        { value: "rules", label: `Rules · ${o.rules.length}` },
        { value: "ports", label: "Ports" },
        ...(o.capabilities.forwards
          ? [
              {
                value: "forwarding" as const,
                label:
                  o.forwards.length > 0
                    ? `Forwarding · ${o.forwards.length}`
                    : "Forwarding",
              },
            ]
          : []),
        ...(can("operator")
          ? [{ value: "log" as const, label: "Blocked" }]
          : []),
      ]}
      value={filters.tab}
      onChange={(t: Tab) =>
        setFilters({ tab: t === "rules" ? null : t, q: null, show: null })
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

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          {search}
          {!searching && <State className="flex-1" />}
          {a.manage && (
            <Button
              size="icon-lg"
              aria-label={forwarding ? "Add forward" : "Add rule"}
              disabled={a.locked}
              onClick={() => (forwarding ? a.addForward() : a.addRule())}
            >
              <Plus />
            </Button>
          )}
          {refresh}
          <More />
        </div>
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {tabs}
          {filterSlot}
        </div>
        {searching && <State />}
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
        <State className="me-2 hidden @4xl:flex" />
        {a.manage &&
          (forwarding ? (
            <Button disabled={a.locked} onClick={a.addForward}>
              <Plus />
              Add forward
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={a.locked}
                onClick={() => a.blockAddress()}
              >
                <ShieldBan />
                Block address
              </Button>
              <Button disabled={a.locked} onClick={() => a.addRule()}>
                <Plus />
                Add rule
              </Button>
            </>
          ))}
        {refresh}
        <More />
      </div>
    </div>
  )
}

function State({ className }: { className?: string }) {
  const { phone } = useServerPage()
  const o = useFirewallActions().overview
  const denies = o.defaults.incoming !== "allow"
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 text-caption whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <span
        className="flex items-center gap-1.5"
        title={[TOOL[o.backend], o.version].filter(Boolean).join(" ")}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            o.active ? "bg-success" : "bg-warning",
          )}
        />
        {o.active ? "On" : "Off"}
        <span className="text-ash">{TOOL[o.backend]}</span>
      </span>
      {o.active && (
        // The last row of the rules says this too, so it's the first to go
        // when the row gets tight.
        <span
          title="Traffic no rule mentions"
          className={phone ? undefined : "hidden @[80rem]:inline"}
        >
          {denies ? "Incoming blocked" : "Incoming allowed"}
        </span>
      )}
    </div>
  )
}

function useMoreItems(): Item[][] {
  const { phone, can } = useServerPage()
  const a = useFirewallActions()
  const o = a.overview
  const raw: Item[] = can("operator")
    ? [
        {
          key: "raw",
          label: "View raw rules",
          icon: <FileCode />,
          onSelect: a.raw,
        },
      ]
    : []
  const history: Item[] =
    can("operator") && o.capabilities.manage
      ? [
          {
            key: "history",
            label: "History",
            icon: <History />,
            onSelect: a.history,
          },
        ]
      : []
  if (!a.manage) return [[...history, ...raw]]
  const daily: Item[] = phone
    ? [
        {
          key: "block",
          label: "Block an address",
          icon: <ShieldBan />,
          disabled: a.locked,
          onSelect: () => a.blockAddress(),
        },
      ]
    : []
  return [
    daily,
    [
      ...history,
      ...(o.rules.some(canCopy)
        ? [
            {
              key: "apply",
              label: "Apply rules to other servers…",
              icon: <CopyPlus />,
              onSelect: () => a.applyTo(),
            },
          ]
        : []),
    ],
    [
      {
        key: "settings",
        label: "Settings",
        icon: <Settings2 />,
        disabled: a.locked,
        onSelect: a.settings,
      },
      ...raw,
    ],
    [
      o.active
        ? {
            key: "off",
            label: "Turn off…",
            icon: <PowerOff />,
            disabled: a.locked,
            onSelect: a.turnOff,
          }
        : {
            key: "on",
            label: "Turn on…",
            icon: <Power />,
            disabled: a.locked,
            onSelect: a.turnOn,
          },
      {
        key: "reset",
        label: "Remove every rule…",
        icon: <RotateCcw />,
        destructive: true,
        disabled: a.locked,
        onSelect: a.reset,
      },
    ],
  ]
}

function More() {
  const { phone } = useServerPage()
  const items = useMoreItems()
  const [open, setOpen] = useOpen("fw-more")

  if (!items.some((g) => g.length > 0)) return null
  if (!phone) {
    return (
      <ItemMenu
        groups={items}
        label="More options"
        trigger={
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="More options"
            title="More options"
          >
            <Ellipsis />
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
        aria-label="More options"
        onClick={() => setOpen(true)}
      >
        <Ellipsis />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Firewall">
        <SheetItems groups={items} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}
