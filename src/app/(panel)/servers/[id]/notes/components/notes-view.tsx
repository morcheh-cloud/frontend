"use client"

import {
  ChevronRight,
  NotebookPen,
  Pin,
  Plus,
  RefreshCw,
  SearchX,
  TriangleAlert,
} from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import type { MouseEvent, ReactNode } from "react"

import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import type { ServerNote } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  ItemMenu,
  Loading,
  SearchBox,
  Segmented,
} from "../../components/parts"
import { SectionActions } from "../../components/section-actions"
import { useServerPage } from "../../components/server-page"
import { noteTitle, useServerNotes } from "../api"
import { NoteByline } from "./note-byline"
import { NotesActionsProvider, useNotesActions } from "./notes-actions"

const filterParsers = {
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(["pinned"] as const),
}

function useNotesFilters() {
  const [filters, setFilters] = useQueryStates(filterParsers, {
    history: "replace",
  })
  return { filters, setFilters }
}

// Every word must appear in the title or the text.
function matches(n: ServerNote, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const text = `${n.title}\n${n.body}`.toLowerCase()
  return words.every((w) => text.includes(w))
}

export function NotesView() {
  const { server, phone } = useServerPage()
  const query = useServerNotes(server.id)

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={query.isFetching}
      onClick={() => query.refetch()}
    >
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
    </Button>
  )

  if (!query.data) {
    return (
      <>
        <SectionActions>{refresh}</SectionActions>
        <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
          {query.error ? (
            <Empty
              icon={TriangleAlert}
              title="Couldn't load the notes"
              body={query.error.message}
              className="max-md:mt-4"
              action={
                <Button variant="outline" onClick={() => query.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : (
            <Loading phone={phone} />
          )}
        </div>
      </>
    )
  }

  return (
    <NotesActionsProvider notes={query.data.items}>
      <Content refresh={refresh} />
    </NotesActionsProvider>
  )
}

function Content({ refresh }: { refresh: ReactNode }) {
  const { phone } = useServerPage()
  const a = useNotesActions()
  const { filters, setFilters } = useNotesFilters()

  const shown = a.notes.filter(
    (n) => (filters.show !== "pinned" || n.pinned) && matches(n, filters.q),
  )
  const filtering = !!filters.q || filters.show === "pinned"

  let body: ReactNode
  if (a.notes.length === 0) {
    body = (
      <Empty
        icon={NotebookPen}
        title="No notes yet"
        body="Write down what the next person should know: what runs here, who to ask, its quirks, the last incident. Notes take Markdown, and a pinned one shows on the overview."
        className="max-md:mt-4"
        action={
          a.canWrite && (
            <Button className="max-md:h-11 max-md:w-full" onClick={a.create}>
              <Plus />
              Write the first note
            </Button>
          )
        }
      />
    )
  } else if (shown.length === 0) {
    body = (
      <Empty
        icon={SearchX}
        title="No matching notes"
        body="Try other words, or show every note."
        className="max-md:mt-4"
        action={
          <Button
            variant="outline"
            className="max-md:h-11 max-md:w-full"
            onClick={() => setFilters({ q: null, show: null })}
          >
            Clear filters
          </Button>
        }
      />
    )
  } else if (phone) {
    body = <NoteList notes={shown} />
  } else {
    body = <NoteCards notes={shown} />
  }

  return (
    <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
      {(a.notes.length > 0 || filtering) && <Bar refresh={refresh} />}
      {a.notes.length === 0 && <SectionActions>{refresh}</SectionActions>}
      {body}
    </div>
  )
}

// Search, All / Pinned, Refresh and New note in one row. Phones: search with
// the icon buttons, then the chip row.
function Bar({ refresh }: { refresh: ReactNode }) {
  const { phone } = useServerPage()
  const a = useNotesActions()
  const { filters, setFilters } = useNotesFilters()
  const pinned = a.notes.filter((n) => n.pinned).length

  const search = (
    <SearchBox
      value={filters.q}
      onChange={(q) => setFilters({ q: q || null })}
      placeholder="Search notes"
      label="Search notes"
      className="min-w-0 flex-1 md:max-w-72 md:min-w-36"
    />
  )
  const show = (
    <Segmented
      label="Notes to show"
      items={[
        { value: "all", label: `All · ${a.notes.length}` },
        { value: "pinned", label: `Pinned · ${pinned}` },
      ]}
      value={filters.show ?? "all"}
      onChange={(v) => setFilters({ show: v === "pinned" ? "pinned" : null })}
    />
  )
  const add = a.canWrite && (
    <Button
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label="New note"
      onClick={a.create}
    >
      <Plus />
      {!phone && "New note"}
    </Button>
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          {search}
          {refresh}
          {add}
        </div>
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {show}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {search}
      {show}
      <div className="ms-auto flex shrink-0 items-center gap-2">
        {refresh}
        {add}
      </div>
    </div>
  )
}

// Desktop: cards with the note rendered, long ones faded out; the title (or a
// click anywhere outside a link) opens it in full.
function NoteCards({ notes }: { notes: ServerNote[] }) {
  return (
    <div className="@container">
      <ul className="grid items-start gap-4 @3xl:grid-cols-2 @7xl:grid-cols-3">
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} />
        ))}
      </ul>
    </div>
  )
}

