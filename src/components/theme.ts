"use client"

import { useSyncExternalStore } from "react"

import { DARK_QUERY, THEME_KEY, themeColors } from "@/lib/theme-script"

// Light / dark theme. The choice lives in localStorage (absent = follow the
// system); the `dark` class on <html> switches the tokens in globals.css.
// `themeScript` (`@/lib/theme-script`, root layout <head>) sets it before the
// first paint.

export type ThemeChoice = "light" | "dark" | "system"
export type Theme = "light" | "dark"

const KEY = THEME_KEY
const QUERY = DARK_QUERY
const BAR = themeColors

let choice: ThemeChoice | null = null
const listeners = new Set<() => void>()

function readChoice(): ThemeChoice {
  if (choice) return choice
  try {
    const v = localStorage.getItem(KEY)
    choice = v === "light" || v === "dark" ? v : "system"
  } catch {
    choice = "system"
  }
  return choice
}

function resolve(c: ThemeChoice): Theme {
  if (c !== "system") return c
  return matchMedia(QUERY).matches ? "dark" : "light"
}

// Runs before React re-renders, so effects reacting to the theme (xterm,
// charts reading CSS variables) already see the new colors.
function apply(theme: Theme, animate = false) {
  const root = document.documentElement
  // Every hover/focus transition would otherwise fade at once.
  const freeze = animate ? null : document.createElement("style")
  if (freeze) {
    freeze.textContent = "*,*::before,*::after{transition:none!important}"
    document.head.appendChild(freeze)
  }
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", BAR[theme])
  }
  if (freeze) {
    void getComputedStyle(root).opacity
    requestAnimationFrame(() => freeze.remove())
  }
}

function notify() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) apply(resolve(readChoice()), true)
  listeners.add(listener)
  const media = matchMedia(QUERY)
  const onSystem = () => {
    if (readChoice() !== "system") return
    apply(resolve("system"))
    notify()
  }
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return
    choice = null
    apply(resolve(readChoice()))
    notify()
  }
  media.addEventListener("change", onSystem)
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    media.removeEventListener("change", onSystem)
    window.removeEventListener("storage", onStorage)
  }
}

export function setTheme(next: ThemeChoice) {
  choice = next
  try {
    if (next === "system") localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {}
  apply(resolve(next))
  notify()
}

const snapshot = () => {
  const c = readChoice()
  return `${c}:${resolve(c)}`
}

/** The saved choice and the theme actually showing. Light until mounted. */
export function useTheme() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "system:light")
  const [theme, resolved] = value.split(":") as [ThemeChoice, Theme]
  return { theme, resolved, setTheme }
}
