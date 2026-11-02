import { Suspense } from "react"

import { AuthGate } from "@/components/auth/auth"
import { RouteHistory } from "@/hooks/useBack"
import { HelpHeader } from "./components/help-header"
import { HelpSearchProvider } from "./components/search"
import { helpIndex } from "./search-index"

// The help center has its own shell, outside the panel: a slim top bar with
// search on desktop, native app bars on phones. The search index is built
// here once, on the server, from the guide content.
export default function HelpLayout({ children }: LayoutProps<"/help">) {
  return (
    <AuthGate>
      <HelpSearchProvider index={helpIndex}>
        <div className="flex min-h-dvh flex-col bg-background">
          <HelpHeader />
          {children}
        </div>
        <Suspense>
          <RouteHistory />
        </Suspense>
      </HelpSearchProvider>
    </AuthGate>
  )
}
