"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"

// What this person may do with a server's Docker, to hide what the backend
// would refuse: Viewer reads and sees live numbers (never env values),
// Operator starts, stops, restarts and reads logs, Engineer does everything
// else, inspect included.
export function useDockerCan(
  serverId: string,
  workspaceId: string | undefined,
) {
  const { serverLevel } = useAccess()
  const level = serverLevel(serverId, workspaceId ?? "")
  return {
    level,
    operate: atLeast(level, "operator"),
    manage: atLeast(level, "engineer"),
  }
}

export type DockerCan = ReturnType<typeof useDockerCan>

// Container settings of a workspace: Viewer reads, Engineer edits templates,
// Owner the settings and registry logins.
export function useDockerWorkspaceCan(workspaceId: string | undefined) {
  const { workspaceLevel } = useAccess()
  const level = workspaceId ? workspaceLevel(workspaceId) : ""
  return {
    level,
    read: atLeast(level, "viewer"),
    edit: atLeast(level, "engineer"),
    own: atLeast(level, "owner"),
  }
}
