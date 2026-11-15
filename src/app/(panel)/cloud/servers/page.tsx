import type { Metadata } from "next"
import { Suspense } from "react"

import { CloudView } from "../components/cloud-view"

export const metadata: Metadata = { title: "Cloud servers" }

export const instant = false

export default function CloudServersPage() {
  return (
    <Suspense>
      <CloudView />
    </Suspense>
  )
}
