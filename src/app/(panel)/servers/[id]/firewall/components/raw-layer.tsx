"use client"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useServerPage } from "../../components/server-page"
import { useFirewallRaw } from "../api"

// What the tools themselves say, for when the plain list isn't enough.
export function RawLayer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { server } = useServerPage()
  const query = useFirewallRaw(server.id, open)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Raw rules"
      description="Exactly what the firewall tools print on this server."
      className="sm:max-w-3xl"
    >
      <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto">
        {query.isPending && <Skeleton className="h-40 rounded-2xl" />}
        {query.error && (
          <p className="text-body-sm text-destructive">{query.error.message}</p>
        )}
        {query.data?.sections.map((s) => (
          <section key={s.title}>
            <h3 className="mb-1 font-mono text-caption text-ash">
              $ {s.title}
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-subtle p-3 font-mono text-caption">
              {s.content.trim() || "(nothing)"}
            </pre>
          </section>
        ))}
      </div>
    </ResponsiveDialog>
  )
}
