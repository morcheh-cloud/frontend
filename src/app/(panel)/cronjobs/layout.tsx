import { Suspense } from "react"

import { CronjobActionsProvider } from "./components/cronjob-actions"

// Every confirmation, shared by the list, a job's page and the editor.
export default function CronjobsLayout({ children }: LayoutProps<"/cronjobs">) {
  return (
    <Suspense>
      <CronjobActionsProvider>{children}</CronjobActionsProvider>
    </Suspense>
  )
}
