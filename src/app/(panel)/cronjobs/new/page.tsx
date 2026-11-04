import type { Metadata } from "next"
import { Suspense } from "react"

import { CronjobEditor } from "../components/cronjob-editor"

export const metadata: Metadata = {
  title: "New cron job",
}

export const instant = false

export default function NewCronjobPage() {
  return (
    <Suspense>
      <CronjobEditor />
    </Suspense>
  )
}
