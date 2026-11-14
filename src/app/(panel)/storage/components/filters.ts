import { parseAsStringLiteral, useQueryStates } from "nuqs"

import { insightRanges } from "@/components/insights/format"

export const storageTabs = [
  "insights",
  "storages",
  "syncs",
  "migrations",
] as const

// /storage?tab=storages|syncs|migrations · /storage?range=30d (Insights is
// the default tab)
export const storagePageFilters = {
  tab: parseAsStringLiteral(storageTabs).withDefault("insights"),
  range: parseAsStringLiteral(insightRanges).withDefault("7d"),
}

export const useStoragePageFilters = () =>
  useQueryStates(storagePageFilters, { history: "replace" })
