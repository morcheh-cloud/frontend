"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"

// What this person may do with uptime monitors in a workspace (the selected
// one by default). The backend decides; this only hides what it would refuse.
// Checking from a server also needs Engineer on that server.
export function useUptimeCan(workspaceId?: string) {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const id = workspaceId ?? workspace?.id
  const level = id ? access.workspaceLevel(id) : "none"
  return {
    level,
    view: atLeast(level, "viewer"),
    // Check now, pause, acknowledge an incident.
    operate: atLeast(level, "operator"),
    edit: atLeast(level, "engineer"),
    remove: atLeast(level, "owner"),
    admin: access.admin,
  }
}
