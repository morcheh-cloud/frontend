"use client"

import { ArrowLeft, ChevronsUpDown, Server, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"
import {
  type Section,
  sectionFor,
  sectionHref,
  sectionMin,
  sectionsFor,
  settingsSection,
} from "@/app/(panel)/servers/[id]/components/sections"
import { useServer, useServers } from "@/app/(panel)/servers/api"
import {
  OsTile,
  StatusDot,
  statusMeta,
} from "@/app/(panel)/servers/components/meta"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { scrollActiveIntoView } from "./scroll-active"

// /servers/<id>[/<section>…]: the id of the server page the path is on, and
// the section. Other /servers/* pages (folders, insights) don't match.
const SERVER_PATH =
  /^\/servers\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/([^/]+))?/i

export function serverPageOf(pathname: string) {
  const m = SERVER_PATH.exec(pathname)
  return m ? { id: m[1], slug: m[2] ?? "" } : null
}

// The server's sections that take the sidebar's place on a server page (like
// the Containers menu): a way back to the main menu, which server this is
// (and a switch to another), then its sections by group, Settings at the foot.
export function ServerSidebarContent({
  pathname,
  onBack,
}: {
  pathname: string
  onBack: () => void
}) {
  const page = serverPageOf(pathname)
  const id = page?.id ?? ""
  const slug = page?.slug ?? ""
  const server = useServer(id).data
  const { serverLevel } = useAccess()
  const level = server ? serverLevel(server.id, server.workspace_id) : null

  // On a short window the menu scrolls: keep the current section in sight.
  const box = useRef<HTMLDivElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rerun when the current section or the list changes
  useEffect(() => {
    scrollActiveIntoView(box.current)
  }, [slug, level])

  // Built sections only: the unbuilt ones are listed on the phone overview.
  const groups = level
    ? sectionsFor(level)
        .map((g) => ({ ...g, sections: g.sections.filter((s) => s.ready) }))
        .filter((g) => g.sections.length > 0)
    : []

  return (
    <SidebarContent
      ref={box}
      className="animate-in duration-200 slide-in-from-end-4 fade-in"
    >
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
          <ServerSwitcher id={id} slug={slug} />
        </SidebarMenu>
      </SidebarGroup>
      <SidebarSeparator className="mx-2" />

      {!level &&
        [0, 1, 2].map((i) => (
          <SidebarGroup key={i}>
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-24 rounded-lg" />
          </SidebarGroup>
        ))}

      {groups.map((group) => (
        <SidebarGroup key={group.label ?? "main"} className="py-1">
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarMenu>
            {group.sections.map((section) => (
              <SectionEntry
                key={section.slug}
                id={id}
                section={section}
                active={section.slug === slug}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}

      {level && atLeast(level, sectionMin(settingsSection)) && (
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SectionEntry
              id={id}
              section={settingsSection}
              active={slug === settingsSection.slug}
            />
          </SidebarMenu>
        </SidebarGroup>
      )}
    </SidebarContent>
  )
}

function SectionEntry({
  id,
  section,
  active,
}: {
  id: string
  section: Section
  active: boolean
}) {
  const Icon = section.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={sectionHref(id, section.slug)} />}
        isActive={active}
        tooltip={section.label}
      >
        <Icon />
        <span>{section.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// Which server this is, and a quick switch to another one on the same
// section (when that one can open it).
function ServerSwitcher({ id, slug }: { id: string; slug: string }) {
  const server = useServer(id).data

  if (!server) {
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
              tooltip={server.name}
              className="data-popup-open:bg-sidebar-accent"
            />
          }
        >
          <OsTile
            os={server.os}
            className="size-8 group-data-[collapsible=icon]:mx-auto"
          />
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate font-medium">{server.name}</span>
            <span className="flex items-center gap-1.5 truncate text-caption text-muted-foreground">
              <StatusDot status={server.status} />
              {statusMeta[server.status].label}
            </span>
          </span>
          <ChevronsUpDown className="ms-auto text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-64" side="right" align="start">
          <OtherServers current={id} slug={slug} />
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/servers" />}>
            <Server />
            All servers
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

// Loaded only while the switcher is open.
function OtherServers({ current, slug }: { current: string; slug: string }) {
  const list = useServers({ limit: 30 })
  const items = [...(list.data?.items ?? [])].sort(
    (a, b) => Number(b.favorite) - Number(a.favorite),
  )
  // Keep the section when switching, unless it's one that isn't built.
  const target = sectionFor(slug)?.ready ? slug : ""

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Servers</DropdownMenuLabel>
      {list.isPending &&
        [0, 1, 2].map((i) => <Skeleton key={i} className="mx-1.5 my-1 h-7" />)}
      <div className="max-h-80 overflow-y-auto">
        {items.map((s) => (
          <DropdownMenuItem
            key={s.id}
            render={<Link href={sectionHref(s.id, target)} />}
            className={s.id === current ? "bg-accent" : undefined}
          >
            <OsTile os={s.os} className="size-6" />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            {s.favorite && <Star className="fill-brand text-brand" />}
            <StatusDot status={s.status} />
          </DropdownMenuItem>
        ))}
      </div>
    </DropdownMenuGroup>
  )
}
