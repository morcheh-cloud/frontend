import type { Metadata } from "next"
import { Suspense } from "react"

import { MapView } from "../components/map-view"

export const metadata: Metadata = { title: "Asset map" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <MapView />
    </Suspense>
  )
}
