"use client"

import {
  Check,
  Copy,
  Download,
  ListChecks,
  ListFilter,
  MonitorPlay,
  Server,
  User,
  WrapText,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import { Facts } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { AnsiText, cleanTerminal, stripAnsi } from "@/components/ansi"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import { formatSize } from "@/lib/format"
import type { CommandLogEntry } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCommandEntry } from "../api"
import { RootTag, StatusMark } from "./command-list"
import {
  duration,
  exactTime,
  kindMeta,
  replayHref,
  resultText,
  statusMeta,
  whoText,
} from "./command-meta"

// A filter the details can narrow the list to.
export type Narrow = { ref: string } | { server: string } | { user: string }

// Everything logged about one command, with what it printed: a wide centred
// dialog on desktop, a full bottom sheet on phones. Drive `open` with useOpen.
export function CommandDetailsLayer({
  entry,
  open,
  onOpenChange,
  phone,
  // On a server's tab the server is already the filter.
  serverScoped,
  onNarrow,
}: {
  entry: CommandLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
  serverScoped: boolean
  onNarrow: (n: Narrow) => void
}) {
  const jobs = useJobActions()
  // The list row has no output: the entry itself is read when it opens,
  // and again while it still runs.
  const live = useCommandEntry(
    open ? (entry?.id ?? null) : null,
    entry ?? undefined,
  )
  const c = live.data ?? entry
  if (!c) return null
  const shell = c.entry === "shell"
  const title = shell ? "Terminal opened" : "Command"
  const subtitle = `${c.server_name} · ${whoText(c)} · ${timeAgo(c.started_at)}`
  const actions = actionsFor(c, serverScoped, onNarrow, jobs.show)
  const output = shell ? null : (
    <OutputSection c={c} loaded={live.isFetched} phone={phone} />
  )

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        full
        header={
          <div className="flex items-center gap-2 px-6 pt-1 pb-3">
            <StatusMark c={c} />
            <div className="min-w-0">
              <p className="text-subheading font-medium">{title}</p>
              <p className="truncate text-body-sm text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <Lead c={c} />
          {output}
          <div className="-mx-2">
            <Facts items={factsOf(c)} />
          </div>
        </div>
        {actions.length > 0 && (
          <div className="mt-2 flex flex-col border-t border-border pt-2">
            {actions.map((a) => (
              <SheetAction
                key={a.key}
                icon={a.icon}
                label={a.label}
                onClick={a.run}
              />
            ))}
          </div>
        )}
      </BottomSheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="flex max-h-[calc(100dvh-4rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <header className="flex shrink-0 items-start gap-3 border-b border-border px-6 py-4 pe-14">
          <StatusMark c={c} className="mt-2" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="flex items-center gap-2 text-body">
              {title}
              {c.as_root && <RootTag />}
            </DialogTitle>
            <DialogDescription className="mt-1 truncate text-body-sm text-muted-foreground">
              {subtitle}
            </DialogDescription>
          </div>
          <ResultPill c={c} />
        </header>
        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem] lg:overflow-hidden">
          <div className="flex min-w-0 flex-col gap-5 p-6 lg:overflow-y-auto">
            <Lead c={c} />
            {output}
          </div>
          <aside className="flex flex-col gap-5 border-border p-6 pt-0 lg:overflow-y-auto lg:border-s lg:pt-6">
            <SideFacts c={c} />
            {actions.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-caption font-medium text-ash">Show more</p>
                {actions.map((a) => (
                  <Button
                    key={a.key}
                    variant="outline"
                    className="h-9 justify-start"
                    onClick={a.run}
                  >
                    {a.icon}
                    <span className="truncate">{a.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type Action = { key: string; label: string; icon: ReactNode; run: () => void }

function actionsFor(
  c: CommandLogEntry,
  serverScoped: boolean,
  onNarrow: (n: Narrow) => void,
  showJob: (id: string) => void,
): Action[] {
  const out: Action[] = []
  if (c.ref) {
    const terminal = c.kind === "terminal"
    out.push({
      key: "ref",
      label: terminal
        ? "Everything from this terminal"
        : "Everything from this task",
      icon: <ListFilter />,
      run: () => onNarrow({ ref: c.ref ?? "" }),
    })
    if (c.kind === "job" || c.kind === "schedule")
      out.push({
        key: "job",
        label: "Show the task",
        icon: <ListChecks />,
        run: () => showJob(c.ref ?? ""),
      })
  }
  if (!serverScoped && c.server_id)
    out.push({
      key: "server",
      label: `Only ${c.server_name}`,
      icon: <Server />,
      run: () => onNarrow({ server: c.server_id ?? "" }),
    })
  if (c.user_id)
    out.push({
      key: "user",
      label: c.mine ? "Only mine" : `Only ${c.user_name}`,
      icon: <User />,
      run: () => onNarrow({ user: c.user_id ?? "" }),
    })
  return out
}

// The command itself, its notices and the way into the recording.
function Lead({ c }: { c: CommandLogEntry }) {
  const replay = replayHref(c)
  const shell = c.entry === "shell"
  return (
    <>
      {!shell && <CommandBlock c={c} />}
      {c.truncated && (
        <Callout title="Only the start was kept">
          The command was longer than 64 KiB; the rest wasn't logged.
        </Callout>
      )}
      {c.status === "failed" && c.error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-caption font-medium text-destructive">
            {resultText(c)}
          </p>
          <pre className="mt-1 max-h-40 overflow-auto font-mono text-caption break-all whitespace-pre-wrap">
            {c.error}
          </pre>
        </div>
      )}
      {replay && (
        <Button
          variant="outline"
          className="h-11 self-start md:h-9"
          render={<Link href={replay} />}
          nativeButton={false}
        >
          <MonitorPlay />
          {shell ? "Watch this terminal" : "Watch it in the recording"}
        </Button>
      )}
    </>
  )
}

function ResultPill({ c }: { c: CommandLogEntry }) {
  const tone = statusMeta[c.status]?.tone ?? "quiet"
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption font-medium",
        tone === "ok" && "bg-success/10 text-success",
        tone === "bad" && "bg-destructive/10 text-destructive",
        tone === "live" && "bg-brand-soft text-brand-strong",
        tone === "quiet" && "bg-muted text-muted-foreground",
      )}
    >
      {c.status === "failed"
        ? c.exit_code !== undefined
          ? `Exit ${c.exit_code}`
          : "Failed"
        : (statusMeta[c.status]?.label ?? c.status)}
    </span>
  )
}

function factsOf(c: CommandLogEntry) {
  const shell = c.entry === "shell"
  const facts: {
    label: string
    value: ReactNode
    wide?: boolean
    mono?: boolean
  }[] = [
    {
      label: "Server",
      value: c.server_id ? (
        <Link href={`/servers/${c.server_id}`} className="hover:text-brand">
          {c.server_name}
        </Link>
      ) : (
        <span className="text-muted-foreground">{c.server_name} (removed)</span>
      ),
    },
    {
      label: "Who",
      value: (
        <>
          {whoText(c)}
          {c.client_ip && (
            <span className="block text-caption font-normal text-ash">
              from {c.client_ip}
            </span>
          )}
        </>
      ),
    },
    { label: "Why", value: kindMeta[c.kind]?.label ?? c.kind },
    { label: "For", value: c.source || "—" },
    { label: "Started", value: exactTime(c.started_at) },
    {
      label: shell ? "Open for" : "Took",
      value:
        c.status === "running"
          ? `${statusMeta.running.label}…`
          : c.duration_ms !== undefined
            ? duration(c.duration_ms)
            : "—",
    },
    {
      label: "Result",
      value: (
        <span className={cn(c.status === "failed" && "text-destructive")}>
          {resultText(c)}
        </span>
      ),
    },
    { label: "As root", value: c.as_root ? "Yes" : "No" },
  ]
  if (c.cwd)
    facts.push({ label: "Folder", value: c.cwd, wide: true, mono: true })
  if (c.repeats > 1)
    facts.push({
      label: "Repeats",
      value: `${c.repeats} times in a row, last ${timeAgo(c.last_at)}`,
      wide: true,
    })
  if (c.note) facts.push({ label: "Note", value: c.note, wide: true })
  return facts
}

// The facts as one column, for the dialog's side.
function SideFacts({ c }: { c: CommandLogEntry }) {
  return (
    <dl className="flex flex-col gap-3 text-body-sm">
      {factsOf(c).map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-caption text-ash">{f.label}</dt>
          <dd
            className={cn(
              "mt-0.5 break-words",
              f.mono
                ? "font-mono text-caption break-all whitespace-pre-line"
                : "font-medium",
            )}
          >
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't access the clipboard")
    }
  }
  return { copied, copy }
}

function CommandBlock({ c }: { c: CommandLogEntry }) {
  const { copied, copy } = useCopy()
  return (
    <div className="relative rounded-2xl border border-border bg-subtle">
      <pre className="max-h-56 overflow-auto p-4 pe-12 font-mono text-body-sm break-all whitespace-pre-wrap">
        {c.cwd && (
          <span className="text-ash select-none">{shortCwd(c.cwd)} $ </span>
        )}
        {c.command}
      </pre>
      <button
        type="button"
        aria-label="Copy the command"
        onClick={() => copy(c.command)}
        className="absolute end-2 top-2 flex size-9 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground"
      >
        {copied ? (
          <Check className="size-4 text-success" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
    </div>
  )
}

function shortCwd(cwd: string) {
  const parts = cwd.split("/").filter(Boolean)
  return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : cwd
}

const wraps = ["off", "on"] as const

// What the command printed: stdout and stderr together, as kept.
function OutputSection({
  c,
  loaded,
  phone,
}: {
  c: CommandLogEntry
  loaded: boolean
  phone: boolean
}) {
  const [wrap, setWrap] = useStoredChoice("morcheh.audit.output.wrap", wraps)
  const { copied, copy } = useCopy()
  const out = c.output
  const text = out?.text ? cleanTerminal(out.text) : ""
  const plain = () => stripAnsi(text)

  function download() {
    const blob = new Blob([plain()], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `output-${c.server_name}-${c.id.slice(0, 8)}.txt`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  let empty: string | null = null
  if (!text) {
    if (out?.note) empty = out.note
    else if (c.status === "running")
      empty = "Still running: what it prints is shown once it ends."
    else if (!loaded) empty = "Loading…"
    else if (c.status === "interrupted")
      empty = "Cut off before it ended: its output was never seen."
    else
      empty =
        "Nothing was kept: it printed nothing, or keeping output was off when it ran."
  }

  return (
    <section aria-label="Output" className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-9 items-center gap-2">
        <h3 className="text-body-sm font-medium">Output</h3>
        {out && out.size > 0 && (
          <span className="truncate text-caption text-ash">
            {formatSize(out.size)}
            {out.truncated && " · the middle was left out"}
          </span>
        )}
        {text && (
          <div className="ms-auto flex items-center gap-1">
            <IconAction
              label={wrap === "on" ? "Don't wrap lines" : "Wrap lines"}
              pressed={wrap === "on"}
              onClick={() => setWrap(wrap === "on" ? "off" : "on")}
              phone={phone}
            >
              <WrapText />
            </IconAction>
            <IconAction
              label="Copy the output"
              onClick={() => copy(plain())}
              phone={phone}
            >
              {copied ? <Check className="text-success" /> : <Copy />}
            </IconAction>
            <IconAction label="Download" onClick={download} phone={phone}>
              <Download />
            </IconAction>
          </div>
        )}
      </div>
      {text ? (
        <div
          className={cn(
            "overflow-auto rounded-2xl bg-[var(--term-background,#1c2024)] p-4 font-mono text-[12.5px] leading-5 text-[var(--term-foreground,#e8e8ec)] [contain:inline-size]",
            wrap === "on" ? "break-all whitespace-pre-wrap" : "whitespace-pre",
            !phone && "max-h-[55vh] min-h-24",
          )}
        >
          <AnsiText text={text} />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-body-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  )
}

function IconAction({
  label,
  onClick,
  pressed,
  phone,
  children,
}: {
  label: string
  onClick: () => void
  pressed?: boolean
  phone: boolean
  children: ReactNode
}) {
  const button = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "text-ash hover:text-foreground",
        phone ? "size-11" : "size-8",
        pressed && "bg-muted text-foreground",
      )}
    >
      {children}
    </Button>
  )
  if (phone) return button
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
