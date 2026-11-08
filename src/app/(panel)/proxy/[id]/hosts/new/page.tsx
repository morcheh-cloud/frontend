import type { Metadata } from "next"
import { Suspense } from "react"

import { HostEditorPage } from "../components/host-editor"

export const metadata: Metadata = {
  title: "New site",
}

// Waits on the proxy loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function NewHostPage() {
  return (
    <Suspense>
      <HostEditorPage />
    </Suspense>
  )
}
