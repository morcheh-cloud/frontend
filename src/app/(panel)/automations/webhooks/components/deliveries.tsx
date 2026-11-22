"use client"

import {
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Inbox,
  RefreshCw,
  RotateCcw,
  Send,
} from "lucide-react"
import { useQueryStates } from "nuqs"
import { type ReactNode, useRef } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { CodeBlock } from "@/components/code-block"
import { useEventCatalog } from "@/components/events/catalog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  EventType,
  OutgoingWebhook,
  WebhookDelivery,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useDeliveries, useDelivery, useRedeliver } from "../api"
import {
  answerText,
  deliveryMeta,
  durationText,
  pageParsers,
  toneText,
} from "./meta"

const PAGE = 50

const exact = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
})
const exactTime = (iso: string) => exact.format(new Date(iso))

const labelOf = (catalog: EventType[] | undefined, name: string) =>
  catalog?.find((t) => t.name === name)?.label ?? name

// "Try 2 of 4" for a retried one, nothing for a first try that worked.
function attemptText(d: WebhookDelivery) {
  if (d.redelivery_of) return "Sent again by hand"
  if (d.event_type === "test.ping") return "Test"
  if (d.attempt <= 1 && d.status === "delivered") return ""
  return `Try ${d.attempt} of 4`
}

// ?delivery= holds the open one. Opening pushes a history entry, so Back
// closes it; one the page loaded with is closed in place.
export function useDeliveryParam() {
  const [{ delivery }, setParams] = useQueryStates(pageParsers)
  const loadedWith = useRef(delivery)
  const open = (id: string) => setParams({ delivery: id }, { history: "push" })
  const swap = (id: string) =>
    setParams({ delivery: id }, { history: "replace" })
  const close = () => {
    if (delivery && delivery !== loadedWith.current) window.history.back()
    else {
      loadedWith.current = null
      setParams({ delivery: null }, { history: "replace" })
    }
  }
  return { delivery, open, swap, close }
}

