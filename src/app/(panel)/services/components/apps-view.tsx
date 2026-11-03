"use client"

import { useIsPhone } from "@/hooks/useIsPhone"
import { AppsDesktop } from "./apps-desktop"

export function AppsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <AppsDesktop />
}
