"use client"

import {
  CloudDownload,
  EyeOff,
  FolderOpen,
  Play,
  RefreshCcw,
  Rocket,
  RotateCw,
  Square,
  SquareArrowDown,
  Trash2,
} from "lucide-react"
import { createSerializer, parseAsString } from "nuqs"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { DockerProject } from "@/lib/services"
import type { Item } from "../../servers/[id]/components/parts"
import { type ProjectAction, useForgetProject, useProjectAction } from "../api"
import type { Tone } from "./meta"
import { useDockerCan } from "./permissions"

export const projectStateMeta: Record<
  DockerProject["state"],
  { label: string; tone: Tone }
> = {
  running: { label: "Running", tone: "success" },
  partial: { label: "Partly running", tone: "warning" },
  stopped: { label: "Stopped", tone: "muted" },
  "not-deployed": { label: "Not deployed", tone: "muted" },
}

const projectSerializer = createSerializer({
  env: parseAsString,
  template: parseAsString,
  tab: parseAsString,
  source: parseAsString,
})

export function projectHref(server: string, name: string, tab?: string) {
  return projectSerializer(`/containers/projects/${encodeURIComponent(name)}`, {
    env: server,
    tab: tab ?? null,
  })
}

export function newProjectHref(
  server?: string,
  template?: string,
  source?: "git",
) {
  return projectSerializer("/containers/projects/new", {
    env: server ?? null,
    template: template ?? null,
    source: source ?? null,
  })
}

const actionLabel: Record<ProjectAction, string> = {
  up: "Apply changes to",
  down: "Take down",
  start: "Start",
  stop: "Stop",
  restart: "Restart",
  pull: "Pull images of",
  redeploy: "Redeploy",
  destroy: "Destroy",
}

const doneText: Record<ProjectAction, string> = {
  up: "Deploying",
  down: "Taking down",
  start: "Starting",
  stop: "Stopping",
  restart: "Restarting",
  pull: "Pulling the images of",
  redeploy: "Redeploying",
  destroy: "Destroying",
}

type Ask = {
  p: Pick<DockerProject, "name" | "managed" | "dir" | "itself">
  action: ProjectAction | "forget"
}

// What stops (or replaces) the containers Morche itself runs in.
const selfStopping: readonly ProjectAction[] = [
  "stop",
  "restart",
  "up",
  "redeploy",
  "down",
  "destroy",
]

const selfText: Partial<Record<ProjectAction, string>> = {
  stop: "Stopping it stops Morche's panel and backend. Nothing in Morche works until someone starts them again on the server (docker compose start).",
  restart:
    "Restarting it stops Morche's panel and backend for a moment: this page loses its connection until they are back.",
  up: "Applying changes may recreate Morche's own containers: the panel goes away for a moment, and for good if the new compose file is broken.",
  redeploy:
    "Redeploying pulls new images and recreates Morche's own containers: the panel goes away until they are back.",
  down: "Taking it down removes Morche's panel and backend. Nothing in Morche works until someone runs docker compose up -d on the server.",
  destroy:
    "Destroying it removes Morche itself, with its database volume: every server, setting and history in Morche is lost.",
}

// Where Morche knows a project from, for a tag on its card.
export const projectSourceMeta: Record<
  DockerProject["source"],
  { label: string; hint: string }
> = {
  folder: {
    label: "Projects folder",
    hint: "In this environment's projects folder",
  },
  containers: {
    label: "Found by its containers",
    hint: "Its containers say which compose file made them",
  },
  scan: { label: "Found on the disk", hint: "Found by a look at the disk" },
  added: { label: "Added by path", hint: "Someone added its folder by hand" },
}

