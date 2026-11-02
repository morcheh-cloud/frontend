"use client"

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type { PanelUser } from "@/lib/services"

const statuses = ["all", "pending", "active", "blocked"] as const
export type StatusTab = (typeof statuses)[number]

export function useMemberFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      status: parseAsStringLiteral(statuses).withDefault("all"),
      q: parseAsString.withDefault(""),
    },
    { history: "replace" },
  )
  return { filters, setFilters }
}

export const statusTabs: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
]

export const statusMeta: Record<
  PanelUser["status"],
  { label: string; tone: "success" | "warning" | "muted" }
> = {
  active: { label: "Active", tone: "success" },
  pending: { label: "Waiting for approval", tone: "warning" },
  blocked: { label: "Blocked", tone: "muted" },
}

export const roleLabel = (user: PanelUser) =>
  user.role === "admin" ? "Admin" : "Member"

export const displayName = (user: PanelUser) =>
  user.full_name || user.first_name || user.username

export const accessHref = (id: string) => `/settings/members/${id}/access`
