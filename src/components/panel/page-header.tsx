import type { ReactNode } from "react"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"

// The top of a panel page. No title or description on desktop (user rule):
// the breadcrumb already names the page, and a page's buttons belong in its
// toolbar row; `actions` here are only for pages without one and sit at the
// end of a row of their own. Phones keep a native app bar: the title, a guide
// button (`guide` = a help slug) and the actions below it.
export function PageHeader({
  title,
  actions,
  guide,
  icon,
}: {
  title: string
  actions?: ReactNode
  guide?: string
  // Shown before the title on phones, e.g. an avatar.
  icon?: ReactNode
}) {
  return (
    <>
      <div className="flex w-full flex-col gap-3 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))] md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          <h1 className="min-w-0 flex-1 truncate text-subheading font-medium">
            {title}
          </h1>
          {guide && (
            <HelpButton
              href={guideHref(guide)}
              label={`${title} guide`}
              className="-my-2 -me-3"
            />
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {actions && (
        <div className="hidden w-full justify-end gap-2 px-6 pt-5 md:flex">
          {actions}
        </div>
      )}
    </>
  )
}
