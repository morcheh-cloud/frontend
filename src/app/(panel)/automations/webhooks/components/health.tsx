"use client"

import { timeAgo } from "@/app/(panel)/servers/components/meta"
import type { OutgoingWebhook, WebhookDelivery } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useDeliveries } from "../api"
import { answerText, deliveryMeta, healthOf, toneBg, toneText } from "./meta"

// The last deliveries as a strip of bars, oldest left: green delivered, red
// failed, amber waiting for a retry. Empty slots stay grey.
export function HealthStrip({
  w,
  count = 30,
  className,
  tall,
}: {
  w: OutgoingWebhook
  count?: number
  className?: string
  tall?: boolean
}) {
  const list = useDeliveries(w.id, { limit: count, offset: 0 })
  const items = [...(list.data?.items ?? [])].reverse()
  const slots: (WebhookDelivery | null)[] = [
    ...Array.from({ length: Math.max(0, count - items.length) }, () => null),
    ...items,
  ]
  const ok = items.filter((d) => d.status === "delivered").length
  const label = items.length
    ? `${ok} of the last ${items.length} deliveries arrived`
    : "Nothing sent yet"
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "flex items-end gap-[3px]",
        tall ? "h-8" : "h-6",
        className,
      )}
    >
      {slots.map((d, i) =>
        d ? (
          <span
            key={d.id}
            title={`${deliveryMeta[d.status].label} · ${answerText(d)} · ${timeAgo(d.created_at)}`}
            className={cn(
              "min-w-0 flex-1 rounded-[3px]",
              toneBg[deliveryMeta[d.status].tone],
              d.status === "delivered" ? "h-full opacity-80" : "h-full",
            )}
          />
        ) : (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: empty slots, never reordered
            key={`empty-${i}`}
            className="h-1/3 min-w-0 flex-1 rounded-[3px] bg-muted"
          />
        ),
      )}
    </div>
  )
}

// The webhook's state as a dot and a word.
export function HealthLabel({
  w,
  className,
}: {
  w: OutgoingWebhook
  className?: string
}) {
  const h = healthOf(w)
  const Icon = h.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        toneText[h.tone],
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      {h.label}
      {w.failing_since && (
        <span className="text-muted-foreground">
          · started {timeAgo(w.failing_since).toLowerCase()}
        </span>
      )}
    </span>
  )
}
