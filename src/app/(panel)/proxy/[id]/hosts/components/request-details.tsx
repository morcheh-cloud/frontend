"use client"

import { Check, Copy, Globe, Route } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Facts } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { formatMs } from "@/components/insights/format"
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
import type { RequestRow } from "../../../api"
import { clientLabel } from "./log-columns"
import type { RequestFilters } from "./request-filters"

// Everything one log line says: a side sheet on desktop, a bottom sheet on
// phones. Drive `open` with useOpen.
export function RequestDetailsLayer({
  row,
  stream,
  open,
  onOpenChange,
  phone,
  onFilter,
}: {
  row: RequestRow | null
  stream: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
  // Narrow the list to this one's address or path (closes the layer).
  onFilter: (next: Partial<RequestFilters>) => void
}) {
  if (!row) return null
  const title = stream
    ? `${row.protocol || "Connection"} · ${row.status}`
    : `${row.method} ${row.status}`
  const subtitle = new Date(row.time).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    hourCycle: "h23",
  })
  const body = (
    <RequestDetails
      row={row}
      stream={stream}
      onFilter={onFilter}
      phone={phone}
    />
  )

  if (phone) {
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
  }

  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">{body}</div>
      </SheetContent>
    </Sheet>
  )
}

function RequestDetails({
  row: r,
  stream,
  onFilter,
  phone,
}: {
  row: RequestRow
  stream: boolean
  onFilter: (next: Partial<RequestFilters>) => void
  phone: boolean
}) {
  const ms = (v?: number) => (v === undefined ? undefined : formatMs(v))
  const facts = (
    items: {
      label: string
      value?: string | number
      wide?: boolean
      mono?: boolean
    }[],
  ) =>
    items
      .filter((x) => x.value !== undefined && x.value !== "")
      .map((x) => ({ ...x, value: x.value as string }))

  const request = facts(
    stream
      ? [
          { label: "Status", value: r.status },
          { label: "Protocol", value: r.protocol },
          { label: "Address", value: r.ip, mono: true },
          { label: "Open for", value: ms(r.duration_ms) },
        ]
      : [
          { label: "Status", value: r.status },
          { label: "Method", value: r.method },
          { label: "Path", value: r.path, wide: true, mono: true },
          { label: "Domain", value: r.domain },
          { label: "HTTP version", value: r.protocol },
          { label: "Address", value: r.ip, mono: true },
          { label: "Signed in as", value: r.user },
        ],
  )
  const answer = facts([
    {
      label: stream ? "Open for" : "Took",
      value: stream ? undefined : ms(r.duration_ms),
    },
    { label: "Sent", value: formatSize(r.bytes) },
    {
      label: "Received",
      value:
        r.request_length === undefined
          ? undefined
          : formatSize(r.request_length),
    },
    { label: "Cache", value: r.cache },
    { label: "Upstream", value: r.upstream_addr, mono: true },
    { label: "Upstream status", value: r.upstream_status },
    { label: "Upstream took", value: ms(r.upstream_ms) },
    { label: "Request ID", value: r.request_id, wide: true, mono: true },
  ])
  const client = facts([
    { label: "Client", value: clientLabel(r.agent) },
    { label: "Came from", value: r.referer, wide: true, mono: true },
    { label: "User agent", value: r.agent, wide: true },
  ])

  return (
    <div className="flex flex-col gap-1">
      <Group title={stream ? "Connection" : "Request"}>
        <Facts items={request} />
      </Group>
      <Group title="Answer">
        <Facts items={answer} />
      </Group>
      {client.length > 0 && (
        <Group title="Visitor">
          <Facts items={client} />
        </Group>
      )}
      <Group title="In the log">
        <RawLine line={r.line} />
      </Group>
      <div
        className={cn("mt-2 flex gap-2 px-2", phone ? "flex-col" : "flex-wrap")}
      >
        <Button
          variant="outline"
          className="max-md:h-11"
          onClick={() => onFilter({ ip: r.ip })}
        >
          <Globe />
          Only this address
        </Button>
        {!stream && r.path && (
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => onFilter({ path: r.path.split("?")[0] })}
          >
            <Route />
            Only this path
          </Button>
        )}
      </div>
    </div>
  )
}

function Group({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="px-2 pb-2 font-label text-caption tracking-label text-ash uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function RawLine({ line }: { line: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative mx-2 mb-3 rounded-2xl bg-subtle p-4 pe-12">
      <code className="block font-mono text-caption break-all whitespace-pre-wrap">
        {line}
      </code>
      <button
        type="button"
        aria-label="Copy the line"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(line)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          } catch {
            toast.error("Couldn't copy: the browser doesn't allow it here")
          }
        }}
        className="absolute end-2 top-2 flex size-9 items-center justify-center rounded-lg text-ash outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  )
}
