"use client"

import {
  CircleHelp,
  Power,
  PowerOff,
  RotateCcw,
  TimerOff,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useOpen } from "@/hooks/useOpen"
import { formatDuration } from "@/lib/format"
import type { PowerOverview } from "@/lib/services"
import { useServerPage } from "../server-page"
import { type PowerAction, useCancelPower, usePower, usePowerWait } from "./api"
import { actionMeta, clock } from "./meta"
import { PowerDialog } from "./power-dialog"

type PowerCtx = {
  overview: PowerOverview | undefined
  loading: boolean
  // Why Reboot / Shut down are off, if they are.
  blocked: string | null
  ask: (action: PowerAction) => void
  cancelSchedule: () => void
}

const Ctx = createContext<PowerCtx | null>(null)

export function usePowerActions() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("usePowerActions needs a PowerProvider")
  return ctx
}

// Reboot and shutdown for the server header (desktop) and the app bar's
// sheet (phone): the power state, the dialog and cancelling a schedule.
export function PowerProvider({ children }: { children: ReactNode }) {
  const { server } = useServerPage()
  const online = server.status === "online"
  const query = usePower(server.id, online)
  const { wait } = usePowerWait(server.id)
  const cancel = useCancelPower(server.id)
  const [open, setOpen] = useOpen("power-action")
  const [action, setAction] = useState<PowerAction>("reboot")
  // A fresh form every time the dialog opens.
  const [round, setRound] = useState(0)
  const o = query.data

  const blocked =
    wait?.state === "waiting"
      ? `${actionMeta[wait.action].sent}…`
      : !online
        ? "The server isn't reachable"
        : !o
          ? query.error
            ? "Couldn't read the power state"
            : "Loading…"
          : o.access === "user"
            ? "Needs root, or sudo for this login"
            : null

  const value: PowerCtx = {
    overview: o,
    loading: query.isLoading,
    blocked,
    ask: (a) => {
      setAction(a)
      setRound((r) => r + 1)
      setOpen(true)
    },
    cancelSchedule: () =>
      cancel.mutate(undefined, {
        onSuccess: () => toast("Cancelled"),
        onError: (err) => toast.error(err.message),
      }),
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {o && (
        <PowerDialog
          key={round}
          open={open}
          onOpenChange={setOpen}
          action={action}
          overview={o}
        />
      )}
    </Ctx.Provider>
  )
}

// Desktop header: the power icon and its menu. A dot flags a pending reboot
// (needed or scheduled).
export function PowerMenu() {
  const { overview: o, blocked, ask, cancelSchedule } = usePowerActions()
  const flagged = !!o && (o.reboot_required || !!o.scheduled)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Power"
                  className="relative"
                />
              }
            />
          }
        >
          <Power />
          {flagged && (
            <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-warning ring-2 ring-background" />
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">Power</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="w-0 min-w-full text-caption whitespace-normal">
            {o ? <Status o={o} /> : blocked}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {o?.reboot_required && (
          <div className="flex w-0 min-w-full gap-2 px-2 pb-1.5 text-caption">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" />
            <p>
              <span className="text-warning">Reboot needed</span>
              {o.reboot_reasons.length > 0 && (
                <span className="block text-muted-foreground">
                  {o.reboot_reasons.join(". ")}
                </span>
              )}
            </p>
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!!blocked} onClick={() => ask("reboot")}>
          <RotateCcw />
          Reboot…
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={!!blocked}
          onClick={() => ask("poweroff")}
        >
          <PowerOff />
          Shut down…
        </DropdownMenuItem>
        {o?.scheduled && o.access !== "user" && (
          <DropdownMenuItem onClick={cancelSchedule}>
            <TimerOff />
            Cancel {scheduledLabel(o.scheduled)}
          </DropdownMenuItem>
        )}
        {o && blocked && o.access === "user" && (
          <p className="w-0 min-w-full px-2 py-1.5 text-caption text-muted-foreground">
            {blocked}
          </p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/help/power" />}>
          <CircleHelp />
          Reboot & shutdown guide
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Phone: rows for the app bar's sheet.
export function usePowerItems() {
  const { overview: o, blocked, ask, cancelSchedule } = usePowerActions()
  return [
    {
      key: "reboot",
      icon: <RotateCcw />,
      label: "Reboot…",
      description:
        blocked ??
        (o?.reboot_required ? "Needed after updates" : "Restart and come back"),
      disabled: !!blocked,
      onSelect: () => ask("reboot"),
    },
    {
      key: "poweroff",
      icon: <PowerOff />,
      label: "Shut down…",
      description: blocked ? undefined : "Power off and stay off",
      destructive: true,
      disabled: !!blocked,
      onSelect: () => ask("poweroff"),
    },
    ...(o?.scheduled && o.access !== "user"
      ? [
          {
            key: "cancel-power",
            icon: <TimerOff />,
            label: `Cancel ${scheduledLabel(o.scheduled)}`,
            onSelect: cancelSchedule,
          },
        ]
      : []),
  ]
}

function scheduledLabel(s: NonNullable<PowerOverview["scheduled"]>) {
  const reboot = s.action === "reboot" || s.action === "kexec"
  return `${reboot ? "reboot" : "shutdown"} at ${clock(s.at)}`
}

function Status({ o }: { o: PowerOverview }) {
  return (
    <>
      Up {formatDuration(o.uptime_seconds)}
      {o.sessions > 0 &&
        ` · ${o.sessions} ${o.sessions === 1 ? "session" : "sessions"} open`}
    </>
  )
}
