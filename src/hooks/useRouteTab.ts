"use client"

import { usePathname } from "next/navigation"

// For a section whose sub-pages share one view: which of them this route is.
// `pages` maps each to its path; the longest path the URL starts with wins,
// else the first one. Reading the pathname suspends on dynamic routes, so
// call it under <Suspense> (section pages already are).
export function useRouteTab<T extends string>(pages: Record<T, string>): T {
  const pathname = usePathname()
  const keys = Object.keys(pages) as T[]
  let best = keys[0]
  let length = -1
  for (const key of keys) {
    const path = pages[key]
    const fits = pathname === path || pathname.startsWith(`${path}/`)
    if (fits && path.length > length) {
      best = key
      length = path.length
    }
  }
  return best
}
