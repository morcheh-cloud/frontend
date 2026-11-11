import { Suspense } from "react"

import { PackagesView } from "./components/packages-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function PackagesPage() {
  return (
    <Suspense>
      <PackagesView />
    </Suspense>
  )
}
