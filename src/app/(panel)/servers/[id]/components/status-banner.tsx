"use client"

import { KeyRound, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { statusMeta } from "../../components/meta"
import { useServerActions } from "../../components/server-actions"
import { useServerPage } from "./server-page"

// A failed last check affects every section (none can reach the server), so
// it's shown above all of them, with the one action that fixes it.
export function StatusBanner({ className }: { className?: string }) {
  const { server, checking } = useServerPage()
  const actions = useServerActions()
  const { status } = server
  if (status === "online" || status === "unknown") return null

  const fix =
    status === "host_key_mismatch"
      ? {
          title: "The host key changed since it was trusted",
          label: "Review key…",
          run: () => actions.trustHostKey(server),
        }
      : status === "auth_failed"
        ? {
            title: "Morcheh couldn't log in with the saved credentials",
            label: "Edit credentials",
            run: () => actions.editServer(server),
          }
        : {
            title: `${statusMeta[status].label} on the last check`,
            label: checking ? "Checking…" : "Check again",
            run: () => actions.check(server),
          }
  const Icon = status === "host_key_mismatch" ? KeyRound : TriangleAlert

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y p-4 md:items-center md:rounded-2xl md:border md:px-5 md:py-3",
        status === "auth_failed"
          ? "border-warning/25 bg-warning/5"
          : "border-destructive/20 bg-destructive/5",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0 md:mt-0",
          status === "auth_failed" ? "text-warning" : "text-destructive",
        )}
      />
      <div className="min-w-0 flex-1 text-body-sm">
        <p className="font-medium">{fix.title}</p>
        {server.status_message && (
          <p className="text-muted-foreground">{server.status_message}</p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 max-md:h-9"
        disabled={checking}
        onClick={fix.run}
      >
        {fix.label}
      </Button>
    </div>
  )
}
