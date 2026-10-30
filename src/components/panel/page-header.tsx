import type { ReactNode } from "react"

// The top of every panel page: title, one-line description and the page's
// main actions.
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-3 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))] md:flex-row md:items-center md:justify-between md:px-6 md:pt-5">
      <div className="min-w-0">
        <h1 className="text-subheading font-medium">{title}</h1>
        {description && (
          <p className="text-body-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}
