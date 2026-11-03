"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import type { App } from "@/lib/services"

// What this person may do on a service, to hide what the backend would refuse.
export function useAppCan(app: App) {
  const { appLevel } = useAccess()
  const level = appLevel(app.id, app.workspace_id)
  return {
    reveal: atLeast(level, "operator"),
    edit: atLeast(level, "engineer"),
    remove: atLeast(level, "owner"),
    manage: atLeast(level, "owner"),
    activity: atLeast(level, "owner"),
  }
}

// Categories and the order are shared by the whole workspace, so changing
// them takes Engineer on the workspace itself.
export function useAppLayoutCan() {
  const { workspaceLevel } = useAccess()
  const { workspace } = useWorkspace()
  return !!workspace && atLeast(workspaceLevel(workspace.id), "engineer")
}
