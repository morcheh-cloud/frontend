"use client"

import {
  ExternalLink,
  FolderInput,
  Pencil,
  Siren,
  Trash2,
  UsersRound,
} from "lucide-react"

import type { App } from "@/lib/services"
import { type Item, ItemMenu } from "../../servers/[id]/components/parts"
import { useAppActions } from "./app-actions"
import { safeHref } from "./meta"
import { useAppCan } from "./permissions"

// One list of actions for a service, shown as the ⋯ menu on desktop and as
// sheet rows on phones. Only what this person may do is listed.
export function useAppMenu(app: App): Item[][] {
  const a = useAppActions()
  const can = useAppCan(app)
  const href = safeHref(app.address)

  const open: Item[] = href
    ? [
        {
          key: "open",
          label: "Open",
          icon: <ExternalLink />,
          // Synchronous inside the click, so no pop-up blocker steps in.
          onSelect: () => window.open(href, "_blank", "noopener,noreferrer"),
        },
      ]
    : []
  const change: Item[] = can.edit
    ? [
        {
          key: "edit",
          label: "Edit",
          icon: <Pencil />,
          onSelect: () => a.edit(app),
        },
        {
          key: "move",
          label: "Move to category",
          icon: <FolderInput />,
          onSelect: () => a.moveTo(app),
        },
        {
          key: "critical",
          label: app.critical ? "Unmark as critical" : "Mark as critical",
          icon: <Siren />,
          onSelect: () => a.toggleCritical(app),
        },
      ]
    : []
  const manage: Item[] = can.manage
    ? [
        {
          key: "access",
          label: "Access",
          icon: <UsersRound />,
          onSelect: () => a.access(app),
        },
      ]
    : []
  const remove: Item[] = can.remove
    ? [
        {
          key: "remove",
          label: "Remove",
          icon: <Trash2 />,
          destructive: true,
          onSelect: () => a.remove(app),
        },
      ]
    : []
  return [open, change, manage, remove]
}

export function AppMenu({ app }: { app: App }) {
  return <ItemMenu groups={useAppMenu(app)} label={`Actions for ${app.name}`} />
}
