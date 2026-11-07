import type { Metadata } from "next"
import { Suspense } from "react"

import { RecordingFromRoute } from "../components/recording-page"

export const metadata: Metadata = {
  title: "Terminal recording",
}

// Waits on the recording loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function RecordingRoute() {
  return (
    <Suspense>
      <RecordingFromRoute />
    </Suspense>
  )
}
