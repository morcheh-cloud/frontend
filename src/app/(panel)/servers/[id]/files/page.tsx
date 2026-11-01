import { Suspense } from "react"

import { FilesView } from "./components/files-view"

// Waits on the server loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function FilesPage() {
  return (
    <Suspense>
      <FilesView />
    </Suspense>
  )
}
