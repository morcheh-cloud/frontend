import type { Metadata } from "next"
import { Suspense } from "react"

import { DatabasesView } from "./components/databases-view"

export const metadata: Metadata = {
  title: "Databases",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function DatabasesPage() {
  return (
    <Suspense>
      <DatabasesView />
    </Suspense>
  )
}
