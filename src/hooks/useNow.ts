"use client"

import { useEffect, useState } from "react"

/** `Date.now()`, refreshed every `interval` ms while `enabled`. */
export function useNow(interval: number, enabled = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(t)
  }, [interval, enabled])
  return now
}
