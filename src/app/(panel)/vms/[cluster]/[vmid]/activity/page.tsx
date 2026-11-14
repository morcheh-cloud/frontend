import { Suspense } from "react"

import { ActivityTab } from "../components/activity-tab"

// Waits on the machine loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <ActivityTab />
    </Suspense>
  )
}
