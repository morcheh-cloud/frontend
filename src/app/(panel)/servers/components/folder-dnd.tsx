"use client"

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MeasuringStrategy,
  type Modifier,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { getEventCoordinates } from "@dnd-kit/utilities"
import { Folder as FolderIcon, Server as ServerIcon } from "lucide-react"
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import { fieldErrors } from "@/lib/api"
import type { Server } from "@/lib/services"
import { useMoveServers, useSaveFolder } from "../api"
import { type FolderNode, subtreeIds } from "./folder-tree"
import { useServerCan } from "./permissions"
import type { Selection } from "./servers-table"

type Drag =
  | { kind: "servers"; servers: Server[] }
  | { kind: "folder"; folder: FolderNode }

type Target = { folderId: string | null; name: string }

// A drag can't start on a control inside a row (checkbox, star, menu) or on
// text marked data-no-drag; a button that is itself dragged says data-drag.
function startsDrag(event: Event) {
  const hit = (event.target as Element).closest(
    "button, input, [role=checkbox], [data-no-drag]",
  )
  return !hit || hit.hasAttribute("data-drag")
}

class RowMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: (
        ...args: Parameters<(typeof MouseSensor.activators)[0]["handler"]>
      ) =>
        startsDrag(args[0].nativeEvent) &&
        MouseSensor.activators[0].handler(...args),
    },
  ]
}

class RowTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: (
        ...args: Parameters<(typeof TouchSensor.activators)[0]["handler"]>
      ) =>
        startsDrag(args[0].nativeEvent) &&
        TouchSensor.activators[0].handler(...args),
    },
  ]
}

// The overlay would start where the row is; keep it beside the pointer.
const besideCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  const start = activatorEvent && getEventCoordinates(activatorEvent)
  if (!start || !draggingNodeRect) return transform
  return {
    ...transform,
    x: transform.x + start.x - draggingNodeRect.left + 12,
    y: transform.y + start.y - draggingNodeRect.top + 8,
  }
}

function accepts(drag: Drag, folderId: string | null) {
  if (drag.kind === "servers") {
    return drag.servers.some((s) => s.folder_id !== folderId)
  }
  if (folderId === (drag.folder.parent_id ?? null)) return false
  return folderId === null || !subtreeIds(drag.folder).has(folderId)
}

const DragState = createContext<{
  drag: Drag | null
  endedAt: RefObject<number>
}>({ drag: null, endedAt: { current: 0 } })

