"use client"

import {
  createSerializer,
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
  // A folder id, or "none" for servers outside every folder.
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

export function useFilters() {
  const [filters, setRaw] = useQueryStates(parsers, { history: "replace" })

  // Any change other than paging starts again from page one.
  const setFilters = useCallback(
    (patch: Partial<Nullable<typeof filters>>) =>
      setRaw({ page: null, ...patch }),
    [setRaw],
  )

  const activeCount =
    filters.os.length +
    filters.status.length +
    filters.tag.length +
    filters.auth.length

  function clearFilters() {
    setFilters({ q: null, os: null, status: null, tag: null, auth: null })
  }

  return {
    filters,
    setFilters,
    setPage: (page: number) => setRaw({ page: page > 1 ? page : null }),
    activeCount,
    /** Search or any filter narrows the list (folder views don't count). */
    narrowed: activeCount > 0 || filters.q !== "",
    clearFilters,
  }
}

export type Filters = ReturnType<typeof useFilters>["filters"]

// Empty arrays become undefined: the generated client would otherwise send
// nothing anyway, but this keeps the query keys stable.
export function toQuery(f: Filters, paged = true): ListQuery {
  const arr = <T>(a: T[]) => (a.length ? a : undefined)
  return {
    q: f.q || undefined,
    folder: f.folder ?? undefined,
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
