"use client"

import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"
import {
  ArrowLeft,
  ArrowRight,
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

const chipClass =
  "flex h-8 items-center gap-1.5 rounded-full border border-border ps-3 pe-2 text-body-sm font-medium whitespace-nowrap text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=true]:border-brand/30 aria-[current=true]:bg-brand-soft aria-[current=true]:text-brand-strong data-target:border-brand data-target:bg-brand-soft data-target:text-brand-strong"

// Desktop: the views and categories as one row of chips above the services,
// so the services get the page's whole width.
export function CategoryBar({
  items,
  categories,
  className,
}: {
  items: App[]
  categories: AppCategory[]
  className?: string
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
              key: "left",
              label: "Move left",
              icon: <ArrowLeft />,
              onSelect: () => move(c.id, -1),
            },
          ]
        : []),
      ...(i < sorted.length - 1
        ? [
            {
              key: "right",
              label: "Move right",
              icon: <ArrowRight />,
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
    <nav
      aria-label="Categories"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      <ul className="contents">
        <Chip
          icon={<Layers />}
          label="All services"
          count={items.length}
          current={!cat && !critical}
          onClick={() => setCat(null)}
        />
        <Chip
          icon={<Siren />}
          label="Critical"
          count={items.filter((a) => a.critical).length}
          current={critical}
          onClick={() => setCritical(true)}
        />
      </ul>
      {(sorted.length > 0 || loose > 0 || layoutCan) && (
        <span aria-hidden className="mx-1.5 h-5 w-px bg-border" />
      )}
      <SortableContext
        items={sorted.map((c) => `cat:${c.id}`)}
        strategy={rectSortingStrategy}
      >
        <ul className="contents">
          {sorted.map((c, i) => (
            <CategoryChip
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
            <Chip
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
      {layoutCan && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="New category"
                className="rounded-full border border-dashed border-mist text-muted-foreground"
                onClick={a.addCategory}
              />
            }
          >
            <Plus />
          </TooltipTrigger>
          <TooltipContent>New category</TooltipContent>
        </Tooltip>
      )}
    </nav>
  )
}

// A category: dragged by mouse or touch to sort, and a place to drop a
// service.
function CategoryChip({
  category,
  ...chip
}: {
  category: AppCategory
  count: number
  current: boolean
  onClick: () => void
  menu?: ReactNode
}) {
  const s = useSortableCategory(category.id)
  return (
    <Chip
      {...chip}
      ref={s.ref}
      style={s.style}
      pointer={s.pointer}
      target={s.target}
      className={cn(s.dragging && "opacity-40")}
      icon={
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            colorOf(category.color).dot,
          )}
        />
      }
      label={category.name}
    />
  )
}

function Chip({
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
    <li
      ref={ref}
      style={style}
      className={cn("group/chip relative", className)}
    >
      <button
        type="button"
        aria-current={current}
        data-target={target || undefined}
        onClick={onClick}
        {...pointer}
        className={cn(chipClass, "[&_svg]:size-4")}
      >
        {icon}
        <span className="max-w-48 truncate">{label}</span>
        {/* The menu takes the count's place on hover or focus. */}
        <span
          className={cn(
            "min-w-5 text-center text-caption font-normal tabular-nums opacity-70",
            menu &&
              "group-focus-within/chip:invisible group-hover/chip:invisible group-has-data-popup-open/chip:invisible [@media(hover:none)]:invisible",
          )}
        >
          {count}
        </span>
      </button>
      {menu && (
        <span className="absolute end-1 top-1/2 -translate-y-1/2 opacity-0 group-focus-within/chip:opacity-100 group-hover/chip:opacity-100 has-data-popup-open:opacity-100 [&_button]:size-6 [&_button]:rounded-full [@media(hover:none)]:opacity-100">
          {menu}
        </span>
      )}
    </li>
  )
}
