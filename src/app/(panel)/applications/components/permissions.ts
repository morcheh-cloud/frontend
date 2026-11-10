"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"

type ServerRef = { server_id: string; workspace_id: string }

// What this person may do with applications. The backend decides; this only
// hides what it would refuse. Install, update and roll back need Engineer on
// every server, uninstall needs Owner: the sheets offer only those servers.
export function useSoftwareCan(workspaceId?: string) {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const ws = workspaceId ?? workspace?.id ?? ""
  const level = ws ? access.workspaceLevel(ws) : "none"
  const on = (s: ServerRef) => access.serverLevel(s.server_id, s.workspace_id)
  return {
    level,
    view: atLeast(level, "viewer"),
    // Custom recipes are the workspace's.
    recipes: atLeast(level, "engineer"),
    // The activity list is the workspace's runs.
    runs: atLeast(level, "operator"),
    // Some servers may grant more than the workspace: show Install to
    // anyone who can read; the sheet lists the servers they may use.
    install: atLeast(level, "viewer"),
    installOn: (s: ServerRef) => atLeast(on(s), "engineer"),
    updateOn: (s: ServerRef) => atLeast(on(s), "engineer"),
    uninstallOn: (s: ServerRef) => atLeast(on(s), "owner"),
    operate: (s: ServerRef) => atLeast(on(s), "operator"),
    compose: (s: ServerRef) => atLeast(on(s), "engineer"),
    reveal: (s: ServerRef) => atLeast(on(s), "owner"),
    forget: (s: ServerRef) => atLeast(on(s), "engineer"),
    scan: (s: ServerRef) => atLeast(on(s), "operator"),
  }
}

export type SoftwareCan = ReturnType<typeof useSoftwareCan>
