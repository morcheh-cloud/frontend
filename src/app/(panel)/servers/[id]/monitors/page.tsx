import { Suspense } from "react"

import { ServerUptime } from "./components/server-uptime"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ServerUptimePage() {
  return (
    <Suspense>
      <ServerUptime />
    </Suspense>
  )
}
