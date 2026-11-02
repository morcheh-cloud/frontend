import type { Metadata } from "next"
import { Suspense } from "react"

import { NetworkView } from "./components/network-view"

export const metadata: Metadata = {
  title: "Network map",
}

// Waits on a scan run from the browser: skip instant-navigation checks.
export const instant = false

export default function NetworkPage() {
  return (
    <Suspense>
      <NetworkView />
    </Suspense>
  )
}
