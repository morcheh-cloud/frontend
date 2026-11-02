"use client"

import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  Link2,
  ListTree,
  Search,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useBackOr } from "@/hooks/useBack"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import { JUMP_EVENT, useHelpSearch } from "./search"

export type TocEntry = { id: string; title: string }

// How far below the viewport top a heading counts as "being read":
// under the 56px desktop header (or 48px app bar) plus some air.
const READ_LINE = 120

// The section being read: the last one whose top passed the read line, or
// the last section once the page bottom is reached.
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | undefined>(ids[0])
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      if (atEnd) return setActive(ids.at(-1))
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= READ_LINE) current = id
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [ids])
  return active
}

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto" })
  history.replaceState(history.state, "", `#${id}`)
  flash(id)
}

function flash(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.removeAttribute("data-flash")
  void el.offsetWidth
  el.setAttribute("data-flash", "")
  setTimeout(() => el.removeAttribute("data-flash"), 1800)
}

function TocList({
  entries,
  active,
  onPick,
  className,
}: {
  entries: TocEntry[]
  active?: string
  onPick: (id: string) => void
  className?: string
}) {
  return (
    <ul className={cn("flex flex-col border-s border-border", className)}>
      {entries.map((e) => (
        <li key={e.id}>
          <a
            href={`#${e.id}`}
            aria-current={e.id === active ? "location" : undefined}
            onClick={(ev) => {
              ev.preventDefault()
              onPick(e.id)
            }}
            className="-ms-px block border-s-2 border-transparent py-1.5 ps-3.5 text-body-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground aria-[current]:border-brand aria-[current]:font-medium aria-[current]:text-foreground"
          >
            {e.title}
          </a>
        </li>
      ))}
    </ul>
  )
}

// Wide screens: the sticky "On this page" column, following the reader.
export function Toc({ entries }: { entries: TocEntry[] }) {
  const ids = useIds(entries)
  const active = useActiveSection(ids)
  return (
    <nav aria-label="On this page" className="flex flex-col gap-3">
      <p className="font-label text-caption tracking-label text-ash uppercase">
        On this page
      </p>
      <TocList entries={entries} active={active} onPick={scrollToSection} />
      <div className="mt-3 flex flex-col gap-1 border-t border-border pt-4">
        <CopyLink />
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex h-8 items-center gap-2 text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
        >
          <ArrowUp className="size-4" />
          Back to top
        </button>
      </div>
    </nav>
  )
}

// Medium screens: the same list, folded at the top of the article.
export function InlineToc({ entries }: { entries: TocEntry[] }) {
  return (
    <Collapsible className="rounded-2xl border border-border">
      <CollapsibleTrigger className="group flex h-12 w-full items-center gap-2 px-4 text-body-sm font-medium outline-none">
        <ListTree className="size-4 text-ash" />
        On this page
        <span className="text-ash tabular-nums">{entries.length}</span>
        <ChevronDown className="ms-auto size-4 text-ash transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <TocList entries={entries} onPick={scrollToSection} />
      </CollapsibleContent>
    </Collapsible>
  )
}

function useIds(entries: TocEntry[]) {
  return useMemo(() => entries.map((e) => e.id), [entries])
}

function CopyLink() {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(
            location.href.split("#")[0] ?? location.href,
          )
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          toast.error("Couldn't access the clipboard")
        }
      }}
      className="flex h-8 items-center gap-2 text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
    >
      {done ? (
        <Check className="size-4 text-success" />
      ) : (
        <Link2 className="size-4" />
      )}
      {done ? "Link copied" : "Copy link to guide"}
    </button>
  )
}

// A section title with a copy-link anchor (on hover, desktop).
export function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2 className="group/heading flex items-center gap-2 text-subheading font-medium">
      <a
        href={`#${id}`}
        onClick={(e) => {
          e.preventDefault()
          scrollToSection(id)
          navigator.clipboard
            ?.writeText(location.href)
            .then(() => toast("Link to this section copied"))
            .catch(() => {})
        }}
        className="outline-none focus-visible:underline"
      >
        {title}
      </a>
      <Link2
        aria-hidden
        className="size-4 text-ash opacity-0 transition-opacity group-hover/heading:opacity-100 max-md:hidden"
      />
    </h2>
  )
}

// Thin bar under the header showing how far through the guide the reader is.
export function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-[calc(3rem+env(safe-area-inset-top))] z-40 h-0.5 md:top-14"
    >
      <div
        className="h-full origin-left bg-brand transition-transform duration-100 rtl:origin-right"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  )
}

// Highlights the section a search result (or a shared link) pointed at.
export function JumpFlash() {
  useEffect(() => {
    const hash = decodeURIComponent(location.hash.slice(1))
    if (hash) setTimeout(() => flash(hash), 300)
    const onJump = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      document.getElementById(id)?.scrollIntoView()
      flash(id)
    }
    window.addEventListener(JUMP_EVENT, onJump)
    return () => window.removeEventListener(JUMP_EVENT, onJump)
  }, [])
  return null
}

// Phone: native app bar. The title fades in once the large one scrolls away;
// the list icon opens "On this page" as a bottom sheet.
export function ArticleBar({
  title,
  entries,
}: {
  title: string
  entries: TocEntry[]
}) {
  const back = useBackOr("/help")
  const search = useHelpSearch()
  const [toc, setToc] = useOpen("help-toc")
  const [scrolled, setScrolled] = useState(false)
  const ids = useIds(entries)
  const active = useActiveSection(ids)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const icon =
    "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-colors md:hidden",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <div className="flex h-12 items-center gap-1 px-1">
        <button type="button" aria-label="Back" onClick={back} className={icon}>
          <ChevronLeft className="size-6 rtl:rotate-180" />
        </button>
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-center text-body font-medium transition-opacity",
            !scrolled && "opacity-0",
          )}
        >
          {title}
        </p>
        <button
          type="button"
          aria-label="Search help"
          onClick={() => search.open()}
          className={icon}
        >
          <Search className="size-5" />
        </button>
        <button
          type="button"
          aria-label="On this page"
          onClick={() => setToc(true)}
          className={icon}
        >
          <ListTree className="size-5" />
        </button>
      </div>

      <BottomSheet open={toc} onOpenChange={setToc} title="On this page">
        <ul className="flex flex-col pb-2">
          {entries.map((e, i) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  window.addEventListener(
                    "popstate",
                    () => setTimeout(() => scrollToSection(e.id), 50),
                    { once: true },
                  )
                  setToc(false)
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-start text-body outline-none active:bg-muted"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-caption tabular-nums",
                    e.id === active
                      ? "bg-brand text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1",
                    e.id === active && "font-medium",
                  )}
                >
                  {e.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </header>
  )
}
