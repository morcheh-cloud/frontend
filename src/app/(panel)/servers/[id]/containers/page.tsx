import { Suspense } from "react"

import { ServerContainers } from "./components/server-containers"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function ServerContainersPage() {
  return (
    <Suspense>
      <ServerContainers />
    </Suspense>
  )
}
