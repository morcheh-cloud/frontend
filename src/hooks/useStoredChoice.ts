"use client"

import { useState } from "react"

/**
 * `useState` for one of a few values, remembered on this browser. Client-only
 * pages: it reads localStorage in the first render.
 */
export function useStoredChoice<T extends string>(
  key: string,
  values: readonly T[],
) {
  const [choice, setChoice] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      return values.find((v) => v === saved) ?? values[0]
    } catch {
      return values[0]
    }
  })
  return [
    choice,
    (next: T) => {
      setChoice(next)
      try {
        localStorage.setItem(key, next)
      } catch {}
    },
  ] as const
}
