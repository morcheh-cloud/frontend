import type { Metadata } from "next"
import { Suspense } from "react"

import { ScriptFromRoute } from "../components/script-editor"

export const metadata: Metadata = {
  title: "Script",
}

// Waits on the script loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ScriptRoute() {
  return (
    <Suspense>
      <ScriptFromRoute />
    </Suspense>
  )
}
