import type { Metadata } from "next"
import { Suspense } from "react"

import { PlanEditorFromRoute } from "../../components/backups/plan-editor"

export const metadata: Metadata = {
  title: "New backup plan",
}

export const instant = false

export default function NewBackupPlanPage() {
  return (
    <Suspense>
      <PlanEditorFromRoute />
    </Suspense>
  )
}
