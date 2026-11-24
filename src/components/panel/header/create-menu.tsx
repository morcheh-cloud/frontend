"use client"

import { type LucideIcon, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Fragment } from "react"

import { useWorkspaceCan } from "@/app/(panel)/servers/components/permissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { queueIntent } from "@/hooks/useIntent"
import { addCommands, type Command } from "../command/commands"
import {
  alertsItem,
  applicationsItem,
  automationsItem,
  cloudItem,
  cronjobsItem,
  databasesItem,
  dnsItem,
  monitoringItem,
  proxyItem,
  scriptsItem,
  serversItem,
  servicesItem,
  storageItem,
  tunnelsItem,
  vmsItem,
} from "../nav"
import { HeaderIcon, headerIconClass } from "./header-icon"

// The header's + menu: everything that can be created, grouped like the
// sidebar. Same actions as the command palette's (`addCommands`).

type Entry = { key: string; label: string; icon: LucideIcon }

const groups: { label: string; items: Entry[] }[] = [
  {
    label: "Infrastructure",
    items: [
      { key: "add-server", label: "Server", icon: serversItem.icon },
      { key: "new-vm", label: "Virtual machine", icon: vmsItem.icon },
      { key: "add-database", label: "Database", icon: databasesItem.icon },
      { key: "add-storage", label: "Storage", icon: storageItem.icon },
      {
        key: "add-cloud-account",
        label: "Cloud account",
        icon: cloudItem.icon,
      },
      { key: "add-pve-cluster", label: "Proxmox cluster", icon: vmsItem.icon },
    ],
  },
  {
    label: "Network",
    items: [
      { key: "add-proxy", label: "Reverse proxy", icon: proxyItem.icon },
      { key: "add-dns-server", label: "DNS server", icon: dnsItem.icon },
      { key: "add-tunnel", label: "VPN or tunnel", icon: tunnelsItem.icon },
    ],
  },
  {
    label: "Automation",
    items: [
      { key: "run-command", label: "Run a command", icon: scriptsItem.icon },
      { key: "add-script", label: "Script", icon: scriptsItem.icon },
      { key: "add-cronjob", label: "Cron job", icon: cronjobsItem.icon },
      {
        key: "add-automation",
        label: "Automation",
        icon: automationsItem.icon,
      },
      {
        key: "install-application",
        label: "Install an application",
        icon: applicationsItem.icon,
      },
      {
        key: "new-storage-sync",
        label: "Storage sync",
        icon: storageItem.icon,
      },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { key: "add-monitor", label: "Monitor", icon: monitoringItem.icon },
      { key: "add-alert-rule", label: "Alert rule", icon: alertsItem.icon },
      {
        key: "add-alert-channel",
        label: "Alert channel",
        icon: alertsItem.icon,
      },
    ],
  },
  {
    label: "Team",
    items: [{ key: "add-service", label: "Service", icon: servicesItem.icon }],
  },
]

const byKey = new Map(addCommands.map((c) => [c.key, c]))
const commandOf = (key: string) => byKey.get(`action:${key}`)

export function CreateMenu() {
  const canAdd = useWorkspaceCan().addServer
  const router = useRouter()
  if (!canAdd) return null

  const go = (c: Command) => {
    if (c.intent) queueIntent(c.intent)
    if (c.href) router.push(c.href)
  }

  return (
    <DropdownMenu>
      <HeaderIcon
        label="Create"
        render={<DropdownMenuTrigger className={headerIconClass} />}
      >
        <Plus />
      </HeaderIcon>
      <DropdownMenuContent align="end" className="max-h-[70vh] min-w-56">
        {groups.map((group, i) => (
          <Fragment key={group.label}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.items.map((entry) => {
                const c = commandOf(entry.key)
                if (!c) return null
                const Icon = entry.icon
                return (
                  <DropdownMenuItem key={entry.key} onClick={() => go(c)}>
                    <Icon />
                    {entry.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
