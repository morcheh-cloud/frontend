"use client"

import { Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"
import { useFilters } from "./use-filters"

// Search by name, IP/host, hostname, notes or exact tag. Typing updates the
// URL after a short pause; on desktop "/" focuses it.
export function SearchInput({
  shortcut = false,
  className,
}: {
  shortcut?: boolean
  className?: string
}) {
  const { filters, setFilters } = useFilters()
  const [text, setText] = useState(filters.q)
  const sent = useRef(filters.q)
  const inputRef = useRef<HTMLInputElement>(null)

  // Follow outside changes (Clear filters, back/forward), not our own echo.
  useEffect(() => {
    if (filters.q !== sent.current) {
      sent.current = filters.q
      setText(filters.q)
    }
  }, [filters.q])

  useEffect(() => {
    const value = text.trim()
    if (value === sent.current) return
    const t = setTimeout(() => {
      sent.current = value
      setFilters({ q: value || null })
    }, 250)
    return () => clearTimeout(t)
  }, [text, setFilters])

  useEffect(() => {
    if (!shortcut) return
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      const typing =
        el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [shortcut])

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
      <input
        ref={inputRef}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setText("")
            e.currentTarget.blur()
          }
        }}
        placeholder="Search name, IP, hostname or tag"
        aria-label="Search servers"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        className="h-11 w-full rounded-lg border border-input bg-card ps-9 pe-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setText("")}
          className="absolute end-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-ash hover:text-foreground md:size-7"
        >
          <X className="size-4" />
        </button>
      ) : (
        shortcut && (
          <Kbd className="absolute end-2.5 top-1/2 -translate-y-1/2">/</Kbd>
        )
      )}
    </div>
  )
}
