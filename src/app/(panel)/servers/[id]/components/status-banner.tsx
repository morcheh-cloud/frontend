"use client"

import { KeyRound, LogIn, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { statusMeta } from "../../components/meta"
import { useServerActions } from "../../components/server-actions"
import { useServerPage } from "./server-page"

// A failed last check affects every section (none can reach the server), so
// it's shown above all of them, with the one action that fixes it.
export function StatusBanner({ className }: { className?: string }) {
  const { server, checking, can } = useServerPage()
  const actions = useServerActions()
  const { status } = server
  if (status === "online" || status === "unknown") return null

  const fix =
    status === "needs_login"
      ? {
          title: server.morche_host
            ? "Sign in once to manage the machine Morche runs on"
            : "Waiting for you to sign in",
          label: "Sign in…",
          min: "owner" as const,
          run: () => actions.signIn(server),
        }
      : status === "host_key_mismatch"
        ? {
            title: "The host key changed since it was trusted",
            label: "Review key…",
            min: "owner" as const,
            run: () => actions.trustHostKey(server),
          }
        : status === "auth_failed"
          ? {
              title: "Morche couldn't log in with the saved credentials",
              label: "Edit credentials",
              min: "owner" as const,
              run: () => actions.editServer(server),
            }
          : {
              title: `${statusMeta[status].label} on the last check`,
              label: checking ? "Checking…" : "Check again",
              min: "operator" as const,
              run: () => actions.check(server),
            }
  const Icon =
    status === "host_key_mismatch"
      ? KeyRound
      : status === "needs_login"
        ? LogIn
        : TriangleAlert
  const tone =
    status === "needs_login"
      ? { box: "border-brand/25 bg-brand-soft", icon: "text-brand" }
      : status === "auth_failed"
        ? { box: "border-warning/25 bg-warning/5", icon: "text-warning" }
        : {
            box: "border-destructive/20 bg-destructive/5",
            icon: "text-destructive",
          }

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y p-4 md:items-center md:rounded-2xl md:border md:px-5 md:py-3",
        tone.box,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0 md:mt-0", tone.icon)} />
      <div className="min-w-0 flex-1 text-body-sm">
        <p className="font-medium">{fix.title}</p>
        {status === "needs_login" ? (
          <p className="text-muted-foreground">
            Sign in with a password or key, or run one command on it. Then every
            section works here.
          </p>
        ) : (
          server.status_message && (
            <p className="text-muted-foreground">{server.status_message}</p>
          )
        )}
      </div>
      {can(fix.min) && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-md:h-9"
          disabled={checking}
          onClick={fix.run}
        >
          {fix.label}
        </Button>
      )}
    </div>
  )
}
