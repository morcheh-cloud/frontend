import type { Metadata } from "next"
import { Suspense } from "react"

import { PlanEditorFromRoute } from "../../../components/backups/plan-editor"

export const metadata: Metadata = {
  title: "Backup plan",
}

export const instant = false

export default function BackupPlanPage() {
  return (
    <Suspense>
      <PlanEditorFromRoute />
    </Suspense>
  )
}
