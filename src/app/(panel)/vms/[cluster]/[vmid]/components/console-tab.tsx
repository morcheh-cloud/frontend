"use client"

import "@xterm/xterm/css/xterm.css"

import type { Terminal } from "@xterm/xterm"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Keyboard,
  LoaderCircle,
  Maximize,
  Minimize,
  Monitor,
  Play,
  RotateCw,
  SquareTerminal,
  Unplug,
} from "lucide-react"
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { useTheme } from "@/components/theme"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Empty, Segmented } from "../../../../servers/[id]/components/parts"
import { Key } from "../../../../servers/[id]/terminal/components/terminal-mobile"
import { readTheme } from "../../../../servers/[id]/terminal/components/terminal-view"
import { consoleSocketUrl } from "../../../api"
import { kindNoun } from "../../../components/meta"
import { useVmActions } from "../../../components/vm-actions"
import { useGuestPage } from "./guest-page"
import { TabBar } from "./kit"

type Mode = "screen" | "serial" | "shell"

type Status =
  | { state: "connecting" }
  | { state: "open" }
  | { state: "closed"; message?: string }
  | { state: "error"; message: string }

// What the toolbar can ask of the open console.
type Handle = {
  focus: () => void
  ctrlAltDel?: () => void
  type?: (text: string) => void
}

export function ConsoleTab() {
  const { guest: g, phone, can } = useGuestPage()
  const a = useVmActions()
  const serial = Object.keys(g.config ?? {}).find((k) => /^serial\d$/.test(k))
  const modes: { value: Mode; label: ReactNode }[] =
    g.kind === "lxc"
      ? [{ value: "shell", label: "Shell" }]
      : [
          { value: "screen", label: "Screen" },
          ...(serial ? [{ value: "serial" as const, label: "Serial" }] : []),
        ]
  const [picked, setPicked] = useState<Mode>(modes[0].value)
  const mode = modes.some((m) => m.value === picked) ? picked : modes[0].value
  const [nonce, setNonce] = useState(0)
  const [status, setStatus] = useState<Status>({ state: "connecting" })
  const [full, setFull] = useState(false)
  const handle = useRef<Handle | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [typeOpen, setTypeOpen] = useOpen("vm-console-type")

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === stage.current)
    document.addEventListener("fullscreenchange", on)
    return () => document.removeEventListener("fullscreenchange", on)
  }, [])

  if (g.status !== "running") {
    const paused = g.status === "paused" || g.qmp_status === "paused"
    return (
      <Empty
        icon={Monitor}
        title={paused ? "It's paused" : "It's not running"}
        body={
          paused
            ? `Resume the ${kindNoun(g.kind)} to see its console.`
            : `Start the ${kindNoun(g.kind)} to see its console. It opens here by itself.`
        }
        action={
          can("operator") ? (
            <Button onClick={() => a.power(g, paused ? "resume" : "start")}>
              <Play />
              {paused ? "Resume" : "Start"}
            </Button>
          ) : undefined
        }
        className="m-4 md:m-6"
      />
    )
  }

  const reconnect = () => setNonce((n) => n + 1)
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stage.current?.requestFullscreen().catch(() => {})
  }
  const canFull = typeof document !== "undefined" && document.fullscreenEnabled

  const tools = (
    <>
      {mode === "screen" && (
        <>
          <ToolButton
            label="Send Ctrl+Alt+Del"
            phone={phone}
            disabled={status.state !== "open"}
            onClick={() => handle.current?.ctrlAltDel?.()}
          >
            <span className="font-mono text-caption">⌃⌥⌦</span>
          </ToolButton>
          <ToolButton
            label="Type text…"
            phone={phone}
            disabled={status.state !== "open"}
            onClick={() => setTypeOpen(true)}
          >
            <Keyboard />
          </ToolButton>
        </>
      )}
      <ToolButton label="Reconnect" phone={phone} onClick={reconnect}>
        <RotateCw />
      </ToolButton>
      {canFull && !phone && (
        <ToolButton
          label={full ? "Leave full screen" : "Full screen"}
          phone={phone}
          onClick={fullscreen}
        >
          {full ? <Minimize /> : <Maximize />}
        </ToolButton>
      )}
    </>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pt-4 pb-6 max-md:gap-0 max-md:p-0">
      <TabBar className="max-md:flex-nowrap">
        {modes.length > 1 ? (
          <Segmented
            label="Console"
            items={modes}
            value={mode}
            onChange={(m) => {
              setPicked(m)
              setStatus({ state: "connecting" })
            }}
          />
        ) : (
          <span className="flex items-center gap-2 text-body-sm font-medium">
            <SquareTerminal className="size-4 text-muted-foreground" />
            Shell
          </span>
        )}
        <StatusText status={status} />
        <div className="ms-auto flex items-center gap-1">{tools}</div>
      </TabBar>

      <div
        ref={stage}
        className={cn(
          "relative flex min-h-[28rem] flex-1 overflow-hidden rounded-2xl border border-border bg-background",
          mode === "screen" && "bg-muted",
          "max-md:h-[calc(100dvh-14rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-md:min-h-64 max-md:flex-none max-md:rounded-none max-md:border-x-0 max-md:border-t-0",
          full && "rounded-none border-0",
        )}
      >
        {mode === "screen" ? (
          <VncScreen
            key={`vnc-${nonce}`}
            cluster={g.cluster_id}
            vmid={g.vmid}
            handle={handle}
            onStatus={setStatus}
          />
        ) : (
          <TermScreen
            key={`term-${mode}-${nonce}`}
            cluster={g.cluster_id}
            vmid={g.vmid}
            serial={mode === "serial" ? serial : undefined}
            phone={phone}
            handle={handle}
            onStatus={setStatus}
          />
        )}
        <Overlay status={status} onReconnect={reconnect} />
      </div>

      {mode === "serial" && !phone && (
        <p className="text-caption text-ash">
          The serial console shows what the system prints to {serial}. Linux
          needs <code className="font-mono">console=ttyS0</code> on its boot
          line to use it.
        </p>
      )}

      <TypeTextDialog
        open={typeOpen}
        onOpenChange={setTypeOpen}
        onType={(text) => {
          handle.current?.type?.(text)
          handle.current?.focus()
        }}
      />
    </div>
  )
}

