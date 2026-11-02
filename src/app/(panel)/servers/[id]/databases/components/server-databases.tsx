"use client"

import { DatabaseActionsProvider } from "@/app/(panel)/databases/components/database-actions"
import { DatabasesView } from "@/app/(panel)/databases/components/databases-view"
import { useServerPage } from "../../components/server-page"

// The databases reached through this server; each row opens its dashboard
// under /databases. Adding one here starts with this server picked.
export function ServerDatabases() {
  const { server } = useServerPage()
  return (
    <DatabaseActionsProvider>
      <DatabasesView server={server} />
    </DatabaseActionsProvider>
  )
}
