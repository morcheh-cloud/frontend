"use client"

import {
  ChevronDown,
  Ellipsis,
  NotebookPen,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { type KeyboardEvent, useState } from "react"
import { toast } from "sonner"

import {
  Empty,
  type Item,
  ItemMenu,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Markdown } from "@/components/markdown"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import type { Asset, AssetNote } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAssetNoteChange, useAssetNotes, useDeleteAssetNote } from "../api"
import { useAssetsCan } from "./permissions"

// What a note is called in lists: its title, else its first line.
export function noteTitle(n: Pick<AssetNote, "title" | "body">) {
  if (n.title.trim()) return n.title.trim()
  const line = n.body
    .split("\n")
    .map((l) => l.replace(/^[#>*\-\s\d.[\]x]+/i, "").trim())
    .find(Boolean)
  return line ? line.slice(0, 80) : "Untitled note"
}

function Byline({ note }: { note: AssetNote }) {
  const edited = note.updated_at !== note.created_at
  const who = edited ? note.updated_by_name : note.created_by_name
  return (
    <p className="text-caption text-ash">
      <time
        dateTime={note.updated_at}
        title={new Date(note.updated_at).toLocaleString()}
      >
        {edited ? "Edited" : "Written"} {timeAgo(note.updated_at)}
      </time>
      {who && <> by {who}</>}
      {edited &&
        note.created_by_name &&
        note.created_by_name !== note.updated_by_name && (
          <> · written by {note.created_by_name}</>
        )}
    </p>
  )
}

// ---- Composer / editor ----

function NoteForm({
  asset,
  note,
  onDone,
  autoFocus,
}: {
  asset: Asset
  note?: AssetNote
  onDone?: () => void
  autoFocus?: boolean
}) {
  const change = useAssetNoteChange(asset.id)
  const [title, setTitle] = useState(note?.title ?? "")
  const [body, setBody] = useState(note?.body ?? "")
  const [pinned, setPinned] = useState(note?.pinned ?? false)
  const [mode, setMode] = useState<"write" | "preview">("write")
  const [open, setOpen] = useState(!!note)
  const [conflict, setConflict] = useState(false)
  const empty = !title.trim() && !body.trim()

  const reset = () => {
    setTitle("")
    setBody("")
    setPinned(false)
    setMode("write")
    setOpen(false)
  }

  const save = (overwrite = false) => {
    if (empty || change.isPending) return
    change.mutate(
      note
        ? {
            kind: "update",
            id: note.id,
            title,
            body,
            pinned,
            revision: overwrite ? null : note.updated_at,
          }
        : { kind: "create", title, body, pinned },
      {
        onSuccess: () => {
          toast.success(note ? "Note saved" : "Note added")
          if (note) onDone?.()
          else reset()
        },
        onError: (err) => {
          if (err.status === 409 && note) setConflict(true)
          else toast.error(err.message)
        },
      },
    )
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "Enter" || e.key === "s")) {
      e.preventDefault()
      save()
    }
    if (e.key === "Escape" && note) onDone?.()
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: catches the save shortcut from the fields inside
    <div
      onKeyDown={onKeyDown}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors",
        open ? "border-brand/50 shadow-sm" : "border-border",
      )}
    >
      {open && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="Title"
            maxLength={200}
            autoComplete="off"
            className="h-9 min-w-0 flex-1 font-medium"
          />
          <Segmented
            label="Editor mode"
            items={[
              { value: "write", label: "Write" },
              { value: "preview", label: "Preview" },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>
      )}
      {mode === "write" || !open ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setOpen(true)}
          // biome-ignore lint/a11y/noAutofocus: opened on purpose by Edit
          autoFocus={autoFocus}
          rows={open ? 8 : 2}
          maxLength={100_000}
          placeholder={
            open
              ? "Markdown works: **bold**, - lists, `code`, [links](https://…)"
              : `Write a note about ${asset.name}: who to call, how it's set up, what went wrong last time…`
          }
          aria-label="Note"
          className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2.5 text-body-sm outline-none placeholder:text-ash focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      ) : (
        <div className="max-h-96 min-h-32 overflow-y-auto rounded-lg border border-border px-4 py-3">
          {body.trim() ? (
            <Markdown>{body}</Markdown>
          ) : (
            <p className="text-body-sm text-ash">Nothing to preview yet.</p>
          )}
        </div>
      )}
      {conflict && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3 text-body-sm">
          <TriangleAlert className="size-4 shrink-0 text-warning" />
          <p className="flex-1">
            Someone else saved this note after you started editing.
          </p>
          <Button size="sm" variant="outline" onClick={() => onDone?.()}>
            Drop mine
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={change.isPending}
            onClick={() => save(true)}
          >
            Overwrite
          </Button>
        </div>
      )}
      {open && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-body-sm">
            <Switch
              id={`pin-${note?.id ?? "new"}`}
              checked={pinned}
              onCheckedChange={setPinned}
            />
            <label
              htmlFor={`pin-${note?.id ?? "new"}`}
              className="flex items-center gap-1.5"
            >
              <Pin className="size-3.5 text-ash" />
              Pin to the overview
            </label>
          </div>
          <span className="ms-auto hidden text-caption text-ash sm:inline">
            Ctrl+Enter saves
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (note ? onDone?.() : reset())}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={empty || change.isPending}
            onClick={() => save()}
          >
            {change.isPending ? "Saving…" : note ? "Save" : "Add note"}
          </Button>
        </div>
      )}
    </div>
  )
}

