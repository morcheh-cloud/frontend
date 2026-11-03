"use client"

import {
  type Announcements,
  type CollisionDetection,
  closestCenter,
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  type UniqueIdentifier,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  createContext,
  type KeyboardEventHandler,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
  useState,
} from "react"

import type { App, AppLayoutBody, AppList } from "@/lib/services"
import { cn } from "@/lib/utils"
import { layoutOf, useSetLayout, withLayout } from "../api"
import { type AppGroup, AppLogo, colorOf, shortAddress } from "./meta"

// Drag ids: "app:<id>" a service, "cat:<id>" a category row in the rail
// (sorted, and a place to drop a service), "rail:none" the rail's
// Uncategorized row, "group:<id|none>" a category's block on the page.
type Kind = "app" | "cat" | "rail" | "group"
const kindOf = (id: UniqueIdentifier) => String(id).split(":")[0] as Kind
const keyOf = (id: UniqueIdentifier) => {
  const s = String(id)
  return s.slice(s.indexOf(":") + 1)
}
const groupKey = (g: { category_id?: string | null }) => g.category_id ?? "none"
const groupKeyOf = (g: AppGroup) => g.category?.id ?? "none"

type Active = { kind: "app" | "cat"; id: string }

const DndState = createContext<{
  enabled: boolean
  active?: Active
  endedAt: RefObject<number>
}>({ enabled: false, endedAt: { current: 0 } })

const useDnd = () => useContext(DndState)

// Where a service sits in an arrangement.
const groupOf = (layout: AppLayoutBody, appId: string) =>
  layout.groups.findIndex((g) => g.app_ids.includes(appId))

function moveApp(
  layout: AppLayoutBody,
  appId: string,
  to: number,
  index: number,
): AppLayoutBody {
  const groups = layout.groups.map((g) => ({
    ...g,
    app_ids: g.app_ids.filter((id) => id !== appId),
  }))
  groups[to].app_ids.splice(index, 0, appId)
  return { ...layout, groups }
}

const same = (a: AppLayoutBody, b: AppLayoutBody) =>
  JSON.stringify(a) === JSON.stringify(b)

