"use client"

import {
  Check,
  Copy,
  Info,
  Pause,
  Play,
  RefreshCcwDot,
  RotateCcw,
  TriangleAlert,
  Webhook,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { DockerAutoUpdate } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Callout } from "../../cronjobs/components/editor-parts"
import { cronText, formatInZone } from "../../cronjobs/components/meta"
import { Empty, Segmented } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useAutoUpdate, useResetAutoUpdateWebhook } from "../api"
import { usePolicyActions } from "./auto-update-actions"
import { CoverPreview } from "./auto-update-cover"
import { AutoUpdateEditor } from "./auto-update-editor"
import { ActivityFilters, AutoUpdateEvents } from "./auto-update-events"
import {
  AUTO_UPDATE,
  autoUpdateHref,
  coverText,
  lastStateMeta,
  modeMeta,
  notifyMeta,
  pickMeta,
  policyParsers,
  webhookUrl,
} from "./auto-update-meta"
import { MonthCounts } from "./auto-update-view"
import { type WsCtx, WsPage } from "./env-page"
import { PageBar, Tag } from "./kit"
import { Dot } from "./meta"

export function AutoUpdatePolicyFromRoute() {
  const { id } = useParams<{ id: string }>()
  const { workspace } = useWorkspace()
  const query = useAutoUpdate(workspace?.id, id)
  return (
    <WsPage title={query.data?.name ?? "Policy"} parent={AUTO_UPDATE} bleed>
      {(ctx) => <PolicyPage {...ctx} id={id} />}
    </WsPage>
  )
}

// /containers/auto-update/[id]: what a policy covers and did, and its form.
function PolicyPage({ ws, phone, id }: WsCtx & { id: string }) {
  const router = useRouter()
  const query = useAutoUpdate(ws.id, id)
  const [f, setF] = useQueryStates(policyParsers)
  const a = usePolicyActions(ws.id, {
    onDeleted: () => router.replace(AUTO_UPDATE),
  })
  const p = query.data
  usePageCrumbs(p ? [{ href: autoUpdateHref(p.id), label: p.name }] : [])

  if (query.isPending) {
    return <Skeleton className="h-72 rounded-2xl max-md:mx-4 max-md:mt-4" />
  }
  if (query.isError || !p) {
    return (
      <Empty
        icon={RefreshCcwDot}
        title="Couldn't open this policy"
        body={
          query.error?.message ??
          "It was deleted, or belongs to another workspace."
        }
        className="max-md:mt-4"
        action={
          <Button
            variant="outline"
            render={<Link href={AUTO_UPDATE} />}
            nativeButton={false}
          >
            All policies
          </Button>
        }
      />
    )
  }

  const tab = f.tab === "settings" && !a.can.edit ? "overview" : f.tab
  const setTab = (t: typeof tab) =>
    setF({ tab: t === "overview" ? null : t }, { history: "push" })

  return (
    <>
      <PageBar
        phone={phone}
        tabs={
          <Segmented
            label="Show"
            value={tab}
            onChange={setTab}
            items={[
              { value: "overview", label: "Overview" },
              { value: "activity", label: "Activity" },
              ...(a.can.edit
                ? [{ value: "settings" as const, label: "Settings" }]
                : []),
            ]}
          />
        }
        filters={
          tab === "activity" ? (
            <ActivityFilters phone={phone} policies={[p]} fixedPolicy={p.id} />
          ) : undefined
        }
        caption={p.running ? "Running now" : p.enabled ? undefined : "Paused"}
        refresh={{ busy: query.isFetching, run: () => query.refetch() }}
        more={a
          .menu(p, { onPage: true })
          .map((g) => g.filter((i) => i.key !== "run"))}
        primary={
          a.can.operate && tab !== "settings"
            ? {
                label: p.mode === "monitor" ? "Check now" : "Run now",
                icon: <Play />,
                run: () =>
                  p.running ? toast("It's running already") : a.start(p),
              }
            : undefined
        }
      />
      <div className={cn(phone ? "pt-3 pb-24" : "mt-4")}>
        {tab === "overview" && (
          <Overview ws={ws.id} phone={phone} p={p} a={a} />
        )}
        {tab === "activity" && (
          <AutoUpdateEvents ws={ws.id} phone={phone} fixedPolicy={p.id} />
        )}
        {tab === "settings" && (
          <AutoUpdateEditor
            key={p.updated_at}
            ws={ws.id}
            phone={phone}
            saved={p}
          />
        )}
      </div>
      {a.dialogs}
    </>
  )
}

