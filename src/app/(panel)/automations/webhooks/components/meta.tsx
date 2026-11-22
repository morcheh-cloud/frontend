import {
  CircleCheck,
  CircleSlash,
  CircleX,
  Clock3,
  type LucideIcon,
  TriangleAlert,
  Webhook,
} from "lucide-react"
import {
  createSerializer,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs"

import type {
  OutgoingWebhook,
  WebhookBody,
  WebhookDelivery,
} from "@/lib/services"

export const WebhookIcon = Webhook
export const LIST = "/automations/webhooks"
export const NEW = "/automations/webhooks/new"

// ---- the detail page's URL state ----

export const pageTabs = ["deliveries", "settings"] as const
export type PageTab = (typeof pageTabs)[number]

export const deliveryStatuses = ["pending", "delivered", "failed"] as const

export const pageParsers = {
  tab: parseAsStringLiteral(pageTabs).withDefault("deliveries"),
  status: parseAsStringLiteral(deliveryStatuses),
  page: parseAsInteger.withDefault(1),
  delivery: parseAsString,
}

const serialize = createSerializer(pageParsers)

export function webhookHref(
  id: string,
  values: { tab?: PageTab; delivery?: string } = {},
) {
  return serialize(`${LIST}/${id}`, {
    tab: values.tab === "deliveries" ? null : (values.tab ?? null),
    delivery: values.delivery ?? null,
  })
}

export const listParsers = {
  q: parseAsString.withDefault(""),
}

// ---- reading a webhook ----

export function hostOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

// The same webhook as a PUT body, with some fields changed. A PUT replaces
// everything, so a switch on the list must send the rest back unchanged;
// leaving `headers` out keeps the saved ones.
export function bodyOf(
  w: OutgoingWebhook,
  patch: Partial<WebhookBody> = {},
): WebhookBody {
  return {
    name: w.name,
    url: w.url,
    events: w.events,
    enabled: w.enabled,
    include_muted: w.include_muted,
    allow_internal: w.allow_internal,
    ...patch,
  }
}

export type Health = {
  tone: "ok" | "bad" | "warn" | "quiet"
  label: string
  icon: LucideIcon
}

export function healthOf(w: OutgoingWebhook): Health {
  if (!w.enabled) return { tone: "quiet", label: "Off", icon: CircleSlash }
  if (w.failing_since)
    return { tone: "bad", label: "Failing", icon: TriangleAlert }
  if (w.last_status === "failed")
    return { tone: "warn", label: "Last one failed", icon: CircleX }
  if (w.last_status === "delivered")
    return { tone: "ok", label: "Delivering", icon: CircleCheck }
  return { tone: "quiet", label: "Nothing sent yet", icon: Clock3 }
}

export const deliveryMeta: Record<
  WebhookDelivery["status"],
  { label: string; icon: LucideIcon; tone: "ok" | "bad" | "warn" }
> = {
  delivered: { label: "Delivered", icon: CircleCheck, tone: "ok" },
  failed: { label: "Failed", icon: CircleX, tone: "bad" },
  pending: { label: "Will try again", icon: Clock3, tone: "warn" },
}

export const toneText = {
  ok: "text-success",
  bad: "text-destructive",
  warn: "text-warning",
  quiet: "text-ash",
} as const

export const toneBg = {
  ok: "bg-success",
  bad: "bg-destructive",
  warn: "bg-warning",
  quiet: "bg-mist",
} as const

// "2.4 s", "180 ms".
export function durationText(ms: number) {
  if (ms >= 10_000) return `${Math.round(ms / 1000)} s`
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`
  return `${ms} ms`
}

// What the delivery's answer was, in a few words.
export function answerText(d: WebhookDelivery) {
  if (d.http_status) return `HTTP ${d.http_status}`
  if (d.error) return "No answer"
  return d.status === "pending" ? "Not tried yet" : "—"
}
