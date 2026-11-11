"use client"

import { Clock3, LogOut } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { PanelSession } from "@/lib/services"
import { cn } from "@/lib/utils"
import { deviceIcon, deviceName, isActive } from "./meta"

const exact = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})
const exactTime = (iso: string) => exact.format(new Date(iso))

// The open sessions of one account, newest activity first, each with End.
// `whose` names the account in the confirm text ("your" or a person's name).
export function SessionList({
  id,
  items,
  loading,
  error,
  whose,
  onEnd,
}: {
  id: string
  items: PanelSession[] | undefined
  loading: boolean
  error: Error | null
  whose?: string
  onEnd: (s: PanelSession) => Promise<unknown>
}) {
  const [open, setOpen] = useOpen(`end-session-${id}`)
  const [target, setTarget] = useState<PanelSession | null>(null)
  const [pending, setPending] = useState(false)

  if (loading)
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    )
  if (error)
    return (
      <p className="text-body-sm text-destructive">
        Couldn't load the sessions: {error.message}
      </p>
    )
  if (!items?.length)
    return (
      <p className="text-body-sm text-muted-foreground">
        Not signed in anywhere right now.
      </p>
    )

  const sorted = [...items].sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      b.last_seen_at.localeCompare(a.last_seen_at),
  )

  const end = async () => {
    if (!target) return
    setPending(true)
    try {
      await onEnd(target)
      toast.success(`Signed out ${deviceName(target)}`)
      setOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <ul className="-mx-4 divide-y divide-border border-y border-border md:mx-0 md:rounded-xl md:border">
        {sorted.map((s) => (
          <SessionRow
            key={s.id}
            s={s}
            onEnd={() => {
              setTarget(s)
              setOpen(true)
            }}
          />
        ))}
      </ul>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Sign out ${target ? deviceName(target) : "this device"}?`}
        description={
          target && (
            <>
              {whose ? `${whose}'s` : "That"} session from {target.ip} ends now;
              the next request from it goes to the sign-in page. Open terminals
              from {whose ? "that account" : "your account"} close too.
            </>
          )
        }
        confirmLabel="Sign out"
        pending={pending}
        onConfirm={end}
      />
    </>
  )
}

function SessionRow({ s, onEnd }: { s: PanelSession; onEnd: () => void }) {
  const Icon = deviceIcon[s.device_kind] ?? deviceIcon.other
  const active = s.current || isActive(s.last_seen_at)
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-3">
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
        {active && (
          <span
            aria-hidden
            className="absolute -end-0.5 -bottom-0.5 size-3 rounded-full border-2 border-background bg-success"
          />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-medium" title={s.user_agent}>
            {deviceName(s)}
          </span>
          {s.current && (
            <span className="inline-flex h-5 items-center rounded-full bg-brand-soft px-2 text-caption text-brand-strong">
              This device
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground">
          <span className="font-mono tabular-nums">{s.ip}</span>
          <span aria-hidden>·</span>
          <span title={exactTime(s.created_at)}>
            Signed in {timeAgo(s.created_at).toLowerCase()}
          </span>
          <span aria-hidden>·</span>
          <span
            title={exactTime(s.last_seen_at)}
            className={cn(active && "text-success")}
          >
            {active ? "Active now" : `Seen ${timeAgo(s.last_seen_at)}`}
          </span>
        </span>
        <span
          className="flex items-center gap-1 text-caption text-ash"
          title={exactTime(s.expires_at)}
        >
          <Clock3 className="size-3" />
          {s.remember ? "Remembered" : "Until the browser closes"} · ends{" "}
          {timeAgo(s.expires_at)}
        </span>
      </div>
      {!s.current && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-md:h-11"
          onClick={onEnd}
        >
          <LogOut />
          <span className="max-sm:sr-only">Sign out</span>
        </Button>
      )}
    </li>
  )
}
