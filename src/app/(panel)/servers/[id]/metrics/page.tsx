import { Suspense } from "react"

import { MetricsView } from "./components/metrics-view"

export const instant = false

export default function Page() {
  return (
    <Suspense>
      <MetricsView />
    </Suspense>
  )
}
