"use client"

import { ChevronRight, Search, SearchX } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { type GuideMeta, guideHref, guides } from "@/components/help/guides"
import { Input } from "@/components/ui/input"

function matches(guide: GuideMeta, q: string) {
  return [guide.title, guide.summary, ...guide.keywords].some((s) =>
    s.toLowerCase().includes(q),
  )
}

// Every guide, grouped and searchable. Desktop: cards; phone: list rows.
export function GuideIndex() {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const shown = q ? guides.filter((g) => matches(g, q)) : guides
  const groups = [...new Set(shown.map((g) => g.group))]

  return (
    <div className="flex w-full flex-col gap-6 pt-4 pb-24 md:px-6 md:pt-5">
      <div className="relative px-4 md:max-w-md md:px-0">
        <Search className="pointer-events-none absolute start-7 top-1/2 size-4 -translate-y-1/2 text-ash md:start-3" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides"
          aria-label="Search guides"
          enterKeyHint="search"
          className="ps-9"
        />
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <SearchX className="size-5 text-ash" />
          <p className="mt-3 text-body font-medium">No guide matches</p>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Try another word, like “ssh”, “backup” or “upload”.
          </p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group} className="flex flex-col gap-2 md:gap-3">
          <h2 className="px-4 font-label text-caption tracking-label text-ash uppercase md:px-0">
            {group}
          </h2>
          <ul className="divide-y divide-border border-y border-border md:grid md:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] md:gap-4 md:divide-y-0 md:border-0">
            {shown
              .filter((g) => g.group === group)
              .map((guide) => (
                <li key={guide.slug}>
                  <GuideEntry guide={guide} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function GuideEntry({ guide }: { guide: GuideMeta }) {
  const Icon = guide.icon
  return (
    <Link
      href={guideHref(guide.slug)}
      className="flex h-full items-center gap-4 px-4 py-3 outline-none active:bg-muted md:flex-col md:items-start md:gap-3 md:rounded-2xl md:border md:border-border md:bg-card md:p-6 md:shadow-sm md:transition-shadow md:hover:shadow-md md:focus-visible:ring-3 md:focus-visible:ring-ring/50 md:active:bg-card"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium">{guide.title}</span>
        <span className="mt-0.5 block text-body-sm text-muted-foreground max-md:line-clamp-2">
          {guide.summary}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ash md:hidden" />
    </Link>
  )
}
