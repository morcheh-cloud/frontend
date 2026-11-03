"use client"

import { useMemo, useState } from "react"

import type { Level } from "@/components/auth/level"
import type { GrantBody, GrantSpec, PanelGrant } from "@/lib/services"
import type { GrantFailure, GrantOp, GrantPrincipal } from "./api"
import type { TargetKind } from "./targets"

export type AccessPick = { level: Level; canCreate: boolean }

export function keyOfGrant(g: PanelGrant) {
  if (g.server_id) return `server:${g.server_id}`
  if (g.storage_id) return `storage:${g.storage_id}`
  if (g.app_id) return `app:${g.app_id}`
  return `workspace:${g.workspace_id}`
}

export const kindOfKey = (key: string) => key.split(":")[0] as TargetKind

export const newPick = (level: Level): AccessPick => ({
  level,
  canCreate: level === "owner",
})

function specOf(key: string, pick: AccessPick): GrantSpec {
  const [kind, id] = key.split(":")
  if (kind === "server") return { server_id: id, level: pick.level }
  if (kind === "storage") return { storage_id: id, level: pick.level }
  if (kind === "app") return { app_id: id, level: pick.level }
  return { workspace_id: id, level: pick.level, can_create: pick.canCreate }
}

// `canCreate` only means something on a workspace.
function samePick(key: string, a: AccessPick, b: AccessPick) {
  return (
    a.level === b.level &&
    (kindOfKey(key) !== "workspace" || a.canCreate === b.canCreate)
  )
}

// What someone's access would become. Only the changes are held, on top of the
// saved grants, so a refetch underneath never loses or resurrects anything.
export function useAccessDraft(saved: PanelGrant[]) {
  const [edits, setEdits] = useState<Record<string, AccessPick | null>>({})

  const base = useMemo(
    () => new Map(saved.map((g) => [keyOfGrant(g), g])),
    [saved],
  )

  const picks = useMemo(() => {
    const out = new Map<string, AccessPick>()
    for (const [key, g] of base) {
      out.set(key, { level: g.level, canCreate: g.can_create })
    }
    for (const [key, pick] of Object.entries(edits)) {
      if (pick) out.set(key, pick)
      else out.delete(key)
    }
    return out
  }, [base, edits])

  // Back to what's saved means no change at all.
  const update = (changes: Record<string, AccessPick | null>) =>
    setEdits((current) => {
      const next = { ...current }
      for (const [key, pick] of Object.entries(changes)) {
        const g = base.get(key)
        const original = g && { level: g.level, canCreate: g.can_create }
        const same = pick
          ? !!original && samePick(key, pick, original)
          : !original
        if (same) delete next[key]
        else next[key] = pick
      }
      return next
    })

  const ops = (principal: GrantPrincipal): GrantOp[] =>
    Object.entries(edits).map(([key, pick]) =>
      pick
        ? {
            key,
            set: { ...specOf(key, pick), ...principal } as GrantBody,
          }
        : { key, removeId: base.get(key)?.id },
    )

  const specs = () =>
    [...picks].map(([key, pick]) => specOf(key, pick) as GrantSpec)

  const summary = { added: 0, changed: 0, removed: 0 }
  for (const [key, pick] of Object.entries(edits)) {
    if (!pick) summary.removed += 1
    else if (base.has(key)) summary.changed += 1
    else summary.added += 1
  }

  return {
    picks,
    update,
    ops,
    specs,
    summary,
    base,
    dirty: Object.keys(edits).length > 0,
    discard: () => setEdits({}),
    // Saved changes are now part of `saved`; refused ones stay to try again.
    settle: (failures: GrantFailure[]) =>
      setEdits((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([key]) =>
            failures.some((f) => f.key === key),
          ),
        ),
      ),
  }
}

export type AccessDraft = ReturnType<typeof useAccessDraft>
