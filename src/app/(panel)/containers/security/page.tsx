import type { Metadata } from "next"
import { Suspense } from "react"

import { SecurityPage } from "../components/security-view"

export const metadata: Metadata = {
  title: "Security",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <SecurityPage />
    </Suspense>
  )
}
