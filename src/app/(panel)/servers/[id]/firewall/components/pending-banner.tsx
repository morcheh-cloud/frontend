"use client"

import { useQueryClient } from "@tanstack/react-query"
import { TimerReset } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/useNow"
import type { FirewallPending } from "@/lib/services"
import { useServerPage } from "../../components/server-page"
import { firewallKeys } from "../api"
import { useFirewallActions } from "./firewall-actions"

export function PendingBanner() {
  const { overview } = useFirewallActions()
  if (!overview.pending) return null
  return <Banner key={overview.pending.summary} pending={overview.pending} />
}

// A change that could have cut the server off stands only until the time
// runs out. Still seeing this page proves Morche can reach it.
function Banner({ pending }: { pending: FirewallPending }) {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const qc = useQueryClient()
  const [deadline] = useState(() => Date.now() + pending.seconds_left * 1000)
  const now = useNow(1000)
  const left = Math.max(0, Math.ceil((deadline - now) / 1000))

  useEffect(() => {
    if (left > 0) return
    const t = setTimeout(
      () =>
        qc.invalidateQueries({ queryKey: firewallKeys.overview(server.id) }),
      3000,
    )
    return () => clearTimeout(t)
  }, [left, qc, server.id])

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`

  return (
    <div
      role="status"
      className="z-10 flex gap-3 border-warning bg-card p-4 text-body-sm max-md:mt-4 max-md:flex-col max-md:border-y md:sticky md:top-[calc(3rem+1px+44px+8px)] md:items-center md:rounded-2xl md:border md:px-5 md:py-3 md:shadow-sm"
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <TimerReset className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <p className="font-medium">
            {left > 0
              ? `Keep this change? It undoes itself in ${clock}`
              : "Time ran out, undoing the change…"}
          </p>
          <p className="break-words text-muted-foreground">
            {pending.summary}. Morche can still reach the server. Check that
            what you use still works, then keep it.
          </p>
        </div>
      </div>
      {a.manage && left > 0 && (
        <div className="flex shrink-0 gap-2 max-md:flex-col-reverse">
          <Button
            variant="outline"
            size={phone ? "lg" : "default"}
            disabled={a.busy}
            onClick={a.undo}
          >
            Undo now
          </Button>
          <Button
            size={phone ? "lg" : "default"}
            disabled={a.busy}
            onClick={a.keep}
          >
            Keep it
          </Button>
        </div>
      )}
    </div>
  )
}
