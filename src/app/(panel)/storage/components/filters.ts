import { parseAsStringLiteral, useQueryStates } from "nuqs"

import { insightRanges } from "@/components/insights/format"

export const storageTabs = ["storages", "insights"] as const

// /storage?tab=insights&range=30d
export const storagePageFilters = {
  tab: parseAsStringLiteral(storageTabs).withDefault("storages"),
  range: parseAsStringLiteral(insightRanges).withDefault("7d"),
}

export const useStoragePageFilters = () =>
  useQueryStates(storagePageFilters, { history: "replace" })
