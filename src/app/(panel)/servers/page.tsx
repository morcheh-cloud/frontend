import type { Metadata } from "next"
import { Suspense } from "react"

import { ServersView } from "./components/servers-view"

export const metadata: Metadata = {
  title: "Servers",
}

// The filters live in the URL (nuqs), which needs a Suspense boundary.
export default function ServersPage() {
  return (
    <Suspense>
      <ServersView />
    </Suspense>
  )
}
