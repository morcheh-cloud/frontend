"use client"

import Link from "next/link"
import { Fragment } from "react"

import { ContextHelp } from "@/components/help/help-link"
import { TasksButton } from "@/components/jobs/tasks-button"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useExtraCrumbs } from "./breadcrumbs"
import { SearchButton } from "./command/command-palette"
import { breadcrumbFor } from "./nav"
import { WithPathname } from "./with-pathname"

// Desktop bar above every panel page: sidebar toggle, where you are, and at
// the end the search (⌘K) and the page's guide. It stays pinned while the page scrolls; sticky things below
// it offset by its height (3rem + 1px border).
export function PanelHeader() {
  return (
    <header className="sticky top-0 z-30 hidden h-12 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur-md md:flex">
      <SidebarTrigger className="-ms-1" />
      <Separator
        orientation="vertical"
        className="me-2 data-vertical:h-4 data-vertical:self-auto"
      />
      <WithPathname>
        {(pathname) => (
          <>
            <Crumbs pathname={pathname} />
            <div className="ms-auto flex items-center gap-1">
              <SearchButton />
              <TasksButton />
              <ContextHelp pathname={pathname} />
            </div>
          </>
        )}
      </WithPathname>
    </header>
  )
}

function Crumbs({ pathname }: { pathname: string }) {
  const crumbs = [...breadcrumbFor(pathname), ...useExtraCrumbs()]
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {i < crumbs.length - 1 ? (
                <BreadcrumbLink render={<Link href={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
