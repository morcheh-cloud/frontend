"use client"

import { useIsPhone } from "@/hooks/useIsPhone"
import { ServersDesktop } from "./servers-desktop"
import { ServersMobile } from "./servers-mobile"

// Phones get a native-style list with sheets; desktop a rail, table and bulk
// actions. Both share the URL filters and the dialogs in ServerActionsProvider
// (servers/layout.tsx).
export function ServersView() {
  const isPhone = useIsPhone()
  if (isPhone === null) return null
  return isPhone ? <ServersMobile /> : <ServersDesktop />
}
