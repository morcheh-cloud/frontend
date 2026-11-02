"use client"

import { useEffect, useRef } from "react"

// A one-shot request for a page to do something once it is on screen, e.g.
// the command palette asking the servers page to open "Add server". Queue it,
// then navigate: the page's provider runs it on mount, or straight away when
// it is already mounted. Nothing goes into the URL, so Back and reloads never
// replay it.

const EVENT = "morcheh:intent"
let pending: string | null = null

export function queueIntent(name: string) {
  pending = name
  window.dispatchEvent(new Event(EVENT))
}

export function useIntent(name: string, run: () => void) {
  const latest = useRef(run)
  latest.current = run

  useEffect(() => {
    const take = () => {
      if (pending !== name) return
      pending = null
      latest.current()
    }
    take()
    window.addEventListener(EVENT, take)
    return () => window.removeEventListener(EVENT, take)
  }, [name])
}
