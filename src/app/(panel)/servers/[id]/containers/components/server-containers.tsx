"use client"

import { DockerActionsProvider } from "@/app/(panel)/containers/components/docker-actions"
import { DockerView } from "@/app/(panel)/containers/components/docker-view"
import { useServerPage } from "../../components/server-page"

// The server's Docker, the same view as /containers/[server]; it sits outside
// the containers layout, so it brings its own actions provider.
export function ServerContainers() {
  const { server, phone } = useServerPage()
  return (
    <DockerActionsProvider>
      <DockerView server={server} phone={phone} />
    </DockerActionsProvider>
  )
}
