"use client"

import {
  Copy,
  Gauge,
  Info,
  ListTree,
  OctagonX,
  Pause,
  Play,
  RotateCw,
  Search,
  Send,
  SquareX,
} from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useOpen } from "@/hooks/useOpen"
import type { Process, ProcessResult } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Field } from "../../../components/fields"
import type { Item } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useServiceAction } from "../../services/api"
import { Picker } from "../../users/components/fields"
import {
  keyOf,
  type ProcessesData,
  type Signal,
  targetOf,
  useRenice,
  useSignal,
} from "../api"
import {
  ending,
  niceLabel,
  nicePresets,
  signalMeta,
  signalOrder,
  useProcessFilters,
} from "./meta"
import { type DetailsTab, ProcessDetails } from "./process-details"

type ProcessesActions = {
  report: ProcessesData
  // Engineer and up may signal and change priority.
  manage: boolean
  // This login may signal it (root/sudo: any; a plain login: its own).
  reach: (p: Process) => boolean
  // Processes with a change on the way, by keyOf.
  busy: Set<string>
  selected: string[]
  setSelected: (keys: string[]) => void
  // Phones: rows tick instead of opening.
  selecting: boolean
  setSelecting: (on: boolean) => void
  details: (p: Process, tab?: DetailsTab) => void
  signal: (ps: Process[], sig: Signal) => void
  chooseSignal: (ps: Process[]) => void
  renice: (ps: Process[]) => void
  restartService: (p: Process) => void
}

const Ctx = createContext<ProcessesActions | null>(null)

export function useProcessesActions() {
  const ctx = useContext(Ctx)
  if (!ctx)
    throw new Error("useProcessesActions outside ProcessesActionsProvider")
  return ctx
}

const label = (p: Process) => `${p.name} (PID ${p.pid})`

function many(ps: Process[]) {
  return ps.length === 1 ? label(ps[0]) : `${ps.length} processes`
}

type Pending = { list: Process[]; sig: Signal }

