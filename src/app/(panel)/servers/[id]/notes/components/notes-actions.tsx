"use client"

import { Copy, Pencil, Pin, PinOff, Trash2 } from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { ServerNote } from "@/lib/services"
import { afterClose, type Item } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { noteTitle, useDeleteNote, useNoteChange } from "../api"
import { NoteEditor } from "./note-editor"
import { NoteViewer } from "./note-viewer"

type Ctx = {
  notes: ServerNote[]
  // Operator and up write; everyone who sees the server reads.
  canWrite: boolean
  create: () => void
  edit: (n: ServerNote) => void
  view: (n: ServerNote) => void
  menu: (n: ServerNote) => Item[][]
}

const NotesActions = createContext<Ctx | null>(null)

export function useNotesActions() {
  const ctx = useContext(NotesActions)
  if (!ctx) throw new Error("useNotesActions outside NotesActionsProvider")
  return ctx
}

export function NotesActionsProvider({
  notes,
  children,
}: {
  notes: ServerNote[]
  children: ReactNode
}) {
  const { server, phone, can } = useServerPage()
  const canWrite = can("operator")
  const change = useNoteChange(server.id)
  const del = useDeleteNote(server.id)

  // Layers keep an id and re-find the note, so a pin or save shows at once.
  const [editing, setEditing] = useState<{ id?: string; nonce: number }>({
    nonce: 0,
  })
  const [editorOpen, setEditorOpen] = useOpen("note-editor")
  const [viewing, setViewing] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useOpen("note-viewer")
  const [removing, setRemoving] = useState<ServerNote | null>(null)
  const [removeOpen, setRemoveOpen] = useOpen("note-remove")

  const find = (id?: string | null) => notes.find((n) => n.id === id)

  function create() {
    setEditing((e) => ({ nonce: e.nonce + 1 }))
    setEditorOpen(true)
  }
  function edit(n: ServerNote) {
    setEditing((e) => ({ id: n.id, nonce: e.nonce + 1 }))
    setEditorOpen(true)
  }
  function view(n: ServerNote) {
    setViewing(n.id)
    setViewerOpen(true)
  }
  function remove(n: ServerNote) {
    setRemoving(n)
    setRemoveOpen(true)
  }

  function togglePin(n: ServerNote) {
    change.mutate(
      { kind: "pin", id: n.id, pinned: !n.pinned },
      {
        onSuccess: (saved) =>
          toast.success(
            saved.pinned ? "Pinned to the overview" : "Unpinned from overview",
          ),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  async function copy(n: ServerNote) {
    const text = n.title.trim() ? `# ${n.title.trim()}\n\n${n.body}` : n.body
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied as Markdown")
    } catch {
      toast.error("Couldn't reach the clipboard")
    }
  }

  function menu(n: ServerNote): Item[][] {
    return [
      [
        ...(canWrite
          ? [
              {
                key: "edit",
                label: "Edit",
                icon: <Pencil />,
                onSelect: () => edit(n),
              },
              {
                key: "pin",
                label: n.pinned ? "Unpin from overview" : "Pin to overview",
                icon: n.pinned ? <PinOff /> : <Pin />,
                stay: true,
                onSelect: () => togglePin(n),
              },
            ]
          : []),
        {
          key: "copy",
          label: "Copy as Markdown",
          icon: <Copy />,
          stay: true,
          onSelect: () => copy(n),
        },
      ],
      canWrite
        ? [
            {
              key: "delete",
              label: "Delete",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => remove(n),
            },
          ]
        : [],
    ]
  }

  const viewed = find(viewing)

  return (
    <NotesActions.Provider
      value={{ notes, canWrite, create, edit, view, menu }}
    >
      {children}
      <NoteEditor
        key={editing.nonce}
        serverId={server.id}
        note={find(editing.id)}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        phone={phone}
      />
      {viewed && (
        <NoteViewer
          note={viewed}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          phone={phone}
        />
      )}
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Delete this note?"
        description={
          removing && (
            <>
              <span className="font-medium text-foreground">
                {noteTitle(removing)}
              </span>{" "}
              is deleted for everyone. This can't be undone.
            </>
          )
        }
        confirmLabel="Delete note"
        pending={del.isPending}
        onConfirm={() =>
          removing &&
          del.mutate(removing.id, {
            onSuccess: () => {
              toast.success("Note deleted")
              // The viewer (desktop: under the confirm) shows a note that's
              // gone: close it too, once the confirm's history entry is.
              afterClose(setRemoveOpen, () => setViewerOpen(false))
            },
            onError: (err) => toast.error(err.message),
          })
        }
      />
    </NotesActions.Provider>
  )
}
