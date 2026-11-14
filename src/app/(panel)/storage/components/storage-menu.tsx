"use client"

import {
  Activity,
  ArrowRightLeft,
  Copy,
  KeyRound,
  KeySquare,
  Pencil,
  Star,
  StarOff,
  Trash2,
  Truck,
  UsersRound,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { StatusDot, statusMeta } from "@/app/(panel)/servers/components/meta"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { Storage } from "@/lib/services"
import { newSyncHref } from "../syncs/components/meta"
import { useSyncCan } from "../syncs/components/permissions"
import { endpointLabel, ProtocolTile, providerLabel } from "./meta"
import { useStorageCan } from "./permissions"
import { useStorageActions } from "./storage-actions"

export type StorageItem = {
  key: string
  icon: ReactNode
  label: string
  onSelect: () => void
  destructive?: boolean
}

// One list of actions, rendered as a dropdown (desktop) or an action sheet
// (phone). `onDeleted` runs once the remove confirmation has closed.
function useItems(
  storage: Storage,
  checking: boolean,
  onDeleted?: () => void,
): StorageItem[][] {
  const a = useStorageActions()
  const can = useStorageCan()
  const operator = can(storage, "operator")
  const owner = can(storage, "owner")
  const router = useRouter()
  const syncs = useSyncCan(storage.workspace_id)
  const primary: StorageItem[] = [
    ...(operator
      ? [
          {
            key: "check",
            icon: <Activity />,
            label: checking ? "Checking…" : "Check connection",
            onSelect: () => a.check(storage),
          },
        ]
      : []),
    ...(owner
      ? [
          {
            key: "edit",
            icon: <Pencil />,
            label: "Edit",
            onSelect: () => a.editStorage(storage),
          },
        ]
      : []),
    {
      key: "copy",
      icon: <Copy />,
      label: "Copy address",
      onSelect: () => a.copyEndpoint(storage),
    },
    ...(owner
      ? [
          {
            key: "credentials",
            icon: <KeySquare />,
            label: "Show credentials…",
            onSelect: () => a.showCredentials(storage),
          },
          {
            key: "access",
            icon: <UsersRound />,
            label: "Manage access…",
            onSelect: () => a.manageAccess(storage),
          },
        ]
      : []),
  ]
  if (owner && storage.status === "host_key_mismatch") {
    primary.push({
      key: "trust",
      icon: <KeyRound />,
      label: "Trust new host key…",
      onSelect: () => a.trustHostKey(storage),
    })
  }
  const groups: StorageItem[][] = [primary]
  if (syncs.edit && operator) {
    groups.push([
      {
        key: "sync",
        icon: <ArrowRightLeft />,
        label: "Sync to another storage…",
        onSelect: () =>
          router.push(newSyncHref({ kind: "sync", source: storage.id })),
      },
      {
        key: "migrate",
        icon: <Truck />,
        label: "Migrate to another storage…",
        onSelect: () =>
          router.push(newSyncHref({ kind: "migrate", source: storage.id })),
      },
    ])
  }
  if (operator) {
    groups.push([
      {
        key: "favorite",
        icon: storage.favorite ? <StarOff /> : <Star />,
        label: storage.favorite ? "Remove from favorites" : "Add to favorites",
        onSelect: () => a.toggleFavorite(storage),
      },
    ])
  }
  if (owner) {
    groups.push([
      {
        key: "delete",
        icon: <Trash2 />,
        label: "Remove…",
        destructive: true,
        onSelect: () => a.deleteStorage(storage, onDeleted),
      },
    ])
  }
  return groups
}

export function StorageMenuItems({
  storage,
  checking,
  onDeleted,
}: {
  storage: Storage
  checking: boolean
  onDeleted?: () => void
}) {
  const groups = useItems(storage, checking, onDeleted)
  return groups.map((group, i) => (
    <div key={group[0].key}>
      {i > 0 && <DropdownMenuSeparator />}
      {group.map((item) => (
        <DropdownMenuItem
          key={item.key}
          variant={item.destructive ? "destructive" : "default"}
          disabled={item.key === "check" && checking}
          onClick={item.onSelect}
        >
          {item.icon}
          {item.label}
        </DropdownMenuItem>
      ))}
    </div>
  ))
}

// Phone: the storage's details on top, its actions below.
export function StorageSheet({
  storage,
  checking,
  open,
  onOpenChange,
  onDeleted,
  extra,
}: {
  storage: Storage
  checking: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
  /** A first group of page-specific actions. */
  extra?: StorageItem[]
}) {
  const items = useItems(storage, checking, onDeleted)
  const groups = extra?.length ? [extra, ...items] : items

  // Close first, then act once the sheet's history entry is gone, so a layer
  // the action opens gets its own Back entry.
  function run(item: StorageItem) {
    window.addEventListener("popstate", () => item.onSelect(), { once: true })
    onOpenChange(false)
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={storage.name}
      header={
        <div className="flex items-center gap-3 px-6 pt-1 pb-3">
          <ProtocolTile protocol={storage.protocol} className="size-11" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-subheading font-medium">
              {storage.name}
            </p>
            <p className="truncate font-mono text-body-sm text-muted-foreground">
              {endpointLabel(storage)}
            </p>
          </div>
        </div>
      }
    >
      <dl className="mx-2 mb-3 grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm">
        <div>
          <dt className="text-caption text-ash">Status</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
            <StatusDot status={storage.status} checking={checking} />
            {statusMeta[storage.status].label}
            {storage.status === "online" && storage.latency_ms != null && (
              <span className="font-normal text-muted-foreground">
                {storage.latency_ms} ms
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-ash">Type</dt>
          <dd className="mt-0.5 truncate font-medium">
            {providerLabel(storage)}
            {storage.read_only && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · Read-only
              </span>
            )}
          </dd>
        </div>
        {(storage.status_message || storage.detail) && (
          <div className="col-span-2">
            <dt className="text-caption text-ash">Last check</dt>
            <dd className="mt-0.5 text-muted-foreground">
              {storage.status === "online"
                ? storage.detail
                : storage.status_message}
            </dd>
          </div>
        )}
        {storage.description && (
          <div className="col-span-2">
            <dt className="text-caption text-ash">Notes</dt>
            <dd className="mt-0.5 whitespace-pre-line">
              {storage.description}
            </dd>
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
                destructive={item.destructive}
                disabled={item.key === "check" && checking}
                onClick={() => run(item)}
              />
            </li>
          ))}
        </ul>
      ))}
    </BottomSheet>
  )
}
