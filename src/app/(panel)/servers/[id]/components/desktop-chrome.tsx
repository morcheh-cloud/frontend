"use client"

import {
  Activity,
  ChevronDown,
  Ellipsis,
  Pencil,
  SquareTerminal,
  Star,
  Terminal,
} from "lucide-react"
import Link from "next/link"
import {
  Fragment,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  address,
  OsTile,
  osLabel,
  StatusDot,
  statusMeta,
} from "../../components/meta"
import { useServerActions } from "../../components/server-actions"
import { ServerMenuItems } from "../../components/server-menu"
import { serversHref } from "../../components/use-filters"
import {
  type Section,
  sectionGroups,
  sectionHref,
  settingsSection,
} from "./sections"
import { useServerPage } from "./server-page"
import { StatusBanner } from "./status-banner"

// Desktop: the server's header across the top, its sections as tabs below
// it, then the current section at full width. A `bleed` section instead fills
// the rest of the window, flush with its edges.
export function DesktopChrome({ children }: { children: ReactNode }) {
  const { section } = useServerPage()
  if (section.bleed) {
    return (
      <div className="flex h-[calc(100svh-3rem-1px)] min-h-[32rem] flex-col">
        <ServerHeader />
        <SectionTabs />
        <StatusBanner className="mx-6 mt-4 shrink-0" />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    )
  }
  return (
    <>
      <ServerHeader />
      <SectionTabs />
      <div className="flex w-full min-w-0 flex-col gap-5 px-6 pt-5 pb-24">
        <StatusBanner />
        {children}
      </div>
    </>
  )
}

