import { parseAsStringLiteral, useQueryStates } from "nuqs"

import { insightRanges } from "@/components/insights/format"

export const serversTabs = ["servers", "insights"] as const

// /servers?tab=insights&range=30d (kept apart from the list's filters, so
// switching tabs leaves them alone).
export const serversPageTab = {
  tab: parseAsStringLiteral(serversTabs).withDefault("servers"),
  range: parseAsStringLiteral(insightRanges).withDefault("7d"),
}

export const useServersPageTab = () =>
  useQueryStates(serversPageTab, { history: "replace" })
