import { TunnelActionsProvider } from "./components/tunnel-actions"

export default function TunnelsLayout({ children }: LayoutProps<"/tunnels">) {
  return <TunnelActionsProvider>{children}</TunnelActionsProvider>
}
