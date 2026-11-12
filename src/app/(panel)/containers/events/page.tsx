import type { Metadata } from "next"
import { Suspense } from "react"

import { EventsPage } from "../components/events-view"

export const metadata: Metadata = {
  title: "Event log",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <EventsPage />
    </Suspense>
  )
}
