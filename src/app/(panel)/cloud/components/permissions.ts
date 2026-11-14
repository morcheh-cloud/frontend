"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import type { CloudAccount } from "@/lib/services"

// Cloud accounts follow the workspace's level: Viewer reads, Operator checks
// and powers servers, Engineer renames, Owner adds, edits or removes an
// account. Changes to servers also need the account's "Allow changes". The
// backend enforces it; this only hides what it would refuse.
export function useCloudCan() {
  const { workspaceLevel } = useAccess()
  return (account: Pick<CloudAccount, "workspace_id">, min: Level) =>
    atLeast(workspaceLevel(account.workspace_id), min)
}

// Adding an account takes Owner on the selected workspace (it holds a key).
export function useCanAddCloud() {
  const { workspaceLevel } = useAccess()
  const { workspace } = useWorkspace()
  return !!workspace && atLeast(workspaceLevel(workspace.id), "owner")
}
