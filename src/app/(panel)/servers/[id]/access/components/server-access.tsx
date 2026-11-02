"use client"

import { ResourceAccess } from "@/components/access/grants"
import { useServerPage } from "../../components/server-page"

// Who can reach this server through Morcheh. The server's own accounts are in
// the Users section.
export function ServerAccess() {
  const { server } = useServerPage()
  return (
    <div className="w-full px-4 py-5 md:px-0">
      <ResourceAccess
        scope={{ server_id: server.id }}
        kind="server"
        workspaceId={server.workspace_id}
      />
    </div>
  )
}
