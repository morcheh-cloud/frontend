import type { Metadata } from "next"
import { Suspense } from "react"

import { SyncEditorFromRoute } from "../../components/syncs/sync-editor"

export const metadata: Metadata = {
  title: "New database sync",
}

export const instant = false

export default function NewSyncPage() {
  return (
    <Suspense>
      <SyncEditorFromRoute />
    </Suspense>
  )
}
