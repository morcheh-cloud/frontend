"use client"

import { Inbox, Layers, Pencil, Plus, Siren, Trash2 } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { App, AppCategory } from "@/lib/services"
import { cn } from "@/lib/utils"
import { ItemMenu } from "../../servers/[id]/components/parts"
import { useAppActions } from "./app-actions"
import { colorOf, useAppFilters } from "./meta"
import { useAppLayoutCan } from "./permissions"

const rowClass =
  "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-body-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=true]:bg-muted aria-[current=true]:font-medium aria-[current=true]:text-foreground"

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
          <ul className="flex flex-col gap-0.5">
            {sorted.map((c) => (
              <ViewRow
                key={c.id}
                icon={
                  <span
                    className={cn(
                      "mx-1 size-2 shrink-0 rounded-full",
                      colorOf(c.color).dot,
                    )}
                  />
                }
                label={c.name}
                count={items.filter((a) => a.category_id === c.id).length}
                current={cat === c.id}
                onClick={() => setCat(c.id)}
                menu={
                  layoutCan && (
                    <ItemMenu
                      label={`Actions for ${c.name}`}
                      groups={[
                        [
                          {
                            key: "edit",
                            label: "Edit category",
                            icon: <Pencil />,
                            onSelect: () => a.editCategory(c),
                          },
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
                      ]}
                    />
                  )
                }
              />
            ))}
            {loose > 0 && (
              <ViewRow
                icon={<Inbox />}
                label="Uncategorized"
                count={loose}
                current={cat === "none"}
                onClick={() => setCat("none")}
              />
            )}
          </ul>
        </div>
      )}
    </nav>
  )
}

function ViewRow({
  icon,
  label,
  count,
  current,
  onClick,
  menu,
}: {
  icon: ReactNode
  label: string
  count: number
  current: boolean
  onClick: () => void
  menu?: ReactNode
}) {
  return (
    <li className="group/row relative">
      <button
        type="button"
        aria-current={current}
        onClick={onClick}
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
