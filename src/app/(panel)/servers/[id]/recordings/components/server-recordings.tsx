"use client"

import { RecordingsActionsProvider } from "@/app/(panel)/recordings/components/recordings-actions"
import { RecordingsBrowser } from "@/app/(panel)/recordings/components/recordings-browser"
import { useWorkspace } from "@/components/panel/workspace"
import { cn } from "@/lib/utils"
import { useServerPage } from "../../components/server-page"

// A server's Recordings tab: the terminals opened on it, to replay.
export function ServerRecordingsView() {
  const { server, phone } = useServerPage()
  const { workspaces } = useWorkspace()
  const name = workspaces.find((w) => w.id === server.workspace_id)?.name ?? ""
  return (
    <RecordingsActionsProvider>
      <div className={cn("flex flex-col", phone ? "pt-4 pb-6" : "gap-4")}>
        <RecordingsBrowser
          workspace={{ id: server.workspace_id, name }}
          serverId={server.id}
          phone={phone}
        />
      </div>
    </RecordingsActionsProvider>
  )
}
