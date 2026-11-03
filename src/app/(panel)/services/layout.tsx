import { Suspense } from "react"

import { AppActionsProvider } from "./components/app-actions"

// Every dialog of the services page (add, edit, move, access, categories)
// lives here, so tiles, rows and menus all open the same ones. The provider
// reads the URL filters, hence the Suspense.
export default function ServicesLayout({ children }: LayoutProps<"/services">) {
  return (
    <Suspense>
      <AppActionsProvider>{children}</AppActionsProvider>
    </Suspense>
  )
}
