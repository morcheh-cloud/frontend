import { Suspense } from "react"

import { SystemView } from "./components/system-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <SystemView />
    </Suspense>
  )
}
