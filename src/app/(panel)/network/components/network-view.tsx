"use client"

import {
  ChevronLeft,
  Network,
  RefreshCw,
  Search,
  Waypoints,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useMemo, useState } from "react"

import {
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useAccess } from "@/components/auth/auth"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { Button } from "@/components/ui/button"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useNow } from "@/hooks/useNow"
import { useOpen } from "@/hooks/useOpen"
import type { NetworkMap } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useNetworkMap, useRescan } from "../api"
import { Canvas, type LegendItem } from "./canvas"
import { DetailsLayer } from "./details"
import { morchehGraph, networksGraph, reachGraph } from "./graph"
import { Matrix } from "./matrix"
import {
  type Filters,
  type Selection,
  useNetworkFilters,
  viewItems,
} from "./meta"

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted disabled:opacity-50"

const line = "var(--color-ash)"
const legends: Record<Filters["view"], LegendItem[]> = {
  networks: [
    { label: "Connected", stroke: line },
    { label: "VPN", stroke: "var(--color-brand)" },
    { label: "Container network", stroke: line, dash: "4 3" },
  ],
  reach: [
    {
      label: "Reachable (arrow: that way only)",
      stroke: "var(--color-success)",
    },
    { label: "Partly, or port closed", stroke: "var(--color-warning)" },
    { label: "Blocked", stroke: "var(--destructive)", dash: "4 3" },
  ],
  matrix: [],
  morcheh: [
    { label: "Online", stroke: "var(--color-success)" },
    { label: "Login problem", stroke: "var(--color-warning)" },
    { label: "Unreachable", stroke: "var(--destructive)", dash: "4 3" },
    { label: "Not checked", stroke: "var(--color-mist)", dash: "2 3" },
  ],
}

// The whole fleet's networking on one screen, filling everything under the
// panel header (or, on phones, between the app bar and the tab bar).
export function NetworkView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <Page phone={phone} />
}

function Page({ phone }: { phone: boolean }) {
  const query = useNetworkMap()
  const rescan = useRescan()
  const canRescan = useAccess().highest("operator")
  const [filters, setFilters] = useNetworkFilters()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [open, setOpen] = useOpen("network-details")
  const map = query.data

  const select = (next: Selection) => {
    setSelection(next)
    if (!open) setOpen(true)
  }

  const content = (
    <Body
      phone={phone}
      map={map}
      loading={query.isPending}
      error={query.error?.message}
      onRetry={() => query.refetch()}
      filters={filters}
      onSelect={select}
    />
  )
  const props = {
    map,
    filters,
    setFilters,
    scanning: rescan.isPending || query.isPending,
    onRescan: canRescan ? () => rescan.mutate() : undefined,
    onSelect: select,
  }

  return (
    <>
      {phone ? (
        <PhonePage {...props}>{content}</PhonePage>
      ) : (
        <DesktopPage {...props}>{content}</DesktopPage>
      )}
      {map && (
        <DetailsLayer
          map={map}
          selection={selection}
          open={open}
          onOpenChange={setOpen}
          onSelect={select}
          phone={phone}
        />
      )}
    </>
  )
}

function Body({
  phone,
  map,
  loading,
  error,
  onRetry,
  filters,
  onSelect,
}: {
  phone: boolean
  map: NetworkMap | undefined
  loading: boolean
  error?: string
  onRetry: () => void
  filters: Filters
  onSelect: (selection: Selection) => void
}) {
  const { view, q, containers, ipv6, problems } = filters
  const graph = useMemo(() => {
    if (!map || view === "matrix") return null
    if (view === "reach") return reachGraph(map, { problems })
    if (view === "morcheh") return morchehGraph(map, { problems })
    return networksGraph(map, { containers, ipv6 }, phone)
  }, [map, view, containers, ipv6, problems, phone])

  if (loading) {
    return (
      <Empty
        icon={Waypoints}
        title="Scanning your servers…"
        body="Reading every server's interfaces and testing which ones reach each other. This takes a few seconds."
        className="m-4 md:m-6"
      />
    )
  }
  if (!map) {
    return (
      <Empty
        icon={Network}
        title="Couldn't scan the network"
        body={error}
        action={<Button onClick={onRetry}>Try again</Button>}
        className="m-4 md:m-6"
      />
    )
  }
  if (map.servers.length === 0) {
    return (
      <Empty
        icon={Network}
        title="No servers yet"
        body="Add a server and it shows up here with its networks."
        action={
          <Button nativeButton={false} render={<Link href="/servers" />}>
            Go to servers
          </Button>
        }
        className="m-4 md:m-6"
      />
    )
  }
  if (view === "matrix" || !graph) {
    return <Matrix map={map} query={q} phone={phone} onSelect={onSelect} />
  }
  return (
    <Canvas
      key={view}
      graph={graph}
      view={view}
      phone={phone}
      query={q}
      legend={legends[view]}
      notice={notice(map, filters, graph.edges.length)}
      onSelect={onSelect}
    />
  )
}

function notice(map: NetworkMap, filters: Filters, edges: number) {
  if (edges > 0) return undefined
  if (filters.view === "reach") {
    if (map.servers.length < 2)
      return "Add another server to test between them."
    return filters.problems
      ? "No problems: every pair that was tested connects."
      : "Nothing could be tested yet."
  }
  if (filters.view === "morcheh" && filters.problems) {
    return "No problems: Morche reaches every server."
  }
  return undefined
}

