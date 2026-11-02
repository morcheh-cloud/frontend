"use client"

import { Dialog } from "@base-ui/react/dialog"
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  CornerDownLeft,
  History,
  Search,
  SearchX,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { guideFor, guideHref, guides } from "@/components/help/guides"
import { Kbd } from "@/components/ui/kbd"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import { forgetSearch, rememberSearch, useRecentSearches } from "../recent"
import { escapeRegex, type Hit, searchHelp, terms } from "../search-engine"
import type { IndexedGuide } from "../search-index"

type HelpSearch = { open: (query?: string) => void; index: IndexedGuide[] }

const Ctx = createContext<HelpSearch | null>(null)

export function useHelpSearch() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useHelpSearch outside <HelpSearchProvider>")
  return ctx
}

// Ask the article page to highlight a section once it is on screen (a
// same-page hash push fires no event of its own).
export const JUMP_EVENT = "morcheh:help-jump"

// Full-text search over every guide, opened from the header, the home page,
// phone app bars, or with ⌘K / Ctrl+K / "/" anywhere in help.
export function HelpSearchProvider({
  index,
  children,
}: {
  index: IndexedGuide[]
  children: ReactNode
}) {
  const [open, setOpen] = useOpen("help-search")
  const [initial, setInitial] = useState("")

  const show = useCallback(
    (query = "") => {
      setInitial(query)
      setOpen(true)
    },
    [setOpen],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(!open)
        return
      }
      const target = e.target as HTMLElement
      const typing =
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      if (e.key === "/" && !typing && !open) {
        e.preventDefault()
        show()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, setOpen, show])

  const value = useMemo(() => ({ open: show, index }), [show, index])

  return (
    <Ctx.Provider value={value}>
      {children}
      <SearchLayer
        open={open}
        onOpenChange={setOpen}
        initial={initial}
        index={index}
      />
    </Ctx.Provider>
  )
}

