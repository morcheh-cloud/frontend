"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import type { PackageRegistry } from "@/lib/services"

// A registry follows its server's level: Viewer sees what it holds,
// Operator checks it and sees its accounts, Engineer deploys, changes
// settings, deletes images or packages and manages accounts, Owner removes
// it and reads its admin login. The backend enforces it; this only hides
// what it would refuse.
export function useRegistryCan() {
  const { serverLevel } = useAccess()
  return (r: Pick<PackageRegistry, "server_id" | "workspace_id">, min: Level) =>
    atLeast(serverLevel(r.server_id, r.workspace_id), min)
}

// Deploying one takes Engineer on a server; the form lists which ones.
export function useCanAddRegistry() {
  return useAccess().highest("engineer")
}