export function ProcessesActionsProvider({
  report,
  children,
}: {
  report: ProcessesData
  children: ReactNode
}) {
  const { server, can } = useServerPage()
  const signalM = useSignal(server.id)
  const reniceM = useRenice(server.id)
  const service = useServiceAction(server.id)

  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string[]>([])
  const [selecting, setSelecting] = useState(false)
  const [subject, setSubject] = useState<Process | null>(null)
  const [tab, setTab] = useState<DetailsTab>("overview")
  const [pending, setPending] = useState<Pending | null>(null)
  const [targets, setTargets] = useState<Process[]>([])
  const [round, setRound] = useState(0)

  const [detailsOpen, setDetailsOpen] = useOpen("processes-details")
  const [confirmOpen, setConfirmOpen] = useOpen("processes-confirm")
  const [signalOpen, setSignalOpen] = useOpen("processes-signal")
  const [niceOpen, setNiceOpen] = useOpen("processes-nice")

  const reach = (p: Process) =>
    !p.kernel &&
    !p.morcheh &&
    (report.access !== "user" || p.user === report.login)

  const mark = (keys: string[], on: boolean) =>
    setBusy((b) => {
      const next = new Set(b)
      for (const k of keys) on ? next.add(k) : next.delete(k)
      return next
    })

  // Leaves out what can't be touched, and says so.
  function usable(ps: Process[]) {
    const out = ps.filter(reach)
    const left = ps.length - out.length
    if (left > 0 && out.length > 0) {
      toast.info(
        `Left out ${left} ${left === 1 ? "process" : "processes"} this login can't signal`,
        {
          description:
            "Kernel threads, Morcheh's own connection, and other users' processes without root.",
        },
      )
    } else if (out.length === 0) {
      toast.error(
        ps.length === 1 && ps[0].morcheh
          ? "That's Morcheh's own connection to this server"
          : "This login can't signal that",
        {
          description:
            ps.length === 1 && ps[0].morcheh
              ? "Ending it would cut Morcheh off. Close the terminal or page that uses it instead."
              : "It belongs to another user (needs root or sudo without a password), or it's a kernel thread.",
        },
      )
    }
    return out
  }

  function summarise(
    list: Process[],
    results: ProcessResult[],
    what: string,
    sig?: Signal,
  ) {
    const byPid = new Map(list.map((p) => [p.pid, p]))
    const ended = results.filter((r) => r.ok && r.ended)
    const failed = results.filter((r) => !r.ok && !r.gone)
    const gone = results.filter((r) => r.gone)
    const waits = sig && ending.includes(sig)
    const alive = waits ? results.filter((r) => r.ok && !r.ended) : []
    const done = results.filter((r) => r.ok && (!waits || r.ended))

    if (failed.length) {
      toast.error(failed[0].error ?? "It didn't work", {
        description:
          failed.length > 1
            ? `${failed.length} of ${results.length} failed. ${done.length ? `${done.length} worked.` : ""}`
            : undefined,
      })
    }
    if (alive.length) {
      const still = alive.flatMap((r) => byPid.get(r.pid) ?? [])
      toast.warning(
        still.length === 1
          ? `${label(still[0])} is still running`
          : `${still.length} processes are still running`,
        {
          description:
            "It got the signal but hasn't ended after 2 seconds. Give it a moment, or kill it.",
          action: {
            label: "Kill",
            onClick: () => signal(still, "KILL"),
          },
          duration: 10_000,
        },
      )
    }
    if (!failed.length && !alive.length) {
      const one = list.length === 1
      if (gone.length === results.length) {
        toast.info(
          one
            ? `${label(list[0])} had already ended`
            : "They had already ended",
        )
      } else if (waits) {
        toast.success(
          one ? `${label(list[0])} ended` : `${ended.length} processes ended`,
        )
      } else {
        toast.success(`${what} ${many(list)}`)
      }
    }
  }

  function send(list: Process[], sig: Signal, force: boolean) {
    const keys = list.map(keyOf)
    mark(keys, true)
    const meta = signalMeta[sig]
    const id = toast.loading(`${meta.verb} ${many(list)}…`)
    signalM
      .mutateAsync({ signal: sig, targets: list.map(targetOf), force })
      .then((results) => {
        toast.dismiss(id)
        summarise(list, results, done[sig] ?? "Signalled", sig)
        setSelected([])
        setSelecting(false)
      })
      .catch((e: Error) => toast.error(e.message, { id }))
      .finally(() => mark(keys, false))
  }

  function signal(ps: Process[], sig: Signal) {
    const list = usable(ps)
    if (!list.length) return
    if (ending.includes(sig) || list.some((p) => p.protected)) {
      setPending({ list, sig })
      setConfirmOpen(true)
      return
    }
    send(list, sig, false)
  }

  function renice(ps: Process[]) {
    const list = usable(ps)
    if (!list.length) return
    setTargets(list)
    setRound((r) => r + 1)
    setNiceOpen(true)
  }

  function applyNice(list: Process[], nice: number, force: boolean) {
    const keys = list.map(keyOf)
    mark(keys, true)
    const id = toast.loading(`Changing the priority of ${many(list)}…`)
    reniceM
      .mutateAsync({ nice, targets: list.map(targetOf), force })
      .then((results) => {
        toast.dismiss(id)
        summarise(list, results, `${niceLabel(nice)} priority for`)
        setSelected([])
        setSelecting(false)
      })
      .catch((e: Error) => toast.error(e.message, { id }))
      .finally(() => mark(keys, false))
  }

  const value: ProcessesActions = {
    report,
    manage: can("engineer"),
    reach,
    busy,
    selected,
    setSelected,
    selecting,
    setSelecting,
    details: (p, t = "overview") => {
      setSubject(p)
      setTab(t)
      setRound((r) => r + 1)
      setDetailsOpen(true)
    },
    signal,
    chooseSignal: (ps) => {
      const list = usable(ps)
      if (!list.length) return
      setTargets(list)
      setRound((r) => r + 1)
      setSignalOpen(true)
    },
    renice,
    restartService: (p) => {
      if (!p.unit) return
      const unit = p.unit
      const id = toast.loading(`Restarting ${unit}…`)
      service
        .mutateAsync({ unit, body: { action: "restart" } })
        .then(() => toast.success(`${unit} restarted`, { id }))
        .catch((e: Error) => toast.error(e.message, { id }))
    },
  }

  const protectedOnes = pending?.list.filter((p) => p.protected) ?? []

  return (
    <Ctx.Provider value={value}>
      {children}
      {subject && (
        <ProcessDetails
          key={`${keyOf(subject)}-${round}`}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          process={subject}
          tab={tab}
        />
      )}
      {pending && (
        <ConfirmSignal
          key={`confirm-${round}-${pending.sig}-${pending.list.length}`}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          pending={pending}
          protectedOnes={protectedOnes}
          onConfirm={(force) => {
            setConfirmOpen(false)
            send(pending.list, pending.sig, force)
          }}
        />
      )}
      <SignalDialog
        key={`signal-${round}`}
        open={signalOpen}
        onOpenChange={setSignalOpen}
        targets={targets}
        onSend={(sig) => {
          setSignalOpen(false)
          // Ending signals and protected processes still get confirmed.
          if (ending.includes(sig) || targets.some((p) => p.protected)) {
            window.addEventListener(
              "popstate",
              () => {
                setPending({ list: targets, sig })
                setConfirmOpen(true)
              },
              { once: true },
            )
            return
          }
          send(targets, sig, false)
        }}
      />
      <NiceDialog
        key={`nice-${round}`}
        open={niceOpen}
        onOpenChange={setNiceOpen}
        targets={targets}
        root={report.access !== "user"}
        onApply={(nice) => {
          setNiceOpen(false)
          applyNice(
            targets,
            nice,
            targets.some((p) => p.protected),
          )
        }}
      />
    </Ctx.Provider>
  )
}

