"use client"

import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import type { Proxy as ReverseProxy } from "@/lib/services"

// A proxy follows its server's level: Viewer reads, Operator checks, reloads
// and reads logs and header values, Engineer sets it up and changes sites,
// Owner removes it. The backend enforces it; this only hides what it would
// refuse.
export function useProxyCan() {
  const { serverLevel } = useAccess()
  return (p: Pick<ReverseProxy, "server_id" | "workspace_id">, min: Level) =>
    atLeast(serverLevel(p.server_id, p.workspace_id), min)
}

// Adding one takes Engineer on a server; the dialog says which ones.
export function useCanAddProxy() {
  return useAccess().highest("engineer")
}
