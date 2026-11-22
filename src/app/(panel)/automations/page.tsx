import type { Metadata } from "next"
import { Suspense } from "react"

import { AutomationsView } from "./components/automations-view"

export const metadata: Metadata = {
  title: "Automations",
}

export const instant = false

export default function AutomationsPage() {
  return (
    <Suspense>
      <AutomationsView />
    </Suspense>
  )
}
