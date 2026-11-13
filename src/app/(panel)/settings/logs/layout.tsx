import type { ReactNode } from "react"

import { LogActionsProvider } from "./components/log-actions"

export default function LogsLayout({ children }: { children: ReactNode }) {
  return <LogActionsProvider>{children}</LogActionsProvider>
}
