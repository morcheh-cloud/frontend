"use client"

import { useEffect, useState } from "react"

// Per-browser memory of help: the last guides read and the last searches
// that led somewhere. Storage can be unavailable (private mode); then both
// lists simply stay empty.

const GUIDES = "morcheh.help.recent"
const SEARCHES = "morcheh.help.searches"
const EVENT = "morcheh:help-recent"

function read(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]")
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : []
  } catch {
    return []
  }
}

function write(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
    window.dispatchEvent(new Event(EVENT))
  } catch {}
}

function push(key: string, value: string, max: number) {
  write(key, [value, ...read(key).filter((v) => v !== value)].slice(0, max))
}

export const rememberGuide = (slug: string) => push(GUIDES, slug, 6)
export const rememberSearch = (query: string) => push(SEARCHES, query, 5)
export const forgetSearch = (query: string) =>
  write(
    SEARCHES,
    read(SEARCHES).filter((v) => v !== query),
  )

function useList(key: string) {
  const [list, setList] = useState<string[]>([])
  useEffect(() => {
    const load = () => setList(read(key))
    load()
    window.addEventListener(EVENT, load)
    window.addEventListener("storage", load)
    return () => {
      window.removeEventListener(EVENT, load)
      window.removeEventListener("storage", load)
    }
  }, [key])
  return list
}

export const useRecentGuides = () => useList(GUIDES)
export const useRecentSearches = () => useList(SEARCHES)

// Marks a guide as read. Rendered by the article page.
export function RememberGuide({ slug }: { slug: string }) {
  useEffect(() => rememberGuide(slug), [slug])
  return null
}
