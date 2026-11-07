"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Pin, TriangleAlert } from "lucide-react"
import { type KeyboardEvent, useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Markdown } from "@/components/markdown"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import type { ServerNote } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Segmented } from "../../components/parts"
import { notesKeys, useNoteChange } from "../api"

type Mode = "write" | "preview"

// Write a new note (`note` unset) or change one. Desktop: a wide dialog;
// phones: a full sheet with Cancel · Title · Save. Mount it with a fresh key
// each time it opens so the fields start from the note.
export function NoteEditor({
  serverId,
  note,
  open,
  onOpenChange,
  phone,
}: {
  serverId: string
  note?: ServerNote
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
}) {
  const qc = useQueryClient()
  const change = useNoteChange(serverId)
  const [title, setTitle] = useState(note?.title ?? "")
  const [body, setBody] = useState(note?.body ?? "")
  const [pinned, setPinned] = useState(note?.pinned ?? false)
  const [revision, setRevision] = useState(note?.updated_at ?? null)
  const [mode, setMode] = useState<Mode>("write")
  const [conflict, setConflict] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discard, setDiscard] = useOpen("note-discard")

  const dirty =
    title !== (note?.title ?? "") ||
    body !== (note?.body ?? "") ||
    pinned !== (note?.pinned ?? false)
  const empty = !title.trim() && !body.trim()

  function close(next: boolean) {
    if (next) return onOpenChange(true)
    if (dirty && !change.isPending) setDiscard(true)
    else onOpenChange(false)
  }

  function save(overwrite = false) {
    if (empty || change.isPending) return
    setError(null)
    change.mutate(
      note
        ? {
            kind: "update",
            id: note.id,
            title,
            body,
            pinned,
            revision: overwrite ? null : revision,
          }
        : { kind: "create", title, body, pinned },
      {
        onSuccess: () => {
          toast.success(note ? "Note saved" : "Note added")
          onOpenChange(false)
        },
        onError: (err) => {
          if (err.status === 409 && note) setConflict(true)
          else setError(err.message)
        },
      },
    )
  }

  // Someone saved in between: take their version and drop ours.
  async function loadTheirs() {
    const list = await qc.fetchQuery({
      queryKey: notesKeys.list(serverId),
      queryFn: () => api.serverNotes.listServerNotes(serverId),
      staleTime: 0,
    })
    const theirs = list.items.find((n) => n.id === note?.id)
    if (!theirs) {
      toast.error("Someone deleted this note meanwhile.")
      return onOpenChange(false)
    }
    setTitle(theirs.title)
    setBody(theirs.body)
    setPinned(theirs.pinned)
    setRevision(theirs.updated_at)
    setConflict(false)
  }

  // ⌘/Ctrl+Enter or ⌘/Ctrl+S saves.
  function onKeyDown(e: KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey)) return
    if (e.key === "Enter" || e.key.toLowerCase() === "s") {
      e.preventDefault()
      save()
    }
  }

  const heading = note ? "Edit note" : "New note"

  const fields = (
    // biome-ignore lint/a11y/noStaticElementInteractions: catches the save shortcut from the fields inside
    <div className="flex min-h-0 flex-1 flex-col gap-3" onKeyDown={onKeyDown}>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        aria-label="Title"
        maxLength={200}
        className="text-body font-medium md:h-10"
        autoComplete="off"
        enterKeyHint="next"
      />
      <div className="flex items-center justify-between gap-3">
        <Segmented
          label="Editor mode"
          items={[
            { value: "write", label: "Write" },
            { value: "preview", label: "Preview" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <span className="text-caption text-ash">Markdown</span>
      </div>
      {mode === "write" ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            "What should the next person know?\n\n- What runs here\n- Who to ask\n- Quirks, last incident…"
          }
          aria-label="Note"
          maxLength={100_000}
          spellCheck
          className={cn(
            "w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2.5 font-mono text-body-sm outline-none placeholder:text-ash focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            phone ? "min-h-0 flex-1" : "h-[min(26rem,50dvh)]",
          )}
        />
      ) : (
        <div
          className={cn(
            "overflow-y-auto rounded-lg border border-border px-4 py-3",
            phone ? "min-h-0 flex-1" : "h-[min(26rem,50dvh)]",
          )}
        >
          {body.trim() ? (
            <Markdown>{body}</Markdown>
          ) : (
            <p className="text-body-sm text-ash">Nothing to preview yet.</p>
          )}
        </div>
      )}
      <div className="flex min-h-11 items-center justify-between gap-3 md:min-h-9">
        <label
          htmlFor="note-pinned"
          className="flex items-center gap-2 text-body-sm"
        >
          <Pin className="size-4 text-ash" />
          Pin to the server's overview
        </label>
        <Switch id="note-pinned" checked={pinned} onCheckedChange={setPinned} />
      </div>
      {conflict && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3 text-body-sm md:flex-row md:items-center">
          <TriangleAlert className="size-4 shrink-0 text-warning max-md:hidden" />
          <p className="flex-1">
            Someone else saved this note after you opened it.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11 max-md:flex-1"
              onClick={loadTheirs}
            >
              Load theirs
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="max-md:h-11 max-md:flex-1"
              disabled={change.isPending}
              onClick={() => save(true)}
            >
              Overwrite
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-body-sm text-destructive">{error}</p>}
    </div>
  )

  const confirm = (
    <ConfirmDialog
      open={discard}
      onOpenChange={setDiscard}
      title="Discard your changes?"
      description="What you wrote here hasn't been saved."
      confirmLabel="Discard"
      onConfirm={() => {
        setDiscard(false)
        // Let the confirm's own history entry go before closing the editor.
        window.addEventListener("popstate", () => onOpenChange(false), {
          once: true,
        })
      }}
    />
  )

  if (phone) {
    return (
      <>
        <BottomSheet
          open={open}
          onOpenChange={close}
          title={heading}
          full
          className="flex flex-col pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]"
          header={
            <div className="flex items-center gap-2 px-2 pb-2">
              <Button
                variant="ghost"
                className="h-11"
                onClick={() => close(false)}
              >
                Cancel
              </Button>
              <span className="flex-1 truncate text-center text-body font-medium">
                {heading}
              </span>
              <Button
                variant="ghost"
                className="h-11 font-medium text-brand"
                disabled={empty || change.isPending}
                onClick={() => save()}
              >
                {change.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          }
        >
          {fields}
        </BottomSheet>
        {confirm}
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => close(next)}>
        <DialogContent className="gap-5 p-6 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
          </DialogHeader>
          {fields}
          <DialogFooter className="-mx-6 -mb-6 items-center px-6">
            <span className="me-auto text-caption text-ash max-sm:hidden">
              Ctrl+Enter saves
            </span>
            <Button variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button disabled={empty || change.isPending} onClick={() => save()}>
              {change.isPending ? "Saving…" : note ? "Save" : "Add note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirm}
    </>
  )
}
