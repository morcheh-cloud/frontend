"use client"

import {
  ExternalLink,
  Loader2,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type {
  DockerFleetServer,
  DockerImageScan,
  DockerScanCounts,
  DockerScanFinding,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  useActiveDockerJob,
  useDockerScan,
  useDockerScans,
  useScanImages,
} from "../api"
import { EnvPage } from "./env-page"
import { BulkBar, NoMatch, PageBar, PhoneRow, Rows } from "./kit"
import { shortId } from "./meta"
import { Layer, Quiet } from "./parts"
import { useDockerCan } from "./permissions"

type Severity = DockerScanFinding["severity"]

export const severities: {
  key: keyof Omit<DockerScanCounts, "fixable">
  value: Severity
  label: string
  short: string
  bar: string
  text: string
}[] = [
  {
    key: "critical",
    value: "CRITICAL",
    label: "Critical",
    short: "C",
    bar: "bg-destructive",
    text: "text-destructive",
  },
  {
    key: "high",
    value: "HIGH",
    label: "High",
    short: "H",
    bar: "bg-warning",
    text: "text-warning",
  },
  {
    key: "medium",
    value: "MEDIUM",
    label: "Medium",
    short: "M",
    bar: "bg-warning/45",
    text: "text-foreground",
  },
  {
    key: "low",
    value: "LOW",
    label: "Low",
    short: "L",
    bar: "bg-mist",
    text: "text-muted-foreground",
  },
  {
    key: "unknown",
    value: "UNKNOWN",
    label: "Unknown",
    short: "?",
    bar: "bg-muted",
    text: "text-ash",
  },
]

const shows = ["risky", "unscanned", "all"] as const
type Show = (typeof shows)[number]

const filterParsers = {
  show: parseAsStringLiteral(shows).withDefault("all"),
  q: parseAsString.withDefault(""),
}

const SCAN_JOBS = ["docker-scan"]

function risky(s: DockerImageScan) {
  return !!s.counts && s.counts.critical + s.counts.high > 0
}

function imageLabel(s: DockerImageScan) {
  return s.tags[0] ?? s.image ?? shortId(s.image_id.replace(/^sha256:/, ""))
}

export function SecurityPage() {
  return (
    <EnvPage title="Security" bleed>
      {(ctx) => <SecurityView {...ctx} />}
    </EnvPage>
  )
}

// /containers/security: known vulnerabilities in the environment's images,
// found by Trivy on the server.
export function SecurityView({
  env,
  phone,
}: {
  env: DockerFleetServer
  phone: boolean
}) {
  const id = env.server_id
  const can = useDockerCan(id, env.workspace_id)
  const query = useDockerScans(id)
  const scan = useScanImages()
  const running = useActiveDockerJob(id, SCAN_JOBS)
  const [filters, setFilters] = useQueryStates(filterParsers, {
    history: "replace",
  })
  const [picked, setPicked] = useState<string[]>([])
  const [open, setOpen] = useOpen("docker-scan-findings")
  const [image, setImage] = useState<string | null>(null)

  const items = query.data?.items ?? []
  const totals = query.data?.totals
  const unscanned = items.filter((s) => !s.scanned)
  const q = filters.q.trim().toLowerCase()
  const shown = items.filter(
    (s) =>
      (filters.show === "all" ||
        (filters.show === "risky" && risky(s)) ||
        (filters.show === "unscanned" && !s.scanned)) &&
      (!q ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.image.toLowerCase().includes(q) ||
        s.containers.some((c) => c.name.toLowerCase().includes(q))),
  )
  const busy = scan.isPending || !!running

  const runScan = (body: { images?: string[]; all?: boolean }) =>
    scan.mutate(
      { server: id, ...body },
      {
        onSuccess: () => setPicked([]),
        onError: (e) =>
          toast.error("Couldn't start the scan", { description: e.message }),
      },
    )
  const show = (s: DockerImageScan) => {
    setImage(s.image_id)
    setOpen(true)
  }
  const menu = (s: DockerImageScan): Item[][] => [
    [
      {
        key: "open",
        label: "Show the findings",
        icon: <ShieldAlert />,
        disabled: !s.scanned,
        onSelect: () => show(s),
      },
      ...(can.manage
        ? [
            {
              key: "scan",
              label: s.scanned ? "Scan again" : "Scan",
              icon: <ScanSearch />,
              disabled: busy,
              onSelect: () => runScan({ images: [s.image_id] }),
            },
          ]
        : []),
    ],
  ]

  const tabs = (
    <Segmented
      label="Show"
      value={filters.show}
      onChange={(v: Show) => setFilters({ show: v === "all" ? null : v })}
      items={[
        { value: "all", label: `All ${items.length}` },
        {
          value: "risky",
          label: `Critical or high ${items.filter(risky).length}`,
        },
        { value: "unscanned", label: `Not scanned ${unscanned.length}` },
      ]}
    />
  )

  let body: React.ReactNode
  if (query.isPending) {
    body = <Skeleton className="h-72 rounded-2xl max-md:mx-4" />
  } else if (query.isError) {
    body = (
      <Empty
        icon={ShieldQuestion}
        title="Couldn't read the scans"
        body={query.error.message}
        className="max-md:mt-4"
      />
    )
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={ShieldCheck}
        title="No images on this server"
        body="Images show up here once they are pulled or built."
        className="max-md:mt-4"
      />
    )
  } else if (unscanned.length === items.length && !q) {
    body = (
      <Empty
        icon={ScanSearch}
        title="No image scanned yet"
        body={`Morche runs Trivy on the server: the trivy command if it's installed, else the ${query.data.scanner} image through Docker. The first scan downloads the vulnerability database, so it takes a few minutes.`}
        className="max-md:mt-4"
        action={
          can.manage && (
            <Button onClick={() => runScan({ all: true })} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <ScanSearch />}
              {busy ? "Scanning…" : "Scan every image"}
            </Button>
          )
        }
      />
    )
  } else if (shown.length === 0) {
    body =
      filters.show === "risky" && !q ? (
        <Empty
          icon={ShieldCheck}
          title="No critical or high findings"
          body="In the images scanned so far."
          className="max-md:mt-4"
        />
      ) : (
        <NoMatch onReset={() => setFilters({ q: null, show: null })} />
      )
  } else if (phone) {
    body = (
      <Rows>
        {shown.map((s) => (
          <PhoneRow
            key={s.image_id}
            id={s.image_id}
            title={imageLabel(s)}
            sub={<ScanLine s={s} />}
            onOpen={() => (s.scanned ? show(s) : undefined)}
            menu={menu(s)}
          />
        ))}
      </Rows>
    )
  } else {
    const all =
      shown.length > 0 && shown.every((s) => picked.includes(s.image_id))
    body = (
      <div className="@container overflow-hidden rounded-2xl border border-border [contain:inline-size]">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr>
              {can.manage && (
                <th scope="col" className="w-10 ps-4">
                  <Checkbox
                    aria-label="Select every image"
                    checked={all}
                    onCheckedChange={(v) =>
                      setPicked(v ? shown.map((s) => s.image_id) : [])
                    }
                  />
                </th>
              )}
              <th scope="col" className="h-10 px-3 text-start font-medium">
                Image
              </th>
              <th scope="col" className="px-3 text-start font-medium">
                Findings
              </th>
              <th
                scope="col"
                className="hidden px-3 text-start font-medium @2xl:table-cell"
              >
                Fixable
              </th>
              <th
                scope="col"
                className="hidden px-3 text-start font-medium @3xl:table-cell"
              >
                Used by
              </th>
              <th
                scope="col"
                className="hidden px-3 text-start font-medium @4xl:table-cell"
              >
                Scanned
              </th>
              <th scope="col" className="w-12 pe-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((s) => (
              <tr key={s.image_id} className="hover:bg-subtle/60">
                {can.manage && (
                  <td className="ps-4">
                    <Checkbox
                      aria-label={`Select ${imageLabel(s)}`}
                      checked={picked.includes(s.image_id)}
                      onCheckedChange={(v) =>
                        setPicked((p) =>
                          v
                            ? [...p, s.image_id]
                            : p.filter((x) => x !== s.image_id),
                        )
                      }
                    />
                  </td>
                )}
                <td
                  className={cn("max-w-80 px-3 py-2.5", !can.manage && "ps-4")}
                >
                  <button
                    type="button"
                    disabled={!s.scanned}
                    onClick={() => show(s)}
                    className="block max-w-full truncate text-start font-medium outline-none focus-visible:underline enabled:hover:underline"
                    title={s.tags.join(", ") || s.image_id}
                  >
                    {imageLabel(s)}
                  </button>
                  <span className="text-caption text-muted-foreground">
                    {formatSize(s.size)}
                    {s.tags.length > 1 && ` · +${s.tags.length - 1} tags`}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Counts s={s} />
                </td>
                <td className="hidden px-3 py-2.5 text-muted-foreground tabular-nums @2xl:table-cell">
                  {s.counts ? s.counts.fixable : "—"}
                </td>
                <td className="hidden max-w-60 truncate px-3 py-2.5 text-muted-foreground @3xl:table-cell">
                  {s.containers.length === 0
                    ? "Not in use"
                    : s.containers.map((c) => c.name).join(", ")}
                </td>
                <td className="hidden px-3 py-2.5 whitespace-nowrap text-muted-foreground @4xl:table-cell">
                  {s.scanned_at ? timeAgo(s.scanned_at) : "—"}
                </td>
                <td className="pe-2 text-end">
                  <ItemMenu
                    label={`${imageLabel(s)} actions`}
                    groups={menu(s)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const caption = running
    ? "Scanning…"
    : totals
      ? `${totals.critical} critical · ${totals.high} high · ${totals.fixable} fixable`
      : undefined

  return (
    <>
      <PageBar
        phone={phone}
        tabs={tabs}
        search={
          <SearchBox
            value={filters.q}
            onChange={(v) => setFilters({ q: v || null })}
            placeholder="Search images or containers"
            label="Search images"
            className="md:max-w-72"
          />
        }
        caption={caption}
        refresh={{ busy: query.isFetching, run: () => query.refetch() }}
        aside={
          !phone &&
          can.manage &&
          unscanned.length > 0 &&
          unscanned.length < items.length && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                runScan({ images: unscanned.map((s) => s.image_id) })
              }
            >
              <ScanSearch />
              Scan {unscanned.length} new
            </Button>
          )
        }
        primary={
          can.manage
            ? {
                label: busy ? "Scanning…" : "Scan all",
                icon: busy ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ScanSearch />
                ),
                run: busy ? () => {} : () => runScan({ all: true }),
              }
            : undefined
        }
      />
      {phone && totals && (
        <p className="px-4 pt-3 text-caption text-muted-foreground">
          {caption}
        </p>
      )}
      <div className={cn(phone ? "pt-3 pb-24" : "mt-4")}>{body}</div>
      {!phone && picked.length > 0 && (
        <BulkBar
          count={picked.length}
          onClear={() => setPicked([])}
          actions={[
            {
              label: "Scan",
              icon: <ScanSearch />,
              run: () => runScan({ images: picked }),
            },
          ]}
        />
      )}
      <FindingsLayer
        open={open}
        onOpenChange={setOpen}
        serverId={id}
        image={image}
      />
    </>
  )
}

