import type { Metadata } from "next"
import { Suspense } from "react"

import { TunnelEditorFromRoute } from "../../components/tunnel-editor"

export const metadata: Metadata = { title: "Edit tunnel" }

export const instant = false

export default function EditTunnelPage() {
  return (
    <Suspense>
      <TunnelEditorFromRoute />
    </Suspense>
  )
}
