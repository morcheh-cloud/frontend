"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import type { StorageSync } from "@/lib/services"

// What this person may do with storage syncs in a workspace (the selected
// one by default). The backend decides; this only hides what it would refuse.
// Saving also needs Operator on the source storage (Engineer when it empties
// it) and Engineer on the destination, which the editor's pickers show.
export function useSyncCan(workspaceId?: string) {
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

// The level this person has on a storage of the workspace.
export function useStorageLevelOf(workspaceId?: string) {
  const { storageLevel } = useAccess()
  return (storageId: string | undefined, min: Level) =>
    !!storageId &&
    !!workspaceId &&
    atLeast(storageLevel(storageId, workspaceId), min)
}

// MinIO replication is set up on the storages themselves: Owner on both.
export function useCanReplicate() {
  const { storageLevel } = useAccess()
  return (
    s: Pick<StorageSync, "workspace_id"> & {
      source: { storage_id: string }
      dest: { storage_id: string }
    },
  ) =>
    atLeast(storageLevel(s.source.storage_id, s.workspace_id), "owner") &&
    atLeast(storageLevel(s.dest.storage_id, s.workspace_id), "owner")
}
