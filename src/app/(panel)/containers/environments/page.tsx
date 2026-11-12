import type { Metadata } from "next"
import { Suspense } from "react"

import { FleetView } from "../components/fleet-view"

export const metadata: Metadata = {
  title: "Environments",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <FleetView />
    </Suspense>
  )
}
