import type { Metadata } from "next"
import { Suspense } from "react"

import { EditAssetPage } from "../../components/asset-editor"

export const metadata: Metadata = { title: "Edit asset" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <EditAssetPage />
    </Suspense>
  )
}
