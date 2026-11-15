import type { Metadata } from "next"
import { Suspense } from "react"

import { VmsView } from "../components/vms-view"

export const metadata: Metadata = {
  title: "Proxmox storage",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function VmsStoragePage() {
  return (
    <Suspense>
      <VmsView />
    </Suspense>
  )
}
