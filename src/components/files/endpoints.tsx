"use client"

import { useQuery } from "@tanstack/react-query"
import { ChevronRight, HardDrive, Server } from "lucide-react"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { storagesQuery } from "@/components/panel/problems"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { type Endpoint, useSource } from "./source"

// Another server or storage: the other end of a transfer.
export type Target = {
  endpoint: Endpoint
  id: string
  name: string
  detail: string
  kind: "server" | "storage"
  // Where the path field starts.
  path: string
  // Can't be written to: refused by the storage, or by this person's access.
  readOnly: boolean
  // This person can read files here (import from it).
  readable: boolean
  // Top-level folders are buckets: nothing can go at "/".
  buckets: boolean
}

const endpointId = (e: Endpoint) =>
  "server_id" in e ? e.server_id : e.storage_id

// Query key of the other end's file lists, to refresh them after a transfer.
export const filesKey = (t: Target) =>
  t.kind === "server" ? ["files", t.id] : ["storage-files", t.id]

// Every storage, then every server, except the one on screen.
export function useTargets() {
  const source = useSource()
  const { serverLevel, storageLevel } = useAccess()
  const self = endpointId(source.endpoint)
  const servers = useQuery({
    queryKey: ["servers", "transfer-targets"],
    queryFn: () => api.servers.listServers({ limit: 500 }),
  })
  const storages = useQuery(storagesQuery)
  const targets: Target[] = [
    ...(storages.data?.items ?? []).map((s) => {
      const level = storageLevel(s.id, s.workspace_id)
      return {
        endpoint: { storage_id: s.id },
        id: s.id,
        name: s.name,
        detail: `${s.protocol.toUpperCase()} · ${s.bucket ? `${s.host || s.provider} / ${s.bucket}` : s.host}`,
        kind: "storage" as const,
        // Every bucket is a top-level folder: let the user pick one.
        path: s.capabilities.buckets ? "" : "/",
        readOnly: s.read_only || !atLeast(level, "engineer"),
        readable: atLeast(level, "operator"),
        buckets: s.capabilities.buckets,
      }
    }),
    ...(servers.data?.items ?? []).map((s) => {
      const level = serverLevel(s.id, s.workspace_id)
      return {
        endpoint: { server_id: s.id },
        id: s.id,
        name: s.name,
        detail: s.host,
        kind: "server" as const,
        path: "/tmp",
        readOnly: !atLeast(level, "engineer"),
        readable: atLeast(level, "operator"),
        buckets: false,
      }
    }),
  ].filter((t) => t.id !== self)
  return {
    targets,
    loading: servers.isPending || storages.isPending,
    error: servers.error ?? storages.error,
  }
}

export const TargetIcon = ({ target }: { target: Target }) =>
  target.kind === "server" ? <Server /> : <HardDrive />

export function TargetLabel({ target: t }: { target: Target }) {
  return (
    <>
      <span className="shrink-0 text-muted-foreground [&_svg]:size-4">
        <TargetIcon target={t} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium">
          {t.name}
        </span>
        <span className="block truncate text-caption text-ash">
          {t.readOnly ? `Read-only · ${t.detail}` : t.detail}
        </span>
      </span>
    </>
  )
}

// Pick one of `useTargets()`.
export function TargetList({
  label,
  disabled,
  onPick,
}: {
  label: string
  disabled?: (t: Target) => boolean
  onPick: (t: Target) => void
}) {
  const { targets, loading, error } = useTargets()
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-body-sm font-medium">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="max-h-72 overflow-y-auto rounded-lg border border-input"
      >
        {loading ? (
          <div className="flex flex-col gap-3 p-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : error ? (
          <p className="p-3 text-body-sm text-destructive">{error.message}</p>
        ) : targets.length === 0 ? (
          <p className="p-3 text-body-sm text-muted-foreground">
            Add another server or a storage first.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {targets.map((t) => (
              <li key={t.id}>
                {/* biome-ignore lint/a11y/useSemanticElements: a list of rich options; radio inputs can't hold two lines and an icon */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={false}
                  disabled={disabled?.(t)}
                  onClick={() => onPick(t)}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start outline-none hover:bg-subtle focus-visible:bg-muted disabled:opacity-50 max-md:min-h-14"
                >
                  <TargetLabel target={t} />
                  <ChevronRight className="size-4 shrink-0 text-ash" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
