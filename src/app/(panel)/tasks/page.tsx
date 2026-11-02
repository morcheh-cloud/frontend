import type { Metadata } from "next"
import { Suspense } from "react"

import { TasksView } from "./components/tasks-view"

export const metadata: Metadata = {
  title: "Tasks",
}

// Waits on data loaded in the browser: skip instant-navigation checks.
export const instant = false

export default function TasksPage() {
  return (
    <Suspense>
      <TasksView />
    </Suspense>
  )
}
