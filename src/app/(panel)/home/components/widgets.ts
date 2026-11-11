"use client"

import { useState } from "react"

// The cards Home can show. Each person picks theirs (Customize); the choice
// is kept on this browser. "Needs attention" can't be hidden: problems always
// show.

export const widgets = [
  { id: "pulse", label: "Health and key numbers" },
  { id: "sections", label: "Sections" },
  { id: "performance", label: "Availability and performance" },
  { id: "fleet", label: "Server resources" },
  { id: "servers", label: "Favorite servers" },
  { id: "services", label: "Services" },
  { id: "activity", label: "Activity" },
  { id: "monitors", label: "Uptime monitors" },
  { id: "traffic", label: "Web traffic" },
  { id: "tasks", label: "Tasks" },
  { id: "upcoming", label: "Coming up" },
] as const

export type WidgetId = (typeof widgets)[number]["id"]

const KEY = "morcheh.home.widgets"
const known = new Set<string>(widgets.map((w) => w.id))

function read(): WidgetId[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    return Array.isArray(saved)
      ? (saved.filter((id) => known.has(id)) as WidgetId[])
      : []
  } catch {
    return []
  }
}

function write(hidden: WidgetId[]) {
  try {
    if (hidden.length) localStorage.setItem(KEY, JSON.stringify(hidden))
    else localStorage.removeItem(KEY)
  } catch {}
}

export function useHomeLayout() {
  const [hidden, setHidden] = useState<WidgetId[]>(read)
  const update = (next: WidgetId[]) => {
    setHidden(next)
    write(next)
  }
  return {
    shows: (id: WidgetId) => !hidden.includes(id),
    hiddenCount: hidden.length,
    set: (id: WidgetId, on: boolean) =>
      update(on ? hidden.filter((h) => h !== id) : [...hidden, id]),
    reset: () => update([]),
  }
}

export type HomeLayout = ReturnType<typeof useHomeLayout>
