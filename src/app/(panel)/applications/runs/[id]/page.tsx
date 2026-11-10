import type { Metadata } from "next"
import { Suspense } from "react"

import { SoftwareRunFromRoute } from "../../components/run-page"

export const metadata: Metadata = {
  title: "Application run",
}

// Waits on the run loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function SoftwareRunRoute() {
  return (
    <Suspense>
      <SoftwareRunFromRoute />
    </Suspense>
  )
}
