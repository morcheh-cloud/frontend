"use client"

import { Archive, ChevronLeft, ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

import {
  ChoiceChip,
  NoMatch,
  PhoneRow,
  Rows,
  Table,
  Tag,
  Tr,
} from "@/app/(panel)/containers/components/kit"
import { Empty, StateDot } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { LogArchiveView, LogDatasetView } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useArchives } from "../api"
import { archiveTone, useArchiveMenu, useLogActions } from "./log-actions"
import {
  archiveStates,
  formatCount,
  formatStamp,
  heldText,
  kindLabel,
  stateFilterLabel,
  windowLabel,
} from "./meta"

const LIMIT = 25

export type ArchiveFilters = {
  dataset: string
  state: (typeof archiveStates)[number]
  held: boolean
  page: number
}

function placesOf(a: LogArchiveView) {
  const names = a.copies.map((c) =>
    c.local ? "Morche's disk" : c.storage_name || "Removed storage",
  )
  if (names.length <= 2) return names.join(", ")
  return `${names[0]} +${names.length - 1}`
}

// The archive files: of one kind of log (its page) or of every kind.
export function ArchiveList({
  phone,
  filters: f,
  onFilters,
  datasets,
  fixedDataset,
  barSlot,
}: {
  phone: boolean
  filters: ArchiveFilters
  onFilters: (patch: Partial<ArchiveFilters>) => void
  datasets: LogDatasetView[]
  // On a kind's own page: no dataset column or filter.
  fixedDataset?: string
  // Rendered before the filters (tabs on the main page).
  barSlot?: ReactNode
}) {
  const dataset = fixedDataset ?? f.dataset
  const list = useArchives({
    dataset: dataset || undefined,
    state: f.state,
    held: f.held,
    page: f.page,
    limit: LIMIT,
  })
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / LIMIT))
  const filtered = !!(f.state || f.held || (!fixedDataset && f.dataset))

  const filterChips = (
    <>
      {!fixedDataset && (
        <ChoiceChip
          phone={phone}
          label="Kind"
          value={f.dataset}
          options={[
            { value: "", label: "All" },
            ...datasets.map((d) => ({ value: d.key, label: d.title })),
          ]}
          onChange={(v) => onFilters({ dataset: v, page: 1 })}
        />
      )}
      <ChoiceChip
        phone={phone}
        label="State"
        value={f.state}
        options={archiveStates.map((s) => ({
          value: s,
          label: stateFilterLabel[s],
        }))}
        onChange={(v) => onFilters({ state: v, page: 1 })}
      />
      <ChoiceChip
        phone={phone}
        label="Rows"
        value={f.held ? "held" : ""}
        options={[
          { value: "", label: "Any" },
          { value: "held", label: "Put back now" },
        ]}
        onChange={(v) => onFilters({ held: v === "held", page: 1 })}
      />
    </>
  )

  const bar = (
    <div
      className={cn(
        phone
          ? "flex [scrollbar-width:none] gap-2 overflow-x-auto px-4"
          : "flex flex-wrap items-center gap-2",
      )}
    >
      {barSlot}
      {filterChips}
      {!phone && total > 0 && (
        <span className="ms-auto text-caption text-muted-foreground">
          {formatCount(total)} {total === 1 ? "file" : "files"}
        </span>
      )}
    </div>
  )

  let body: ReactNode
  if (list.isPending) {
    body = phone ? (
      <div className="flex flex-col gap-2 px-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    ) : (
      <Skeleton className="h-64 rounded-2xl" />
    )
  } else if (list.isError) {
    body = (
      <p className="px-4 text-body-sm text-destructive md:px-0">
        Couldn't load the files: {list.error.message}
      </p>
    )
  } else if (items.length === 0) {
    body = filtered ? (
      <NoMatch
        onReset={() =>
          onFilters({ state: "", held: false, dataset: "", page: 1 })
        }
      />
    ) : (
      <Empty
        icon={Archive}
        title="No files yet"
        body="Files appear here when a policy runs or someone exports logs."
        className="max-md:mt-4"
      />
    )
  } else if (phone) {
    body = (
      <Rows>
        {items.map((a) => (
          <ArchivePhoneRow key={a.id} archive={a} showDataset={!fixedDataset} />
        ))}
      </Rows>
    )
  } else {
    body = (
      <Table
        head={[
          { label: "Rows from" },
          ...(fixedDataset ? [] : [{ label: "Kind of log" }]),
          { label: "Rows", className: "text-end" },
          { label: "Size", className: "text-end" },
          { label: "Kept on", className: "hidden @3xl:table-cell" },
          { label: "State" },
          { label: "Made", className: "hidden @4xl:table-cell" },
        ]}
      >
        {items.map((a) => (
          <ArchiveRow key={a.id} archive={a} showDataset={!fixedDataset} />
        ))}
      </Table>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {bar}
      {body}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 pb-4 text-body-sm">
          <Button
            variant="outline"
            size="icon"
            className="size-11 md:size-9"
            aria-label="Newer files"
            disabled={f.page <= 1}
            onClick={() => onFilters({ page: f.page - 1 })}
          >
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <span className="text-muted-foreground tabular-nums">
            Page {f.page} of {pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-11 md:size-9"
            aria-label="Older files"
            disabled={f.page >= pages}
            onClick={() => onFilters({ page: f.page + 1 })}
          >
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  )
}

function Title({ archive: a }: { archive: LogArchiveView }) {
  return (
    <>
      <span className="font-medium">{windowLabel(a.from, a.to)}</span>
      {a.mode !== "archive" && (
        <Tag tone={a.note ? "brand" : "muted"}>{kindLabel(a)}</Tag>
      )}
      {a.restore.state === "held" && <Tag tone="brand">Rows back</Tag>}
    </>
  )
}

function ArchiveRow({
  archive: a,
  showDataset,
}: {
  archive: LogArchiveView
  showDataset: boolean
}) {
  const act = useLogActions()
  const menu = useArchiveMenu(a)
  const tone = archiveTone(a)
  return (
    <Tr
      onOpen={() => act.details(a)}
      menu={menu}
      label={a.file_name}
      cells={[
        {
          node: (
            <>
              <Title archive={a} />
              {(a.note || a.restore.state === "held") && (
                <span className="block truncate text-caption text-muted-foreground">
                  {heldText(a) ?? a.note}
                </span>
              )}
            </>
          ),
        },
        ...(showDataset
          ? [{ node: a.dataset_title, className: "text-muted-foreground" }]
          : []),
        {
          node: formatCount(a.rows),
          className: "text-end tabular-nums",
        },
        {
          node: formatSize(a.bytes),
          className: "text-end tabular-nums text-muted-foreground",
        },
        {
          node: placesOf(a),
          className:
            "hidden max-w-56 truncate text-muted-foreground @3xl:table-cell",
        },
        { node: <StateDot tone={tone.tone} label={tone.label} /> },
        {
          node: formatStamp(a.created_at),
          className:
            "hidden whitespace-nowrap text-muted-foreground @4xl:table-cell",
        },
      ]}
    />
  )
}

function ArchivePhoneRow({
  archive: a,
  showDataset,
}: {
  archive: LogArchiveView
  showDataset: boolean
}) {
  const act = useLogActions()
  const menu = useArchiveMenu(a)
  const tone = archiveTone(a)
  return (
    <PhoneRow
      id={a.id}
      title={windowLabel(a.from, a.to)}
      sub={[
        showDataset ? a.dataset_title : kindLabel(a),
        `${formatCount(a.rows)} rows`,
        formatSize(a.bytes),
        tone.label,
      ].join(" · ")}
      onOpen={() => act.details(a)}
      menu={menu}
    />
  )
}
