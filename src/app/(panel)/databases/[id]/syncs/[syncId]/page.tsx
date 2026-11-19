import type { Metadata } from "next"
import { Suspense } from "react"

import { SyncEditorFromRoute } from "../../components/syncs/sync-editor"

export const metadata: Metadata = {
  title: "Database sync",
}

export const instant = false

export default function SyncPage() {
  return (
    <Suspense>
      <SyncEditorFromRoute />
    </Suspense>
  )
}
