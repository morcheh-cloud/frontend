"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { EventType } from "@/lib/services"

// The panel's event types (alert fired, server offline, deploy failed…), as
// the backend's catalog lists them, each with a sample event. Webhooks send
// them out; automations react to them.

// Rarely changes: kept for the session.
export function useEventCatalog() {
  return useQuery({
    queryKey: ["events", "catalog"],
    queryFn: () => api.events.getEventCatalog(),
    select: (d) => d.items,
    staleTime: 60 * 60_000,
  })
}

export type EventGroup = { name: string; types: EventType[] }

// Which types a picker offers: webhooks take every type but test.ping (Send a
// test sends it); automations only those that may start one (not internal).
export type CatalogUse = "webhooks" | "automations"

export const offered = (t: EventType, use: CatalogUse) =>
  use === "automations" ? !t.internal : t.name !== "test.ping"

// Catalog types grouped as the backend groups them, in its order.
export function groupsOf(catalog: EventType[], use: CatalogUse = "webhooks") {
  const groups: EventGroup[] = []
  for (const t of catalog) {
    if (!offered(t, use)) continue
    let g = groups.find((x) => x.name === t.group)
    if (!g) {
      g = { name: t.group, types: [] }
      groups.push(g)
    }
    g.types.push(t)
  }
  return groups
}

export const eventLabel = (catalog: EventType[] | undefined, name: string) =>
  catalog?.find((t) => t.name === name)?.label ?? name

// The event types picked, by label: "All events" when empty.
export function eventsText(events: string[], catalog: EventType[] | undefined) {
  if (!events.length) return "All events"
  if (events.length <= 2)
    return events.map((n) => eventLabel(catalog, n)).join(", ")
  return `${eventLabel(catalog, events[0])} +${events.length - 1}`
}

export const severityTone: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  info: "bg-muted text-muted-foreground",
}