function SearchLayer({
  open,
  onOpenChange,
  initial,
  index,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: string
  index: IndexedGuide[]
}) {
  const phone = useIsPhone()
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/15 duration-150 supports-backdrop-filter:backdrop-blur-[2px] max-md:hidden data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Popup
          aria-label="Search help"
          className={cn(
            "fixed z-50 flex flex-col bg-popover text-popover-foreground outline-none",
            phone
              ? "inset-0 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
              : "start-1/2 top-[12vh] max-h-[min(36rem,76vh)] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border shadow-md duration-150 rtl:translate-x-1/2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98]",
          )}
        >
          {open && (
            <SearchPanel
              initial={initial}
              index={index}
              phone={!!phone}
              close={() => onOpenChange(false)}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

type Row = { key: string; go: () => void }

function SearchPanel({
  initial,
  index,
  phone,
  close,
}: {
  initial: string
  index: IndexedGuide[]
  phone: boolean
  close: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initial)
  const deferred = useDeferredValue(query)
  const hits = useMemo(() => searchHelp(index, deferred), [index, deferred])
  const recent = useRecentSearches()
  const [active, setActive] = useState(0)
  const list = useRef<HTMLDivElement>(null)

  const fine = useMemo(() => window.matchMedia("(pointer: fine)").matches, [])

  const go = (href: string, remember: boolean) => {
    if (remember && query.trim()) rememberSearch(query.trim())
    const hash = href.split("#")[1]
    // Navigate once the layer's history entry is gone, or Back would land on
    // the search instead of the page it was opened from.
    window.addEventListener(
      "popstate",
      () => {
        router.push(href)
        if (hash) {
          setTimeout(
            () =>
              window.dispatchEvent(
                new CustomEvent(JUMP_EVENT, { detail: hash }),
              ),
            120,
          )
        }
      },
      { once: true },
    )
    close()
  }

  const q = deferred.trim()
  const rows: Row[] = q
    ? hits.map((h) => ({ key: h.key, go: () => go(h.href, true) }))
    : [
        ...recent.map((r) => ({ key: `recent:${r}`, go: () => setQuery(r) })),
        ...guides.map((g) => ({
          key: `guide:${g.slug}`,
          go: () => go(guideHref(g.slug), false),
        })),
      ]

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on new results
  useEffect(() => setActive(0), [q])

  useEffect(() => {
    list.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(rows.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault()
      rows[active]?.go()
    }
  }

  const item = (i: number) => ({
    "data-index": i,
    "data-active": i === active || undefined,
    onMouseMove: () => setActive(i),
    onClick: () => rows[i]?.go(),
  })

  const guideHits = hits.filter((h) => h.kind === "guide")
  const sectionHits = hits.filter((h) => h.kind === "section")
  const words = terms(q)

  return (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border",
          phone
            ? "px-2 pt-[max(--spacing(2),env(safe-area-inset-top))] pb-2"
            : "px-4",
        )}
      >
        {phone && (
          <button
            type="button"
            aria-label="Close search"
            onClick={close}
            className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none active:bg-muted"
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </button>
        )}
        <label
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3",
            phone && "h-11 rounded-lg bg-muted px-3",
          )}
        >
          <Search
            className={cn("shrink-0 text-ash", phone ? "size-4" : "size-5")}
          />
          <input
            // biome-ignore lint/a11y/noAutofocus: a search layer opened on purpose, desktop only
            autoFocus={fine}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search every guide…"
            aria-label="Search help"
            className={cn(
              "min-w-0 flex-1 bg-transparent outline-none placeholder:text-ash [&::-webkit-search-cancel-button]:hidden",
              phone ? "text-body" : "h-14 text-body",
            )}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => setQuery("")}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-ash hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </label>
        {!phone && <Kbd className="h-6 px-1.5">Esc</Kbd>}
      </div>

      <div
        ref={list}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          phone ? "pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]" : "p-2",
        )}
      >
        {q ? (
          hits.length === 0 ? (
            <NoResults query={q} onPick={setQuery} />
          ) : (
            <>
              {guideHits.length > 0 && (
                <Group label="Guides" phone={phone}>
                  {guideHits.map((h, i) => (
                    <GuideRow
                      key={h.key}
                      slug={h.slug}
                      title={h.title}
                      summary={h.kind === "guide" ? h.summary : ""}
                      words={words}
                      phone={phone}
                      {...item(i)}
                    />
                  ))}
                </Group>
              )}
              {sectionHits.length > 0 && (
                <Group label="Sections" phone={phone}>
                  {sectionHits.map((h, n) => (
                    <SectionRow
                      key={h.key}
                      hit={h}
                      words={words}
                      phone={phone}
                      {...item(guideHits.length + n)}
                    />
                  ))}
                </Group>
              )}
            </>
          )
        ) : (
          <>
            {recent.length > 0 && (
              <Group label="Recent searches" phone={phone}>
                {recent.map((r, i) => (
                  <RowShell key={r} phone={phone} {...item(i)}>
                    <History className="size-4 shrink-0 text-ash" />
                    <span className="min-w-0 flex-1 truncate">{r}</span>
                    <button
                      type="button"
                      aria-label={`Forget “${r}”`}
                      onClick={(e) => {
                        e.stopPropagation()
                        forgetSearch(r)
                      }}
                      className="-me-1 flex size-8 shrink-0 items-center justify-center rounded-md text-ash hover:bg-background hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </RowShell>
                ))}
              </Group>
            )}
            <Group label="All guides" phone={phone}>
              {guides.map((g, n) => (
                <GuideRow
                  key={g.slug}
                  slug={g.slug}
                  title={g.title}
                  summary={g.summary}
                  words={[]}
                  phone={phone}
                  {...item(recent.length + n)}
                />
              ))}
            </Group>
          </>
        )}
      </div>

      {!phone && (
        <div className="flex shrink-0 items-center gap-4 border-t border-border bg-subtle px-4 py-2.5 text-caption text-ash">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            to move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>
              <CornerDownLeft />
            </Kbd>
            to open
          </span>
          {q && (
            <span className="ms-auto tabular-nums">
              {hits.length === 40 ? "40+" : hits.length}{" "}
              {hits.length === 1 ? "result" : "results"}
            </span>
          )}
        </div>
      )}
    </>
  )
}

