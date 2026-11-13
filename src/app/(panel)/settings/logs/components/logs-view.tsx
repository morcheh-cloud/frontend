"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ScrollText } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  NoMatch,
  PageBar,
  PhoneRow,
  Rows,
  Table,
  Tag,
  Tr,
} from "@/app/(panel)/containers/components/kit"
import {
  Empty,
  Loading,
  type Note,
  Notices,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { PageHeader } from "@/components/panel/page-header"
import { Button } from "@/components/ui/button"
import { useIsPhone } from "@/hooks/useIsPhone"
import { formatSize } from "@/lib/format"
import type { LogDatasetView, LogOverview } from "@/lib/services"
import { cn } from "@/lib/utils"
import { AdminOnly } from "../../components/no-access"
import { logKeys, useLogOverview, useRefreshSizes } from "../api"
import { ArchiveList } from "./archive-list"
import { useDatasetMenu } from "./log-actions"
import {
  datasetHref,
  formatCount,
  formatDay,
  groupDatasets,
  policyText,
  useListFilters,
} from "./meta"

export function LogsPage() {
  return (
    <AdminOnly>
      <PageHeader title="Logs & archives" guide="log-retention" />
      <LogsView />
    </AdminOnly>
  )
}

function LogsView() {
  const phone = useIsPhone()
  const overview = useLogOverview()
  const [f, setF] = useListFilters()
  const refresh = useRefreshSizes()
  const qc = useQueryClient()
  if (phone === null) return null
  if (overview.isPending)
    return (
      <div className={cn("flex flex-col gap-4", !phone && "px-6 pt-5")}>
        <Loading phone={phone} />
      </div>
    )
  if (overview.isError)
    return (
      <div className="px-4 py-5 md:px-6">
        <p className="text-body-sm text-destructive">
          Couldn't load the logs: {overview.error.message}
        </p>
        <Button
          variant="outline"
          className="mt-3 max-md:h-11"
          onClick={() => overview.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  const o = overview.data

  const tabs = (
    <Segmented
      label="Show"
      value={f.tab}
      onChange={(tab) => setF({ tab })}
      items={[
        { value: "kinds", label: "Kinds of logs" },
        { value: "archives", label: "Files" },
      ]}
    />
  )

  return (
    <div
      className={cn("flex flex-col", phone ? "pb-6" : "gap-4 px-6 pt-5 pb-10")}
    >
      <PageBar
        phone={phone}
        tabs={tabs}
        search={
          f.tab === "kinds" ? (
            <SearchBox
              value={f.q}
              onChange={(q) => setF({ q: q || null })}
              placeholder="Search kinds of logs"
              label="Search kinds of logs"
              className="max-md:flex-1"
            />
          ) : undefined
        }
        caption={<Totals o={o} />}
        refresh={
          f.tab === "kinds"
            ? {
                busy: refresh.isPending,
                run: () => refresh.mutate(),
              }
            : {
                busy: false,
                run: () => qc.invalidateQueries({ queryKey: logKeys.all }),
              }
        }
      />
      <Notices notes={notesOf(o)} className={cn(phone && "mb-2")} />
      {phone && f.tab === "kinds" && (
        <p className="px-4 pt-3 text-caption text-muted-foreground">
          <Totals o={o} />
        </p>
      )}
      {f.tab === "kinds" ? (
        <Kinds o={o} q={f.q} phone={phone} onReset={() => setF({ q: null })} />
      ) : (
        <div className={cn(phone && "pt-4")}>
          <ArchiveList
            phone={phone}
            filters={f}
            onFilters={(patch) => setF(patch)}
            datasets={o.items}
          />
        </div>
      )}
    </div>
  )
}

function Totals({ o }: { o: LogOverview }) {
  const files = o.items.reduce((n, d) => n + d.archives.files, 0)
  return (
    <>
      Database {formatSize(o.database_bytes)} · logs {formatSize(o.log_bytes)} ·{" "}
      {formatCount(files)} {files === 1 ? "file" : "files"}
    </>
  )
}

function notesOf(o: LogOverview): Note[] {
  const notes: Note[] = []
  if (o.local_total > 0) {
    const share = o.local_free / o.local_total
    if (share < 0.1 || o.local_free < 2 * 1024 ** 3) {
      notes.push({
        key: "disk",
        warn: true,
        title: `Morche's disk is almost full: ${formatSize(o.local_free)} free`,
        body: `Files kept on Morche's disk (${formatSize(o.local_bytes)} now) live in ${o.local_dir}. Send them to a storage instead, or keep them fewer days.`,
      })
    }
  }
  const failed = o.items.filter((d) => d.policy?.last_state === "failed")
  if (failed.length) {
    notes.push({
      key: "failed",
      warn: true,
      title:
        failed.length === 1
          ? `The policy for ${failed[0].title} failed last time`
          : `${failed.length} policies failed last time`,
      body: failed[0].policy?.last_note,
      action: (
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          render={<Link href={datasetHref(failed[0].key)} />}
          nativeButton={false}
        >
          Open
        </Button>
      ),
    })
  }
  return notes
}

function matches(d: LogDatasetView, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const text = `${d.title} ${d.about} ${d.group} ${d.key}`.toLowerCase()
  return words.every((w) => text.includes(w))
}

function Kinds({
  o,
  q,
  phone,
  onReset,
}: {
  o: LogOverview
  q: string
  phone: boolean
  onReset: () => void
}) {
  const items = o.items.filter((d) => matches(d, q))
  if (o.items.length === 0)
    return (
      <Empty
        icon={ScrollText}
        title="No kinds of logs"
        body="The backend didn't list any."
      />
    )
  if (items.length === 0) return <NoMatch onReset={onReset} />
  const groups = groupDatasets(items)
  return (
    <div className={cn("flex flex-col", phone ? "gap-2" : "gap-6")}>
      {groups.map(([group, list]) => (
        <section key={group} aria-label={group}>
          <h2
            className={cn(
              "font-label text-caption tracking-label text-ash uppercase",
              phone ? "px-4 pt-4 pb-2" : "mb-2",
            )}
          >
            {group}
          </h2>
          {phone ? (
            <Rows>
              {list.map((d) => (
                <KindPhoneRow key={d.key} d={d} />
              ))}
            </Rows>
          ) : (
            <Table
              head={[
                { label: "Kind" },
                { label: "Rows", className: "text-end w-24" },
                { label: "Size", className: "text-end w-24" },
                { label: "Oldest", className: "hidden @4xl:table-cell w-32" },
                { label: "What happens to old rows", className: "w-72" },
                { label: "Files", className: "hidden @3xl:table-cell w-28" },
              ]}
            >
              {list.map((d) => (
                <KindRow key={d.key} d={d} />
              ))}
            </Table>
          )}
        </section>
      ))}
    </div>
  )
}

function Policy({ d }: { d: LogDatasetView }) {
  const text = policyText(d.policy)
  const failed = d.policy?.last_state === "failed"
  if (!text || !d.policy?.enabled) {
    return (
      <span className="text-muted-foreground">
        {text ?? "No policy"}
        <span className="block text-caption text-ash">
          {d.builtin ? `Built-in: ${d.builtin}` : "Rows are kept for ever"}
        </span>
      </span>
    )
  }
  return (
    <span>
      {text}
      {d.is_default ? (
        <Tag tone="muted">Default</Tag>
      ) : (
        <Tag tone="brand">Changed</Tag>
      )}
      <span
        className={cn(
          "block text-caption text-muted-foreground",
          failed && "text-warning",
        )}
      >
        {failed
          ? `Failed ${timeAgo(d.policy.last_run_at ?? null)}`
          : d.policy.last_run_at
            ? `Ran ${timeAgo(d.policy.last_run_at)}`
            : d.policy.next_run_at
              ? `First run ${timeAgo(d.policy.next_run_at)}`
              : "Hasn't run yet"}
      </span>
    </span>
  )
}

function KindRow({ d }: { d: LogDatasetView }) {
  const router = useRouter()
  const menu = useDatasetMenu(d)
  return (
    <Tr
      onOpen={() => router.push(datasetHref(d.key))}
      label={d.title}
      menu={menu}
      cells={[
        {
          node: (
            <>
              <span className="font-medium">{d.title}</span>
              {d.error && <Tag tone="warning">Can't read</Tag>}
              {d.archives.held > 0 && <Tag tone="brand">Rows back</Tag>}
              <span className="block truncate text-caption text-muted-foreground">
                {d.about}
              </span>
            </>
          ),
        },
        { node: formatCount(d.rows), className: "text-end tabular-nums" },
        {
          node: formatSize(d.bytes),
          className: "text-end tabular-nums text-muted-foreground",
        },
        {
          node: formatDay(d.oldest),
          className:
            "hidden whitespace-nowrap text-muted-foreground @4xl:table-cell",
        },
        { node: <Policy d={d} /> },
        {
          node: d.archives.files ? (
            <span>
              {formatCount(d.archives.files)}
              <span className="block text-caption text-muted-foreground">
                {formatSize(d.archives.bytes)}
              </span>
            </span>
          ) : (
            <span className="text-ash">None</span>
          ),
          className: "hidden @3xl:table-cell",
        },
      ]}
    />
  )
}

function KindPhoneRow({ d }: { d: LogDatasetView }) {
  const router = useRouter()
  const menu = useDatasetMenu(d)
  return (
    <PhoneRow
      id={`log-${d.key}`}
      title={d.title}
      sub={[
        `${formatCount(d.rows)} rows`,
        formatSize(d.bytes),
        `${policyText(d.policy) ?? "No policy"}${d.is_default ? " (default)" : ""}`,
      ].join(" · ")}
      onOpen={() => router.push(datasetHref(d.key))}
      menu={menu}
    />
  )
}
