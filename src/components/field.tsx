"use client"

import { type ReactNode, useId } from "react"

import { cn } from "@/lib/utils"

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  error?: string
  children: (props: {
    id: string
    "aria-invalid"?: true
    "aria-describedby"?: string
  }) => ReactNode
  className?: string
}) {
  const id = useId()
  const noteId = `${id}-note`
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-body-sm font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? noteId : undefined,
      })}
      {(error || hint) && (
        <p
          id={noteId}
          className={cn(
            "text-caption",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