// ---- One note ----

function NoteCard({ asset, note }: { asset: Asset; note: AssetNote }) {
  const can = useAssetsCan(asset.workspace_id)
  const write = can.review(asset)
  const change = useAssetNoteChange(asset.id)
  const del = useDeleteAssetNote(asset.id)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useOpen(`asset-note-delete-${note.id}`)
  const long = note.body.length > 900 || note.body.split("\n").length > 16
  const [expanded, setExpanded] = useState(false)

  if (editing)
    return (
      <NoteForm
        asset={asset}
        note={note}
        autoFocus
        onDone={() => setEditing(false)}
      />
    )

  const menu: Item[][] = write
    ? [
        [
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil />,
            onSelect: () => setEditing(true),
          },
          {
            key: "pin",
            label: note.pinned
              ? "Unpin from the overview"
              : "Pin to the overview",
            icon: note.pinned ? <PinOff /> : <Pin />,
            onSelect: () =>
              change.mutate(
                { kind: "pin", id: note.id, pinned: !note.pinned },
                { onError: (e) => toast.error(e.message) },
              ),
          },
        ],
        [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => setConfirm(true),
          },
        ],
      ]
    : []

  return (
    <article
      className={cn(
        "group rounded-2xl border border-border p-4",
        note.pinned && "border-brand/40 bg-brand-soft/20",
      )}
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {note.title.trim() && (
            <h3 className="text-body-sm font-medium break-words">
              {note.title.trim()}
            </h3>
          )}
          <div className="flex items-center gap-1.5">
            {note.pinned && (
              <Pin
                className="size-3.5 shrink-0 text-brand"
                aria-label="Pinned"
              />
            )}
            <Byline note={note} />
          </div>
        </div>
        {write && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit note"
              onClick={() => setEditing(true)}
              className="md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <Pencil />
            </Button>
            <ItemMenu
              groups={menu}
              label="Note actions"
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Note actions"
                >
                  <Ellipsis />
                </Button>
              }
            />
          </>
        )}
      </header>
      {note.body.trim() && (
        <div
          className={cn(
            "relative mt-3 text-body-sm",
            long && !expanded && "max-h-72 overflow-hidden",
          )}
        >
          <Markdown>{note.body}</Markdown>
          {long && !expanded && (
            <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent" />
          )}
        </div>
      )}
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="mt-2 inline-flex items-center gap-1 text-caption text-brand"
        >
          <ChevronDown className={cn("size-3.5", expanded && "rotate-180")} />
          {expanded ? "Show less" : "Show all"}
        </button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this note?"
        description={`“${noteTitle(note)}” is deleted for everyone.`}
        confirmLabel="Delete"
        destructive
        pending={del.isPending}
        onConfirm={() =>
          del.mutate(note.id, {
            onSuccess: () => {
              toast.success("Note deleted")
              setConfirm(false)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </article>
  )
}

// ---- The tab ----

export function NotesTab({ asset, phone }: { asset: Asset; phone: boolean }) {
  const can = useAssetsCan(asset.workspace_id)
  const write = can.review(asset)
  const query = useAssetNotes(asset.id)
  const notes = query.data?.items ?? []
  return (
    <div className={cn("grid max-w-4xl gap-3", phone && "pt-1")}>
      {write ? (
        <NoteForm asset={asset} />
      ) : (
        <p className="text-caption text-ash">
          Operators on the workspace and the asset's owner, deputy or owning
          group can write notes.
        </p>
      )}
      {query.isPending ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : notes.length === 0 ? (
        <Empty
          icon={NotebookPen}
          title="No notes yet"
          body="Write down what the next person should know: what it's for, how it's set up, who to call, what went wrong last time."
        />
      ) : (
        notes.map((n) => <NoteCard key={n.id} asset={asset} note={n} />)
      )}
    </div>
  )
}

// Pinned notes for the Overview: compact, with a link to the tab.
export function PinnedNotes({
  asset,
  onAll,
}: {
  asset: Asset
  onAll: () => void
}) {
  const query = useAssetNotes(asset.id)
  const pinned = (query.data?.items ?? []).filter((n) => n.pinned)
  const total = query.data?.items.length ?? 0
  if (pinned.length === 0) return null
  return (
    <section className="min-w-0 rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2">
        <h2 className="font-label text-[11px] tracking-label text-ash uppercase">
          Pinned notes
        </h2>
        <button
          type="button"
          onClick={onAll}
          className="ms-auto text-caption text-brand"
        >
          All notes · {total}
        </button>
      </div>
      <div className="mt-3 grid gap-4 divide-y divide-border">
        {pinned.map((n) => (
          <div key={n.id} className="min-w-0 pt-4 first:pt-0">
            <p className="text-body-sm font-medium">{noteTitle(n)}</p>
            <Byline note={n} />
            {n.body.trim() && (
              <div className="mt-2 line-clamp-6 text-body-sm">
                <Markdown>{n.body}</Markdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