function Group({
  label,
  phone,
  children,
}: {
  label: string
  phone: boolean
  children: ReactNode
}) {
  return (
    <div className={cn("flex flex-col", phone ? "pt-4" : "pb-2 last:pb-0")}>
      <p
        className={cn(
          "font-label text-caption tracking-label text-ash uppercase",
          phone ? "px-4 pb-1" : "px-3 pt-2 pb-1.5",
        )}
      >
        {label}
      </p>
      <div
        role="listbox"
        aria-label={label}
        className={cn(phone && "divide-y divide-border")}
      >
        {children}
      </div>
    </div>
  )
}

type RowProps = {
  phone: boolean
  "data-index": number
  "data-active"?: true
  onMouseMove: () => void
  onClick: () => void
}

function RowShell({
  phone,
  children,
  className,
  ...props
}: RowProps & { children: ReactNode; className?: string }) {
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: arrow keys drive the active option from the input
    <div
      role="option"
      aria-selected={!!props["data-active"]}
      {...props}
      className={cn(
        "flex cursor-pointer items-center gap-3 text-body-sm outline-none",
        phone
          ? "min-h-14 px-4 py-2.5 active:bg-muted"
          : "min-h-11 rounded-lg px-3 py-2 data-active:bg-muted",
        className,
      )}
    >
      {children}
    </div>
  )
}

function GuideRow({
  slug,
  title,
  summary,
  words,
  ...props
}: RowProps & {
  slug: string
  title: string
  summary: string
  words: string[]
}) {
  const Icon = guideFor(slug)?.icon ?? BookOpen
  return (
    <RowShell {...props} className="group">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">
          <Highlight text={title} words={words} />
        </span>
        <span className="block truncate text-caption tracking-normal text-muted-foreground">
          {summary}
        </span>
      </span>
      {!props.phone && (
        <ArrowRight className="size-4 shrink-0 text-ash opacity-0 group-data-active:opacity-100 rtl:rotate-180" />
      )}
    </RowShell>
  )
}

function SectionRow({
  hit,
  words,
  ...props
}: RowProps & { hit: Extract<Hit, { kind: "section" }>; words: string[] }) {
  return (
    <RowShell {...props} className="group items-start">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-ash">
        <span className="font-mono text-body-sm">#</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-medium text-foreground">
            <Highlight text={hit.title} words={words} />
          </span>
          <span className="shrink-0 text-caption tracking-normal text-ash">
            in {hit.guide}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-caption tracking-normal text-muted-foreground">
          <Highlight text={hit.snippet} words={words} />
        </span>
      </span>
      {!props.phone && (
        <ArrowRight className="mt-2 size-4 shrink-0 text-ash opacity-0 group-data-active:opacity-100 rtl:rotate-180" />
      )}
    </RowShell>
  )
}

export function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return text
  const parts = text.split(
    new RegExp(`(${words.map(escapeRegex).join("|")})`, "gi"),
  )
  return parts.map((part, i) =>
    i % 2 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: split parts never reorder
      <mark key={i} className="rounded-sm bg-brand-soft text-brand-strong">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

const suggestions = ["ssh key", "upload", "backup", "ban", "sudo", "reboot"]

function NoResults({
  query,
  onPick,
}: {
  query: string
  onPick: (q: string) => void
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-5 text-ash" />
      </span>
      <p className="mt-4 text-body font-medium">Nothing for “{query}”</p>
      <p className="mt-1 text-body-sm text-muted-foreground">
        Check the spelling or try a broader word.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="h-8 rounded-full border border-border px-3 text-body-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
