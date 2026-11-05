import { Suspense } from "react"

import { FirewallView } from "./components/firewall-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function FirewallPage() {
  return (
    <Suspense>
      <FirewallView />
    </Suspense>
  )
}
