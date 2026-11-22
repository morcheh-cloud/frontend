import type { Metadata } from "next"
import { Suspense } from "react"

import { AutomationFromRoute } from "../components/automation-page"

export const metadata: Metadata = {
  title: "Automation",
}

// Waits on the automation loaded in the browser.
export const instant = false

export default function AutomationRoute() {
  return (
    <Suspense>
      <AutomationFromRoute />
    </Suspense>
  )
}
