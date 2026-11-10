import { Suspense } from "react"

import { SoftwareActionsProvider } from "./components/software-actions"

// Install, manage, update and every confirmation, shared by the list, run and
// recipe pages.
export default function ApplicationsLayout({
  children,
}: LayoutProps<"/applications">) {
  return (
    <Suspense>
      <SoftwareActionsProvider>{children}</SoftwareActionsProvider>
    </Suspense>
  )
}
