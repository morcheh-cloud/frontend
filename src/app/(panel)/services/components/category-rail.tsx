"use client"

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  ArrowDown,
  ArrowUp,
  Inbox,
  Layers,
  Pencil,
  Plus,
  Siren,
  Trash2,
} from "lucide-react"
import type { CSSProperties, ReactNode, Ref } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { App, AppCategory } from "@/lib/services"
import { cn } from "@/lib/utils"
import { type Item, ItemMenu } from "../../servers/[id]/components/parts"
import { layoutOf, useSetLayout } from "../api"
import { useAppActions } from "./app-actions"
import { useSortableCategory, useUncategorizedDrop } from "./layout-dnd"
import { colorOf, useAppFilters } from "./meta"
import { useAppLayoutCan } from "./permissions"

const rowClass =
  "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-body-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=true]:bg-muted aria-[current=true]:font-medium aria-[current=true]:text-foreground data-target:bg-brand-soft data-target:text-brand-strong"

// Desktop: the views and categories beside the services.
export function CategoryRail({
  items,
  categories,
}: {
  items: App[]
  categories: AppCategory[]
}) {
  const { cat, setCat, critical, setCritical } = useAppFilters()
  const known = new Set(categories.map((c) => c.id))
  const loose = items.filter(
    (a) => !a.category_id || !known.has(a.category_id),
  ).length
  const sorted = [...categories].sort((a, b) => a.position - b.position)
  const layoutCan = useAppLayoutCan()
  const a = useAppActions()
  const none = useUncategorizedDrop()
  const setLayout = useSetLayout()

  // The keyboard's way to sort categories (dragging is the mouse's).
  const move = (id: string, by: number) => {
    const layout = layoutOf({ items, categories })
    const from = layout.categories.indexOf(id)
    setLayout.mutate({
      ...layout,
      categories: arrayMove(layout.categories, from, from + by),
    })
  }
  const categoryMenu = (c: AppCategory, i: number): Item[][] => [
    [
      {
        key: "edit",
        label: "Edit category",
        icon: <Pencil />,
        onSelect: () => a.editCategory(c),
      },
    ],
    [
      ...(i > 0
        ? [
            {
              key: "up",
              label: "Move up",
              icon: <ArrowUp />,
              onSelect: () => move(c.id, -1),
            },
          ]
        : []),
      ...(i < sorted.length - 1
        ? [
            {
              key: "down",
              label: "Move down",
              icon: <ArrowDown />,
              onSelect: () => move(c.id, 1),
            },
          ]
        : []),
    ],
    [
      {
        key: "remove",
        label: "Delete category",
        icon: <Trash2 />,
        destructive: true,
        onSelect: () => a.removeCategory(c),
      },
    ],
  ]

  return (
    <nav aria-label="Categories" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-0.5">
        <ViewRow
          icon={<Layers />}
          label="All services"
          count={items.length}
          current={!cat && !critical}
          onClick={() => setCat(null)}
        />
        <ViewRow
          icon={<Siren />}
          label="Critical"
          count={items.filter((a) => a.critical).length}
          current={critical}
          onClick={() => setCritical(true)}
        />
      </ul>
      {(sorted.length > 0 || loose > 0 || layoutCan) && (
        <div className="flex flex-col gap-1">
          <div className="flex h-7 items-center justify-between ps-2">
            <h2 className="font-label text-caption tracking-label text-ash uppercase">
              Categories
            </h2>
            {layoutCan && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="New category"
                      onClick={a.addCategory}
                    />
                  }
                >
                  <Plus />
                </TooltipTrigger>
                <TooltipContent>New category</TooltipContent>
              </Tooltip>
            )}
          </div>
          <SortableContext
            items={sorted.map((c) => `cat:${c.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-0.5">
              {sorted.map((c, i) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  count={items.filter((a) => a.category_id === c.id).length}
                  current={cat === c.id}
                  onClick={() => setCat(c.id)}
                  menu={
                    layoutCan && (
                      <ItemMenu
                        label={`Actions for ${c.name}`}
                        groups={categoryMenu(c, i)}
                      />
                    )
                  }
                />
              ))}
              {(loose > 0 || none.draggingApp) && (
                <ViewRow
                  ref={none.ref}
                  target={none.target}
                  icon={<Inbox />}
                  label="Uncategorized"
                  count={loose}
                  current={cat === "none"}
                  onClick={() => setCat("none")}
                />
              )}
            </ul>
          </SortableContext>
        </div>
      )}
    </nav>
  )
}

// A category: dragged by mouse or touch to sort, and a place to drop a
// service.
function CategoryRow({
  category,
  ...row
}: {
  category: AppCategory
  count: number
  current: boolean
  onClick: () => void
  menu?: ReactNode
}) {
  const s = useSortableCategory(category.id)
  return (
    <ViewRow
      {...row}
      ref={s.ref}
      style={s.style}
      pointer={s.pointer}
      target={s.target}
      className={cn(s.dragging && "opacity-40")}
      icon={
        <span
          className={cn(
            "mx-1 size-2 shrink-0 rounded-full",
            colorOf(category.color).dot,
          )}
        />
      }
      label={category.name}
    />
  )
}

function ViewRow({
  icon,
  label,
  count,
  current,
  onClick,
  menu,
  ref,
  style,
  pointer,
  target,
  className,
}: {
  icon: ReactNode
  label: string
  count: number
  current: boolean
  onClick: () => void
  menu?: ReactNode
  ref?: Ref<HTMLLIElement>
  style?: CSSProperties
  pointer?: object
  target?: boolean
  className?: string
}) {
  return (
    <li ref={ref} style={style} className={cn("group/row relative", className)}>
      <button
        type="button"
        aria-current={current}
        data-target={target || undefined}
        onClick={onClick}
        {...pointer}
        className={cn(rowClass, "[&_svg]:size-4")}
      >
        {icon}
        <span className="flex-1 truncate text-start">{label}</span>
        <span
          className={cn(
            "min-w-6 text-end text-caption text-ash tabular-nums",
            menu &&
              "group-focus-within/row:invisible group-hover/row:invisible group-has-data-popup-open/row:invisible [@media(hover:none)]:invisible",
          )}
        >
          {count}
        </span>
      </button>
      {menu && (
        <span className="absolute end-0.5 top-0.5 opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 has-data-popup-open:opacity-100 [&_button]:size-7 [@media(hover:none)]:opacity-100">
          {menu}
        </span>
      )}
    </li>
  )
}
