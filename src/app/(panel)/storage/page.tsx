import type { Metadata } from "next"
import { Suspense } from "react"

import { StorageView } from "./components/storage-view"

export const metadata: Metadata = {
  title: "Storage",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function StoragePage() {
  return (
    <Suspense>
      <StorageView />
    </Suspense>
  )
}
