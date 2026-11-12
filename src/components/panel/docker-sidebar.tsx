"use client"

import { ArrowLeft, ChevronsUpDown, ServerCog } from "lucide-react"
import Link from "next/link"
import {
  Dot,
  engineName,
  engineStateMeta,
  fleetOs,
} from "@/app/(panel)/containers/components/meta"
import { setDockerEnv, useDockerEnv } from "@/app/(panel)/containers/env"
import { OsTile } from "@/app/(panel)/servers/components/meta"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { dockerGroups, dockerPageFor } from "./nav"
import { NavEntry } from "./nav-entry"

// The Containers menu that takes the sidebar's place under /containers:
// a way back to the main menu, the environment (server) every page works
// on, then the section's pages.
export function DockerSidebarContent({
  pathname,
  onBack,
}: {
  pathname: string
  onBack: () => void
}) {
  const current = dockerPageFor(pathname)?.href

  return (
    <SidebarContent className="animate-in duration-200 slide-in-from-end-4 fade-in">
      <SidebarGroup className="pb-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Main menu"
              onClick={onBack}
              className="text-muted-foreground"
            >
              <ArrowLeft className="rtl:rotate-180" />
              <span>Main menu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <EnvSwitcher />
        </SidebarMenu>
      </SidebarGroup>
      <SidebarSeparator className="mx-2" />

      {dockerGroups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <NavEntry
                key={item.href}
                item={item}
                pathname={pathname}
                active={
                  item.href === current ||
                  !!item.children?.some((c) => c.href === current)
                }
                current={current}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </SidebarContent>
  )
}

// Which server's engine the Containers pages show, like Arcane's
// environment picker. Remembered per browser.
function EnvSwitcher() {
  const { fleet, servers, server } = useDockerEnv()

  if (fleet.isPending) {
    return (
      <SidebarMenuItem>
        <Skeleton className="h-12 rounded-lg group-data-[collapsible=icon]:size-8" />
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              size="lg"
              tooltip={server ? `Environment · ${server.name}` : "Environment"}
              className="data-popup-open:bg-sidebar-accent"
            />
          }
        >
          {server ? (
            <OsTile
              os={fleetOs(server)}
              className="size-8 group-data-[collapsible=icon]:mx-auto"
            />
          ) : (
            <ServerCog />
          )}
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate font-medium">
              {server?.name ?? "No environment"}
            </span>
            <span className="flex items-center gap-1.5 truncate text-caption text-muted-foreground">
              {server ? (
                <>
                  <Dot tone={engineStateMeta[server.state].tone} />
                  {server.state === "ready"
                    ? `${engineName(server)} ${server.version ?? ""}`
                    : engineStateMeta[server.state].label}
                </>
              ) : (
                "No server runs Docker"
              )}
            </span>
          </span>
          <ChevronsUpDown className="ms-auto text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-64" side="right" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Environments</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={server?.server_id ?? ""}
              onValueChange={(id) => setDockerEnv(id as string)}
            >
              {servers.map((s) => {
                const meta = engineStateMeta[s.state]
                return (
                  <DropdownMenuRadioItem key={s.server_id} value={s.server_id}>
                    <OsTile os={fleetOs(s)} className="size-6" />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-caption text-muted-foreground">
                      <Dot tone={meta.tone} />
                      {s.state === "ready"
                        ? `${s.running}/${s.total}`
                        : meta.label}
                    </span>
                  </DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuRadioGroup>
            {servers.length === 0 && (
              <p className="px-1.5 py-1 text-body-sm text-muted-foreground">
                No server you can reach runs Docker or Podman.
              </p>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/containers/environments" />}>
            <ServerCog />
            All environments
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
