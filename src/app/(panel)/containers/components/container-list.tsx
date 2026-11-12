"use client"

import {
  ChevronDown,
  CircleStop,
  Ellipsis,
  FolderGit2,
  Loader2,
  Play,
  RotateCw,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useOpen } from "@/hooks/useOpen"
import type { DockerContainer } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  type Item,
  ItemMenu,
  SheetItems,
} from "../../servers/[id]/components/parts"
import { useContainerMenu, useDockerActions } from "./docker-actions"
import {
  ContainerState,
  containerHref,
  Dot,
  dockerHref,
  imageName,
  isProblem,
  type ProjectGroup,
  portText,
  publishedPorts,
  stateOf,
} from "./meta"
import { type DockerCan, useDockerCan } from "./permissions"

// Where each server's containers live: workspace (for access), name and
// address (for the server column and port links).
export type ServerInfo = {
  workspace?: string
  name?: string
  address?: string
}

type ListProps = {
  // One group per compose project, or one unnamed group for a flat list.
  groups: ProjectGroup[]
  servers: Map<string, ServerInfo>
  // The fleet view shows which server each container is on.
  showServer?: boolean
  selected?: Set<string>
  onSelect?: (ids: string[], on: boolean) => void
}

// --- Desktop ---------------------------------------------------------------

export function ContainersTable({
  groups,
  servers,
  showServer = false,
  selected,
  onSelect,
}: ListProps) {
  const selectable = Boolean(selected && onSelect)
  const all = groups.flatMap((g) => g.containers)
  const allOn = selectable && all.every((c) => selected?.has(c.id))
  const someOn = selectable && all.some((c) => selected?.has(c.id))
  const grouped = groups.length > 1 || Boolean(groups[0]?.project)
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border [contain:inline-size]">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr>
              {selectable && (
                <th scope="col" className="w-10 ps-4">
                  <Checkbox
                    aria-label="Select every container"
                    checked={allOn}
                    indeterminate={someOn && !allOn}
                    onCheckedChange={(on) =>
                      onSelect?.(
                        all.map((c) => c.id),
                        Boolean(on),
                      )
                    }
                  />
                </th>
              )}
              <Th className={cn(!selectable && "ps-4")}>Name</Th>
              <Th>State</Th>
              {showServer && <Th>Server</Th>}
              <Th className="hidden @2xl:table-cell">Image</Th>
              <Th className="hidden @4xl:table-cell">Ports</Th>
              <Th className="hidden @5xl:table-cell">Status</Th>
              <th scope="col" className="w-24 pe-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.key} className="divide-y divide-border">
              {grouped && (
                <GroupHeader
                  group={g}
                  servers={servers}
                  selectable={selectable}
                  selected={selected}
                  onSelect={onSelect}
                  colSpan={5 + Number(showServer)}
                />
              )}
              {g.containers.map((c) => (
                <Row
                  key={`${c.server_id}/${c.id}`}
                  c={c}
                  info={servers.get(c.server_id)}
                  showServer={showServer}
                  selectable={selectable}
                  checked={selected?.has(c.id) ?? false}
                  onCheck={(on) => onSelect?.([c.id], on)}
                  indent={grouped && Boolean(g.project)}
                />
              ))}
            </tbody>
          ))}
        </table>
      </div>
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

function GroupHeader({
  group,
  servers,
  selectable,
  selected,
  onSelect,
  colSpan,
}: {
  group: ProjectGroup
  servers: Map<string, ServerInfo>
  selectable: boolean
  selected?: Set<string>
  onSelect?: (ids: string[], on: boolean) => void
  colSpan: number
}) {
  const server = group.containers[0]?.server_id ?? ""
  const can = useDockerCan(server, servers.get(server)?.workspace)
  const menu = useGroupMenu(server, group, can)
  const ids = group.containers.map((c) => c.id)
  const on = ids.every((id) => selected?.has(id))
  const some = ids.some((id) => selected?.has(id))
  return (
    <tr className="bg-subtle/60">
      {selectable && (
        <td className="ps-4">
          <Checkbox
            aria-label={`Select ${group.project || "containers outside a project"}`}
            checked={on}
            indeterminate={some && !on}
            onCheckedChange={(next) => onSelect?.(ids, Boolean(next))}
          />
        </td>
      )}
      <td colSpan={colSpan} className={cn("px-3 py-2", !selectable && "ps-4")}>
        <GroupTitle group={group} />
      </td>
      <td className="pe-2 text-end">
        <ItemMenu groups={menu} label={`${group.project} actions`} />
      </td>
    </tr>
  )
}

