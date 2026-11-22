"use client"

import {
  ChevronLeft,
  Ellipsis,
  Inbox,
  KeyRound,
  Send,
  Settings2,
  Trash2,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import { Section } from "@/app/(panel)/cronjobs/components/editor-parts"
import {
  Empty,
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { eventsText, useEventCatalog } from "@/components/events/catalog"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { OutgoingWebhook, WebhookDelivery } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useDeleteWebhook,
  useRotateSecret,
  useSaveWebhook,
  useTestWebhook,
  useWebhook,
} from "../api"
import { Deliveries, DeliveryLayer, useDeliveryParam } from "./deliveries"
import { HealthLabel, HealthStrip } from "./health"
import {
  answerText,
  bodyOf,
  hostOf,
  LIST,
  type PageTab,
  pageParsers,
  WebhookIcon,
  webhookHref,
} from "./meta"
import { useWebhookCan } from "./permissions"
import { dropSecret, peekSecret, SecretDialog } from "./secret-dialog"
import { VerifyCard } from "./verify-card"
import { scrollToProblem, serverErrors } from "./webhook-editor"
import {
  check,
  type Draft,
  draftOf,
  type Errors,
  serial,
  toBody,
  WebhookSections,
} from "./webhook-form"

export function WebhookFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <WebhookPage id={id} />
}

export function WebhookPage({ id }: { id: string }) {
  const phone = useIsPhone()
  const query = useWebhook(id)
  if (phone === null) return null
  if (query.isPending) return <Loading phone={phone} />
  if (!query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={WebhookIcon}
          title={gone ? "This webhook isn't here" : "Couldn't load the webhook"}
          body={
            gone
              ? "It was removed, or it needs Owner access to its workspace."
              : query.error?.message
          }
        />
      </div>
    )
  }
  return <Page w={query.data} phone={phone} />
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone ? "p-4" : "px-6 pt-5")}>
      <Skeleton className={phone ? "h-24 rounded-xl" : "h-56 rounded-3xl"} />
      <Skeleton className="h-9 w-72 rounded-lg" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}

