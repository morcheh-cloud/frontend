"use client"

import { ServerOff } from "lucide-react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { ApiError } from "@/lib/api"
import { useCheckingIds, useServer } from "../../api"
import { DesktopChrome } from "./desktop-chrome"
import { MobileChrome } from "./mobile-chrome"
import { sectionFor, sectionHref, settingsSection } from "./sections"
import { ServerPageContext } from "./server-page"

// Everything under /servers/[id]: loads the server once, then frames the
// section with the desktop header and tabs, or the phone app bar.
export function ServerShell({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const slug = usePathname().split("/")[3] ?? ""
  const section = sectionFor(slug) ?? settingsSection
  const query = useServer(id)
  const checking = useCheckingIds().has(id)
  const isPhone = useIsPhone()
  const router = useRouter()
  const server = query.data

  usePageCrumbs(
    server
      ? [
          { href: sectionHref(id, ""), label: server.name },
          ...(slug
            ? [{ href: sectionHref(id, slug), label: section.label }]
            : []),
        ]
      : [],
  )

  if (isPhone === null) return null
  // Keep showing the last good copy if a refetch fails (e.g. right after a
  // delete, before we navigate away).
  if (!server) {
    if (query.error) {
      return (
        <Missing
          notFound={
            query.error instanceof ApiError && query.error.status === 404
          }
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      )
    }
    return <Loading />
  }

  const page = {
    server,
    checking,
    section,
    phone: isPhone,
    onDeleted: () => router.replace("/servers"),
  }
  const Chrome = isPhone ? MobileChrome : DesktopChrome
  return (
    <ServerPageContext.Provider value={page}>
      <Chrome>{children}</Chrome>
    </ServerPageContext.Provider>
  )
}

function Loading() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))] md:px-6 md:pt-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

function Missing({
  notFound,
  message,
  onRetry,
}: {
  notFound: boolean
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <ServerOff className="size-5" />
      </span>
      <div>
        <h1 className="text-body font-medium">
          {notFound ? "Server not found" : "Couldn't load this server"}
        </h1>
        <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
          {notFound
            ? "It may have been deleted, or the link is wrong."
            : message}
        </p>
      </div>
      <div className="flex gap-2">
        {!notFound && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Link href="/servers" className={buttonVariants()}>
          Back to servers
        </Link>
      </div>
    </div>
  )
}
