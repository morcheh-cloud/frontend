import type { Metadata } from "next"
import { Suspense } from "react"

import { LogsPage } from "./components/logs-view"

export const metadata: Metadata = { title: "Logs & archives" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <LogsPage />
    </Suspense>
  )
}
