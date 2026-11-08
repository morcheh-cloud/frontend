"use client"

import { ChevronRight, History, RefreshCw, RotateCcw } from "lucide-react"
import { useState } from "react"

import { afterClose, Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { ProxyChangeSummary, Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useProxyChange, useProxyHistory } from "../../api"
import {
  canWrite,
  domainsText,
  hostTarget,
  hostTypeMeta,
} from "../../components/meta"
import { Tag } from "../../components/parts"
import { useProxyCan } from "../../components/permissions"
import { useProxyActions } from "../../components/proxy-actions"
import { Toolbar } from "./toolbar"

// Every change to the proxy's sites, newest first; any one can be put back.
export function HistoryTab({ proxy: p }: { proxy: ReverseProxy }) {
  const phone = useIsPhone()
  const history = useProxyHistory(p.id)
  const [open, setOpen] = useOpen("proxy-change")
  const [picked, setPicked] = useState<ProxyChangeSummary | null>(null)
  const items = history.data?.items ?? []

  return (
    <>
      <Toolbar proxy={p}>
        {!phone && (
          <>
            <span className="text-caption text-ash">
              Each save keeps a copy of every site, so you can go back
            </span>
            <span className="flex-1" />
          </>
        )}
        {phone && <span className="flex-1" />}
        <Button
          variant="ghost"
          size={phone ? "icon-lg" : "icon"}
          aria-label="Refresh"
          disabled={history.isFetching}
          onClick={() => history.refetch()}
          className={cn(phone && "rounded-full")}
        >
          <RefreshCw className={cn(history.isFetching && "animate-spin")} />
        </Button>
      </Toolbar>

      {history.isPending ? (
        <Skeleton
          className={cn("h-64", phone ? "rounded-none" : "rounded-2xl")}
        />
      ) : history.isError && !history.data ? (
        <Empty
          icon={History}
          title="Couldn't load the history"
          body={history.error.message}
          action={
            <Button variant="outline" onClick={() => history.refetch()}>
              Try again
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <Empty
          icon={History}
          title="No changes yet"
          body="Every time a site is added, changed or removed, the full set is kept here."
        />
      ) : (
        <ul
          className={cn(
            "divide-y divide-border border-y border-border",
            !phone && "overflow-hidden rounded-2xl border",
          )}
        >
          {items.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setPicked(c)
                  setOpen(true)
                }}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start outline-none hover:bg-subtle focus-visible:bg-subtle active:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{c.summary}</span>
                    {i === 0 && <Tag tone="brand">Now</Tag>}
                  </span>
                  <span className="block truncate text-body-sm text-muted-foreground">
                    {timeAgo(c.created_at)}
                    {c.user_name && ` · ${c.user_name}`} · {c.host_count} site
                    {c.host_count === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && (
        <ChangeLayer
          open={open}
          onOpenChange={setOpen}
          proxy={p}
          change={picked}
          latest={items[0]?.id === picked.id}
        />
      )}
    </>
  )
}

function ChangeLayer({
  open,
  onOpenChange,
  proxy: p,
  change,
  latest,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxy: ReverseProxy
  change: ProxyChangeSummary
  latest: boolean
}) {
  const phone = useIsPhone()
  const can = useProxyCan()
  const actions = useProxyActions()
  const detail = useProxyChange(p.id, open ? change.id : null)
  const canRestore = !latest && can(p, "engineer") && canWrite(p)
  const title = change.summary
  const description = `${new Date(change.created_at).toLocaleString()}${change.user_name ? ` · ${change.user_name}` : ""}`
  const restore = () =>
    afterClose(onOpenChange, () => actions.restore(p, change))

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-6 max-md:px-4">
      <p className="text-body-sm text-muted-foreground">
        {latest
          ? "This is how the sites are now."
          : "The sites as they were after this change. Restoring puts all of them back as they were here."}
      </p>
      {detail.isPending ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : detail.isError ? (
        <p className="text-body-sm text-destructive">{detail.error.message}</p>
      ) : detail.data.hosts.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No sites.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {[...detail.data.hosts]
            .sort((a, b) =>
              (a.domains[0] ?? "").localeCompare(b.domains[0] ?? ""),
            )
            .map((h) => (
              <li key={h.id} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate font-mono text-body-sm font-medium",
                      !h.enabled && "text-ash",
                    )}
                  >
                    {domainsText(h.domains)}
                  </span>
                  {!h.enabled && <Tag>Off</Tag>}
                </span>
                <span className="truncate font-mono text-caption text-muted-foreground">
                  {hostTypeMeta[h.config.type].label}
                  {hostTarget(h.config) && ` · ${hostTarget(h.config)}`}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
  const restoreButton = canRestore && (
    <Button className="max-md:h-11 max-md:w-full" onClick={restore}>
      <RotateCcw />
      Restore these sites
    </Button>
  )

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        footer={restoreButton || undefined}
      >
        <p className="-mt-1 px-4 text-body-sm text-muted-foreground">
          {description}
        </p>
        {body}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {body}
        {restoreButton && (
          <SheetFooter className="border-t border-border px-6 py-4">
            {restoreButton}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
