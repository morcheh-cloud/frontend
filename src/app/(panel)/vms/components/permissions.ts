"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"

import { useClusters } from "../api"

// A cluster follows its workspace's level: Viewer sees, Operator powers and
// checks, Engineer does the rest of the day-to-day work (console, create,
// snapshots, hardware, migrate, backups, firewall, HA), Owner connects or
// removes a cluster and deletes machines or volumes. The backend enforces it;
// this only hides what it would refuse.
export function useVmCan() {
  const { workspaceLevel } = useAccess()
  const { data } = useClusters()
  return (cluster: string | { workspace_id: string }, min: Level) => {
    const ws =
      typeof cluster === "string"
        ? data?.items.find((c) => c.id === cluster)?.workspace_id
        : cluster.workspace_id
    return !!ws && atLeast(workspaceLevel(ws), min)
  }
}

// Connecting a cluster takes Owner on the selected workspace.
export function useCanAddCluster() {
  const { workspaceLevel } = useAccess()
  const { workspace } = useWorkspace()
  return !!workspace && atLeast(workspaceLevel(workspace.id), "owner")
}

// Creating a machine: Engineer on at least one cluster's workspace.
export function useCanCreateVm() {
  const can = useVmCan()
  const { data } = useClusters()
  return !!data?.items.some((c) => can(c, "engineer"))
}