function Page({ w, phone }: { w: OutgoingWebhook; phone: boolean }) {
  const router = useRouter()
  useFollowWorkspace(w.workspace_id)
  const can = useWebhookCan(w.workspace_id)
  const back = useBack(LIST)
  const catalog = useEventCatalog()
  const [{ tab }, setParams] = useQueryStates(pageParsers)
  const save = useSaveWebhook()
  const test = useTestWebhook()
  const rotate = useRotateSecret()
  const remove = useDeleteWebhook()
  const { open: openDelivery } = useDeliveryParam()

  // A webhook made a moment ago brings its secret along, shown once.
  const [secret, setSecret] = useState(() => peekSecret(w.id))
  const [rotated, setRotated] = useState(false)
  const [secretOpen, setSecretOpen] = useOpen("webhook-secret", !!secret)
  useEffect(() => dropSecret(w.id), [w.id])

  const [sheet, setSheet] = useOpen("webhook-page-menu")
  const [askRotate, setAskRotate] = useOpen("webhook-rotate")
  const [askDelete, setAskDelete] = useOpen("webhook-delete")

  usePageCrumbs([{ href: webhookHref(w.id), label: w.name }])

  const setTab = (next: PageTab) =>
    setParams({
      tab: next === "deliveries" ? null : next,
      status: null,
      page: null,
      delivery: null,
    })

  const toggle = (enabled: boolean) =>
    save.mutate(
      { id: w.id, ws: w.workspace_id, body: bodyOf(w, { enabled }) },
      {
        onSuccess: () => toast.success(enabled ? "Turned on" : "Turned off"),
        onError: (err) => toast.error(err.message),
      },
    )

  const sendTest = () =>
    test.mutate(w.id, {
      onSuccess: (d: WebhookDelivery) => {
        if (d.status === "delivered")
          toast.success(`Test delivered (${answerText(d)})`, {
            action: { label: "Open", onClick: () => openDelivery(d.id) },
          })
        else
          toast.error(`Test failed: ${d.error || answerText(d)}`, {
            action: { label: "Open", onClick: () => openDelivery(d.id) },
          })
        if (tab !== "deliveries") setTab("deliveries")
      },
      onError: (err) => toast.error(err.message),
    })

  const doRotate = () =>
    rotate.mutate(w.id, {
      onSuccess: (r) => {
        setAskRotate(false)
        setSecret(r.secret)
        setRotated(true)
        // The confirm's history entry goes first, then the secret's.
        window.addEventListener("popstate", () => setSecretOpen(true), {
          once: true,
        })
      },
      onError: (err) => toast.error(err.message),
    })

  const doDelete = () =>
    remove.mutate(w.id, {
      onSuccess: () => {
        toast.success(`${w.name} removed`)
        router.replace(LIST)
      },
      onError: (err) => toast.error(err.message),
    })

  const menu: Item[][] = can.edit
    ? [
        [
          {
            key: "test",
            label: "Send a test",
            icon: <Send />,
            onSelect: sendTest,
          },
          {
            key: "rotate",
            label: "New signing secret…",
            icon: <KeyRound />,
            onSelect: () => setAskRotate(true),
          },
        ],
        [
          {
            key: "delete",
            label: "Remove webhook…",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => setAskDelete(true),
          },
        ],
      ]
    : []

  const layers = (
    <>
      <DeliveryLayer w={w} phone={phone} canEdit={can.edit} />
      {secret && (
        <SecretDialog
          open={secretOpen}
          onOpenChange={(o) => {
            setSecretOpen(o)
            if (!o) setSecret(null)
          }}
          secret={secret}
          rotated={rotated}
        />
      )}
      <ConfirmDialog
        open={askRotate}
        onOpenChange={setAskRotate}
        title="Make a new signing secret?"
        description="The old one stops at once: deliveries signed with the new one fail your endpoint's check until you put the new secret there."
        confirmLabel="Make a new one"
        pending={rotate.isPending}
        onConfirm={doRotate}
      />
      <ConfirmDialog
        open={askDelete}
        onOpenChange={setAskDelete}
        title={`Remove ${w.name}?`}
        description="Nothing more is sent to it, and its deliveries (retries waiting included) go with it."
        confirmLabel="Remove"
        pending={remove.isPending}
        onConfirm={doDelete}
      />
    </>
  )

  const demoNote = can.demo && (
    <p
      className={cn(
        "bg-subtle px-4 py-3 text-body-sm text-muted-foreground",
        !phone && "rounded-2xl",
      )}
    >
      The public demo shows webhooks but doesn't change or send them.
    </p>
  )

  const content =
    tab === "settings" ? (
      <SettingsTab
        w={w}
        phone={phone}
        canEdit={can.edit}
        onRotate={() => setAskRotate(true)}
      />
    ) : (
      <DeliveriesTab
        w={w}
        phone={phone}
        canEdit={can.edit}
        onTest={sendTest}
        testing={test.isPending}
      />
    )

  if (phone)
    return (
      <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {w.name}
          </h1>
          <HelpButton
            href={guideHref("api", "webhooks")}
            label="Webhooks guide"
          />
          {menu.length > 0 && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="More"
              onClick={() => setSheet(true)}
            >
              <Ellipsis className="size-5" />
            </Button>
          )}
        </header>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
              <WebhookIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-caption text-muted-foreground">
                {w.url}
              </p>
              <HealthLabel w={w} className="text-body-sm" />
            </div>
            {can.edit && (
              <Switch
                aria-label={w.enabled ? "Turn off" : "Turn on"}
                checked={w.enabled}
                disabled={save.isPending}
                onCheckedChange={toggle}
              />
            )}
          </div>
          <HealthStrip w={w} />
          <p className="text-caption text-muted-foreground">
            {eventsText(w.events, catalog.data)}
            {w.last_delivery_at &&
              ` · last sent ${timeAgo(w.last_delivery_at).toLowerCase()}`}
          </p>
        </div>
        {demoNote}
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-y border-border px-4 py-2">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tab === t.value}
              onClick={() => setTab(t.value)}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-body-sm aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>
        {content}
        <BottomSheet open={sheet} onOpenChange={setSheet} title={w.name}>
          <SheetItems groups={menu} onOpenChange={setSheet} />
        </BottomSheet>
        {layers}
      </div>
    )

  return (
    <div className="flex flex-col gap-5 px-6 pt-5 pb-12">
      <Hero
        w={w}
        events={eventsText(w.events, catalog.data)}
        actions={
          <>
            {can.edit && (
              // biome-ignore lint/a11y/noLabelWithoutControl: the Switch is a Base UI button inside
              <label className="me-1 flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-body-sm">
                <Switch
                  checked={w.enabled}
                  disabled={save.isPending}
                  onCheckedChange={toggle}
                />
                {w.enabled ? "On" : "Off"}
              </label>
            )}
            {can.edit && (
              <Button
                variant="outline"
                className="h-9"
                disabled={test.isPending}
                onClick={sendTest}
              >
                <Send />
                {test.isPending ? "Sending…" : "Send a test"}
              </Button>
            )}
            <ItemMenu
              groups={menu.map((g) => g.filter((i) => i.key !== "test"))}
              label="Webhook actions"
            />
          </>
        }
      />
      {demoNote}
      <div
        role="tablist"
        aria-label="Webhook"
        className="sticky top-[calc(3rem+1px)] z-10 -mx-6 flex h-11 items-end gap-1 border-b border-border bg-background/95 px-6 backdrop-blur"
      >
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className="-mb-px inline-flex h-11 items-center gap-2 border-b-2 border-transparent px-3 text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:border-brand aria-selected:font-medium aria-selected:text-foreground [&_svg]:text-ash aria-selected:[&_svg]:text-brand"
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>
      {content}
      {layers}
    </div>
  )
}

