"use client"

import { ArrowUpCircle, EyeOff, Info, RotateCcw, Trash2 } from "lucide-react"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import type { SoftwareInstall } from "@/lib/services"
import { installBusy } from "../api"
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
  if (!i) return []

  const busy = installBusy(i)
  const target = {
    server_id: i.server_id,
    server_name: i.server_name,
    recipe_id: i.recipe_id,
    name: i.name,
    kind: i.kind,
  }
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

  return [view, change, remove]
}
