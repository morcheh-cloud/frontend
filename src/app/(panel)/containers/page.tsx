import type { Metadata } from "next"
import { Suspense } from "react"

import { DashboardPage } from "./components/dashboard-view"

export const metadata: Metadata = {
  title: "Containers",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ContainersPage() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  )
}
