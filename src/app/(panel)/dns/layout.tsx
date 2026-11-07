import { DnsActionsProvider } from "./components/dns-actions"

// The list, a server's page and a zone's page share one set of dialogs, so a
// flow started on one (new zone → its records) survives navigation.
export default function DnsLayout({ children }: LayoutProps<"/dns">) {
  return <DnsActionsProvider>{children}</DnsActionsProvider>
}
