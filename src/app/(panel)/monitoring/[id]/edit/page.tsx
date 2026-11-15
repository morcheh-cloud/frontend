import type { Metadata } from "next"
import { Suspense } from "react"

import { MonitorEditorFromRoute } from "../../components/monitor-editor"

export const metadata: Metadata = {
  title: "Edit monitor",
}

export const instant = false

export default function EditMonitorRoute() {
  return (
    <Suspense>
      <MonitorEditorFromRoute />
    </Suspense>
  )
}
