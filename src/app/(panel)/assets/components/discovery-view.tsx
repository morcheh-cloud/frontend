"use client"

import {
  AtSign,
  Box,
  Cloud,
  Database,
  EyeOff,
  ListPlus,
  type LucideIcon,
  Radar,
  RotateCcw,
  ScanSearch,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { newDatabaseHref } from "@/app/(panel)/databases/components/meta"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { queueAddServer } from "@/app/(panel)/servers/components/server-actions"
import { useJobList } from "@/components/jobs/api"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import type { AssetDiscovery } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useDiscoveries,
  useRunDiscovery,
  useSetDiscoveryState,
  useTrackDiscovery,
} from "../api"
import { assetHref } from "./meta"
import { Pill } from "./parts"
import { useAssetsCan } from "./permissions"
import { AssetsShell } from "./shell"

const kindIcon: Record<string, LucideIcon> = {
  database: Database,
  virtual_machine: Box,
  cloud_server: Cloud,
  domain: AtSign,
}

const kindLabel: Record<string, string> = {
  database: "Databases nobody added",
  virtual_machine: "Proxmox machines that aren't servers",
  cloud_server: "Cloud servers that aren't servers",
  domain: "Domains not in the inventory",
}

const shows = ["new", "ignored", "accepted"] as const

export function DiscoveryView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <Discovery phone={phone} />
}

