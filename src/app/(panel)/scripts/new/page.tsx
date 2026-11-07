import type { Metadata } from "next"
import { Suspense } from "react"

import { ScriptPage } from "../components/script-editor"

export const metadata: Metadata = {
  title: "New script",
}

export const instant = false

export default function NewScriptPage() {
  return (
    <Suspense>
      <ScriptPage />
    </Suspense>
  )
}
