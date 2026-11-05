"use client"

import { History } from "lucide-react"
import { useState } from "react"

import { AccessLayer } from "@/components/access/grants"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import type { FirewallChange } from "@/lib/services"
import { timeAgo } from "../../../components/meta"
import { afterClose, Empty } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useFirewallHistory, useFirewallPreview } from "../api"
import { useFirewallActions } from "./firewall-actions"

const STATUS: Partial<Record<FirewallChange["status"], string>> = {
  pending: "Waiting to be kept",
  undone: "Undone",
}

// What was done here through Morcheh, each with a way back to before it.
export function HistoryLayer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { server } = useServerPage()
  const query = useFirewallHistory(server.id, open)
  const items = query.data?.items ?? []
  const [restoreOpen, setRestoreOpen] = useOpen("fw-restore")
  const [current, setCurrent] = useState<FirewallChange>()

  // Going back takes these with it.
  const later = current
    ? items
        .slice(0, items.indexOf(current))
        .filter((c) => c.status !== "undone").length
    : 0

  return (
    <>
      <AccessLayer
        open={open}
        onOpenChange={onOpenChange}
        title="History"
        description="Changes made through Morcheh. Changes made by hand on the server aren't listed."
      >
        {query.isPending && open && <Skeleton className="h-40 rounded-2xl" />}
        {query.error && (
          <p className="text-body-sm text-destructive">{query.error.message}</p>
        )}
        {query.data && items.length === 0 && (
          <Empty
            icon={History}
            title="Nothing yet"
            body="Changes to this firewall will show up here."
          />
        )}
        <ul className="-my-3 divide-y divide-border">
          {items.map((c) => (
            <ChangeRow
              key={c.id}
              change={c}
              onBack={() => {
                setCurrent(c)
                setRestoreOpen(true)
              }}
            />
          ))}
        </ul>
      </AccessLayer>
      <RestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        change={current}
        later={later}
        onDone={() => afterClose(setRestoreOpen, () => onOpenChange(false))}
      />
    </>
  )
}

function ChangeRow({
  change,
  onBack,
}: {
  change: FirewallChange
  onBack: () => void
}) {
  const a = useFirewallActions()
  const status = STATUS[change.status]
  const lines = [
    ...change.added.map((t) => `+ ${t}`),
    ...change.removed.map((t) => `− ${t}`),
  ]
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="min-w-0">
        <p className="text-body-sm font-medium break-words">{change.summary}</p>
        <p
          className="text-caption text-muted-foreground"
          title={new Date(change.created_at).toLocaleString()}
        >
          {[change.user, timeAgo(change.created_at), status]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {lines.length > 0 && (
        <ul className="font-mono text-caption break-words text-muted-foreground">
          {lines.slice(0, 4).map((l) => (
            <li key={l}>{l}</li>
          ))}
          {lines.length > 4 && (
            <li className="font-sans text-ash">and {lines.length - 4} more</li>
          )}
        </ul>
      )}
      {a.manage &&
        change.status === "applied" &&
        (change.restorable ? (
          <div>
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={a.locked}
              onClick={onBack}
            >
              Go back to before this…
            </Button>
          </div>
        ) : (
          <p className="text-caption text-ash">
            No copy was saved, so this one can't be taken back.
          </p>
        ))}
    </li>
  )
}

function Lines({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h3 className="mb-1 text-body-sm font-medium">{title}</h3>
      <ul className="rounded-lg bg-subtle p-3 font-mono text-caption break-words">
        {items.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  )
}

function RestoreDialog({
  open,
  onOpenChange,
  change,
  later,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  change?: FirewallChange
  later: number
  onDone: () => void
}) {
  const { server, phone } = useServerPage()
  const a = useFirewallActions()
  const query = useFirewallPreview(server.id, change?.id, open)
  const p = query.data
  const nothing =
    p &&
    !p.problem &&
    !p.reordered &&
    p.adds.length + p.removes.length + p.settings.length === 0

  async function restore() {
    if (!change) return
    const ok = await a.apply(
      () => api.firewall.restoreFirewallChange(server.id, change.id),
      "Firewall put back",
    )
    if (ok) onDone()
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Go back to before this?"
      description={
        change &&
        `Before "${change.summary}"${
          later > 0
            ? `. This also takes back ${later === 1 ? "the change" : `the ${later} changes`} made after it.`
            : "."
        }`
      }
      footer={
        <div className="flex w-full gap-2 max-md:flex-col md:justify-end">
          <Button
            size={phone ? "lg" : "default"}
            disabled={!p || Boolean(p.problem) || nothing || a.busy}
            onClick={restore}
          >
            {a.busy ? "Applying…" : "Go back"}
          </Button>
          <Button
            size={phone ? "lg" : "default"}
            variant={phone ? "ghost" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <div className="flex max-h-[55dvh] flex-col gap-4 overflow-y-auto">
        {query.isPending && <Skeleton className="h-24 rounded-2xl" />}
        {query.error && (
          <p className="text-body-sm text-destructive">{query.error.message}</p>
        )}
        {p?.problem && (
          <p className="text-body-sm text-destructive">{p.problem}</p>
        )}
        {nothing && (
          <p className="text-body-sm text-muted-foreground">
            Nothing would change: the firewall already looks like this.
          </p>
        )}
        {p && !p.problem && !nothing && (
          <>
            <Lines title="Would come back" items={p.adds} />
            <Lines title="Would go" items={p.removes} />
            <Lines title="Settings" items={p.settings} />
            {p.reordered && (
              <p className="text-body-sm">
                The order of the rules would change.
              </p>
            )}
            <p className="text-caption text-ash">
              With the firewall on, you get 90 seconds to check. It's only kept
              if you press Keep it.
            </p>
          </>
        )}
      </div>
    </ResponsiveDialog>
  )
}