function ServerHeader() {
  const { server, checking, onDeleted } = useServerPage()
  const actions = useServerActions()

  return (
    <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
      <OsTile os={server.os} className="size-12 rounded-2xl text-body-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-subheading font-medium">
            {server.name}
          </h1>
          <button
            type="button"
            aria-label={
              server.favorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={server.favorite}
            onClick={() => actions.toggleFavorite(server)}
            className="flex size-7 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground"
          >
            <Star
              className={cn(
                "size-4",
                server.favorite && "fill-brand text-brand",
              )}
            />
          </button>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 text-foreground">
            <StatusDot status={server.status} checking={checking} />
            {checking ? "Checking…" : statusMeta[server.status].label}
            {!checking &&
              server.status === "online" &&
              server.latency_ms != null && (
                <span className="text-muted-foreground">
                  {server.latency_ms} ms
                </span>
              )}
          </span>
          <span className="font-mono text-caption">{address(server)}</span>
          {server.os.id && <span>{osLabel(server.os)}</span>}
          {server.tags.length > 0 && (
            <span className="flex gap-1">
              {server.tags.map((tag) => (
                <Link
                  key={tag}
                  href={serversHref("/servers", { tag: [tag] })}
                  className="rounded-full bg-muted px-2 text-caption leading-5 hover:bg-mist hover:text-foreground"
                >
                  {tag}
                </Link>
              ))}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          disabled={checking}
          onClick={() => actions.check(server)}
        >
          <Activity />
          {checking ? "Checking…" : "Check"}
        </Button>
        <Link
          href={sectionHref(server.id, "terminal")}
          className={buttonVariants()}
        >
          <SquareTerminal />
          SSH
        </Link>
        <Button variant="outline" onClick={() => actions.copySsh(server)}>
          <Terminal />
          Copy SSH
        </Button>
        <Button variant="outline" onClick={() => actions.editServer(server)}>
          <Pencil />
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon" aria-label="More actions" />
            }
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <ServerMenuItems
              server={server}
              checking={checking}
              onDeleted={onDeleted}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

const tabClass =
  "relative flex h-11 shrink-0 items-center gap-2 rounded-lg px-2.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full hover:text-foreground hover:after:bg-mist focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:bg-brand data-soon:text-ash data-soon:hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0"

// Flex gap between tabs, and what a group divider adds (its margins + width +
// one more gap). Keep in sync with the classes below.
const GAP = 4
const DIVIDER = 13

// The sections as a tab bar under the header, sticky below the panel header.
// What doesn't fit goes into "More": unbuilt sections first, so the built
// ones (and the current one) stay in view. Settings is pinned at the end.
function SectionTabs() {
  const { section: current } = useServerPage()
  const rowRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  // Slugs that fit in the bar; null until measured (then everything shows).
  const [shown, setShown] = useState<Set<string> | null>(null)

  useLayoutEffect(() => {
    const row = rowRef.current
    const measure = measureRef.current
    if (!row || !measure) return

    const fit = () => {
      const widths = new Map<string, number>()
      for (const el of measure.querySelectorAll<HTMLElement>("[data-slug]")) {
        widths.set(el.dataset.slug ?? "", el.getBoundingClientRect().width)
      }
      const more = widths.get("…more") ?? 0
      const settings = widths.get(settingsSection.slug) ?? 0
      const width = (slugs: Set<string>) => {
        let total = 0
        let groups = 0
        for (const group of sectionGroups) {
          const visible = group.sections.filter((s) => slugs.has(s.slug))
          if (!visible.length) continue
          groups++
          for (const s of visible) total += (widths.get(s.slug) ?? 0) + GAP
        }
        return total + Math.max(0, groups - 1) * DIVIDER
      }

      const room = row.clientWidth - settings - 8
      const all = new Set(tabSections.map((s) => s.slug))
      if (width(all) <= room) return setShown(all)

      const ranked = [
        ...tabSections.filter((s) => s.slug === current.slug),
        ...tabSections.filter((s) => s.slug !== current.slug && s.ready),
        ...tabSections.filter((s) => s.slug !== current.slug && !s.ready),
      ]
      const next = new Set<string>()
      for (const s of ranked) {
        next.add(s.slug)
        if (width(next) > room - more - GAP) {
          next.delete(s.slug)
          break
        }
      }
      setShown(next)
    }

    fit()
    // The measuring copy resizes when the font loads.
    const observer = new ResizeObserver(fit)
    observer.observe(row)
    observer.observe(measure)
    return () => observer.disconnect()
  }, [current.slug])

  const hidden = shown ? tabSections.filter((s) => !shown.has(s.slug)) : []
  let rendered = 0

  return (
    <nav
      aria-label="Server sections"
      className="sticky top-[calc(3rem+1px)] z-20 border-b border-border bg-background/90 px-4 backdrop-blur-md"
    >
      <div ref={rowRef} className="relative flex items-center gap-1">
        {sectionGroups.map((group) => {
          const visible = group.sections.filter(
            (s) => !shown || shown.has(s.slug),
          )
          if (!visible.length) return null
          const divider = rendered++ > 0
          return (
            <Fragment key={group.label ?? "main"}>
              {divider && (
                <span aria-hidden className="mx-1 h-4 w-px bg-border" />
              )}
              {visible.map((section) => (
                <SectionTab key={section.slug} section={section} />
              ))}
            </Fragment>
          )
        })}
        {hidden.length > 0 && <MoreSections sections={hidden} />}
        <span className="ms-auto">
          <SectionTab section={settingsSection} />
        </span>

        {/* Every tab at its widest (font-medium), for measuring only;
            clipped so it can't widen the page. */}
        <div
          aria-hidden
          className="pointer-events-none invisible absolute inset-0 overflow-hidden"
        >
          <div ref={measureRef} className="flex w-max">
            {[...tabSections, settingsSection].map((section) => (
              <span
                key={section.slug}
                data-slug={section.slug}
                className={cn(tabClass, "font-medium")}
              >
                <section.icon />
                {section.label}
              </span>
            ))}
            <span data-slug="…more" className={cn(tabClass, "font-medium")}>
              More
              <ChevronDown />
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}

const tabSections = sectionGroups.flatMap((g) => g.sections)

function SectionTab({ section }: { section: Section }) {
  const { server, section: current } = useServerPage()
  const Icon = section.icon
  return (
    <Link
      href={sectionHref(server.id, section.slug)}
      aria-current={current.slug === section.slug ? "page" : undefined}
      data-soon={section.ready ? undefined : ""}
      title={section.ready ? undefined : "Coming soon"}
      className={tabClass}
    >
      <Icon />
      {section.label}
    </Link>
  )
}

function MoreSections({ sections }: { sections: Section[] }) {
  const { server } = useServerPage()
  const groups = sectionGroups
    .map((g) => ({
      label: g.label,
      sections: g.sections.filter((s) => sections.includes(s)),
    }))
    .filter((g) => g.sections.length > 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={tabClass}>
        More
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {groups.map((group, i) => (
          <Fragment key={group.label ?? "main"}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              {group.label && (
                <DropdownMenuLabel className="font-label tracking-label uppercase">
                  {group.label}
                </DropdownMenuLabel>
              )}
              {group.sections.map((section) => (
                <DropdownMenuItem
                  key={section.slug}
                  render={<Link href={sectionHref(server.id, section.slug)} />}
                >
                  <section.icon />
                  <span className="flex-1 truncate">{section.label}</span>
                  {!section.ready && (
                    <span className="font-label text-[10px] tracking-label text-ash uppercase">
                      Soon
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
