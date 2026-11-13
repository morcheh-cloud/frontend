"use client"

import {
  ChevronLeft,
  ChevronRight,
  File,
  Folder,
  Link2,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useIsPhone } from "@/hooks/useIsPhone"
import { formatDuration, formatSize } from "@/lib/format"
import type {
  DockerLayerEntry,
  DockerLayerScan,
  DockerScanLayer,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useImageLayers, useLayerFiles, useReadLayersAgain } from "../api"
import { imageName, shortId } from "./meta"
import { Block, Layer, Quiet } from "./parts"

type Open = { open: boolean; onOpenChange: (open: boolean) => void }

// A dive-like look inside an image: what each build step added, changed or
// removed, and the space copies hidden by later layers waste.
export function LayerExplorer({
  server,
  image,
  open,
  onOpenChange,
}: Open & { server: string; image: string }) {
  const scan = useImageLayers(server, image, open)
  const again = useReadLayersAgain()
  const s = scan.data
  const title = image.startsWith("sha256:") ? shortId(image) : imageName(image)
  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={`Layers of ${title}`}
      subtitle="What each build step put in the image, and the space files that later steps replace or delete still take."
      actions={
        s && s.state !== "reading" ? (
          <Button
            variant="outline"
            size="sm"
            className="max-md:h-11"
            disabled={again.isPending}
            onClick={() => again.mutate({ server, image })}
          >
            {again.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            Read again
          </Button>
        ) : null
      }
    >
      {scan.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-48" />
        </div>
      ) : scan.isError ? (
        <Problem text={scan.error.message} onRetry={() => scan.refetch()} />
      ) : s?.state === "reading" ? (
        <Reading scan={s} />
      ) : s?.state === "failed" ? (
        <Problem
          text={s.error || "Couldn't read the image."}
          onRetry={() => again.mutate({ server, image })}
        />
      ) : s ? (
        <Ready server={server} image={image} scan={s} />
      ) : null}
    </Layer>
  )
}

function Problem({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-border p-4">
      <p className="flex items-start gap-2 text-body-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        {text}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw />
        Try again
      </Button>
    </div>
  )
}

function Reading({ scan }: { scan: DockerLayerScan }) {
  const pct =
    scan.expected > 0 ? Math.min(99, (scan.read / scan.expected) * 100) : 0
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <p className="flex items-center gap-2 text-body-sm font-medium">
        <Loader2 className="size-4 animate-spin text-brand" />
        Reading the image…
      </p>
      <div
        role="progressbar"
        aria-label="Reading the image"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-caption text-muted-foreground">
        {formatSize(scan.read)}
        {scan.expected > 0 && ` of about ${formatSize(scan.expected)}`} ·{" "}
        {formatDuration(Math.round(scan.seconds))}. The image is streamed from
        the server and nothing is written to its disk. Big images take a minute.
      </p>
    </div>
  )
}

const pctText = (n: number) => `${Math.round(n * 1000) / 10}%`

