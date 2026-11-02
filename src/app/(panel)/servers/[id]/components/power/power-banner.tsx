"use client"

import { CircleCheck, LoaderCircle, Power, TriangleAlert } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/utils"
import { Notices } from "../parts"
import { useServerPage } from "../server-page"
import { usePowerWait, type Wait } from "./api"
import { actionMeta, clock, countdown, took } from "./meta"
import { usePowerActions } from "./power"

// Above every section of the server: a pending scheduled reboot or shutdown
// (with Cancel), and the progress of one that's under way.
export function PowerBanner({ className }: { className?: string }) {
  const { server, can } = useServerPage()
  const { overview: o, cancelSchedule } = usePowerActions()
  const { wait, start } = usePowerWait(server.id)

  // A scheduled action that comes due while the page is open: follow it.
  const sched = o?.scheduled
  const now = useNow(1_000, !!sched && !wait)
  const due = !!sched && !wait && now >= Date.parse(sched.at)
  const bootTime = o?.boot_time
  useEffect(() => {
    if (!due || !sched || !bootTime) return
    start(
      sched.action === "reboot" || sched.action === "kexec"
        ? "reboot"
        : "poweroff",
      bootTime,
    )
  }, [due, sched, start, bootTime])

  if (wait) return <WaitPanel className={className} />
  if (!o?.scheduled || due) return null
  const s = o.scheduled
  const reboot = s.action === "reboot" || s.action === "kexec"
  return (
    <div className={className}>
      <Notices
        notes={[
          {
            key: "scheduled",
            title: `${reboot ? "Reboot" : "Shutdown"} scheduled for ${clock(s.at)} (${countdown(Date.parse(s.at) - now)})`,
            body: s.message ? `Message: “${s.message}”` : undefined,
            warn: true,
            action: can("operator") && o.access !== "user" && (
              <Button variant="outline" size="sm" onClick={cancelSchedule}>
                Cancel it
              </Button>
            ),
          },
        ]}
      />
    </div>
  )
}

// Follows the server after a reboot or shutdown until it's back or off.
function WaitPanel({ className }: { className?: string }) {
  const { server, phone } = useServerPage()
  const { wait, keepWaiting, clear } = usePowerWait(server.id)
  const now = useNow(1_000, wait?.state === "waiting")
  if (!wait) return null
  const elapsed = (wait.ended ?? now) - wait.started
  const view = waitView(wait, server.name, elapsed)

  return (
    <section
      aria-live="polite"
      className={cn(
        "flex gap-4 border-border p-4 max-md:border-b md:items-center md:rounded-2xl md:border md:p-5",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg",
          view.tone === "success" && "bg-muted text-success",
          view.tone === "warning" && "bg-muted text-warning",
          view.tone === "busy" && "bg-brand-soft text-brand-strong",
          view.tone === "muted" && "bg-muted text-ash",
        )}
      >
        {view.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium">{view.title}</p>
        <p className="text-body-sm text-muted-foreground">{view.body}</p>
        {wait.state === "waiting" && <Steps wait={wait} />}
        {phone && (
          <div className="mt-3 flex gap-2">
            {view.actions(clear, keepWaiting)}
          </div>
        )}
      </div>
      {!phone && (
        <div className="flex shrink-0 gap-2">
          {view.actions(clear, keepWaiting)}
        </div>
      )}
    </section>
  )
}

function Steps({ wait }: { wait: Wait }) {
  const reboot = wait.action === "reboot"
  const steps = [
    { label: `${actionMeta[wait.action].noun} sent`, done: true },
    { label: "Going down", done: wait.sawDown },
    ...(reboot ? [{ label: "Back online", done: false }] : []),
  ]
  const current = steps.findIndex((s) => !s.done)
  return (
    <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption">
      {steps.map((s, i) => (
        <li
          key={s.label}
          className={cn(
            "flex items-center gap-1.5",
            s.done ? "text-foreground" : "text-ash",
          )}
        >
          {s.done ? (
            <CircleCheck className="size-3.5 text-success" />
          ) : i === current ? (
            <LoaderCircle className="size-3.5 animate-spin text-brand" />
          ) : (
            <span className="size-3.5 rounded-full border border-mist" />
          )}
          {s.label}
        </li>
      ))}
    </ol>
  )
}

function waitView(wait: Wait, name: string, elapsed: number) {
  const dismiss = (clear: () => void) => (
    <Button variant="outline" onClick={clear}>
      Dismiss
    </Button>
  )
  switch (wait.state) {
    case "back":
      return {
        tone: "success" as const,
        icon: <CircleCheck className="size-5" />,
        title: `${name} is back`,
        body: `Rebooted and answering again after ${took(elapsed)}.`,
        actions: dismiss,
      }
    case "off":
      return {
        tone: "muted" as const,
        icon: <Power className="size-5" />,
        title: `${name} is off`,
        body: "It stopped answering. Turn it back on from your provider's console or with its power button.",
        actions: dismiss,
      }
    case "timeout":
      return {
        tone: "warning" as const,
        icon: <TriangleAlert className="size-5" />,
        title: `${name} hasn't come back`,
        body: "No answer for 10 minutes. It may be stuck at boot (a disk check, a broken fstab entry) or need its provider's console.",
        actions: (clear: () => void, keep: () => void) => (
          <>
            <Button onClick={keep}>Keep waiting</Button>
            <Button variant="outline" onClick={clear}>
              Stop
            </Button>
          </>
        ),
      }
    default:
      return {
        tone: "busy" as const,
        icon: <LoaderCircle className="size-5 animate-spin" />,
        title:
          wait.action === "reboot"
            ? `Rebooting ${name}…`
            : `Shutting down ${name}…`,
        body: `${took(elapsed)} so far. Checking every few seconds.`,
        actions: (clear: () => void) => (
          <Button variant="outline" onClick={clear}>
            Stop waiting
          </Button>
        ),
      }
  }
}
