"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { Module } from "@/lib/services"
import { cn } from "@/lib/utils"
import { categories, categoryOf, ModuleIcon, plain, popular } from "./meta"

// Category chips with counts; "All" first. Scrolls sideways on phones.
export function CategoryChips({
  items,
  value,
  onChange,
  className,
}: {
  items: Module[]
  value: string
  onChange: (category: string) => void
  className?: string
}) {
  const counts = new Map<string, number>()
  for (const m of items)
    counts.set(m.category, (counts.get(m.category) ?? 0) + 1)
  const chips = [
    { key: "", label: "All", count: items.length },
    ...categories
      .filter((c) => counts.has(c.key))
      .map((c) => ({
        key: c.key,
        label: c.label,
        count: counts.get(c.key) ?? 0,
      })),
  ]
  return (
    <fieldset
      className={cn(
        "flex min-w-0 [scrollbar-width:none] gap-2 overflow-x-auto",
        className,
      )}
    >
      <legend className="sr-only">Category</legend>
      {chips.map((c) => (
        <button
          key={c.key || "all"}
          type="button"
          aria-pressed={value === c.key}
          onClick={() => onChange(c.key)}
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8",
            value === c.key
              ? "border-brand bg-brand-soft text-brand-strong"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {c.label}
          <span className="text-caption text-ash">{c.count}</span>
        </button>
      ))}
    </fieldset>
  )
}

// Rows drawn per category in the grouped view, and per step in a flat one:
// a full Ansible install has thousands of modules, and drawing them all at
// once freezes the page.
const GROUP_ROWS = 6
const PAGE_ROWS = 60

// The modules to show: grouped by category when nothing narrows them, with
// the usual picks on top (`withPopular`), else one ranked list drawn a page at
// a time. A category's "Show all" picks it (`onCategory`).
export function ModuleList({
  items,
  grouped,
  withPopular,
  onPick,
  onCategory,
  selected,
  className,
}: {
  items: Module[]
  grouped: boolean
  withPopular?: Module[]
  onPick: (m: Module) => void
  onCategory: (category: string) => void
  selected?: string
  className?: string
}) {
  if (!grouped) {
    return (
      <PagedList
        items={items}
        onPick={onPick}
        selected={selected}
        className={className}
      />
    )
  }
  const groups = categories
    .map((c) => ({ c, list: items.filter((m) => m.category === c.key) }))
    .filter((g) => g.list.length > 0)
  return (
    <div className={cn("flex flex-col", className)}>
      {withPopular && withPopular.length > 0 && (
        <Group title="Most used" hint="The modules most playbooks start with">
          {withPopular.map((m) => (
            <ModuleRow key={m.name} m={m} onPick={onPick} selected={selected} />
          ))}
        </Group>
      )}
      {groups.map(({ c, list }) => (
        <Group key={c.key} title={c.label} hint={c.hint}>
          {list.slice(0, GROUP_ROWS).map((m) => (
            <ModuleRow key={m.name} m={m} onPick={onPick} selected={selected} />
          ))}
          {list.length > GROUP_ROWS && (
            <li>
              <MoreButton onClick={() => onCategory(c.key)}>
                Show all {list.length} in {c.label}
              </MoreButton>
            </li>
          )}
        </Group>
      ))}
    </div>
  )
}

function PagedList({
  items,
  onPick,
  selected,
  className,
}: {
  items: Module[]
  onPick: (m: Module) => void
  selected?: string
  className?: string
}) {
  const [shown, setShown] = useState(PAGE_ROWS)
  const [seen, setSeen] = useState(items)
  // A new search or category starts from the top again.
  if (seen !== items) {
    setSeen(items)
    setShown(PAGE_ROWS)
  }
  const more = () => setShown((n) => n + PAGE_ROWS)
  const left = items.length - shown
  return (
    <ul className={cn("divide-y divide-border", className)}>
      {items.slice(0, shown).map((m) => (
        <ModuleRow key={m.name} m={m} onPick={onPick} selected={selected} />
      ))}
      {left > 0 && (
        <li>
          <NearEnd onNear={more} />
          <MoreButton onClick={more}>Show more ({left} left)</MoreButton>
        </li>
      )}
    </ul>
  )
}

// Calls `onNear` when it scrolls close to view, so the list grows by itself.
function NearEnd({ onNear }: { onNear: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const latest = useRef(onNear)
  useEffect(() => {
    latest.current = onNear
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) latest.current()
      },
      { rootMargin: "400px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} aria-hidden />
}

function MoreButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-2 px-4 text-start text-body-sm text-brand outline-none hover:bg-subtle focus-visible:bg-subtle md:min-h-10"
    >
      <ChevronDown className="size-4 shrink-0" />
      {children}
    </button>
  )
}

export function popularOf(items: Module[]) {
  const byName = new Map(items.map((m) => [m.name, m]))
  return popular.map((n) => byName.get(n)).filter((m): m is Module => !!m)
}

function Group({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="sticky top-0 z-10 flex items-baseline gap-2 border-b border-border bg-background/95 px-4 pt-4 pb-2 backdrop-blur-sm">
        <span className="font-label text-caption tracking-label text-muted-foreground uppercase">
          {title}
        </span>
        <span className="hidden truncate text-caption text-ash md:inline">
          {hint}
        </span>
      </h3>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  )
}

function ModuleRow({
  m,
  onPick,
  selected,
}: {
  m: Module
  onPick: (m: Module) => void
  selected?: string
}) {
  const builtin = m.collection === "ansible.builtin"
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(m)}
        aria-current={selected === m.name ? "true" : undefined}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start outline-none hover:bg-subtle focus-visible:bg-subtle active:bg-muted aria-[current]:bg-brand-soft md:min-h-12"
      >
        <ModuleIcon category={m.category} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-body-sm font-medium">
              {m.short_name}
            </span>
            {!builtin && (
              <span className="truncate text-caption text-ash">
                {m.collection}
              </span>
            )}
          </span>
          <span className="truncate text-caption text-muted-foreground">
            {plain(m.description)}
          </span>
        </span>
        <span className="hidden shrink-0 text-caption text-ash lg:inline">
          {categoryOf(m.category).label}
        </span>
        <ChevronRight className="size-4 shrink-0 text-ash" />
      </button>
    </li>
  )
}
