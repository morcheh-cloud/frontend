import type { Metadata } from "next"
import { Suspense } from "react"

import { PitrEditorFromRoute } from "../../components/pitr/pitr-editor"

export const metadata: Metadata = {
  title: "Point-in-time recovery",
}

export const instant = false

export default function PitrSetupPage() {
  return (
    <Suspense>
      <PitrEditorFromRoute />
    </Suspense>
  )
}
