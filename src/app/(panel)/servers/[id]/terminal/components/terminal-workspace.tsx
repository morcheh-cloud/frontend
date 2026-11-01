"use client"

import { LoaderCircle, RotateCcw, TriangleAlert, X } from "lucide-react"
import { type ReactNode, type RefObject, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useServerPage } from "../../components/server-page"
import { TerminalDesktop } from "./terminal-desktop"
import { TerminalMobile } from "./terminal-mobile"
import { type TerminalHandle, TerminalView } from "./terminal-view"
import { type Tab, useTabs } from "./use-tabs"

const FONT_KEY = "morcheh.terminal.fontSize"
export const FONT_MIN = 10
export const FONT_MAX = 22

export type Modifiers = { ctrl: boolean; alt: boolean }

export type Workspace = ReturnType<typeof useTabs> & {
  active?: Tab
  handle: () => TerminalHandle | undefined
  fontSize: number
  setFontSize: (size: number) => void
  copy: () => void
  paste: () => void
  // The shells, one per tab, stacked; only the active one is visible.
  views: ReactNode
}

// The terminal section: tabs of shells on this server. Desktop and phone
// frame the same terminals differently; the shells live on the backend and
// survive leaving the page.
export function TerminalWorkspace() {
  const { server, phone } = useServerPage()
  const tabs = useTabs(server.id)
  const handles = useRef(new Map<string, TerminalHandle>())
  const [fontSize, setFontSize] = useFontSize(phone ? 12 : 13)
  // Phone key bar: Ctrl/Alt stick until the next key.
  const [mods, setMods] = useState<Modifiers>({ ctrl: false, alt: false })
  const modsRef = useRef(mods)
  modsRef.current = mods
  const [search, setSearch] = useState({ open: false, nonce: 0 })

  const handle = () =>
    tabs.activeKey ? handles.current.get(tabs.activeKey) : undefined

  const applyMods = (data: string) => {
    const current = modsRef.current
    if (!current.ctrl && !current.alt) return data
    setMods({ ctrl: false, alt: false })
    return withModifiers(data, current)
  }

  const views = tabs.tabs?.map((tab) => (
    <div
      key={tab.key}
      className={cn(
        "absolute inset-0",
        tab.key !== tabs.activeKey && "invisible",
      )}
    >
      <TerminalView
        ref={(h) => {
          if (h) handles.current.set(tab.key, h)
          return () => {
            handles.current.delete(tab.key)
          }
        }}
        serverId={server.id}
        sessionId={tab.sessionId}
        cwd={tab.cwd}
        active={tab.key === tabs.activeKey}
        fontSize={fontSize}
        transformInput={phone ? applyMods : undefined}
        onSession={(id, title) => tabs.attach(tab.key, id, title)}
        onTitle={(title) => tabs.update(tab.key, { title })}
        onStatus={(status) => tabs.update(tab.key, { status })}
        onCommands={(commands) => tabs.update(tab.key, { commands })}
        onShortcut={() =>
          setSearch((s) => ({ open: true, nonce: s.nonce + 1 }))
        }
        className="size-full"
      />
      <TabOverlay
        tab={tab}
        serverName={server.name}
        handles={handles}
        onClose={() => tabs.remove(tab.key)}
      />
    </div>
  ))

  const workspace: Workspace = {
    ...tabs,
    active: tabs.tabs?.find((t) => t.key === tabs.activeKey),
    handle,
    fontSize,
    setFontSize,
    copy: async () => {
      try {
        const copied = await handle()?.copy()
        toast(copied ? "Copied" : "Nothing to copy")
      } catch {
        toast.error("The browser blocked the clipboard.")
      }
    },
    paste: async () => {
      try {
        await handle()?.paste()
      } catch {
        toast.error("The browser blocked the clipboard. Use Ctrl+Shift+V.")
      }
    },
    views,
  }

  if (tabs.error && !tabs.tabs) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-body-sm text-muted-foreground">
          {tabs.error.message}
        </p>
        <Button variant="outline" onClick={() => tabs.retry()}>
          Try again
        </Button>
      </div>
    )
  }

  return phone ? (
    <TerminalMobile w={workspace} mods={mods} setMods={setMods} />
  ) : (
    <TerminalDesktop
      w={workspace}
      search={search}
      setSearchOpen={(open) => setSearch((s) => ({ ...s, open }))}
    />
  )
}

// What covers a tab whose shell isn't simply running.
function TabOverlay({
  tab,
  serverName,
  handles,
  onClose,
}: {
  tab: Tab
  serverName: string
  handles: RefObject<Map<string, TerminalHandle>>
  onClose: () => void
}) {
  const { status } = tab
  const restart = () => handles.current.get(tab.key)?.restart()

  if (status.kind === "connecting" && !tab.sessionId) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background">
        <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Connecting to {serverName}…
        </p>
      </div>
    )
  }
  if (status.kind === "reconnecting") {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <p className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-body-sm shadow-md">
          <LoaderCircle className="size-4 animate-spin text-ash" />
          Connection lost. Reconnecting…
        </p>
      </div>
    )
  }
  if (status.kind !== "exited" && status.kind !== "failed") return null

  const failed = status.kind === "failed"
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center bg-linear-to-t from-background via-background/90 to-transparent px-4 pt-12 pb-6">
      <div className="flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-md sm:flex-row sm:items-center">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            failed && "bg-destructive/10 text-destructive",
          )}
        >
          {failed ? (
            <TriangleAlert className="size-5" />
          ) : (
            <RotateCcw className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium">
            {failed ? "Couldn't open a shell" : "This session has ended"}
          </p>
          <p className="text-body-sm text-muted-foreground">
            {failed
              ? status.message
              : status.code != null && status.code >= 0
                ? `The shell exited with code ${status.code}.`
                : "The shell is no longer running."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 max-md:h-11"
          >
            <X />
            Close
          </Button>
          <Button onClick={restart} className="flex-1 max-md:h-11">
            <RotateCcw />
            {failed ? "Try again" : "Restart"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Ctrl turns a letter into its control character (Ctrl+C → \x03); Alt sends
// ESC first, the way terminals encode Meta.
export function withModifiers(data: string, { ctrl, alt }: Modifiers) {
  let out = data
  if (ctrl && data.length === 1) {
    const code = data.toUpperCase().charCodeAt(0)
    if (code >= 64 && code <= 95) out = String.fromCharCode(code & 0x1f)
    else if (data === " ") out = "\x00"
  }
  return alt ? `\x1b${out}` : out
}

function useFontSize(fallback: number) {
  const [size, setSize] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(FONT_KEY))
      if (saved >= FONT_MIN && saved <= FONT_MAX) return saved
    } catch {}
    return fallback
  })
  const set = (next: number) => {
    const clamped = Math.min(FONT_MAX, Math.max(FONT_MIN, next))
    setSize(clamped)
    try {
      localStorage.setItem(FONT_KEY, String(clamped))
    } catch {}
  }
  return [size, set] as const
}
