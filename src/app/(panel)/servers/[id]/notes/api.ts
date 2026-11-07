"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { type ApiError, api } from "@/lib/api"
import type { ServerNote } from "@/lib/services"

export const notesKeys = {
  list: (serverId: string) => ["server-notes", serverId] as const,
}

type List = { items: ServerNote[] }

// Pinned first, then the most recently changed (the backend's order).
function sorted(items: ServerNote[]) {
  return [...items].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.updated_at.localeCompare(a.updated_at),
  )
}

export function useServerNotes(serverId: string, enabled = true) {
  return useQuery({
    queryKey: notesKeys.list(serverId),
    queryFn: () => api.serverNotes.listServerNotes(serverId),
    enabled,
    staleTime: 30_000,
  })
}

export type NoteChange =
  | { kind: "create"; title: string; body: string; pinned: boolean }
  | {
      kind: "update"
      id: string
      title: string
      body: string
      pinned: boolean
      // The note's updated_at when the editor opened; null = overwrite.
      revision: string | null
    }
  | { kind: "pin"; id: string; pinned: boolean }

// Every write answers the note as saved; it goes straight into the list.
export function useNoteChange(serverId: string) {
  const qc = useQueryClient()
  return useMutation<ServerNote, ApiError, NoteChange>({
    mutationFn: (c) => {
      switch (c.kind) {
        case "create":
          return api.serverNotes.createServerNote(serverId, {
            title: c.title,
            body: c.body,
            pinned: c.pinned,
          })
        case "update":
          return api.serverNotes.updateServerNote(serverId, c.id, {
            title: c.title,
            body: c.body,
            pinned: c.pinned,
            ...(c.revision ? { revision: c.revision } : {}),
          })
        case "pin":
          return api.serverNotes.pinServerNote(serverId, c.id, {
            pinned: c.pinned,
          })
      }
    },
    onSuccess: (note) =>
      qc.setQueryData<List>(notesKeys.list(serverId), (old) => ({
        items: sorted([
          note,
          ...(old?.items ?? []).filter((n) => n.id !== note.id),
        ]),
      })),
  })
}

export function useDeleteNote(serverId: string) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: (id) => api.serverNotes.deleteServerNote(serverId, id),
    onSuccess: (_, id) =>
      qc.setQueryData<List>(notesKeys.list(serverId), (old) =>
        old ? { items: old.items.filter((n) => n.id !== id) } : old,
      ),
  })
}

// What a note is called in lists: its title, else its first line.
export function noteTitle(n: Pick<ServerNote, "title" | "body">) {
  if (n.title.trim()) return n.title.trim()
  const line = n.body
    .split("\n")
    .map((l) => l.replace(/^[#>*\-\s\d.[\]x]+/i, "").trim())
    .find(Boolean)
  return line ? line.slice(0, 80) : "Untitled note"
}
