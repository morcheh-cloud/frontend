"use client"

import {
  Activity,
  Copy,
  KeySquare,
  Pause,
  Pencil,
  Play,
  Star,
  StarOff,
  Trash2,
} from "lucide-react"
import type { ReactNode } from "react"

import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { Database } from "@/lib/services"
import { useDatabaseActions } from "./database-actions"
import {
  EngineTile,
  endpointLabel,
  engineName,
  HealthDot,
  problems,
  stateOf,
  statusMeta,
} from "./meta"
import { useDatabaseCan } from "./permissions"

type Item = {
  key: string
  icon: ReactNode
  label: string
  onSelect: () => void
  destructive?: boolean
}

// One list of actions, rendered as a dropdown (desktop) or an action sheet
// (phone). `onDeleted` runs once the remove confirmation has closed.
function useItems(
  database: Database,
  checking: boolean,
  onDeleted?: () => void,
): Item[][] {
  const a = useDatabaseActions()
  const can = useDatabaseCan()
  const operator = can(database, "operator")
  const engineer = can(database, "engineer")
  const owner = can(database, "owner")
  const primary: Item[] = []
  if (operator) {
    primary.push({
      key: "check",
      icon: <Activity />,
      label: checking ? "Checking…" : "Check now",
      onSelect: () => a.check(database),
    })
  }
  if (owner) {
    primary.push({
      key: "edit",
      icon: <Pencil />,
      label: "Edit connection",
      onSelect: () => a.editDatabase(database),
    })
  }
  primary.push({
    key: "copy",
    icon: <Copy />,
    label: "Copy address",
    onSelect: () => a.copyAddress(database),
  })
  if (owner) {
    primary.push({
      key: "credentials",
      icon: <KeySquare />,
      label: "Show credentials…",
      onSelect: () => a.showCredentials(database),
    })
  }
  const groups: Item[][] = [primary]
  const second: Item[] = []
  if (operator) {
    second.push({
      key: "favorite",
      icon: database.favorite ? <StarOff /> : <Star />,
      label: database.favorite ? "Remove from favorites" : "Add to favorites",
      onSelect: () => a.toggleFavorite(database),
    })
  }
  if (engineer) {
    second.push({
      key: "pause",
      icon: database.paused ? <Play /> : <Pause />,
      label: database.paused ? "Resume monitoring" : "Pause monitoring",
      onSelect: () => a.togglePaused(database),
    })
  }
  if (second.length) groups.push(second)
  if (owner) {
    groups.push([
      {
        key: "delete",
        icon: <Trash2 />,
        label: "Remove…",
        destructive: true,
        onSelect: () => a.deleteDatabase(database, onDeleted),
      },
    ])
  }
  return groups
}

export function DatabaseMenuItems({
  database,
  checking,
  onDeleted,
}: {
  database: Database
  checking: boolean
  onDeleted?: () => void
}) {
  const groups = useItems(database, checking, onDeleted)
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

// Phone: the database's state on top, its actions below.
export function DatabaseSheet({
  database,
  checking,
  open,
  onOpenChange,
  onDeleted,
}: {
  database: Database
  checking: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const groups = useItems(database, checking, onDeleted)
  const state = stateOf(database)
  const issues = problems(database)

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
      title={database.name}
      header={
        <div className="flex items-center gap-3 px-6 pt-1 pb-3">
          <EngineTile
            engine={database.engine}
            flavor={database.flavor}
            className="size-11 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-subheading font-medium">
              {database.name}
            </p>
            <p className="truncate font-mono text-body-sm text-muted-foreground">
              {endpointLabel(database)}
            </p>
          </div>
        </div>
      }
    >
      <dl className="mx-2 mb-3 grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm">
        <div>
          <dt className="text-caption text-ash">State</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
            <HealthDot database={database} checking={checking} />
            {state.label}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-ash">Engine</dt>
          <dd className="mt-0.5 truncate font-medium">
            {engineName(database)}
            {database.version && (
              <span className="font-normal text-muted-foreground">
                {" "}
                {database.version}
              </span>
            )}
          </dd>
        </div>
        {database.status !== "online" && database.status !== "unknown" ? (
          <div className="col-span-2">
            <dt className="text-caption text-ash">Last check</dt>
            <dd className="mt-0.5 text-muted-foreground">
              {database.status_message || statusMeta[database.status].hint}
            </dd>
          </div>
        ) : issues.length > 0 ? (
          <div className="col-span-2">
            <dt className="text-caption text-ash">Needs a look</dt>
            <dd className="mt-0.5 text-muted-foreground">
              {issues
                .slice(0, 3)
                .map((c) => c.title)
                .join(" · ")}
            </dd>
          </div>
        ) : null}
        <div className="col-span-2">
          <dt className="text-caption text-ash">Checked</dt>
          <dd className="mt-0.5 text-muted-foreground">
            {database.last_checked_at
              ? timeAgo(database.last_checked_at)
              : "Not yet"}
          </dd>
        </div>
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
