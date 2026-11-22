"use client"

import {
  ArrowRight,
  BellRing,
  ChevronRight,
  CloudOff,
  Plus,
  RefreshCw,
  SearchX,
  ShieldCheck,
  TriangleAlert,
  Workflow,
} from "lucide-react"
import Link from "next/link"
import { useQueryStates } from "nuqs"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { Empty, SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useEventCatalog } from "@/components/events/catalog"
import { guideHref } from "@/components/help/guides"
import { PageHeader } from "@/components/panel/page-header"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { EventType, OutgoingWebhook } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useSaveWebhook, useWebhooks } from "../api"
import { HealthLabel, HealthStrip } from "./health"
import {
  bodyOf,
  healthOf,
  hostOf,
  listParsers,
  NEW,
  WebhookIcon,
  webhookHref,
} from "./meta"
import { useWebhookCan } from "./permissions"

const rank = { bad: 0, warn: 1, ok: 2, quiet: 3 }

// Failing first, then by name.
const sorted = (items: OutgoingWebhook[]) =>
  [...items].sort(
    (a, b) =>
      rank[healthOf(a).tone] - rank[healthOf(b).tone] ||
      Number(b.enabled) - Number(a.enabled) ||
      a.name.localeCompare(b.name),
  )

export function WebhooksView() {
  const phone = useIsPhone()
  const { workspace } = useWorkspace()
  const can = useWebhookCan(workspace?.id)
  const list = useWebhooks(workspace?.id, can.read)
  const [{ q }, setFilters] = useQueryStates(listParsers)
  if (phone === null || !workspace) return null

  const newButton = can.edit && (
    <Button
      className="h-11 md:h-9"
      render={<Link href={NEW} />}
      nativeButton={false}
    >
      <Plus />
      New webhook
    </Button>
  )

  const header = (
    <PageHeader
      title="Webhooks"
      guide="api"
      actions={phone && (list.data?.length ?? 0) > 0 ? newButton : undefined}
    />
  )

  if (!can.read)
    return (
      <>
        {header}
        <div className="px-4 pt-6 md:px-6 md:pt-5">
          <Empty
            icon={WebhookIcon}
            title="Webhooks need Owner access"
            body={`They send ${workspace.name}'s events to any address, so only its Owners see and change them.`}
          />
        </div>
      </>
    )

  const items = sorted(list.data ?? [])
  const words = q.trim().toLowerCase()
  const shown = items.filter(
    (w) =>
      !words ||
      [w.name, w.url, ...w.events].some((t) => t.toLowerCase().includes(words)),
  )
  const failing = items.filter((w) => healthOf(w).tone === "bad").length
  const summary = failing
    ? `${failing} of ${items.length} failing`
    : `${items.filter((w) => w.enabled).length} of ${items.length} on`

  let body: ReactNode
  if (list.isError && !list.data)
    body = (
      <Empty
        icon={CloudOff}
        title="Couldn't load the webhooks"
        body={list.error.message}
        action={
          <Button variant="outline" onClick={() => list.refetch()}>
            Try again
          </Button>
        }
      />
    )
  else if (list.isPending) body = <Placeholder phone={phone} />
  else if (items.length === 0)
    body = <NoWebhooks phone={phone} action={newButton || undefined} />
  else if (shown.length === 0)
    body = (
      <Empty
        icon={SearchX}
        title="No webhook matches"
        body="Search looks at names, addresses and event types."
      />
    )
  else if (phone) body = <Rows items={shown} />
  else
    body = (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,26rem),1fr))] gap-4">
        {shown.map((w) => (
          <WebhookCard key={w.id} w={w} canEdit={can.edit} />
        ))}
      </div>
    )

  return (
    <>
      {header}
      <div className="flex flex-col gap-4 pb-8 md:px-6 md:pt-5">
        {can.demo && (
          <p className="bg-subtle px-4 py-3 text-body-sm text-muted-foreground md:rounded-2xl">
            The public demo shows webhooks but doesn't change or send them.
          </p>
        )}
        {items.length > 0 && (
          <div className="flex items-center gap-2 max-md:px-4 max-md:pt-3">
            <SearchBox
              value={q}
              onChange={(v) => setFilters({ q: v || null })}
              placeholder="Search name, address or event"
              label="Search webhooks"
              className="min-w-0 flex-1 md:max-w-80 md:flex-none"
            />
            <div className="ms-auto flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "me-2 hidden text-caption whitespace-nowrap lg:inline",
                  failing ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {summary}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-11 md:size-9"
                aria-label="Refresh"
                title="Refresh"
                disabled={list.isFetching}
                onClick={() => list.refetch()}
              >
                <RefreshCw className={cn(list.isFetching && "animate-spin")} />
              </Button>
              {!phone && newButton}
            </div>
          </div>
        )}
        {body}
      </div>
    </>
  )
}

function Placeholder({ phone }: { phone: boolean }) {
  return (
    <div
      className={cn(
        "grid gap-4",
        phone
          ? "px-4"
          : "grid-cols-[repeat(auto-fill,minmax(min(100%,26rem),1fr))]",
      )}
    >
      {(phone ? ["a", "b", "c", "d"] : ["a", "b", "c"]).map((k) => (
        <Skeleton
          key={k}
          className={phone ? "h-16 rounded-xl" : "h-56 rounded-2xl"}
        />
      ))}
    </div>
  )
}

