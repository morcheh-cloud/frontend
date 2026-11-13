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
  p: Pick<DockerProject, "name" | "managed" | "dir">
  action: "down" | "destroy" | "forget"
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
                    onSelect: () => run(p.name, "start"),
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
                    onSelect: () => run(p.name, "stop"),
                  },
                  {
                    key: "restart",
                    label: "Restart",
                    icon: <RotateCw />,
                    disabled: busy,
                    onSelect: () => run(p.name, "restart"),
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
              onSelect: () => run(p.name, "up"),
            },
            {
              key: "pull",
              label: "Pull images",
              icon: <CloudDownload />,
              disabled: busy,
              onSelect: () => run(p.name, "pull"),
            },
            {
              key: "redeploy",
              label: "Redeploy (pull + up)",
              icon: <RefreshCcw />,
              disabled: busy,
              onSelect: () => run(p.name, "redeploy"),
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
                    onSelect: () => confirm(p, "down"),
                  },
                ]
              : []),
            {
              key: "destroy",
              label: "Destroy…",
              icon: <Trash2 />,
              destructive: true,
              onSelect: () => confirm(p, "destroy"),
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
  const dialog = (
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

  return { can, run, confirm, menu, dialog, pending: act.isPending }
}
