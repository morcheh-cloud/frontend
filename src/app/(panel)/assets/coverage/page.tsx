import type { Metadata } from "next"
import { Suspense } from "react"

import { CoverageView } from "../components/coverage-view"

export const metadata: Metadata = { title: "Asset coverage" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <CoverageView />
    </Suspense>
  )
}
