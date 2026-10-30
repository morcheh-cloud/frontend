import { AppSidebar } from "@/components/panel/app-sidebar"
import { PanelHeader } from "@/components/panel/panel-header"
import { TabBar } from "@/components/panel/tab-bar"
import { WorkspaceProvider } from "@/components/panel/workspace"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

// The admin panel shell. Desktop: shadcn's collapsible sidebar at the start
// edge, and beside it a slim header over the page body, scrolling with the
// document. Phone: the page fills the screen above a bottom tab bar.
export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="pb-[calc(--spacing(16)+env(safe-area-inset-bottom))] md:pb-0">
          <PanelHeader />
          {children}
        </SidebarInset>
        <TabBar />
      </SidebarProvider>
    </WorkspaceProvider>
  )
}
