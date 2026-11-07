"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import type { Server } from "@/lib/services"

// What this person may do with scripts in the selected workspace. The
// backend decides; this only hides what it would refuse. Running needs
// Engineer on every server in the run: the run sheet offers only those.
export function useScriptsCan() {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const ws = workspace?.id ?? ""
  const level = ws ? access.workspaceLevel(ws) : "none"
  const canRunOn = (s: Pick<Server, "id" | "workspace_id">) =>
    atLeast(access.serverLevel(s.id, s.workspace_id), "engineer")
  return {
    level,
    view: atLeast(level, "viewer"),
    edit: atLeast(level, "engineer"),
    runs: atLeast(level, "operator"),
    // Some servers may grant more than the workspace: show Run to anyone
    // who can read; the sheet then lists only the servers they may use.
    run: atLeast(level, "viewer"),
    canRunOn,
  }
}

// On one server's page: its own level decides.
export function useServerScriptsCan(
  server: Pick<Server, "id" | "workspace_id">,
) {
  const access = useAccess()
  const level = access.serverLevel(server.id, server.workspace_id)
  return {
    view: atLeast(level, "viewer"),
    runs: atLeast(level, "operator"),
    run: atLeast(level, "engineer"),
    edit: atLeast(access.workspaceLevel(server.workspace_id), "engineer"),
  }
}
