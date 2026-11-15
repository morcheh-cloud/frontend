import type { Metadata } from "next"
import { Suspense } from "react"

import { ScriptsView } from "../components/scripts-view"

export const metadata: Metadata = {
  title: "Script runs",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ScriptRunsPage() {
  return (
    <Suspense>
      <ScriptsView />
    </Suspense>
  )
}
