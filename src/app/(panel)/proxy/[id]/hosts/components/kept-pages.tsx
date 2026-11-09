"use client"

import { ExternalLink, FileX2, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"

import { Empty, SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatDuration, formatSize } from "@/lib/format"
import type {
  KeptPage,
  ProxyHost,
  ProxyKeptPagesResult,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useKeptPages } from "../../../api"

// Most pages read from the proxy at once (newest first).
export const KEPT_LIMIT = 300

// What the site keeps a copy of now: the summary in the Always online card
// and the list share one request.
export function useKeptCopies(
  p: ReverseProxy,
  host: ProxyHost | undefined,
  enabled: boolean,
) {
  return useKeptPages(p.id, host?.id ?? "", KEPT_LIMIT, !!host && enabled)
}

export function keptSummary(r?: ProxyKeptPagesResult) {
  if (!r?.ok) return undefined
  const n = r.total
  return `${n === 1 ? "1 page" : `${n.toLocaleString()} pages`} · ${formatSize(r.bytes)}`
}

const ageText = (s: number) =>
  s < 60 ? "Just now" : `${formatDuration(s)} ago`

// The coverage list: every page a visitor would still get while the app is
// down, with how old its copy is. Side sheet on desktop, bottom sheet on
// phones; drive `open` with useOpen.
export function KeptPagesLayer({
  proxy: p,
  host,
  open,
  onOpenChange,
  phone,
}: {
  proxy: ReverseProxy
  host: ProxyHost
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
}) {
  const query = useKeptCopies(p, host, open)
  const [q, setQ] = useState("")
  const r = query.data
  const pages = useMemo(() => {
    const all = r?.ok ? r.pages : []
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return words.length
      ? all.filter((pg) =>
          words.every((w) =>
            `${pg.url} ${pg.variant ?? ""}`.toLowerCase().includes(w),
          ),
        )
      : all
  }, [r, q])
  const domains = new Set(r?.ok ? r.pages.map((pg) => pg.host) : []).size

  const title = "Pages with a copy"
  const subtitle = query.isPending
    ? "Looking at the proxy…"
    : r?.ok
      ? `${keptSummary(r)}${r.total > r.pages.length ? `, newest ${r.pages.length} listed` : ""}`
      : "Couldn't read the copies."

  const body = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search addresses"
          label="Search addresses"
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 md:size-9"
          aria-label="Read again"
          title="Read again"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw className={cn(query.isFetching && "animate-spin")} />
        </Button>
      </div>
      {query.isPending ? (
        <p className="py-8 text-center text-body-sm text-muted-foreground">
          Looking at the proxy…
        </p>
      ) : !r?.ok ? (
        <Empty
          icon={FileX2}
          title="Couldn't read the copies"
          body={
            query.error?.message ||
            r?.output ||
            `The command ended with code ${r?.exit_code}.`
          }
        />
      ) : !pages.length ? (
        <Empty
          icon={FileX2}
          title={q ? "No page matches" : "No copies yet"}
          body={
            q
              ? "Try another part of the address."
              : "A page gets its copy the first time a visitor opens it while the app works."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {pages.map((pg) => (
            <PageRow
              key={`${pg.url}|${pg.variant ?? ""}`}
              page={pg}
              showHost={domains > 1}
            />
          ))}
        </ul>
      )}
      <p className="text-caption text-muted-foreground">
        Only pages visitors opened while the app worked have a copy. Sign-ins,
        forms and anything else sent to the app still fail while it's down.
      </p>
    </div>
  )

  if (phone)
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        full
        header={
          <div className="px-6 pt-1 pb-3">
            <p className="text-subheading font-medium">{title}</p>
            <p className="text-body-sm text-muted-foreground">{subtitle}</p>
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {body}
        </div>
      </BottomSheet>
    )

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">{body}</div>
      </SheetContent>
    </Sheet>
  )
}

function PageRow({
  page: pg,
  showHost,
}: {
  page: KeptPage
  showHost: boolean
}) {
  const facts = [
    ageText(pg.age_seconds),
    formatSize(pg.bytes),
    pg.status && pg.status !== 200 ? `${pg.status}` : "",
    pg.variant ? `copy for ${pg.variant}` : "",
  ].filter(Boolean)
  return (
    <li className="flex min-h-14 items-center gap-2 py-2 ps-3 pe-1">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-body-sm" title={pg.url}>
          {showHost && <span className="text-muted-foreground">{pg.host}</span>}
          {pg.path}
        </p>
        <p className="truncate text-caption text-muted-foreground">
          {facts.join(" · ")}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 md:size-8"
        aria-label={`Open ${pg.path}`}
        title="Open"
        nativeButton={false}
        render={<a href={pg.url} target="_blank" rel="noopener noreferrer" />}
      >
        <ExternalLink />
      </Button>
    </li>
  )
}
