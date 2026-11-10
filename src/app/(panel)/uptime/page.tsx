import type { Metadata } from "next"
import { Suspense } from "react"

import { UptimeView } from "./components/uptime-view"

export const metadata: Metadata = {
  title: "Uptime",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function UptimePage() {
  return (
    <Suspense>
      <UptimeView />
    </Suspense>
  )
}
