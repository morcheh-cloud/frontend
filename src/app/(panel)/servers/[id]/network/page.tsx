import { Suspense } from "react"

import { NetworkView } from "./components/network-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <NetworkView />
    </Suspense>
  )
}
