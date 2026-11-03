"use client"

import { Inbox, Layers, Siren } from "lucide-react"
import type { ReactNode } from "react"

import type { App, AppCategory } from "@/lib/services"
import { cn } from "@/lib/utils"
import { colorOf, useAppFilters } from "./meta"

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
      {(sorted.length > 0 || loose > 0) && (
        <div className="flex flex-col gap-1">
          <h2 className="px-2 font-label text-caption tracking-label text-ash uppercase">
            Categories
          </h2>
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
}: {
  icon: ReactNode
  label: string
  count: number
  current: boolean
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={current}
        onClick={onClick}
        className={cn(rowClass, "[&_svg]:size-4")}
      >
        {icon}
        <span className="flex-1 truncate text-start">{label}</span>
        <span className="text-caption text-ash tabular-nums">{count}</span>
      </button>
    </li>
  )
}
