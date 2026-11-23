"use client"

import { parseAsStringLiteral, useQueryStates } from "nuqs"

import { Segmented } from "../../components/parts"
import { ClockTab } from "./clock-tab"
import { SourcesTab } from "./sources-tab"

const tabs = ["time", "sources"] as const
type Tab = (typeof tabs)[number]

function useSystemTab() {
  const [f, set] = useQueryStates(
    { tab: parseAsStringLiteral(tabs).withDefault("time") },
    { history: "replace" },
  )
  return [f.tab, (t: Tab) => set({ tab: t === "time" ? null : t })] as const
}

export function SystemTabs() {
  const [tab, setTab] = useSystemTab()
  return (
    <Segmented
      label="Show"
      items={[
        { value: "time", label: "Name & time" },
        { value: "sources", label: "Package sources" },
      ]}
      value={tab}
      onChange={setTab}
    />
  )
}

export function SystemView() {
  const [tab] = useSystemTab()
  return (
    <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
      {tab === "sources" ? <SourcesTab /> : <ClockTab />}
    </div>
  )
}