function ScanLine({ s }: { s: DockerImageScan }) {
  if (s.error) return <span className="text-warning">Scan failed</span>
  if (!s.scanned || !s.counts) return <span>Not scanned</span>
  const c = s.counts
  const total = c.critical + c.high + c.medium + c.low + c.unknown
  if (total === 0) return <span>No known vulnerabilities</span>
  return (
    <span>
      {c.critical > 0 && (
        <span className="text-destructive">{c.critical} critical · </span>
      )}
      {c.high > 0 && <span className="text-warning">{c.high} high · </span>}
      {total} in all
    </span>
  )
}

function Counts({ s }: { s: DockerImageScan }) {
  if (s.error) {
    return (
      <span className="text-warning" title={s.error}>
        Scan failed
      </span>
    )
  }
  if (!s.scanned || !s.counts) {
    return <span className="text-ash">Not scanned</span>
  }
  const c = s.counts
  const total = c.critical + c.high + c.medium + c.low + c.unknown
  if (total === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-success">
        <ShieldCheck className="size-4" />
        None known
      </span>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {severities
        .filter((v) => c[v.key] > 0)
        .map((v) => (
          <span
            key={v.key}
            title={`${c[v.key]} ${v.label.toLowerCase()}`}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-caption tabular-nums"
          >
            <span className={cn("size-2 rounded-full", v.bar)} />
            {c[v.key]}
            <span className="sr-only">{v.label}</span>
            <span aria-hidden className="text-ash">
              {v.short}
            </span>
          </span>
        ))}
    </span>
  )
}