function ToolButton({
  label,
  phone,
  disabled,
  onClick,
  children,
}: {
  label: string
  phone: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const button = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="max-md:size-11"
    >
      {children}
    </Button>
  )
  if (phone) return button
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function StatusText({ status }: { status: Status }) {
  const text = {
    connecting: "Connecting…",
    open: "Connected",
    closed: "Disconnected",
    error: "Couldn't connect",
  }[status.state]
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-caption text-muted-foreground max-md:hidden",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status.state === "open" && "bg-success",
          status.state === "connecting" && "animate-pulse bg-ash",
          status.state === "closed" && "bg-ash",
          status.state === "error" && "bg-destructive",
        )}
      />
      {text}
    </span>
  )
}

function Overlay({
  status,
  onReconnect,
}: {
  status: Status
  onReconnect: () => void
}) {
  if (status.state === "open") return null
  if (status.state === "connecting")
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-body-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin text-brand" />
        Opening the console…
      </div>
    )
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Unplug className="size-5" />
        </span>
        <div>
          <p className="text-body font-medium">
            {status.state === "error"
              ? "Couldn't connect"
              : "The console closed"}
          </p>
          {status.message && (
            <p className="mt-1 text-body-sm text-muted-foreground">
              {status.message}
            </p>
          )}
        </div>
        <Button onClick={onReconnect}>
          <RotateCw />
          Connect again
        </Button>
      </div>
    </div>
  )
}

// ---- VNC (a VM's screen) through noVNC

// X11 keysyms for typing text into the screen.
function keysymOf(ch: string) {
  if (ch === "\n") return 0xff0d
  if (ch === "\t") return 0xff09
  const code = ch.codePointAt(0) ?? 0
  if (code >= 0x20 && code <= 0xff) return code
  return 0x01000000 + code
}