const tabs: { value: PageTab; label: string; icon: typeof Inbox }[] = [
  { value: "deliveries", label: "Deliveries", icon: Inbox },
  { value: "settings", label: "Settings", icon: Settings2 },
]

function Hero({
  w,
  events,
  actions,
}: {
  w: OutgoingWebhook
  events: string
  actions: ReactNode
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-linear-to-br from-brand-soft/70 via-card to-card p-6 lg:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card text-brand shadow-sm">
          <WebhookIcon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-label text-caption tracking-label text-ash uppercase">
            Webhook · {hostOf(w.url)}
          </p>
          <h1 className="mt-1 truncate text-heading font-light">{w.name}</h1>
          <p className="mt-1 truncate font-mono text-caption text-muted-foreground">
            POST {w.url}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
      <div className="mt-8 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-label text-caption tracking-label text-ash uppercase">
            Last 30 deliveries
          </span>
          <HealthLabel w={w} className="text-body-sm" />
        </div>
        <HealthStrip w={w} tall />
      </div>
      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        <HeroFact label="Events">{events}</HeroFact>
        <HeroFact label="Last sent">
          {w.last_delivery_at ? timeAgo(w.last_delivery_at) : "Never"}
        </HeroFact>
        <HeroFact label="Muted alerts">
          {w.include_muted ? "Sent too" : "Left out"}
        </HeroFact>
        <HeroFact label="Headers">
          {w.header_names.length ? w.header_names.join(", ") : "None"}
        </HeroFact>
        <HeroFact label="Added">
          {timeAgo(w.created_at)}
          {w.created_by_name && ` by ${w.created_by_name}`}
        </HeroFact>
      </dl>
    </section>
  )
}

function HeroFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-ash">{label}</dt>
      <dd className="mt-0.5 max-w-80 truncate text-body-sm font-medium">
        {children}
      </dd>
    </div>
  )
}

