import { Suspense } from "react"

import { ServerDatabases } from "./components/server-databases"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ServerDatabasesPage() {
  return (
    <Suspense>
      <ServerDatabases />
    </Suspense>
  )
}
