"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"

// What this person may do with cron jobs in a workspace (the selected one by
// default). The backend decides; this only hides what it would refuse. Saving
// also needs Operator on the source and Engineer on every destination, which
// the editor's pickers show.
export function useCronjobCan(workspaceId?: string) {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const id = workspaceId ?? workspace?.id
  const level = id ? access.workspaceLevel(id) : "none"
  return {
    level,
    view: atLeast(level, "viewer"),
    run: atLeast(level, "operator"),
    edit: atLeast(level, "engineer"),
  }
}
