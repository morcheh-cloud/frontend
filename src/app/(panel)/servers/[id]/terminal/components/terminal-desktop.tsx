"use client"

import {
  ALargeSmall,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Eraser,
  History,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Minus,
  Pencil,
  Plus,
  Regex,
  Search,
  TextSelect,
  X,
} from "lucide-react"
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useOpen } from "@/hooks/useOpen"
import { cn } from "@/lib/utils"
import type { Command, SearchOptions } from "./terminal-view"
import { FONT_MAX, FONT_MIN, type Workspace } from "./terminal-workspace"
import { MAX_TABS, type Tab } from "./use-tabs"

const isMac =
  typeof navigator !== "undefined" && /Mac|iP(hone|ad)/.test(navigator.platform)
const mod = isMac ? "⌘" : "Ctrl+Shift+"

// Desktop: a framed terminal with browser-style tabs and a toolbar. "Focus"
// fills the window (Back or the button leaves it).
export function TerminalDesktop({
  w,
  search,
  setSearchOpen,
}: {
  w: Workspace
  search: { open: boolean; nonce: number }
  setSearchOpen: (open: boolean) => void
}) {
  const [focus, setFocus] = useOpen("terminal-focus")
  const [editing, setEditing] = useState<string | null>(null)
  const [history, setHistory] = useHistoryShown()

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-background",
        focus ? "fixed inset-0 z-50" : "min-h-0 flex-1",
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-subtle px-1.5">
        <div
          role="tablist"
          aria-label="Terminals"
          className="flex min-w-0 flex-1 [scrollbar-width:none] items-center gap-1 overflow-x-auto"
        >
          {w.tabs?.map((tab) => (
            <TabButton
              key={tab.key}
              tab={tab}
              selected={tab.key === w.activeKey}
              editing={editing === tab.key}
              onSelect={() => w.setActiveKey(tab.key)}
              onEdit={(on) => setEditing(on ? tab.key : null)}
              onRename={(title) => {
                setEditing(null)
                w.setTitle(tab.key, title)
              }}
              onClose={() => w.remove(tab.key)}
            />
          ))}
          <Tool
            label="New terminal"
            disabled={!w.tabs || w.tabs.length >= MAX_TABS}
            onClick={() => w.add()}
          >
            <Plus />
          </Tool>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {w.active?.recorded && <RecordedBadge />}
          <Tool
            label="Find"
            shortcut={`${mod}F`}
            pressed={search.open}
            onClick={() => setSearchOpen(!search.open)}
          >
            <Search />
          </Tool>
          <Tool label="Copy" shortcut={`${mod}C`} onClick={w.copy}>
            <Copy />
          </Tool>
          <Tool label="Paste" shortcut={`${mod}V`} onClick={w.paste}>
            <ClipboardPaste />
          </Tool>
          <Tool label="Clear scrollback" onClick={() => w.handle()?.clear()}>
            <Eraser />
          </Tool>
          <span className="mx-1 h-5 w-px bg-border" />
          <Tool
            label="Smaller text"
            disabled={w.fontSize <= FONT_MIN}
            onClick={() => w.setFontSize(w.fontSize - 1)}
          >
            <Minus />
          </Tool>
          <span
            title="Font size"
            className="flex w-9 items-center justify-center gap-0.5 text-caption text-muted-foreground tabular-nums"
          >
            <ALargeSmall className="size-3.5" />
            {w.fontSize}
          </span>
          <Tool
            label="Larger text"
            disabled={w.fontSize >= FONT_MAX}
            onClick={() => w.setFontSize(w.fontSize + 1)}
          >
            <Plus />
          </Tool>
          <span className="mx-1 h-5 w-px bg-border" />
          <Tool
            label="Recent commands"
            pressed={history}
            onClick={() => setHistory(!history)}
          >
            <History />
          </Tool>
          <Tool
            label={focus ? "Exit focus mode" : "Focus mode"}
            onClick={() => setFocus(!focus)}
          >
            {focus ? <Minimize2 /> : <Maximize2 />}
          </Tool>
        </div>
      </div>

      {search.open && (
        <SearchBar
          w={w}
          nonce={search.nonce}
          onClose={() => {
            setSearchOpen(false)
            w.handle()?.clearSearch()
            w.handle()?.focus()
          }}
        />
      )}

      <div className="relative flex min-h-0 flex-1">
        <ContextMenu>
          <ContextMenuTrigger
            render={<div />}
            className="relative min-h-0 min-w-0 flex-1 py-1.5 ps-3 pe-1"
          >
            <div className="relative size-full">{w.views}</div>
            {w.tabs?.length === 0 && (
              <Empty onNew={() => w.add()}>No terminals open</Empty>
            )}
          </ContextMenuTrigger>
          <ContextMenuContent className="min-w-52">
            <ContextMenuItem onClick={w.copy}>
              <Copy />
              Copy
              <ContextMenuShortcut>{mod}C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={w.paste}>
              <ClipboardPaste />
              Paste
              <ContextMenuShortcut>{mod}V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => w.handle()?.selectAll()}>
              <TextSelect />
              Select all
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => setSearchOpen(true)}>
              <Search />
              Find
              <ContextMenuShortcut>{mod}F</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => w.handle()?.clear()}>
              <Eraser />
              Clear scrollback
            </ContextMenuItem>
            {w.active && (
              <ContextMenuItem onClick={() => setEditing(w.activeKey)}>
                <Pencil />
                Rename tab
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={!w.tabs || w.tabs.length >= MAX_TABS}
              onClick={() => w.add()}
            >
              <Plus />
              New terminal
            </ContextMenuItem>
            {w.active && (
              <ContextMenuItem
                variant="destructive"
                onClick={() => w.activeKey && w.remove(w.activeKey)}
              >
                <X />
                Close terminal
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
        {history && w.active?.commands?.length ? (
          <CommandHistory
            commands={w.active.commands}
            onPick={(id) => {
              if (!w.handle()?.scrollToCommand(id))
                toast("That command is no longer in the scrollback.")
            }}
            onClose={() => setHistory(false)}
          />
        ) : null}
      </div>
    </div>
  )
}

const HISTORY_KEY = "morcheh.terminal.history"

// Whether the recent-commands box shows; on unless the user closed it.
function useHistoryShown() {
  const [shown, setShown] = useState(() => {
    try {
      return localStorage.getItem(HISTORY_KEY) !== "off"
    } catch {
      return true
    }
  })
  const set = (next: boolean) => {
    setShown(next)
    try {
      localStorage.setItem(HISTORY_KEY, next ? "on" : "off")
    } catch {}
  }
  return [shown, set] as const
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
})

// Floats over the terminal's top end: the active shell's recent commands,
// newest first. Picking one scrolls back to where it ran.
function CommandHistory({
  commands,
  onPick,
  onClose,
}: {
  commands: Command[]
  onPick: (id: number) => void
  onClose: () => void
}) {
  return (
    <div className="absolute end-5 top-3 z-10 flex max-h-[min(22rem,calc(100%-1.5rem))] w-64 flex-col rounded-2xl border border-border bg-card/95 shadow-md backdrop-blur-md">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border ps-3 pe-1">
        <History className="size-4 text-ash" />
        <p className="flex-1 text-body-sm font-medium">Recent commands</p>
        <button
          type="button"
          aria-label="Hide recent commands"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-ash outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" />
        </button>
      </div>
      <ul className="min-h-0 overflow-y-auto p-1">
        {commands.toReversed().map((command) => (
          <li key={command.id}>
            <button
              type="button"
              title={`${command.text}\nRun at ${timeFormat.format(command.at)}`}
              onClick={() => onPick(command.id)}
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-caption">
                {command.text}
              </span>
              <span className="shrink-0 text-caption text-ash tabular-nums">
                {timeFormat.format(command.at)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TabButton({
  tab,
  selected,
  editing,
  onSelect,
  onEdit,
  onRename,
  onClose,
}: {
  tab: Tab
  selected: boolean
  editing: boolean
  onSelect: () => void
  onEdit: (on: boolean) => void
  onRename: (title: string) => void
  onClose: () => void
}) {
  const busy =
    tab.status.kind === "connecting" || tab.status.kind === "reconnecting"
  const ended = tab.status.kind === "exited" || tab.status.kind === "failed"

  return (
    <div
      className={cn(
        "group/tab flex h-8 max-w-52 shrink-0 items-center rounded-lg text-body-sm text-muted-foreground hover:bg-muted hover:text-foreground",
        selected &&
          "bg-background text-foreground shadow-sm ring-1 ring-border hover:bg-background",
      )}
    >
      {editing ? (
        <input
          // biome-ignore lint/a11y/noAutofocus: the user just asked to rename
          autoFocus
          defaultValue={tab.title}
          maxLength={64}
          aria-label="Terminal name"
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => onRename(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRename(e.currentTarget.value)
            if (e.key === "Escape") onEdit(false)
          }}
          className="h-7 w-36 rounded-md bg-transparent px-2 text-body-sm text-foreground ring-2 ring-ring/50 outline-none"
        />
      ) : (
        <button
          type="button"
          role="tab"
          aria-selected={selected}
          title={`${tab.title} (double-click to rename)`}
          onClick={onSelect}
          onDoubleClick={() => onEdit(true)}
          onAuxClick={(e) => e.button === 1 && onClose()}
          className="flex h-full min-w-0 items-center gap-1.5 ps-2.5 pe-1 outline-none"
        >
          {busy ? (
            <LoaderCircle className="size-3.5 shrink-0 animate-spin text-ash" />
          ) : (
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full bg-success",
                ended && "bg-mist",
                tab.status.kind === "failed" && "bg-destructive",
              )}
            />
          )}
          <span className={cn("truncate", ended && "text-ash")}>
            {tab.title}
          </span>
        </button>
      )}
      <button
        type="button"
        aria-label={`Close ${tab.title}`}
        onClick={onClose}
        className={cn(
          "me-1 flex size-5 shrink-0 items-center justify-center rounded-md text-ash opacity-0 group-hover/tab:opacity-100 hover:bg-mist hover:text-foreground focus-visible:opacity-100",
          selected && "opacity-100",
        )}
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

function SearchBar({
  w,
  nonce,
  onClose,
}: {
  w: Workspace
  nonce: number
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<SearchOptions>({})
  const [results, setResults] = useState<{ index: number; count: number }>()

  // Re-focus when the shortcut is pressed again while already open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce triggers it
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [nonce])

  const find = (backwards = false, q = query, o = options) => {
    const h = w.handle()
    if (!h) return
    if (!q) {
      h.clearSearch()
      setResults(undefined)
      return
    }
    h.onResults((index, count) => setResults({ index, count }))
    if (backwards) h.findPrevious(q, o)
    else h.findNext(q, o)
  }
  const refind = useEffectEvent(() => find())
  // A different tab: search it instead.
  // biome-ignore lint/correctness/useExhaustiveDependencies: on tab change
  useEffect(() => refind(), [w.activeKey])

  const toggle = (key: keyof SearchOptions) => {
    const next = { ...options, [key]: !options[key] }
    setOptions(next)
    find(false, query, next)
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border px-2">
      <Search className="ms-1 size-4 shrink-0 text-ash" />
      <Input
        ref={inputRef}
        value={query}
        placeholder="Find in terminal"
        aria-label="Find in terminal"
        onChange={(e) => {
          setQuery(e.target.value)
          find(false, e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            find(e.shiftKey)
          }
          if (e.key === "Escape") onClose()
        }}
        className="h-8 w-64 border-0 px-1 shadow-none focus-visible:ring-0"
      />
      <span className="min-w-20 text-caption text-muted-foreground tabular-nums">
        {query && results
          ? results.count === 0
            ? "No results"
            : `${results.index + 1} of ${results.count}`
          : ""}
      </span>
      <Tool
        label="Match case"
        pressed={!!options.caseSensitive}
        onClick={() => toggle("caseSensitive")}
      >
        <ALargeSmall />
      </Tool>
      <Tool
        label="Regular expression"
        pressed={!!options.regex}
        onClick={() => toggle("regex")}
      >
        <Regex />
      </Tool>
      <span className="mx-0.5 h-5 w-px bg-border" />
      <Tool label="Previous match" shortcut="⇧Enter" onClick={() => find(true)}>
        <ChevronUp />
      </Tool>
      <Tool label="Next match" shortcut="Enter" onClick={() => find()}>
        <ChevronDown />
      </Tool>
      <Tool label="Close" shortcut="Esc" onClick={onClose}>
        <X />
      </Tool>
    </div>
  )
}

function Tool({
  label,
  shortcut,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-brand-soft aria-pressed:text-brand-strong [&_svg]:size-4"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut && <span className="text-ash">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  )
}

export function Empty({
  onNew,
  children,
}: {
  onNew: () => void
  children: ReactNode
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <p className="text-body-sm text-muted-foreground">{children}</p>
      <Button onClick={onNew}>
        <Plus />
        New terminal
      </Button>
    </div>
  )
}

// Shown while the active shell's output is being saved for the workspace.
export function RecordedBadge({ className }: { className?: string }) {
  return (
    <span
      title="This workspace records terminals: what this shell prints is saved, and you and its Owners can replay it. What you type isn't saved."
      className={cn(
        "me-1 flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-border px-2 text-caption text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-destructive" />
      Recorded
    </span>
  )
}
