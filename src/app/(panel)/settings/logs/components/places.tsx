"use client"

import { useQuery } from "@tanstack/react-query"
import { FolderOpen, HardDrive, Plus, RefreshCw, X } from "lucide-react"
import type { ReactNode } from "react"
import { FolderPicker } from "@/components/files/folder-picker"
import { storageLister } from "@/components/files/listers"
import { storagesQuery } from "@/components/panel/problems"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { DEFAULT_FOLDER, MAX_STORAGES } from "./meta"

// Storages a file can go to: every one that isn't read-only (log settings
// are for admins, who can write to all of them).
export function useStorageChoices(picked: string[]) {
  const storages = useQuery(storagesQuery)
  const all = storages.data?.items ?? []
  const items = all.filter((s) => !s.read_only || picked.includes(s.id))
  const name = (id: string) =>
    all.find((s) => s.id === id)?.name ?? "Removed storage"
  const missing = picked.filter((id) => !all.some((s) => s.id === id))
  return { storages, items, name, missing }
}

export function Chip({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 max-w-full items-center gap-1.5 rounded-full border border-border px-3 text-body-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
    >
      {children}
    </button>
  )
}

export function FieldError({ text }: { text?: string }) {
  if (!text) return null
  return <p className="text-caption text-destructive">{text}</p>
}

// Where the zip files go: Morche's own disk and/or up to ten storages, in
// one folder on each storage.
export function PlacesEditor({
  id,
  keepLocal,
  onKeepLocal,
  storageIds,
  onStorages,
  folder,
  onFolder,
  errors,
  localDir,
  localFree,
  disabled,
}: {
  id: string
  keepLocal: boolean
  onKeepLocal: (on: boolean) => void
  storageIds: string[]
  onStorages: (ids: string[]) => void
  folder: string
  onFolder: (folder: string) => void
  errors: Record<string, string>
  localDir?: string
  localFree?: number
  disabled?: boolean
}) {
  const { storages, items, name, missing } = useStorageChoices(storageIds)
  const [browse, setBrowse] = useOpen(`${id}-browse`)
  const full = storageIds.length >= MAX_STORAGES
  const toggle = (sid: string) =>
    onStorages(
      storageIds.includes(sid)
        ? storageIds.filter((v) => v !== sid)
        : [...storageIds, sid],
    )
  const first = storageIds.find((sid) => items.some((s) => s.id === sid))
  const none = !keepLocal && storageIds.length === 0

  return (
    <div className="flex flex-col gap-4">
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the Switch inside is the control */}
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4",
          keepLocal && "border-primary bg-brand-soft/40",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <HardDrive className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body-sm font-medium">Morche's disk</span>
          <span className="block text-caption break-words text-muted-foreground">
            {localDir ? <span className="font-mono">{localDir}</span> : null}
            {localFree != null && localFree > 0 && (
              <> · {formatSize(localFree)} free</>
            )}
          </span>
        </span>
        <Switch
          checked={keepLocal}
          disabled={disabled}
          onCheckedChange={onKeepLocal}
        />
      </label>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-sm font-medium">
            Storages{" "}
            <span className="font-normal text-muted-foreground">
              {storageIds.length} of up to {MAX_STORAGES}
            </span>
          </span>
          <span className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Load the storages again"
              title="Load again"
              className="size-11 md:size-8"
              disabled={storages.isFetching}
              onClick={() => storages.refetch()}
            >
              <RefreshCw
                className={cn(storages.isFetching && "animate-spin")}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Add a storage (opens in a new tab)"
              title="Add a storage (new tab)"
              className="size-11 md:size-8"
              onClick={() => window.open("/storage", "_blank", "noopener")}
            >
              <Plus />
            </Button>
          </span>
        </div>
        {storages.isPending ? (
          <Skeleton className="h-8 w-full rounded-full" />
        ) : items.length === 0 && missing.length === 0 ? (
          <p className="text-caption text-muted-foreground">
            No storage you can write to yet. Add one with +, then load them
            again.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {items.map((s) => (
              <Chip
                key={s.id}
                selected={storageIds.includes(s.id)}
                disabled={disabled || (full && !storageIds.includes(s.id))}
                onClick={() => toggle(s.id)}
              >
                <span className="truncate">{s.name}</span>
                <span className="font-label text-[10px] tracking-label uppercase opacity-70">
                  {s.protocol}
                </span>
              </Chip>
            ))}
            {missing.map((sid) => (
              <Chip key={sid} selected onClick={() => toggle(sid)}>
                <span className="truncate text-destructive">{name(sid)}</span>
                <X className="size-3.5" />
              </Chip>
            ))}
          </div>
        )}
        <FieldError text={errors.storage_ids} />
      </div>

      {storageIds.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-folder`} className="text-body-sm font-medium">
            Folder on the storages
          </label>
          <div className="flex gap-2">
            <Input
              id={`${id}-folder`}
              value={folder}
              placeholder={DEFAULT_FOLDER}
              disabled={disabled}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="min-w-0 flex-1 font-mono"
              aria-invalid={errors.folder ? true : undefined}
              onChange={(e) => onFolder(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 max-md:h-11"
              disabled={disabled || !first}
              onClick={() => setBrowse(true)}
            >
              <FolderOpen />
              Browse
            </Button>
          </div>
          <p className="text-caption text-muted-foreground">
            Files go into a folder per kind of log inside it. Empty ={" "}
            <span className="font-mono">{DEFAULT_FOLDER}</span>.
          </p>
          <FieldError text={errors.folder} />
        </div>
      )}

      {none && (
        <p className="text-caption text-destructive">
          Pick at least one place for the files.
        </p>
      )}

      {first && (
        <ResponsiveDialog
          open={browse}
          onOpenChange={setBrowse}
          title={`Pick a folder on ${name(first)}`}
          description="The same folder is used on every storage picked."
          className="sm:max-w-lg"
          footer={
            <Button className="max-md:h-11" onClick={() => setBrowse(false)}>
              Use {folder || DEFAULT_FOLDER}
            </Button>
          }
        >
          <FolderPicker
            lister={storageLister(first)}
            value={folder || "/"}
            onChange={onFolder}
            rootLabel={name(first)}
            className="max-h-[50vh]"
          />
        </ResponsiveDialog>
      )}
    </div>
  )
}