function Overview({
  ws,
  phone,
  p,
  a,
}: {
  ws: string
  phone: boolean
  p: DockerAutoUpdate
  a: ReturnType<typeof usePolicyActions>
}) {
  const last = lastStateMeta(p)
  const missing = p.servers.filter((s) => s.missing)
  const tz = p.timezone || "UTC"
  return (
    <div className={cn("flex flex-col", phone ? "gap-5" : "gap-6")}>
      {(!p.enabled ||
        (p.last_state === "failed" && p.last_note) ||
        missing.length > 0) && (
        <div className="flex flex-col gap-2 max-md:px-4">
          {!p.enabled && (
            <Callout icon={<Pause />} tone="warning">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Paused: it doesn't run on its schedule or webhook.</span>
                {a.can.edit && (
                  <button
                    type="button"
                    className="font-medium text-brand hover:underline"
                    onClick={() => a.setEnabled(p, true)}
                  >
                    Turn on
                  </button>
                )}
              </span>
            </Callout>
          )}
          {p.last_state === "failed" && p.last_note && (
            <Callout icon={<TriangleAlert />} tone="warning">
              The last run failed: {p.last_note}
            </Callout>
          )}
          {missing.length > 0 && (
            <Callout icon={<Info />} tone="warning">
              {missing.map((s) => s.name).join(", ")}{" "}
              {missing.length === 1 ? "is" : "are"} no longer in this workspace
              and {missing.length === 1 ? "is" : "are"} skipped.
            </Callout>
          )}
        </div>
      )}

      <div
        className={cn(
          "grid gap-3",
          phone ? "grid-cols-2 px-4" : "grid-cols-2 xl:grid-cols-4",
        )}
      >
        <Tile label="Last run">
          <span className="flex items-center gap-1.5">
            <Dot tone={last.tone} />
            {last.label}
          </span>
          {p.last_run_at && (
            <span className="text-caption text-ash">
              {timeAgo(p.last_run_at)}
            </span>
          )}
        </Tile>
        <Tile label="Next run">
          {!p.enabled ? (
            <span className="text-muted-foreground">Paused</span>
          ) : p.next_run_at ? (
            <>
              <span>{timeAgo(p.next_run_at)}</span>
              <span className="text-caption text-ash">
                {formatInZone(p.next_run_at, tz)}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">By hand or webhook</span>
          )}
        </Tile>
        <Tile label="Does">
          <span className="flex items-center gap-2">
            {modeMeta[p.mode].label}
            {p.mode === "monitor" && <Tag tone="brand">Only tells</Tag>}
          </span>
          <span className="truncate text-caption text-ash">{coverText(p)}</span>
        </Tile>
        <Tile label="Last 30 days">
          <MonthCounts p={p} />
        </Tile>
      </div>

      <div
        className={cn(
          "grid gap-6",
          !phone && "xl:grid-cols-[minmax(0,1fr)_24rem]",
        )}
      >
        <div className="flex min-w-0 flex-col gap-6">
          <Card
            title="Containers it takes in"
            hint="Right now, with the state of each one's image."
            phone={phone}
          >
            <CoverPreview
              ws={ws}
              phone={phone}
              rules={{
                servers: p.servers.filter((s) => !s.missing).map((s) => s.id),
                pick: p.pick,
                include: p.include,
                exclude: p.exclude,
                include_stopped: p.include_stopped,
                mode: p.mode,
              }}
              onRunServer={
                a.can.operate ? (server) => a.start(p, { server }) : undefined
              }
              runDisabled={p.running || a.starting}
              runLabel={p.mode === "monitor" ? "Check here" : "Run here"}
            />
          </Card>
          <Card
            title="Recent activity"
            phone={phone}
            action={
              <Link
                href={autoUpdateHref(p.id, "activity")}
                className="text-body-sm font-medium text-brand hover:underline"
              >
                See all
              </Link>
            }
          >
            <AutoUpdateEvents
              ws={ws}
              phone={phone}
              fixedPolicy={p.id}
              limit={8}
            />
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <HowItRuns p={p} phone={phone} />
          {p.webhook_token && (
            <WebhookCard ws={ws} p={p} phone={phone} canReset={a.can.edit} />
          )}
        </div>
      </div>
    </div>
  )
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-border p-4 text-body-sm">
      <span className="font-label text-[11px] tracking-label text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

function Card({
  title,
  hint,
  action,
  phone,
  children,
}: {
  title: string
  hint?: string
  action?: ReactNode
  phone: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3",
        phone ? "px-4" : "rounded-2xl border border-border p-5",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-body font-medium">{title}</h2>
          {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function HowItRuns({ p, phone }: { p: DockerAutoUpdate; phone: boolean }) {
  const updates = p.mode === "update"
  const rows: [string, ReactNode][] = [
    ["Containers", pickMeta[p.pick].label],
    ...(p.include.length > 0 && p.pick !== "all"
      ? ([["Names", p.include.join(", ")]] as [string, ReactNode][])
      : []),
    ...(p.exclude.length > 0
      ? ([["Never touch", p.exclude.join(", ")]] as [string, ReactNode][])
      : []),
    [
      "Stopped ones",
      p.include_stopped
        ? p.revive_stopped && updates
          ? "Included, started after"
          : "Included"
        : "Left out",
    ],
    [
      "Schedule",
      p.cron
        ? `${cronText(p.cron)} (${p.timezone || "UTC"})`
        : "By hand or webhook",
    ],
  ]
  if (updates) {
    rows.push(
      ["Pull", p.no_pull ? "Never (uses images already on the server)" : "Yes"],
      [
        "Roll back",
        p.rollback ? `If it fails within ${p.wait_seconds} s` : "No",
      ],
      [
        "Linked containers",
        p.restart_linked ? "Restarted after" : "Left alone",
      ],
      ["Time to stop", `${p.stop_timeout} s`],
      ["Old images", p.cleanup ? "Removed" : "Kept"],
      [
        "New images",
        p.min_age_hours > 0
          ? `Taken once ${p.min_age_hours} h old`
          : "Taken at once",
      ],
    )
  }
  rows.push(
    ["Hooks", p.hooks ? `Run, up to ${p.hook_timeout} s each` : "Not run"],
    ["Tells", notifyMeta[p.notify]],
  )
  if (p.runs_as) rows.push(["Runs as", p.runs_as])
  return (
    <Card title="How it runs" phone={phone}>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-body-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function WebhookCard({
  ws,
  p,
  phone,
  canReset,
}: {
  ws: string
  p: DockerAutoUpdate
  phone: boolean
  canReset: boolean
}) {
  const reset = useResetAutoUpdateWebhook()
  const [confirm, setConfirm] = useOpen("auto-update-webhook-reset")
  const [copied, setCopied] = useState("")
  const url = webhookUrl(p.webhook_token ?? "")
  const copy = (text: string, what: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(what)
        setTimeout(() => setCopied(""), 1500)
      })
      .catch(() => toast.error("Couldn't copy: copy it by hand"))
  }
  const curl = `curl -X POST "${url}"`
  const one = `curl -X POST "${url}?image=ghcr.io/acme/web"`
  return (
    <Card
      title="Webhook"
      hint="Call it from your CI after pushing an image: the policy runs at once (also while its schedule is off)."
      phone={phone}
      action={<Webhook className="size-5 text-muted-foreground" />}
    >
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-subtle px-3 py-2 font-mono text-caption">
          {url}
        </code>
        <Button
          variant="outline"
          size="icon"
          className="size-11 shrink-0 md:size-9"
          aria-label="Copy the URL"
          title="Copy the URL"
          onClick={() => copy(url, "url")}
        >
          {copied === "url" ? <Check /> : <Copy />}
        </Button>
      </div>
      <div className="flex flex-col gap-1.5 text-caption text-muted-foreground">
        <p>Everything the policy covers:</p>
        <Snippet
          text={curl}
          onCopy={() => copy(curl, "all")}
          copied={copied === "all"}
        />
        <p>Only containers on one image (any tag of it):</p>
        <Snippet
          text={one}
          onCopy={() => copy(one, "one")}
          copied={copied === "one"}
        />
        <p>
          Anyone with the URL can start a run, so keep it secret. A paused
          policy ignores it.
        </p>
      </div>
      {canReset && (
        <Button
          variant="outline"
          className="h-11 self-start md:h-9"
          onClick={() => setConfirm(true)}
        >
          <RotateCcw />
          New URL
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Make a new webhook URL?"
        description="The current URL stops working at once; update your CI with the new one."
        confirmLabel="Make a new one"
        pending={reset.isPending}
        onConfirm={() =>
          reset.mutate(
            { ws, id: p.id },
            {
              onSuccess: () => {
                setConfirm(false)
                toast.success("New webhook URL made")
              },
              onError: (e) => toast.error(e.message),
            },
          )
        }
      />
    </Card>
  )
}

function Snippet({
  text,
  onCopy,
  copied,
}: {
  text: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="flex items-start gap-1 rounded-lg bg-subtle ps-3">
      <code className="min-w-0 flex-1 py-2 font-mono break-all text-foreground">
        {text}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        aria-label="Copy"
        onClick={onCopy}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}