function DeliveriesTab({
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
  const list = (
    <Deliveries
      w={w}
      phone={phone}
      canEdit={canEdit}
      onTest={onTest}
      testing={testing}
    />
  )
  if (phone) return list
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      {list}
      <aside className="flex flex-col gap-4 rounded-2xl border border-border p-5 xl:sticky xl:top-[calc(3rem+1px+2.75rem+1.25rem)]">
        <h2 className="text-body font-medium">How it's sent</h2>
        <ul className="flex flex-col gap-3 text-body-sm text-muted-foreground">
          <li>
            A <code className="font-mono text-caption">POST</code> with the
            event as JSON. Any <span className="text-foreground">2xx</span>{" "}
            answer within 10 seconds counts as delivered.
          </li>
          <li>
            Anything else is tried again after{" "}
            <span className="text-foreground">30 s, 5 min and 30 min</span>,
            then marked failed. Retries wait across restarts.
          </li>
          <li>
            Test events and the ones sent again by hand are tried once.
            Deliveries are kept 30 days.
          </li>
        </ul>
      </aside>
    </div>
  )
}

function SettingsTab({
  w,
  phone,
  canEdit,
  onRotate,
}: {
  w: OutgoingWebhook
  phone: boolean
  canEdit: boolean
  onRotate: () => void
}) {
  const save = useSaveWebhook()
  const [d, setD] = useState<Draft>(() => draftOf(w))
  const [errors, setErrors] = useState<Errors>({})
  const dirty = serial(d) !== serial(draftOf(w))

  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }))
    setErrors({})
  }

  const submit = () => {
    const e = check(d)
    setErrors(e)
    if (Object.keys(e).length) {
      toast.error(Object.values(e)[0])
      scrollToProblem()
      return
    }
    save.mutate(
      { id: w.id, ws: w.workspace_id, body: toBody(d) },
      {
        onSuccess: ({ webhook }) => {
          toast.success(`${webhook.name} saved`)
          setD(draftOf(webhook))
        },
        onError: (err) => {
          const fields = serverErrors(err)
          setErrors(fields)
          toast.error(Object.values(fields)[0] ?? err.message)
          scrollToProblem()
        },
      },
    )
  }

  return (
    <div className={cn("flex min-w-0 flex-col", !phone && "gap-5")}>
      <fieldset
        disabled={!canEdit}
        className={cn("flex min-w-0 flex-col", !phone && "gap-5")}
      >
        <WebhookSections d={d} set={set} errors={errors} phone={phone} />
      </fieldset>
      <Section
        title="Signing secret"
        hint="Signs every delivery. Shown once when made; make a new one if it leaked or got lost."
        phone={phone}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <p className="min-w-0 flex-1 font-mono text-body-sm tracking-widest text-muted-foreground">
            {w.has_secret ? "whsec_••••••••••••••••" : "None"}
          </p>
          {canEdit && (
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={onRotate}
            >
              <KeyRound />
              Make a new secret
            </Button>
          )}
        </div>
      </Section>
      <VerifyCard phone={phone} />
      {canEdit && (
        <SaveBar
          dirty={dirty}
          pending={save.isPending}
          onSave={submit}
          onDiscard={() => {
            setD(draftOf(w))
            setErrors({})
          }}
        />
      )}
    </div>
  )
}

function SaveBar({
  dirty,
  pending,
  onSave,
  onDiscard,
}: {
  dirty: boolean
  pending: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        onSave()
      }
    }
    window.addEventListener("keydown", key)
    return () => {
      window.removeEventListener("beforeunload", warn)
      window.removeEventListener("keydown", key)
    }
  }, [dirty, onSave])

  if (!dirty) return null
  return (
    <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 border-t border-border bg-background px-4 py-2 md:bottom-6 md:mx-auto md:w-fit md:rounded-2xl md:border md:bg-card md:p-1.5 md:ps-4 md:shadow-md">
      <p
        role="status"
        className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground"
      >
        Unsaved changes
      </p>
      <Button
        variant="ghost"
        className="max-md:h-11"
        disabled={pending}
        onClick={onDiscard}
      >
        Discard
      </Button>
      <Button className="max-md:h-11" disabled={pending} onClick={onSave}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  )
}
