"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { Database, DatabaseActivity } from "@/lib/services"
import { useKillSession, useUpdateMonitoring } from "../../api"
import { ExplainDialog, type ExplainTarget } from "./explain"
import { MonitoringDialog } from "./monitoring"

type Kill = { session: DatabaseActivity; connection: boolean }

type Actions = {
  explain: (target?: ExplainTarget) => void
  // connection=false stops the statement, true closes the whole connection.
  kill: (session: DatabaseActivity, connection: boolean) => void
  monitoring: (focus?: string) => void
  mute: (checkId: string, on: boolean) => void
  copy: (text: string, what: string) => void
}

const Context = createContext<Actions | null>(null)

export function useDashboardActions() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error("useDashboardActions outside its provider")
  return ctx
}

const closeConnection = {
  connection: "Close connection",
  effect:
    "The client loses its connection; an open transaction is rolled back.",
  done: "Connection closed",
}

// What each engine can stop: PostgreSQL and MySQL tell a statement from its
// connection; SQL Server, Redis and MongoDB only have the one.
export function killKinds(engine: Database["engine"]) {
  switch (engine) {
    case "postgres":
    case "mysql":
      return { statement: true, ...closeConnection }
    case "mongodb":
      return {
        statement: false,
        connection: "Stop operation",
        effect: "The operation stops; the client stays connected.",
        done: "Operation stopped",
      }
    default:
      return { statement: false, ...closeConnection }
  }
}

const empty: ExplainTarget = { query: "" }

// Every layer of one database's dashboard.
export function DashboardActionsProvider({
  database: d,
  children,
}: {
  database: Database
  children: ReactNode
}) {
  const [explainOpen, setExplainOpen] = useOpen("database-explain")
  const [target, setTarget] = useState<ExplainTarget>(empty)
  const [killOpen, setKillOpen] = useOpen("database-kill")
  const [kill, setKill] = useState<Kill | null>(null)
  const [limitsOpen, setLimitsOpen] = useOpen("database-monitoring")
  const [focus, setFocus] = useState<string>()
  const killSession = useKillSession(d.id)
  const update = useUpdateMonitoring()

  const actions: Actions = {
    explain: (t = empty) => {
      setTarget(t)
      setExplainOpen(true)
    },
    kill: (session, connection) => {
      setKill({ session, connection })
      setKillOpen(true)
    },
    monitoring: (f) => {
      setFocus(f)
      setLimitsOpen(true)
    },
    mute: (checkId, on) => {
      const muted = new Set(d.muted_checks)
      if (on) muted.add(checkId)
      else muted.delete(checkId)
      update.mutate(
        {
          id: d.id,
          body: {
            alerts_enabled: d.alerts_enabled,
            muted_checks: [...muted],
            thresholds: d.thresholds,
          },
        },
        {
          onSuccess: () => toast.success(on ? "Check muted" : "Check unmuted"),
          onError: (e) => toast.error(e.message),
        },
      )
    },
    copy: (text, what) =>
      navigator.clipboard.writeText(text).then(
        () => toast.success(`${what} copied`),
        () => toast.error("Couldn't copy"),
      ),
  }

  const kinds = killKinds(d.engine)
  const s = kill?.session
  const who = s ? [s.user, s.client].filter(Boolean).join(" from ") : ""
  const closing = kill?.connection ?? false

  return (
    <Context value={actions}>
      {children}
      <ExplainDialog
        database={d}
        target={target}
        open={explainOpen}
        onOpenChange={setExplainOpen}
      />
      <MonitoringDialog
        database={d}
        focus={focus}
        open={limitsOpen}
        onOpenChange={setLimitsOpen}
      />
      <ConfirmDialog
        open={killOpen}
        onOpenChange={setKillOpen}
        title={
          closing
            ? `${kinds.connection} ${s?.id ?? ""}?`
            : `Cancel the statement of ${s?.id ?? ""}?`
        }
        description={
          <>
            {closing
              ? kinds.effect
              : "Only the running statement stops; the client stays connected."}
            {who && <span className="mt-2 block">Session: {who}</span>}
            {s?.query && (
              <span className="mt-2 line-clamp-3 block font-mono text-caption break-all">
                {s.query}
              </span>
            )}
          </>
        }
        confirmLabel={closing ? kinds.connection : "Cancel statement"}
        pending={killSession.isPending}
        onConfirm={() => {
          if (!kill) return
          killSession.mutate(
            { session: kill.session.id, connection: kill.connection },
            {
              onSuccess: () => {
                toast.success(
                  kill.connection ? kinds.done : "Statement canceled",
                )
                setKillOpen(false)
              },
              onError: (e) => toast.error(e.message),
            },
          )
        }}
      />
    </Context>
  )
}