function GroupTitle({ group }: { group: ProjectGroup }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <FolderGit2 className="size-4 shrink-0 text-ash" />
      <span className="truncate font-medium">
        {group.project || "Not in a project"}
      </span>
      <span className="shrink-0 text-caption text-muted-foreground">
        {group.running}/{group.containers.length} running
      </span>
      {group.problems > 0 && (
        <span className="shrink-0 text-caption text-destructive">
          · {group.problems} need{group.problems === 1 ? "s" : ""} a look
        </span>
      )}
      {group.dir && (
        <span
          className="hidden truncate font-mono text-caption text-ash @3xl:inline"
          title="Folder the project was started from"
        >
          {group.dir}
        </span>
      )}
    </div>
  )
}

// Start, stop or restart a whole compose project.
function useGroupMenu(
  server: string,
  group: ProjectGroup,
  can: DockerCan,
): Item[][] {
  const a = useDockerActions()
  if (!can.operate) return []
  const stopped = group.containers.filter(
    (c) => c.state !== "running" && c.state !== "paused",
  )
  const running = group.containers.filter((c) => c.state === "running")
  return [
    [
      {
        key: "start",
        label: `Start ${stopped.length || "all"}`,
        icon: <Play />,
        disabled: stopped.length === 0,
        onSelect: () => a.runMany(server, stopped, "start"),
      },
      {
        key: "stop",
        label: `Stop ${running.length || "all"}`,
        icon: <CircleStop />,
        disabled: running.length === 0,
        onSelect: () => a.runMany(server, running, "stop"),
      },
      {
        key: "restart",
        label: "Restart all",
        icon: <RotateCw />,
        onSelect: () => a.runMany(server, group.containers, "restart"),
      },
    ],
  ]
}

function Row({
  c,
  info,
  showServer,
  selectable,
  checked,
  onCheck,
  indent,
}: {
  c: DockerContainer
  info?: ServerInfo
  showServer: boolean
  selectable: boolean
  checked: boolean
  onCheck: (on: boolean) => void
  indent: boolean
}) {
  const can = useDockerCan(c.server_id, info?.workspace)
  const menu = useContainerMenu(c.server_id, c, can)
  const href = containerHref(c.server_id, c.name)
  const ports = publishedPorts(c.ports)
  return (
    <tr
      className={cn(
        "group/row hover:bg-subtle/60",
        checked && "bg-brand-soft/40",
      )}
    >
      {selectable && (
        <td className="ps-4">
          <Checkbox
            aria-label={`Select ${c.name}`}
            checked={checked}
            onCheckedChange={(on) => onCheck(Boolean(on))}
          />
        </td>
      )}
      <td className={cn("max-w-72 px-3 py-2.5", !selectable && "ps-4")}>
        <Link
          href={href}
          className={cn(
            "flex min-w-0 flex-col outline-none focus-visible:underline",
            indent && "ps-6",
          )}
        >
          <span className="truncate font-medium hover:underline">
            {c.service && c.project ? c.service : c.name}
          </span>
          {c.service && c.project && c.name !== c.service && (
            <span className="truncate text-caption text-ash">{c.name}</span>
          )}
        </Link>
      </td>
      <td className="px-3 py-2.5">
        <ContainerState c={c} />
      </td>
      {showServer && (
        <td className="max-w-48 px-3 py-2.5">
          <Link
            href={dockerHref(c.server_id)}
            className="block truncate text-muted-foreground hover:text-foreground hover:underline"
          >
            {info?.name ?? "Server"}
          </Link>
        </td>
      )}
      <td className="hidden max-w-64 px-3 py-2.5 @2xl:table-cell">
        <span
          className="block truncate font-mono text-caption text-muted-foreground"
          title={c.image}
        >
          {imageName(c.image)}
        </span>
      </td>
      <td className="hidden px-3 py-2.5 @4xl:table-cell">
        <Ports ports={ports} address={info?.address} />
      </td>
      <td className="hidden max-w-56 px-3 py-2.5 @5xl:table-cell">
        <span className="block truncate text-caption text-muted-foreground">
          {c.status}
        </span>
      </td>
      <td className="pe-2 text-end whitespace-nowrap">
        <QuickAction c={c} can={can} />
        <ItemMenu groups={menu} label={`${c.name} actions`} />
      </td>
    </tr>
  )
}

// Published ports; tcp ones open the app on the server's address.
function Ports({
  ports,
  address,
}: {
  ports: ReturnType<typeof publishedPorts>
  address?: string
}) {
  if (ports.length === 0) return <span className="text-ash">—</span>
  const shown = ports.slice(0, 3)
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((p) => {
        const text = portText(p)
        const local = p.ip === "127.0.0.1" || p.ip === "::1"
        const link =
          address && !local && (p.protocol || "tcp") === "tcp"
            ? `${p.private === 443 ? "https" : "http"}://${address.includes(":") ? `[${address}]` : address}:${p.public}`
            : null
        const cls =
          "rounded-md bg-muted px-1.5 py-0.5 font-mono text-caption whitespace-nowrap"
        return link ? (
          <a
            key={text}
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            title={`Open ${link}`}
            className={cn(cls, "hover:bg-brand-soft hover:text-brand-strong")}
          >
            {text}
          </a>
        ) : (
          <span key={text} className={cls}>
            {text}
          </span>
        )
      })}
      {ports.length > shown.length && (
        <span className="text-caption text-ash">
          +{ports.length - shown.length}
        </span>
      )}
    </span>
  )
}

