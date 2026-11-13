import type { Metadata } from "next"
import { Suspense } from "react"

import { DaemonPage } from "../components/daemon-view"

export const metadata: Metadata = {
  title: "Engine config",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <DaemonPage />
    </Suspense>
  )
}
