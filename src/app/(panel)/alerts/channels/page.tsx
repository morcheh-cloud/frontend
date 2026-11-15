import type { Metadata } from "next"
import { Suspense } from "react"

import { AlertsView } from "../components/alerts-view"

export const metadata: Metadata = {
  title: "Alert channels",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function AlertChannelsPage() {
  return (
    <Suspense>
      <AlertsView />
    </Suspense>
  )
}
