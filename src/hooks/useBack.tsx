"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

// The panel's own navigation history, by pathname. A browser can't tell us
// what the previous entry is, so we mirror it: a path equal to the one two
// steps back is a Back; anything else is a push.
const stack: string[] = []

// Mount once in each shell layout (panel, help).
export function RouteHistory() {
  const pathname = usePathname()
  useEffect(() => {
    if (stack.at(-1) === pathname) return
    if (stack.at(-2) === pathname) stack.pop()
    else stack.push(pathname)
  }, [pathname])
  return null
}

/**
 * A native back button: pops history when the previous page is `parent`
 * (keeping its scroll and URL state), else replaces this page with `parent`,
 * e.g. after opening a deep link.
 */
export function useBack(parent: string) {
  const router = useRouter()
  return () => {
    if (stack.at(-2) === parent) router.back()
    else router.replace(parent)
  }
}

/**
 * Back to wherever the user came from inside the panel (a guide opened from
 * any page), else to `fallback` when the page was opened directly.
 */
export function useBackOr(fallback: string) {
  const router = useRouter()
  return () => {
    if (stack.length > 1) router.back()
    else router.replace(fallback)
  }
}

/**
 * Leaves a section that has its own shell (help): back to the last page
 * outside `prefix`, else `fallback`.
 */
export function useLeave(prefix: string, fallback: string) {
  const router = useRouter()
  return () => {
    const from = stack.findLast(
      (p) => p !== prefix && !p.startsWith(`${prefix}/`),
    )
    router.push(from ?? fallback)
  }
}
