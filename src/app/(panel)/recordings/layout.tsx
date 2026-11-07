import { Suspense } from "react"

import { RecordingsActionsProvider } from "./components/recordings-actions"

// The settings dialog and the delete confirmation, shared by the list and
// the player page.
export default function RecordingsLayout({
  children,
}: LayoutProps<"/recordings">) {
  return (
    <Suspense>
      <RecordingsActionsProvider>{children}</RecordingsActionsProvider>
    </Suspense>
  )
}
