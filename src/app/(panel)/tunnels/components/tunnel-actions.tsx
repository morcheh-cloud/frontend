"use client"

import { Copy, Pencil, Plug, ScrollText, Trash2, Unplug } from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { Tunnel } from "@/lib/services"
import { useConnectTunnel, useDeleteTunnel } from "../api"
import { editTunnelHref, tunnelHref } from "./meta"
import { useTunnelCan } from "./permissions"

type Actions = {
  connect: (t: Tunnel) => void
  disconnect: (t: Tunnel) => void
  remove: (t: Tunnel) => void
  // Ids being connected or disconnected right now.
  busy: Set<string>
}

const ActionsContext = createContext<Actions | null>(null)

export function useTunnelActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useTunnelActions outside TunnelActionsProvider")
  return ctx
}

export function TunnelActionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const toggle = useConnectTunnel()
  const del = useDeleteTunnel()
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [removing, setRemoving] = useState<Tunnel | null>(null)
  const [removeOpen, setRemoveOpen] = useOpen("tunnel-remove")

  const run = (t: Tunnel, on: boolean) => {
    setBusy((b) => new Set(b).add(t.id))
    toggle.mutate(
      { id: t.id, on },
      {
        onSuccess: (r) => {
          if (!on) toast.success(`${r.name} disconnected`)
          else if (r.status === "connected")
            toast.success(`${r.name} connected`, {
              description: r.address ? `Address ${r.address}` : undefined,
            })
          else
            toast.error(`${r.name} didn't connect`, {
              description: r.status_message || undefined,
            })
        },
        onError: (e) => toast.error(e.message),
        onSettled: () =>
          setBusy((b) => {
            const n = new Set(b)
            n.delete(t.id)
            return n
          }),
      },
    )
  }

  const actions: Actions = {
    connect: (t) => run(t, true),
    disconnect: (t) => run(t, false),
    remove: (t) => {
      setRemoving(t)
      setRemoveOpen(true)
    },
    busy,
  }

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove ${removing?.name ?? "this tunnel"}?`}
        description={
          removing && removing.server_count > 0
            ? `${removing.server_count} ${removing.server_count === 1 ? "server goes" : "servers go"} through it. Change how they're reached first, then remove it.`
            : "Its settings and secrets are deleted. Servers aren't touched."
        }
        confirmLabel="Remove"
        pending={del.isPending}
        onConfirm={() => {
          if (!removing) return
          del.mutate(removing.id, {
            onSuccess: () => {
              toast.success(`${removing.name} removed`)
              setRemoveOpen(false)
              if (window.location.pathname.startsWith(tunnelHref(removing.id)))
                router.replace("/tunnels")
            },
            onError: (e) => toast.error(e.message),
          })
        }}
      />
    </ActionsContext.Provider>
  )
}

// The ⋯ menu of a tunnel (cards, rows, its page).
export function useTunnelMenu() {
  const router = useRouter()
  const a = useTunnelActions()
  const can = useTunnelCan()
  return (t: Tunnel, opts: { onPage?: boolean } = {}): Item[][] => {
    const open = t.status === "connected" || t.status === "connecting"
    const operate = can(t, "operator")
    const own = can(t, "owner")
    return [
      operate
        ? [
            open
              ? {
                  key: "disconnect",
                  label: "Disconnect",
                  icon: <Unplug />,
                  disabled: a.busy.has(t.id),
                  onSelect: () => a.disconnect(t),
                }
              : {
                  key: "connect",
                  label: "Connect now",
                  icon: <Plug />,
                  disabled: a.busy.has(t.id),
                  onSelect: () => a.connect(t),
                },
            ...(opts.onPage
              ? []
              : [
                  {
                    key: "log",
                    label: "Log",
                    icon: <ScrollText />,
                    onSelect: () => router.push(`${tunnelHref(t.id)}#log`),
                  },
                ]),
          ]
        : [],
      [
        ...(own
          ? [
              {
                key: "edit",
                label: "Edit",
                icon: <Pencil />,
                onSelect: () => router.push(editTunnelHref(t.id)),
              },
            ]
          : []),
        ...(t.address && open
          ? [
              {
                key: "copy",
                label: "Copy its address",
                icon: <Copy />,
                onSelect: () =>
                  navigator.clipboard
                    .writeText(t.address)
                    .then(() => toast.success("Address copied")),
              },
            ]
          : []),
      ],
      own
        ? [
            {
              key: "remove",
              label: "Remove",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => a.remove(t),
            },
          ]
        : [],
    ]
  }
}
