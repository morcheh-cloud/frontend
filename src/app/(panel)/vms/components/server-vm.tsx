"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { vmsItem } from "@/components/panel/nav"
import type { PVEServerLink } from "@/lib/services"

import { useServerPveLink } from "../api"
import {
  guestName,
  guestState,
  guestStateMeta,
  kindLabel,
  StatusDot,
  vmHref,
} from "./meta"

// The Proxmox machine a server runs on, for the server's Overview. Nothing
// shows when the server isn't linked.
export function useServerVm(serverId: string) {
  const q = useServerPveLink(serverId)
  return q.data?.linked && q.data.cluster_id && q.data.vmid ? q.data : null
}

function text(l: PVEServerLink) {
  const g = l.guest
  if (!g) return l.problem || `${l.cluster_name ?? "Proxmox"} · ${l.vmid}`
  return `${guestStateMeta[guestState(g)].label} · ${g.node} · ${l.cluster_name ?? g.cluster_name}`
}

function title(l: PVEServerLink) {
  return l.guest
    ? `${kindLabel(l.guest.kind)} ${guestName(l.guest)}`
    : `Proxmox machine ${l.vmid}`
}

const dot = (l: PVEServerLink) =>
  l.guest ? guestStateMeta[guestState(l.guest)].dot : "bg-mist"

// Desktop: a link row under the System card's facts.
export function ServerVmLink({ link }: { link: PVEServerLink | null }) {
  if (!link?.cluster_id || !link.vmid) return null
  const Icon = vmsItem.icon
  const href = link.level === "none" ? null : vmHref(link.cluster_id, link.vmid)
  const body = (
    <>
      <Icon className="size-3.5 shrink-0 text-ash" />
      <span className="font-medium">{title(link)}</span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-muted-foreground">
        <StatusDot tone={dot(link)} />
        {text(link)}
      </span>
      {href && (
        <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
      )}
    </>
  )
  const cls =
    "flex items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-body-sm outline-none"
  return (
    <div className="mt-4">
      {href ? (
        <Link
          href={href}
          className={`${cls} hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50`}
        >
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </div>
  )
}

// Phone: one grouped list row.
export function ServerVmRow({ link }: { link: PVEServerLink }) {
  if (!link.cluster_id || !link.vmid) return null
  const Icon = vmsItem.icon
  const href = link.level === "none" ? null : vmHref(link.cluster_id, link.vmid)
  const body = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body">{title(link)}</span>
        <span className="flex items-center gap-1.5 truncate text-body-sm text-muted-foreground">
          <StatusDot tone={dot(link)} />
          {text(link)}
        </span>
      </span>
      {href && (
        <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
      )}
    </>
  )
  const cls = "flex min-h-12 items-center gap-3 px-4 py-2 outline-none"
  return (
    <li>
      {href ? (
        <Link href={href} className={`${cls} active:bg-muted`}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}
