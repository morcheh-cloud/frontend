import type { Metadata } from "next"
import { Suspense } from "react"

import { TunnelEditor } from "../components/tunnel-editor"

export const metadata: Metadata = { title: "New tunnel" }

export const instant = false

export default function NewTunnelPage() {
  return (
    <Suspense>
      <TunnelEditor />
    </Suspense>
  )
}
