"use client"

import { FolderOpen, ScanSearch } from "lucide-react"
import Link from "next/link"

import { Facts } from "@/app/(panel)/servers/[id]/components/parts"
import { Meter } from "@/app/(panel)/servers/[id]/components/resources"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { bucketLabel, LineChart, Tip } from "@/components/charts/time-chart"
import { filesHref } from "@/components/files/file-manager"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  countOf,
  formatCount,
  formatMs,
  type Model,
  type StorageModel,
} from "./model"
import { diskNote, useMeasure } from "./parts"

// One storage's space: when it was measured, its biggest folders and how
// much it held over the range.
export function UsageLayer({
  storage,
  model,
  open,
  onOpenChange,
  phone,
}: {
  storage: StorageModel
  model: Model
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
}) {
  const measure = useMeasure()
  const busy = measure.running.has(storage.id)
  const button = measure.can(storage) && (
    <Button
      variant="outline"
      size={phone ? "lg" : "default"}
      className={cn(phone && "w-full")}
      disabled={busy || storage.status !== "online"}
      onClick={() => measure.start(storage)}
    >
      <ScanSearch className={cn(busy && "animate-pulse")} />
      {busy ? "Measuring…" : "Measure now"}
    </Button>
  )
  const subtitle = storage.usage
    ? `Measured ${timeAgo(storage.usage.measured_at)}`
    : "Not measured yet"
  const body = <UsageDetails storage={storage} model={model} />

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={storage.name}
        full
        header={
          <div className="px-6 pt-1 pb-3">
            <p className="truncate text-subheading font-medium">
              {storage.name}
            </p>
            <p className="truncate text-body-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        }
        footer={button || undefined}
      >
        <div className="flex flex-col gap-5 pb-2">{body}</div>
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="truncate pe-6 text-body">
            {storage.name}
          </SheetTitle>
          <SheetDescription className="truncate">{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
          {body}
        </div>
        {button && (
          <div className="flex justify-end border-t border-border px-6 py-3">
            {button}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// The last measurement at or before each bucket's end; null before the
// first one.
function carried(model: Model, storage: StorageModel) {
  const points = storage.history
  let k = -1
  return model.buckets.starts.map((start) => {
    const end = start + model.buckets.size
    while (k + 1 < points.length && Date.parse(points[k + 1].t) < end) k++
    return k < 0 ? null : points[k].used_bytes
  })
}

function UsageDetails({
  storage: s,
  model,
}: {
  storage: StorageModel
  model: Model
}) {
  const u = s.usage
  if (!u) {
    return (
      <p className="px-2 text-body-sm text-muted-foreground">
        {s.status === "online"
          ? "Morcheh measures each storage about once a day. Measure it now to see what it holds."
          : "It can be measured once it's online again."}
      </p>
    )
  }
  const disk = diskNote(s)
  const values = carried(model, s)
  const top = [...u.top].sort(
    (a, b) => Number(a.other) - Number(b.other) || b.bytes - a.bytes,
  )
  return (
    <>
      <Facts
        items={[
          { label: "Used", value: formatSize(u.used_bytes) },
          { label: "Files", value: formatCount(u.files) },
          { label: "Folders", value: formatCount(u.folders) },
          { label: "Took", value: formatMs(u.duration_ms) },
          ...(disk
            ? [
                {
                  label: "Disk",
                  wide: true,
                  value: (
                    <span className="flex flex-col gap-1.5">
                      {disk.text}
                      <Meter
                        value={disk.percent}
                        label={disk.text}
                        className="h-1.5"
                      />
                    </span>
                  ),
                },
              ]
            : []),
        ]}
      />
      {u.partial && (
        <p className="mx-2 rounded-lg bg-subtle px-3 py-2 text-body-sm text-muted-foreground">
          <span className="font-medium text-warning">Partial.</span> It was too
          big to walk in time, so it holds at least this much.
        </p>
      )}

      <section className="px-2">
        <h3 className="mb-3 text-body-sm font-medium">Biggest folders</h3>
        {top.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">It's empty.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {top.map((p) => {
              const name = p.other
                ? "Everything else"
                : p.name || "Files at the top"
              const href =
                !p.other && p.name
                  ? `/storage/${s.id}${filesHref({ path: `/${p.name}` })}`
                  : null
              const share = u.used_bytes ? p.bytes / u.used_bytes : 0
              return (
                <li key={`${p.other}-${p.name}`} className="text-body-sm">
                  <div className="flex items-baseline gap-2">
                    {href ? (
                      <Link
                        href={href}
                        className="flex min-w-0 items-center gap-1.5 hover:text-brand"
                      >
                        <FolderOpen className="size-3.5 shrink-0 text-ash" />
                        <span className="truncate">{name}</span>
                      </Link>
                    ) : (
                      <span className="truncate text-muted-foreground">
                        {name}
                      </span>
                    )}
                    <span className="ms-auto shrink-0 tabular-nums">
                      {formatSize(p.bytes)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.max(1, share * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-caption text-ash">
                    {Math.round(share * 100)}% · {countOf(p.files, "file")}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {values.some((v) => v !== null) && (
        <section className="px-2">
          <h3 className="mb-3 text-body-sm font-medium">Used over time</h3>
          <LineChart
            buckets={model.buckets}
            values={values}
            format={formatSize}
            height={160}
            label={`Space used by ${s.name} over time`}
            tooltip={(i) => (
              <Tip
                title={bucketLabel(model.buckets, i)}
                rows={[
                  {
                    label: "Used",
                    value:
                      values[i] === null
                        ? "Not measured"
                        : formatSize(values[i] ?? 0),
                  },
                ]}
              />
            )}
          />
        </section>
      )}
    </>
  )
}
