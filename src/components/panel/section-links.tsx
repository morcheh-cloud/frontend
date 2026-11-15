"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { currentChild, type NavItem } from "./nav"
import { WithPathname } from "./with-pathname"

// Phones have no sidebar, so a section's sub-pages show as a row of chips at
// the top of each of them (desktop finds them in the sidebar). Moving between
// them replaces the history entry, like tabs: Back leaves the section.
// `counts` adds a number to a chip, keyed by the child's href.

// The current chip may sit past the end of the row: scroll the row to it.
function showCurrent(el: HTMLAnchorElement | null) {
  const row = el?.closest("nav")
  if (!el || !row) return
  const start = el.offsetLeft - row.offsetLeft
  if (start + el.offsetWidth > row.scrollLeft + row.clientWidth)
    row.scrollLeft = start + el.offsetWidth - row.clientWidth + 16
}

export function SectionLinks({
  item,
  counts,
  className,
}: {
  item: NavItem
  counts?: Record<string, number | undefined>
  className?: string
}) {
  const children = item.children ?? []
  return (
    <WithPathname>
      {(pathname) => {
        const current = currentChild(pathname, children)
        return (
          <nav
            aria-label={item.label}
            className={cn("no-scrollbar overflow-x-auto px-4", className)}
          >
            <div className="flex w-max rounded-lg bg-muted p-0.5">
              {children.map((child) => {
                const count = counts?.[child.href]
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    replace
                    scroll={false}
                    ref={child.href === current ? showCurrent : undefined}
                    aria-current={child.href === current ? "page" : undefined}
                    className="flex h-10 items-center rounded-md px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-card aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
                  >
                    {child.label}
                    {count ? ` · ${count}` : null}
                  </Link>
                )
              })}
            </div>
          </nav>
        )
      }}
    </WithPathname>
  )
}
