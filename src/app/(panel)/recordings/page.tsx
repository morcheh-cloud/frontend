import type { Metadata } from "next"
import { Suspense } from "react"

import { RecordingsView } from "./components/recordings-view"

export const metadata: Metadata = {
  title: "Audit log",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function RecordingsPage() {
  return (
    <Suspense>
      <RecordingsView />
    </Suspense>
  )
}
