"use client"

import { ChevronLeft } from "lucide-react"

import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useBackOr } from "@/hooks/useBack"

// A guide's crumb on desktop, and on phones a native app bar whose Back
// returns to the page the guide was opened from.
export function ArticleChrome({
  href,
  title,
}: {
  href: string
  title: string
}) {
  usePageCrumbs([{ href, label: title }])
  const back = useBackOr("/help")

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
      <div className="flex h-12 items-center gap-1 px-1">
        <button
          type="button"
          aria-label="Back"
          onClick={back}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"
        >
          <ChevronLeft className="size-6 rtl:rotate-180" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-body font-medium">
          {title}
        </p>
        <span aria-hidden className="size-11 shrink-0" />
      </div>
    </header>
  )
}
