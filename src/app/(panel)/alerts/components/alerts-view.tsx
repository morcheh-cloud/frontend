"use client"

import {
  BellRing,
  CircleCheck,
  CircleX,
  Ellipsis,
  FlaskConical,
  History,
  Pencil,
  Plus,
  Power,
  Siren,
  Star,
  StarOff,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"
import { type ReactNode, useDeferredValue, useRef, useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/cronjobs/components/editor-parts"
import {
  Empty,
  Facts,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { useWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIntent } from "@/hooks/useIntent"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { AlertRule, NotifyChannel } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useAlertRules,
  useChannelLog,
  useChannels,
  useDeleteChannel,
  useSaveChannel,
  useTestChannel,
} from "../api"
import { ChannelFormLayer } from "./channel-form"
import { AlertEventList } from "./events-list"
import {
  ChannelIcon,
  type ChannelKind,
  channelBroken,
  channelLabel,
  channelTarget,
} from "./meta"
import { RuleActionsProvider, useRuleActions } from "./rule-actions"
import { FiringNotice, RulesList } from "./rules-list"
import {
  byRuleState,
  presets,
  ruleSentence,
  ruleState,
  scopeText,
  useAlertsFilters,
} from "./rules-meta"

export function AlertsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <Shell phone={phone} />
}

function Shell({ phone }: { phone: boolean }) {
  const [, setFilters] = useAlertsFilters()
  return (
    <RuleActionsProvider
      phone={phone}
      activity={(r) => setFilters({ tab: "activity", rule: r.id, q: null })}
    >
      <View phone={phone} />
    </RuleActionsProvider>
  )
}

type Layer = "form" | "log" | "delete"

function View({ phone }: { phone: boolean }) {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const ws = workspace?.id ?? ""
  const owner = atLeast(access.workspaceLevel(ws), "owner")
  const [{ tab, q, rule }, setFilters] = useAlertsFilters()
  const ruleActions = useRuleActions()
  const rules = useAlertRules()
  const list = useChannels()
  const items = list.data ?? []

  const [formOpen, setFormOpen] = useOpen("channel-form")
  const [logOpen, setLogOpen] = useOpen("channel-log")
  const [deleteOpen, setDeleteOpen] = useOpen("channel-delete")
  const [picked, setPicked] = useState<NotifyChannel>()
  const remove = useDeleteChannel()

  const open = (layer: Layer, c?: NotifyChannel) => {
    setPicked(c)
    if (layer === "form") setFormOpen(true)
    if (layer === "log") setLogOpen(true)
    if (layer === "delete") setDeleteOpen(true)
  }
  // The layers read the fresh copy from the list (a test changes it).
  const current = items.find((c) => c.id === picked?.id) ?? picked

  const add = () => open("form")
  useIntent("add-alert-channel", () => owner && add())
  useIntent("add-alert-rule", () => ruleActions.can && ruleActions.create())

  const allRules = rules.data ?? []
  const firing = allRules.filter((r) => ruleState(r) === "firing").length
  const waiting = allRules.filter((r) => ruleState(r) === "pending").length
  const failing = items.filter(channelBroken).length

  const action =
    tab === "rules" && ruleActions.can
      ? { label: "New rule", run: () => ruleActions.create() }
      : tab === "channels" && owner
        ? { label: "Add channel", run: add }
        : null

  let body: ReactNode
  if (tab === "rules") {
    body = (
      <RulesBody
        phone={phone}
        query={rules}
        q={q}
        noChannels={list.isSuccess && items.length === 0}
        toChannels={() => setFilters({ tab: "channels", q: null })}
      />
    )
  } else if (tab === "activity") {
    body = (
      <ActivityBody
        phone={phone}
        rule={allRules.find((r) => r.id === rule)}
        ruleId={rule}
        clear={() => setFilters({ rule: null })}
      />
    )
  } else if (list.isPending) body = <Placeholder phone={phone} />
  else if (list.isError && !list.data) {
    body = <Failed message={list.error.message} retry={() => list.refetch()} />
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={BellRing}
        title="No alert channels yet"
        body={
          owner
            ? "Add where alerts should go: an email list, a Telegram or Bale group, Slack, Discord, Teams, a phone app like ntfy, or your own webhook. Alert rules and monitors then send there when something goes wrong and when it's back."
            : "A workspace owner adds where alerts go: email, Telegram, Bale, Slack, a phone app or a webhook."
        }
        action={
          owner && (
            <Button className="h-11 w-full md:h-9 md:w-auto" onClick={add}>
              <Plus />
              Add channel
            </Button>
          )
        }
      />
    )
  } else if (phone) {
    body = <Rows items={items} owner={owner} open={open} />
  } else {
    body = <Table items={items} owner={owner} open={open} />
  }

  const caption =
    tab === "rules"
      ? allRules.length > 0 && (
          <>
            {allRules.length} {allRules.length === 1 ? "rule" : "rules"}
            {firing > 0 && (
              <span className="text-destructive"> · {firing} firing</span>
            )}
            {waiting > 0 && (
              <span className="text-warning"> · {waiting} waiting</span>
            )}
          </>
        )
      : tab === "channels"
        ? items.length > 0 && (
            <>
              {items.length} {items.length === 1 ? "channel" : "channels"}
              {failing > 0 && (
                <span className="text-destructive"> · {failing} failing</span>
              )}
            </>
          )
        : null

  const pill = (n: number) =>
    n > 0 && (
      <span className="rounded-full bg-destructive px-1.5 text-caption font-medium text-white tabular-nums">
        {n}
      </span>
    )
  const tabs = (
    <Segmented
      label="View"
      items={[
        {
          value: "rules" as const,
          label: (
            <span className="flex items-center gap-1.5">
              Rules
              {pill(firing)}
            </span>
          ),
        },
        {
          value: "channels" as const,
          label: (
            <span className="flex items-center gap-1.5">
              Channels
              {pill(failing)}
            </span>
          ),
        },
        { value: "activity" as const, label: "Activity" },
      ]}
      value={tab}
      onChange={(t) =>
        setFilters({ tab: t === "rules" ? null : t, q: null, rule: null })
      }
    />
  )
  const search = tab === "rules" && allRules.length > 0 && (
    <SearchBox
      value={q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder="Search rules"
      label="Search rules"
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )

  return (
    <>
      {phone && (
        <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
          <h1 className="text-heading font-light">Alerts</h1>
          <HelpButton
            href={guideHref("alerts")}
            label="Alerts guide"
            className="ms-auto"
          />
          {action && (
            <Button
              size="icon-lg"
              aria-label={action.label}
              className="rounded-full"
              onClick={action.run}
            >
              <Plus className="size-5" />
            </Button>
          )}
        </header>
      )}
      <div
        className={cn(
          "flex flex-col pb-24",
          phone ? "gap-3 pt-4" : "gap-4 px-6 pt-5",
        )}
      >
        {phone ? (
          <div className="flex flex-col gap-3 px-4">
            <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
              {tabs}
            </div>
            {search}
            {caption && (
              <p className="text-caption text-muted-foreground">{caption}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {tabs}
            {search}
            {caption && (
              <span className="px-1 text-caption text-muted-foreground">
                {caption}
              </span>
            )}
            {action && (
              <Button className="ms-auto" onClick={action.run}>
                <Plus />
                {action.label}
              </Button>
            )}
          </div>
        )}
        {body}
      </div>

      <ChannelFormLayer
        open={formOpen}
        onOpenChange={setFormOpen}
        channel={picked ? current : undefined}
        workspaceId={ws}
        admin={access.admin}
        phone={phone}
      />
      <LogLayer channel={current} open={logOpen} onOpenChange={setLogOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${current?.name ?? "channel"}?`}
        description={deleteText(current)}
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          current &&
          remove.mutate(current, {
            onSuccess: () => {
              toast.success(`${current.name} deleted`)
              setDeleteOpen(false)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  )
}

function deleteText(c?: NotifyChannel) {
  const users = [
    c?.monitors && `${c.monitors} ${c.monitors === 1 ? "monitor" : "monitors"}`,
    c?.rules && `${c.rules} alert ${c.rules === 1 ? "rule" : "rules"}`,
  ].filter(Boolean)
  if (users.length === 0) return "Nothing sends here any more once it's gone."
  return `${users.join(" and ")} send here; they stop alerting through it. Other channels stay.`
}

function Failed({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center md:rounded-2xl md:border md:border-border">
      <p className="text-body-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="h-11 md:h-9" onClick={retry}>
        Try again
      </Button>
    </div>
  )
}

// ---- Rules ----

function RulesBody({
  phone,
  query,
  q,
  noChannels,
  toChannels,
}: {
  phone: boolean
  query: ReturnType<typeof useAlertRules>
  q: string
  noChannels: boolean
  toChannels: () => void
}) {
  const a = useRuleActions()
  const [, setFilters] = useAlertsFilters()
  const needle = useDeferredValue(q).trim().toLowerCase()
  if (query.isPending) return <Placeholder phone={phone} />
  if (query.isError && !query.data)
    return (
      <Failed message={query.error.message} retry={() => query.refetch()} />
    )
  const all = [...(query.data ?? [])].sort(byRuleState)
  if (all.length === 0) {
    return (
      <Empty
        icon={Siren}
        title="No alert rules yet"
        body={
          a.can
            ? "Get told when a server is unreachable, a disk fills up, or CPU, memory, load or traffic stay high for a while. Start from one of these, or make your own."
            : "Someone with Engineer access to the workspace adds rules: alerts when a server is unreachable, a disk fills up or CPU stays high."
        }
        action={
          a.can && (
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:justify-center">
              {presets.map((p) => (
                <Button
                  key={p.key}
                  variant="outline"
                  className="h-11 md:h-9"
                  onClick={() => a.create({ preset: p })}
                >
                  {p.name}
                </Button>
              ))}
              <Button className="h-11 md:h-9" onClick={() => a.create()}>
                <Plus />
                New rule
              </Button>
            </div>
          )
        }
      />
    )
  }
  const shown = needle
    ? all.filter((r) =>
        [r.name, ruleSentence(r), scopeText(r), r.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : all
  return (
    <>
      {noChannels && (
        <div className={phone ? "px-4" : undefined}>
          <Callout icon={<TriangleAlert />} tone="warning">
            No alert channels yet, so rules show here and in the menu count but
            send nothing.{" "}
            <button
              type="button"
              onClick={toChannels}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Add a channel
            </button>
          </Callout>
        </div>
      )}
      <div className={phone ? "px-4" : undefined}>
        <FiringNotice rules={all} />
      </div>
      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-body-sm text-muted-foreground">
            No rule matches “{q}”.
          </p>
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => setFilters({ q: null })}
          >
            Clear search
          </Button>
        </div>
      ) : (
        <RulesList rules={shown} phone={phone} />
      )}
    </>
  )
}

// ---- Activity ----

function ActivityBody({
  phone,
  rule,
  ruleId,
  clear,
}: {
  phone: boolean
  rule?: AlertRule
  ruleId: string
  clear: () => void
}) {
  return (
    <>
      {ruleId && (
        <div className={cn("flex", phone && "px-4")}>
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-soft ps-3 pe-2 text-body-sm text-brand-strong md:h-8"
          >
            Only {rule?.name ?? "one rule"}
            <X className="size-4" aria-label="Show every rule" />
          </button>
        </div>
      )}
      <AlertEventList
        phone={phone}
        ruleId={ruleId || undefined}
        emptyText={
          ruleId
            ? "This rule hasn't fired yet."
            : "Nothing has fired yet. When a rule's condition holds long enough, it shows here with the server, the value and how long it lasted."
        }
      />
    </>
  )
}

type Open = (layer: Layer, c?: NotifyChannel) => void

// Every action on a channel, for the ⋯ menu and the phone sheet.
function useChannelMenu(
  c: NotifyChannel,
  owner: boolean,
  open: Open,
): Item[][] {
  const save = useSaveChannel()
  const test = useTestChannel()

  const change = (patch: { enabled?: boolean; is_default?: boolean }) =>
    save.mutate(
      {
        id: c.id,
        body: {
          kind: c.kind as ChannelKind,
          name: c.name,
          config: c.config,
          secrets: {},
          enabled: c.enabled,
          is_default: c.is_default,
          allow_internal: c.allow_internal,
          ...patch,
        },
      },
      {
        onSuccess: (x) =>
          toast.success(
            patch.enabled !== undefined
              ? `${x.name} turned ${x.enabled ? "on" : "off"}`
              : x.is_default
                ? `${x.name} is ticked for new monitors`
                : `${x.name} is no longer a default`,
          ),
        onError: (e) => toast.error(e.message),
      },
    )

  const sendTest = () =>
    test.mutate(c.id, {
      onSuccess: (r) =>
        r.ok
          ? toast.success(`Test sent through ${c.name}`)
          : toast.error(r.message),
      onError: (e) => toast.error(e.message),
    })

  return [
    owner
      ? [
          {
            key: "test",
            label: test.isPending ? "Sending…" : "Send a test",
            icon: <FlaskConical />,
            disabled: test.isPending || !c.enabled,
            onSelect: sendTest,
          },
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil />,
            onSelect: () => open("form", c),
          },
        ]
      : [],
    [
      {
        key: "log",
        label: "Messages sent",
        icon: <History />,
        onSelect: () => open("log", c),
      },
    ],
    owner
      ? [
          {
            key: "default",
            label: c.is_default ? "Not a default" : "Make a default",
            icon: c.is_default ? <StarOff /> : <Star />,
            disabled: save.isPending,
            onSelect: () => change({ is_default: !c.is_default }),
          },
          {
            key: "enabled",
            label: c.enabled ? "Turn off" : "Turn on",
            icon: <Power />,
            disabled: save.isPending,
            onSelect: () => change({ enabled: !c.enabled }),
          },
        ]
      : [],
    owner
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => open("delete", c),
          },
        ]
      : [],
  ]
}

function Status({ c }: { c: NotifyChannel }) {
  if (!c.enabled) return <span className="text-body-sm text-ash">Off</span>
  if (channelBroken(c))
    return (
      <span className="flex items-center gap-1.5 text-body-sm text-destructive">
        <CircleX className="size-4 shrink-0" />
        Last message failed
      </span>
    )
  if (c.last_sent_at)
    return (
      <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        <CircleCheck className="size-4 shrink-0 text-success" />
        Working
      </span>
    )
  return (
    <span className="text-body-sm text-muted-foreground">Not used yet</span>
  )
}

function usedBy(c: NotifyChannel) {
  const parts = [
    c.rules > 0 && `${c.rules} ${c.rules === 1 ? "rule" : "rules"}`,
    c.monitors > 0 &&
      `${c.monitors} ${c.monitors === 1 ? "monitor" : "monitors"}`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : "Nothing yet"
}

function DefaultTag() {
  return (
    <span className="rounded-full bg-brand-soft px-2 py-0.5 font-label text-caption tracking-label text-brand-strong uppercase">
      Default
    </span>
  )
}

function Tile({ c, size = "md" }: { c: NotifyChannel; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        size === "lg" ? "size-10" : "size-8",
        c.enabled ? "bg-brand-soft text-brand-strong" : "bg-muted text-ash",
      )}
    >
      <ChannelIcon kind={c.kind} className="size-4" />
    </span>
  )
}

// ---- Desktop ----

function Table({
  items,
  owner,
  open,
}: {
  items: NotifyChannel[]
  owner: boolean
  open: Open
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="bg-subtle text-muted-foreground">
          <tr>
            <th scope="col" className="h-10 px-3 text-start font-medium">
              Channel
            </th>
            <th scope="col" className="h-10 px-3 text-start font-medium">
              Status
            </th>
            <th
              scope="col"
              className="hidden h-10 px-3 text-end font-medium lg:table-cell"
            >
              Used by
            </th>
            <th
              scope="col"
              className="hidden h-10 px-3 text-start font-medium md:table-cell"
            >
              Last message
            </th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((c) => (
            <Row key={c.id} c={c} owner={owner} open={open} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({
  c,
  owner,
  open,
}: {
  c: NotifyChannel
  owner: boolean
  open: Open
}) {
  const menu = useChannelMenu(c, owner, open)
  const target = channelTarget(c)
  return (
    <tr className="group hover:bg-subtle">
      <td className="p-3">
        <button
          type="button"
          onClick={() => open(owner ? "form" : "log", c)}
          className="flex min-w-0 items-center gap-3 text-start outline-none focus-visible:underline"
        >
          <Tile c={c} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{c.name}</span>
              {c.is_default && <DefaultTag />}
            </span>
            <span className="block truncate text-caption text-muted-foreground">
              {channelLabel(c.kind)}
              {target && ` · ${target}`}
            </span>
          </span>
        </button>
      </td>
      <td className="p-3">
        <Status c={c} />
        {channelBroken(c) && (
          <p
            className="mt-0.5 line-clamp-1 max-w-xs text-caption text-muted-foreground"
            title={c.last_error}
          >
            {c.last_error}
          </p>
        )}
      </td>
      <td className="hidden p-3 text-end text-muted-foreground tabular-nums lg:table-cell">
        {usedBy(c)}
      </td>
      <td className="hidden p-3 text-muted-foreground md:table-cell">
        {c.last_sent_at ? timeAgo(c.last_sent_at) : "Never"}
      </td>
      <td className="px-2 py-3 text-end">
        <ItemMenu groups={menu} label={`${c.name} actions`} />
      </td>
    </tr>
  )
}

// ---- Phone ----

function Rows({
  items,
  owner,
  open,
}: {
  items: NotifyChannel[]
  owner: boolean
  open: Open
}) {
  const [sheetOpen, setSheetOpen] = useOpen("channel-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<NotifyChannel | null>(null)
  const current = items.find((c) => c.id === id) ?? last.current
  if (current) last.current = current

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => {
                setId(c.id)
                setSheetOpen(true)
              }}
              className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-start outline-none active:bg-muted"
            >
              <Tile c={c} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-body font-medium">
                    {c.name}
                  </span>
                  {c.is_default && <DefaultTag />}
                </span>
                <Status c={c} />
              </span>
              <Ellipsis className="size-5 shrink-0 text-ash" />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <ChannelSheet
          c={current}
          owner={owner}
          open={open}
          sheetOpen={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  )
}

function ChannelSheet({
  c,
  owner,
  open,
  sheetOpen,
  onOpenChange,
}: {
  c: NotifyChannel
  owner: boolean
  open: Open
  sheetOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useChannelMenu(c, owner, open)
  return (
    <BottomSheet open={sheetOpen} onOpenChange={onOpenChange} title={c.name}>
      {channelBroken(c) && (
        <p className="mx-2 mb-3 rounded-2xl bg-subtle p-4 text-body-sm">
          {c.last_error}
        </p>
      )}
      <Facts
        items={[
          { label: "Kind", value: channelLabel(c.kind) },
          { label: "Status", value: <Status c={c} /> },
          ...(channelTarget(c)
            ? [{ label: "Sends to", value: channelTarget(c), wide: true }]
            : []),
          { label: "Used by", value: usedBy(c) },
          {
            label: "Last message",
            value: c.last_sent_at ? timeAgo(c.last_sent_at) : "Never",
          },
        ]}
      />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

// ---- Message log ----

function LogLayer({
  channel,
  open,
  onOpenChange,
}: {
  channel?: NotifyChannel
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const log = useChannelLog(open ? channel?.id : undefined)
  const items = log.data ?? []
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={channel ? `Messages sent · ${channel.name}` : "Messages sent"}
      description="The last 100 messages, newest first."
      className="sm:max-w-xl"
    >
      {log.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : log.isError ? (
        <p className="py-6 text-center text-body-sm text-muted-foreground">
          {log.error.message}
        </p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-muted-foreground">
          Nothing sent yet. Send a test to try it.
        </p>
      ) : (
        <ul className="-mx-2 flex max-h-[60vh] flex-col divide-y divide-border overflow-y-auto">
          {items.map((e) => (
            <li key={e.id} className="flex gap-3 px-2 py-3">
              {e.ok ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium break-words">
                  {e.title}
                </p>
                <p className="text-caption text-muted-foreground">
                  {timeAgo(e.at)}
                  {e.monitor_name && ` · ${e.monitor_name}`}
                </p>
                {!e.ok && e.error && (
                  <p className="mt-1 text-caption break-words text-destructive">
                    {e.error}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  )
}

function Placeholder({ phone }: { phone: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden border-border",
        phone ? "border-y" : "rounded-2xl border",
      )}
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-16 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ms-auto h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
