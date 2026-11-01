"use client"

import { ChevronLeft, Ellipsis } from "lucide-react"
import type { ReactNode } from "react"
import { guideForPath } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { useBack } from "@/hooks/useBack"
import { useOpen } from "@/hooks/useOpen"
import { ServerSheet } from "../../components/server-menu"
import { sectionHref } from "./sections"
import { useServerPage } from "./server-page"

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"

// Phone: a native app bar (Back, title, the section's guide, actions) over a
// full-screen view. The overview goes back to the list; a section goes back
// to the overview.
export function MobileChrome({ children }: { children: ReactNode }) {
  const { server, checking, section, onDeleted } = useServerPage()
  const back = useBack(section.slug ? sectionHref(server.id, "") : "/servers")
  const [sheetOpen, setSheetOpen] = useOpen("server-page-sheet")
  const guide = guideForPath(sectionHref(server.id, section.slug))

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-12 items-center gap-1 px-1">
          {/* As wide as the end side, so the title stays centred. */}
          <div className="flex w-22 shrink-0">
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className={barButton}
            >
              <ChevronLeft className="size-6 rtl:rotate-180" />
            </button>
          </div>
          <h1 className="min-w-0 flex-1 truncate text-center text-body font-medium">
            {section.slug ? section.label : server.name}
          </h1>
          {guide ? (
            <HelpButton
              href={guide.href}
              label={`${guide.guide.title} guide`}
            />
          ) : (
            <span aria-hidden className="size-11 shrink-0" />
          )}
          <button
            type="button"
            aria-label="Server actions"
            onClick={() => setSheetOpen(true)}
            className={barButton}
          >
            <Ellipsis className="size-5" />
          </button>
        </div>
      </header>
      {children}
      <ServerSheet
        server={server}
        checking={checking}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDeleted={onDeleted}
      />
    </>
  )
}