type PageProps = {
  map: NetworkMap | undefined
  filters: Filters
  setFilters: ReturnType<typeof useNetworkFilters>[1]
  scanning: boolean
  // Missing when this person may read the map but not scan again.
  onRescan?: () => void
  onSelect: (selection: Selection) => void
  children: ReactNode
}

function DesktopPage({ children, ...props }: PageProps) {
  const { map, filters, setFilters, scanning, onRescan, onSelect } = props
  return (
    <div className="flex h-[calc(100svh-3rem-1px)] min-h-[32rem] flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2">
        <Segmented
          label="View"
          items={viewItems}
          value={filters.view}
          onChange={(view) => setFilters({ view })}
        />
        <SearchBox
          value={filters.q}
          onChange={(q) => setFilters({ q: q || null })}
          placeholder="Search name or IP"
          label="Search servers and networks"
          className="md:w-56"
        />
        <Chips filters={filters} setFilters={setFilters} />
        <div className="ms-auto flex items-center gap-3">
          <ScanStatus map={map} scanning={scanning} onSelect={onSelect} />
          {onRescan && (
            <Button
              variant="outline"
              size="icon"
              className="md:size-9"
              aria-label="Scan again"
              title="Scan again"
              disabled={scanning}
              onClick={onRescan}
            >
              <RefreshCw className={cn(scanning && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  )
}

function PhonePage({ children, ...props }: PageProps) {
  const { map, filters, setFilters, scanning, onRescan, onSelect } = props
  const back = useBackOr("/servers")
  const [searching, setSearching] = useState(Boolean(filters.q))
  return (
    <div className="flex h-[calc(100dvh-4rem-1px-env(safe-area-inset-bottom))] flex-col">
      <header className="shrink-0 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex h-12 items-center gap-1 px-1">
          <button
            type="button"
            aria-label="Back"
            onClick={back}
            className={barButton}
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            Network map
          </h1>
          <HelpButton
            href={guideHref("network-map")}
            label="Network map guide"
          />
          <button
            type="button"
            aria-label="Search"
            aria-pressed={searching}
            onClick={() => {
              if (searching) setFilters({ q: null })
              setSearching(!searching)
            }}
            className={cn(barButton, searching && "text-brand")}
          >
            <Search className="size-5" />
          </button>
          {onRescan && (
            <button
              type="button"
              aria-label="Scan again"
              disabled={scanning}
              onClick={onRescan}
              className={barButton}
            >
              <RefreshCw className={cn("size-5", scanning && "animate-spin")} />
            </button>
          )}
        </div>
        {searching && (
          <div className="px-4 pb-2">
            <SearchBox
              value={filters.q}
              onChange={(q) => setFilters({ q: q || null })}
              placeholder="Search name or IP"
              label="Search servers and networks"
            />
          </div>
        )}
        <div className="[scrollbar-width:none] overflow-x-auto px-4 pb-2">
          <Segmented
            label="View"
            items={viewItems}
            value={filters.view}
            onChange={(view) => setFilters({ view })}
          />
        </div>
        <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto px-4 pb-2">
          <Chips filters={filters} setFilters={setFilters} />
          <ScanStatus map={map} scanning={scanning} onSelect={onSelect} />
        </div>
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  )
}

function Chips({
  filters,
  setFilters,
}: Pick<PageProps, "filters" | "setFilters">) {
  if (filters.view === "networks") {
    return (
      <>
        <Chip
          pressed={filters.containers}
          onChange={(containers) =>
            setFilters({ containers: containers || null })
          }
        >
          Containers
        </Chip>
        <Chip
          pressed={filters.ipv6}
          onChange={(ipv6) => setFilters({ ipv6: ipv6 || null })}
        >
          IPv6
        </Chip>
      </>
    )
  }
  if (filters.view === "matrix") return null
  return (
    <Chip
      pressed={filters.problems}
      onChange={(problems) => setFilters({ problems: problems || null })}
    >
      Problems only
    </Chip>
  )
}

function Chip({
  pressed,
  onChange,
  children,
}: {
  pressed: boolean
  onChange: (pressed: boolean) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className="h-11 shrink-0 rounded-full border border-input px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-9"
    >
      {children}
    </button>
  )
}

function ScanStatus({
  map,
  scanning,
  onSelect,
}: Pick<PageProps, "map" | "scanning" | "onSelect">) {
  // Keeps "2 minutes ago" moving.
  useNow(30_000)
  if (scanning) {
    return <span className="text-caption text-ash">Scanning…</span>
  }
  if (!map) return null
  const failed = map.servers.filter((s) => !s.scanned)
  return (
    <span className="flex shrink-0 items-center gap-2 text-caption whitespace-nowrap text-ash max-md:flex-col max-md:items-start max-md:gap-0">
      {failed.length > 0 && (
        <button
          type="button"
          onClick={() => onSelect({ kind: "server", id: failed[0].server.id })}
          className="rounded text-warning outline-none hover:underline focus-visible:underline"
        >
          {failed.length} couldn't be read
        </button>
      )}
      Scanned {timeAgo(map.scanned_at).toLowerCase()}
    </span>
  )
}
