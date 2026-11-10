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
  Star,
  StarOff,
  Trash2,
} from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import {
  Empty,
  Facts,
  type Item,
  ItemMenu,
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
import type { NotifyChannel } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useChannelLog,
  useChannels,
  useDeleteChannel,
  useSaveChannel,
  useTestChannel,
} from "../api"
import { ChannelFormLayer } from "./channel-form"
import {
  ChannelIcon,
  type ChannelKind,
  channelBroken,
  channelLabel,
  channelTarget,
} from "./meta"

export function AlertsView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <View phone={phone} />
}

type Layer = "form" | "log" | "delete"

function View({ phone }: { phone: boolean }) {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const ws = workspace?.id ?? ""
  const owner = atLeast(access.workspaceLevel(ws), "owner")
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

  let body: React.ReactNode
  if (list.isPending) body = <Placeholder phone={phone} />
  else if (list.isError && !list.data) {
    body = (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center md:rounded-2xl md:border md:border-border">
        <p className="text-body-sm text-muted-foreground">
          {list.error.message}
        </p>
        <Button
          variant="outline"
          className="h-11 md:h-9"
          onClick={() => list.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={BellRing}
        title="No alert channels yet"
        body={
          owner
            ? "Add where alerts should go: an email list, a Telegram or Bale group, Slack, Discord, Teams, a phone app like ntfy, or your own webhook. Monitors then send there when something goes down and when it comes back."
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

  const failing = items.filter(channelBroken).length

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
          {owner && (
            <Button
              size="icon-lg"
              aria-label="Add channel"
              className="rounded-full"
              onClick={add}
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
        {items.length > 0 && (
          <div
            className={cn(
              "flex items-center gap-2 text-caption text-muted-foreground",
              phone ? "px-4" : "min-h-9",
            )}
          >
            <span>
              {items.length} {items.length === 1 ? "channel" : "channels"}
              {failing > 0 && (
                <span className="text-destructive"> · {failing} failing</span>
              )}
            </span>
            {!phone && (
              <span className="hidden text-ash lg:inline">
                · Monitors pick channels in their Alerts section; a Default one
                is ticked for every new monitor.
              </span>
            )}
            {!phone && owner && (
              <Button className="ms-auto" onClick={add}>
                <Plus />
                Add channel
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
        description={
          current?.monitors
            ? `${current.monitors} ${current.monitors === 1 ? "monitor sends" : "monitors send"} here; they stop alerting through it. Other channels stay.`
            : "Nothing sends here any more once it's gone."
        }
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
              Monitors
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
      <td className="hidden p-3 text-end tabular-nums lg:table-cell">
        {c.monitors}
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
          { label: "Monitors", value: String(c.monitors) },
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
