"use client"

import "@xterm/xterm/css/xterm.css"

import type { SearchAddon } from "@xterm/addon-search"
import type { IMarker, ITheme, Terminal } from "@xterm/xterm"
import {
  type Ref,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
} from "react"

import { useTheme } from "@/components/theme"
import { cn } from "@/lib/utils"
import { type ControlMessage, terminalSocketUrl } from "../api"

export type Status =
  | { kind: "connecting" }
  | { kind: "open" }
  // The link dropped; the shell is still running on the backend.
  | { kind: "reconnecting"; attempt: number }
  | { kind: "exited"; code?: number }
  | { kind: "failed"; message: string }

export type SearchOptions = { caseSensitive?: boolean; regex?: boolean }

// A command run at a prompt in this shell, newest last.
export type Command = {
  id: number
  text: string
  // The whole prompt line, to find it again after a replay redrew the buffer.
  line: string
  at: number
}

// Kept per session for the browser tab, so a reload keeps the history.
const commandsKey = (session: string) => `morcheh.terminal.commands.${session}`
const MAX_COMMANDS = 100

export type TerminalHandle = {
  focus: () => void
  clear: () => void
  selectAll: () => void
  // Copies the selection (or everything when nothing is selected).
  copy: () => Promise<boolean>
  paste: () => Promise<void>
  send: (data: string) => void
  findNext: (query: string, options?: SearchOptions) => void
  findPrevious: (query: string, options?: SearchOptions) => void
  clearSearch: () => void
  // Called with the match position and count whenever a search changes.
  onResults: (listener: (index: number, count: number) => void) => void
  // Scrolls to where a command was run and selects it; false when it is no
  // longer in the scrollback.
  scrollToCommand: (id: number) => boolean
  // Start over: a new shell in this tab (after it exited or failed).
  restart: () => void
}

const encoder = new TextEncoder()

