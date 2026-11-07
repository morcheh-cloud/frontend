import type { Metadata } from "next"
import { Suspense } from "react"

import { ScriptsView } from "./components/scripts-view"

export const metadata: Metadata = {
  title: "Scripts",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ScriptsPage() {
  return (
    <Suspense>
      <ScriptsView />
    </Suspense>
  )
}
