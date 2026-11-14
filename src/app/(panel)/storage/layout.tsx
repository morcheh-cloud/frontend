import { StorageActionsProvider } from "./components/storage-actions"
import { SyncActionsProvider } from "./syncs/components/sync-actions"

// The list and every storage page share one set of dialogs (add, edit,
// remove, trust host key; run, pause or delete a sync), so a flow started on
// one survives navigation.
export default function StorageLayout({ children }: LayoutProps<"/storage">) {
  return (
    <StorageActionsProvider>
      <SyncActionsProvider>{children}</SyncActionsProvider>
    </StorageActionsProvider>
  )
}
