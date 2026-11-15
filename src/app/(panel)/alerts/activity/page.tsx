import type { Metadata } from "next"
import { Suspense } from "react"

import { AlertsView } from "../components/alerts-view"

export const metadata: Metadata = {
  title: "Alert activity",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function AlertActivityPage() {
  return (
    <Suspense>
      <AlertsView />
    </Suspense>
  )
}
