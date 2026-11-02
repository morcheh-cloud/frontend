"use client"

import { Dialog } from "@base-ui/react/dialog"
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  ArrowRight,
  ChevronLeft,
  CornerDownLeft,
  History,
  Loader2,
  Search,
  SearchX,
  X,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { toast } from "sonner"

import { keys as serverKeys } from "@/app/(panel)/servers/api"
import {
  address,
  OsTile,
  StatusDot,
} from "@/app/(panel)/servers/components/meta"
import { useWorkspaceCan } from "@/app/(panel)/servers/components/permissions"
import { useStorages } from "@/app/(panel)/storage/api"
import {
  endpointLabel,
  ProtocolTile,
} from "@/app/(panel)/storage/components/meta"
import { Highlight } from "@/app/help/components/search"
import { useAccess } from "@/components/auth/auth"
import { useSettingsItem } from "@/components/panel/app-sidebar"
import { Kbd } from "@/components/ui/kbd"
import { useSidebar } from "@/components/ui/sidebar"
import { queueIntent } from "@/hooks/useIntent"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import type { Server, Storage } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  actions,
  type Command,
  filter,
  forget,
  guideCommands,
  iconOf,
  type Recent,
  remember,
  searchAll,
  sectionsOf,
  serverIdOf,
  shortcutPages,
  type Tile,
  useRecent,
  visiblePages,
  words,
} from "./commands"

const Ctx = createContext<{ open: () => void } | null>(null)

export function useCommandPalette() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useCommandPalette outside <CommandProvider>")
  return ctx
}

// The panel-wide search: pages, actions, servers, storages and guides. Opened
// from the header, or with ⌘K / Ctrl+K anywhere in the panel (except inside a
// terminal, where Ctrl+K belongs to the shell).
export function CommandProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useOpen("command-palette")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return
      if (e.defaultPrevented || e.altKey || e.shiftKey) return
      if ((e.target as HTMLElement | null)?.closest?.(".xterm")) return
      e.preventDefault()
      setOpen(!open)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, setOpen])

  const value = useMemo(() => ({ open: () => setOpen(true) }), [setOpen])

  return (
    <Ctx value={value}>
      {children}
      <Layer open={open} onOpenChange={setOpen} />
    </Ctx>
  )
}

const noop = () => () => {}

function useMac() {
  return useSyncExternalStore(
    noop,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  )
}

// Desktop header: the search field that opens the palette.
export function SearchButton() {
  const palette = useCommandPalette()
  const mac = useMac()
  return (
    <button
      type="button"
      onClick={palette.open}
      className="flex h-8 w-44 items-center gap-2 rounded-lg border border-border bg-subtle px-2.5 text-body-sm text-ash transition-colors outline-none hover:border-mist hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 lg:w-64"
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 truncate text-start">Search…</span>
      <Kbd>{mac ? "⌘ K" : "Ctrl K"}</Kbd>
    </button>
  )
}

