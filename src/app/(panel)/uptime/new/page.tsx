import type { Metadata } from "next"
import { Suspense } from "react"

import { MonitorEditor } from "../components/monitor-editor"

export const metadata: Metadata = {
  title: "New monitor",
}

export const instant = false

export default function NewMonitorPage() {
  return (
    <Suspense>
      <MonitorEditor />
    </Suspense>
  )
}
