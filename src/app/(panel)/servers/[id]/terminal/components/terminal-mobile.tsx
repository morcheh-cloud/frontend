"use client"

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Ellipsis,
  Eraser,
  Keyboard,
  Minus,
  Pencil,
  Plus,
  Search,
  SquareTerminal,
  X,
} from "lucide-react"
import { type FormEvent, type ReactNode, useState } from "react"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import { Empty } from "./terminal-desktop"
import {
  FONT_MAX,
  FONT_MIN,
  type Modifiers,
  type Workspace,
  withModifiers,
} from "./terminal-workspace"
import { MAX_TABS, type Tab } from "./use-tabs"

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted disabled:opacity-40 [&_svg]:size-5"

// Keys a phone keyboard lacks. Ctrl and Alt stick until the next key.
const keys: { label: ReactNode; aria: string; data: string }[] = [
  { label: "Esc", aria: "Escape", data: "\x1b" },
  { label: "Tab", aria: "Tab", data: "\t" },
  { label: <ArrowUp />, aria: "Up", data: "\x1b[A" },
  { label: <ArrowDown />, aria: "Down", data: "\x1b[B" },
  { label: <ArrowLeft />, aria: "Left", data: "\x1b[D" },
  { label: <ArrowRight />, aria: "Right", data: "\x1b[C" },
  { label: "|", aria: "Pipe", data: "|" },
  { label: "~", aria: "Tilde", data: "~" },
  { label: "/", aria: "Slash", data: "/" },
  { label: "-", aria: "Dash", data: "-" },
  { label: "Home", aria: "Home", data: "\x1b[H" },
  { label: "End", aria: "End", data: "\x1b[F" },
  { label: "PgUp", aria: "Page up", data: "\x1b[5~" },
  { label: "PgDn", aria: "Page down", data: "\x1b[6~" },
]

