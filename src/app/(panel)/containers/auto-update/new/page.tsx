import type { Metadata } from "next"
import { Suspense } from "react"

import { NewAutoUpdatePage } from "../../components/auto-update-editor"

export const metadata: Metadata = {
  title: "New auto-update policy",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <NewAutoUpdatePage />
    </Suspense>
  )
}
