import { Suspense } from "react"

import { DockerActionsProvider } from "./components/docker-actions"
import { EnvFromUrl } from "./components/env-from-url"

// Every Containers page shares one set of dialogs and detail layers, so a
// flow started on one survives navigation.
export default function ContainersLayout({
  children,
}: LayoutProps<"/containers">) {
  return (
    <DockerActionsProvider>
      <Suspense>
        <EnvFromUrl />
      </Suspense>
      {children}
    </DockerActionsProvider>
  )
}
