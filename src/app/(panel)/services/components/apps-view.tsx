"use client"

import { useIsPhone } from "@/hooks/useIsPhone"
import { AppsDesktop } from "./apps-desktop"
import { AppsMobile } from "./apps-mobile"

export function AppsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return phone ? <AppsMobile /> : <AppsDesktop />
}
