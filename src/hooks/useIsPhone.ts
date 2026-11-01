"use client"

import { useSyncExternalStore } from "react"

const query = "(max-width: 767px)"
const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(query)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

// Whether the viewport is a phone (below md), or null until it is known, so a
// page that renders separate phone and desktop views mounts (and fetches for)
// only the right one.
export function useIsPhone() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => null,
  )
}
