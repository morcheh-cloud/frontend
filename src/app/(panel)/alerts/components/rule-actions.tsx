"use client"

import { BellOff, History, Pencil, Power, Trash2 } from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { AlertRule } from "@/lib/services"
import { useAlertRules, useDeleteAlertRule, useToggleAlertRule } from "../api"
import { MuteDialog, type MuteStart } from "./mutes"
import { RuleEditorLayer, type RuleStart } from "./rule-editor"

// Every layer for alert rules, shared by /alerts and a server's Metrics tab.

type Ctx = {
  // Engineer on the workspace: add, edit, turn on/off, delete.
  can: boolean
  create: (start?: RuleStart) => void
  edit: (rule: AlertRule) => void
  toggle: (rule: AlertRule) => void
  remove: (rule: AlertRule) => void
  // Optional: show a rule's activity (only where there is an activity view).
  activity?: (rule: AlertRule) => void
  // Operator: mute alerts for a while (maintenance).
  canMute: boolean
  mute: (start?: MuteStart) => void
}

const RuleContext = createContext<Ctx | null>(null)

export function useRuleActions() {
  const ctx = useContext(RuleContext)
  if (!ctx) throw new Error("useRuleActions needs a RuleActionsProvider")
  return ctx
}

export function RuleActionsProvider({
  phone,
  activity,
  canMute,
  children,
}: {
  phone: boolean
  activity?: (rule: AlertRule) => void
  // A server's or a database's page passes its own level (default: Operator
  // on the workspace).
  canMute?: boolean
  children: ReactNode
}) {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const level = access.workspaceLevel(workspace?.id ?? "")
  const can = atLeast(level, "engineer")
  const rules = useAlertRules()
  const toggleRule = useToggleAlertRule()
  const deleteRule = useDeleteAlertRule()

  const [editorOpen, setEditorOpen] = useOpen("alert-rule-editor")
  const [deleteOpen, setDeleteOpen] = useOpen("alert-rule-delete")
  const [muteOpen, setMuteOpen] = useOpen("alert-mute")
  const [muteStart, setMuteStart] = useState<MuteStart>()
  const [picked, setPicked] = useState<AlertRule>()
  const [start, setStart] = useState<RuleStart>()
  // The layers read the fresh copy (the list polls).
  const current =
    (picked && rules.data?.find((r) => r.id === picked.id)) ?? picked

  const ctx: Ctx = {
    can,
    activity,
    canMute: canMute ?? atLeast(level, "operator"),
    mute: (s) => {
      setMuteStart(s)
      setMuteOpen(true)
    },
    create: (s) => {
      setPicked(undefined)
      setStart(s)
      setEditorOpen(true)
    },
    edit: (r) => {
      setPicked(r)
      setStart(undefined)
      setEditorOpen(true)
    },
    toggle: (r) =>
      toggleRule.mutate(
        { id: r.id, enabled: !r.enabled },
        {
          onSuccess: (x) =>
            toast.success(`${x.name} turned ${x.enabled ? "on" : "off"}`),
          onError: (e) => toast.error(e.message),
        },
      ),
    remove: (r) => {
      setPicked(r)
      setDeleteOpen(true)
    },
  }

  return (
    <RuleContext.Provider value={ctx}>
      {children}
      <RuleEditorLayer
        open={editorOpen}
        onOpenChange={setEditorOpen}
        rule={picked ? current : undefined}
        start={start}
        phone={phone}
      />
      <MuteDialog
        open={muteOpen}
        onOpenChange={setMuteOpen}
        start={muteStart}
        phone={phone}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${current?.name ?? "rule"}?`}
        description="It stops watching at once and sends nothing more, not even a back-to-normal message. Its past alerts stay in Activity."
        confirmLabel="Delete"
        destructive
        pending={deleteRule.isPending}
        onConfirm={() =>
          current &&
          deleteRule.mutate(current, {
            onSuccess: () => {
              toast.success(`${current.name} deleted`)
              setDeleteOpen(false)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </RuleContext.Provider>
  )
}

// A rule's actions, for the ⋯ menu and the phone sheet.
export function useRuleMenu(r: AlertRule): Item[][] {
  const a = useRuleActions()
  return [
    a.can
      ? [
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil />,
            onSelect: () => a.edit(r),
          },
        ]
      : [],
    [
      ...(a.activity
        ? [
            {
              key: "activity",
              label: "Alerts it sent",
              icon: <History />,
              onSelect: () => a.activity?.(r),
            },
          ]
        : []),
      ...(a.canMute
        ? [
            {
              key: "mute",
              label: "Mute…",
              icon: <BellOff />,
              onSelect: () => a.mute({ rule: r }),
            },
          ]
        : []),
    ],
    a.can
      ? [
          {
            key: "enabled",
            label: r.enabled ? "Turn off" : "Turn on",
            icon: <Power />,
            onSelect: () => a.toggle(r),
          },
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.remove(r),
          },
        ]
      : [],
  ]
}