const LIMIT = 150

function FindingsLayer({
  open,
  onOpenChange,
  serverId,
  image,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  image: string | null
}) {
  const query = useDockerScan(serverId, open ? image : null)
  const [severity, setSeverity] = useState<"all" | Severity>("all")
  const [fixable, setFixable] = useState(false)
  const [q, setQ] = useState("")
  const [limit, setLimit] = useState(LIMIT)
  const d = query.data
  const findings = d?.findings ?? []
  const needle = q.trim().toLowerCase()
  const shown = findings.filter(
    (f) =>
      (severity === "all" || f.severity === severity) &&
      (!fixable || !!f.fixed) &&
      (!needle ||
        f.id.toLowerCase().includes(needle) ||
        f.package.toLowerCase().includes(needle) ||
        (f.title ?? "").toLowerCase().includes(needle)),
  )

  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={d ? (d.tags[0] ?? d.image) : "Findings"}
      subtitle={
        d?.scanned_at &&
        `Scanned ${timeAgo(d.scanned_at).toLowerCase()}${d.scanner ? ` with ${d.scanner}` : ""}`
      }
    >
      {query.isPending ? (
        <Skeleton className="h-60 rounded-2xl" />
      ) : query.isError ? (
        <Quiet>{query.error.message}</Quiet>
      ) : (
        <>
          {d?.error && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-body-sm">
              The last scan failed: {d.error}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <div className="-mx-2 flex [scrollbar-width:none] gap-2 overflow-x-auto px-2">
              <Segmented
                label="Severity"
                value={severity}
                onChange={(v: "all" | Severity) => {
                  setSeverity(v)
                  setLimit(LIMIT)
                }}
                items={[
                  { value: "all", label: `All ${findings.length}` },
                  ...severities
                    .filter((v) => (d?.counts?.[v.key] ?? 0) > 0)
                    .map((v) => ({
                      value: v.value,
                      label: `${v.label} ${d?.counts?.[v.key] ?? 0}`,
                    })),
                ]}
              />
            </div>
            <div className="flex items-center gap-3">
              <SearchBox
                value={q}
                onChange={(v) => {
                  setQ(v)
                  setLimit(LIMIT)
                }}
                placeholder="CVE, package or title"
                label="Search findings"
                className="flex-1"
              />
              <div className="flex shrink-0 items-center gap-2 text-body-sm">
                <Switch
                  id="findings-fixable"
                  checked={fixable}
                  onCheckedChange={setFixable}
                />
                <label htmlFor="findings-fixable">Has a fix</label>
              </div>
            </div>
          </div>
          {findings.length === 0 ? (
            <Empty
              icon={ShieldCheck}
              title="No known vulnerabilities"
              body="Trivy found nothing in this image's packages."
            />
          ) : shown.length === 0 ? (
            <Quiet>Nothing matches.</Quiet>
          ) : (
            <ul className="-mx-2 divide-y divide-border">
              {shown.slice(0, limit).map((f) => (
                <Finding key={`${f.id}-${f.package}-${f.target}`} f={f} />
              ))}
            </ul>
          )}
          {shown.length > limit && (
            <Button
              variant="outline"
              className="self-center"
              onClick={() => setLimit((n) => n + LIMIT)}
            >
              Show more ({shown.length - limit} left)
            </Button>
          )}
        </>
      )}
    </Layer>
  )
}

function Finding({ f }: { f: DockerScanFinding }) {
  const sev = severities.find((v) => v.value === f.severity) ?? severities[4]
  return (
    <li className="flex flex-col gap-1 px-2 py-3">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", sev.bar)} />
        <span className={cn("text-caption font-medium", sev.text)}>
          {sev.label}
        </span>
        {f.url ? (
          <a
            href={f.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 font-mono text-body-sm font-medium hover:underline"
          >
            {f.id}
            <ExternalLink className="size-3.5 text-ash" />
          </a>
        ) : (
          <span className="font-mono text-body-sm font-medium">{f.id}</span>
        )}
      </div>
      {f.title && <p className="text-body-sm">{f.title}</p>}
      <p className="text-caption text-muted-foreground">
        <span className="font-mono">{f.package}</span> {f.installed}
        {f.fixed ? (
          <>
            {" → "}
            <span className="font-medium text-success">{f.fixed}</span>
          </>
        ) : (
          " · no fix yet"
        )}
        {f.target && ` · ${f.target}`}
      </p>
    </li>
  )
}
