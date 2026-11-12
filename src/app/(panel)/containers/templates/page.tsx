import type { Metadata } from "next"
import { Suspense } from "react"

import { TemplatesPage } from "../components/templates-view"

export const metadata: Metadata = {
  title: "Templates",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <TemplatesPage />
    </Suspense>
  )
}