// One shell, drawn by xterm and fed over the terminal WebSocket. The session
// lives on the backend: a dropped connection reconnects and replays the
// recent output, so a flaky network or a reload loses nothing.
export function TerminalView({
  ref,
  serverId,
  sessionId,
  cwd,
  start,
  active,
  fontSize,
  transformInput,
  onSession,
  onTitle,
  onStatus,
  onShortcut,
  onCommands,
  className,
}: {
  ref?: Ref<TerminalHandle>
  serverId: string
  // Attach to this running shell; without it a new one starts.
  sessionId?: string
  cwd?: string
  // Extra parameters for a new session (container, user, shell).
  start?: Record<string, string | undefined>
  // Only the visible tab measures itself (hidden ones have no size).
  active: boolean
  fontSize: number
  // Lets the phone key bar apply its sticky Ctrl/Alt to typed keys.
  transformInput?: (data: string) => string
  // `recorded`: the workspace saves this shell's output.
  onSession: (id: string, title: string, recorded: boolean) => void
  onTitle: (title: string) => void
  onStatus: (status: Status) => void
  onShortcut?: (name: "search") => void
  onCommands?: (commands: Command[]) => void
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const searchRef = useRef<SearchAddon | null>(null)
  const fitRef = useRef<(() => void) | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const sessionRef = useRef(sessionId)
  const connectRef = useRef<(() => void) | null>(null)
  const resultsRef = useRef<((index: number, count: number) => void) | null>(
    null,
  )
  const commandsRef = useRef<Command[]>([])
  // Where each command sits in the buffer; gone after a reset or a clear.
  const markersRef = useRef(new Map<number, IMarker>())

  const emitSession = useEffectEvent(onSession)
  const emitTitle = useEffectEvent(onTitle)
  const emitStatus = useEffectEvent(onStatus)
  const emitShortcut = useEffectEvent((name: "search") => onShortcut?.(name))
  const emitCommands = useEffectEvent((list: Command[]) => onCommands?.(list))
  const transform = useEffectEvent(
    (data: string) => transformInput?.(data) ?? data,
  )

  // Build the terminal and the connection once per tab: it keeps them for its
  // whole life, and the effects below apply later prop changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    // Once the shell is gone (exit, kill, fatal error) we stop reconnecting.
    let finished = false
    const cleanups: (() => void)[] = []

    const send = (data: string | Uint8Array<ArrayBuffer>) => {
      const ws = socketRef.current
      if (ws?.readyState === WebSocket.OPEN) ws.send(data)
    }

    void (async () => {
      const [{ Terminal }, fit, links, search, unicode] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
        import("@xterm/addon-search"),
        import("@xterm/addon-unicode11"),
      ])
      if (disposed) return

      const term = new Terminal({
        allowProposedApi: true,
        cursorBlink: true,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
        fontSize,
        lineHeight: 1.2,
        scrollback: 10000,
        theme: readTheme(),
        macOptionIsMeta: true,
        rightClickSelectsWord: true,
      })
      termRef.current = term
      const fitAddon = new fit.FitAddon()
      const searchAddon = new search.SearchAddon()
      searchRef.current = searchAddon
      term.loadAddon(fitAddon)
      term.loadAddon(searchAddon)
      term.loadAddon(
        new links.WebLinksAddon((event, uri) => {
          event.preventDefault()
          window.open(uri, "_blank", "noopener,noreferrer")
        }),
      )
      term.loadAddon(new unicode.Unicode11Addon())
      term.unicode.activeVersion = "11"
      term.open(host)

      // Phone keyboards: no autocorrect or capitalisation in a shell.
      const ta = term.textarea
      if (ta) {
        ta.setAttribute("autocapitalize", "off")
        ta.setAttribute("autocorrect", "off")
        ta.setAttribute("autocomplete", "off")
        ta.spellcheck = false
      }

      // WebGL is much faster for heavy output; fall back silently. Phones
      // keep the DOM renderer: mobile GPUs drop or blank WebGL canvases.
      if (matchMedia("(pointer: fine)").matches)
        try {
          const { WebglAddon } = await import("@xterm/addon-webgl")
          if (!disposed) {
            const webgl = new WebglAddon()
            webgl.onContextLoss(() => webgl.dispose())
            term.loadAddon(webgl)
          }
        } catch {}
      if (disposed) return

      fitRef.current = () => {
        if (host.clientWidth === 0 || host.clientHeight === 0) return
        try {
          fitAddon.fit()
        } catch {}
      }
      fitRef.current()

      searchAddon.onDidChangeResults(({ resultIndex, resultCount }) =>
        resultsRef.current?.(resultIndex, resultCount),
      )

      term.attachCustomKeyEventHandler((e) => {
        if (e.type !== "keydown") return true
        const mod = e.metaKey || (e.ctrlKey && e.shiftKey)
        const key = e.key.toLowerCase()
        if (mod && key === "c" && term.hasSelection()) {
          void navigator.clipboard.writeText(term.getSelection())
          term.clearSelection()
          return false
        }
        // Let the browser paste; xterm picks up the paste event.
        if (mod && key === "v") return false
        if (mod && key === "f") {
          e.preventDefault()
          emitShortcut("search")
          return false
        }
        return true
      })

      // Command history: where typing at a prompt started, then on Enter the
      // text from there to the end of that line. Full-screen apps (vim, top)
      // run in the alternate buffer and are skipped.
      let inputStart: { x: number; y: number } | null = null
      const setCommands = (list: Command[]) => {
        commandsRef.current = list
        emitCommands(list)
        const session = sessionRef.current
        if (session)
          try {
            sessionStorage.setItem(commandsKey(session), JSON.stringify(list))
          } catch {}
      }
      if (sessionRef.current)
        try {
          const saved = sessionStorage.getItem(commandsKey(sessionRef.current))
          if (saved) setCommands(JSON.parse(saved) as Command[])
        } catch {}

      const track = (data: string) => {
        const buffer = term.buffer.active
        if (buffer.type === "alternate") {
          inputStart = null
          return
        }
        const cursor = buffer.baseY + buffer.cursorY
        if (data === "\x03" || data === "\x04") {
          inputStart = null
        } else if (data !== "\r") {
          inputStart ??= { x: buffer.cursorX, y: cursor }
        } else if (inputStart) {
          const start = lineStart(term, inputStart.y)
          const line = lineText(term, start)
          const text = line
            .slice((inputStart.y - start) * term.cols + inputStart.x)
            .trim()
          inputStart = null
          if (!text) return
          const marker = term.registerMarker(start - cursor)
          const list = commandsRef.current
          const id = (list.at(-1)?.id ?? 0) + 1
          if (marker) {
            markersRef.current.set(id, marker)
            marker.onDispose(() => markersRef.current.delete(id))
          }
          setCommands(
            [...list, { id, text, line, at: Date.now() }].slice(-MAX_COMMANDS),
          )
        }
      }

      const input = (data: string) => {
        track(data)
        send(encoder.encode(transform(data)))
      }
      term.onData(input)
      term.onBinary((data) =>
        send(Uint8Array.from(data, (c) => c.charCodeAt(0))),
      )
      term.onResize(({ cols, rows }) =>
        send(JSON.stringify({ type: "resize", cols, rows })),
      )

      const connect = () => {
        if (disposed) return
        clearTimeout(retryTimer)
        finished = false
        const resuming = Boolean(sessionRef.current)
        emitStatus(
          attempt > 0
            ? { kind: "reconnecting", attempt }
            : { kind: "connecting" },
        )
        const ws = new WebSocket(
          terminalSocketUrl(serverId, {
            session: sessionRef.current,
            cols: term.cols,
            rows: term.rows,
            cwd: sessionRef.current ? undefined : cwd,
            ...(sessionRef.current ? {} : start),
          }),
        )
        ws.binaryType = "arraybuffer"
        socketRef.current = ws
        let failure: string | undefined

        ws.onmessage = (event) => {
          if (typeof event.data !== "string") {
            term.write(new Uint8Array(event.data as ArrayBuffer))
            return
          }
          const msg = JSON.parse(event.data) as ControlMessage
          switch (msg.type) {
            case "session":
              // A resumed session replays its scrollback next: start clean
              // so nothing shows twice.
              if (resuming) term.reset()
              sessionRef.current = msg.id
              attempt = 0
              // A new shell (or a restart) starts a new history.
              if (!resuming) setCommands([])
              emitSession(msg.id, msg.title, Boolean(msg.recorded))
              emitStatus({ kind: "open" })
              // The shell may have another size if someone else resized it.
              send(
                JSON.stringify({
                  type: "resize",
                  cols: term.cols,
                  rows: term.rows,
                }),
              )
              break
            case "title":
              emitTitle(msg.title)
              break
            case "exit":
              finished = true
              term.write(
                `\r\n\x1b[90m[Process exited${msg.code != null && msg.code >= 0 ? ` with code ${msg.code}` : ""}]\x1b[0m\r\n`,
              )
              emitStatus({ kind: "exited", code: msg.code })
              break
            case "error":
              failure = msg.message
              break
          }
        }

        ws.onclose = (event) => {
          if (socketRef.current !== ws) return
          socketRef.current = null
          if (disposed || finished) return
          // 4000+status: the backend refused. 404 = the shell is gone; other
          // refusals (auth failed, host key changed…) need the user.
          if (event.code >= 4000 && event.code < 5000) {
            finished = true
            if (event.code === 4404 && resuming) {
              emitStatus({ kind: "exited" })
            } else {
              emitStatus({
                kind: "failed",
                message: failure ?? event.reason ?? "Couldn't connect",
              })
            }
            return
          }
          // Anything else is the network: try again, slower each time.
          attempt++
          emitStatus({ kind: "reconnecting", attempt })
          retryTimer = setTimeout(
            connect,
            Math.min(15000, 500 * 2 ** Math.min(attempt, 5)),
          )
        }
      }
      connectRef.current = connect
      connect()

      // Back online, or the tab came back to the foreground: retry now.
      const retryNow = () => {
        if (!finished && !socketRef.current && attempt > 0) connect()
      }
      window.addEventListener("online", retryNow)
      document.addEventListener("visibilitychange", retryNow)
      cleanups.push(() => {
        window.removeEventListener("online", retryNow)
        document.removeEventListener("visibilitychange", retryNow)
      })

      const observer = new ResizeObserver(() =>
        requestAnimationFrame(() => fitRef.current?.()),
      )
      observer.observe(host)
      cleanups.push(() => observer.disconnect())
    })()

    return () => {
      disposed = true
      clearTimeout(retryTimer)
      for (const fn of cleanups) fn()
      const ws = socketRef.current
      socketRef.current = null
      ws?.close(1000)
      termRef.current?.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [])

  // xterm takes plain colors: read the tokens again when the theme flips
  // (the class is already on <html> by the time this runs).
  const { resolved: theme } = useTheme()
  useEffect(() => {
    if (theme && termRef.current) termRef.current.options.theme = readTheme()
  }, [theme])

  useEffect(() => {
    const term = termRef.current
    if (!term || term.options.fontSize === fontSize) return
    term.options.fontSize = fontSize
    fitRef.current?.()
  }, [fontSize])

  useEffect(() => {
    if (!active) return
    const id = requestAnimationFrame(() => {
      fitRef.current?.()
      termRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [active])

  useImperativeHandle(
    ref,
    () => ({
      focus: () => termRef.current?.focus(),
      clear: () => termRef.current?.clear(),
      selectAll: () => termRef.current?.selectAll(),
      copy: async () => {
        const term = termRef.current
        if (!term) return false
        let text = term.getSelection()
        if (!text) {
          term.selectAll()
          text = term.getSelection()
          term.clearSelection()
        }
        if (!text) return false
        await navigator.clipboard.writeText(text)
        return true
      },
      paste: async () => {
        const text = await navigator.clipboard.readText()
        if (text) termRef.current?.paste(text)
        termRef.current?.focus()
      },
      send: (data) => {
        const ws = socketRef.current
        if (ws?.readyState === WebSocket.OPEN) ws.send(encoder.encode(data))
        termRef.current?.focus()
      },
      findNext: (query, options) =>
        void searchRef.current?.findNext(query, {
          ...options,
          incremental: true,
          decorations: searchDecorations(),
        }),
      findPrevious: (query, options) =>
        void searchRef.current?.findPrevious(query, {
          ...options,
          decorations: searchDecorations(),
        }),
      scrollToCommand: (id) => {
        const term = termRef.current
        const list = commandsRef.current
        const index = list.findIndex((c) => c.id === id)
        if (!term || index < 0) return false
        let marker = markersRef.current.get(id)
        let start = marker && !marker.isDisposed ? marker.line : -1
        if (start < 0) {
          // A reset (reconnect, reload) dropped the markers: find the line
          // again, counting the same line run again later.
          const command = list[index]
          const later = list
            .slice(index + 1)
            .filter((c) => c.line === command.line).length
          start = findLine(term, command.line, later)
          if (start < 0) return false
          const buffer = term.buffer.active
          marker = term.registerMarker(start - buffer.baseY - buffer.cursorY)
          if (marker) {
            markersRef.current.set(id, marker)
            marker.onDispose(() => markersRef.current.delete(id))
          }
        }
        term.scrollToLine(Math.max(0, start - 2))
        flash(term, marker, lineEnd(term, start) - start + 1)
        term.focus()
        return true
      },
      onResults: (listener) => {
        resultsRef.current = listener
      },
      clearSearch: () => {
        searchRef.current?.clearDecorations()
        termRef.current?.clearSelection()
      },
      restart: () => {
        const term = termRef.current
        if (!term) return
        socketRef.current?.close(1000)
        socketRef.current = null
        sessionRef.current = undefined
        term.reset()
        connectRef.current?.()
      },
    }),
    [],
  )

  return (
    <div className={cn("min-h-0 min-w-0 overflow-hidden", className)}>
      <div ref={hostRef} className="size-full" />
    </div>
  )
}

// Briefly tints the rows of a picked command so the eye lands on it.
function flash(term: Terminal, marker: IMarker | undefined, rows: number) {
  if (!marker) return
  const decoration = term.registerDecoration({
    marker,
    width: term.cols,
    height: rows,
    layer: "top",
  })
  // Paint a child: xterm resets the decoration element's own background.
  let tint: HTMLDivElement | undefined
  decoration?.onRender((el) => {
    if (tint) return
    tint = document.createElement("div")
    tint.style.cssText = `position:absolute;inset:0;background:${cssVar("--term-selection") || cssVar("--color-brand-soft")};transition:opacity 600ms`
    el.append(tint)
  })
  setTimeout(() => {
    if (tint) tint.style.opacity = "0"
  }, 900)
  setTimeout(() => decoration?.dispose(), 1500)
}

// The first row of the (possibly wrapped) line that row `y` belongs to.
function lineStart(term: Terminal, row: number) {
  const buffer = term.buffer.active
  let y = row
  while (y > 0 && buffer.getLine(y)?.isWrapped) y--
  return y
}

// The last row of the line starting at row `y`.
function lineEnd(term: Terminal, row: number) {
  const buffer = term.buffer.active
  let y = row
  while (buffer.getLine(y + 1)?.isWrapped) y++
  return y
}

// The text of the line starting at row `y`, its wrapped rows joined.
function lineText(term: Terminal, y: number) {
  const buffer = term.buffer.active
  const end = lineEnd(term, y)
  let text = ""
  for (let row = y; row <= end; row++)
    text += buffer.getLine(row)?.translateToString(row === end) ?? ""
  return text.trimEnd()
}

// The start row of the line with this text, skipping `skip` matches from the
// bottom; -1 when it isn't in the buffer.
function findLine(term: Terminal, text: string, skip: number) {
  const buffer = term.buffer.active
  let left = skip
  for (let y = buffer.length - 1; y >= 0; y--) {
    if (buffer.getLine(y)?.isWrapped) continue
    if (lineText(term, y) === text && left-- === 0) return y
  }
  return -1
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

// The palette lives in globals.css; xterm needs plain colors.
export function readTheme(): ITheme {
  const v = (name: string) => cssVar(`--term-${name}`)
  return {
    background: cssVar("--background"),
    foreground: cssVar("--foreground"),
    cursor: cssVar("--color-brand"),
    cursorAccent: cssVar("--background"),
    selectionBackground: v("selection"),
    black: v("black"),
    red: v("red"),
    green: v("green"),
    yellow: v("yellow"),
    blue: v("blue"),
    magenta: v("magenta"),
    cyan: v("cyan"),
    white: v("white"),
    brightBlack: v("bright-black"),
    brightRed: v("bright-red"),
    brightGreen: v("bright-green"),
    brightYellow: v("bright-yellow"),
    brightBlue: v("bright-blue"),
    brightMagenta: v("bright-magenta"),
    brightCyan: v("bright-cyan"),
    brightWhite: v("bright-white"),
  }
}

function searchDecorations() {
  return {
    matchBackground: cssVar("--color-brand-soft"),
    activeMatchBackground: cssVar("--term-selection"),
    activeMatchBorder: cssVar("--color-brand"),
    matchOverviewRuler: cssVar("--color-mist"),
    activeMatchColorOverviewRuler: cssVar("--color-brand"),
  }
}
