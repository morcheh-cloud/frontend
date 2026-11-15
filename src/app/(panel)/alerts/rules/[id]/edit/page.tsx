import type { Metadata } from "next"
import { Suspense } from "react"

import { RuleEditorFromRoute } from "../../../components/rule-editor"

export const metadata: Metadata = {
  title: "Edit alert rule",
}

export const instant = false

export default function EditAlertRulePage() {
  return (
    <Suspense>
      <RuleEditorFromRoute />
    </Suspense>
  )
}
