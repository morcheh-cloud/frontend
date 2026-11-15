import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicationsView } from "../components/applications-view"

export const metadata: Metadata = {
  title: "Application updates",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ApplicationsUpdatesPage() {
  return (
    <Suspense>
      <ApplicationsView />
    </Suspense>
  )
}
