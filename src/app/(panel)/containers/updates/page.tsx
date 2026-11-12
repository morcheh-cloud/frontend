import type { Metadata } from "next"
import { Suspense } from "react"

import { UpdatesPage } from "../components/updates-view"

export const metadata: Metadata = {
  title: "Updates",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <UpdatesPage />
    </Suspense>
  )
}
