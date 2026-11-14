"use client"

import { CircleAlert } from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// The desktop frame of a full-page add/edit form (cron job, sync, monitor,
// backup plan…): a sticky title bar holding Cancel/Save, the form's sections
// across the whole width, and from xl a sticky side column with the
// "On this page" list (which section you're in, which ones have problems)
// and the editor's own summary. Phones keep their own native layout.
//
// Sections are found in the DOM: anything with `data-editor-section`
// (the shared `Section` in cronjobs/components/editor-parts sets it).

const TOP = "3rem + 1px" // the panel header
const BAR = "4rem" // this frame's title bar

export function EditorPage({
  icon,
  title,
  status,
  dirty,
  actions,
  aside,
  onSave,
  children,
  as: Tag = "div",
  onSubmit,
}: {
  icon: ReactNode
  title: string
  status?: ReactNode
  // Shows a dot before the status line.
  dirty?: boolean
  actions: ReactNode
  // The editor's summary and other glanceable cards, under the section list.
  aside?: ReactNode
  // Ctrl/⌘+S. Leave it out (or undefined) while saving isn't possible.
  onSave?: () => void
  children: ReactNode
  as?: "div" | "form"
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  const body = useRef<HTMLDivElement>(null)
  useSaveShortcut(onSave)

  const content = (
    <>
      <header className="sticky top-[calc(3rem+1px)] z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong [&>svg]:size-5">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-body font-medium">{title}</h1>
          {status && (
            <p className="flex items-center gap-1.5 truncate text-caption text-ash">
              {dirty && (
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-brand"
                />
              )}
              <span className="truncate">{status}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </header>

      <div className="grid gap-6 px-6 pt-6 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div
          ref={body}
          className="grid min-w-0 content-start gap-6 [&_[data-editor-section]]:scroll-mt-[calc(3rem+1px+4rem+1.5rem)]"
        >
          {children}
        </div>
        <aside className="hidden min-w-0 xl:block">
          <div
            className="sticky no-scrollbar flex max-h-[calc(100dvh-var(--editor-top)-1.5rem)] flex-col gap-4 overflow-y-auto"
            style={
              {
                top: `calc(${TOP} + ${BAR} + 1.5rem)`,
                "--editor-top": `calc(${TOP} + ${BAR} + 1.5rem)`,
              } as React.CSSProperties
            }
          >
            <SectionNav root={body} />
            {aside}
          </div>
        </aside>
      </div>
    </>
  )
  const frame = "flex min-w-0 flex-col pb-12"
  return Tag === "form" ? (
    <form onSubmit={onSubmit} className={frame}>
      {content}
    </form>
  ) : (
    <div className={frame}>{content}</div>
  )
}

// A card for the side column ("Summary", "What happens next"…).
export function AsideCard({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-2xl border border-border p-5", className)}>
      <h2 className="font-label text-[11px] tracking-label text-ash uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

// Label/value rows for the summary card. Empty values show a quiet dash.
export function SummaryList({
  rows,
}: {
  rows: [label: string, value: ReactNode, mono?: boolean][]
}) {
  return (
    <dl className="grid gap-3">
      {rows.map(([label, value, mono]) => (
        <div key={label} className="min-w-0">
          <dt className="text-caption text-ash">{label}</dt>
          <dd
            className={cn(
              "text-body-sm break-words",
              mono && "font-mono text-caption",
              (value === "" || value == null) && "text-ash",
            )}
          >
            {value === "" || value == null ? "—" : value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function EditorLoading() {
  return (
    <div className="flex flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-5 w-60" />
      </div>
      <div className="grid gap-6 px-6 pt-6 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid content-start gap-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="hidden h-64 rounded-2xl xl:block" />
      </div>
    </div>
  )
}

type Item = { id: string; title: string; problems: number }

const sameItems = (a: Item[], b: Item[]) =>
  a.length === b.length &&
  a.every(
    (x, i) =>
      x.id === b[i].id &&
      x.title === b[i].title &&
      x.problems === b[i].problems,
  )

function read(root: HTMLElement): Item[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-editor-section]"))
    .filter((el) => el.getClientRects().length > 0)
    .map((el) => ({
      id: el.id,
      title: el.dataset.editorSection ?? "",
      problems: el.querySelectorAll('[aria-invalid="true"], [data-error]')
        .length,
    }))
    .filter((x) => x.id && x.title)
}

// "On this page": every section of the form, the one in view marked, the
// ones holding a refused field flagged. A click scrolls to it.
function SectionNav({
  root,
}: {
  root: React.RefObject<HTMLDivElement | null>
}) {
  const [items, setItems] = useState<Item[]>([])
  const [active, setActive] = useState("")

  useEffect(() => {
    const el = root.current
    if (!el) return
    const update = () =>
      setItems((old) => {
        const next = read(el)
        return sameItems(old, next) ? old : next
      })
    update()
    const mo = new MutationObserver(update)
    mo.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-invalid", "data-error", "data-editor-section"],
    })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      mo.disconnect()
      ro.disconnect()
    }
  }, [root])

  useEffect(() => {
    const el = root.current
    if (!el || items.length === 0) return
    let frame = 0
    const spy = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const line = 49 + 64 + 32 // header + bar + a little
        const atEnd =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 4
        let current = items[0]?.id ?? ""
        if (atEnd) current = items[items.length - 1].id
        else
          for (const it of items) {
            const s = document.getElementById(it.id)
            if (s && s.getBoundingClientRect().top <= line) current = it.id
          }
        setActive(current)
      })
    }
    spy()
    window.addEventListener("scroll", spy, { passive: true })
    window.addEventListener("resize", spy)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", spy)
      window.removeEventListener("resize", spy)
    }
  }, [root, items])

  if (items.length < 2) return null
  const problems = items.filter((i) => i.problems > 0)

  const go = (id: string) => {
    const s = document.getElementById(id)
    if (!s) return
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
    s.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" })
    const field = s.querySelector<HTMLElement>(
      '[aria-invalid="true"], input:not([type=hidden]), textarea, button[role=radio]',
    )
    field?.focus({ preventScroll: true })
  }

  return (
    <nav aria-label="On this page" className="flex flex-col gap-2">
      {problems.length > 0 && (
        <button
          type="button"
          onClick={() => go(problems[0].id)}
          className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-3 py-2.5 text-start text-caption text-destructive outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CircleAlert className="mt-px size-4 shrink-0" />
          <span>
            {problems.length === 1
              ? `Fix ${problems[0].title}`
              : `${problems.length} sections need a fix`}
          </span>
        </button>
      )}
      <h2 className="px-3 pt-1 font-label text-[11px] tracking-label text-ash uppercase">
        On this page
      </h2>
      <ol className="flex flex-col border-s border-border">
        {items.map((it) => {
          const on = it.id === active
          return (
            <li key={it.id}>
              <button
                type="button"
                aria-current={on ? "location" : undefined}
                onClick={() => go(it.id)}
                className={cn(
                  "-ms-px flex w-full items-center gap-2 border-s-2 py-1.5 ps-3 pe-2 text-start text-body-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on
                    ? "border-brand font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{it.title}</span>
                {it.problems > 0 && (
                  <span
                    role="img"
                    aria-label="Needs a fix"
                    className="size-1.5 shrink-0 rounded-full bg-destructive"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Ctrl/⌘+S saves instead of opening the browser's "Save page".
function useSaveShortcut(save: (() => void) | undefined) {
  const ref = useRef(save)
  useEffect(() => {
    ref.current = save
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return
      if (e.altKey || e.shiftKey) return
      e.preventDefault()
      ref.current?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}

// For a Section's id: "From and to" → "section-from-and-to".
export const sectionId = (title: string) =>
  `section-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`
