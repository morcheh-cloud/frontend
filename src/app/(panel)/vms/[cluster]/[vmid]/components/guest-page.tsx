"use client"

import {
  ChevronLeft,
  Ellipsis,
  LoaderCircle,
  Lock,
  Monitor,
  Play,
  Power,
  SquareTerminal,
} from "lucide-react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react"

import { type Level, levelLabels } from "@/components/auth/level"
import { BottomSheet } from "@/components/bottom-sheet"
import { HelpButton } from "@/components/help/help-link"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { formatDuration } from "@/lib/format"
import type { PVECluster, PVEGuestDetail } from "@/lib/services"
import { cn } from "@/lib/utils"

import {
  Empty,
  ItemMenu,
  Notices,
  SheetItems,
} from "../../../../servers/[id]/components/parts"
import { notFound, useCluster, useGuest } from "../../../api"
import {
  GuestTile,
  guestName,
  guestState,
  guestStateMeta,
  kindLabel,
  lockLabel,
  type VmTab,
  vmHref,
} from "../../../components/meta"
import { useVmCan } from "../../../components/permissions"
import { useGuestMenu, useVmActions } from "../../../components/vm-actions"
import { tabMeta, tabOf, tabsFor } from "./tabs"

type GuestPage = {
  guest: PVEGuestDetail
  cluster?: PVECluster
  tab: VmTab
  phone: boolean
  can: (min: Level) => boolean
}

const Context = createContext<GuestPage | null>(null)

export function useGuestPage() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error("useGuestPage outside GuestShell")
  return ctx
}

const guide = "/help/virtual-machines"

export function GuestShellFromRoute({ children }: { children: ReactNode }) {
  const params = useParams<{ cluster: string; vmid: string }>()
  const pathname = usePathname()
  return (
    <GuestShell
      cluster={params.cluster}
      vmid={Number(params.vmid)}
      tab={tabOf(pathname)}
    >
      {children}
    </GuestShell>
  )
}

function GuestShell({
  cluster: clusterId,
  vmid,
  tab,
  children,
}: {
  cluster: string
  vmid: number
  tab: VmTab
  children: ReactNode
}) {
  const query = useGuest(clusterId, vmid)
  const { data: cluster } = useCluster(clusterId)
  const phone = useIsPhone()
  const vmCan = useVmCan()
  const guest = query.data
  const partial = !!(guest as { partial?: boolean } | undefined)?.partial

  usePageCrumbs(
    guest
      ? [
          { href: vmHref(clusterId, vmid), label: guestName(guest) },
          ...(tab === "overview"
            ? []
            : [
                {
                  href: vmHref(clusterId, vmid, tab),
                  label: tabMeta[tab].label,
                },
              ]),
        ]
      : [],
  )

  if (phone === null) return null
  if (!guest) {
    if (query.error) {
      return (
        <Missing
          phone={phone}
          gone={notFound(query.error)}
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      )
    }
    return <Loading phone={phone} />
  }

  const ctx: GuestPage = {
    guest,
    cluster,
    tab,
    phone,
    can: (min) =>
      cluster ? vmCan(cluster, min) : vmCan(guest.cluster_id, min),
  }
  const meta = tabMeta[tab]
  const body = partial ? (
    <TabLoading />
  ) : meta.has && !meta.has(guest) ? (
    <Empty
      icon={meta.icon}
      title={`Not for this ${guest.template ? "template" : kindLabel(guest.kind).toLowerCase()}`}
      body={
        tab === "cloud-init"
          ? "Containers are set up by their template, not cloud-init. Change the hostname, addresses and keys under Hardware."
          : "This part doesn't apply to it."
      }
      className="m-4 md:m-6"
    />
  ) : !ctx.can(meta.min) ? (
    <Empty
      icon={Lock}
      title={`You need ${levelLabels[meta.min]} access`}
      body="Ask a workspace Owner if you need it."
      className="m-4 md:m-6"
    />
  ) : (
    children
  )

  return (
    <Context.Provider value={ctx}>
      {phone ? (
        <PhoneChrome>{body}</PhoneChrome>
      ) : (
        <DesktopChrome>{body}</DesktopChrome>
      )}
    </Context.Provider>
  )
}

