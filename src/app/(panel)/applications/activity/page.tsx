import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicationsView } from "../components/applications-view"

export const metadata: Metadata = {
  title: "Application activity",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ApplicationsActivityPage() {
  return (
    <Suspense>
      <ApplicationsView />
    </Suspense>
  )
}
