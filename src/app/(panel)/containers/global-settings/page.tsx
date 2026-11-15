import type { Metadata } from "next"
import { Suspense } from "react"

import { GlobalSettingsPage } from "../components/settings-view"

export const metadata: Metadata = {
  title: "Global settings",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <GlobalSettingsPage />
    </Suspense>
  )
}
