"use client"

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import type {
  FilterRule,
  FirewallOverview,
  FirewallRuleBody,
  Forward,
} from "@/lib/services"
import { useServerPage } from "../../components/server-page"
import { useFirewallChange } from "../api"
import { ApplyLayer } from "./apply-layer"
import { BlockDialog } from "./block-dialog"
import { EnableDialog } from "./enable-dialog"
import { ForwardDialog } from "./forward-dialog"
import { HistoryLayer } from "./history-layer"
import { forwardFrom } from "./meta"
import { RawLayer } from "./raw-layer"
import { RuleEditor } from "./rule-editor"
import { SettingsDialog } from "./settings-dialog"

type Actions = {
  overview: FirewallOverview
  // This person can change it, and this firewall can be changed from here.
  manage: boolean
  // Something's running, or a change is waiting to be kept.
  busy: boolean
  locked: boolean
  // Runs a write. Resolves false when it was refused; toasts unless told not.
  apply: (
    run: () => Promise<FirewallOverview>,
    done?: string,
    onError?: (err: Error) => void,
  ) => Promise<boolean>
  addRule: (prefill?: Partial<FirewallRuleBody>) => void
  editRule: (rule: FilterRule) => void
  blockAddress: (address?: string) => void
  deleteRules: (rules: FilterRule[], then?: () => void) => void
  // before = the rule to go right above; empty = after all the others
  moveRule: (rule: FilterRule, before: string) => Promise<boolean>
  addForward: () => void
  editForward: (forward: Forward) => void
  deleteForward: (forward: Forward) => void
  history: () => void
  // Without rules, it starts with all of them ticked.
  applyTo: (rules?: FilterRule[]) => void
  turnOn: () => void
  turnOff: () => void
  reset: () => void
  settings: () => void
  raw: () => void
  keep: () => void
  undo: () => void
}

const Context = createContext<Actions | null>(null)

export function useFirewallActions() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error("useFirewallActions outside its provider")
  return ctx
}

type Editing = { rule?: FilterRule; prefill?: Partial<FirewallRuleBody> }

