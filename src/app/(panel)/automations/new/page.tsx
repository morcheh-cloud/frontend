import type { Metadata } from "next"
import { Suspense } from "react"

import { AutomationEditor } from "../components/automation-editor"

export const metadata: Metadata = {
  title: "New automation",
}

export const instant = false

export default function NewAutomationPage() {
  return (
    <Suspense>
      <AutomationEditor />
    </Suspense>
  )
}
