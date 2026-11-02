import { Suspense } from "react"
import { AuthGate } from "@/components/auth/auth"
import { JobsProvider } from "@/components/jobs/jobs-provider"
import { AppSidebar } from "@/components/panel/app-sidebar"
import { CommandProvider } from "@/components/panel/command/command-palette"
import { PanelHeader } from "@/components/panel/panel-header"
import { TabBar } from "@/components/panel/tab-bar"
import { WorkspaceProvider } from "@/components/panel/workspace"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { RouteHistory } from "@/hooks/useBack"

// The admin panel shell. Desktop: shadcn's collapsible sidebar at the start
// edge, and beside it a slim header pinned over the page body, which scrolls
// with the document. Phone: the page fills the screen above a bottom tab bar.
// Nothing renders until AuthGate knows an active person is signed in.
export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <WorkspaceProvider>
        <SidebarProvider>
          <JobsProvider>
            <CommandProvider>
              <AppSidebar />
              <SidebarInset className="pb-[calc(--spacing(16)+env(safe-area-inset-bottom))] md:pb-0">
                <PanelHeader />
                {children}
              </SidebarInset>
              <TabBar />
            </CommandProvider>
          </JobsProvider>
          <Suspense>
            <RouteHistory />
          </Suspense>
        </SidebarProvider>
      </WorkspaceProvider>
    </AuthGate>
  )
}
