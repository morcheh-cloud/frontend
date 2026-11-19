import type { Metadata } from "next"
import { Suspense } from "react"

import { InventoryView } from "./components/inventory-view"

export const metadata: Metadata = { title: "Assets" }

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function Page() {
  return (
    <Suspense>
      <InventoryView />
    </Suspense>
  )
}
