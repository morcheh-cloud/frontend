"use client"

import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  ChevronDown,
  CircleHelp,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { type GuideMeta, guideForPath, guideHref } from "./guides"

type Outline = { id: string; title: string }[]

// Section titles come from the guides' content, which is only loaded the
// first time someone opens the card (it's the whole help center's text).
let outlines: Record<string, Outline> | undefined
function loadOutlines() {
  return import("@/app/help/content").then(({ content }) => {
    outlines ??= Object.fromEntries(
      Object.entries(content).map(([slug, sections]) => [
        slug,
        sections.map(({ id, title }) => ({ id, title })),
      ]),
    )
    return outlines
  })
}

function useOutline(slug: string, enabled: boolean) {
  const [outline, setOutline] = useState(() => outlines?.[slug])
  useEffect(() => {
    if (!enabled || outline) return
    let live = true
    loadOutlines().then((all) => {
      if (live) setOutline(all[slug] ?? [])
    })
    return () => {
      live = false
    }
  }, [slug, enabled, outline])
  return outline
}

// Desktop, in the panel header: which guide covers this page (its name is on
// the button, so it's clear the link changes from page to page) and a card
// with what it explains and where it opens. Pages without a guide link to
// the help index. Hidden inside help itself.
export function ContextHelp({ pathname }: { pathname: string }) {
  if (!pathname || pathname === "/help" || pathname.startsWith("/help/")) {
    return null
  }
  const match = guideForPath(pathname)
  if (!match) {
    return (
      <Link href="/help" title="Guides for every page" className={pill}>
        <GuideMark />
        <span className="text-muted-foreground">Help</span>
      </Link>
    )
  }
  const anchor = match.href.split("#")[1]
  return (
    <GuideCard
      key={match.href}
      guide={match.guide}
      href={match.href}
      anchor={anchor}
    />
  )
}

// Same height and outline as the search box beside it, so the header's end
// reads as one set of controls.
const pill =
  "group flex h-8 max-w-48 shrink-0 items-center gap-2 rounded-lg border border-border bg-background ps-1 pe-2 text-body-sm outline-none transition-colors hover:border-mist hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-mist data-popup-open:bg-subtle"

function GuideMark() {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
      <BookOpenText className="size-3.5" />
    </span>
  )
}

function GuideCard({
  guide,
  href,
  anchor,
}: {
  guide: GuideMeta
  href: string
  anchor?: string
}) {
  const [open, setOpen] = useState(false)
  const outline = useOutline(guide.slug, open)
  const here = outline?.find((s) => s.id === anchor)
  const Icon = guide.icon
  const close = () => setOpen(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Guide for this page: ${guide.title}`}
        title={`How ${guide.title} works`}
        className={pill}
      >
        <GuideMark />
        <span className="min-w-0 truncate font-medium text-foreground">
          {guide.title}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-ash transition-transform group-data-popup-open:rotate-180" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 overflow-hidden p-0">
        <div className="flex gap-3 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-label text-[11px] tracking-label text-ash uppercase">
              Guide for this page
            </p>
            <h2 className="text-body-sm font-medium">{guide.title}</h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {guide.summary}
            </p>
          </div>
        </div>

        <div className="border-t border-border">
          <p className="px-4 pt-3 pb-1 text-caption font-medium text-ash">
            In this guide
          </p>
          <Sections
            outline={outline}
            slug={guide.slug}
            current={here?.id}
            onPick={close}
          />
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <Link
            href={href}
            onClick={close}
            className={buttonVariants({ size: "sm", className: "flex-1" })}
          >
            {here ? `Open at “${here.title}”` : "Read the guide"}
            <ArrowRight data-icon="inline-end" />
          </Link>
          <a
            href={href}
            target="_blank"
            rel="noopener"
            onClick={close}
            title="Open in a new tab"
            aria-label="Open in a new tab"
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
          >
            <ExternalLink />
          </a>
        </div>
        <Link
          href="/help"
          onClick={close}
          className="flex h-10 items-center gap-2 border-t border-border bg-subtle px-4 text-caption text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted"
        >
          <BookOpen className="size-3.5" />
          All guides
        </Link>
      </PopoverContent>
    </Popover>
  )
}

// Keeps the section this page opens at in view (module-level: a stable ref).
function scrollTo(el: HTMLAnchorElement | null) {
  el?.scrollIntoView({ block: "nearest" })
}

function Sections({
  outline,
  slug,
  current,
  onPick,
}: {
  outline?: Outline
  slug: string
  current?: string
  onPick: () => void
}) {
  if (!outline) {
    return (
      <div className="flex flex-col gap-2 px-4 pt-1 pb-3">
        {[70, 55, 80, 60].map((w) => (
          <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    )
  }
  return (
    <ol className="max-h-56 overflow-y-auto overscroll-contain px-2 pb-2">
      {outline.map((s, i) => {
        const active = s.id === current
        return (
          <li key={s.id}>
            <Link
              ref={active ? scrollTo : undefined}
              href={guideHref(slug, s.id)}
              onClick={onPick}
              aria-current={active ? "location" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-lg px-2 text-body-sm transition-colors outline-none hover:bg-muted focus-visible:bg-muted",
                active ? "text-brand-strong" : "text-foreground",
              )}
            >
              <span
                className={cn(
                  "w-4 shrink-0 text-end text-caption tabular-nums",
                  active ? "text-brand" : "text-ash",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
              {active && (
                <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-strong">
                  This page
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

// Phone: a 44px icon button for app bars and page headers.
export function HelpButton({
  href,
  label = "Guide",
  className,
}: {
  href: string
  label?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted",
        className,
      )}
    >
      <CircleHelp className="size-5" />
    </Link>
  )
}
