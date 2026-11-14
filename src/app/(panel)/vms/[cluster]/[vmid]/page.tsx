import { Suspense } from "react"

import { OverviewTab } from "./components/overview-tab"

// Waits on the machine loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <OverviewTab />
    </Suspense>
  )
}
