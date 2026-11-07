import type { Metadata } from "next"
import { Suspense } from "react"

import { ScriptRunFromRoute } from "../../components/run-page"

export const metadata: Metadata = {
  title: "Script run",
}

// Waits on the run loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ScriptRunRoute() {
  return (
    <Suspense>
      <ScriptRunFromRoute />
    </Suspense>
  )
}