function NoteCard({ note }: { note: ServerNote }) {
  const a = useNotesActions()
  const long = note.body.length > 700 || note.body.split("\n").length > 16

  function open(e: MouseEvent) {
    // Links, the menu and selected text keep their own meaning.
    if ((e.target as HTMLElement).closest("a, button, input")) return
    if (window.getSelection()?.toString()) return
    a.view(note)
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the title button is the keyboard way in
    <li
      onClick={open}
      className="group flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        {note.pinned && (
          <Pin
            className="mt-0.5 size-4 shrink-0 text-brand"
            aria-label="Pinned"
          />
        )}
        <button
          type="button"
          onClick={() => a.view(note)}
          className="min-w-0 flex-1 text-start text-body font-medium break-words outline-none focus-visible:underline"
        >
          {noteTitle(note)}
        </button>
        <div className="-me-2 -mt-1.5">
          <ItemMenu groups={a.menu(note)} label="Note actions" />
        </div>
      </div>
      {note.body.trim() && (note.title.trim() || long) && (
        <div
          className={cn(
            "mt-2 overflow-hidden",
            long &&
              "max-h-72 [mask-image:linear-gradient(to_bottom,black_70%,transparent)]",
          )}
        >
          <Markdown>{note.body}</Markdown>
        </div>
      )}
      {note.body.trim() && !note.title.trim() && !long && (
        // Untitled: the first line is the title, so show the rest.
        <Rest body={note.body} />
      )}
      <NoteByline note={note} className="mt-4" />
    </li>
  )
}

// The body without the line the card already used as its title.
function Rest({ body }: { body: string }) {
  const lines = body.split("\n")
  const first = lines.findIndex((l) => l.trim())
  const rest = lines
    .slice(first + 1)
    .join("\n")
    .trim()
  if (!rest) return null
  return (
    <div className="mt-2">
      <Markdown>{rest}</Markdown>
    </div>
  )
}

// Phones: native rows, title + a line of text + byline; a tap opens the note.
function NoteList({ notes }: { notes: ServerNote[] }) {
  const a = useNotesActions()
  return (
    <ul className="mt-3 divide-y divide-border border-y border-border">
      {notes.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => a.view(n)}
            className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start active:bg-muted"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-medium">
                {n.pinned && (
                  <Pin
                    className="size-3.5 shrink-0 text-brand"
                    aria-label="Pinned"
                  />
                )}
                <span className="truncate">{noteTitle(n)}</span>
              </p>
              <Preview note={n} />
              <NoteByline note={n} className="mt-0.5" />
            </div>
            <ChevronRight className="size-4 shrink-0 text-ash" />
          </button>
        </li>
      ))}
    </ul>
  )
}

// One line of plain text from the body, Markdown marks stripped.
function Preview({ note }: { note: ServerNote }) {
  const lines = note.body
    .split("\n")
    .map((l) =>
      l
        .replace(/^[#>*\-\s\d.[\]x]+/i, "")
        .replace(/[*_`~]/g, "")
        .trim(),
    )
    .filter(Boolean)
  const text = (note.title.trim() ? lines : lines.slice(1)).join(" · ")
  if (!text) return null
  return (
    <p className="mt-0.5 truncate text-body-sm text-muted-foreground">{text}</p>
  )
}
