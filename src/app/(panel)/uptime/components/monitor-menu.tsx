"use client"

import {
  Copy,
  Link2,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import type { UptimeMonitor } from "@/lib/services"
import { newMonitorHref, pushUrl } from "./meta"
import { useUptimeCan } from "./permissions"
import { useUptimeActions } from "./uptime-actions"

export const monitorHref = (id: string) => `/uptime/${id}`

// A monitor's actions, for the list's ⋯ menu, its phone sheet and the
// monitor page's menu.
export function useMonitorMenu(
  m: UptimeMonitor,
  { onPage = false, after }: { onPage?: boolean; after?: () => void } = {},
): Item[][] {
  const can = useUptimeCan(m.workspace_id)
  const a = useUptimeActions()
  const router = useRouter()
  const isPush = m.kind === "push"

  return [
    can.operate
      ? [
          ...(isPush
            ? []
            : [
                {
                  key: "check",
                  label: a.checking === m.id ? "Checking…" : "Check now",
                  icon: <RefreshCw />,
                  disabled: a.checking === m.id || m.paused,
                  onSelect: () => a.check(m),
                },
              ]),
          {
            key: "pause",
            label: m.paused ? "Resume" : "Pause",
            icon: m.paused ? <Play /> : <Pause />,
            onSelect: () => a.setPaused(m, !m.paused),
          },
        ]
      : [],
    [
      ...(onPage
        ? []
        : [
            {
              key: "open",
              label: "Open",
              icon: <SquareArrowOutUpRight />,
              onSelect: () => router.push(monitorHref(m.id)),
            },
          ]),
      ...(isPush && m.push_token
        ? [
            {
              key: "copy-push",
              label: "Copy push address",
              icon: <Link2 />,
              onSelect: () => {
                navigator.clipboard
                  ?.writeText(pushUrl(m.push_token ?? ""))
                  .then(() => toast.success("Push address copied"))
              },
            },
          ]
        : []),
      ...(can.edit
        ? [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => router.push(`/uptime/${m.id}/edit`),
            },
            {
              key: "duplicate",
              label: "Duplicate",
              icon: <Copy />,
              onSelect: () =>
                router.push(newMonitorHref("/uptime/new", { from: m.id })),
            },
          ]
        : []),
    ],
    can.remove
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.remove(m, after),
          },
        ]
      : [],
  ]
}