// Phone: the terminal takes the whole screen under the app bar (over the tab
// bar), with a tab switcher on top and a row of extra keys at the bottom that
// rides above the on-screen keyboard.
export function TerminalMobile({
  w,
  mods,
  setMods,
}: {
  w: Workspace
  mods: Modifiers
  setMods: (mods: Modifiers) => void
}) {
  const [tabsOpen, setTabsOpen] = useOpen("terminal-tabs")
  const [menuOpen, setMenuOpen] = useOpen("terminal-menu")
  const [renameOpen, setRenameOpen] = useOpen("terminal-rename")
  const [searching, setSearching] = useState(false)
  const count = w.tabs?.length ?? 0

  const press = (data: string) => {
    const out = data.length === 1 ? withModifiers(data, mods) : data
    if (mods.ctrl || mods.alt) setMods({ ctrl: false, alt: false })
    w.handle()?.send(out)
  }

  // Run a menu action once its sheet has closed (and Back is in sync).
  const fromMenu = (fn: () => void) => () => {
    setMenuOpen(false)
    fn()
  }

  return (
    <div className="fixed inset-x-0 top-[calc(3rem+1px+env(safe-area-inset-top))] bottom-0 z-45 flex flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-1">
        <button
          type="button"
          onClick={() => setTabsOpen(true)}
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-3 text-start outline-none active:bg-muted"
        >
          <SquareTerminal className="size-5 shrink-0 text-muted-foreground" />
          <span className="truncate text-body font-medium">
            {w.active?.title ?? "Terminal"}
          </span>
          {count > 1 && (
            <span className="rounded-full bg-muted px-1.5 text-caption tabular-nums">
              {count}
            </span>
          )}
          <ChevronDown className="size-4 shrink-0 text-ash" />
        </button>
        <button
          type="button"
          aria-label="New terminal"
          disabled={!w.tabs || count >= MAX_TABS}
          onClick={() => w.add()}
          className={barButton}
        >
          <Plus />
        </button>
        <button
          type="button"
          aria-label="Terminal actions"
          disabled={!w.active}
          onClick={() => setMenuOpen(true)}
          className={barButton}
        >
          <Ellipsis />
        </button>
      </div>

      {searching && (
        <PhoneSearch
          w={w}
          onClose={() => {
            setSearching(false)
            w.handle()?.clearSearch()
          }}
        />
      )}

      <div className="relative min-h-0 flex-1 py-1 ps-2 pe-0.5">
        <div className="relative size-full">{w.views}</div>
        {count === 0 && w.tabs && (
          <Empty onNew={() => w.add()}>No terminals open</Empty>
        )}
      </div>

      <div className="flex shrink-0 [scrollbar-width:none] gap-1 overflow-x-auto overscroll-x-contain border-t border-border bg-subtle px-1.5 pt-1.5 pb-[calc(--spacing(1.5)+env(safe-area-inset-bottom))]">
        <Key aria="Show keyboard" onPress={() => w.handle()?.focus()}>
          <Keyboard />
        </Key>
        <Key
          aria="Control"
          pressed={mods.ctrl}
          onPress={() => setMods({ ...mods, ctrl: !mods.ctrl })}
        >
          Ctrl
        </Key>
        <Key
          aria="Alt"
          pressed={mods.alt}
          onPress={() => setMods({ ...mods, alt: !mods.alt })}
        >
          Alt
        </Key>
        {keys.map((key) => (
          <Key key={key.aria} aria={key.aria} onPress={() => press(key.data)}>
            {key.label}
          </Key>
        ))}
      </div>

      <BottomSheet open={tabsOpen} onOpenChange={setTabsOpen} title="Terminals">
        <div className="flex flex-col">
          {w.tabs?.map((tab) => (
            <TabRow
              key={tab.key}
              tab={tab}
              selected={tab.key === w.activeKey}
              onSelect={() => {
                setTabsOpen(false)
                w.setActiveKey(tab.key)
              }}
              onClose={() => w.remove(tab.key)}
            />
          ))}
          <SheetAction
            icon={<Plus />}
            label="New terminal"
            description={
              count >= MAX_TABS
                ? `Up to ${MAX_TABS} per server`
                : "A new shell on this server"
            }
            disabled={count >= MAX_TABS}
            onClick={() => {
              setTabsOpen(false)
              w.add()
            }}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={w.active?.title ?? "Terminal"}
      >
        <div className="flex flex-col">
          <SheetAction
            icon={<Copy />}
            label="Copy"
            description="The selection, or all output"
            onClick={fromMenu(w.copy)}
          />
          <SheetAction
            icon={<ClipboardPaste />}
            label="Paste"
            onClick={fromMenu(w.paste)}
          />
          <SheetAction
            icon={<Search />}
            label="Find"
            onClick={fromMenu(() => setSearching(true))}
          />
          <SheetAction
            icon={<Eraser />}
            label="Clear scrollback"
            onClick={fromMenu(() => w.handle()?.clear())}
          />
          <SheetAction
            icon={<Pencil />}
            label="Rename"
            onClick={() => {
              // Open it once the menu's history entry is gone.
              window.addEventListener("popstate", () => setRenameOpen(true), {
                once: true,
              })
              setMenuOpen(false)
            }}
          />
          <div className="flex min-h-14 items-center gap-4 px-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-body-sm font-medium">
              Aa
            </span>
            <span className="flex-1 text-body font-medium">Text size</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Smaller text"
                disabled={w.fontSize <= FONT_MIN}
                onClick={() => w.setFontSize(w.fontSize - 1)}
                className={cn(barButton, "bg-muted")}
              >
                <Minus />
              </button>
              <span className="w-8 text-center text-body tabular-nums">
                {w.fontSize}
              </span>
              <button
                type="button"
                aria-label="Larger text"
                disabled={w.fontSize >= FONT_MAX}
                onClick={() => w.setFontSize(w.fontSize + 1)}
                className={cn(barButton, "bg-muted")}
              >
                <Plus />
              </button>
            </div>
          </div>
          <SheetAction
            icon={<X />}
            label="Close terminal"
            description="Ends the shell on the server"
            destructive
            onClick={fromMenu(() => w.activeKey && w.remove(w.activeKey))}
          />
        </div>
      </BottomSheet>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={w.active?.title ?? ""}
        onRename={(title) => {
          if (w.activeKey) w.setTitle(w.activeKey, title)
          setRenameOpen(false)
        }}
      />
    </div>
  )
}