const done: Partial<Record<Signal, string>> = {
  HUP: "Sent HUP to",
  STOP: "Paused",
  CONT: "Resumed",
  USR1: "Sent USR1 to",
  USR2: "Sent USR2 to",
}

// ---- Confirm ----

function ConfirmSignal({
  open,
  onOpenChange,
  pending,
  protectedOnes,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: Pending
  protectedOnes: Process[]
  onConfirm: (force: boolean) => void
}) {
  const [sure, setSure] = useState(false)
  const { list, sig } = pending
  const meta = signalMeta[sig]
  const risky = protectedOnes.length > 0
  const shown = list.slice(0, 5)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${meta.verb} ${list.length === 1 ? list[0].name : `${list.length} processes`}?`}
      confirmLabel={meta.verb}
      destructive={ending.includes(sig) || risky}
      pending={risky && !sure}
      onConfirm={() => onConfirm(risky)}
      description={
        <div className="flex flex-col gap-3">
          <p>{meta.hint}</p>
          <ul className="flex flex-col gap-1 rounded-lg bg-subtle p-3 text-caption">
            {shown.map((p) => (
              <li key={keyOf(p)} className="flex min-w-0 gap-2">
                <span className="shrink-0 font-medium text-foreground">
                  {p.name}
                </span>
                <span className="shrink-0 text-ash tabular-nums">
                  PID {p.pid}
                </span>
                <span className="truncate font-mono text-ash">{p.command}</span>
              </li>
            ))}
            {list.length > shown.length && (
              <li className="text-ash">
                and {list.length - shown.length} more
              </li>
            )}
          </ul>
          {sig === "TERM" && (
            <p>
              If it hasn't ended after 2 seconds, you can kill it from the
              message that follows.
            </p>
          )}
          {risky && (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3 text-foreground">
              <p>
                <span className="font-medium">
                  {protectedOnes.map((p) => p.name).join(", ")}
                </span>{" "}
                {protectedOnes.length === 1 ? "is" : "are"} part of the system
                (SSH, logging, init…). Touching{" "}
                {protectedOnes.length === 1 ? "it" : "them"} can cut this server
                off or bring it down.
              </p>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: the checkbox is inside */}
              <label className="flex min-h-11 items-center gap-3 md:min-h-0">
                <Checkbox
                  checked={sure}
                  onCheckedChange={(v) => setSure(!!v)}
                />
                <span className="text-body-sm">I understand, do it anyway</span>
              </label>
            </div>
          )}
        </div>
      }
    />
  )
}

function Footer({
  children,
  onCancel,
}: {
  children: ReactNode
  onCancel: () => void
}) {
  const { phone } = useServerPage()
  return (
    <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
      {children}
      <Button
        size={phone ? "lg" : "default"}
        variant={phone ? "ghost" : "outline"}
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  )
}

// ---- Send a signal ----

function SignalDialog({
  open,
  onOpenChange,
  targets,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: Process[]
  onSend: (sig: Signal) => void
}) {
  const { phone } = useServerPage()
  const [sig, setSig] = useState<Signal>("HUP")
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Send a signal to ${targets.length === 1 ? targets[0].name : `${targets.length} processes`}`}
      footer={
        <Footer onCancel={() => onOpenChange(false)}>
          <Button
            size={phone ? "lg" : "default"}
            variant={ending.includes(sig) ? "destructive" : "default"}
            onClick={() => onSend(sig)}
          >
            Send {sig}
          </Button>
        </Footer>
      }
    >
      <Field label="Signal" hint={signalMeta[sig].hint}>
        {(props) => (
          <Picker
            {...props}
            items={signalOrder.map((s) => ({
              value: s,
              label: signalMeta[s].label,
            }))}
            value={sig}
            onChange={(v) => setSig(v as Signal)}
          />
        )}
      </Field>
    </ResponsiveDialog>
  )
}

// ---- Priority ----

