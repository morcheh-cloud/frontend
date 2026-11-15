import type { Metadata } from "next"
import { Suspense } from "react"

import { MonitorFromRoute } from "../components/monitor-page"

export const metadata: Metadata = {
  title: "Monitor",
}

// Waits on the monitor loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function MonitorRoute() {
  return (
    <Suspense>
      <MonitorFromRoute />
    </Suspense>
  )
}
