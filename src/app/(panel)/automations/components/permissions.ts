"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useDemo } from "@/components/demo/demo"
import { useWorkspace } from "@/components/panel/workspace"

// What this person may do with automations in a workspace (the selected one
// by default). The backend decides; this only hides what it would refuse.
// Steps that run commands or act on services also need Engineer on their
// servers, which the editor's server pickers and the dry run show. The public
// demo shows automations but runs and changes none.
export function useAutomationCan(workspaceId?: string) {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const demo = !!useDemo()
  const id = workspaceId ?? workspace?.id
  const level = id ? access.workspaceLevel(id) : "none"
  return {
    level,
    demo,
    view: atLeast(level, "viewer"),
    run: atLeast(level, "operator") && !demo,
    edit: atLeast(level, "engineer") && !demo,
  }
}
