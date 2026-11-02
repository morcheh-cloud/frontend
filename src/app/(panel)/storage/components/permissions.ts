"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import type { Storage } from "@/lib/services"

// What this person may do on a storage, to hide what the backend would refuse.
export function useStorageCan() {
  const { storageLevel } = useAccess()
  return (storage: Storage, min: Level) =>
    atLeast(storageLevel(storage.id, storage.workspace_id), min)
}