function Layer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const phone = useIsPhone()
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/15 duration-150 supports-backdrop-filter:backdrop-blur-[2px] max-md:hidden data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Popup
          aria-label="Search"
          className={cn(
            "fixed z-50 flex flex-col bg-popover text-popover-foreground outline-none",
            phone
              ? "inset-0 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
              : "start-1/2 top-[12vh] h-[min(32rem,76vh)] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border shadow-md duration-150 rtl:translate-x-1/2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98]",
          )}
        >
          {open && (
            <Palette phone={!!phone} close={() => onOpenChange(false)} />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// One selectable row, whatever it points at.
type Row = {
  key: string
  label: string
  hint?: string
  lead: ReactNode
  trail?: ReactNode
  href?: string
  intent?: string
  run?: () => void
  // Saved to "Recent" when picked.
  recent?: Recent
  forget?: () => void
}

type Group = { label: string; rows: Row[] }

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function Palette({ phone, close }: { phone: boolean; close: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()
  const [query, setQuery] = useState("")
  const q = query.trim()
  const terms = useMemo(() => words(q), [q])
  const [active, setActive] = useState(0)
  const list = useRef<HTMLDivElement>(null)
  const fine = useMemo(() => window.matchMedia("(pointer: fine)").matches, [])
  const recent = useRecent()

  const serverQ = useDebounced(q, 150)
  const servers = useQuery({
    queryKey: serverKeys.list({ q: serverQ, limit: 6 }),
    queryFn: () => api.servers.listServers({ q: serverQ, limit: 6 }),
    enabled: !!serverQ,
    placeholderData: keepPreviousData,
  })
  const storages = useStorages()
  const { serverLevel } = useAccess()
  const canAdd = useWorkspaceCan().addServer
  const settings = useSettingsItem()

  // The server page already loaded it.
  const queryClient = useQueryClient()
  const serverId = serverIdOf(pathname)
  const hereServer = serverId
    ? queryClient.getQueryData<Server>(serverKeys.detail(serverId))
    : undefined
  const here = serverId
    ? sectionsOf(
        serverId,
        hereServer?.name ?? "This server",
        serverLevel(serverId, hereServer?.workspace_id),
      )
    : []

  const pick = (row: Row) => {
    if (row.recent) remember(row.recent)
    // Act once the layer's history entry is gone, or Back would land on the
    // palette instead of the page it was opened from.
    window.addEventListener(
      "popstate",
      () => {
        if (row.intent) queueIntent(row.intent)
        if (row.href) router.push(row.href)
        row.run?.()
      },
      { once: true },
    )
    close()
  }

  const commandRow = (c: Command, save = true): Row => ({
    key: c.key,
    label: c.label,
    hint: c.hint,
    lead: <IconTile icon={c.icon} tile={c.tile} />,
    trail: c.keys && !phone ? <Keys keys={c.keys} /> : undefined,
    href: c.href,
    intent: c.intent,
    run:
      c.key === "action:copy-link"
        ? () => {
            c.run?.()
            toast.success("Link copied")
          }
        : c.run,
    recent:
      save && c.href && !c.intent && !c.run
        ? {
            kind: "command",
            key: c.key,
            label: c.label,
            hint: c.hint,
            href: c.href,
          }
        : undefined,
  })

  const serverRow = (s: Server): Row => ({
    key: `server:${s.id}`,
    label: s.name,
    hint: address(s),
    lead: <OsTile os={s.os} />,
    trail: <StatusDot status={s.status} />,
    href: `/servers/${s.id}`,
    recent: {
      kind: "server",
      key: `server:${s.id}`,
      label: s.name,
      hint: address(s),
      href: `/servers/${s.id}`,
    },
  })

  const storageRow = (s: Storage): Row => ({
    key: `storage:${s.id}`,
    label: s.name,
    hint: endpointLabel(s),
    lead: <ProtocolTile protocol={s.protocol} />,
    trail: <StatusDot status={s.status} />,
    href: `/storage/${s.id}`,
    recent: {
      kind: "storage",
      key: `storage:${s.id}`,
      label: s.name,
      hint: endpointLabel(s),
      href: `/storage/${s.id}`,
    },
  })

  const recentRow = (r: Recent): Row => ({
    key: `recent:${r.key}`,
    label: r.label,
    hint: r.hint,
    lead: (
      <IconTile
        icon={r.kind === "command" ? iconOf(r.key) : History}
        tile="muted"
      />
    ),
    href: r.href,
    recent: r,
    forget: () => forget(r.key),
  })

  const allActions = actions(pathname, toggleSidebar, canAdd)

  const groups: Group[] = q
    ? [
        {
          label: "This server",
          rows: filter(here, terms).map((c) => commandRow(c)),
        },
        {
          label: "Servers",
          rows: serverQ ? (servers.data?.items ?? []).map(serverRow) : [],
        },
        {
          label: "Storage",
          rows: filter(
            (storages.data?.items ?? []).map((s) => ({
              s,
              label: s.name,
              hint: endpointLabel(s),
              keywords: `${s.protocol} ${s.provider} ${s.bucket} ${s.description}`,
            })),
            terms,
            4,
          ).map((x) => storageRow(x.s)),
        },
        {
          label: "Pages",
          rows: filter(visiblePages(settings), terms).map((c) => commandRow(c)),
        },
        {
          label: "Actions",
          rows: filter(allActions, terms).map((c) => commandRow(c)),
        },
        {
          label: "Guides",
          rows: filter(guideCommands, terms, 4).map((c) => commandRow(c)),
        },
        { label: "", rows: [commandRow(searchAll(q), false)] },
      ]
    : [
        { label: "Recent", rows: recent.map(recentRow) },
        { label: "This server", rows: here.map((c) => commandRow(c)) },
        { label: "Quick actions", rows: allActions.map((c) => commandRow(c)) },
        { label: "Go to", rows: shortcutPages.map((c) => commandRow(c)) },
      ]

  const shown = groups.filter((g) => g.rows.length)
  const rows = shown.flatMap((g) => g.rows)
  const nothing = !!q && rows.length === 1 && !servers.isFetching

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
      const row = rows[Math.min(active, rows.length - 1)]
      if (row) pick(row)
    }
  }

  let index = 0

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
          {servers.isFetching && q ? (
            <Loader2
              className={cn(
                "shrink-0 animate-spin text-ash",
                phone ? "size-4" : "size-5",
              )}
            />
          ) : (
            <Search
              className={cn("shrink-0 text-ash", phone ? "size-4" : "size-5")}
            />
          )}
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
            placeholder="Search servers, storage, pages, actions…"
            aria-label="Search"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ash [&::-webkit-search-cancel-button]:hidden",
              !phone && "h-14",
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
        {nothing && <NoResults query={q} />}
        {shown.map((g) => (
          <GroupBlock key={g.label || "more"} label={g.label} phone={phone}>
            {g.rows.map((row) => {
              const i = index++
              return (
                <RowItem
                  key={row.key}
                  row={row}
                  terms={terms}
                  phone={phone}
                  active={i === active}
                  index={i}
                  onHover={() => setActive(i)}
                  onPick={() => pick(row)}
                />
              )
            })}
          </GroupBlock>
        ))}
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
          <span className="ms-auto flex items-center gap-1.5">
            <Keys keys={["Mod", "K"]} />
            to toggle
          </span>
        </div>
      )}
    </>
  )
}

