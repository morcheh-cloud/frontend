"use client"

import { Drawer } from "@base-ui/react/drawer"
import { Check, ChevronRight, Ellipsis } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import {
  alertsItem,
  homeItem,
  isActive,
  keysItem,
  monitoringItem,
  type NavItem,
  serversItem,
  servicesItem,
  settingsItem,
} from "./nav"
import { useWorkspace, WorkspaceAvatar, workspaces } from "./workspace"

// A native tab bar fits four tabs plus "More"; the rest live in a sheet.
const tabItems = [homeItem, serversItem, servicesItem, alertsItem]
const moreItems = [monitoringItem, keysItem, settingsItem]

const tabClass =
  "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-caption font-medium outline-none select-none focus-visible:bg-muted"

// Phone navigation (below md): a bottom tab bar, like a native app.
export function TabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useOpen("panel-more")
  const { workspace, setWorkspaceId } = useWorkspace()
  const moreActive = moreItems.some((item) => isActive(pathname, item.href))

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
        <ul className="flex h-16 items-stretch px-2">
          {tabItems.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon

            return (
              <li key={item.href} className="flex flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(tabClass, active ? "text-brand" : "text-ash")}
                >
                  <Icon className="size-6" strokeWidth={active ? 2 : 1.5} />
                  {item.label}
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
              <Ellipsis className="size-6" strokeWidth={moreActive ? 2 : 1.5} />
              More
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
                <ul className="mb-5 divide-y divide-border">
                  {workspaces.map((w) => (
                    <li key={w.id}>
                      <button
                        type="button"
                        aria-pressed={w.id === workspace.id}
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
                        {w.id === workspace.id && (
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
                  {moreItems.map((item) => (
                    <li key={item.href}>
                      <SheetRow
                        item={item}
                        active={isActive(pathname, item.href)}
                        onSelect={openFromSheet}
                      />
                    </li>
                  ))}
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
  onSelect,
}: {
  item: NavItem
  active: boolean
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
      {active ? (
        <span aria-hidden className="size-1.5 rounded-full bg-brand" />
      ) : (
        <ChevronRight className="size-5 text-ash" />
      )}
    </Link>
  )
}
