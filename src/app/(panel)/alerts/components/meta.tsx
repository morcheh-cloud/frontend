import {
  Bell,
  BellRing,
  Hash,
  type LucideIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Send,
  Smartphone,
  Users,
  Webhook,
} from "lucide-react"

import type { NotifyChannel, NotifyChannelBody } from "@/lib/services"

export type ChannelKind = NotifyChannelBody["kind"]

export const channelKinds: {
  value: ChannelKind
  label: string
  short: string
  icon: LucideIcon
  group: "chat" | "push" | "other"
}[] = [
  {
    value: "email",
    label: "Email",
    short: "Through your SMTP server",
    icon: Mail,
    group: "other",
  },
  {
    value: "telegram",
    label: "Telegram",
    short: "A bot posts to a chat, group or channel",
    icon: Send,
    group: "chat",
  },
  {
    value: "bale",
    label: "Bale",
    short: "A Bale bot posts to a chat or channel",
    icon: MessageCircle,
    group: "chat",
  },
  {
    value: "slack",
    label: "Slack",
    short: "An incoming webhook",
    icon: Hash,
    group: "chat",
  },
  {
    value: "discord",
    label: "Discord",
    short: "A channel webhook",
    icon: MessagesSquare,
    group: "chat",
  },
  {
    value: "mattermost",
    label: "Mattermost",
    short: "An incoming webhook",
    icon: MessageSquare,
    group: "chat",
  },
  {
    value: "teams",
    label: "Microsoft Teams",
    short: "A workflow or connector webhook",
    icon: Users,
    group: "chat",
  },
  {
    value: "ntfy",
    label: "ntfy",
    short: "Phone push through ntfy.sh or your own server",
    icon: Bell,
    group: "push",
  },
  {
    value: "gotify",
    label: "Gotify",
    short: "Push through your Gotify server",
    icon: BellRing,
    group: "push",
  },
  {
    value: "pushover",
    label: "Pushover",
    short: "Phone push through Pushover",
    icon: Smartphone,
    group: "push",
  },
  {
    value: "webhook",
    label: "Webhook",
    short: "JSON to any address, signed if you like",
    icon: Webhook,
    group: "other",
  },
]

export const channelGroups = [
  { value: "chat", label: "Chat" },
  { value: "push", label: "Phone push" },
  { value: "other", label: "Email and webhooks" },
] as const

export const channelMeta = Object.fromEntries(
  channelKinds.map((k) => [k.value, k]),
) as Record<ChannelKind, (typeof channelKinds)[number]>

export function ChannelIcon({
  kind,
  className,
}: {
  kind: string
  className?: string
}) {
  const Icon = channelMeta[kind as ChannelKind]?.icon ?? Bell
  return <Icon className={className} aria-hidden />
}

export const channelLabel = (kind: string) =>
  channelMeta[kind as ChannelKind]?.label ?? kind

// Where a saved channel sends, in a few words.
export function channelTarget(c: NotifyChannel) {
  const cfg = c.config
  switch (c.kind) {
    case "email":
      return (cfg.to ?? []).join(", ")
    case "telegram":
    case "bale":
      return cfg.chat_id ?? ""
    case "ntfy":
      return cfg.topic ? `${hostOf(cfg.url) || "ntfy.sh"}/${cfg.topic}` : ""
    case "gotify":
    case "webhook":
      return hostOf(cfg.url)
    default:
      return channelMeta[c.kind as ChannelKind]?.short ?? ""
  }
}

function hostOf(url?: string) {
  if (!url) return ""
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

// A channel whose last message failed (and nothing worked since).
export const channelBroken = (c: NotifyChannel) =>
  c.enabled &&
  !!c.last_error &&
  (!c.last_sent_at ||
    (!!c.last_error_at &&
      new Date(c.last_error_at) >= new Date(c.last_sent_at)))
