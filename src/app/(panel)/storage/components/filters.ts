import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import { insightRanges } from "@/components/insights/format"
import { useRouteTab } from "@/hooks/useRouteTab"

// The Storage section's own pages (the sidebar's children of Storage).
// Insights is the section's default page.
export const storagePages = {
  insights: "/storage",
  storages: "/storage/list",
  syncs: "/storage/syncs",
  migrations: "/storage/migrations",
} as const
export type StoragePage = keyof typeof storagePages

export const useStoragePage = () => useRouteTab(storagePages)

// The list page of a kind of sync.
export const syncListHref = (kind: string) =>
  kind === "migrate" ? storagePages.migrations : storagePages.syncs

// /storage?range=30d (Insights)
export const storagePageFilters = {
  range: parseAsStringLiteral(insightRanges).withDefault("7d"),
}

export const useStoragePageFilters = () =>
  useQueryStates(storagePageFilters, { history: "replace" })

// /storage/list, /storage/syncs and /storage/migrations: search + which ones.
// Each page offers its own subset of `show`.
export const listShows = [
  "all",
  "problems",
  "favorites",
  "running",
  "paused",
] as const
export type ListShow = (typeof listShows)[number]

export const storageListFilters = {
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(listShows).withDefault("all"),
}

export const useStorageListFilters = () =>
  useQueryStates(storageListFilters, { history: "replace" })
