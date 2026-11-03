"use client"

import type { App } from "@/lib/services"
import { cn } from "@/lib/utils"
import { type AppGroup, AppLogo, colorOf, safeHref, shortAddress } from "./meta"

// Services as tiles, one block per category. A tile opens the service in a
// new tab; an address that isn't plain http(s) stays a dead tile.
export function TileView({ groups }: { groups: AppGroup[] }) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section
          key={g.category?.id ?? "none"}
          aria-label={g.category?.name ?? "Uncategorized"}
        >
          <GroupHeading group={g} />
          <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {g.apps.map((app) => (
              <li key={app.id}>
                <Tile app={app} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function GroupHeading({ group }: { group: AppGroup }) {
  return (
    <h2 className="flex items-center gap-2 font-label text-caption tracking-label text-ash uppercase">
      <span
        className={cn(
          "size-2 rounded-full",
          group.category ? colorOf(group.category.color).dot : "bg-mist",
        )}
      />
      {group.category?.name ?? "Uncategorized"}
      <span className="tabular-nums">{group.apps.length}</span>
    </h2>
  )
}

function Tile({ app }: { app: App }) {
  const href = safeHref(app.address)
  const body = (
    <>
      <AppLogo app={app} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body-sm font-medium">{app.name}</span>
          {app.critical && (
            <span
              role="img"
              aria-label="Critical"
              title="Critical"
              className="size-1.5 shrink-0 rounded-full bg-destructive"
            />
          )}
        </span>
        <span className="block truncate text-caption text-ash">
          {shortAddress(app.address)}
        </span>
      </span>
    </>
  )
  const box =
    "flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm outline-none"

  if (!href) {
    return (
      <div className={box} title="Not an http(s) address">
        {body}
      </div>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        box,
        "transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      {body}
    </a>
  )
}