function NiceDialog({
  open,
  onOpenChange,
  targets,
  root,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: Process[]
  root: boolean
  onApply: (nice: number) => void
}) {
  const { phone } = useServerPage()
  const current = targets.length === 1 ? targets[0].nice : null
  const [text, setText] = useState(String(current ?? 10))
  const n = Number(text)
  const valid = text.trim() !== "" && Number.isInteger(n) && n >= -20 && n <= 19
  const raising = valid && targets.some((p) => n < p.nice)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Priority of ${targets.length === 1 ? targets[0].name : `${targets.length} processes`}`}
      description="How readily it gets the CPU when the server is busy. It changes nothing while the CPU has room to spare."
      footer={
        <Footer onCancel={() => onOpenChange(false)}>
          <Button
            size={phone ? "lg" : "default"}
            disabled={!valid || (raising && !root) || n === current}
            onClick={() => onApply(n)}
          >
            Set priority
          </Button>
        </Footer>
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset aria-label="Priority presets" className="grid gap-2">
          {nicePresets.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={n === p.value}
              onClick={() => setText(String(p.value))}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2 text-start outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50",
                n === p.value &&
                  "border-brand bg-brand-soft hover:bg-brand-soft",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium">
                  {p.label}
                  {current === p.value && (
                    <span className="font-normal text-ash"> · now</span>
                  )}
                </span>
                <span className="block text-caption text-muted-foreground">
                  {p.hint}
                </span>
              </span>
              <span className="shrink-0 font-mono text-caption text-ash">
                {p.value > 0 ? `+${p.value}` : p.value}
              </span>
            </button>
          ))}
        </fieldset>
        <Field
          label="Or a nice value"
          hint={
            raising && !root
              ? "Raising a priority needs root or sudo without a password."
              : current !== null
                ? `-20 is the highest, 19 the lowest. Now ${current}.`
                : "-20 is the highest, 19 the lowest."
          }
          error={!valid ? "A whole number from -20 to 19" : undefined}
        >
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="md:w-32"
            />
          )}
        </Field>
      </div>
    </ResponsiveDialog>
  )
}

// ---- Menu ----

// Every action on one process, in groups; shared by the row menus and the
// phone sheet.
export function useProcessMenu(p: Process): Item[][] {
  const a = useProcessesActions()
  const { can } = useServerPage()
  const { setFilters } = useProcessFilters()
  const reach = a.reach(p)
  const off = !reach || a.busy.has(keyOf(p))
  const info: Item[] = can("operator")
    ? [
        {
          key: "details",
          label: "Details",
          icon: <Info />,
          disabled: p.kernel,
          onSelect: () => a.details(p),
        },
      ]
    : []
  const change: Item[] = a.manage
    ? [
        {
          key: "term",
          label: "Terminate",
          icon: <SquareX />,
          disabled: off || p.state === "zombie",
          onSelect: () => a.signal([p], "TERM"),
        },
        {
          key: "kill",
          label: "Kill",
          icon: <OctagonX />,
          destructive: true,
          disabled: off || p.state === "zombie",
          onSelect: () => a.signal([p], "KILL"),
        },
        p.state === "stopped"
          ? {
              key: "cont",
              label: "Resume",
              icon: <Play />,
              disabled: off,
              onSelect: () => a.signal([p], "CONT"),
            }
          : {
              key: "stop",
              label: "Pause",
              icon: <Pause />,
              disabled: off || p.state === "zombie",
              onSelect: () => a.signal([p], "STOP"),
            },
        {
          key: "signal",
          label: "Send a signal…",
          icon: <Send />,
          disabled: off,
          onSelect: () => a.chooseSignal([p]),
        },
        {
          key: "nice",
          label: "Change priority…",
          icon: <Gauge />,
          disabled: off,
          onSelect: () => a.renice([p]),
        },
      ]
    : []
  const service: Item[] =
    p.unit && a.manage
      ? [
          {
            key: "restart",
            label: `Restart ${p.unit.replace(/\.service$/, "")}`,
            icon: <RotateCw />,
            disabled: a.report.access === "user",
            onSelect: () => a.restartService(p),
          },
        ]
      : []
  const find: Item[] = [
    {
      key: "tree",
      label: "Show in the tree",
      icon: <ListTree />,
      onSelect: () =>
        setFilters({ view: "tree", q: String(p.pid), show: null }),
    },
    {
      key: "same",
      label: `Every ${p.name}`,
      icon: <Search />,
      onSelect: () => setFilters({ q: p.name, view: null }),
    },
  ]
  const copy: Item[] = [
    {
      key: "copy-pid",
      label: "Copy PID",
      icon: <Copy />,
      onSelect: () => copyText(String(p.pid), "PID copied"),
    },
    ...(p.command
      ? [
          {
            key: "copy-cmd",
            label: "Copy command",
            icon: <Copy />,
            onSelect: () => copyText(p.command, "Command copied"),
          },
        ]
      : []),
  ]
  return [info, change, service, find, copy]
}

export function copyText(text: string, done: string) {
  if (!navigator.clipboard) {
    toast.error("Couldn't copy: the browser allows it only over https")
    return
  }
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(done))
    .catch(() => toast.error("Couldn't copy: the browser refused"))
}
