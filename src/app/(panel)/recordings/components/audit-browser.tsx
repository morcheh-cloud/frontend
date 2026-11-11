"use client"

import { History, LogIn, MonitorPlay } from "lucide-react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { clearedFilters, useCommandFilters } from "./command-meta"
import { CommandsBrowser } from "./commands-browser"
import { RecordingsBrowser } from "./recordings-browser"
import { SignInsBrowser } from "./sign-ins-browser"

// The audit log of a workspace (/recordings) or one server (its tab):
// Commands (every command Morche ran), Recordings (terminal replays) and,
// panel-wide only, Sign-ins (who signed in to the panel, from where).
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
  const [filters, setFilters] = useCommandFilters()
  // Sign-ins belong to the panel, not to a server.
  const tab = serverId && filters.tab === "sign-ins" ? "commands" : filters.tab
  const tabs = (
    <Segmented
      label="Audit log"
      items={[
        {
          value: "commands" as const,
          label: (
            <span className="flex items-center gap-1.5">
              <History className="size-4 max-sm:hidden" />
              Commands
            </span>
          ),
        },
        {
          value: "recordings" as const,
          label: (
            <span className="flex items-center gap-1.5">
              <MonitorPlay className="size-4 max-sm:hidden" />
              Recordings
            </span>
          ),
        },
        ...(serverId
          ? []
          : [
              {
                value: "sign-ins" as const,
                label: (
                  <span className="flex items-center gap-1.5">
                    <LogIn className="size-4 max-sm:hidden" />
                    Sign-ins
                  </span>
                ),
              },
            ]),
      ]}
      value={tab}
      onChange={(t) =>
        // Each tab has its own filters; none carry over.
        setFilters({ ...clearedFilters, tab: t === "commands" ? null : t })
      }
    />
  )
  if (tab === "sign-ins") return <SignInsBrowser phone={phone} leading={tabs} />
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
