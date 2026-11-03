"use client"

import { ExternalLink } from "lucide-react"
import { Fragment, type ReactNode } from "react"

import type { App } from "@/lib/services"
import { cn } from "@/lib/utils"
import { AppMenu } from "./app-menu"
import { type AppGroup, AppLogo, colorOf, safeHref, shortAddress } from "./meta"

// The same services as the old spreadsheet: one row each, grouped by
// category.
export function TableView({ groups }: { groups: AppGroup[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Service</Th>
            <Th>Address</Th>
            <Th>Username</Th>
            <Th>Password</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {groups.map((g) => (
            <Fragment key={g.category?.id ?? "none"}>
              <tr className="bg-subtle">
                <th
                  scope="colgroup"
                  colSpan={5}
                  className="h-9 px-3 text-start font-label text-caption font-normal tracking-label text-ash uppercase"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        g.category ? colorOf(g.category.color).dot : "bg-mist",
                      )}
                    />
                    {g.category?.name ?? "Uncategorized"}
                    <span className="tabular-nums">{g.apps.length}</span>
                  </span>
                </th>
              </tr>
              {g.apps.map((app) => (
                <Row key={app.id} app={app} />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn("h-10 px-3 text-start font-medium", className)}
    >
      {children}
    </th>
  )
}

function Row({ app }: { app: App }) {
  const href = safeHref(app.address)
  const [first, ...rest] = app.accounts

  return (
    <tr className="h-14 hover:bg-subtle">
      <td className="max-w-72 px-3">
        <span className="flex items-center gap-3">
          <AppLogo app={app} size={28} />
          <span className="truncate font-medium">{app.name}</span>
          {app.critical && (
            <span
              role="img"
              aria-label="Critical"
              title="Critical"
              className="size-1.5 shrink-0 rounded-full bg-destructive"
            />
          )}
        </span>
      </td>
      <td className="max-w-80 px-3">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-brand-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="truncate">{shortAddress(app.address)}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          <span className="block truncate text-muted-foreground">
            {app.address}
          </span>
        )}
      </td>
      <td className="max-w-56 px-3">
        {first && (
          <span className="flex items-center gap-2">
            <span className="truncate font-mono text-caption">
              {first.username}
            </span>
            {rest.length > 0 && (
              <span
                title={`${app.accounts.length} accounts`}
                className="shrink-0 rounded-full bg-muted px-1.5 text-caption text-muted-foreground tabular-nums"
              >
                +{rest.length}
              </span>
            )}
          </span>
        )}
      </td>
      <td className="px-3" />
      <td className="pe-3 text-end">
        <AppMenu app={app} />
      </td>
    </tr>
  )
}
