"use client"

import {
  Activity,
  Ellipsis,
  LoaderCircle,
  Pencil,
  SquareTerminal,
  Star,
  Terminal,
} from "lucide-react"
import Link from "next/link"
import type { ReactElement, ReactNode } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  address,
  OsTile,
  osLabel,
  StatusDot,
  statusMeta,
} from "../../components/meta"
import { useServerActions } from "../../components/server-actions"
import { ServerMenuItems } from "../../components/server-menu"
import { serversHref } from "../../components/use-filters"
import { PowerMenu } from "./power/power"
import { PowerBanner } from "./power/power-banner"
import { sectionHref } from "./sections"
import { useServerPage } from "./server-page"
import { StatusBanner } from "./status-banner"

// Desktop: the server's header across the top, then the current section at
// full width; its sections are in the sidebar (components/panel/
// server-sidebar.tsx). A `bleed` section fills the rest of the window, flush
// with its edges.
export function DesktopChrome({ children }: { children: ReactNode }) {
  const { section } = useServerPage()
  if (section.bleed) {
    return (
      <div className="flex h-[calc(100svh-3rem-1px)] min-h-[32rem] flex-col">
        <ServerHeader />
        <StatusBanner className="mx-6 mt-4 shrink-0" />
        <PowerBanner className="mx-6 mt-4 shrink-0" />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    )
  }
  return (
    <>
      <ServerHeader />
      <div className="flex w-full min-w-0 flex-col gap-5 px-6 pt-5 pb-24">
        <StatusBanner />
        <PowerBanner />
        {children}
      </div>
    </>
  )
}

function ServerHeader() {
  const { server, checking, onDeleted, can } = useServerPage()
  const actions = useServerActions()

  return (
    <div className="flex w-full items-center gap-4 border-b border-border px-6 py-4">
      <OsTile os={server.os} className="size-12 rounded-2xl text-body-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-subheading font-medium">
            {server.name}
          </h1>
          {can("operator") && (
            <button
              type="button"
              aria-label={
                server.favorite ? "Remove from favorites" : "Add to favorites"
              }
              aria-pressed={server.favorite}
              onClick={() => actions.toggleFavorite(server)}
              className="flex size-7 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground"
            >
              <Star
                className={cn(
                  "size-4",
                  server.favorite && "fill-brand text-brand",
                )}
              />
            </button>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 text-foreground">
            <StatusDot status={server.status} checking={checking} />
            {checking ? "Checking…" : statusMeta[server.status].label}
            {!checking &&
              server.status === "online" &&
              server.latency_ms != null && (
                <span className="text-muted-foreground">
                  {server.latency_ms} ms
                </span>
              )}
          </span>
          <span className="font-mono text-caption">{address(server)}</span>
          {server.os.id && <span>{osLabel(server.os)}</span>}
          {server.tags.length > 0 && (
            <span className="flex gap-1">
              {server.tags.map((tag) => (
                <Link
                  key={tag}
                  href={serversHref("/servers", { tag: [tag] })}
                  className="rounded-full bg-muted px-2 text-caption leading-5 hover:bg-mist hover:text-foreground"
                >
                  {tag}
                </Link>
              ))}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {can("operator") && (
          <HeaderIcon
            label={checking ? "Checking…" : "Check connection"}
            render={
              <Button
                variant="outline"
                size="icon"
                disabled={checking}
                onClick={() => actions.check(server)}
              />
            }
          >
            {checking ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Activity />
            )}
          </HeaderIcon>
        )}
        <HeaderIcon
          label="Copy SSH command"
          render={
            <Button
              variant="outline"
              size="icon"
              onClick={() => actions.copySsh(server)}
            />
          }
        >
          <Terminal />
        </HeaderIcon>
        {can("owner") && (
          <HeaderIcon
            label="Edit"
            render={
              <Button
                variant="outline"
                size="icon"
                onClick={() => actions.editServer(server)}
              />
            }
          >
            <Pencil />
          </HeaderIcon>
        )}
        {can("operator") && <PowerMenu />}
        {can("engineer") && (
          <HeaderIcon
            label="Open terminal"
            render={
              <Link
                href={sectionHref(server.id, "terminal")}
                className={buttonVariants({ size: "icon" })}
              />
            }
          >
            <SquareTerminal />
          </HeaderIcon>
        )}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="More actions"
                    />
                  }
                />
              }
            >
              <Ellipsis />
            </TooltipTrigger>
            <TooltipContent side="bottom">More</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="min-w-56">
            <ServerMenuItems
              server={server}
              checking={checking}
              onDeleted={onDeleted}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// An icon-only header button (`render`: a Button or Link) named by a tooltip.
function HeaderIcon({
  label,
  render,
  children,
}: {
  label: string
  render: ReactElement
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={render} aria-label={label}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
