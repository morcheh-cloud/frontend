"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import type { Server } from "@/lib/services"

// What this person may do on a server, to hide what the backend would refuse.
export function useServerCan() {
  const { serverLevel } = useAccess()
  return (server: Server, min: Level) =>
    atLeast(serverLevel(server.id, server.workspace_id), min)
}

// New servers and folders land in the selected workspace.
export function useWorkspaceCan() {
  const { canCreateIn, workspaceLevel } = useAccess()
  const { workspace } = useWorkspace()
  return {
    addServer: canCreateIn(workspace?.id),
    folders: !!workspace && atLeast(workspaceLevel(workspace.id), "owner"),
  }
}
