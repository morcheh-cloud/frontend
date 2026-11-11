"use client"

import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { useWorkspace } from "@/components/panel/workspace"
import { useIsPhone } from "@/hooks/useIsPhone"
import { cn } from "@/lib/utils"
import { AuditBrowser } from "./audit-browser"

export function RecordingsView() {
  const phone = useIsPhone()
  const { workspace } = useWorkspace()
  if (phone === null || !workspace) return null
  const header = phone ? (
    <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
      <h1 className="text-heading font-light">Audit log</h1>
      <HelpButton
        href={guideHref("command-log")}
        label="Audit log guide"
        className="ms-auto"
      />
    </header>
  ) : null
  return (
    <>
      {header}
      <div
        className={cn(
          "flex flex-col pb-24",
          phone ? "pt-4" : "gap-4 px-6 pt-5",
        )}
      >
        <AuditBrowser
          workspace={{ id: workspace.id, name: workspace.name }}
          phone={phone}
        />
      </div>
    </>
  )
}