function VncScreen({
  cluster,
  vmid,
  handle,
  onStatus,
}: {
  cluster: string
  vmid: number
  handle: React.RefObject<Handle | null>
  onStatus: (s: Status) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const report = useEffectEvent(onStatus)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let disposed = false
    let rfb: import("@novnc/novnc").default | null = null
    report({ state: "connecting" })
    void (async () => {
      try {
        const [c, mod] = await Promise.all([
          api.virtualMachines.openPveConsole(cluster, vmid, { mode: "vnc" }),
          import("@novnc/novnc"),
        ])
        if (disposed) return
        const RFB = mod.default
        const screen = new RFB(el, consoleSocketUrl(cluster, c.token), {
          credentials: { password: c.password ?? "" },
        })
        rfb = screen
        screen.scaleViewport = true
        screen.background = "transparent"
        screen.focusOnClick = true
        screen.addEventListener("connect", () => {
          if (disposed) return
          report({ state: "open" })
          screen.focus()
        })
        screen.addEventListener("credentialsrequired", () =>
          screen.sendCredentials({ password: c.password ?? "" }),
        )
        screen.addEventListener("securityfailure", (e) => {
          const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason
          if (!disposed)
            report({
              state: "error",
              message: reason || "Proxmox refused the console's password.",
            })
        })
        screen.addEventListener("disconnect", (e) => {
          if (disposed) return
          const clean = (e as CustomEvent<{ clean: boolean }>).detail?.clean
          report(
            clean
              ? { state: "closed" }
              : { state: "error", message: "The connection dropped." },
          )
        })
        handle.current = {
          focus: () => screen.focus(),
          ctrlAltDel: () => screen.sendCtrlAltDel(),
          type: (text) => {
            for (const ch of text.replace(/\r\n?/g, "\n")) {
              const sym = keysymOf(ch)
              screen.sendKey(sym, null, true)
              screen.sendKey(sym, null, false)
            }
          },
        }
      } catch (err) {
        if (!disposed)
          report({
            state: "error",
            message: err instanceof Error ? err.message : String(err),
          })
      }
    })()
    return () => {
      disposed = true
      handle.current = null
      try {
        rfb?.disconnect()
      } catch {}
    }
  }, [cluster, vmid, handle])

  return <div ref={host} className="absolute inset-0" />
}

// ---- Text console (a container's shell, a VM's serial port) through xterm

const keys: { label: ReactNode; aria: string; data: string }[] = [
  { label: "Esc", aria: "Escape", data: "\x1b" },
  { label: "Tab", aria: "Tab", data: "\t" },
  { label: <ArrowUp />, aria: "Up", data: "\x1b[A" },
  { label: <ArrowDown />, aria: "Down", data: "\x1b[B" },
  { label: <ArrowLeft />, aria: "Left", data: "\x1b[D" },
  { label: <ArrowRight />, aria: "Right", data: "\x1b[C" },
]

