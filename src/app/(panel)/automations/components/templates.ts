import {
  CalendarClock,
  DatabaseBackup,
  HardDrive,
  type LucideIcon,
  RefreshCw,
  Rocket,
  ServerCog,
} from "lucide-react"

import type { AutomationAction, AutomationTrigger } from "@/lib/services"

// Ready-made automations: the empty list shows them as a gallery and
// /automations/new?template=<key> starts from one. Channels and cron jobs
// can't be known here: notify steps take the workspace's default channels
// when it has some, a cron job step is left for the person to pick.

export type Template = {
  key: string
  name: string
  description: string
  icon: LucideIcon
  // What it reacts to, said short for the card.
  when: string
  trigger: AutomationTrigger
  actions: AutomationAction[]
  cooldown?: number
  // A note shown in the editor about what to fill or check.
  note?: string
}

const noFilter = { servers: [], tags: [], severity: [], subjects: [] }

export const templates: Template[] = [
  {
    key: "restart-service",
    name: "Restart a failed service",
    description:
      "When the “A service failed” alert fires on a server, restart that service there and tell the team.",
    icon: ServerCog,
    when: "Alert fired",
    trigger: {
      kind: "event",
      events: ["alert.fired"],
      filter: { ...noFilter, match: "A service failed" },
    },
    actions: [
      {
        kind: "service",
        action: "restart",
        unit: "{{data.detail}}",
        on: "event",
      },
      {
        kind: "notify",
        title: "Restarted {{data.detail}} on {{server.name}}",
        text: "{{event.text}}\nMorche restarted it. Run: {{run.url}}",
      },
    ],
    cooldown: 600,
    note: "It reacts to alert rules whose name contains “A service failed” (the ready-made rule). The rule's detail is the failed unit: with one rule per unit, only that one is restarted.",
  },
  {
    key: "recheck-offline",
    name: "Re-check a server that went offline",
    description:
      "When a server goes offline, wait a minute, check it again and say how it went.",
    icon: RefreshCw,
    when: "Server offline",
    trigger: { kind: "event", events: ["server.offline"], filter: noFilter },
    actions: [
      { kind: "wait", seconds: 60 },
      { kind: "check", on: "event", continue_on_error: true },
      {
        kind: "notify",
        title: "{{server.name}} went offline",
        text: "{{event.text}}\nMorche checked it again a minute later: {{run.url}}",
      },
    ],
  },
  {
    key: "disk-cleanup",
    name: "Clean up when a disk fills",
    description:
      "When the “Disk almost full” alert fires, trim the journal and Docker's leftovers on that server, then report.",
    icon: HardDrive,
    when: "Alert fired",
    trigger: {
      kind: "event",
      events: ["alert.fired"],
      filter: { ...noFilter, match: "Disk almost full" },
    },
    actions: [
      {
        kind: "script",
        on: "event",
        interpreter: "bash",
        as_root: true,
        timeout_seconds: 600,
        command:
          'echo "Cleaning up on $MORCHE_SERVER_NAME"\njournalctl --vacuum-size=200M\nif command -v docker >/dev/null; then\n  docker system prune -f\nfi\ndf -h /',
      },
      {
        kind: "notify",
        title: "Cleaned up {{server.name}}",
        text: "{{event.text}}\nThe journal and unused Docker data were cleared. Run: {{run.url}}",
      },
    ],
    cooldown: 3600,
    note: "The command runs as root and deletes old logs and unused Docker images, containers and networks. Read it before saving.",
  },
  {
    key: "backup-failed",
    name: "Tell the team when a backup fails",
    description:
      "A database backup didn't work: send it to your channels straight away.",
    icon: DatabaseBackup,
    when: "Database backup failed",
    trigger: { kind: "event", events: ["backup.failed"], filter: noFilter },
    actions: [
      {
        kind: "notify",
        title: "Backup of {{subject.name}} failed",
        text: "{{event.text}}\n{{event.url}}",
      },
    ],
    cooldown: 0,
  },
  {
    key: "deploy-webhook",
    name: "Call a URL after a deploy",
    description:
      "When a compose project deploys, POST the event to your own tool (a changelog, a cache purge, a chat bridge).",
    icon: Rocket,
    when: "Deploy succeeded",
    trigger: { kind: "event", events: ["deploy.succeeded"], filter: noFilter },
    actions: [
      {
        kind: "webhook",
        method: "POST",
        url: "https://hooks.example.com/deployed",
        body: "",
      },
    ],
    cooldown: 0,
    note: "Put your own address in the step. The body is left empty, so the whole event goes as JSON.",
  },
  {
    key: "cron-from-ci",
    name: "Run a cron job from CI",
    description:
      "Your CI calls the automation's secret URL and Morche runs a cron job (a sync, a backup, a script) and waits for it.",
    icon: CalendarClock,
    when: "Incoming URL",
    trigger: { kind: "webhook", events: [], filter: noFilter },
    actions: [{ kind: "cronjob" }],
    cooldown: 0,
    note: "Pick the cron job in the step. The secret URL is made on the automation's page once it's saved.",
  },
]

export const templateOf = (key: string | null | undefined) =>
  templates.find((t) => t.key === key)
