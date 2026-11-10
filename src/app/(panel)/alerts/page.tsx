import type { Metadata } from "next"
import { Suspense } from "react"

import { AlertsView } from "./components/alerts-view"

export const metadata: Metadata = {
  title: "Alerts",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function AlertsPage() {
  return (
    <Suspense>
      <AlertsView />
    </Suspense>
  )
}
