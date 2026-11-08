"use client"

import type { ReactNode } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { Proxy as ReverseProxy } from "@/lib/services"
import {
  type ProxyTab,
  proxyTabLabels,
  proxyTabs,
  useProxyPageFilters,
} from "../../components/meta"
import { chipClass } from "../../components/parts"
import { useProxyCan } from "../../components/permissions"

// Reading the server only makes sense while it answers and the proxy is in.
export const inspectable = (p: ReverseProxy) =>
  p.status !== "unreachable" && p.status !== "not_installed"

export function useTab(p: ReverseProxy) {
  const can = useProxyCan()
  const [{ tab }, setFilters] = useProxyPageFilters()
  // Logs need Operator; the rest is for every reader.
  const tabs = proxyTabs.filter((t) => t !== "logs" || can(p, "operator"))
  return {
    tab: tabs.includes(tab) ? tab : ("sites" as const),
    tabs,
    setTab: (t: ProxyTab) => setFilters({ tab: t, q: null }),
  }
}

// One toolbar row: the page's tabs, then the tab's own search, filters and
// buttons. Phones stack the tabs as a chip row under the tab's controls.
export function Toolbar({
  proxy,
  children,
}: {
  proxy: ReverseProxy
  children?: ReactNode
}) {
  const t = useTab(proxy)
  const phone = useIsPhone()
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
        {children && <div className="flex items-center gap-2">{children}</div>}
        <nav
          aria-label="Sections"
          className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4"
        >
          {t.tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-current={t.tab === tab ? "page" : undefined}
              onClick={() => t.setTab(tab)}
              className={chipClass}
            >
              {proxyTabLabels[tab]}
            </button>
          ))}
        </nav>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <Segmented
        label="Sections"
        value={t.tab}
        onChange={t.setTab}
        items={t.tabs.map((tab) => ({
          value: tab,
          label: proxyTabLabels[tab],
        }))}
      />
      {children}
    </div>
  )
}
