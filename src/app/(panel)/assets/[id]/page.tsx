import type { Metadata } from "next"
import { Suspense } from "react"

import { AssetPageFromRoute } from "../components/asset-page"

export const metadata: Metadata = { title: "Asset" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <AssetPageFromRoute />
    </Suspense>
  )
}
