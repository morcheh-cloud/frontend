import { ServerActionsProvider } from "./components/server-actions"

// The list and every server page share one set of dialogs and sheets (add,
// edit, move, tags, delete…), so a flow started on one survives navigation.
export default function ServersLayout({ children }: LayoutProps<"/servers">) {
  return <ServerActionsProvider>{children}</ServerActionsProvider>
}
