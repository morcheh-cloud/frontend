import { Suspense } from "react"

import { ServerScriptsView } from "./components/server-scripts"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ServerScriptsPage() {
  return (
    <Suspense>
      <ServerScriptsView />
    </Suspense>
  )
}
