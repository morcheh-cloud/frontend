import type { Metadata } from "next"
import { Suspense } from "react"

import { AutoUpdatePolicyFromRoute } from "../../components/auto-update-page"

export const metadata: Metadata = {
  title: "Auto-update policy",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <AutoUpdatePolicyFromRoute />
    </Suspense>
  )
}
