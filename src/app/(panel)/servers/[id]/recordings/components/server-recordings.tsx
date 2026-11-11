"use client"

import { AuditBrowser } from "@/app/(panel)/recordings/components/audit-browser"
import { RecordingsActionsProvider } from "@/app/(panel)/recordings/components/recordings-actions"
import { useWorkspace } from "@/components/panel/workspace"
import { cn } from "@/lib/utils"
import { useServerPage } from "../../components/server-page"

// A server's Audit log tab: the commands run on it and its terminals' replays.
export function ServerRecordingsView() {
  const { server, phone } = useServerPage()
  const { workspaces } = useWorkspace()
  const name = workspaces.find((w) => w.id === server.workspace_id)?.name ?? ""
  return (
    <RecordingsActionsProvider>
      <div className={cn("flex flex-col", phone ? "pt-4 pb-6" : "gap-4")}>
        <AuditBrowser
          workspace={{ id: server.workspace_id, name }}
          serverId={server.id}
          serverName={server.name}
          phone={phone}
        />
      </div>
    </RecordingsActionsProvider>
  )
}
