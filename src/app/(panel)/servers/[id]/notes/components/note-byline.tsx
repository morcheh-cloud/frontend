"use client"

import type { ServerNote } from "@/lib/services"
import { cn } from "@/lib/utils"
import { timeAgo } from "../../../components/meta"

// "Edited 2 hours ago by Sara · written by Ali", quiet caption text.
export function NoteByline({
  note,
  className,
}: {
  note: ServerNote
  className?: string
}) {
  const edited = note.updated_at !== note.created_at
  const who = edited ? note.updated_by_name : note.created_by_name
  const exact = new Date(note.updated_at).toLocaleString()
  return (
    <p className={cn("text-caption text-ash", className)}>
      <time dateTime={note.updated_at} title={exact}>
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
