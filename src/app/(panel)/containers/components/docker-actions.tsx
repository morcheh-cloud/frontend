"use client"

import {
  Cable,
  CircleStop,
  Container,
  Copy,
  FileText,
  Fingerprint,
  FolderOpen,
  HardDrive,
  HardDriveUpload,
  Info,
  Layers,
  Pause,
  Pencil,
  Play,
  PlayCircle,
  RotateCw,
  Send,
  ShieldCheck,
  SquareTerminal,
  Tag,
  Trash2,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type {
  DockerContainer,
  DockerImage,
  DockerNetwork,
  DockerVolume,
} from "@/lib/services"
import type { Item } from "../../servers/[id]/components/parts"
import {
  type ContainerAction,
  useContainerAction,
  useDisconnectNetwork,
  usePullImage,
  useRemoveNetwork,
  useRemoveVolume,
  useScanImages,
} from "../api"
import { ImageDetails, NetworkDetails, VolumeDetails } from "./details"
import {
  ConnectDialog,
  KillDialog,
  NewNetworkDialog,
  NewVolumeDialog,
  PruneDialog,
  type PrunePreset,
  PullDialog,
  RemoveContainersDialog,
  RemoveImageDialog,
  RemoveImagesDialog,
  RemoveVolumesDialog,
  RenameDialog,
  TagDialog,
} from "./dialogs"
import {
  CopyImageDialog,
  ExportImageDialog,
  ImportImageDialog,
} from "./image-transfer"
import { LayerExplorer } from "./layer-explorer"
import {
  containerHref,
  dockerHref,
  imageName,
  shortId,
  volumeHref,
} from "./meta"
import type { DockerCan } from "./permissions"
import { RunContainerDialog } from "./run-wizard"
import { BackupVolumeDialog } from "./volume-backups"

type Dialog =
  | { kind: "kill"; server: string; c: DockerContainer }
  | { kind: "rename"; server: string; c: DockerContainer }
  | {
      kind: "remove"
      server: string
      cs: DockerContainer[]
      onDone?: () => void
    }
  | { kind: "pull"; server: string; image?: string }
  | { kind: "tag"; server: string; image: DockerImage }
  | { kind: "remove-image"; server: string; image: DockerImage }
  | {
      kind: "remove-images"
      server: string
      images: DockerImage[]
      onDone?: () => void
    }
  | { kind: "new-volume"; server: string }
  | {
      kind: "remove-volumes"
      server: string
      volumes: DockerVolume[]
      onDone?: () => void
    }
  | { kind: "new-network"; server: string }
  | { kind: "connect"; server: string; network: DockerNetwork }
  | { kind: "prune"; server: string; preset?: PrunePreset }
  | { kind: "volume-backup"; server: string; volume: string; users: number }
  | { kind: "run"; server: string; image: string }
  | { kind: "export-image"; server: string; image: DockerImage }
  | { kind: "import-image"; server: string }
  | { kind: "copy-image"; server: string; image: DockerImage }
  | {
      kind: "confirm"
      title: string
      body: ReactNode
      label: string
      run: () => Promise<unknown>
    }

type Detail =
  | { kind: "image"; server: string; image: DockerImage; can: DockerCan }
  | { kind: "volume"; server: string; name: string; can: DockerCan }
  | { kind: "network"; server: string; id: string; can: DockerCan }
  | { kind: "layers"; server: string; image: string }

const verbs: Record<ContainerAction, [string, string]> = {
  start: ["Starting", "Started"],
  stop: ["Stopping", "Stopped"],
  restart: ["Restarting", "Restarted"],
  pause: ["Pausing", "Paused"],
  unpause: ["Resuming", "Resumed"],
}

function useActionsState() {
  const router = useRouter()
  const [dialog, setDialog] = useState<(Dialog & { n: number }) | null>(null)
  const [dialogOpen, setDialogOpen] = useOpen("docker-dialog")
  const [detail, setDetail] = useState<(Detail & { n: number }) | null>(null)
  const [detailOpen, setDetailOpen] = useOpen("docker-detail")
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState(false)
  const action = useContainerAction()
  const removeVolume = useRemoveVolume()
  const removeNetwork = useRemoveNetwork()
  const disconnect = useDisconnectNetwork()
  const scan = useScanImages()
  const pull = usePullImage()

  function show(d: Dialog) {
    setDialog({ ...d, n: Date.now() })
    setDialogOpen(true)
  }
  function showDetail(d: Detail) {
    setDetail({ ...d, n: Date.now() })
    setDetailOpen(true)
  }
  function mark(id: string, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function run(
    server: string,
    c: DockerContainer,
    act: ContainerAction,
    quiet = false,
  ) {
    mark(c.id, true)
    const t = quiet ? undefined : toast.loading(`${verbs[act][0]} ${c.name}…`)
    try {
      await action.mutateAsync({ server, container: c.id, action: act })
      if (!quiet) toast.success(`${verbs[act][1]} ${c.name}`, { id: t })
      return true
    } catch (err) {
      toast.error(`${c.name}: ${(err as Error).message}`, { id: t })
      return false
    } finally {
      mark(c.id, false)
    }
  }

  // Several at once, four at a time, one toast for the lot.
  async function runMany(
    server: string,
    cs: DockerContainer[],
    act: ContainerAction,
  ) {
    const t = toast.loading(`${verbs[act][0]} ${cs.length} containers…`)
    let ok = 0
    const queue = [...cs]
    await Promise.all(
      Array.from({ length: Math.min(4, queue.length) }, async () => {
        for (let c = queue.shift(); c; c = queue.shift()) {
          if (await run(server, c, act, true)) ok++
        }
      }),
    )
    if (ok === cs.length) toast.success(`${verbs[act][1]} ${ok}`, { id: t })
    else toast.warning(`${ok} of ${cs.length} done`, { id: t })
  }

  function confirm(d: Omit<Extract<Dialog, { kind: "confirm" }>, "kind">) {
    show({ kind: "confirm", ...d })
  }

  return {
    busy,
    run,
    runMany,
    kill: (server: string, c: DockerContainer) =>
      show({ kind: "kill", server, c }),
    rename: (server: string, c: DockerContainer) =>
      show({ kind: "rename", server, c }),
    remove: (server: string, cs: DockerContainer[], onDone?: () => void) =>
      show({ kind: "remove", server, cs, onDone }),
    pull: (server: string, image?: string) =>
      show({ kind: "pull", server, image }),
    tag: (server: string, image: DockerImage) =>
      show({ kind: "tag", server, image }),
    removeImage: (server: string, image: DockerImage) =>
      show({ kind: "remove-image", server, image }),
    removeImages: (
      server: string,
      images: DockerImage[],
      onDone?: () => void,
    ) =>
      images.length === 1
        ? show({ kind: "remove-image", server, image: images[0] })
        : show({ kind: "remove-images", server, images, onDone }),
    // A vulnerability scan as a background task (at most 100 per call).
    scanImages: (server: string, images: DockerImage[]) =>
      scan.mutate(
        { server, images: images.slice(0, 100).map((i) => i.id) },
        { onError: (err) => toast.error(err.message) },
      ),
    // Pull every tagged one again (a newer version under the same tag).
    pullAgain: (server: string, images: DockerImage[]) => {
      const refs = images.flatMap((i) => (i.tags[0] ? [i.tags[0]] : []))
      if (refs.length === 1)
        return show({ kind: "pull", server, image: refs[0] })
      for (const ref of refs) pull.mutate({ server, image: ref })
    },
    image: (server: string, image: DockerImage, can: DockerCan) =>
      showDetail({ kind: "image", server, image, can }),
    // Engineer: the layer explorer, run wizard and moving images around.
    layers: (server: string, image: DockerImage) =>
      showDetail({ kind: "layers", server, image: image.tags[0] ?? image.id }),
    runImage: (server: string, image: DockerImage | string) =>
      show({
        kind: "run",
        server,
        image: typeof image === "string" ? image : (image.tags[0] ?? image.id),
      }),
    exportImage: (server: string, image: DockerImage) =>
      show({ kind: "export-image", server, image }),
    importImage: (server: string) => show({ kind: "import-image", server }),
    copyImage: (server: string, image: DockerImage) =>
      show({ kind: "copy-image", server, image }),
    newVolume: (server: string) => show({ kind: "new-volume", server }),
    removeVolumes: (
      server: string,
      volumes: DockerVolume[],
      onDone?: () => void,
    ) => show({ kind: "remove-volumes", server, volumes, onDone }),
    volume: (server: string, name: string, can: DockerCan) =>
      showDetail({ kind: "volume", server, name, can }),
    removeVolume: (server: string, v: DockerVolume, after?: () => void) =>
      confirm({
        title: `Remove volume ${v.anonymous ? v.name.slice(0, 12) : v.name}?`,
        body:
          v.used_by.length > 0
            ? `${v.used_by.map((r) => r.name).join(", ")} use${v.used_by.length === 1 ? "s" : ""} it: remove ${v.used_by.length === 1 ? "that container" : "those containers"} first.`
            : "Its data is deleted for good.",
        label: "Remove",
        run: () =>
          removeVolume
            .mutateAsync({ server, volume: v.name, force: false })
            .then(() => after?.()),
      }),
    backupVolume: (server: string, v: Pick<DockerVolume, "name" | "used_by">) =>
      show({
        kind: "volume-backup",
        server,
        volume: v.name,
        users: v.used_by.length,
      }),
    newNetwork: (server: string) => show({ kind: "new-network", server }),
    network: (server: string, id: string, can: DockerCan) =>
      showDetail({ kind: "network", server, id, can }),
    connect: (server: string, network: DockerNetwork) =>
      show({ kind: "connect", server, network }),
    disconnect: (
      server: string,
      n: DockerNetwork,
      container: string,
      name: string,
    ) =>
      confirm({
        title: `Disconnect ${name}?`,
        body: `It leaves ${n.name} straight away; other containers there can't reach it by name any more.`,
        label: "Disconnect",
        run: () => disconnect.mutateAsync({ server, network: n.id, container }),
      }),
    removeNetwork: (server: string, n: DockerNetwork) =>
      confirm({
        title: `Remove network ${n.name}?`,
        body:
          n.containers.length > 0
            ? `${n.containers.length} container${n.containers.length === 1 ? " is" : "s are"} on it: Docker refuses until they leave.`
            : "Nothing is on it.",
        label: "Remove",
        run: () => removeNetwork.mutateAsync({ server, network: n.id }),
      }),
    prune: (server: string, preset?: PrunePreset) =>
      show({ kind: "prune", server, preset }),
    logs: (server: string, c: DockerContainer) =>
      router.push(containerHref(server, c.name, "logs")),

    // Rendering state, used by the provider only.
    _layers: {
      dialog,
      dialogOpen,
      setDialogOpen,
      detail,
      detailOpen,
      setDetailOpen,
      pending,
      setPending,
    },
  }
}

export type DockerActions = Omit<ReturnType<typeof useActionsState>, "_layers">

const Ctx = createContext<DockerActions | null>(null)

export function useDockerActions() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useDockerActions needs a DockerActionsProvider")
  return ctx
}

export function DockerActionsProvider({ children }: { children: ReactNode }) {
  const { _layers: l, ...actions } = useActionsState()
  const d = l.dialog
  const t = l.detail
  return (
    <Ctx.Provider value={actions}>
      {children}
      {t?.kind === "image" && (
        <ImageDetails
          key={t.n}
          server={t.server}
          image={t.image}
          open={l.detailOpen}
          onOpenChange={l.setDetailOpen}
          manage={t.can.manage}
          onTag={() => actions.tag(t.server, t.image)}
          onRemove={() => actions.removeImage(t.server, t.image)}
          onPull={(ref) => actions.pull(t.server, ref)}
          onScan={() => actions.scanImages(t.server, [t.image])}
          onLayers={() => actions.layers(t.server, t.image)}
          onRun={() => actions.runImage(t.server, t.image)}
        />
      )}
      {t?.kind === "layers" && (
        <LayerExplorer
          key={t.n}
          server={t.server}
          image={t.image}
          open={l.detailOpen}
          onOpenChange={l.setDetailOpen}
        />
      )}
      {t?.kind === "volume" && (
        <VolumeDetails
          key={t.n}
          server={t.server}
          name={t.name}
          open={l.detailOpen}
          onOpenChange={l.setDetailOpen}
          can={t.can}
          onBackup={(v) => actions.backupVolume(t.server, v)}
          onRemove={(v) => actions.removeVolume(t.server, v)}
        />
      )}
      {t?.kind === "network" && (
        <NetworkDetails
          key={t.n}
          server={t.server}
          id={t.id}
          open={l.detailOpen}
          onOpenChange={l.setDetailOpen}
          manage={t.can.manage}
          onConnect={(n) => actions.connect(t.server, n)}
          onDisconnect={(n, c, name) =>
            actions.disconnect(t.server, n, c, name)
          }
          onRemove={(n) => actions.removeNetwork(t.server, n)}
        />
      )}
      {d?.kind === "kill" && (
        <KillDialog
          key={d.n}
          server={d.server}
          container={d.c}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "rename" && (
        <RenameDialog
          key={d.n}
          server={d.server}
          container={d.c}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "remove" && (
        <RemoveContainersDialog
          key={d.n}
          server={d.server}
          containers={d.cs}
          onDone={d.onDone}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "pull" && (
        <PullDialog
          key={d.n}
          server={d.server}
          initial={d.image}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "tag" && (
        <TagDialog
          key={d.n}
          server={d.server}
          image={d.image}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "remove-image" && (
        <RemoveImageDialog
          key={d.n}
          server={d.server}
          image={d.image}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "remove-images" && (
        <RemoveImagesDialog
          key={d.n}
          server={d.server}
          images={d.images}
          onDone={d.onDone}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "remove-volumes" && (
        <RemoveVolumesDialog
          key={d.n}
          server={d.server}
          volumes={d.volumes}
          onDone={d.onDone}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "new-volume" && (
        <NewVolumeDialog
          key={d.n}
          server={d.server}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "new-network" && (
        <NewNetworkDialog
          key={d.n}
          server={d.server}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "connect" && (
        <ConnectDialog
          key={d.n}
          server={d.server}
          network={d.network}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "prune" && (
        <PruneDialog
          key={d.n}
          server={d.server}
          preset={d.preset}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "volume-backup" && (
        <BackupVolumeDialog
          key={d.n}
          server={d.server}
          volume={d.volume}
          users={d.users}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "run" && (
        <RunContainerDialog
          key={d.n}
          server={d.server}
          image={d.image}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "export-image" && (
        <ExportImageDialog
          key={d.n}
          server={d.server}
          image={d.image}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "import-image" && (
        <ImportImageDialog
          key={d.n}
          server={d.server}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "copy-image" && (
        <CopyImageDialog
          key={d.n}
          server={d.server}
          image={d.image}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
        />
      )}
      {d?.kind === "confirm" && (
        <ConfirmDialog
          key={d.n}
          open={l.dialogOpen}
          onOpenChange={l.setDialogOpen}
          title={d.title}
          description={d.body}
          confirmLabel={d.label}
          pending={l.pending}
          onConfirm={() => {
            l.setPending(true)
            d.run()
              .then(() => {
                toast.success("Done")
                l.setDialogOpen(false)
              })
              .catch((err: Error) => toast.error(err.message))
              .finally(() => l.setPending(false))
          }}
        />
      )}
    </Ctx.Provider>
  )
}

// --- Menus -----------------------------------------------------------------

// Every action on one container, in groups, for the ⋯ menu and phone sheets.
export function useContainerMenu(
  server: string,
  c: DockerContainer,
  can: DockerCan,
  opts: { details?: boolean } = {},
): Item[][] {
  const a = useDockerActions()
  const router = useRouter()
  const busy = a.busy.has(c.id)
  const running = c.state === "running"
  const paused = c.state === "paused"
  const life: Item[] = []
  if (can.operate) {
    if (!running && !paused)
      life.push({
        key: "start",
        label: "Start",
        icon: <Play />,
        disabled: busy,
        onSelect: () => a.run(server, c, "start"),
      })
    if (running || c.state === "restarting")
      life.push({
        key: "stop",
        label: "Stop",
        icon: <CircleStop />,
        disabled: busy,
        onSelect: () => a.run(server, c, "stop"),
      })
    life.push({
      key: "restart",
      label: "Restart",
      icon: <RotateCw />,
      disabled: busy,
      onSelect: () => a.run(server, c, "restart"),
    })
  }
  if (can.manage) {
    if (running)
      life.push({
        key: "pause",
        label: "Pause",
        icon: <Pause />,
        disabled: busy,
        onSelect: () => a.run(server, c, "pause"),
      })
    if (paused)
      life.push({
        key: "unpause",
        label: "Resume",
        icon: <Play />,
        disabled: busy,
        onSelect: () => a.run(server, c, "unpause"),
      })
  }
  const look: Item[] = []
  if (opts.details !== false)
    look.push({
      key: "open",
      label: "Details",
      icon: <Info />,
      onSelect: () => router.push(containerHref(server, c.name)),
    })
  if (can.operate)
    look.push({
      key: "logs",
      label: "Logs",
      icon: <FileText />,
      onSelect: () => a.logs(server, c),
    })
  if (can.manage && running)
    look.push({
      key: "shell",
      label: "Open a shell",
      icon: <SquareTerminal />,
      onSelect: () => router.push(containerHref(server, c.name, "shell")),
    })
  look.push({
    key: "copy",
    label: "Copy ID",
    icon: <Copy />,
    onSelect: () => {
      navigator.clipboard
        ?.writeText(c.id)
        .then(() => toast.success("Copied"))
        .catch(() => toast.error("Couldn't copy"))
    },
  })
  const danger: Item[] = can.manage
    ? [
        {
          key: "rename",
          label: "Rename…",
          icon: <Pencil />,
          onSelect: () => a.rename(server, c),
        },
        ...(running || paused
          ? [
              {
                key: "kill",
                label: "Send a signal…",
                icon: <Zap />,
                onSelect: () => a.kill(server, c),
              },
            ]
          : []),
        {
          key: "remove",
          label: "Remove…",
          icon: <Trash2 />,
          destructive: true,
          onSelect: () => a.remove(server, [c]),
        },
      ]
    : []
  return [life, look, danger]
}

export function useImageMenu(
  server: string,
  image: DockerImage,
  can: DockerCan,
): Item[][] {
  const a = useDockerActions()
  const router = useRouter()
  const ref = image.tags[0]
  const name = ref ? imageName(ref) : shortId(image.id)
  return [
    [
      {
        key: "details",
        label: "Details",
        icon: <Info />,
        onSelect: () => a.image(server, image, can),
      },
      ...(image.containers > 0
        ? [
            {
              key: "containers",
              label: `Its container${image.containers === 1 ? "" : "s"}`,
              icon: <Container />,
              onSelect: () =>
                router.push(dockerHref(server, { tab: "containers", q: name })),
            },
          ]
        : []),
    ],
    [
      ...(ref
        ? [
            {
              key: "copy",
              label: "Copy name",
              icon: <Copy />,
              onSelect: () => copy(name),
            },
          ]
        : []),
      {
        key: "copy-id",
        label: "Copy ID",
        icon: <Fingerprint />,
        onSelect: () => copy(image.id),
      },
    ],
    can.manage
      ? [
          {
            key: "run",
            label: "Run…",
            icon: <PlayCircle />,
            onSelect: () => a.runImage(server, image),
          },
          {
            key: "layers",
            label: "Explore layers",
            icon: <Layers />,
            onSelect: () => a.layers(server, image),
          },
          {
            key: "export",
            label: "Save to a storage…",
            icon: <HardDriveUpload />,
            onSelect: () => a.exportImage(server, image),
          },
          {
            key: "copy-to",
            label: "Copy to another server…",
            icon: <Send />,
            onSelect: () => a.copyImage(server, image),
          },
        ]
      : [],
    can.manage
      ? [
          ...(ref
            ? [
                {
                  key: "pull",
                  label: "Pull again",
                  icon: <RotateCw />,
                  onSelect: () => a.pull(server, ref),
                },
              ]
            : []),
          {
            key: "scan",
            label: "Scan for vulnerabilities",
            icon: <ShieldCheck />,
            onSelect: () => a.scanImages(server, [image]),
          },
          {
            key: "tag",
            label: "Add tag…",
            icon: <Tag />,
            onSelect: () => a.tag(server, image),
          },
        ]
      : [],
    can.manage
      ? [
          {
            key: "remove",
            label: "Remove…",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.removeImage(server, image),
          },
        ]
      : [],
  ]
}

function copy(value: string) {
  navigator.clipboard
    ?.writeText(value)
    .then(() => toast.success("Copied"))
    .catch(() => toast.error("Couldn't copy"))
}

export function useVolumeMenu(
  server: string,
  v: DockerVolume,
  can: DockerCan,
  opts: { onPage?: boolean } = {},
): Item[][] {
  const a = useDockerActions()
  const router = useRouter()
  return [
    [
      ...(opts.onPage
        ? []
        : [
            {
              key: "open",
              label: "Open",
              icon: <HardDrive />,
              onSelect: () => router.push(volumeHref(server, v.name)),
            },
            ...(can.manage
              ? [
                  {
                    key: "files",
                    label: "Browse files",
                    icon: <FolderOpen />,
                    onSelect: () =>
                      router.push(volumeHref(server, v.name, "files")),
                  },
                ]
              : []),
          ]),
      {
        key: "copy",
        label: "Copy path on the server",
        icon: <Copy />,
        onSelect: () => {
          navigator.clipboard
            ?.writeText(v.mountpoint)
            .then(() => toast.success("Copied"))
            .catch(() => toast.error("Couldn't copy"))
        },
      },
    ],
    can.manage
      ? [
          {
            key: "backup",
            label: "Back up…",
            icon: <HardDriveUpload />,
            onSelect: () => a.backupVolume(server, v),
          },
          {
            key: "remove",
            label: "Remove…",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () =>
              a.removeVolume(
                server,
                v,
                opts.onPage
                  ? () => router.replace(dockerHref(server, { tab: "volumes" }))
                  : undefined,
              ),
          },
        ]
      : [],
  ]
}

export function useNetworkMenu(
  server: string,
  n: DockerNetwork,
  can: DockerCan,
): Item[][] {
  const a = useDockerActions()
  return [
    [
      {
        key: "details",
        label: "Details",
        icon: <Info />,
        onSelect: () => a.network(server, n.id, can),
      },
    ],
    can.manage && !n.builtin
      ? [
          {
            key: "connect",
            label: "Connect a container…",
            icon: <Cable />,
            onSelect: () => a.connect(server, n),
          },
          {
            key: "remove",
            label: "Remove…",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.removeNetwork(server, n),
          },
        ]
      : [],
  ]
}
