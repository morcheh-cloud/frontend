import { Suspense } from "react"

import { Fail2banView } from "./components/fail2ban-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Fail2banPage() {
  return (
    <Suspense>
      <Fail2banView />
    </Suspense>
  )
}