// Moving services and categories by dragging, for people who may change the
// workspace's arrangement. While a drag runs, the page shows a draft; on drop
// the whole arrangement is saved and the draft stays until the save ends, so
// nothing jumps back for a moment. Off (no listeners, no grab cursor) when
// `enabled` is false, e.g. while searching or in the Critical view, where the
// order on screen isn't the real one.
export function LayoutDnd({
  enabled,
  list,
  children,
}: {
  enabled: boolean
  list: AppList
  children: (view: AppList) => ReactNode
}) {
  const setLayout = useSetLayout()
  const [draft, setDraft] = useState<AppLayoutBody | null>(null)
  const [active, setActive] = useState<Active>()
  const startDraft = useRef<AppLayoutBody | null>(null)
  const dragging = useRef(false)
  const endedAt = useRef(0)

  // Mouse, not pointer: a finger's pointer events would start a drag while
  // scrolling; touch waits for a long press instead.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const view = draft ? withLayout(list, draft) : list
  const current = draft ?? layoutOf(list)

  const nameOf = (id: UniqueIdentifier) => {
    const key = keyOf(id)
    if (kindOf(id) === "app") {
      return list.items.find((a) => a.id === key)?.name ?? "the service"
    }
    return (
      list.categories.find((c) => c.id === key)?.name ??
      (key === "none" ? "Uncategorized" : "the category")
    )
  }

  // A category only lands among categories. A service lands on what's under
  // the pointer: a rail row first, then a service, then the nearest service
  // in the block it's over (or the empty block itself).
  const collide: CollisionDetection = (args) => {
    const of = (kinds: Kind[]) =>
      args.droppableContainers.filter((c) => kinds.includes(kindOf(c.id)))
    if (kindOf(args.active.id) === "cat") {
      return closestCenter({ ...args, droppableContainers: of(["cat"]) })
    }
    const refine = (hits: ReturnType<CollisionDetection>) => {
      const first = hits[0]
      if (!first || kindOf(first.id) !== "group") return hits
      const g = current.groups.find((g) => groupKey(g) === keyOf(first.id))
      const inside = of(["app"]).filter((c) => g?.app_ids.includes(keyOf(c.id)))
      return inside.length > 0
        ? closestCenter({ ...args, droppableContainers: inside })
        : [first]
    }
    if (!args.pointerCoordinates) {
      // Keyboard: the arrow keys put the item on a place; take the nearest.
      return refine(
        closestCorners({
          ...args,
          droppableContainers: of(["app", "group", "cat", "rail"]),
        }),
      )
    }
    const hits = pointerWithin({
      ...args,
      droppableContainers: of(["app", "group", "cat", "rail"]),
    })
    const pick = (kinds: Kind[]) =>
      hits.find((h) => kinds.includes(kindOf(h.id)))
    const rail = pick(["cat", "rail"])
    if (rail) return [rail]
    const app = pick(["app"])
    if (app) return [app]
    const group = pick(["group"])
    return group ? refine([group]) : []
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    dragging.current = true
    startDraft.current = draft
    setActive({
      kind: kindOf(active.id) as Active["kind"],
      id: keyOf(active.id),
    })
    setDraft(current)
  }

  // A service crossing into another block moves there now, so the blocks
  // make room for it; inside one block the sortable list shows the gap.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !draft || kindOf(active.id) !== "app") return
    const id = keyOf(active.id)
    const from = groupOf(draft, id)
    if (kindOf(over.id) === "app") {
      const to = groupOf(draft, keyOf(over.id))
      if (to < 0 || to === from) return
      const rect = active.rect.current.translated
      const after =
        !!rect &&
        (rect.top > over.rect.top + over.rect.height / 2 ||
          (rect.top >= over.rect.top &&
            rect.left > over.rect.left + over.rect.width / 2))
      const index = draft.groups[to].app_ids.indexOf(keyOf(over.id))
      setDraft(moveApp(draft, id, to, index + (after ? 1 : 0)))
    } else if (kindOf(over.id) === "group") {
      const to = draft.groups.findIndex((g) => groupKey(g) === keyOf(over.id))
      if (to < 0 || to === from) return
      setDraft(moveApp(draft, id, to, draft.groups[to].app_ids.length))
    }
  }

  const finish = () => {
    dragging.current = false
    endedAt.current = performance.now()
    setActive(undefined)
  }

  // What's on screen when the item is let go is what gets saved.
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    finish()
    let next = draft ?? layoutOf(list)
    const id = keyOf(active.id)
    if (kindOf(active.id) === "cat") {
      if (over && kindOf(over.id) === "cat") {
        next = {
          ...next,
          categories: arrayMove(
            next.categories,
            next.categories.indexOf(id),
            next.categories.indexOf(keyOf(over.id)),
          ),
        }
      }
    } else if (over && ["cat", "rail"].includes(kindOf(over.id))) {
      // Dropped on a rail row: to the end of that category.
      const to = next.groups.findIndex((g) => groupKey(g) === keyOf(over.id))
      if (to >= 0) next = moveApp(next, id, to, next.groups[to].app_ids.length)
    } else if (over && kindOf(over.id) === "app") {
      const g = groupOf(next, id)
      const ids = next.groups[g]?.app_ids ?? []
      const to = ids.indexOf(keyOf(over.id))
      if (to >= 0) {
        next = moveApp(next, id, g, to)
      }
    }
    if (same(next, layoutOf(list))) {
      setDraft(null)
      return
    }
    setDraft(next)
    setLayout.mutate(next, {
      onSettled: () => {
        if (!dragging.current) setDraft(null)
      },
    })
  }

  const onDragCancel = () => {
    finish()
    setDraft(startDraft.current)
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} is over ${nameOf(over.id)}.`
        : `${nameOf(active.id)} is no longer over a place to drop.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} was dropped on ${nameOf(over.id)}.`
        : `${nameOf(active.id)} was dropped.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was canceled.`,
  }

  const activeApp =
    active?.kind === "app"
      ? view.items.find((a) => a.id === active.id)
      : undefined
  const activeCategory =
    active?.kind === "cat"
      ? view.categories.find((c) => c.id === active.id)
      : undefined

  return (
    <DndState.Provider value={{ enabled, active, endedAt }}>
      <DndContext
        id="services-layout"
        sensors={sensors}
        collisionDetection={collide}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To move this service, press Space or Enter. Use the arrow keys to move it, then Space or Enter to drop it, or Escape to cancel.",
          },
        }}
      >
        {children(view)}
        <DragOverlay dropAnimation={null}>
          {activeApp ? (
            <div className="flex size-full items-center gap-3 rounded-2xl border border-border bg-card px-4 shadow-md">
              <AppLogo app={activeApp} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-body-sm font-medium">
                  {activeApp.name}
                </span>
                <span className="block truncate text-caption text-ash">
                  {shortAddress(activeApp.address)}
                </span>
              </span>
            </div>
          ) : activeCategory ? (
            <div className="flex size-full items-center gap-2 rounded-lg border border-border bg-card px-2 text-body-sm shadow-md">
              <span
                className={cn(
                  "mx-1 size-2 shrink-0 rounded-full",
                  colorOf(activeCategory.color).dot,
                )}
              />
              <span className="truncate">{activeCategory.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DndState.Provider>
  )
}

// Is a service being dragged right now (so empty blocks show as targets)?
export function useDraggingApp() {
  return useDnd().active?.kind === "app"
}

// One category's services, sortable among themselves.
export function SortableApps({
  group,
  grid,
  children,
}: {
  group: AppGroup
  grid?: boolean
  children: ReactNode
}) {
  return (
    <SortableContext
      id={groupKeyOf(group)}
      items={group.apps.map((a) => `app:${a.id}`)}
      strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}
    >
      {children}
    </SortableContext>
  )
}

// A category's block on the page, a place to drop when it's empty or the
// pointer is between its services.
export function useGroupDrop(group: AppGroup) {
  const { enabled, active } = useDnd()
  const drop = useDroppable({
    id: `group:${groupKeyOf(group)}`,
    disabled: !enabled,
  })
  return { ref: drop.setNodeRef, over: drop.isOver && active?.kind === "app" }
}

// One service. Mouse and touch can start from `pointer` (the whole tile, or
// the handle); the keys only from `handle`, so Enter on a tile's link still
// opens it. `onClickCapture` keeps the click that ends a drag from opening
// the link (the drag library only stops it propagating).
export function useSortableApp(app: App) {
  const { enabled, endedAt } = useDnd()
  const s = useSortable({ id: `app:${app.id}`, disabled: !enabled })
  const { onKeyDown, ...pointer } = s.listeners ?? {}
  return {
    enabled,
    ref: s.setNodeRef,
    style: {
      transform: CSS.Translate.toString(s.transform),
      transition: s.transition,
    },
    dragging: s.isDragging,
    pointer: enabled ? pointer : {},
    handle: enabled
      ? {
          ref: s.setActivatorNodeRef,
          ...s.attributes,
          onKeyDown: onKeyDown as KeyboardEventHandler | undefined,
        }
      : undefined,
    onClickCapture: (e: MouseEvent) => {
      if (performance.now() - endedAt.current < 300) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
  }
}

// A category row in the rail: sorted by mouse or touch (the keys keep
// selecting it; Move up / Move down in its menu do the same), and a place to
// drop a service.
export function useSortableCategory(id: string) {
  const { enabled, active } = useDnd()
  const s = useSortable({ id: `cat:${id}`, disabled: !enabled })
  const { onKeyDown: _, ...pointer } = s.listeners ?? {}
  return {
    ref: s.setNodeRef,
    style: {
      transform: CSS.Translate.toString(s.transform),
      transition: s.transition,
    },
    dragging: s.isDragging,
    pointer: enabled ? pointer : {},
    target: s.isOver && active?.kind === "app",
  }
}

// The rail's Uncategorized row as a place to drop a service; it shows while
// one is dragged even when nothing is uncategorized.
export function useUncategorizedDrop() {
  const { enabled, active } = useDnd()
  const drop = useDroppable({ id: "rail:none", disabled: !enabled })
  return {
    ref: drop.setNodeRef,
    target: drop.isOver && active?.kind === "app",
    draggingApp: active?.kind === "app",
  }
}