export function FirewallActionsProvider({
  overview,
  children,
}: {
  overview: FirewallOverview
  children: ReactNode
}) {
  const { server, can } = useServerPage()
  const id = server.id
  const change = useFirewallChange(id)
  const { mutateAsync } = change
  const [nonce, setNonce] = useState(0)
  const bump = useCallback(() => setNonce((n) => n + 1), [])

  const [editorOpen, setEditorOpen] = useOpen("fw-rule")
  const [editing, setEditing] = useState<Editing>({})
  const [blockOpen, setBlockOpen] = useOpen("fw-block")
  const [address, setAddress] = useState("")
  const [enableOpen, setEnableOpen] = useOpen("fw-enable")
  const [disableOpen, setDisableOpen] = useOpen("fw-disable")
  const [resetOpen, setResetOpen] = useOpen("fw-reset")
  const [settingsOpen, setSettingsOpen] = useOpen("fw-settings")
  const [rawOpen, setRawOpen] = useOpen("fw-raw")
  const [deleteOpen, setDeleteOpen] = useOpen("fw-delete")
  const [deleting, setDeleting] = useState<{
    rules: FilterRule[]
    then?: () => void
  }>({ rules: [] })
  const [forwardOpen, setForwardOpen] = useOpen("fw-forward")
  const [forward, setForward] = useState<Forward>()
  const [deleteForwardOpen, setDeleteForwardOpen] = useOpen("fw-forward-delete")
  const [historyOpen, setHistoryOpen] = useOpen("fw-history")
  const [applyOpen, setApplyOpen] = useOpen("fw-apply")
  const [applying, setApplying] = useState<FilterRule[]>()

  const apply = useCallback<Actions["apply"]>(
    async (run, done, onError) => {
      try {
        const o = await mutateAsync(run)
        if (done && !o.pending) toast.success(done)
        return true
      } catch (err) {
        if (onError) onError(err as Error)
        else toast.error((err as Error).message)
        return false
      }
    },
    [mutateAsync],
  )

  const value = useMemo<Actions>(
    () => ({
      overview,
      manage:
        can("engineer") &&
        overview.capabilities.manage &&
        overview.access !== "user",
      busy: change.isPending,
      locked: Boolean(overview.pending),
      apply,
      addRule: (prefill) => {
        setEditing({ prefill })
        bump()
        setEditorOpen(true)
      },
      editRule: (rule) => {
        setEditing({ rule })
        bump()
        setEditorOpen(true)
      },
      blockAddress: (a = "") => {
        setAddress(a)
        bump()
        setBlockOpen(true)
      },
      deleteRules: (rules, then) => {
        setDeleting({ rules, then })
        setDeleteOpen(true)
      },
      moveRule: (rule, before) =>
        apply(() => api.firewall.moveFirewallRule(id, rule.id, { before })),
      addForward: () => {
        setForward(undefined)
        bump()
        setForwardOpen(true)
      },
      editForward: (f) => {
        setForward(f)
        bump()
        setForwardOpen(true)
      },
      deleteForward: (f) => {
        setForward(f)
        setDeleteForwardOpen(true)
      },
      history: () => setHistoryOpen(true),
      applyTo: (rules) => {
        setApplying(rules)
        bump()
        setApplyOpen(true)
      },
      turnOn: () => {
        bump()
        setEnableOpen(true)
      },
      turnOff: () => setDisableOpen(true),
      reset: () => setResetOpen(true),
      settings: () => {
        bump()
        setSettingsOpen(true)
      },
      raw: () => setRawOpen(true),
      keep: () => {
        void apply(() => api.firewall.keepFirewallChange(id), "Change kept")
      },
      undo: () => {
        void apply(() => api.firewall.undoFirewallChange(id), "Change undone")
      },
    }),
    [
      overview,
      can,
      change.isPending,
      apply,
      bump,
      id,
      setEditorOpen,
      setBlockOpen,
      setDeleteOpen,
      setForwardOpen,
      setDeleteForwardOpen,
      setHistoryOpen,
      setApplyOpen,
      setEnableOpen,
      setDisableOpen,
      setResetOpen,
      setSettingsOpen,
      setRawOpen,
    ],
  )

  const n = deleting.rules.length
  const ssh = deleting.rules.some((r) => r.protects_ssh)

  return (
    <Context value={value}>
      {children}
      <RuleEditor
        key={`rule-${nonce}`}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        rule={editing.rule}
        prefill={editing.prefill}
      />
      <BlockDialog
        key={`block-${nonce}`}
        open={blockOpen}
        onOpenChange={setBlockOpen}
        address={address}
      />
      <EnableDialog
        key={`enable-${nonce}`}
        open={enableOpen}
        onOpenChange={setEnableOpen}
      />
      <SettingsDialog
        key={`settings-${nonce}`}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <RawLayer open={rawOpen} onOpenChange={setRawOpen} />
      <ForwardDialog
        key={`forward-${nonce}`}
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        forward={forward}
      />
      <HistoryLayer open={historyOpen} onOpenChange={setHistoryOpen} />
      <ApplyLayer
        key={`apply-${nonce}`}
        open={applyOpen}
        onOpenChange={setApplyOpen}
        rules={applying}
      />
      <ConfirmDialog
        open={deleteForwardOpen}
        onOpenChange={setDeleteForwardOpen}
        title="Delete this forward?"
        description={
          forward
            ? `Port ${forwardFrom(forward)} stops being forwarded. What Morche allowed for it goes too.`
            : undefined
        }
        confirmLabel="Delete"
        pending={change.isPending}
        onConfirm={async () => {
          if (forward) {
            await apply(
              () =>
                api.firewall.deleteFirewallForwards(id, { ids: [forward.id] }),
              "Forward deleted",
            )
          }
          setDeleteForwardOpen(false)
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={n === 1 ? "Delete this rule?" : `Delete ${n} rules?`}
        description={
          ssh
            ? "One of these lets SSH in. If it's the last one, Morche tests the connection and undoes the change if it's cut off."
            : "Traffic these rules allowed or stopped goes back to the next rule or the default."
        }
        confirmLabel="Delete"
        pending={change.isPending}
        onConfirm={async () => {
          const ids = deleting.rules.map((r) => r.id)
          const ok = await apply(
            () => api.firewall.deleteFirewallRules(id, { ids }),
            n === 1 ? "Rule deleted" : `${n} rules deleted`,
          )
          setDeleteOpen(false)
          if (ok) deleting.then?.()
        }}
      />
      <ConfirmDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title="Turn the firewall off?"
        description="Every port this server listens on becomes reachable, including databases and admin tools. Rules are kept for when you turn it back on."
        confirmLabel="Turn off"
        pending={change.isPending}
        onConfirm={async () => {
          await apply(
            () => api.firewall.disableFirewall(id),
            "Firewall turned off",
          )
          setDisableOpen(false)
        }}
      />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Remove every rule?"
        description="Only SSH stays allowed. Everything else goes back to the default. If the firewall is on, you'll have time to undo this."
        confirmLabel="Remove all"
        pending={change.isPending}
        onConfirm={async () => {
          await apply(() => api.firewall.resetFirewall(id), "Rules removed")
          setResetOpen(false)
        }}
      />
    </Context>
  )
}
