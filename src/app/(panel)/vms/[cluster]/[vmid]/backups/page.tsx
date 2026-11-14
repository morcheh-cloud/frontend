import { Suspense } from "react"

import { BackupsTab } from "../components/backups-tab"

// Waits on the machine loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <BackupsTab />
    </Suspense>
  )
}