// What a webhook is for, with the first step.
function NoWebhooks({ phone, action }: { phone: boolean; action?: ReactNode }) {
  const points = [
    {
      icon: BellRing,
      title: "Alerts and outages",
      text: "Fired and resolved alerts, monitors going down and up, servers going offline.",
    },
    {
      icon: Workflow,
      title: "Jobs that end",
      text: "Cron jobs, database backups and container deploys that fail or succeed.",
    },
    {
      icon: ShieldCheck,
      title: "Signed and retried",
      text: "Every delivery is signed with HMAC-SHA256 and tried again after 30 s, 5 min and 30 min.",
    },
  ]
  return (
    <section
      className={cn(
        "flex flex-col gap-8",
        phone
          ? "px-4 pt-4"
          : "rounded-3xl border border-border bg-linear-to-br from-brand-soft/60 via-card to-card p-8 lg:p-12",
      )}
    >
      <div className="flex max-w-2xl flex-col items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-card text-brand shadow-sm">
          <WebhookIcon className="size-6" />
        </span>
        <h2 className="text-subheading font-normal md:text-heading md:font-light">
          Send Morche's events to your own tools
        </h2>
        <p className="text-body text-muted-foreground">
          A webhook POSTs each event as JSON to an address you choose: your
          incident tool, a chat bridge, a ticket system or a small service of
          your own. Pick the events, add a header if your endpoint needs one,
          and watch every delivery and its answer here.
        </p>
        <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-3">
          {action}
          <Link
            href={guideHref("api", "webhooks")}
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-brand underline-offset-4 hover:underline max-md:min-h-11"
          >
            How webhooks work
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {points.map((p) => (
          <li
            key={p.title}
            className="flex gap-3 rounded-2xl border border-border bg-card p-5"
          >
            <p.icon className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="font-medium">{p.title}</p>
              <p className="mt-1 text-body-sm text-muted-foreground">
                {p.text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EventChips({
  events,
  catalog,
}: {
  events: string[]
  catalog: EventType[] | undefined
}) {
  if (!events.length)
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-brand-soft px-2.5 text-caption text-brand-strong">
        All events
      </span>
    )
  const label = (n: string) => catalog?.find((t) => t.name === n)?.label ?? n
  const first = events.slice(0, 3)
  return (
    <>
      {first.map((e) => (
        <span
          key={e}
          title={e}
          className="inline-flex h-6 max-w-48 items-center truncate rounded-full bg-muted px-2.5 text-caption text-muted-foreground"
        >
          {label(e)}
        </span>
      ))}
      {events.length > 3 && (
        <span
          title={events.slice(3).map(label).join(", ")}
          className="inline-flex h-6 items-center rounded-full border border-border px-2.5 text-caption text-muted-foreground"
        >
          +{events.length - 3}
        </span>
      )}
    </>
  )
}

function WebhookCard({ w, canEdit }: { w: OutgoingWebhook; canEdit: boolean }) {
  const catalog = useEventCatalog()
  const save = useSaveWebhook()
  const health = healthOf(w)
  const toggle = (enabled: boolean) =>
    save.mutate(
      { id: w.id, ws: w.workspace_id, body: bodyOf(w, { enabled }) },
      {
        onSuccess: () =>
          toast.success(`${w.name} turned ${enabled ? "on" : "off"}`),
        onError: (err) => toast.error(err.message),
      },
    )
  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        health.tone === "bad" ? "border-destructive/40" : "border-border",
        !w.enabled && "bg-subtle",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            w.enabled ? "bg-brand-soft text-brand-strong" : "bg-muted text-ash",
          )}
        >
          <WebhookIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={webhookHref(w.id)}
            className="block truncate font-medium outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {w.name}
          </Link>
          <p className="truncate font-mono text-caption text-muted-foreground">
            {hostOf(w.url)}
          </p>
        </div>
        {canEdit && (
          <Switch
            className="relative z-10 mt-1"
            aria-label={w.enabled ? `Turn ${w.name} off` : `Turn ${w.name} on`}
            checked={w.enabled}
            disabled={save.isPending}
            onCheckedChange={toggle}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <EventChips events={w.events} catalog={catalog.data} />
        {w.include_muted && (
          <span className="inline-flex h-6 items-center rounded-full border border-border px-2.5 text-caption text-muted-foreground">
            + muted alerts
          </span>
        )}
      </div>
      <HealthStrip w={w} />
      <div className="mt-auto flex min-w-0 items-center gap-3 text-caption">
        <HealthLabel w={w} className="min-w-0 truncate" />
        <span className="ms-auto shrink-0 text-muted-foreground">
          {w.last_delivery_at
            ? `Last sent ${timeAgo(w.last_delivery_at).toLowerCase()}`
            : "Never sent"}
        </span>
      </div>
      {health.tone === "bad" && (
        <p className="-mx-5 -mb-5 flex items-center gap-2 rounded-b-2xl border-t border-destructive/20 bg-destructive/5 px-5 py-2.5 text-caption text-destructive">
          <TriangleAlert className="size-3.5 shrink-0" />
          Every try is failing: open it to see what the endpoint answers.
        </p>
      )}
    </article>
  )
}

function Rows({ items }: { items: OutgoingWebhook[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((w) => {
        const h = healthOf(w)
        return (
          <li key={w.id}>
            <Link
              href={webhookHref(w.id)}
              className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-muted"
            >
              <span
                className={cn(
                  "relative flex size-10 shrink-0 items-center justify-center rounded-xl",
                  w.enabled
                    ? "bg-brand-soft text-brand-strong"
                    : "bg-muted text-ash",
                )}
              >
                <WebhookIcon className="size-5" />
                {h.tone === "bad" && (
                  <span
                    aria-hidden
                    className="absolute -end-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-destructive"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{w.name}</span>
                <span className="block truncate font-mono text-caption text-muted-foreground">
                  {hostOf(w.url)}
                </span>
                <HealthLabel
                  w={w}
                  className="max-w-full overflow-hidden text-caption [&_svg]:size-3.5"
                />
              </span>
              <ChevronRight className="size-5 shrink-0 text-ash" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
