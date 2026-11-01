import { Suspense } from "react"

import { ServicesView } from "./components/services-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ServicesPage() {
  return (
    <Suspense>
      <ServicesView />
    </Suspense>
  )
}
