import { Suspense } from "react"

import { PortsView } from "./components/ports-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function PortsPage() {
  return (
    <Suspense>
      <PortsView />
    </Suspense>
  )
}
