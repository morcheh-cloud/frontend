import type { Metadata } from "next"
import { Suspense } from "react"

import { ContainerAlertsPage } from "../components/container-alerts"

export const metadata: Metadata = {
  title: "Container alerts",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <ContainerAlertsPage />
    </Suspense>
  )
}
