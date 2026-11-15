import type { Metadata } from "next"
import { Suspense } from "react"

import { UptimeView } from "../components/uptime-view"

export const metadata: Metadata = {
  title: "Incidents",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function IncidentsPage() {
  return (
    <Suspense>
      <UptimeView />
    </Suspense>
  )
}
