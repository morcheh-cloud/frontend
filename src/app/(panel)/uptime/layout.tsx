import { Suspense } from "react"

import { UptimeActionsProvider } from "./components/uptime-actions"

// Every confirmation, shared by the list, a monitor's page and the editor.
export default function UptimeLayout({ children }: LayoutProps<"/uptime">) {
  return (
    <Suspense>
      <UptimeActionsProvider>{children}</UptimeActionsProvider>
    </Suspense>
  )
}
