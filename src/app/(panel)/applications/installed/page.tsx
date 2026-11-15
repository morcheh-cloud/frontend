import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicationsView } from "../components/applications-view"

export const metadata: Metadata = {
  title: "Installed applications",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ApplicationsInstalledPage() {
  return (
    <Suspense>
      <ApplicationsView />
    </Suspense>
  )
}
