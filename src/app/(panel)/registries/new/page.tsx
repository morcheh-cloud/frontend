import type { Metadata } from "next"
import { Suspense } from "react"

import { RegistryEditor } from "../components/registry-editor"

export const metadata: Metadata = { title: "New registry" }

export const instant = false

export default function NewRegistryPage() {
  return (
    <Suspense>
      <RegistryEditor />
    </Suspense>
  )
}