// The one action a row most likely needs: start a stopped container, stop
// a running one.
function QuickAction({ c, can }: { c: DockerContainer; can: DockerCan }) {
  const a = useDockerActions()
  if (!can.operate) return null
  const busy = a.busy.has(c.id)
  const running = c.state === "running" || c.state === "restarting"
  if (c.state === "paused") return null
  const label = running ? `Stop ${c.name}` : `Start ${c.name}`
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={running ? "Stop" : "Start"}
      disabled={busy}
      className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 disabled:opacity-100"
      onClick={() => a.run(c.server_id, c, running ? "stop" : "start")}
    >
      {busy ? (
        <Loader2 className="animate-spin" />
      ) : running ? (
        <CircleStop />
      ) : (
        <Play />
      )}
    </Button>
  )
}

// --- Phone -----------------------------------------------------------------

export function ContainerRows({
  groups,
  servers,
  showServer = false,
}: Omit<ListProps, "selected" | "onSelect">) {
  const grouped = groups.length > 1 || Boolean(groups[0]?.project)
  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <PhoneGroup
          key={g.key}
          group={g}
          grouped={grouped}
          servers={servers}
          showServer={showServer}
        />
      ))}
    </div>
  )
}

function PhoneGroup({
  group,
  grouped,
  servers,
  showServer,
}: {
  group: ProjectGroup
  grouped: boolean
  servers: Map<string, ServerInfo>
  showServer: boolean
}) {
  const [folded, setFolded] = useState(false)
  const server = group.containers[0]?.server_id ?? ""
  const can = useDockerCan(server, servers.get(server)?.workspace)
  const menu = useGroupMenu(server, group, can)
  const [open, setOpen] = useOpen(`docker-group-${group.key}`)
  return (
    <section>
      {grouped && (
        <div className="sticky top-0 z-10 flex min-h-11 items-center gap-1 border-b border-border bg-subtle ps-4 pe-1">
          <button
            type="button"
            aria-expanded={!folded}
            onClick={() => setFolded(!folded)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-start text-body-sm"
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-ash transition-transform",
                folded && "-rotate-90",
              )}
            />
            <span className="truncate font-medium">
              {group.project || "Not in a project"}
            </span>
            <span className="shrink-0 text-caption text-muted-foreground">
              {group.running}/{group.containers.length}
            </span>
            {group.problems > 0 && <Dot tone="destructive" />}
          </button>
          {menu.length > 0 && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={`${group.project || "Group"} actions`}
              onClick={() => setOpen(true)}
            >
              <Ellipsis />
            </Button>
          )}
          <BottomSheet
            open={open}
            onOpenChange={setOpen}
            title={group.project || "Not in a project"}
          >
            <SheetItems groups={menu} onOpenChange={setOpen} />
          </BottomSheet>
        </div>
      )}
      {!folded && (
        <ul className="divide-y divide-border border-b border-border">
          {group.containers.map((c) => (
            <PhoneRow
              key={`${c.server_id}/${c.id}`}
              c={c}
              info={servers.get(c.server_id)}
              showServer={showServer}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function PhoneRow({
  c,
  info,
  showServer,
}: {
  c: DockerContainer
  info?: ServerInfo
  showServer: boolean
}) {
  const router = useRouter()
  const can = useDockerCan(c.server_id, info?.workspace)
  const menu = useContainerMenu(c.server_id, c, can)
  const [open, setOpen] = useOpen(`docker-row-${c.server_id}-${c.id}`)
  const s = stateOf(c)
  const problem = isProblem(c)
  return (
    <li className="flex items-center">
      <button
        type="button"
        onClick={() => router.push(containerHref(c.server_id, c.name))}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 ps-4 text-start active:bg-muted"
      >
        <Dot tone={problem ? "destructive" : s.tone} className="size-2.5" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-medium">
            {c.service && c.project ? c.service : c.name}
          </span>
          <span className="truncate text-caption text-muted-foreground">
            {showServer && info?.name ? `${info.name} · ` : ""}
            {c.status || s.label} · {imageName(c.image)}
          </span>
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon-lg"
        className="me-1"
        aria-label={`${c.name} actions`}
        onClick={() => setOpen(true)}
      >
        <Ellipsis />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title={c.name}>
        <p className="-mt-1 mb-3 flex items-center gap-2 px-2 text-body-sm text-muted-foreground">
          <ContainerState c={c} />
          <span className="truncate">· {imageName(c.image)}</span>
        </p>
        <SheetItems groups={menu} onOpenChange={setOpen} />
      </BottomSheet>
    </li>
  )
}
