import type { Metadata } from "next"
import { Suspense } from "react"

import { RunFromRoute } from "../../components/run-page"

export const metadata: Metadata = {
  title: "Ansible run",
}

// Waits on the run loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function RunRoute() {
  return (
    <Suspense>
      <RunFromRoute />
    </Suspense>
  )
}
