import { Suspense } from "react"

import { ServerApplicationsView } from "./components/server-applications"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ServerApplicationsPage() {
  return (
    <Suspense>
      <ServerApplicationsView />
    </Suspense>
  )
}
