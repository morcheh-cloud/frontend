import type { Metadata } from "next"
import { Suspense } from "react"

import { AutomationEditorFromRoute } from "../../components/automation-editor"

export const metadata: Metadata = {
  title: "Edit automation",
}

export const instant = false

export default function EditAutomationPage() {
  return (
    <Suspense>
      <AutomationEditorFromRoute />
    </Suspense>
  )
}
