"use client"

import { History, MonitorPlay } from "lucide-react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { recordingsItem } from "@/components/panel/nav"
import { SectionLinks } from "@/components/panel/section-links"
import { useRouteTab } from "@/hooks/useRouteTab"
import { auditPages, clearedFilters, useCommandFilters } from "./command-meta"
import { CommandsBrowser } from "./commands-browser"
import { RecordingsBrowser } from "./recordings-browser"
import { SignInsBrowser } from "./sign-ins-browser"

// The audit log of a workspace or one server (its tab): Commands (every
// command Morche ran), Recordings (terminal replays) and, panel-wide only,
// Sign-ins (who signed in to the panel, from where). Panel-wide each is its
// own page (`auditPages`, the sidebar's children); a server's tab switches
// them in the URL.
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
  const page = useRouteTab(auditPages)
  // Sign-ins belong to the panel, not to a server.
  const tab = !serverId
    ? page
    : filters.tab === "sign-ins"
      ? "commands"
      : filters.tab
  const tabs = !serverId ? (
    phone && <SectionLinks item={recordingsItem} className="-mx-4" />
  ) : (
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
