"use client"

import {
  createSerializer,
  type inferParserType,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import { useCallback } from "react"

import type { Server } from "@/lib/services"
import { type ListQuery, PAGE_SIZE } from "../api"

export const sortFields = [
  "name",
  "host",
  "os",
  "status",
  "last_checked",
  "created",
] as const
export type SortField = (typeof sortFields)[number]

export const statuses = [
  "online",
  "unreachable",
  "auth_failed",
  "host_key_mismatch",
  "error",
  "unknown",
] as const satisfies Server["status"][]

export const authMethods = ["password", "private_key"] as const

type Nullable<T> = { [K in keyof T]: T[K] | null }

const list = parseAsArrayOf(parseAsString).withDefault([])

// The page's whole view state, kept in the URL so a filtered view can be
// bookmarked, shared and survives a reload.
const parsers = {
  q: parseAsString.withDefault(""),
  // Unset = the top level, like Drive's root: the top folders and the servers
  // outside every folder. A folder id = inside it. "all" = every server, flat.
  folder: parseAsString,
  favorites: parseAsBoolean.withDefault(false),
  os: list,
  status: parseAsArrayOf(parseAsStringLiteral(statuses)).withDefault([]),
  tag: list,
  auth: parseAsArrayOf(parseAsStringLiteral(authMethods)).withDefault([]),
  sort: parseAsStringLiteral(sortFields).withDefault("name"),
  order: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
  page: parseAsInteger.withDefault(1),
}

// Builds links into a filtered list, e.g. serversHref("/servers", { tag: [t] }).
export const serversHref = createSerializer(parsers)

export type Filters = inferParserType<typeof parsers>

// Where the page is. Favorites and All servers are flat lists, the top level
// and folders are places you browse.
export function placeOf(f: Filters) {
  if (f.favorites) return "favorites"
  if (f.folder === "all") return "all"
  return f.folder ? "folder" : "root"
}

// The open folder; new servers and folders land in it.
export const folderIdOf = (f: Filters) =>
  placeOf(f) === "folder" ? f.folder : null

export const filterCount = (f: Filters) =>
  f.os.length + f.status.length + f.tag.length + f.auth.length

// Search or any filter narrows the list (folder views don't count). Like a
// Drive search it then reaches past the current level: the whole subtree of
// the open folder, or every server from the top level.
const isNarrowed = (f: Filters) => filterCount(f) > 0 || f.q !== ""

// Browsing a level: its folders show as cards and the list holds only what's
// directly here. Otherwise the list is flat and each row names its folder.
export const isBrowsing = (f: Filters) =>
  !isNarrowed(f) && (placeOf(f) === "root" || placeOf(f) === "folder")

export function useFilters() {
  const [filters, setRaw] = useQueryStates(parsers, { history: "replace" })

  // Any change other than paging starts again from page one.
  const setFilters = useCallback(
    (patch: Partial<Nullable<typeof filters>>) =>
      setRaw({ page: null, ...patch }),
    [setRaw],
  )

  // Going to a place pushes a history entry, so Back climbs out of a folder
  // the way it does in Drive. No argument = the top level.
  const open = useCallback(
    (place: { folder?: string | null; favorites?: boolean } = {}) =>
      setRaw(
        {
          page: null,
          q: null,
          folder: place.folder ?? null,
          favorites: place.favorites ?? null,
        },
        { history: "push" },
      ),
    [setRaw],
  )

  function clearFilters() {
    setFilters({ q: null, os: null, status: null, tag: null, auth: null })
  }

  return {
    filters,
    setFilters,
    open,
    setPage: (page: number) => setRaw({ page: page > 1 ? page : null }),
    activeCount: filterCount(filters),
    narrowed: isNarrowed(filters),
    clearFilters,
  }
}

// The list's reach for the place and filters: see isNarrowed and isBrowsing.
function reach(f: Filters): Pick<ListQuery, "folder" | "direct"> {
  const id = folderIdOf(f) ?? undefined
  if (isBrowsing(f))
    return id ? { folder: id, direct: true } : { folder: "none" }
  return { folder: id }
}

// Empty arrays become undefined: the generated client would otherwise send
// nothing anyway, but this keeps the query keys stable.
export function toQuery(f: Filters, paged = true): ListQuery {
  const arr = <T>(a: T[]) => (a.length ? a : undefined)
  return {
    q: f.q || undefined,
    ...reach(f),
    favorites: f.favorites || undefined,
    os: arr(f.os),
    status: arr(f.status),
    tag: arr(f.tag),
    auth: arr(f.auth),
    sort: f.sort,
    order: f.order,
    ...(paged && { limit: PAGE_SIZE, offset: (f.page - 1) * PAGE_SIZE }),
  }
}
