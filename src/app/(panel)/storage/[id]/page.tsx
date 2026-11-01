import type { Metadata } from "next"
import { Suspense } from "react"

import { StoragePageView } from "./components/storage-page"

export const metadata: Metadata = {
  title: "Storage",
}

// Waits on the storage loaded in the browser: skip instant-navigation checks.
export const instant = false

// The id is only known at request time, so reading it needs a Suspense
// boundary; the file browser's folder lives in the URL too.
export default function StorageDetailPage() {
  return (
    <Suspense>
      <StoragePageView />
    </Suspense>
  )
}
