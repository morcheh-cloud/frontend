import { Suspense } from "react"

import { ServerRecordingsView } from "./components/server-recordings"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ServerRecordingsPage() {
  return (
    <Suspense>
      <ServerRecordingsView />
    </Suspense>
  )
}
