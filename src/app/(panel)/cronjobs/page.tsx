import type { Metadata } from "next"
import { Suspense } from "react"

import { CronjobsView } from "./components/cronjobs-view"

export const metadata: Metadata = {
  title: "Cron jobs",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function CronjobsPage() {
  return (
    <Suspense>
      <CronjobsView />
    </Suspense>
  )
}
