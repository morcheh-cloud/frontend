"use client"

import { Drawer } from "@base-ui/react/drawer"
import { Check, ChevronRight, Ellipsis, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth/auth"
import { TasksStrip, useActiveJobs } from "@/components/jobs/tasks-button"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import { useSettingsItem } from "./app-sidebar"
import {
  accountItem,
  alertsItem,
  ansibleItem,
  applicationsItem,
  cloudItem,
  containersItem,
  cronjobsItem,
  databasesItem,
  dnsItem,
  helpItem,
  homeItem,
  isActive,
  keysItem,
  monitoringItem,
  type NavItem,
  networkMapItem,
  proxyItem,
  recordingsItem,
  scriptsItem,
  serversItem,
  servicesItem,
  storageItem,
  tasksItem,
  uptimeItem,
  vmsItem,
} from "./nav"
import { type NavAlert, useNavAlerts } from "./problems"
import { WithPathname } from "./with-pathname"
import { useWorkspace, WorkspaceAvatar } from "./workspace"

// A native tab bar fits four tabs plus "More"; the rest live in a sheet.
const tabItems = [homeItem, serversItem, servicesItem, uptimeItem]
const moreItems = [
  tasksItem,
  vmsItem,
  cloudItem,
  networkMapItem,
  containersItem,
  databasesItem,
  storageItem,
  dnsItem,
  proxyItem,
  applicationsItem,
  ansibleItem,
  scriptsItem,
  cronjobsItem,
  monitoringItem,
  alertsItem,
  recordingsItem,
  keysItem,
]

const tabClass =
  "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-caption font-medium outline-none select-none focus-visible:bg-muted"

// Phone navigation (below md): a bottom tab bar, like a native app.
export function TabBar() {
  return (
    <WithPathname>{(pathname) => <Tabs pathname={pathname} />}</WithPathname>
  )
}

function Tabs({ pathname }: { pathname: string }) {
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useOpen("panel-more")
  const { workspace, workspaces, setWorkspaceId } = useWorkspace()
  const { signOut } = useAuth()
  const settings = useSettingsItem()
  const running = useActiveJobs().length
  const alerts = useNavAlerts()
  const sheetItems = [
    ...moreItems,
    ...(settings ? [settings] : []),
    accountItem,
    helpItem,
  ]
  const moreActive = sheetItems.some((item) => isActive(pathname, item.href))
  // What's broken behind "More" (storages, databases) shows on its icon.
  const moreAlerts = sheetItems.reduce(
    (n, item) => n + (alerts.get(item.href)?.count ?? 0),
    0,
  )

  // Closing the sheet pops its history entry asynchronously; navigating
  // before that pop lands would let the pop undo the navigation. So wait for
  // it, then push the new route.
  function openFromSheet(href: string) {
    window.addEventListener("popstate", () => router.push(href), {
      once: true,
    })
    setMoreOpen(false)
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <TasksStrip />
        <ul className="flex h-16 items-stretch px-2">
          {tabItems.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            const alert = alerts.get(item.href)

            return (
              <li key={item.href} className="flex flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(tabClass, active ? "text-brand" : "text-ash")}
                >
                  <span className="relative">
                    <Icon className="size-6" strokeWidth={active ? 2 : 1.5} />
                    {alert && <AlertBadge count={alert.count} />}
                  </span>
                  {item.label}
                  {alert && <span className="sr-only">, {alert.label}</span>}
                </Link>
              </li>
            )
          })}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(tabClass, moreActive ? "text-brand" : "text-ash")}
            >
              <span className="relative">
                <Ellipsis
                  className="size-6"
                  strokeWidth={moreActive ? 2 : 1.5}
                />
                {moreAlerts > 0 ? (
                  <AlertBadge count={moreAlerts} />
                ) : (
                  running > 0 && (
                    <span className="absolute -end-1.5 -top-1 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] leading-none font-medium text-primary-foreground tabular-nums">
                      {running > 9 ? "9+" : running}
                    </span>
                  )
                )}
              </span>
              More
              {moreAlerts > 0 && (
                <span className="sr-only">, {moreAlerts} with problems</span>
              )}
            </button>
          </li>
        </ul>
      </nav>

      <Drawer.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-foreground opacity-[calc(0.2*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
            <Drawer.Popup className="-mb-12 w-full [transform:translateY(var(--drawer-swipe-movement-y))] overflow-y-auto overscroll-contain rounded-t-3xl bg-card px-4 pt-3 pb-[calc(--spacing(4)+env(safe-area-inset-bottom)+--spacing(12))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(calc(100%-3rem+2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:[transform:translateY(calc(100%-3rem+2px))] data-swiping:select-none">
              <div
                aria-hidden
                className="mx-auto mb-4 h-1 w-10 rounded-full bg-mist"
              />
              <Drawer.Content>
                <Drawer.Title className="sr-only">More</Drawer.Title>
                <p className="mb-1 px-2 font-label text-caption tracking-label text-ash uppercase">
                  Workspace
                </p>
                {workspaces.length === 0 && (
                  <p className="mb-5 p-2 text-body-sm text-muted-foreground">
                    No workspace yet. Ask an admin to give you access.
                  </p>
                )}
                <ul className="mb-5 divide-y divide-border empty:hidden">
                  {workspaces.map((w) => (
                    <li key={w.id}>
                      <button
                        type="button"
                        aria-pressed={w.id === workspace?.id}
                        onClick={() => {
                          setWorkspaceId(w.id)
                          setMoreOpen(false)
                        }}
                        className="flex h-14 w-full items-center gap-4 px-2 text-body font-medium outline-none active:bg-muted"
                      >
                        <WorkspaceAvatar
                          workspace={w}
                          className="size-9 rounded-lg"
                        />
                        <span className="flex-1 truncate text-start">
                          {w.name}
                        </span>
                        {w.id === workspace?.id && (
                          <Check className="size-5 text-brand" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>

                <p className="mb-1 px-2 font-label text-caption tracking-label text-ash uppercase">
                  More
                </p>
                <ul className="divide-y divide-border">
                  {sheetItems.map((item) => (
                    <li key={item.href}>
                      <SheetRow
                        item={item}
                        active={isActive(pathname, item.href)}
                        count={item === tasksItem ? running : 0}
                        alert={alerts.get(item.href)}
                        onSelect={openFromSheet}
                      />
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex h-14 w-full items-center gap-4 px-2 text-body font-medium outline-none active:bg-muted"
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <LogOut className="size-5" strokeWidth={1.75} />
                      </span>
                      Sign out
                    </button>
                  </li>
                </ul>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}

function SheetRow({
  item,
  active,
  count,
  alert,
  onSelect,
}: {
  item: NavItem
  active: boolean
  count: number
  alert?: NavAlert
  onSelect: (href: string) => void
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={(event) => {
        event.preventDefault()
        onSelect(item.href)
      }}
      className="flex h-14 items-center gap-4 px-2 text-body font-medium outline-none active:bg-muted"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="flex-1">{item.label}</span>
      {alert && (
        <span className="text-body-sm font-normal text-destructive">
          {alert.label}
        </span>
      )}
      {count > 0 && (
        <span className="text-body-sm font-normal text-muted-foreground tabular-nums">
          {count} running
        </span>
      )}
      {active ? (
        <span aria-hidden className="size-1.5 rounded-full bg-brand" />
      ) : (
        <ChevronRight className="size-5 text-ash" />
      )}
    </Link>
  )
}

// A red count on a tab's icon: things in that section are broken.
function AlertBadge({ count }: { count: number }) {
  return (
    <span className="absolute -end-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-medium text-white tabular-nums">
      {count > 9 ? "9+" : count}
    </span>
  )
}
