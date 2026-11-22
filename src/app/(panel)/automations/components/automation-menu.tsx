"use client"

import {
  FlaskConical,
  Link2,
  Link2Off,
  ListChecks,
  Pencil,
  Play,
  Power,
  PowerOff,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"

import type { Item } from "@/app/(panel)/servers/[id]/components/parts"
import type { Automation } from "@/lib/services"
import { runActive } from "../api"
import { useAutomationActions } from "./automation-actions"
import { automationHref, editHref, runsHref } from "./meta"
import { useAutomationCan } from "./permissions"

// An automation's actions, for the list's ⋯ menu, its phone sheet and the
// automation's own page.
export function useAutomationMenu(
  a: Automation,
  { onPage = false, after }: { onPage?: boolean; after?: () => void } = {},
): Item[][] {
  const can = useAutomationCan(a.workspace_id)
  const act = useAutomationActions()
  const router = useRouter()
  const busy = a.recent.some((r) => runActive(r.status))
  const blocked = !!a.problem || busy || act.running
  const hook = a.trigger.kind === "webhook"

  return [
    can.run
      ? [
          {
            key: "run",
            label: busy ? "Running…" : "Run now",
            icon: <Play />,
            disabled: blocked,
            onSelect: () => act.run(a),
          },
          ...(can.edit
            ? [
                {
                  key: "test",
                  label: "Test",
                  icon: <FlaskConical />,
                  onSelect: () => act.test(a),
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
              onSelect: () => router.push(automationHref(a.id)),
            },
          ]),
      {
        key: "runs",
        label: "All its runs",
        icon: <ListChecks />,
        onSelect: () => router.push(runsHref({ automation: a.id })),
      },
      ...(can.edit
        ? [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => router.push(editHref(a.id)),
            },
            {
              key: "enabled",
              label: a.enabled ? "Turn off" : "Turn on",
              icon: a.enabled ? <PowerOff /> : <Power />,
              onSelect: () => act.setEnabled(a, !a.enabled),
            },
          ]
        : []),
    ],
    can.edit && hook
      ? [
          {
            key: "hook",
            label: a.has_hook
              ? "Make a new incoming URL"
              : "Make the incoming URL",
            icon: <Link2 />,
            onSelect: () => act.makeHook(a),
          },
          ...(a.has_hook
            ? [
                {
                  key: "unhook",
                  label: "Remove the incoming URL",
                  icon: <Link2Off />,
                  onSelect: () => act.removeHook(a),
                },
              ]
            : []),
        ]
      : [],
    can.edit
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => act.remove(a, after),
          },
        ]
      : [],
  ]
}
