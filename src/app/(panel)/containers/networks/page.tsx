import type { Metadata } from "next"
import { Suspense } from "react"

import { SectionPage } from "../components/env-page"

export const metadata: Metadata = {
  title: "Networks",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <SectionPage title="Networks" section="networks" />
    </Suspense>
  )
}
