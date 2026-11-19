import { Suspense } from "react"

import { AssetActionsProvider } from "./components/asset-actions"

// Every dialog (delete, bulk change, import, relate), shared by the pages.
export default function AssetsLayout({ children }: LayoutProps<"/assets">) {
  return (
    <Suspense>
      <AssetActionsProvider>{children}</AssetActionsProvider>
    </Suspense>
  )
}
