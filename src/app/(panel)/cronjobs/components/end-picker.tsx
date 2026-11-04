"use client"

import { useQuery } from "@tanstack/react-query"
import { ChevronRight, HardDrive, Server } from "lucide-react"
import { useState } from "react"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { FolderPicker } from "@/components/files/folder-picker"
import { listerFor } from "@/components/files/listers"
import type { Endpoint } from "@/components/files/source"
import { storagesQuery } from "@/components/panel/problems"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import type { ScheduleEndView } from "@/lib/services"

export type EndDraft = Omit<ScheduleEndView, "missing"> & { missing?: boolean }

export type Role = "source" | "destination"

// A server or storage in the workspace, as one end of a cron job.
type Place = {
  endpoint: Endpoint
  id: string
  name: string
  detail: string
  kind: "server" | "storage"
  buckets: boolean
  // Why it can't be this end, or null.
  blocked: string | null
}

// Every storage and server of the selected workspace (the API sends the
// workspace header), with whether this person may use it for `role`: the
// source needs Operator, a destination Engineer and a writable storage.
function usePlaces(role: Role) {
  const { serverLevel, storageLevel } = useAccess()
  // Same key as the "Send to…" dialog: one list in the cache.
  const servers = useQuery({
    queryKey: ["servers", "transfer-targets"],
    queryFn: () => api.servers.listServers({ limit: 500 }),
  })
  const storages = useQuery(storagesQuery)
  const need = role === "source" ? "operator" : "engineer"
  const needText =
    role === "source" ? "Needs Operator access" : "Needs Engineer access"
  const places: Place[] = [
    ...(servers.data?.items ?? []).map((s) => ({
      endpoint: { server_id: s.id },
      id: s.id,
      name: s.name,
      detail: s.host,
      kind: "server" as const,
      buckets: false,
      blocked: atLeast(serverLevel(s.id, s.workspace_id), need)
        ? null
        : needText,
    })),
    ...(storages.data?.items ?? []).map((s) => ({
      endpoint: { storage_id: s.id },
      id: s.id,
      name: s.name,
      detail: `${s.protocol.toUpperCase()} · ${s.bucket ? `${s.host || s.provider} / ${s.bucket}` : s.host}`,
      kind: "storage" as const,
      buckets: s.capabilities.buckets,
      blocked: !atLeast(storageLevel(s.id, s.workspace_id), need)
        ? needText
        : role === "destination" && s.read_only
          ? "Read-only storage"
          : null,
    })),
  ]
  return {
    places,
    loading: servers.isPending || storages.isPending,
    error: servers.error ?? storages.error,
  }
}

const placeOf = (end: EndDraft | undefined, places: Place[]) =>
  end ? places.find((p) => p.id === (end.server_id ?? end.storage_id)) : null

// Pick a server or storage, then a folder on it (tree + typed path).
export function EndPicker({
  open,
  onOpenChange,
  role,
  value,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role
  value?: EndDraft
  onPick: (end: EndDraft) => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={role === "source" ? "Copy from" : "Copy to"}
      description={
        role === "source"
          ? "The folder (or file) to copy. Its contents are copied, not the folder itself."
          : "The folder the files go into. Missing folders are created."
      }
      className="sm:max-w-lg"
    >
      {open && (
        <PickForm
          role={role}
          value={value}
          onCancel={() => onOpenChange(false)}
          onPick={(end) => {
            onPick(end)
            onOpenChange(false)
          }}
        />
      )}
    </ResponsiveDialog>
  )
}

function PickForm({
  role,
  value,
  onCancel,
  onPick,
}: {
  role: Role
  value?: EndDraft
  onCancel: () => void
  onPick: (end: EndDraft) => void
}) {
  const { places, loading, error } = usePlaces(role)
  const [chosen, setChosen] = useState<string | null>(
    value ? (value.server_id ?? value.storage_id ?? null) : null,
  )
  const [path, setPath] = useState(value?.path ?? "")
  const [pathError, setPathError] = useState<string>()
  const place = chosen
    ? (places.find((p) => p.id === chosen) ?? placeOf(value, places))
    : null

  function choose(p: Place) {
    setChosen(p.id)
    setPath(p.buckets ? "" : "/")
    setPathError(undefined)
  }

  function submit() {
    if (!place) return
    const p = path.trim().replace(/(.)\/+$/, "$1")
    if (!p.startsWith("/")) {
      setPathError("Use a full path, starting with /")
      return
    }
    if (place.buckets && p === "/") {
      setPathError("Pick a bucket, or a folder in one")
      return
    }
    onPick({
      ...("server_id" in place.endpoint
        ? { server_id: place.endpoint.server_id }
        : { storage_id: place.endpoint.storage_id }),
      path: p,
      name: place.name,
    })
  }

  if (!place) {
    return (
      <div className="flex flex-col gap-4">
        <div
          role="radiogroup"
          aria-label="Server or storage"
          className="max-h-80 overflow-y-auto rounded-lg border border-input max-md:max-h-[50svh]"
        >
          {loading ? (
            <div className="flex flex-col gap-3 p-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : error ? (
            <p className="p-3 text-body-sm text-destructive">{error.message}</p>
          ) : places.length === 0 ? (
            <p className="p-3 text-body-sm text-muted-foreground">
              This workspace has no servers or storages yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {places.map((p) => (
                <li key={p.id}>
                  {/* biome-ignore lint/a11y/useSemanticElements: a list of rich options; radio inputs can't hold two lines and an icon */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={false}
                    disabled={!!p.blocked}
                    onClick={() => choose(p)}
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start outline-none hover:bg-subtle focus-visible:bg-muted disabled:opacity-50 max-md:min-h-14"
                  >
                    <PlaceLabel place={p} />
                    <ChevronRight className="size-4 shrink-0 text-ash" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button variant="outline" className="max-md:h-11" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex items-center gap-3 rounded-lg border border-input px-3 py-2">
        <PlaceLabel place={place} />
        <Button
          variant="ghost"
          size="sm"
          className="max-md:h-11"
          onClick={() => setChosen(null)}
        >
          Change
        </Button>
      </div>
      <FolderPicker
        key={place.id}
        lister={listerFor(place.endpoint)}
        value={path}
        onChange={(p) => {
          setPath(p)
          setPathError(undefined)
        }}
        disabled={(p) => place.buckets && p === "/"}
        rootLabel={place.name}
        rootIcon={place.kind === "server" ? <Server /> : <HardDrive />}
      />
      <Field
        label={role === "source" ? "Folder or file" : "Folder"}
        error={pathError}
        hint={
          role === "source"
            ? "Pick a folder above or type a path. A single file works too."
            : "Pick one above or type a path. Missing folders are created."
        }
      >
        {(p) => (
          <Input
            {...p}
            value={path}
            className="font-mono"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            onChange={(e) => {
              setPath(e.target.value)
              setPathError(undefined)
            }}
          />
        )}
      </Field>
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button variant="outline" className="max-md:h-11" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="max-md:h-11">
          Use this {role === "source" ? "path" : "folder"}
        </Button>
      </div>
    </form>
  )
}

function PlaceLabel({ place: p }: { place: Place }) {
  return (
    <>
      <span className="shrink-0 text-muted-foreground [&_svg]:size-4">
        {p.kind === "server" ? <Server /> : <HardDrive />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium">
          {p.name}
        </span>
        <span className="block truncate text-caption text-ash">
          {p.blocked ? `${p.blocked} · ${p.detail}` : p.detail}
        </span>
      </span>
    </>
  )
}
