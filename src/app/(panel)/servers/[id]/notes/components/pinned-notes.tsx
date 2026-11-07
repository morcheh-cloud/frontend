"use client"

import { ChevronRight, Pin } from "lucide-react"
import Link from "next/link"

import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { sectionHref } from "../../components/sections"
import { useServerPage } from "../../components/server-page"
import { noteTitle, useServerNotes } from "../api"
import { NoteByline } from "./note-byline"

function usePinned() {
  const { server } = useServerPage()
  const query = useServerNotes(server.id)
  const items = query.data?.items ?? []
  return {
    href: sectionHref(server.id, "notes"),
    total: items.length,
    pinned: items.filter((n) => n.pinned),
    loaded: !!query.data,
  }
}

// Overview card (desktop): the server's description, then its pinned notes.
export function NotesCardBody() {
  const { server } = useServerPage()
  const { href, pinned, loaded } = usePinned()
  return (
    <div className="flex flex-col gap-4">
      {server.description && (
        <p className="text-body-sm whitespace-pre-line">{server.description}</p>
      )}
      {pinned.map((n) => (
        <Link
          key={n.id}
          href={href}
          className="block rounded-lg bg-subtle p-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <p className="flex items-center gap-1.5 text-body-sm font-medium">
            <Pin className="size-3.5 shrink-0 text-brand" aria-hidden />
            <span className="truncate">{noteTitle(n)}</span>
          </p>
          {n.title.trim() && n.body.trim() && (
            <div className="mt-1.5 max-h-40 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
              <Markdown className="text-muted-foreground">{n.body}</Markdown>
            </div>
          )}
          <NoteByline note={n} className="mt-1.5" />
        </Link>
      ))}
      {loaded && !server.description && pinned.length === 0 && (
        <p className="text-body-sm text-ash">
          What runs here, who owns it, anything the next person should know. Pin
          a note and it shows here.
        </p>
      )}
    </div>
  )
}

export function NotesCardAction() {
  const { href, total } = usePinned()
  return (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<Link href={href} />}
    >
      {total > 0 ? `All notes · ${total}` : "Write a note"}
      <ChevronRight className="rtl:rotate-180" />
    </Button>
  )
}

// Phone overview rows: description, then each pinned note.
export function PinnedNoteRows() {
  const { server } = useServerPage()
  const { href, pinned } = usePinned()
  return (
    <>
      {server.description && (
        <li className="px-4 py-3 text-body whitespace-pre-line">
          {server.description}
        </li>
      )}
      {pinned.map((n) => (
        <li key={n.id}>
          <Link
            href={href}
            className="flex min-h-12 items-center gap-3 px-4 py-2.5 outline-none active:bg-muted"
          >
            <Pin className="size-4 shrink-0 text-brand" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-body">
              {noteTitle(n)}
            </span>
            <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
          </Link>
        </li>
      ))}
    </>
  )
}

// Whether the phone overview has anything to show in its Notes group.
export function useHasPinnedNotes() {
  const { server } = useServerPage()
  const { pinned } = usePinned()
  return !!server.description || pinned.length > 0
}
