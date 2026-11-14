import type { Metadata } from "next"
import { Suspense } from "react"

import { CloudView } from "./components/cloud-view"

export const metadata: Metadata = { title: "Cloud" }

export const instant = false

export default function CloudPage() {
  return (
    <Suspense>
      <CloudView />
    </Suspense>
  )
}
