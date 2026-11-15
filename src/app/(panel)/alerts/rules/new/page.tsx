import type { Metadata } from "next"
import { Suspense } from "react"

import { RuleEditor } from "../../components/rule-editor"

export const metadata: Metadata = {
  title: "New alert rule",
}

export const instant = false

export default function NewAlertRulePage() {
  return (
    <Suspense>
      <RuleEditor />
    </Suspense>
  )
}
