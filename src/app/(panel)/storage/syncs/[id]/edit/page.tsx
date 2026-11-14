import type { Metadata } from "next"
import { Suspense } from "react"
import { SyncEditorFromRoute } from "../../components/sync-editor"

export const metadata: Metadata = { title: "Edit sync" }
export const instant = false

export default function EditSyncRoute() {
  return (
    <Suspense>
      <SyncEditorFromRoute />
    </Suspense>
  )
}
