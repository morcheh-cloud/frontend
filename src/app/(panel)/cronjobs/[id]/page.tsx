import type { Metadata } from "next"
import { Suspense } from "react"

import { CronjobFromRoute } from "../components/cronjob-page"

export const metadata: Metadata = {
  title: "Cron job",
}

// Waits on the job loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function CronjobRoute() {
  return (
    <Suspense>
      <CronjobFromRoute />
    </Suspense>
  )
}
