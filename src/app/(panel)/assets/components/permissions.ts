"use client"

import { useAccess, useAuth } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import type { Asset } from "@/lib/services"

// What this person may do in the asset inventory of the selected workspace.
// The backend decides; this only hides what it would refuse. Ownership of an
// asset grants nothing, except confirming its review.
export function useAssetsCan(workspaceId?: string) {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const { user } = useAuth()
  const ws = workspaceId ?? workspace?.id ?? ""
  const level = ws ? access.workspaceLevel(ws) : "none"
  return {
    me: user.id,
    view: atLeast(level, "viewer"),
    edit: atLeast(level, "engineer"),
    discover: atLeast(level, "engineer"),
    own: atLeast(level, "owner"),
    review: (a: Asset) =>
      atLeast(level, "operator") ||
      a.owner.user_id === user.id ||
      a.owner.deputy_id === user.id,
  }
}
