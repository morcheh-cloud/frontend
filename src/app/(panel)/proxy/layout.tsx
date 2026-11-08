import { ProxyActionsProvider } from "./components/proxy-actions"

// The list, a proxy's page and a site's page share one set of dialogs, so a
// flow started on one (add proxy → its page) survives navigation.
export default function ProxyLayout({ children }: LayoutProps<"/proxy">) {
  return <ProxyActionsProvider>{children}</ProxyActionsProvider>
}
