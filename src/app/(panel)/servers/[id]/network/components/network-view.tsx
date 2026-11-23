"use client"

import { parseAsStringLiteral, useQueryStates } from "nuqs"
import type { ReactNode } from "react"

import { Segmented } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { DnsTab } from "./dns-tab"
import { HostsTab } from "./hosts-tab"
import { InterfacesTab } from "./interfaces-tab"

const tabs = ["interfaces", "dns", "hosts"] as const
type Tab = (typeof tabs)[number]

export function useNetworkTab() {
  const [f, set] = useQueryStates(
    { tab: parseAsStringLiteral(tabs).withDefault("interfaces") },
    { history: "replace" },
  )
  return [
    f.tab,
    (t: Tab) => set({ tab: t === "interfaces" ? null : t }),
  ] as const
}

// Interfaces, DNS and /etc/hosts. Each tab draws its own bar: the tabs come
// first in it, then that tab's state and actions.
export function NetworkView() {
  const [tab] = useNetworkTab()
  return (
    <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
      {tab === "dns" ? (
        <DnsTab />
      ) : tab === "hosts" ? (
        <HostsTab />
      ) : (
        <InterfacesTab />
      )}
    </div>
  )
}

export function NetworkTabs() {
  const [tab, setTab] = useNetworkTab()
  return (
    <Segmented
      label="Show"
      items={[
        { value: "interfaces", label: "Interfaces" },
        { value: "dns", label: "DNS" },
        { value: "hosts", label: "Hosts file" },
      ]}
      value={tab}
      onChange={setTab}
    />
  )
}

// One toolbar row on desktop; phones stack the tabs over the actions.
export function ConfigBar({
  tabs,
  status,
  actions,
}: {
  tabs: ReactNode
  status?: ReactNode
  actions?: ReactNode
}) {
  const { phone } = useServerPage()
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {tabs}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
            {status}
          </div>
          {actions}
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {tabs}
      <div className="ms-2 min-w-0 truncate text-caption text-muted-foreground">
        {status}
      </div>
      <div className="ms-auto flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  )
}
