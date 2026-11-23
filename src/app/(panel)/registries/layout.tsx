import { RegistryActionsProvider } from "./components/registry-actions"

export default function RegistriesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RegistryActionsProvider>{children}</RegistryActionsProvider>
}
