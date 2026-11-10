"use client"

import {
  ArrowUpCircle,
  EyeOff,
  Info,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Trash2,
  Undo2,
} from "lucide-react"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import type { SoftwareInstall } from "@/lib/services"
import { installBusy, useInstallAction } from "../api"
import { useSoftwareCan } from "./permissions"
import { useSoftwareActions } from "./software-actions"

const icon = "size-4"

// Every action on one install, for the row menus, phone sheets and the
// manage layer. `details: false` leaves out "Details" (inside the layer).
export function useInstallMenu(
  i: SoftwareInstall | null,
  { details = true }: { details?: boolean } = {},
): Item[][] {
  const a = useSoftwareActions()
  const can = useSoftwareCan(i?.workspace_id)
  const control = useInstallAction()
  if (!i) return []

  const busy = installBusy(i) || control.isPending
  const docker = i.kind === "docker" && i.status === "installed"
  const running = i.state === "running" || i.state === "partial"
  const target = {
    server_id: i.server_id,
    server_name: i.server_name,
    recipe_id: i.recipe_id,
    name: i.name,
    kind: i.kind,
  }
  const act = (action: "start" | "stop" | "restart") =>
    control.mutate(
      { id: i.id, action },
      {
        onSuccess: () =>
          toast.success(
            action === "stop"
              ? `${i.name} stopped`
              : action === "start"
                ? `${i.name} started`
                : `${i.name} restarted`,
          ),
        onError: (e) => toast.error(e.message),
      },
    )

  const view: Item[] = details
    ? [
        {
          key: "details",
          label: "Details",
          icon: <Info className={icon} />,
          onSelect: () => a.manage(i),
        },
      ]
    : []

  const operate: Item[] = []
  if (docker && can.operate(i)) {
    if (running) {
      operate.push({
        key: "restart",
        label: "Restart",
        icon: <RotateCw className={icon} />,
        disabled: busy,
        onSelect: () => act("restart"),
      })
      operate.push({
        key: "stop",
        label: "Stop",
        icon: <Square className={icon} />,
        disabled: busy,
        onSelect: () => act("stop"),
      })
    } else {
      operate.push({
        key: "start",
        label: "Start",
        icon: <Play className={icon} />,
        disabled: busy,
        onSelect: () => act("start"),
      })
    }
  }

  const change: Item[] = []
  if (i.status !== "missing" && can.updateOn(i)) {
    change.push({
      key: "update",
      label: i.update_available ? "Update" : "Update now",
      icon: <ArrowUpCircle className={icon} />,
      disabled: busy,
      onSelect: () => a.update([target]),
    })
  }
  if (i.can_rollback && can.updateOn(i)) {
    change.push({
      key: "rollback",
      label: "Roll back",
      icon: <Undo2 className={icon} />,
      disabled: busy,
      onSelect: () => a.rollback(target),
    })
  }

  const remove: Item[] = []
  if (i.status !== "missing" && can.uninstallOn(i)) {
    remove.push({
      key: "uninstall",
      label: "Uninstall",
      icon: <Trash2 className={icon} />,
      destructive: true,
      disabled: busy,
      onSelect: () => a.uninstall([target]),
    })
  }
  if (can.forget(i)) {
    remove.push({
      key: "forget",
      label: "Forget",
      icon: <EyeOff className={icon} />,
      disabled: busy,
      onSelect: () => a.forget(i),
    })
  }
  if (i.status === "failed" && can.installOn(i) && i.origin === "morcheh") {
    change.push({
      key: "retry",
      label: "Install again",
      icon: <RotateCcw className={icon} />,
      onSelect: () =>
        a.installId(i.recipe_id, {
          servers: [{ id: i.server_id, name: i.server_name }],
        }),
    })
  }

  return [view, operate, change, remove]
}
