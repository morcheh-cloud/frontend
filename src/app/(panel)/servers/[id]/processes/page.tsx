import { Suspense } from "react"

import { ProcessesView } from "./components/processes-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ProcessesPage() {
  return (
    <Suspense>
      <ProcessesView />
    </Suspense>
  )
}
