"use client"

import {
  FlaskConical,
  Pause,
  Pencil,
  Play,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import type { Schedule } from "@/lib/services"
import { runActive } from "../api"
import { useCronjobActions } from "./cronjob-actions"
import { canTest } from "./meta"
import { useCronjobCan } from "./permissions"

// A cron job's actions, for the list's ⋯ menu, its phone sheet and the job
// page's menu.
export function useCronjobMenu(
  s: Schedule,
  { onPage = false, after }: { onPage?: boolean; after?: () => void } = {},
): Item[][] {
  const can = useCronjobCan(s.workspace_id)
  const a = useCronjobActions()
  const router = useRouter()
  const busy = !!s.last_run && runActive(s.last_run.state)
  const blocked = !!s.problem || busy || a.running

  return [
    can.run
      ? [
          {
            key: "run",
            label: busy ? "Running…" : "Run now",
            icon: <Play />,
            disabled: blocked,
            onSelect: () => a.run(s),
          },
          ...(canTest(s.action)
            ? [
                {
                  key: "test",
                  label: "Test run",
                  icon: <FlaskConical />,
                  disabled: blocked,
                  onSelect: () => a.run(s, { dryRun: true }),
                },
              ]
            : []),
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
              onSelect: () => router.push(`/cronjobs/${s.id}`),
            },
          ]),
      ...(can.edit
        ? [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => router.push(`/cronjobs/${s.id}/edit`),
            },
            {
              key: "enabled",
              label: s.enabled ? "Pause" : "Resume",
              icon: s.enabled ? <Pause /> : <Play />,
              onSelect: () => a.setEnabled(s, !s.enabled),
            },
          ]
        : []),
    ],
    can.edit
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.remove(s, after),
          },
        ]
      : [],
  ]
}
