import type { Metadata } from "next"
import { Suspense } from "react"

import { DiscoveryView } from "../components/discovery-view"

export const metadata: Metadata = { title: "Asset discovery" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <DiscoveryView />
    </Suspense>
  )
}
