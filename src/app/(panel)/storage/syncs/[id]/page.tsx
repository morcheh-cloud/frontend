import type { Metadata } from "next"
import { Suspense } from "react"
import { SyncPageFromRoute } from "../components/sync-page"

export const metadata: Metadata = { title: "Sync" }
export const instant = false

export default function SyncRoute() {
  return (
    <Suspense>
      <SyncPageFromRoute />
    </Suspense>
  )
}
