import { Suspense } from "react"

import { UsersView } from "./components/users-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function UsersPage() {
  return (
    <Suspense>
      <UsersView />
    </Suspense>
  )
}
