"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import type { DNSServer } from "@/lib/services"

// DNS servers follow the workspace's level: Viewer reads, Operator checks
// and resyncs, Engineer changes zones and records, Owner edits or removes the
// connection. The backend enforces it; this only hides what it would refuse.
export function useDnsCan() {
  const { workspaceLevel } = useAccess()
  return (server: Pick<DNSServer, "workspace_id">, min: Level) =>
    atLeast(workspaceLevel(server.workspace_id), min)
}

// Adding a server takes Engineer on the selected workspace.
export function useCanAddDns() {
  const { workspaceLevel } = useAccess()
  const { workspace } = useWorkspace()
  return !!workspace && atLeast(workspaceLevel(workspace.id), "engineer")
}
