import { Suspense } from "react"

import { ServerAccess } from "./components/server-access"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ServerAccessPage() {
  return (
    <Suspense>
      <ServerAccess />
    </Suspense>
  )
}
