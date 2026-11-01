"use client"

import { ChevronLeft, ChevronRight, History, Search } from "lucide-react"
import Link from "next/link"
import { useSyncExternalStore } from "react"

import { guideFor, guideHref } from "@/components/help/guides"
import { Kbd } from "@/components/ui/kbd"
import { useLeave } from "@/hooks/useBack"
import { cn } from "@/lib/utils"
import { useRecentGuides } from "../recent"
import { useHelpSearch } from "./search"

const noop = () => () => {}

// "⌘K" on Apple devices, "Ctrl K" elsewhere.
export function SearchShortcut({ className }: { className?: string }) {
  const mac = useSyncExternalStore(
    noop,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  )
  return <Kbd className={className}>{mac ? "⌘ K" : "Ctrl K"}</Kbd>
}

// The big search field of the help home. Opens the search layer.
export function HeroSearch() {
  const search = useHelpSearch()
  return (
    <button
      type="button"
      onClick={() => search.open()}
      className="group flex h-12 w-full items-center gap-3 rounded-lg bg-muted px-3 text-body text-ash outline-none active:bg-mist/60 md:h-14 md:rounded-2xl md:border md:border-input md:bg-card md:px-5 md:shadow-sm md:transition-shadow md:hover:shadow-md md:focus-visible:ring-3 md:focus-visible:ring-ring/50"
    >
      <Search className="size-4 md:size-5 md:text-muted-foreground" />
      <span className="flex-1 text-start">
        Search guides, settings, commands…
      </span>
      <SearchShortcut className="hidden md:inline-flex" />
    </button>
  )
}

// A popular topic: opens the search with it filled in.
export function Topic({ query }: { query: string }) {
  const search = useHelpSearch()
  return (
    <button
      type="button"
      onClick={() => search.open(query)}
      className="h-9 shrink-0 rounded-full border border-border bg-card px-3.5 text-body-sm text-muted-foreground transition-colors outline-none hover:border-mist hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted md:h-8 md:px-3"
    >
      {query}
    </button>
  )
}

// Phone: native app bar with the way back to the panel and a large title.
export function PhoneHomeBar() {
  const leave = useLeave("/help", "/home")
  return (
    <div className="pt-[env(safe-area-inset-top)] md:hidden">
      <div className="flex h-12 items-center px-1">
        <button
          type="button"
          onClick={leave}
          className="flex h-11 items-center gap-0.5 rounded-full pe-3 text-body text-brand outline-none active:bg-muted"
        >
          <ChevronLeft className="size-6 rtl:rotate-180" />
          Panel
        </button>
      </div>
      <h1 className="px-4 pt-1 text-heading font-light">Help</h1>
    </div>
  )
}

// The guides read last in this browser. Nothing until there are some.
export function RecentGuides() {
  const recent = useRecentGuides()
    .map((slug) => guideFor(slug))
    .filter((g) => g !== undefined)
    .slice(0, 4)
  if (!recent.length) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 px-4 font-label text-caption tracking-label text-ash uppercase md:px-0">
        <History className="size-3.5" />
        Continue reading
      </h2>
      <ul className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {recent.map((g) => {
          const Icon = g.icon
          return (
            <li key={g.slug} className="w-56 shrink-0 snap-start md:w-auto">
              <Link
                href={guideHref(g.slug)}
                className={cn(
                  "flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-3 pe-4 outline-none active:bg-muted",
                  "md:transition-shadow md:hover:shadow-md md:focus-visible:ring-3 md:focus-visible:ring-ring/50",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-medium">
                    {g.title}
                  </span>
                  <span className="block truncate text-caption tracking-normal text-ash">
                    {g.group}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
