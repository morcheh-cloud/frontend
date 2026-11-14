import { Suspense } from "react"

import { CloudInitTab } from "../components/cloud-init-tab"

// Waits on the machine loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <CloudInitTab />
    </Suspense>
  )
}
