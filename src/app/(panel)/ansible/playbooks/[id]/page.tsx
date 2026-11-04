import type { Metadata } from "next"
import { Suspense } from "react"

import { PlaybookFromRoute } from "../../components/playbook-editor"

export const metadata: Metadata = {
  title: "Playbook",
}

// Waits on the playbook loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function PlaybookRoute() {
  return (
    <Suspense>
      <PlaybookFromRoute />
    </Suspense>
  )
}
