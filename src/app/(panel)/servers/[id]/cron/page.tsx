import { Suspense } from "react"

import { CronView } from "./components/cron-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function CronPage() {
  return (
    <Suspense>
      <CronView />
    </Suspense>
  )
}