// Moving servers and folders by dragging, as in Drive: a selected row carries
// the whole selection along, and folders take servers and other folders.
// Desktop only; the Move dialogs are the way without a mouse, and on phones.
export function FolderDnd({
  selection,
  onMoved,
  children,
}: {
  selection: Selection
  onMoved: () => void
  children: ReactNode
}) {
  const move = useMoveServers()
  const saveFolder = useSaveFolder()
  const can = useServerCan()
  const [drag, setDrag] = useState<Drag | null>(null)
  const endedAt = useRef(0)

  // Mouse, not pointer: a finger's pointer events would start a drag while
  // scrolling; touch waits for a long press instead.
  const sensors = useSensors(
    useSensor(RowMouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(RowTouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  function onDragStart({ active }: DragStartEvent) {
    const { server, folder } = active.data.current as {
      server?: Server
      folder?: FolderNode
    }
    if (folder) setDrag({ kind: "folder", folder })
    if (!server) return
    // A bulk action is all or nothing; a mixed selection drags just this row.
    const picked = selection.has(server.id) ? [...selection.values()] : [server]
    const movable = picked.every((s) => can(s, "owner"))
    setDrag({ kind: "servers", servers: movable ? picked : [server] })
  }

  function moveServers(servers: Server[], to: Target) {
    const label = servers.length === 1 ? servers[0].name : servers.length
    const ids = servers.map((s) => s.id)
    move.mutate(
      { ids, folderId: to.folderId },
      {
        onSuccess: () => {
          onMoved()
          toast.success(
            typeof label === "string"
              ? `Moved ${label} to ${to.name}`
              : `Moved ${label} servers to ${to.name}`,
            { action: { label: "Undo", onClick: () => putBack(servers) } },
          )
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  // They may have come from several folders, seen together in a flat list.
  function putBack(servers: Server[]) {
    const from = new Map<string | null, string[]>()
    for (const s of servers) {
      from.set(s.folder_id, [...(from.get(s.folder_id) ?? []), s.id])
    }
    Promise.all(
      [...from].map(([folderId, ids]) => move.mutateAsync({ ids, folderId })),
    ).catch((error: Error) => toast.error(error.message))
  }

  function placeFolder(folder: FolderNode, parentId: string | null) {
    return saveFolder.mutateAsync({
      id: folder.id,
      body: { name: folder.name, parent_id: parentId },
    })
  }

  function moveFolder(folder: FolderNode, to: Target) {
    const refused = (error: Error) =>
      toast.error(fieldErrors(error).name ?? error.message)
    placeFolder(folder, to.folderId).then(
      () =>
        toast.success(`Moved ${folder.name} to ${to.name}`, {
          action: {
            label: "Undo",
            onClick: () =>
              placeFolder(folder, folder.parent_id ?? null).catch(refused),
          },
        }),
      refused,
    )
  }

  function onDragEnd({ over }: DragEndEvent) {
    endedAt.current = Date.now()
    setDrag(null)
    const to = over?.data.current as Target | undefined
    if (!to || !drag || !accepts(drag, to.folderId)) return
    if (drag.kind === "servers") moveServers(drag.servers, to)
    else moveFolder(drag.folder, to)
  }

  return (
    <DragState.Provider value={{ drag, endedAt }}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        // The page can scroll under a drag: measure the targets all along.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          endedAt.current = Date.now()
          setDrag(null)
        }}
      >
        {children}
        <DragOverlay dropAnimation={null} modifiers={[besideCursor]}>
          {drag && <Ghost drag={drag} />}
        </DragOverlay>
      </DndContext>
    </DragState.Provider>
  )
}

function Ghost({ drag }: { drag: Drag }) {
  const name =
    drag.kind === "folder"
      ? drag.folder.name
      : drag.servers.length === 1
        ? drag.servers[0].name
        : `${drag.servers.length} servers`
  const Icon = drag.kind === "folder" ? FolderIcon : ServerIcon
  return (
    <div className="flex h-9 w-fit max-w-64 cursor-grabbing items-center gap-2 rounded-lg border border-border bg-card px-3 text-body-sm font-medium shadow-md">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{name}</span>
    </div>
  )
}

// A drag ends with a click on what it started from; that click must not open
// the server's link or the folder.
function useDragGuard() {
  const { endedAt } = useContext(DragState)
  return (event: MouseEvent) => {
    if (Date.now() - endedAt.current > 250) return
    event.preventDefault()
    event.stopPropagation()
  }
}

// A touch hold starts the drag at 250 ms and would open the context menu at
// 500 ms under the finger: for ContextMenu's onOpenChange.
function menuGuard(dragging: boolean) {
  return (open: boolean, details: { cancel: () => void }) => {
    if (open && dragging) details.cancel()
  }
}

export function useDragServer(server: Server, enabled: boolean) {
  const { drag } = useContext(DragState)
  const onClickCapture = useDragGuard()
  const { setNodeRef, listeners } = useDraggable({
    id: `server:${server.id}`,
    data: { server },
    disabled: !enabled,
  })
  const moving =
    drag?.kind === "servers" && drag.servers.some((s) => s.id === server.id)
  return {
    ref: setNodeRef,
    listeners,
    onClickCapture,
    moving,
    onMenuChange: menuGuard(moving),
  }
}

export function useDragFolder(folder: FolderNode, enabled: boolean) {
  const { drag } = useContext(DragState)
  const onClickCapture = useDragGuard()
  const { setNodeRef, listeners } = useDraggable({
    id: `folder:${folder.id}`,
    data: { folder },
    disabled: !enabled,
  })
  const moving = drag?.kind === "folder" && drag.folder.id === folder.id
  return {
    ref: setNodeRef,
    listeners,
    onClickCapture,
    moving,
    onMenuChange: menuGuard(moving),
  }
}

// Turns anything showing a folder into a place to drop. Folders that can't
// take this drag stay out of it and don't light up.
export function useFolderDrop(
  id: string,
  folderId: string | null,
  name: string,
) {
  const { drag } = useContext(DragState)
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { folderId, name } satisfies Target,
    disabled: !drag || !accepts(drag, folderId),
  })
  return { ref: setNodeRef, over: isOver }
}
