"use client"

import { History, MonitorPlay } from "lucide-react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { clearedFilters, useCommandFilters } from "./command-meta"
import { CommandsBrowser } from "./commands-browser"
import { RecordingsBrowser } from "./recordings-browser"

// The audit log of a workspace (/recordings) or one server (its tab):
// Commands (every command Morcheh ran) and Recordings (terminal replays).
export function AuditBrowser({
  workspace,
  serverId,
  serverName,
  phone,
}: {
  workspace: { id: string; name: string }
  serverId?: string
  serverName?: string
  phone: boolean
}) {
  const [{ tab }, setFilters] = useCommandFilters()
  const tabs = (
    <Segmented
      label="Audit log"
      items={[
        {
          value: "commands" as const,
          label: (
            <span className="flex items-center gap-1.5">
              <History className="size-4" />
              Commands
            </span>
          ),
        },
        {
          value: "recordings" as const,
          label: (
            <span className="flex items-center gap-1.5">
              <MonitorPlay className="size-4" />
              Recordings
            </span>
          ),
        },
      ]}
      value={tab}
      onChange={(t) =>
        // Each tab has its own filters; none carry over.
        setFilters({ ...clearedFilters, tab: t === "commands" ? null : t })
      }
    />
  )
  return tab === "recordings" ? (
    <RecordingsBrowser
      workspace={workspace}
      serverId={serverId}
      phone={phone}
      leading={tabs}
    />
  ) : (
    <CommandsBrowser
      workspace={workspace}
      serverId={serverId}
      serverName={serverName}
      phone={phone}
      leading={tabs}
    />
  )
}
