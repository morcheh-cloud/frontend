"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import type { Database } from "@/lib/services"

// A database has no grants of its own: it follows its server when it's
// reached through one, its workspace otherwise (the higher of the two).
// Viewer: the dashboard. Operator: check now, favorite. Engineer: query
// text, stop sessions, EXPLAIN, pause, limits. Owner: edit, remove, password.
export function useDatabaseCan() {
  const { serverLevel, workspaceLevel } = useAccess()
  return (
    d: Pick<Database, "server_id" | "workspace_id">,
    min: Level,
  ): boolean =>
    atLeast(
      d.server_id
        ? serverLevel(d.server_id, d.workspace_id)
        : workspaceLevel(d.workspace_id),
      min,
    )
}

// Adding one: through a server needs Engineer on it; a direct address needs
// Engineer on the selected workspace and the right to add there.
export function useCanAddDatabase() {
  const { admin, canCreateIn, highest, serverLevel, workspaceLevel } =
    useAccess()
  const { workspace } = useWorkspace()
  const direct =
    !!workspace &&
    canCreateIn(workspace.id) &&
    atLeast(workspaceLevel(workspace.id), "engineer")
  return {
    any: admin || highest("engineer"),
    direct,
    viaServer: (id: string, workspaceId?: string) =>
      atLeast(serverLevel(id, workspaceId), "engineer"),
    allowInternal: admin,
  }
}
