import { StorageActionsProvider } from "./components/storage-actions"

// The list and every storage page share one set of dialogs (add, edit,
// remove, trust host key), so a flow started on one survives navigation.
export default function StorageLayout({ children }: LayoutProps<"/storage">) {
  return <StorageActionsProvider>{children}</StorageActionsProvider>
}
