"use client"

import {
  ArrowUpRight,
  Pause,
  Pencil,
  Play,
  ScanSearch,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { atLeast } from "@/components/auth/level"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { DockerAutoUpdate } from "@/lib/services"
import type { Item } from "../../servers/[id]/components/parts"
import {
  useDeleteAutoUpdate,
  useRunAutoUpdate,
  useSetAutoUpdateEnabled,
} from "../api"
import { autoUpdateHref } from "./auto-update-meta"
import { useDockerWorkspaceCan } from "./permissions"

// Everything a person can do with an auto-update policy, shared by the list
// and the policy's page: run (or only check), pause, edit, delete. The
// backend's rule: Viewer reads, Operator runs, Engineer changes.
export function usePolicyActions(
  ws: string,
  opts: { onDeleted?: () => void } = {},
) {
  const can = useDockerWorkspaceCan(ws)
  const operate = atLeast(can.level, "operator")
  const router = useRouter()
  const run = useRunAutoUpdate()
  const toggle = useSetAutoUpdateEnabled()
  const del = useDeleteAutoUpdate()
  const [removing, setRemoving] = useState<DockerAutoUpdate | null>(null)
  const [confirm, setConfirm] = useOpen("auto-update-delete")

  const start = (
    p: DockerAutoUpdate,
    o: { checkOnly?: boolean; server?: string } = {},
  ) =>
    run.mutate(
      { ws, id: p.id, ...o },
      { onError: (e) => toast.error(e.message) },
    )

  const setEnabled = (p: DockerAutoUpdate, enabled: boolean) =>
    toggle.mutate(
      { ws, id: p.id, enabled },
      {
        onSuccess: () =>
          toast.success(
            enabled
              ? `${p.name} is on`
              : `${p.name} is paused: it won't run until you turn it on`,
          ),
        onError: (e) => toast.error(e.message),
      },
    )

  const remove = (p: DockerAutoUpdate) => {
    setRemoving(p)
    setConfirm(true)
  }

  const menu = (
    p: DockerAutoUpdate,
    o: { onPage?: boolean } = {},
  ): Item[][] => {
    const groups: Item[][] = []
    if (!o.onPage) {
      groups.push([
        {
          key: "open",
          label: "Open",
          icon: <ArrowUpRight />,
          onSelect: () => router.push(autoUpdateHref(p.id)),
        },
      ])
    }
    if (operate) {
      groups.push([
        {
          key: "run",
          label: p.mode === "monitor" ? "Check now" : "Run now",
          icon: <Play />,
          disabled: p.running,
          onSelect: () => start(p),
        },
        ...(p.mode === "update"
          ? [
              {
                key: "check",
                label: "Only look for new images",
                icon: <ScanSearch />,
                disabled: p.running,
                onSelect: () => start(p, { checkOnly: true }),
              },
            ]
          : []),
      ])
    }
    if (can.edit) {
      groups.push([
        ...(o.onPage
          ? []
          : [
              {
                key: "edit",
                label: "Edit settings",
                icon: <Pencil />,
                onSelect: () => router.push(autoUpdateHref(p.id, "settings")),
              },
            ]),
        {
          key: "toggle",
          label: p.enabled ? "Pause" : "Turn on",
          icon: p.enabled ? <Pause /> : <Play />,
          onSelect: () => setEnabled(p, !p.enabled),
        },
      ])
      groups.push([
        {
          key: "delete",
          label: "Delete",
          icon: <Trash2 />,
          destructive: true,
          onSelect: () => remove(p),
        },
      ])
    }
    return groups
  }

  const dialogs = (
    <ConfirmDialog
      open={confirm}
      onOpenChange={setConfirm}
      title={`Delete ${removing?.name ?? "the policy"}?`}
      description="Its containers stay as they are, on the image they have now; nothing updates them any more. Its activity is deleted too, and its webhook stops working."
      confirmLabel="Delete"
      pending={del.isPending}
      onConfirm={() =>
        removing &&
        del.mutate(
          { ws, id: removing.id },
          {
            onSuccess: () => {
              toast.success(`${removing.name} deleted`)
              setConfirm(false)
              opts.onDeleted?.()
            },
            onError: (e) => toast.error(e.message),
          },
        )
      }
    />
  )

  return {
    can: { ...can, operate },
    start,
    starting: run.isPending,
    setEnabled,
    toggling: toggle.isPending,
    remove,
    menu,
    dialogs,
  }
}
