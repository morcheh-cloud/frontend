"use client"

import { Camera, Copy, MapPin, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { PVESnapshot } from "@/lib/services"

import type { Item } from "../../../../servers/[id]/components/parts"
import { Empty } from "../../../../servers/[id]/components/parts"
import { timeAgo } from "../../../../servers/components/meta"
import { useSnapshots } from "../../../api"
import { guestState, kindNoun } from "../../../components/meta"
import { copy, useVmActions } from "../../../components/vm-actions"
import { TabLoading, useGuestPage } from "./guest-page"
import { MenuRow, Panel, TabBar, TabBody, Tag } from "./kit"

type Node = { snap: PVESnapshot; depth: number }

// Proxmox answers a flat list with parents; "current" is where the machine
// is now. Walk it as a tree, oldest first, so a branch reads top to bottom.
function flatten(items: PVESnapshot[]): Node[] {
  const names = new Set(items.map((s) => s.name))
  const children = new Map<string, PVESnapshot[]>()
  for (const s of items) {
    const parent = s.parent && names.has(s.parent) ? s.parent : ""
    children.set(parent, [...(children.get(parent) ?? []), s])
  }
  const order = (a: PVESnapshot, b: PVESnapshot) => {
    if (a.current !== b.current) return a.current ? 1 : -1
    return (a.taken_at ?? "").localeCompare(b.taken_at ?? "")
  }
  const out: Node[] = []
  const walk = (parent: string, depth: number) => {
    for (const s of (children.get(parent) ?? []).sort(order)) {
      out.push({ snap: s, depth })
      walk(s.name, depth + 1)
    }
  }
  walk("", 0)
  return out
}

export function SnapshotsTab() {
  const { guest: g, phone, can } = useGuestPage()
  const a = useVmActions()
  const q = useSnapshots(g.cluster_id, g.vmid)
  const edit = can("engineer")
  const items = q.data?.items ?? []
  const taken = items.filter((s) => !s.current)
  const nodes = flatten(items)
  const here = items.find((s) => s.current)
  const locked = !!g.lock

  if (q.isLoading) return <TabLoading />

  const takeButton = edit && (
    <Button
      size={phone ? "lg" : "sm"}
      disabled={locked}
      onClick={() => a.snapshot(g)}
      className="max-md:w-full"
    >
      <Camera />
      Take a snapshot
    </Button>
  )

  if (q.isError) {
    return (
      <Empty
        icon={Camera}
        title="Couldn't read the snapshots"
        body={q.error.message}
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  if (taken.length === 0) {
    return (
      <Empty
        icon={Camera}
        title="No snapshots yet"
        body={`A snapshot keeps the ${kindNoun(g.kind)}'s disks${g.kind === "qemu" ? " (and, if you like, its memory)" : ""} as they are now, so you can go back after an upgrade or a risky change. Snapshots live on the same storage: they are not backups.`}
        action={takeButton || undefined}
      />
    )
  }

  const menu = (s: PVESnapshot): Item[][] => [
    edit
      ? [
          {
            key: "rollback",
            label: "Go back to this…",
            icon: <RotateCcw />,
            disabled: locked,
            onSelect: () => a.rollback(g, s.name),
          },
        ]
      : [],
    [
      {
        key: "copy",
        label: "Copy name",
        icon: <Copy />,
        onSelect: () => copy(s.name, "Snapshot name"),
      },
    ],
    edit
      ? [
          {
            key: "delete",
            label: "Delete…",
            icon: <Trash2 />,
            destructive: true,
            disabled: locked,
            onSelect: () => a.deleteSnapshot(g, s.name),
          },
        ]
      : [],
  ]

  return (
    <TabBody>
      <TabBar>
        <span className="text-caption text-muted-foreground">
          {taken.length} snapshot{taken.length === 1 ? "" : "s"}
          {here?.parent ? ` · running from “${here.parent}”` : ""}
          {locked ? " · busy, wait for the current task" : ""}
        </span>
        <span className="ms-auto max-md:ms-0 max-md:w-full">{takeButton}</span>
      </TabBar>
      <Panel flush>
        <ol className="divide-y divide-border py-1">
          {nodes.map(({ snap: s, depth }) => (
            <li
              key={s.name}
              style={{ paddingInlineStart: `${Math.min(depth, 8) * 1.25}rem` }}
              className="relative"
            >
              {depth > 0 && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 border-s border-dashed border-mist"
                  style={{
                    insetInlineStart: `${Math.min(depth, 8) * 1.25 + 0.25}rem`,
                  }}
                />
              )}
              {s.current ? (
                <div className="flex min-h-12 items-center gap-3 px-5 py-2 max-md:px-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                    <MapPin className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm font-medium">Now</span>
                    <span className="block text-caption text-muted-foreground">
                      The {kindNoun(g.kind)} as it runs today
                      {guestState(g) === "running" ? "" : " (not running)"}
                    </span>
                  </span>
                </div>
              ) : (
                <MenuRow
                  id={`snap-${s.name}`}
                  phone={phone}
                  label={`Snapshot ${s.name}`}
                  icon={<Camera />}
                  title={
                    <>
                      <span className="break-all">{s.name}</span>
                      {s.with_ram && <Tag tone="brand">With memory</Tag>}
                      {here?.parent === s.name && <Tag>Latest</Tag>}
                    </>
                  }
                  sub={[
                    s.taken_at
                      ? `${timeAgo(s.taken_at)} · ${new Date(s.taken_at).toLocaleString()}`
                      : "",
                    s.description,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  groups={menu(s)}
                />
              )}
            </li>
          ))}
        </ol>
      </Panel>
      <p className="text-caption text-muted-foreground max-md:px-4 max-md:py-3">
        Snapshots sit on the machine's own storage and slow its disks a little
        while they pile up. Keep a few, and use Backups for copies elsewhere.
      </p>
    </TabBody>
  )
}
