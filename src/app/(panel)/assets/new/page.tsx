import type { Metadata } from "next"
import { Suspense } from "react"

import { NewAssetPage } from "../components/asset-editor"

export const metadata: Metadata = { title: "New asset" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <NewAssetPage />
    </Suspense>
  )
}
