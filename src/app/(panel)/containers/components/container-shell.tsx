"use client"

import {
  ClipboardPaste,
  Copy,
  Eraser,
  Keyboard,
  LoaderCircle,
  Plus,
  Power,
  RotateCcw,
  SquareTerminal,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useId, useRef, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOpen } from "@/hooks/useOpen"
import type { DockerContainerDetails, Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCloseTerminal, useTerminals } from "../../servers/[id]/terminal/api"
import { RecordedBadge } from "../../servers/[id]/terminal/components/terminal-desktop"
import {
  Key,
  keys,
} from "../../servers/[id]/terminal/components/terminal-mobile"
import {
  type Status,
  type TerminalHandle,
  TerminalView,
} from "../../servers/[id]/terminal/components/terminal-view"
import {
  type Modifiers,
  withModifiers,
} from "../../servers/[id]/terminal/components/terminal-workspace"

const shells = [
  { value: "auto", label: "Auto (bash, else sh)" },
  { value: "bash", label: "bash" },
  { value: "sh", label: "sh" },
  { value: "ash", label: "ash" },
  { value: "zsh", label: "zsh" },
] as const
type ShellChoice = (typeof shells)[number]["value"]

type Run = {
  // A new key = a new TerminalView (a new or another session).
  key: number
  sessionId?: string
  user: string
  shell: ShellChoice
}

function statusText(s: Status | undefined) {
  switch (s?.kind) {
    case "open":
      return "Connected"
    case "reconnecting":
      return "Reconnecting…"
    case "exited":
      return "Shell ended"
    case "failed":
      return "Couldn't open"
    default:
      return "Connecting…"
  }
}

function statusTone(s: Status | undefined) {
  if (s?.kind === "open") return "bg-success"
  if (s?.kind === "failed" || s?.kind === "exited") return "bg-destructive"
  return "bg-warning"
}

// A shell inside the container (`docker exec -it`), kept running on the
// backend like any server terminal: leave and come back, it's still there.
export function ContainerShell({
  server,
  c,
  phone,
}: {
  server: Server
  c: DockerContainerDetails
  phone: boolean
}) {
  const list = useTerminals(server.id)
  const close = useCloseTerminal(server.id)
  const handle = useRef<TerminalHandle | null>(null)
  const [run, setRun] = useState<Run | null>(null)
  const [status, setStatus] = useState<Status>()
  const [recorded, setRecorded] = useState(false)
  const [mods, setMods] = useState<Modifiers>({ ctrl: false, alt: false })
  const modsRef = useRef(mods)
  modsRef.current = mods

  // Pick up a shell already open in this container (from another visit).
  const existing = list.data?.find((t) => t.container === c.id)
  const current: Run | null =
    run ??
    (list.data
      ? { key: 0, sessionId: existing?.id, user: "", shell: "auto" }
      : null)

  const start = (user: string, shell: ShellChoice) => {
    const old = current?.sessionId
    if (old && status?.kind !== "exited") close.mutate(old)
    setStatus(undefined)
    setRecorded(false)
    setRun({ key: (current?.key ?? 0) + 1, user: user.trim(), shell })
  }

  const end = () => {
    const id = current?.sessionId
    if (id) close.mutate(id)
  }

  const copy = async () => {
    try {
      const done = await handle.current?.copy()
      toast(done ? "Copied" : "Nothing to copy")
    } catch {
      toast.error("The browser blocked the clipboard.")
    }
  }

  const applyMods = (data: string) => {
    const m = modsRef.current
    if (!m.ctrl && !m.alt) return data
    setMods({ ctrl: false, alt: false })
    return withModifiers(data, m)
  }

  if (c.state !== "running") {
    return (
      <Notice phone={phone}>
        The container isn't running. Start it to open a shell inside.
      </Notice>
    )
  }
  if (list.error) {
    return <Notice phone={phone}>{list.error.message}</Notice>
  }

  const view = current ? (
    <TerminalView
      key={current.key}
      ref={handle}
      serverId={server.id}
      sessionId={current.sessionId}
      start={{
        container: c.id,
        user: current.user || undefined,
        shell: current.shell === "auto" ? undefined : current.shell,
      }}
      active
      fontSize={phone ? 12 : 13}
      transformInput={phone ? applyMods : undefined}
      onSession={(id, _title, rec) => {
        setRun((r) => ({ ...(r ?? current), sessionId: id }))
        setRecorded(rec)
      }}
      onTitle={() => {}}
      onStatus={setStatus}
      className="size-full"
    />
  ) : (
    <div className="flex size-full items-center justify-center text-ash">
      <LoaderCircle className="size-5 animate-spin" />
    </div>
  )

  const overlay = (status?.kind === "exited" || status?.kind === "failed") && (
    <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
      <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
        <TriangleAlert
          className={cn(
            "size-6",
            status.kind === "failed" ? "text-destructive" : "text-ash",
          )}
        />
        <p className="text-body-sm text-foreground">
          {status.kind === "failed"
            ? status.message
            : `The shell ended${status.code !== undefined ? ` (exit code ${status.code})` : ""}.`}
        </p>
        <Button
          onClick={() => start(current?.user ?? "", current?.shell ?? "auto")}
        >
          <RotateCcw />
          Open a new shell
        </Button>
      </div>
    </div>
  )

  if (phone) {
    return (
      <PhoneShell
        status={status}
        recorded={recorded}
        current={current}
        onStart={start}
        onEnd={end}
        onCopy={copy}
        onPaste={() => handle.current?.paste()}
        onKeyboard={() => handle.current?.focus()}
        mods={mods}
        setMods={setMods}
        send={(data) => handle.current?.send(data)}
        serverId={server.id}
      >
        {view}
        {overlay}
      </PhoneShell>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <DesktopBar
        status={status}
        recorded={recorded}
        current={current}
        onStart={start}
        onEnd={end}
        onCopy={copy}
        onPaste={() => handle.current?.paste()}
        onClear={() => handle.current?.clear()}
        serverId={server.id}
      />
      <div className="relative h-[calc(100dvh-19rem)] min-h-80 overflow-hidden rounded-2xl border border-border py-1.5 ps-3 pe-1">
        <div className="relative size-full">{view}</div>
        {overlay}
      </div>
      <p className="text-caption text-ash">
        Runs <code className="font-mono">docker exec -it</code> on {""}
        the server. What you type inside a container isn&apos;t listed in the
        Audit log (only that the shell was opened); a recorded workspace still
        records what it prints.
      </p>
    </div>
  )
}

function Notice({
  phone,
  children,
}: {
  phone: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 py-16 text-center",
        phone && "px-6",
      )}
    >
      <SquareTerminal className="size-6 text-ash" />
      <p className="max-w-sm text-body-sm text-muted-foreground">{children}</p>
    </div>
  )
}

