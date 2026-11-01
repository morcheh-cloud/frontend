"use client"

import { ArrowLeft, Search } from "lucide-react"
import Link from "next/link"

import { LogoMark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { useLeave } from "@/hooks/useBack"
import { useHelpSearch } from "./search"

// Desktop top bar of the help center: brand, search, the way back to the
// panel. Phones use each page's own app bar instead.
export function HelpHeader() {
  const search = useHelpSearch()
  const leave = useLeave("/help", "/home")

  return (
    <header className="sticky top-0 z-40 hidden h-14 border-b border-border bg-background/85 backdrop-blur-md md:block">
      <div className="mx-auto flex h-full max-w-[88rem] items-center gap-6 px-6">
        <Link
          href="/help"
          className="flex shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogoMark className="text-brand" />
          <span className="text-body font-medium">Morcheh</span>
          <span aria-hidden className="h-4 w-px bg-mist" />
          <span className="text-body text-muted-foreground">Help center</span>
        </Link>

        <button
          type="button"
          onClick={() => search.open()}
          className="mx-auto flex h-9 w-full max-w-md items-center gap-2.5 rounded-lg border border-border bg-subtle px-3 text-body-sm text-ash transition-colors outline-none hover:border-mist hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Search className="size-4" />
          <span className="flex-1 text-start">Search guides…</span>
          <Kbd>Ctrl K</Kbd>
        </button>

        <Button variant="outline" onClick={leave} className="shrink-0">
          <ArrowLeft className="rtl:rotate-180" />
          Back to panel
        </Button>
      </div>
    </header>
  )
}
