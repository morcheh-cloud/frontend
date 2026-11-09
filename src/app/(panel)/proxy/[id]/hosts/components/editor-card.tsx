import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

// A titled block of the site editor: a card on desktop, a plain full-width
// group on phones.
export function EditorCard({
  title,
  hint,
  count,
  phone,
  action,
  children,
}: {
  title: string
  hint?: ReactNode
  // A number beside the title (how many domains).
  count?: number
  phone: boolean
  // A small control at the end of the title row.
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        phone
          ? "border-b border-border px-4 py-5"
          : "rounded-2xl border border-border p-6",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-body font-medium">
            {title}
            {!!count && (
              <span className="rounded-full bg-muted px-2 text-caption font-normal text-muted-foreground tabular-nums">
                {count}
              </span>
            )}
          </h2>
          {hint && (
            <p className="mt-0.5 text-caption text-muted-foreground">{hint}</p>
          )}
        </div>
        {action}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}
