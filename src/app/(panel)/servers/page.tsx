import type { Metadata } from "next"
import { Suspense } from "react"

import { ServersView } from "./components/servers-view"

export const metadata: Metadata = {
  title: "Servers",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

// The filters live in the URL (nuqs), which needs a Suspense boundary.
export default function ServersPage() {
  return (
    <Suspense>
      <ServersView />
    </Suspense>
  )
}