function StatusDot({ status }: { status: Status | undefined }) {
  return (
    <span className="flex items-center gap-2 text-body-sm text-muted-foreground">
      <span className={cn("size-2 rounded-full", statusTone(status))} />
      {statusText(status)}
    </span>
  )
}

function ShellFields({
  user,
  setUser,
  shell,
  setShell,
  phone,
}: {
  user: string
  setUser: (v: string) => void
  shell: ShellChoice
  setShell: (v: ShellChoice) => void
  phone?: boolean
}) {
  const id = useId()
  return (
    <>
      <div className={cn("flex flex-col gap-1.5", !phone && "w-40")}>
        <label
          htmlFor={`${id}-user`}
          className={cn(
            "text-caption text-muted-foreground",
            !phone && "sr-only",
          )}
        >
          User
        </label>
        <Input
          id={`${id}-user`}
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder={phone ? "Image default" : "User: image default"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn(!phone && "h-8 md:h-8")}
        />
      </div>
      <div className={cn("flex flex-col gap-1.5", !phone && "w-48")}>
        <span
          id={`${id}-shell`}
          className={cn(
            "text-caption text-muted-foreground",
            !phone && "sr-only",
          )}
        >
          Shell
        </span>
        <Select
          value={shell}
          onValueChange={(v) => setShell((v as ShellChoice) ?? "auto")}
          items={shells.map((s) => ({ value: s.value, label: s.label }))}
        >
          <SelectTrigger
            aria-labelledby={`${id}-shell`}
            className={cn("w-full", !phone && "h-8")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {shells.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

function DesktopBar({
  status,
  recorded,
  current,
  onStart,
  onEnd,
  onCopy,
  onPaste,
  onClear,
  serverId,
}: {
  status: Status | undefined
  recorded: boolean
  current: Run | null
  onStart: (user: string, shell: ShellChoice) => void
  onEnd: () => void
  onCopy: () => void
  onPaste: () => void
  onClear: () => void
  serverId: string
}) {
  const [user, setUser] = useState("")
  const [shell, setShell] = useState<ShellChoice>("auto")
  const live = status?.kind === "open" || status?.kind === "reconnecting"
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex h-8 items-center gap-3">
        <StatusDot status={status} />
        {current?.user && (
          <span className="text-caption text-ash">as {current.user}</span>
        )}
        {recorded && <RecordedBadge />}
      </div>
      <div className="ms-auto flex flex-wrap items-end gap-2">
        <ShellFields
          user={user}
          setUser={setUser}
          shell={shell}
          setShell={setShell}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStart(user, shell)}
        >
          <Plus />
          New shell
        </Button>
        <span className="mx-1 h-8 w-px bg-border" />
        <IconButton label="Copy" onClick={onCopy}>
          <Copy />
        </IconButton>
        <IconButton label="Paste" onClick={onPaste}>
          <ClipboardPaste />
        </IconButton>
        <IconButton label="Clear the screen" onClick={onClear}>
          <Eraser />
        </IconButton>
        <IconButton label="End this shell" onClick={onEnd} disabled={!live}>
          <Power />
        </IconButton>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/servers/${serverId}/terminal`} />}
          nativeButton={false}
        >
          <SquareTerminal />
          Server terminal
        </Button>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

function PhoneShell({
  status,
  recorded,
  current,
  onStart,
  onEnd,
  onCopy,
  onPaste,
  onKeyboard,
  mods,
  setMods,
  send,
  serverId,
  children,
}: {
  status: Status | undefined
  recorded: boolean
  current: Run | null
  onStart: (user: string, shell: ShellChoice) => void
  onEnd: () => void
  onCopy: () => void
  onPaste: () => void
  onKeyboard: () => void
  mods: Modifiers
  setMods: (m: Modifiers) => void
  send: (data: string) => void
  serverId: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useOpen("container-shell-new")
  const [user, setUser] = useState("")
  const [shell, setShell] = useState<ShellChoice>("auto")
  const press = (data: string) => {
    const out = data.length === 1 ? withModifiers(data, mods) : data
    if (mods.ctrl || mods.alt) setMods({ ctrl: false, alt: false })
    send(out)
  }
  return (
    // Over the tab bar, under the page's app bar and section chips.
    <div className="fixed inset-x-0 top-[calc(95px+env(safe-area-inset-top))] bottom-0 z-45 flex flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border ps-4 pe-1">
        <StatusDot status={status} />
        {current?.user && (
          <span className="truncate text-caption text-ash">
            as {current.user}
          </span>
        )}
        {recorded && <RecordedBadge />}
        <span className="flex-1" />
        <PhoneIcon label="Copy" onClick={onCopy}>
          <Copy />
        </PhoneIcon>
        <PhoneIcon label="Paste" onClick={onPaste}>
          <ClipboardPaste />
        </PhoneIcon>
        <PhoneIcon label="New shell" onClick={() => setOpen(true)}>
          <Plus />
        </PhoneIcon>
      </div>
      <div className="relative min-h-0 flex-1 py-1 ps-2 pe-0.5">
        <div className="relative size-full">{children}</div>
      </div>
      <div className="flex shrink-0 [scrollbar-width:none] gap-1 overflow-x-auto overscroll-x-contain border-t border-border bg-subtle px-1.5 pt-1.5 pb-[calc(--spacing(1.5)+env(safe-area-inset-bottom))]">
        <Key aria="Show keyboard" onPress={onKeyboard}>
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
      <BottomSheet open={open} onOpenChange={setOpen} title="New shell">
        <div className="flex flex-col gap-4 px-4 pb-4">
          <p className="text-body-sm text-muted-foreground">
            Ends the current shell and opens another one in this container.
          </p>
          <ShellFields
            user={user}
            setUser={setUser}
            shell={shell}
            setShell={setShell}
            phone
          />
          <Button
            className="h-11"
            onClick={() => {
              setOpen(false)
              onStart(user, shell)
            }}
          >
            Open the shell
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              setOpen(false)
              onEnd()
            }}
          >
            End the current shell
          </Button>
          <Button
            variant="ghost"
            className="h-11"
            render={<Link href={`/servers/${serverId}/terminal`} />}
            nativeButton={false}
          >
            Server terminal
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}

function PhoneIcon({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted [&_svg]:size-5"
    >
      {children}
    </button>
  )
}
