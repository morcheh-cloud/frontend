import { VmActionsProvider } from "./components/vm-actions"

// The list, a machine's page and the create page share one set of dialogs, so
// a flow started on one (clone → the new machine) survives navigation.
export default function VmsLayout({ children }: LayoutProps<"/vms">) {
  return <VmActionsProvider>{children}</VmActionsProvider>
}
