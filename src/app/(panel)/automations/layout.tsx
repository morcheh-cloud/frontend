import { Suspense } from "react"

import { AutomationActionsProvider } from "./components/automation-actions"

// Every confirmation and layer (run, test, incoming URL, delete), shared by
// the list, an automation's page, the runs and the editor.
export default function AutomationsLayout({
  children,
}: LayoutProps<"/automations">) {
  return (
    <Suspense>
      <AutomationActionsProvider>{children}</AutomationActionsProvider>
    </Suspense>
  )
}