function Discovery({ phone }: { phone: boolean }) {
  const can = useAssetsCan()
  const query = useDiscoveries()
  const run = useRunDiscovery()
  const jobs = useJobActions()
  const list = useJobList()
  const [show, setShow] = useState<(typeof shows)[number]>("new")
  const running = (list.data ?? []).some(
    (j) =>
      j.kind === "asset-discovery" &&
      (j.state === "queued" || j.state === "running"),
  )
  const items = query.data?.items ?? []
  const shown = items.filter(
    (x) => x.state === show && !(show === "new" && x.gone),
  )
  const counts = Object.fromEntries(
    shows.map((s) => [
      s,
      items.filter((x) => x.state === s && !(s === "new" && x.gone)).length,
    ]),
  )
  const groups = Object.keys(kindLabel)
    .map((k) => ({ k, list: shown.filter((x) => x.kind === k) }))
    .filter((g) => g.list.length > 0)

  const look = () =>
    run.mutate(undefined, {
      onSuccess: (j) => jobs.track(j),
      onError: (e) => toast.error(e.message),
    })

  return (
    <AssetsShell
      phone={phone}
      title="Discovery"
      section="discovery"
      actions={
        can.discover && (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Look now"
            disabled={running || run.isPending}
            onClick={look}
          >
            <ScanSearch className="size-5" />
          </Button>
        )
      }
    >
      <section
        className={cn(
          "relative overflow-hidden border-border",
          phone ? "mx-4 rounded-2xl border p-4" : "rounded-3xl border p-6",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-16 size-56 rounded-full bg-brand-soft opacity-70 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl bg-brand text-primary-foreground",
              running && "animate-pulse",
            )}
          >
            <Radar className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-subheading font-light">
              {counts.new
                ? `${counts.new} unlisted ${counts.new === 1 ? "thing" : "things"} found`
                : "Nothing unlisted found"}
            </h2>
            <p className="text-body-sm text-muted-foreground">
              {running
                ? "Looking now: reading open ports, Proxmox, cloud accounts and DNS zones…"
                : query.data?.last_discovery_at
                  ? `Last look ${timeAgo(query.data.last_discovery_at)}. Only what Morche can already reach is read: no network scans.`
                  : "Not looked yet. Morche reads what it already reaches: open ports on servers, Proxmox, cloud accounts and DNS zones."}
            </p>
          </div>
          {can.discover && !phone && (
            <Button disabled={running || run.isPending} onClick={look}>
              <ScanSearch />
              {running ? "Looking…" : "Look now"}
            </Button>
          )}
        </div>
      </section>

      <div className={cn("flex items-center gap-2", phone && "px-4")}>
        <Segmented
          label="Show"
          value={show}
          onChange={setShow}
          items={[
            {
              value: "new",
              label: `To review${counts.new ? ` · ${counts.new}` : ""}`,
            },
            {
              value: "ignored",
              label: `Ignored${counts.ignored ? ` · ${counts.ignored}` : ""}`,
            },
            {
              value: "accepted",
              label: `Done${counts.accepted ? ` · ${counts.accepted}` : ""}`,
            },
          ]}
        />
      </div>

      {query.isPending ? (
        <Skeleton className={cn("h-48 rounded-2xl", phone && "mx-4")} />
      ) : groups.length === 0 ? (
        <Empty
          icon={Radar}
          title={
            show === "new"
              ? "Nothing to review"
              : show === "ignored"
                ? "Nothing ignored"
                : "Nothing handled yet"
          }
          body={
            show === "new"
              ? "Everything discovery found is either managed by Morche, in the inventory, or ignored."
              : "Findings show here once you handle them."
          }
        />
      ) : (
        <div className={cn("grid gap-4", phone && "px-4")}>
          {groups.map((g) => {
            const Icon = kindIcon[g.k] ?? Box
            return (
              <section
                key={g.k}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <header className="flex items-center gap-2 border-b border-border bg-subtle px-4 py-2.5">
                  <Icon className="size-4 text-muted-foreground" />
                  <h3 className="text-body-sm font-medium">{kindLabel[g.k]}</h3>
                  <span className="text-caption text-ash">{g.list.length}</span>
                </header>
                <ul className="divide-y divide-border">
                  {g.list.map((x) => (
                    <Finding
                      key={x.id}
                      item={x}
                      phone={phone}
                      can={can.discover}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </AssetsShell>
  )
}

function Finding({
  item: x,
  phone,
  can,
}: {
  item: AssetDiscovery
  phone: boolean
  can: boolean
}) {
  const router = useRouter()
  const state = useSetDiscoveryState()
  const track = useTrackDiscovery()
  const d = x.data as Record<string, unknown>
  const ips = Array.isArray(d.ips) ? (d.ips as string[]) : []

  // Managing it in Morche: the add form of its own section, filled in.
  const manage: { label: string; go: () => void } | null =
    x.kind === "database"
      ? {
          label: "Add to Databases",
          go: () =>
            router.push(
              newDatabaseHref({
                source: "connect",
                server: String(d.server_id ?? ""),
                engine: String(d.engine ?? ""),
              }),
            ),
        }
      : (x.kind === "virtual_machine" || x.kind === "cloud_server") &&
          ips.length > 0
        ? {
            label: "Add as a server",
            go: () => {
              queueAddServer({ name: String(d.name ?? x.title), host: ips[0] })
              router.push("/servers")
            },
          }
        : null

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 px-4 py-3",
        x.gone && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium">
          <span className="truncate">{x.title}</span>
          {x.gone && <Pill>Not seen lately</Pill>}
          {d.exposure === "public" && (
            <Pill tone="danger">Open to the internet</Pill>
          )}
        </p>
        <p className="truncate text-caption text-muted-foreground">
          {x.detail}
        </p>
        <p className="text-caption text-ash">
          First seen {timeAgo(x.first_seen)}
        </p>
      </div>
      {can && x.state === "new" && (
        <div className={cn("flex flex-wrap gap-2", phone && "w-full")}>
          {manage && (
            <Button size="sm" onClick={manage.go}>
              {manage.label}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={track.isPending}
            onClick={() =>
              track.mutate(x.id, {
                onSuccess: (a) => {
                  toast.success(`${a.name} added to the inventory`, {
                    action: {
                      label: "Open",
                      onClick: () => router.push(assetHref(a.id)),
                    },
                  })
                },
                onError: (e) => toast.error(e.message),
              })
            }
          >
            <ListPlus />
            Just list it
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              state.mutate(
                { ids: [x.id], state: "ignored" },
                { onError: (e) => toast.error(e.message) },
              )
            }
          >
            <EyeOff />
            Ignore
          </Button>
        </div>
      )}
      {can && x.state === "ignored" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => state.mutate({ ids: [x.id], state: "new" })}
        >
          <RotateCcw />
          Bring back
        </Button>
      )}
      {x.state === "accepted" && x.asset_id && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.push(assetHref(x.asset_id ?? ""))}
        >
          Open asset
        </Button>
      )}
      {x.state === "accepted" && !x.asset_id && (
        <Pill tone="success">Managed in Morche</Pill>
      )}
    </li>
  )
}
