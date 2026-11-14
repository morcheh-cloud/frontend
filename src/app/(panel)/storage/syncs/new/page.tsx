import type { Metadata } from "next"
import { Suspense } from "react"
import { SyncEditor } from "../components/sync-editor"

export const metadata: Metadata = { title: "New sync" }
export const instant = false

export default function NewSyncRoute() {
  return (
    <Suspense>
      <SyncEditor />
    </Suspense>
  )
}
