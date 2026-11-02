"use client"

import {
  Activity,
  ChevronLeft,
  CloudOff,
  Ellipsis,
  KeyRound,
  KeySquare,
  Pencil,
  Star,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMemo } from "react"

import { StatusDot, statusMeta } from "@/app/(panel)/servers/components/meta"
import { FileBrowser } from "@/components/files/file-browser"
import { storageLister, toStorageEntry } from "@/components/files/listers"
import type { FileSource } from "@/components/files/source"
import { guideForPath } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, api } from "@/lib/api"
import type { Storage } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCheckingStorages, useStorage } from "../../api"
import {
  endpointLabel,
  ProtocolTile,
  providerLabel,
} from "../../components/meta"
import { useStorageCan } from "../../components/permissions"
import { useStorageActions } from "../../components/storage-actions"
import { StorageMenuItems, StorageSheet } from "../../components/storage-menu"
import { ReadOnlyBadge } from "../../components/storage-view"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"

// One storage: its header (or the phone app bar) over the file browser.
export function StoragePageView() {
  const { id } = useParams<{ id: string }>()
  const query = useStorage(id)
  const checking = useCheckingStorages().has(id)
  const isPhone = useIsPhone()
  const router = useRouter()
  const storage = query.data

  usePageCrumbs(
    storage ? [{ href: `/storage/${id}`, label: storage.name }] : [],
  )

  if (isPhone === null) return null
  // Keep the last good copy if a refetch fails (e.g. right after a delete).
  if (!storage) {
    if (query.error) {
      return (
        <Missing
          notFound={
            query.error instanceof ApiError && query.error.status === 404
          }
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      )
    }
    return <Loading />
  }

  const onDeleted = () => router.replace("/storage")
  return isPhone ? (
    <PhonePage storage={storage} checking={checking} onDeleted={onDeleted} />
  ) : (
    <DesktopPage storage={storage} checking={checking} onDeleted={onDeleted} />
  )
}

type PageProps = {
  storage: Storage
  checking: boolean
  onDeleted: () => void
}

function DesktopPage({ storage: s, checking, onDeleted }: PageProps) {
  const actions = useStorageActions()
  const can = useStorageCan()
  useFollowWorkspace(s.workspace_id)
  const source = useStorageSource(s)

  return (
    <div className="flex h-[calc(100svh-3rem-1px)] min-h-[32rem] flex-col">
      <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
        <ProtocolTile protocol={s.protocol} className="size-12 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-subheading font-medium">{s.name}</h1>
            <button
              type="button"
              aria-label={
                s.favorite ? "Remove from favorites" : "Add to favorites"
              }
              aria-pressed={s.favorite}
              onClick={() => actions.toggleFavorite(s)}
              className="flex size-7 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground"
            >
              <Star
                className={cn("size-4", s.favorite && "fill-brand text-brand")}
              />
            </button>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground">
              <StatusDot status={s.status} checking={checking} />
              {checking ? "Checking…" : statusMeta[s.status].label}
              {!checking && s.status === "online" && s.latency_ms != null && (
                <span className="text-muted-foreground">{s.latency_ms} ms</span>
              )}
            </span>
            <span className="font-mono text-caption">{endpointLabel(s)}</span>
            <span>{providerLabel(s)}</span>
            {s.read_only && <ReadOnlyBadge />}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {can(s, "operator") && (
            <Button
              variant="outline"
              disabled={checking}
              onClick={() => actions.check(s)}
            >
              <Activity />
              {checking ? "Checking…" : "Check"}
            </Button>
          )}
          {can(s, "owner") && (
            <>
              <Button
                variant="outline"
                onClick={() => actions.showCredentials(s)}
              >
                <KeySquare />
                Credentials
              </Button>
              <Button variant="outline" onClick={() => actions.editStorage(s)}>
                <Pencil />
                Edit
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Storage actions"
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <StorageMenuItems
                storage={s}
                checking={checking}
                onDeleted={onDeleted}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Banner storage={s} checking={checking} className="mx-6 mb-3 shrink-0" />
      <div className="flex min-h-0 flex-1 flex-col border-t border-border">
        <FileBrowser source={source} phone={false} />
      </div>
    </div>
  )
}

function PhonePage({ storage: s, checking, onDeleted }: PageProps) {
  const back = useBack("/storage")
  const [sheetOpen, setSheetOpen] = useOpen("storage-page-sheet")
  const guide = guideForPath(`/storage/${s.id}`)
  const source = useStorageSource(s)

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-12 items-center gap-1 px-1">
          {/* As wide as the end side, so the title stays centred. */}
          <div className="flex w-22 shrink-0">
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className={barButton}
            >
              <ChevronLeft className="size-6 rtl:rotate-180" />
            </button>
          </div>
          <h1 className="min-w-0 flex-1 truncate text-center text-body font-medium">
            {s.name}
          </h1>
          {guide ? (
            <HelpButton
              href={guide.href}
              label={`${guide.guide.title} guide`}
            />
          ) : (
            <span aria-hidden className="size-11 shrink-0" />
          )}
          <button
            type="button"
            aria-label="Storage actions"
            onClick={() => setSheetOpen(true)}
            className={barButton}
          >
            <Ellipsis className="size-5" />
          </button>
        </div>
      </header>
      <Banner storage={s} checking={checking} />
      <FileBrowser source={source} phone />
      <StorageSheet
        storage={s}
        checking={checking}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDeleted={onDeleted}
      />
    </>
  )
}

// A failed last check, with the one action that fixes it. The browser below
// still tries: a check can fail on a flaky link that works a second later.
function Banner({
  storage: s,
  checking,
  className,
}: {
  storage: Storage
  checking: boolean
  className?: string
}) {
  const actions = useStorageActions()
  const can = useStorageCan()
  if (s.status === "online" || s.status === "unknown") return null

  const fix =
    s.status === "host_key_mismatch"
      ? {
          title: "The host key changed since it was trusted",
          label: "Review key…",
          min: "owner" as const,
          run: () => actions.trustHostKey(s),
        }
      : s.status === "auth_failed"
        ? {
            title: "The storage refused the saved credentials",
            label: "Edit credentials",
            min: "owner" as const,
            run: () => actions.editStorage(s),
          }
        : {
            title: `${statusMeta[s.status].label} on the last check`,
            label: checking ? "Checking…" : "Check again",
            min: "operator" as const,
            run: () => actions.check(s),
          }
  const Icon = s.status === "host_key_mismatch" ? KeyRound : TriangleAlert

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y p-4 md:items-center md:rounded-2xl md:border md:px-5 md:py-3",
        s.status === "auth_failed"
          ? "border-warning/25 bg-warning/5"
          : "border-destructive/20 bg-destructive/5",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0 md:mt-0",
          s.status === "auth_failed" ? "text-warning" : "text-destructive",
        )}
      />
      <div className="min-w-0 flex-1 text-body-sm">
        <p className="font-medium">{fix.title}</p>
        {s.status_message && (
          <p className="text-muted-foreground">{s.status_message}</p>
        )}
      </div>
      {can(s, fix.min) && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-md:h-9"
          disabled={checking}
          onClick={fix.run}
        >
          {fix.label}
        </Button>
      )}
    </div>
  )
}

