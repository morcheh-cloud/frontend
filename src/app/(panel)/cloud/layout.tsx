import { CloudActionsProvider } from "./components/cloud-actions"

export default function CloudLayout({ children }: LayoutProps<"/cloud">) {
  return <CloudActionsProvider>{children}</CloudActionsProvider>
}
