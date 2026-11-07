import { Suspense } from "react"

import { ScriptsActionsProvider } from "./components/scripts-actions"

// The run sheet and every confirmation, shared by the list, script and run
// pages.
export default function ScriptsLayout({ children }: LayoutProps<"/scripts">) {
  return (
    <Suspense>
      <ScriptsActionsProvider intents>{children}</ScriptsActionsProvider>
    </Suspense>
  )
}
