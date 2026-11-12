import type { Metadata } from "next"
import { Suspense } from "react"

import { SettingsPage } from "../components/settings-view"

export const metadata: Metadata = {
  title: "Settings",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  )
}