function Key({
  aria,
  pressed,
  onPress,
  children,
}: {
  aria: string
  pressed?: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      aria-pressed={pressed}
      // Keep focus (and the on-screen keyboard) on the terminal.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onPress}
      className="flex h-10 min-w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-body-sm font-medium text-foreground outline-none active:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground [&_svg]:size-4"
    >
      {children}
    </button>
  )
}

function TabRow({
  tab,
  selected,
  onSelect,
  onClose,
}: {
  tab: Tab
  selected: boolean
  onSelect: () => void
  onClose: () => void
}) {
  const status = {
    connecting: "Connecting…",
    reconnecting: "Reconnecting…",
    open: "Running",
    exited: "Ended",
    failed: "Couldn't connect",
  }[tab.status.kind]

  return (
    <div className="flex min-h-14 items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected || undefined}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-4 rounded-lg px-2 text-start outline-none active:bg-muted"
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            selected && "bg-brand-soft text-brand-strong",
          )}
        >
          <SquareTerminal className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium">
            {tab.title}
          </span>
          <span className="block truncate text-body-sm text-muted-foreground">
            {status}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={`Close ${tab.title}`}
        onClick={onClose}
        className={barButton}
      >
        <X className="text-ash" />
      </button>
    </div>
  )
}

function PhoneSearch({ w, onClose }: { w: Workspace; onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ index: number; count: number }>()

  const find = (backwards = false, q = query) => {
    const h = w.handle()
    if (!h) return
    if (!q) {
      h.clearSearch()
      setResults(undefined)
      return
    }
    h.onResults((index, count) => setResults({ index, count }))
    if (backwards) h.findPrevious(q)
    else h.findNext(q)
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border ps-3 pe-1">
      <Input
        value={query}
        type="search"
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Find"
        aria-label="Find in terminal"
        onChange={(e) => {
          setQuery(e.target.value)
          find(false, e.target.value)
        }}
        onKeyDown={(e) => e.key === "Enter" && find()}
        className="h-9 min-w-0 flex-1"
      />
      <span className="w-14 text-center text-caption text-muted-foreground tabular-nums">
        {query && results
          ? results.count
            ? `${results.index + 1}/${results.count}`
            : "0"
          : ""}
      </span>
      <button
        type="button"
        aria-label="Previous match"
        onClick={() => find(true)}
        className={barButton}
      >
        <ChevronUp />
      </button>
      <button
        type="button"
        aria-label="Next match"
        onClick={() => find()}
        className={barButton}
      >
        <ChevronDown />
      </button>
      <button
        type="button"
        aria-label="Close find"
        onClick={onClose}
        className={barButton}
      >
        <X />
      </button>
    </div>
  )
}

function RenameDialog({
  open,
  onOpenChange,
  title,
  onRename,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onRename: (title: string) => void
}) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = new FormData(e.currentTarget).get("title")
    onRename(String(value ?? ""))
  }
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename terminal"
      footer={
        <Button type="submit" form="terminal-rename" className="h-11 w-full">
          Save
        </Button>
      }
    >
      <form id="terminal-rename" onSubmit={submit}>
        <Input
          key={title}
          name="title"
          defaultValue={title}
          maxLength={64}
          autoCapitalize="off"
          enterKeyHint="done"
          aria-label="Name"
        />
      </form>
    </ResponsiveDialog>
  )
}
