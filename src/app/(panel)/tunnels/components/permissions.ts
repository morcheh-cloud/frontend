"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import { useDemo } from "@/components/demo/demo"
import { useWorkspace } from "@/components/panel/workspace"
import type { Tunnel } from "@/lib/services"

// Tunnels follow the workspace's level: Viewer sees them, Operator connects,
// disconnects and reads the log (and picks one for a server), Owner sets
// them up, changes or removes them. The demo can't touch them. The backend
// enforces it; this only hides what it would refuse.
export function useTunnelCan() {
  const { workspaceLevel } = useAccess()
  const demo = useDemo()
  return (t: Pick<Tunnel, "workspace_id">, min: Level) =>
    !demo && atLeast(workspaceLevel(t.workspace_id), min)
}

export function useCanAddTunnel() {
  const { workspaceLevel } = useAccess()
  const { workspace } = useWorkspace()
  const demo = useDemo()
  return !demo && !!workspace && atLeast(workspaceLevel(workspace.id), "owner")
}
