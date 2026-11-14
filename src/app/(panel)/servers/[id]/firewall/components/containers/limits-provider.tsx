"use client"

import { useQueryClient } from "@tanstack/react-query"
import { createContext, type ReactNode, use, useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type {
  ContainerAccess,
  ContainerLimit,
  ContainerLimitBody,
} from "@/lib/services"
import { useServerPage } from "../../../components/server-page"
import {
  firewallKeys,
  useContainerAccess,
  useSetContainerAccess,
} from "../../api"
import { LimitDialog, type LimitTarget } from "./limit-dialog"
import { limitBody, limitPort, overlaps } from "./meta"

type Actions = {
  // Engineer: whether limits can be changed at all (the server may still say
  // it can't, in `supported`).
  can: boolean
  busy: boolean
  edit: (target?: LimitTarget) => void
  remove: (limit: ContainerLimit) => void
  // Loads the saved list onto the server again.
  reload: () => void
}

const Context = createContext<Actions | null>(null)

export function useContainerLimits() {
  const c = use(Context)
  if (!c) throw new Error("useContainerLimits needs ContainerLimitsProvider")
  return c
}

// Every layer for container port limits, shared by the Firewall page's
// Containers tab and the Ports page's details.
export function ContainerLimitsProvider({ children }: { children: ReactNode }) {
  const { server, can: canLevel } = useServerPage()
  const id = server.id
  const qc = useQueryClient()
  const set = useSetContainerAccess(id)
  const can = canLevel("engineer")

  const [editOpen, setEditOpen] = useOpen("fw-ct-limit")
  const [target, setTarget] = useState<LimitTarget & { nonce: number }>({
    nonce: 0,
  })
  const [removeOpen, setRemoveOpen] = useOpen("fw-ct-limit-remove")
  const [removing, setRemoving] = useState<ContainerLimit>()

  const current = () =>
    qc.getQueryData<ContainerAccess>(firewallKeys.containers(id))

  // Saves a whole list; the toast's Undo puts back what was there.
  async function save(list: ContainerLimitBody[], done: string) {
    const before = current()
    if (!before) throw new Error("Still reading the server. Try again.")
    const after = await set.mutateAsync({
      limits: list,
      revision: before.revision,
    })
    const previous = before.limits.map(limitBody)
    toast.success(done, {
      description: after.loaded
        ? undefined
        : "Saved, but the server's rules don't match yet. See the Containers tab.",
      action: {
        label: "Undo",
        onClick: () => {
          const now = current()
          if (!now) return
          set.mutate(
            { limits: previous, revision: now.revision },
            {
              onSuccess: () => toast.success("Put back as it was"),
              onError: (err) => toast.error(err.message),
            },
          )
        },
      },
    })
  }

  const actions: Actions = {
    can,
    busy: set.isPending,
    edit: (t = {}) => {
      setTarget({ ...t, nonce: target.nonce + 1 })
      setEditOpen(true)
    },
    remove: (l) => {
      setRemoving(l)
      setRemoveOpen(true)
    },
    reload: () => {
      const a = current()
      if (!a) return
      set.mutate(
        { limits: a.limits.map(limitBody), revision: a.revision },
        {
          onSuccess: (o) =>
            o.loaded
              ? toast.success("Limits loaded on the server")
              : toast.error("The server's rules still don't match", {
                  description: o.problem,
                }),
          onError: (err) => toast.error(err.message),
        },
      )
    },
  }

  return (
    <Context value={actions}>
      {children}
      {editOpen && (
        <EditLayer
          key={target.nonce}
          serverId={id}
          open={editOpen}
          onOpenChange={setEditOpen}
          target={target}
          onSave={save}
        />
      )}
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={
          removing
            ? `Remove the limit on ${limitPort(removing)}?`
            : "Remove the limit?"
        }
        description="Anyone who can reach this server can connect to that port again."
        confirmLabel="Remove limit"
        pending={set.isPending}
        onConfirm={async () => {
          const a = current()
          if (!a || !removing) return
          try {
            await save(
              a.limits.filter((l) => l.id !== removing.id).map(limitBody),
              `Limit on ${limitPort(removing)} removed`,
            )
            setRemoveOpen(false)
          } catch (err) {
            toast.error((err as Error).message)
          }
        }}
      />
    </Context>
  )
}

// Reads the server's list itself, so it works from any page.
function EditLayer({
  serverId,
  open,
  onOpenChange,
  target,
  onSave,
}: {
  serverId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  target: LimitTarget
  onSave: (list: ContainerLimitBody[], done: string) => Promise<void>
}) {
  const q = useContainerAccess(serverId)
  if (!q.data) return null
  // A limit picked from an older read: use the one on the server now.
  const old = target.limit
  const limit = old
    ? (q.data.limits.find((l) => l.id === old.id) ??
      q.data.limits.find((l) => overlaps(l, old)))
    : undefined
  return (
    <LimitDialog
      open={open}
      onOpenChange={onOpenChange}
      access={q.data}
      target={{ ...target, limit }}
      onSave={onSave}
    />
  )
}
