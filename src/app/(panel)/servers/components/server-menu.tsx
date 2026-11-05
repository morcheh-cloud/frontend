"use client"

import {
  Activity,
  CopyPlus,
  ExternalLink,
  FolderInput,
  KeyRound,
  KeySquare,
  Pencil,
  Star,
  StarOff,
  Tags,
  Terminal,
  Trash2,
} from "lucide-react"
import type { ReactNode } from "react"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { Server } from "@/lib/services"
import { address, OsTile, osLabel, StatusDot, statusMeta } from "./meta"
import { useServerCan } from "./permissions"
import { useServerActions } from "./server-actions"

export type Item = {
  key: string
  icon: ReactNode
  label: string
  description?: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

// One list of row actions, rendered as a dropdown (desktop) or an action
// sheet (phone). Groups are separated by a divider. `onDeleted` runs once the
// delete confirmation has closed.
function useItems(
  server: Server,
  checking: boolean,
  onDeleted?: () => void,
): Item[][] {
  const a = useServerActions()
  const can = useServerCan()
  const operator = can(server, "operator")
  const owner = can(server, "owner")
  const primary: Item[] = [
    ...(operator
      ? [
          {
            key: "check",
            icon: <Activity />,
            label: checking ? "Checking…" : "Check connection",
            onSelect: () => a.check(server),
          },
        ]
      : []),
    ...(owner
      ? [
          {
            key: "edit",
            icon: <Pencil />,
            label: "Edit",
            onSelect: () => a.editServer(server),
          },
        ]
      : []),
    {
      key: "copy",
      icon: <Terminal />,
      label: "Copy SSH command",
      onSelect: () => a.copySsh(server),
    },
    ...(owner
      ? [
          {
            key: "credentials",
            icon: <KeySquare />,
            label: "Show SSH credentials…",
            onSelect: () => a.showCredentials(server),
          },
        ]
      : []),
  ]
  if (owner && server.status === "host_key_mismatch") {
    primary.push({
      key: "trust",
      icon: <KeyRound />,
      label: "Trust new host key…",
      onSelect: () => a.trustHostKey(server),
    })
  }
  const organize: Item[] = [
    ...(operator
      ? [
          {
            key: "favorite",
            icon: server.favorite ? <StarOff /> : <Star />,
            label: server.favorite
              ? "Remove from favorites"
              : "Add to favorites",
            onSelect: () => a.toggleFavorite(server),
          },
        ]
      : []),
    ...(owner
      ? [
          {
            key: "move",
            icon: <FolderInput />,
            label: "Move to folder…",
            onSelect: () => a.moveServers([server.id]),
          },
          {
            key: "tags",
            icon: <Tags />,
            label: "Edit tags…",
            onSelect: () => a.tagServers([server]),
          },
          {
            key: "duplicate",
            icon: <CopyPlus />,
            label: "Duplicate",
            onSelect: () => a.duplicate(server),
          },
        ]
      : []),
  ]
  const danger: Item[] = owner
    ? [
        {
          key: "delete",
          icon: <Trash2 />,
          label: "Delete…",
          destructive: true,
          onSelect: () => a.deleteServers([server], onDeleted),
        },
      ]
    : []
  return [primary, organize, danger].filter((group) => group.length > 0)
}

export function ServerMenuItems({
  server,
  checking,
  onDeleted,
  Item = DropdownMenuItem,
  Separator = DropdownMenuSeparator,
}: {
  server: Server
  checking: boolean
  onDeleted?: () => void
  Item?: typeof DropdownMenuItem | typeof ContextMenuItem
  Separator?: typeof DropdownMenuSeparator | typeof ContextMenuSeparator
}) {
  const groups = useItems(server, checking, onDeleted)
  return groups.map((group, i) => (
    <div key={group[0].key}>
      {i > 0 && <Separator />}
      {group.map((item) => (
        <Item
          key={item.key}
          variant={item.destructive ? "destructive" : "default"}
          disabled={item.key === "check" && checking}
          onClick={item.onSelect}
        >
          {item.icon}
          {item.label}
        </Item>
      ))}
    </div>
  ))
}

// The same actions on a right-click. It replaces the browser's own menu over
// the server's link, so the one thing that menu was for comes along.
export function ServerContextContent({
  server,
  checking,
}: {
  server: Server
  checking: boolean
}) {
  return (
    <ContextMenuContent className="w-56">
      <ContextMenuItem
        onClick={() =>
          window.open(`/servers/${server.id}`, "_blank", "noopener")
        }
      >
        <ExternalLink />
        Open in new tab
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ServerMenuItems
        server={server}
        checking={checking}
        Item={ContextMenuItem}
        Separator={ContextMenuSeparator}
      />
    </ContextMenuContent>
  )
}

// Phone: tapping a server opens this sheet, its details on top.
export function ServerSheet({
  server,
  checking,
  open,
  onOpenChange,
  onDeleted,
  extra,
}: {
  server: Server
  checking: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
  // A group of rows only this page has, shown above Delete.
  extra?: Item[]
}) {
  const items = useItems(server, checking, onDeleted)
  const groups =
    extra && extra.length > 0
      ? items.at(-1)?.[0]?.destructive
        ? [...items.slice(0, -1), extra, ...items.slice(-1)]
        : [...items, extra]
      : items

  // Close first, then act once the sheet's history entry is gone, so a layer
  // the action opens gets its own Back entry.
  function run(item: Item) {
    window.addEventListener("popstate", () => item.onSelect(), { once: true })
    onOpenChange(false)
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={server.name}
      header={
        <div className="flex items-center gap-3 px-6 pt-1 pb-3">
          <OsTile os={server.os} className="size-11" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-subheading font-medium">
              {server.name}
            </p>
            <p className="truncate font-mono text-body-sm text-muted-foreground">
              {address(server)}
            </p>
          </div>
        </div>
      }
    >
      <dl className="mx-2 mb-3 grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm">
        <div>
          <dt className="text-caption text-ash">Status</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
            <StatusDot status={server.status} checking={checking} />
            {statusMeta[server.status].label}
            {server.status === "online" && server.latency_ms != null && (
              <span className="font-normal text-muted-foreground">
                {server.latency_ms} ms
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-ash">OS</dt>
          <dd className="mt-0.5 truncate font-medium">{osLabel(server.os)}</dd>
        </div>
        {server.status_message && (
          <div className="col-span-2">
            <dt className="text-caption text-ash">Last check</dt>
            <dd className="mt-0.5 text-muted-foreground">
              {server.status_message}
            </dd>
          </div>
        )}
        {server.description && (
          <div className="col-span-2">
            <dt className="text-caption text-ash">Notes</dt>
            <dd className="mt-0.5 whitespace-pre-line">{server.description}</dd>
          </div>
        )}
      </dl>
      {groups.map((group) => (
        <ul
          key={group[0].key}
          className="mb-2 divide-y divide-border border-b border-border last:border-b-0"
        >
          {group.map((item) => (
            <li key={item.key}>
              <SheetAction
                icon={item.icon}
                label={item.label}
                description={item.description}
                destructive={item.destructive}
                disabled={item.disabled || (item.key === "check" && checking)}
                onClick={() => run(item)}
              />
            </li>
          ))}
        </ul>
      ))}
    </BottomSheet>
  )
}
