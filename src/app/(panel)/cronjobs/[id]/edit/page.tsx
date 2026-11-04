import type { Metadata } from "next"
import { Suspense } from "react"

import { CronjobEditorFromRoute } from "../../components/cronjob-editor"

export const metadata: Metadata = {
  title: "Edit cron job",
}

export const instant = false

export default function EditCronjobRoute() {
  return (
    <Suspense>
      <CronjobEditorFromRoute />
    </Suspense>
  )
}
