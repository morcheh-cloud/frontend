"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import { useAnsibleStatus } from "../api"

// What this person may do with Ansible in the selected workspace. The
// backend decides; this only hides what it would refuse. Starting a run also
// needs Owner on every server in it, which the run sheet's check reports.
export function useAnsibleCan() {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const status = useAnsibleStatus()
  const level = workspace ? access.workspaceLevel(workspace.id) : "none"
  return {
    level,
    view: atLeast(level, "viewer"),
    edit: atLeast(level, "engineer"),
    runs: atLeast(level, "operator"),
    manageRuns: atLeast(level, "engineer"),
    // Hide Run only when the backend said no; unknown yet = show it.
    run: atLeast(level, "viewer") && status.data?.can_run !== false,
  }
}
