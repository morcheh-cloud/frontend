"use client"

import { Ellipsis, Pencil, Pin } from "lucide-react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ServerNote } from "@/lib/services"
import { ItemMenu, SheetItems } from "../../components/parts"
import { noteTitle } from "../api"
import { NoteByline } from "./note-byline"
import { useNotesActions } from "./notes-actions"

// One note in full. Desktop: a wide dialog with Edit and ⋯; phones: a full
// sheet with the note, then its actions as rows.
export function NoteViewer({
  note,
  open,
  onOpenChange,
  phone,
}: {
  note: ServerNote
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
}) {
  const a = useNotesActions()
  const title = noteTitle(note)
  const body = note.body.trim() ? (
    <Markdown>{note.body}</Markdown>
  ) : (
    <p className="text-body-sm text-ash">This note has only a title.</p>
  )

  if (phone) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={title} full>
        <div className="px-2 pb-4">
          <NoteByline note={note} />
          <div className="mt-4">{body}</div>
        </div>
        <div className="border-t border-border pt-2">
          <SheetItems groups={a.menu(note)} onOpenChange={onOpenChange} />
        </div>
      </BottomSheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="gap-4 p-6 sm:max-w-3xl">
        <DialogHeader className="pe-8">
          <DialogTitle className="flex items-center gap-2 text-subheading font-normal">
            {note.pinned && (
              <Pin className="size-4 shrink-0 text-brand" aria-label="Pinned" />
            )}
            <span className="min-w-0 break-words">{title}</span>
          </DialogTitle>
          <NoteByline note={note} />
        </DialogHeader>
        <div className="max-h-[min(36rem,65dvh)] overflow-y-auto">{body}</div>
        <DialogFooter className="-mx-6 -mb-6 items-center px-6">
          <ItemMenu
            groups={a.menu(note).map((g) => g.filter((i) => i.key !== "edit"))}
            label="More actions"
            trigger={
              <Button
                variant="outline"
                size="icon"
                className="me-auto"
                aria-label="More actions"
              >
                <Ellipsis />
              </Button>
            }
          />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {a.canWrite && (
            <Button onClick={() => a.edit(note)}>
              <Pencil />
              Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