function useStorageSource(s: Storage) {
  const { id, read_only, capabilities } = s
  const { buckets, share_links } = capabilities
  const can = useStorageCan()
  const write = can(s, "engineer")
  const reads = can(s, "operator")
  return useMemo(
    () =>
      storageSource(id, {
        readOnly: read_only || !write,
        listOnly: !reads,
        buckets,
        share_links: share_links && write,
      }),
    [id, read_only, write, reads, buckets, share_links],
  )
}

const basename = (path: string) => path.slice(path.lastIndexOf("/") + 1)

function storageSource(
  id: string,
  opts: {
    readOnly: boolean
    listOnly: boolean
    buckets: boolean
    share_links: boolean
  },
): FileSource {
  const f = api.storageFiles
  return {
    key: ["storage-files", id],
    noun: "storage",
    endpoint: { storage_id: id },
    readOnly: opts.readOnly,
    listOnly: opts.listOnly,
    buckets: opts.buckets,
    list: storageLister(id).list,
    read: (path) => f.readStorageFile(id, { path }),
    write: (v) =>
      f
        .writeStorageFile(id, v)
        .then((e) => ({ modified: e.modified ?? "", size: e.size })),
    search: (path, q) =>
      f.searchStorageFiles(id, { path, q }).then((r) => ({
        items: r.items.map(toStorageEntry),
        truncated: r.truncated,
      })),
    size: (path, signal) =>
      f.storageFolderSize(id, { path }, { signal }).then((r) => r.size),
    mkdir: (path) => f.storageMkdir(id, { path }),
    rename: ({ from, to }) =>
      f.storageRename(id, { path: from, name: basename(to) }),
    move: (v) => f.storageMove(id, v),
    copy: (v) => f.storageCopy(id, v),
    remove: (paths) => f.storageDelete(id, { paths }),
    ...(opts.share_links && {
      share: (path: string, expiresIn: number) =>
        f.shareStorageFile(id, { path, expires_in: expiresIn }),
    }),
    // Plain links, like a server's: several paths or a folder arrive as one
    // zip; `inline` opens media in the browser.
    downloadUrl: (paths, o = {}) => {
      const params = new URLSearchParams()
      for (const p of paths) params.append("path", p)
      if (o.inline) params.set("inline", "true")
      if (o.name) params.set("name", o.name)
      return `${API_URL}/storages/${id}/files/download?${params}`
    },
    uploadUrl: (path, overwrite) => {
      const params = new URLSearchParams({ path })
      if (overwrite) params.set("overwrite", "true")
      return `${API_URL}/storages/${id}/files/upload?${params}`
    },
  }
}

function Loading() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))] md:px-6 md:pt-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

function Missing({
  notFound,
  message,
  onRetry,
}: {
  notFound: boolean
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CloudOff className="size-5" />
      </span>
      <div>
        <h1 className="text-body font-medium">
          {notFound ? "Storage not found" : "Couldn't load this storage"}
        </h1>
        <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
          {notFound
            ? "It may have been removed, or the link is wrong."
            : message}
        </p>
      </div>
      <div className="flex gap-2">
        {!notFound && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Link href="/storage" className={buttonVariants()}>
          Back to storage
        </Link>
      </div>
    </div>
  )
}