function GroupBlock({
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
      {label && (
        <p
          className={cn(
            "font-label text-caption tracking-label text-ash uppercase",
            phone ? "px-4 pb-1" : "px-3 pt-2 pb-1.5",
          )}
        >
          {label}
        </p>
      )}
      <div
        role="listbox"
        aria-label={label || "More"}
        className={cn(phone && "divide-y divide-border")}
      >
        {children}
      </div>
    </div>
  )
}

function RowItem({
  row,
  terms,
  phone,
  active,
  index,
  onHover,
  onPick,
}: {
  row: Row
  terms: string[]
  phone: boolean
  active: boolean
  index: number
  onHover: () => void
  onPick: () => void
}) {
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: arrow keys drive the active option from the input
    // biome-ignore lint/a11y/useKeyWithClickEvents: arrow keys drive the active option from the input
    <div
      role="option"
      aria-selected={active}
      data-index={index}
      data-active={active || undefined}
      onMouseMove={onHover}
      onClick={onPick}
      className={cn(
        "group flex cursor-pointer items-center gap-3 text-body-sm outline-none",
        phone
          ? "min-h-14 px-4 py-2.5 active:bg-muted"
          : "min-h-11 rounded-lg px-3 py-2 data-active:bg-muted",
      )}
    >
      {row.lead}
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate font-medium text-foreground">
          <Highlight text={row.label} words={terms} />
        </span>
        {row.hint && (
          <span className="truncate text-caption tracking-normal text-ash">
            {row.hint}
          </span>
        )}
      </span>
      {row.trail}
      {row.forget && (
        <button
          type="button"
          aria-label={`Remove “${row.label}” from recent`}
          onClick={(e) => {
            e.stopPropagation()
            row.forget?.()
          }}
          className={cn(
            "-me-1 flex shrink-0 items-center justify-center rounded-md text-ash hover:bg-background hover:text-foreground",
            phone ? "size-11" : "size-8",
          )}
        >
          <X className="size-3.5" />
        </button>
      )}
      {!phone && !row.forget && (
        <ArrowRight className="size-4 shrink-0 text-ash opacity-0 group-data-active:opacity-100 rtl:rotate-180" />
      )}
    </div>
  )
}

const tiles: Record<Tile, string> = {
  muted: "bg-muted text-muted-foreground",
  brand: "bg-brand-soft text-brand-strong",
  outline: "border border-border text-ash",
}

function IconTile({ icon: Icon, tile }: { icon: Command["icon"]; tile: Tile }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        tiles[tile],
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  )
}

function Keys({ keys }: { keys: string[] }) {
  const mac = useMac()
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k) => (
        <Kbd key={k}>{k === "Mod" ? (mac ? "⌘" : "Ctrl") : k}</Kbd>
      ))}
    </span>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-6 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-5 text-ash" />
      </span>
      <p className="mt-4 text-body font-medium">Nothing for “{query}”</p>
      <p className="mt-1 text-body-sm text-muted-foreground">
        Try a server name, an address, a tag or a page.
      </p>
    </div>
  )
}