export function Deliveries({
  w,
  phone,
  canEdit,
  onTest,
  testing,
}: {
  w: OutgoingWebhook
  phone: boolean
  canEdit: boolean
  onTest: () => void
  testing: boolean
}) {
  const [{ status, page }, setParams] = useQueryStates(pageParsers)
  const catalog = useEventCatalog()
  const q = {
    status: status ?? undefined,
    limit: PAGE,
    offset: (Math.max(1, page) - 1) * PAGE,
  }
  const list = useDeliveries(w.id, q)
  const { open } = useDeliveryParam()
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE))

  const filter = (
    <Segmented
      label="Show"
      items={[
        { value: "all", label: "All" },
        { value: "failed", label: "Failed" },
        { value: "pending", label: "Retrying" },
        { value: "delivered", label: "Delivered" },
      ]}
      value={status ?? "all"}
      onChange={(v) =>
        setParams({ status: v === "all" ? null : v, page: null })
      }
    />
  )
  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="size-11 shrink-0 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={list.isFetching}
      onClick={() => list.refetch()}
    >
      <RefreshCw className={cn(list.isFetching && "animate-spin")} />
    </Button>
  )
  const test = canEdit && (
    <Button
      variant="outline"
      className="h-11 shrink-0 md:h-9"
      disabled={testing}
      onClick={onTest}
    >
      <Send />
      {testing ? "Sending…" : "Send a test"}
    </Button>
  )

  return (
    <section className={cn("flex min-w-0 flex-col", phone ? "" : "gap-3")}>
      <div
        className={cn(
          "flex items-center gap-2",
          phone && "no-scrollbar overflow-x-auto px-4 py-3",
        )}
      >
        {filter}
        <span className="ms-auto hidden text-caption whitespace-nowrap text-muted-foreground lg:inline">
          {list.isPending
            ? ""
            : `${total} ${total === 1 ? "delivery" : "deliveries"} · kept 30 days`}
        </span>
        {refresh}
      </div>
      {list.isPending ? (
        <div className={cn("flex flex-col gap-2", phone && "px-4")}>
          {Array.from({ length: 5 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : list.isError && !list.data ? (
        <p className="px-4 py-6 text-body-sm text-destructive md:px-0">
          Couldn't load the deliveries: {list.error.message}
        </p>
      ) : items.length === 0 ? (
        <NoDeliveries
          filtered={!!status}
          phone={phone}
          action={test || undefined}
        />
      ) : (
        <ul
          className={cn(
            "divide-y divide-border border-border",
            phone ? "border-y" : "rounded-2xl border",
          )}
        >
          {items.map((d) => (
            <DeliveryRow
              key={d.id}
              d={d}
              label={labelOf(catalog.data, d.event_type)}
              onOpen={() => open(d.id)}
            />
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div
          className={cn(
            "flex items-center justify-end gap-2",
            phone && "px-4 py-3",
          )}
        >
          <span className="me-auto text-caption text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-11 md:size-9"
            aria-label="Newer"
            disabled={page <= 1}
            onClick={() => setParams({ page: page - 1 > 1 ? page - 1 : null })}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-11 md:size-9"
            aria-label="Older"
            disabled={page >= pages}
            onClick={() => setParams({ page: page + 1 })}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
      {phone && test && (
        <div className="px-4 pt-1 pb-4 [&>*]:w-full">{test}</div>
      )}
    </section>
  )
}

function NoDeliveries({
  filtered,
  phone,
  action,
}: {
  filtered: boolean
  phone: boolean
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-14 text-center",
        !phone && "rounded-2xl border border-dashed border-mist",
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Inbox className="size-5" />
      </span>
      <p className="mt-4 font-medium">
        {filtered ? "None like that" : "Nothing sent yet"}
      </p>
      <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
        {filtered
          ? "No delivery in the last 30 days matches this filter."
          : "Each event it sends shows up here with the answer your endpoint gave. Send a test to see one now."}
      </p>
      {!filtered && action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function DeliveryRow({
  d,
  label,
  onOpen,
}: {
  d: WebhookDelivery
  label: string
  onOpen: () => void
}) {
  const meta = deliveryMeta[d.status]
  const Icon = meta.icon
  const attempt = attemptText(d)
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start outline-none hover:bg-subtle focus-visible:bg-subtle md:first:rounded-t-2xl md:last:rounded-b-2xl"
      >
        <Icon className={cn("size-5 shrink-0", toneText[meta.tone])} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-body-sm font-medium">{label}</span>
            <code className="hidden truncate font-mono text-caption text-ash sm:inline">
              {d.event_type}
            </code>
          </span>
          <span className="flex min-w-0 flex-wrap gap-x-1.5 text-caption text-muted-foreground">
            <span className={toneText[meta.tone]}>{meta.label}</span>
            {attempt && (
              <>
                <span aria-hidden>·</span>
                <span>{attempt}</span>
              </>
            )}
            {d.status === "pending" && d.next_try_at && (
              <>
                <span aria-hidden>·</span>
                <span title={exactTime(d.next_try_at)}>
                  next {timeAgo(d.next_try_at)}
                </span>
              </>
            )}
            {d.error && (
              <>
                <span aria-hidden className="md:hidden">
                  ·
                </span>
                <span className="truncate md:hidden">{d.error}</span>
              </>
            )}
          </span>
        </span>
        <span className="hidden w-24 shrink-0 font-mono text-caption tabular-nums md:block">
          {answerText(d)}
        </span>
        <span className="hidden w-16 shrink-0 text-end text-caption text-muted-foreground tabular-nums md:block">
          {d.duration_ms
            ? durationText(d.duration_ms)
            : d.http_status
              ? "<1 ms"
              : ""}
        </span>
        <span
          className="w-20 shrink-0 text-end text-caption text-muted-foreground md:w-28"
          title={exactTime(d.created_at)}
        >
          {timeAgo(d.created_at)}
        </span>
        <ChevronRight className="size-4 shrink-0 text-ash" />
      </button>
    </li>
  )
}

const pretty = (text: string) => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

// One delivery: what was sent, what came back, and Redeliver. A wide dialog
// on desktop, a full bottom sheet on phones.
export function DeliveryLayer({
  w,
  phone,
  canEdit,
}: {
  w: OutgoingWebhook
  phone: boolean
  canEdit: boolean
}) {
  const { delivery, close, swap } = useDeliveryParam()
  const query = useDelivery(delivery)
  const catalog = useEventCatalog()
  const redeliver = useRedeliver()
  const d = query.data
  const openState = !!delivery
  const title = d ? labelOf(catalog.data, d.event_type) : "Delivery"

  const again = () => {
    if (!d) return
    redeliver.mutate(d.id, {
      onSuccess: (next) => {
        if (next.status === "delivered")
          toast.success(
            `Delivered again${next.http_status ? ` (HTTP ${next.http_status})` : ""}`,
          )
        else toast.error(next.error || `Failed: ${answerText(next)}`)
        swap(next.id)
      },
      onError: (err) => toast.error(err.message),
    })
  }

  const body = query.isPending ? (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  ) : !d ? (
    <p className="text-body-sm text-destructive">
      {query.error?.message ?? "This delivery isn't here any more."}
    </p>
  ) : (
    <DeliveryBody d={d} w={w} onOpen={swap} />
  )

  const action = canEdit && d && (
    <Button
      variant="outline"
      className="max-md:h-11 max-md:w-full"
      disabled={redeliver.isPending}
      onClick={again}
    >
      <RotateCcw />
      {redeliver.isPending ? "Sending…" : "Send it again"}
    </Button>
  )

  if (phone)
    return (
      <BottomSheet
        open={openState}
        onOpenChange={(o) => !o && close()}
        title={title}
        full
        footer={action}
      >
        <div className="px-2">{body}</div>
      </BottomSheet>
    )

  return (
    <Dialog open={openState} onOpenChange={(o) => !o && close()}>
      <DialogContent className="flex max-h-[calc(100dvh-4rem)] flex-col gap-5 p-6 sm:max-w-3xl">
        <DialogHeader className="shrink-0 pe-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {d ? `${exactTime(d.created_at)} · to ${w.url}` : "Loading…"}
          </DialogDescription>
        </DialogHeader>
        <div
          data-slot="dialog-body"
          className="-mx-6 -my-1 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-5 overflow-x-hidden overflow-y-auto px-6 py-1"
        >
          {body}
        </div>
        {action && (
          <DialogFooter className="-mx-6 -mb-6 shrink-0 px-6">
            {action}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DeliveryBody({
  d,
  w,
  onOpen,
}: {
  d: WebhookDelivery
  w: OutgoingWebhook
  onOpen: (id: string) => void
}) {
  const meta = deliveryMeta[d.status]
  const Icon = meta.icon
  const attempt = attemptText(d)
  const facts: [string, ReactNode][] = [
    [
      "Result",
      <span key="r" className={cn("font-medium", toneText[meta.tone])}>
        {meta.label}
      </span>,
    ],
    ["Answer", answerText(d)],
    [
      "Took",
      d.duration_ms
        ? durationText(d.duration_ms)
        : d.http_status
          ? "<1 ms"
          : "—",
    ],
    ["Attempt", attempt || "First try"],
    ...(d.status === "pending" && d.next_try_at
      ? ([["Next try", timeAgo(d.next_try_at)]] as [string, ReactNode][])
      : []),
    ["Sent", timeAgo(d.updated_at)],
  ]
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center gap-3 rounded-2xl bg-subtle p-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm",
            toneText[meta.tone],
          )}
        >
          <Icon className="size-5" />
        </span>
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-2 text-body-sm sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-caption text-ash">{label}</dt>
              <dd className="truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {d.error && (
        <p className="rounded-lg bg-destructive/5 px-3 py-2.5 text-body-sm break-words text-destructive">
          {d.error}
        </p>
      )}
      {d.redelivery_of && (
        <button
          type="button"
          onClick={() => d.redelivery_of && onOpen(d.redelivery_of)}
          className="inline-flex items-center gap-1.5 self-start text-body-sm font-medium text-brand hover:underline max-md:min-h-11"
        >
          <CornerDownRight className="size-4" />
          Open the delivery this repeats
        </button>
      )}
      <Part title="Request">
        <dl className="grid gap-1 font-mono text-caption">
          {[
            ["POST", w.url],
            ["X-Morche-Event", d.event_type],
            ["X-Morche-Delivery", d.id],
            ["X-Morche-Signature", "sha256=… (made for each try)"],
            ...w.header_names.map((n) => [n, "•••• (saved)"]),
          ].map(([k, v]) => (
            <div key={k} className="flex min-w-0 gap-2">
              <dt className="shrink-0 text-muted-foreground">{k}</dt>
              <dd className="min-w-0 truncate">{v}</dd>
            </div>
          ))}
        </dl>
        <CodeBlock code={pretty(d.request_body)} label="request body" />
      </Part>
      <Part
        title="Response"
        note={
          d.response
            ? "The first 4 KB of what your endpoint answered."
            : undefined
        }
      >
        {d.response ? (
          <CodeBlock code={pretty(d.response)} label="response" />
        ) : (
          <p className="text-body-sm text-muted-foreground">
            {d.http_status ? "An empty answer." : "No answer came back."}
          </p>
        )}
      </Part>
    </div>
  )
}

function Part({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-body-sm font-medium">{title}</h3>
        {note && <span className="text-caption text-ash">{note}</span>}
      </div>
      {children}
    </section>
  )
}