function TermScreen({
  cluster,
  vmid,
  serial,
  phone,
  handle,
  onStatus,
}: {
  cluster: string
  vmid: number
  serial?: string
  phone: boolean
  handle: React.RefObject<Handle | null>
  onStatus: (s: Status) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const sendRef = useRef<((data: string) => void) | null>(null)
  const ctrlRef = useRef(false)
  const [ctrl, setCtrl] = useState(false)
  const report = useEffectEvent(onStatus)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let disposed = false
    let ws: WebSocket | null = null
    let term: Terminal | null = null
    let observer: ResizeObserver | null = null
    const encoder = new TextEncoder()
    report({ state: "connecting" })

    void (async () => {
      try {
        const [c, { Terminal }, fit, unicode] = await Promise.all([
          api.virtualMachines.openPveConsole(cluster, vmid, {
            mode: "term",
            serial,
          }),
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
          import("@xterm/addon-unicode11"),
        ])
        if (disposed) return

        const t = new Terminal({
          allowProposedApi: true,
          cursorBlink: true,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
          fontSize: phone ? 13 : 14,
          lineHeight: 1.2,
          scrollback: 5000,
          theme: readTheme(),
          macOptionIsMeta: true,
        })
        term = t
        termRef.current = t
        const fitAddon = new fit.FitAddon()
        t.loadAddon(fitAddon)
        t.loadAddon(new unicode.Unicode11Addon())
        t.unicode.activeVersion = "11"
        t.open(el)
        const ta = t.textarea
        if (ta) {
          ta.setAttribute("autocapitalize", "off")
          ta.setAttribute("autocorrect", "off")
          ta.setAttribute("autocomplete", "off")
          ta.spellcheck = false
        }
        const refit = () => {
          if (el.clientWidth === 0 || el.clientHeight === 0) return
          try {
            fitAddon.fit()
          } catch {}
        }
        refit()
        observer = new ResizeObserver(refit)
        observer.observe(el)

        const socket = new WebSocket(consoleSocketUrl(cluster, c.token))
        ws = socket
        socket.binaryType = "arraybuffer"
        const send = (data: string) => {
          if (socket.readyState === WebSocket.OPEN)
            socket.send(encoder.encode(data))
        }
        const resize = () => {
          if (socket.readyState === WebSocket.OPEN)
            socket.send(
              JSON.stringify({ type: "resize", cols: t.cols, rows: t.rows }),
            )
        }
        sendRef.current = send
        socket.onmessage = (e) => {
          if (typeof e.data !== "string") {
            t.write(new Uint8Array(e.data as ArrayBuffer))
            return
          }
          let msg: { type?: string; status?: string; message?: string } = {}
          try {
            msg = JSON.parse(e.data)
          } catch {
            return
          }
          if (msg.type === "ready") {
            report({ state: "open" })
            resize()
            if (matchMedia("(pointer: fine)").matches) t.focus()
          } else if (msg.type === "exit") {
            report({
              state: "closed",
              message: msg.status ? `It ended: ${msg.status}.` : undefined,
            })
          } else if (msg.type === "error") {
            report({
              state: "error",
              message: msg.message || "Proxmox closed the console.",
            })
          }
        }
        socket.onclose = () => {
          if (!disposed)
            report({ state: "closed", message: "The connection closed." })
        }
        socket.onerror = () => {
          if (!disposed)
            report({ state: "error", message: "The connection dropped." })
        }
        t.onData((data) => {
          // The phone's sticky Ctrl key turns the next letter into a control code.
          if (ctrlRef.current && data.length === 1) {
            const code = data.toUpperCase().charCodeAt(0)
            if (code >= 64 && code <= 95) {
              ctrlRef.current = false
              setCtrl(false)
              send(String.fromCharCode(code & 0x1f))
              return
            }
          }
          send(data)
        })
        t.onBinary((data) => {
          if (socket.readyState === WebSocket.OPEN)
            socket.send(Uint8Array.from(data, (ch) => ch.charCodeAt(0)))
        })
        t.onResize(resize)
        handle.current = {
          focus: () => t.focus(),
          type: (text) => send(text.replace(/\r?\n/g, "\r")),
        }
      } catch (err) {
        if (!disposed)
          report({
            state: "error",
            message: err instanceof Error ? err.message : String(err),
          })
      }
    })()

    return () => {
      disposed = true
      handle.current = null
      sendRef.current = null
      termRef.current = null
      observer?.disconnect()
      ws?.close()
      term?.dispose()
    }
  }, [cluster, vmid, serial, phone, handle])

  // xterm takes plain colors: read them again when the theme flips.
  const { resolved: theme } = useTheme()
  useEffect(() => {
    if (theme && termRef.current) termRef.current.options.theme = readTheme()
  }, [theme])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div ref={host} className="min-h-0 flex-1 p-2 [&_.xterm]:h-full" />
      {phone && (
        <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-t border-border bg-subtle px-2 py-1.5">
          <Key
            aria="Control"
            pressed={ctrl}
            onPress={() => {
              ctrlRef.current = !ctrlRef.current
              setCtrl(ctrlRef.current)
              termRef.current?.focus()
            }}
          >
            Ctrl
          </Key>
          {keys.map((k) => (
            <Key
              key={k.aria}
              aria={k.aria}
              onPress={() => {
                sendRef.current?.(k.data)
                termRef.current?.focus()
              }}
            >
              {k.label}
            </Key>
          ))}
          <Key
            aria="Control C"
            onPress={() => {
              sendRef.current?.("\x03")
              termRef.current?.focus()
            }}
          >
            ^C
          </Key>
        </div>
      )}
    </div>
  )
}

function TypeTextDialog({
  open,
  onOpenChange,
  onType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onType: (text: string) => void
}) {
  const [text, setText] = useState("")
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Type text"
      description="Sends it as key presses, for a password or a command the screen can't paste."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!text}
            onClick={() => {
              onType(text)
              setText("")
              onOpenChange(false)
              toast("Typed into the console")
            }}
          >
            <Keyboard />
            Type it
          </Button>
        </>
      }
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="font-mono"
        placeholder="Text to type"
      />
      <p className="mt-2 text-caption text-ash">
        A new line presses Enter. Keyboard layouts other than US may change some
        characters.
      </p>
    </ResponsiveDialog>
  )
}
