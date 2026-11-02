import { DatabaseActionsProvider } from "./components/database-actions"

// The list and every database page share one set of dialogs (add, edit,
// credentials, remove), so a flow started on one survives navigation.
export default function DatabasesLayout({
  children,
}: LayoutProps<"/databases">) {
  return <DatabaseActionsProvider>{children}</DatabaseActionsProvider>
}