// Every compose command on a project, the menu that offers them and the
// confirmations of the ones that remove something.
export function useProjectActions(
  serverId: string,
  workspaceId: string,
  { onForgot }: { onForgot?: () => void } = {},
) {
  const can = useDockerCan(serverId, workspaceId)
  const act = useProjectAction()
  const forget = useForgetProject()
  const [ask, setAsk] = useState<Ask | null>(null)
  const [open, setOpen] = useOpen("docker-project-confirm")

  const run = (name: string, action: ProjectAction, done?: () => void) =>
    act.mutate(
      { server: serverId, project: name, action },
      {
        onSuccess: () => done?.(),
        onError: (e) =>
          toast.error(
            `Couldn't start: ${doneText[action].toLowerCase()} ${name}`,
            {
              description: e.message,
            },
          ),
      },
    )

  const confirm = (p: Ask["p"], action: Ask["action"]) => {
    setAsk({ p, action })
    setOpen(true)
  }

  // Runs an action, asking first when it removes something or would stop
  // Morche itself.
  const go = (p: Ask["p"], action: ProjectAction) => {
    if (
      action === "down" ||
      action === "destroy" ||
      (p.itself && selfStopping.includes(action))
    )
      confirm(p, action)
    else run(p.name, action)
  }

  const menu = (
    p: DockerProject,
    opts: { open?: () => void } = {},
  ): Item[][] => {
    const live = p.state === "running" || p.state === "partial"
    const deployed = p.state !== "not-deployed"
    const busy = act.isPending
    return [
      opts.open
        ? [
            {
              key: "open",
              label: "Open",
              icon: <FolderOpen />,
              onSelect: opts.open,
            },
          ]
        : [],
      can.operate && deployed
        ? [
            ...(p.state !== "running"
              ? [
                  {
                    key: "start",
                    label: "Start",
                    icon: <Play />,
                    disabled: busy,
                    onSelect: () => go(p, "start"),
                  },
                ]
              : []),
            ...(live
              ? [
                  {
                    key: "stop",
                    label: "Stop",
                    icon: <Square />,
                    disabled: busy,
                    onSelect: () => go(p, "stop"),
                  },
                  {
                    key: "restart",
                    label: "Restart",
                    icon: <RotateCw />,
                    disabled: busy,
                    onSelect: () => go(p, "restart"),
                  },
                ]
              : []),
          ]
        : [],
      can.manage
        ? [
            {
              key: "up",
              label: deployed ? "Apply changes (up)" : "Deploy",
              icon: <Rocket />,
              disabled: busy,
              onSelect: () => go(p, "up"),
            },
            {
              key: "pull",
              label: "Pull images",
              icon: <CloudDownload />,
              disabled: busy,
              onSelect: () => go(p, "pull"),
            },
            {
              key: "redeploy",
              label: "Redeploy (pull + up)",
              icon: <RefreshCcw />,
              disabled: busy,
              onSelect: () => go(p, "redeploy"),
            },
          ]
        : [],
      can.manage
        ? [
            ...(deployed
              ? [
                  {
                    key: "down",
                    label: "Take down",
                    icon: <SquareArrowDown />,
                    onSelect: () => go(p, "down"),
                  },
                ]
              : []),
            {
              key: "destroy",
              label: "Destroy…",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => go(p, "destroy"),
            },
            ...(!p.managed && p.total === 0
              ? [
                  {
                    key: "forget",
                    label: "Stop listing it",
                    icon: <EyeOff />,
                    onSelect: () => confirm(p, "forget"),
                  },
                ]
              : []),
          ]
        : [],
    ]
  }

  const forgetting = ask?.action === "forget"
  const self = ask?.p.itself && ask.action !== "forget" ? ask.action : null
  const dialog = self ? (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={`${actionLabel[self]} Morche itself?`}
      description={
        <>
          Morche runs in <strong>{ask?.p.name}</strong> on this server.{" "}
          {selfText[self]}
        </>
      }
      confirmLabel={actionLabel[self]}
      pending={act.isPending}
      onConfirm={() => ask && run(ask.p.name, self, () => setOpen(false))}
    />
  ) : (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      destructive={ask?.action === "destroy"}
      title={
        ask?.action === "destroy"
          ? `Destroy ${ask.p.name}?`
          : forgetting
            ? `Stop listing ${ask.p.name}?`
            : `Take ${ask?.p.name ?? ""} down?`
      }
      description={
        ask?.action === "destroy" ? (
          <>
            Removes its containers, networks and <strong>volumes</strong>: the
            data kept in them is lost
            {ask.p.managed && ask.p.dir ? (
              <>
                , and the folder{" "}
                <code className="text-caption">{ask.p.dir}</code> with its
                compose file
              </>
            ) : null}
            . This can't be undone.
          </>
        ) : forgetting ? (
          <>
            Morche stops showing it, and later looks at the disk leave it out.
            Its files stay in <code className="text-caption">{ask.p.dir}</code>:
            Add a project brings it back.
          </>
        ) : (
          "Stops and removes its containers and networks. Volumes and the compose file stay, so Deploy brings it back as it was."
        )
      }
      confirmLabel={
        ask?.action === "destroy"
          ? "Destroy"
          : forgetting
            ? "Stop listing"
            : "Take down"
      }
      pending={act.isPending || forget.isPending}
      onConfirm={() => {
        if (!ask) return
        if (ask.action === "forget") {
          forget.mutate(
            { server: serverId, project: ask.p.name },
            {
              onSuccess: () => {
                setOpen(false)
                toast(`${ask.p.name} is no longer listed`)
                onForgot?.()
              },
              onError: (e) =>
                toast.error("Couldn't stop listing it", {
                  description: e.message,
                }),
            },
          )
          return
        }
        run(ask.p.name, ask.action, () => setOpen(false))
      }}
    />
  )

  return { can, run, go, confirm, menu, dialog, pending: act.isPending }
}
