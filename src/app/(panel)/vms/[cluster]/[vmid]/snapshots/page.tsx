import { Suspense } from "react"

import { SnapshotsTab } from "../components/snapshots-tab"

// Waits on the machine loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <SnapshotsTab />
    </Suspense>
  )
}
