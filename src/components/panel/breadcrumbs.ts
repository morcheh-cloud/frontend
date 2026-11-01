"use client"

import { useEffect, useSyncExternalStore } from "react"

import type { NavLink } from "./nav"

// Crumbs a page adds after the nav's own, for things nav.ts can't know (a
// server's name, the section inside it).
let extra: NavLink[] = []
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const none: NavLink[] = []

export function usePageCrumbs(crumbs: NavLink[]) {
  const key = JSON.stringify(crumbs)
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by value
  useEffect(() => {
    extra = crumbs
    emit()
    return () => {
      extra = none
      emit()
    }
  }, [key])
}

export function useExtraCrumbs() {
  return useSyncExternalStore(
    subscribe,
    () => extra,
    () => none,
  )
}
