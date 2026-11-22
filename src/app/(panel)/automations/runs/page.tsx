import type { Metadata } from "next"
import { Suspense } from "react"

import { RunsView } from "../components/runs-view"

export const metadata: Metadata = {
  title: "Automation runs",
}

export const instant = false

export default function AutomationRunsPage() {
  return (
    <Suspense>
      <RunsView />
    </Suspense>
  )
}
