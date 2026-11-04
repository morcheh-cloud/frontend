import type { Metadata } from "next"
import { Suspense } from "react"

import { PlaybookPage } from "../../components/playbook-editor"

export const metadata: Metadata = {
  title: "New playbook",
}

export const instant = false

export default function NewPlaybookPage() {
  return (
    <Suspense>
      <PlaybookPage />
    </Suspense>
  )
}
