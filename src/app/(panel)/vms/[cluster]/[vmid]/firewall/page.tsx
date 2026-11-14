import { Suspense } from "react"

import { FirewallTab } from "../components/firewall-tab"

// Waits on the machine loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <FirewallTab />
    </Suspense>
  )
}
