"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useDemo } from "@/components/demo/demo"

// Webhooks send a workspace's events anywhere, so every part of them is the
// workspace Owner's (the backend refuses the rest). The public demo shows
// them but changes nothing.
export function useWebhookCan(ws: string | undefined) {
  const access = useAccess()
  const demo = !!useDemo()
  const read = !!ws && atLeast(access.workspaceLevel(ws), "owner")
  return { read, edit: read && !demo, demo }
}