function Ready({
  server,
  image,
  scan,
}: {
  server: string
  image: string
  scan: DockerLayerScan
}) {
  const phone = useIsPhone()
  const [layer, setLayer] = useState<number | null>(null)
  const [path, setPath] = useState("")
  const [changes, setChanges] = useState(true)
  // The biggest layer opens first on desktop.
  const biggest = scan.layers.reduce<DockerScanLayer | undefined>(
    (b, l) => (!b || l.size > b.size ? l : b),
    undefined,
  )
  const current = layer ?? (phone ? null : (biggest?.index ?? null))

  function pick(index: number, at = "") {
    setLayer(index)
    setPath(at)
  }

  const files =
    current === null ? null : (
      <Files
        server={server}
        image={image}
        layer={scan.layers[current]}
        count={scan.layers.length}
        path={path}
        setPath={setPath}
        changes={changes}
        setChanges={setChanges}
        onBack={phone ? () => setLayer(null) : undefined}
      />
    )

  return (
    <>
      <Tiles scan={scan} />
      {scan.truncated && (
        <Quiet>
          This image has more files than are kept for browsing; the numbers
          count only the listed ones.
        </Quiet>
      )}
      {phone && current !== null ? (
        files
      ) : (
        <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Block
            title={`Layers · ${scan.layers.length}`}
            aside={
              scan.steps > scan.layers.length ? (
                <span className="text-caption text-muted-foreground">
                  {scan.steps - scan.layers.length} steps changed no file
                </span>
              ) : null
            }
          >
            <LayerList
              layers={scan.layers}
              current={current}
              total={scan.total}
              onPick={(i) => pick(i)}
            />
          </Block>
          {files}
        </div>
      )}
      {!(phone && current !== null) && scan.top.length > 0 && (
        <Block title="Wasted space">
          <p className="-mt-1 text-caption text-muted-foreground">
            Files a later step replaced or deleted. Their old copies still ship
            with the image. Delete them in the same step that makes them (one
            RUN), or use a multi-stage build.
          </p>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {scan.top.map((w) => {
              const at = w.layers[0] ?? 0
              const parent = w.path.split("/").slice(0, -1).join("/")
              return (
                <li key={w.path}>
                  <button
                    type="button"
                    onClick={() => pick(at, parent)}
                    className="flex min-h-11 w-full min-w-0 items-center gap-3 px-3 py-2 text-start outline-none hover:bg-muted focus-visible:bg-muted"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-caption">
                      /{w.path}
                    </span>
                    <span className="shrink-0 text-caption text-muted-foreground">
                      {w.copies} copies · layers{" "}
                      {w.layers.map((l) => l + 1).join(", ")}
                    </span>
                    <span className="w-20 shrink-0 text-end text-body-sm font-medium tabular-nums">
                      {formatSize(w.bytes)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Block>
      )}
    </>
  )
}

function Tiles({ scan }: { scan: DockerLayerScan }) {
  const low = scan.efficiency < 0.9 && scan.wasted > 10 * 1024 * 1024
  const tiles = [
    {
      label: "Efficiency",
      value: pctText(scan.efficiency),
      hint: low ? "Room to shrink" : "Little waste",
      tone: low,
    },
    {
      label: "Wasted",
      value: formatSize(scan.wasted),
      hint: "Hidden copies",
      tone: low,
    },
    {
      label: "A container sees",
      value: formatSize(scan.final),
      hint: `${scan.files.toLocaleString()} files`,
    },
    {
      label: "All layers",
      value: formatSize(scan.total),
      hint: `${scan.layers.length} layers`,
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-border p-3"
        >
          <span className="text-caption text-muted-foreground">{t.label}</span>
          <span
            className={cn(
              "text-subheading tabular-nums",
              t.tone && "text-warning",
            )}
          >
            {t.value}
          </span>
          <span className="truncate text-caption text-ash">{t.hint}</span>
        </div>
      ))}
    </div>
  )
}

// Build steps read better without the shell wrapper Docker adds.
function stepText(s: string) {
  return (
    s
      .replace(/^\/bin\/sh -c #\(nop\)\s*/, "")
      .replace(/^\/bin\/sh -c /, "RUN ")
      .replace(/\s*# buildkit$/, "")
      .trim() || "(no step recorded)"
  )
}

function LayerList({
  layers,
  current,
  total,
  onPick,
}: {
  layers: DockerScanLayer[]
  current: number | null
  total: number
  onPick: (index: number) => void
}) {
  return (
    <ol className="divide-y divide-border rounded-2xl border border-border md:max-h-[32rem] md:overflow-y-auto">
      {layers.map((l) => {
        const share = total > 0 ? l.size / total : 0
        const on = l.index === current
        return (
          <li key={l.diff_id + l.index}>
            <button
              type="button"
              aria-current={on || undefined}
              onClick={() => onPick(l.index)}
              className={cn(
                "flex min-h-11 w-full min-w-0 flex-col gap-1 px-3 py-2 text-start outline-none hover:bg-muted focus-visible:bg-muted",
                on && "bg-brand-soft hover:bg-brand-soft",
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span
                  className={cn(
                    "w-6 shrink-0 text-caption tabular-nums",
                    on ? "text-brand-strong" : "text-ash",
                  )}
                >
                  {l.index + 1}
                </span>
                <span
                  className="min-w-0 flex-1 truncate font-mono text-caption"
                  title={l.created_by}
                >
                  {stepText(l.created_by)}
                </span>
                <span className="shrink-0 text-caption font-medium tabular-nums">
                  {formatSize(l.size)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash md:hidden" />
              </span>
              <span className="flex w-full items-center gap-2 ps-8">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{
                      width: `${Math.max(share * 100, l.size ? 1 : 0)}%`,
                    }}
                  />
                </span>
                <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                  {changeText(l)}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function changeText(l: DockerScanLayer) {
  const parts = [
    l.added && `+${l.added.toLocaleString()}`,
    l.modified && `~${l.modified.toLocaleString()}`,
    l.removed && `−${l.removed.toLocaleString()}`,
  ].filter(Boolean)
  return parts.length ? parts.join(" ") : "no files"
}

function Files({
  server,
  image,
  layer,
  count,
  path,
  setPath,
  changes,
  setChanges,
  onBack,
}: {
  server: string
  image: string
  layer: DockerScanLayer
  count: number
  path: string
  setPath: (p: string) => void
  changes: boolean
  setChanges: (v: boolean) => void
  onBack?: () => void
}) {
  const id = useId()
  const list = useLayerFiles(server, image, layer.index, path, changes, true)
  const parts = path ? path.split("/") : []
  const items = [...(list.data?.items ?? [])].sort(
    (a, b) =>
      Number(b.kind === "dir") - Number(a.kind === "dir") ||
      b.size - a.size ||
      a.name.localeCompare(b.name),
  )
  return (
    <section className="flex min-w-0 flex-col gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="-ms-1 flex min-h-11 items-center gap-1 self-start text-body-sm font-medium text-brand"
        >
          <ChevronLeft className="size-4" />
          Layers
        </button>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-body-sm font-medium">
          Layer {layer.index + 1} of {count}
          <span className="ms-2 font-normal text-muted-foreground">
            {formatSize(layer.size)}
            {layer.wasted > 0 && ` · hides ${formatSize(layer.wasted)}`}
          </span>
        </h3>
        <p className="line-clamp-3 font-mono text-caption break-all text-muted-foreground">
          {stepText(layer.created_by)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <nav
          aria-label="Folder"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 font-mono text-caption"
        >
          <Crumb onClick={() => setPath("")} current={parts.length === 0}>
            /
          </Crumb>
          {parts.map((p, i) => (
            <span key={parts.slice(0, i + 1).join("/")} className="flex">
              {i > 0 && <span className="px-0.5 text-ash">/</span>}
              <Crumb
                onClick={() => setPath(parts.slice(0, i + 1).join("/"))}
                current={i === parts.length - 1}
              >
                {p}
              </Crumb>
            </span>
          ))}
        </nav>
        <div className="flex min-h-11 items-center gap-2 text-body-sm md:min-h-0">
          <Switch
            id={`${id}-changes`}
            checked={changes}
            onCheckedChange={setChanges}
          />
          <label htmlFor={`${id}-changes`}>Only this layer's changes</label>
        </div>
      </div>
      <div className="rounded-2xl border border-border md:max-h-[32rem] md:overflow-y-auto">
        {list.isPending ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
          </div>
        ) : list.isError ? (
          <p className="p-3 text-body-sm text-destructive">
            {list.error.message}
          </p>
        ) : items.length === 0 ? (
          <p className="p-3 text-body-sm text-muted-foreground">
            {changes
              ? "This layer changed nothing here."
              : "This folder is empty."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((e) => (
              <Entry
                key={e.name}
                entry={e}
                layer={layer.index}
                onOpen={() => setPath(path ? `${path}/${e.name}` : e.name)}
              />
            ))}
          </ul>
        )}
      </div>
      {list.data?.truncated && (
        <Quiet>
          Only the biggest {items.length.toLocaleString()} are shown.
        </Quiet>
      )}
    </section>
  )
}

function Crumb({
  children,
  current,
  onClick,
}: {
  children: React.ReactNode
  current: boolean
  onClick: () => void
}) {
  return current ? (
    <span aria-current="page" className="rounded px-1 py-0.5 font-medium">
      {children}
    </span>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-1 py-0.5 text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 max-md:min-h-11"
    >
      {children}
    </button>
  )
}

const changeMeta: Record<string, { label: string; className: string }> = {
  added: { label: "Added", className: "bg-success/15 text-success" },
  modified: { label: "Replaced", className: "bg-warning/15 text-warning" },
  removed: {
    label: "Deleted",
    className: "bg-destructive/10 text-destructive",
  },
}

function Entry({
  entry: e,
  layer,
  onOpen,
}: {
  entry: DockerLayerEntry
  layer: number
  onOpen: () => void
}) {
  const dir = e.kind === "dir"
  const Icon = dir ? Folder : e.kind === "file" ? File : Link2
  const change = e.change ? changeMeta[e.change] : undefined
  const body = (
    <>
      <Icon
        className={cn("size-4 shrink-0", dir ? "text-brand" : "text-ash")}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-mono text-caption",
          e.change === "removed" && "text-muted-foreground line-through",
        )}
      >
        {e.name}
        {dir && "/"}
      </span>
      {change && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-label text-[10px] tracking-label uppercase",
            change.className,
          )}
        >
          {change.label}
        </span>
      )}
      {dir && e.changed > 0 && !change && (
        <span className="shrink-0 text-caption text-muted-foreground">
          {e.changed.toLocaleString()} changed
        </span>
      )}
      {!dir && e.layer !== layer && !change && (
        <span className="shrink-0 text-caption text-ash">
          from layer {e.layer + 1}
        </span>
      )}
      <span className="w-20 shrink-0 text-end text-caption tabular-nums">
        {formatSize(e.size)}
      </span>
      {dir && <ChevronRight className="size-4 shrink-0 text-ash" />}
    </>
  )
  return (
    <li>
      {dir ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 w-full min-w-0 items-center gap-2 px-3 py-1.5 text-start outline-none hover:bg-muted focus-visible:bg-muted md:min-h-9"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-11 w-full min-w-0 items-center gap-2 px-3 py-1.5 md:min-h-9">
          {body}
        </div>
      )}
    </li>
  )
}
