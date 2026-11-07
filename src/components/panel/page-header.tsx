import type { ReactNode } from "react"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"

// The top of every panel page: title, one-line description and the page's
// main actions. `guide` (a help slug) adds a guide button on phones; desktop
// links it from the panel header.
export function PageHeader({
  title,
  description,
  actions,
  guide,
  icon,
}: {
  title: string
  description?: string
  actions?: ReactNode
  guide?: string
  // Shown before the title, e.g. an avatar.
  icon?: ReactNode
}) {
  return (
    <div className="flex w-full flex-col gap-3 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))] md:flex-row md:items-center md:justify-between md:px-6 md:pt-5">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-subheading font-medium">{title}</h1>
            {guide && (
              <HelpButton
                href={guideHref(guide)}
                label={`${title} guide`}
                className="-my-2 -me-3 md:hidden"
              />
            )}
          </div>
          {description && (
            <p className="text-body-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}
