"use client"

import { Failed } from "@/app/(panel)/scripts/components/scripts-view"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useDatabaseSyncs } from "../../../api"
import { useDashboard } from "../parts"
import { NewSyncButton, SyncList } from "./sync-list"

// The Syncs tab: every sync that reads from or writes into this database.
export function SyncsTab() {
  const { database: d, phone, operator } = useDashboard()
  const syncs = useDatabaseSyncs(d.id)

  if (syncs.isPending) {
    return (
      <div className={cn("flex flex-col gap-4", phone && "px-4 pt-4")}>
        <Skeleton className="h-8 w-48 max-w-full rounded-lg" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }
  if (syncs.isError) {
    return <Failed error={syncs.error} onRetry={() => void syncs.refetch()} />
  }

  const n = syncs.data.length
  return (
    <div className={cn("flex flex-col gap-3 md:gap-4", phone && "pt-3")}>
      {!phone && n > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted-foreground">
            {n === 1 ? "1 sync" : `${n} syncs`}
          </span>
          {operator && <NewSyncButton size="sm" className="ms-auto" />}
        </div>
      )}
      <SyncList query={syncs} />
    </div>
  )
}