// ---- desktop

function HeaderIcon({
  label,
  render,
  children,
}: {
  label: string
  render: ReactElement
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={render} aria-label={label}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function DesktopChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100svh-3rem-1px)] flex-col">
      <Header />
      <TabBar />
      <GuestNotices />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

function useRemoved() {
  const router = useRouter()
  return () => router.replace("/vms")
}

function Header() {
  const { guest: g, can } = useGuestPage()
  const menu = useGuestMenu()
  const a = useVmActions()
  const onRemoved = useRemoved()
  const groups = menu(g, { open: false, onRemoved })
  const state = guestState(g)
  const meta = guestStateMeta[state]
  const power = groups[1] ?? []

  return (
    <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
      <GuestTile guest={g} className="size-12 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-subheading font-medium">{guestName(g)}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 text-foreground">
            {g.lock ? (
              <LoaderCircle className="size-3.5 animate-spin text-brand" />
            ) : (
              <span className={cn("size-2 rounded-full", meta.dot)} />
            )}
            {g.lock ? lockLabel(g.lock) : meta.label}
            {state === "running" && g.uptime > 0 && (
              <span className="text-muted-foreground">
                for {formatDuration(g.uptime)}
              </span>
            )}
          </span>
          <span>
            {kindLabel(g.kind)} {g.vmid}
          </span>
          <span>
            on <span className="text-foreground">{g.node}</span> ·{" "}
            {g.cluster_name}
          </span>
          {g.ips[0] && (
            <span className="font-mono text-caption">{g.ips[0]}</span>
          )}
          {g.link && (
            <Link
              href={`/servers/${g.link.server_id}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Monitor className="size-3.5" />
              {g.link.server_name}
            </Link>
          )}
          {g.tags.length > 0 && (
            <span className="flex gap-1">
              {g.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 text-caption leading-5"
                >
                  {tag}
                </span>
              ))}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {can("operator") && state === "stopped" && (
          <HeaderIcon
            label="Start"
            render={
              <Button
                variant="outline"
                size="icon"
                disabled={!!g.lock}
                onClick={() => a.power(g, "start")}
              />
            }
          >
            <Play />
          </HeaderIcon>
        )}
        {can("operator") && state !== "stopped" && power.length > 0 && (
          <ItemMenu
            label="Power"
            groups={[power]}
            trigger={
              <Button variant="outline" size="icon" aria-label="Power">
                <Power />
              </Button>
            }
          />
        )}
        {can("engineer") && state === "running" && (
          <HeaderIcon
            label="Open console"
            render={
              <Link
                href={vmHref(g.cluster_id, g.vmid, "console")}
                className={buttonVariants({ size: "icon" })}
              />
            }
          >
            <SquareTerminal />
          </HeaderIcon>
        )}
        <ItemMenu
          label="Machine actions"
          groups={groups.filter((_, i) => i !== 1)}
          trigger={
            <Button variant="outline" size="icon" aria-label="Machine actions">
              <Ellipsis />
            </Button>
          }
        />
      </div>
    </div>
  )
}

const tabClass =
  "relative flex h-11 shrink-0 items-center gap-2 rounded-lg px-2.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full hover:text-foreground hover:after:bg-mist focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:bg-brand [&_svg]:size-4 [&_svg]:shrink-0"

function TabBar() {
  const { guest: g, tab, can } = useGuestPage()
  const tabs = tabsFor(g, can)
  return (
    <nav
      aria-label="Machine sections"
      className="sticky top-[calc(3rem+1px)] z-20 border-b border-border bg-background/90 px-4 backdrop-blur-md"
    >
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const m = tabMeta[t]
          return (
            <Link
              key={t}
              href={vmHref(g.cluster_id, g.vmid, t)}
              aria-current={t === tab ? "page" : undefined}
              className={tabClass}
            >
              <m.icon />
              {m.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// What's going on with the machine right now, above every tab.
function GuestNotices() {
  const { guest: g, can } = useGuestPage()
  const a = useVmActions()
  const pending = (g.pending ?? []).filter(
    (p) => p.delete || (p.pending !== "" && p.pending !== p.value),
  )
  const running = guestState(g) === "running"
  const notes = [
    ...(g.lock
      ? [
          {
            key: "lock",
            title: `${lockLabel(g.lock)}…`,
            body: "Changes wait until it's done. Activity shows the task.",
          },
        ]
      : []),
    ...(pending.length > 0 && running
      ? [
          {
            key: "pending",
            warn: true,
            title: `${pending.length} ${pending.length === 1 ? "change waits" : "changes wait"} for a restart`,
            body: (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  {pending
                    .slice(0, 4)
                    .map((p) => p.key)
                    .join(", ")}
                  {pending.length > 4 ? "…" : ""}: the machine still runs with
                  the old values.
                </span>
                {can("operator") && (
                  <button
                    type="button"
                    className="font-medium text-brand hover:underline"
                    onClick={() => a.power(g, "reboot")}
                  >
                    Restart now
                  </button>
                )}
              </span>
            ),
          },
        ]
      : []),
    ...(g.status === "unknown"
      ? [
          {
            key: "unknown",
            warn: true,
            title: "Proxmox doesn't know its state",
            body: `The node ${g.node} may be down or out of the cluster.`,
          },
        ]
      : []),
  ]
  return <Notices notes={notes} className="mx-4 mt-4 md:mx-6" />
}

// ---- phone

// Stable so it runs once per chip, not on every poll.
function scrollIntoView(el: HTMLAnchorElement | null) {
  el?.scrollIntoView({ inline: "nearest", block: "nearest" })
}

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"

const chipClass =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none active:bg-muted aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:font-medium aria-[current=page]:text-background"

function PhoneChrome({ children }: { children: ReactNode }) {
  const { guest: g, tab, can } = useGuestPage()
  const back = useBack("/vms")
  const [sheetOpen, setSheetOpen] = useOpen("vm-page-sheet")
  const menu = useGuestMenu()
  const onRemoved = useRemoved()
  const tabs = tabsFor(g, can)
  const state = guestState(g)

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-12 items-center gap-1 px-1">
          <div className="flex w-22 shrink-0">
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className={barButton}
            >
              <ChevronLeft className="size-6 rtl:rotate-180" />
            </button>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-body font-medium">{guestName(g)}</h1>
            <p className="flex items-center justify-center gap-1 truncate text-caption text-muted-foreground">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  guestStateMeta[state].dot,
                )}
              />
              {g.lock ? lockLabel(g.lock) : guestStateMeta[state].label} ·{" "}
              {g.node}
            </p>
          </div>
          <HelpButton href={guide} label="Virtual machines guide" />
          <button
            type="button"
            aria-label="Machine actions"
            onClick={() => setSheetOpen(true)}
            className={barButton}
          >
            <Ellipsis className="size-5" />
          </button>
        </div>
        <nav
          aria-label="Machine sections"
          className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2.5"
        >
          {tabs.map((t) => (
            <Link
              key={t}
              href={vmHref(g.cluster_id, g.vmid, t)}
              replace
              aria-current={t === tab ? "page" : undefined}
              ref={t === tab ? scrollIntoView : undefined}
              className={chipClass}
            >
              {tabMeta[t].label}
            </Link>
          ))}
        </nav>
      </header>
      <GuestNotices />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={guestName(g)}
      >
        <SheetItems
          groups={menu(g, { open: false, onRemoved })}
          onOpenChange={setSheetOpen}
        />
      </BottomSheet>
    </>
  )
}

// ---- states

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      {!phone && <Skeleton className="h-10 w-full" />}
      <TabLoading />
    </div>
  )
}

export function TabLoading() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  )
}

function Missing({
  phone,
  gone,
  message,
  onRetry,
}: {
  phone: boolean
  gone: boolean
  message: string
  onRetry: () => void
}) {
  const router = useRouter()
  return (
    <div className={cn(phone ? "pt-[env(safe-area-inset-top)]" : "p-6")}>
      <Empty
        icon={Monitor}
        title={gone ? "This machine isn't there" : "Couldn't load the machine"}
        body={
          gone
            ? "It was deleted or moved to a cluster you can't reach, or the link is wrong."
            : message
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/vms")}>
              All machines
            </Button>
            {!gone && <Button onClick={onRetry}>Try again</Button>}
          </div>
        }
      />
    </div>
  )
}
