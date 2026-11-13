import type { Metadata } from "next"
import { Suspense } from "react"

import { AutoUpdatePage } from "../components/auto-update-view"

export const metadata: Metadata = {
  title: "Auto-update",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <AutoUpdatePage />
    </Suspense>
  )
}
