"use client"

import {
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from "nuqs"

// Where the explorer is: which database inside the connection, which table
// and which view of it. Shared by the Data and Query tabs.
export function useExplorerParams() {
  return useQueryStates(
    {
      db: parseAsString.withDefault(""),
      schema: parseAsString.withDefault(""),
      obj: parseAsString.withDefault(""),
      view: parseAsStringLiteral(["rows", "structure"] as const).withDefault(
        "rows",
      ),
    },
    { history: "push" },
  )
}

export type Draft = {
  text: string
  savedId?: string
  // The saved copy's text and revision, to tell unsaved edits apart.
  savedText?: string
  revision?: string
  title?: string
  description?: string
  shared?: boolean
  pinned?: boolean
  canEdit?: boolean
}

const draftKey = (id: string) => `morche.databases.query.${id}`

export function readDraft(id: string): Draft {
  try {
    const raw = localStorage.getItem(draftKey(id))
    if (raw) return JSON.parse(raw) as Draft
  } catch {}
  return { text: "" }
}

export function writeDraft(id: string, d: Draft) {
  try {
    localStorage.setItem(draftKey(id), JSON.stringify(d))
  } catch {}
}

// Opens text in the Query tab (the draft it reads when it shows).
export function useSendToQuery(id: string) {
  const [, setTab] = useQueryState("tab", { history: "push" })
  return (text: string) => {
    writeDraft(id, { text })
    setTab("query")
  }
}
