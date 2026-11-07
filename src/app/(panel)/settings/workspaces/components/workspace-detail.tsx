"use client"

import {
  AppWindow,
  ArrowRightLeft,
  ChevronLeft,
  HardDrive,
  Pencil,
  Server,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { use, useMemo } from "react"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { useWorkspaceDetail } from "@/components/access/api"
import { ResourceAccess } from "@/components/access/grants"
import { useAccess } from "@/components/auth/auth"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { PageHeader } from "@/components/panel/page-header"
import { WorkspaceAvatar } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { NoAccess } from "../../components/no-access"
import { useWorkspacesActions } from "./workspaces-actions"

export function WorkspaceDetailView({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { admin, workspaceLevel } = useAccess()
  if (!admin && workspaceLevel(id) !== "owner") {
    return (
      <NoAccess text="Only an admin or this workspace's owner can open this." />
    )
  }
  return <Detail id={id} />
}

function Detail({ id }: { id: string }) {
  const phone = useIsPhone()
  const router = useRouter()
  const back = useBack("/settings/workspaces")
  const { admin } = useAccess()
  const a = useWorkspacesActions()
  const detail = useWorkspaceDetail(id)
  const workspace = detail.data

  usePageCrumbs(
    useMemo(
      () =>
        workspace
          ? [{ label: workspace.name, href: `/settings/workspaces/${id}` }]
          : [],
      [workspace, id],
    ),
  )

  if (phone === null) return null
  if (detail.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }
  if (detail.isError || !workspace) {
    return (
      <p className="px-4 py-6 text-body-sm text-destructive md:px-6">
        {detail.error?.message ?? "This workspace is gone."}
      </p>
    )
  }

  const servers = workspace.servers ?? []
  const storages = workspace.storages ?? []
  const apps = workspace.apps ?? []
  const total = servers.length + storages.length + apps.length
  const everything = {
    from: id,
    title: `Move everything out of ${workspace.name}`,
    server_ids: servers.map((s) => s.id),
    storage_ids: storages.map((s) => s.id),
    app_ids: apps.map((s) => s.id),
  }

  return (
    <>
      {phone && (
        <button
          type="button"
          className="flex h-11 items-center gap-1 px-2 text-body-sm"
          onClick={back}
        >
          <ChevronLeft className="size-5" />
          Workspaces
        </button>
      )}
      <PageHeader
        title={workspace.name}
        icon={
          <WorkspaceAvatar
            workspace={workspace}
            className="size-10 rounded-lg text-body"
          />
        }
        guide="access"
        description={workspace.description || undefined}
        actions={
          admin && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="max-md:h-11"
                onClick={() => a.edit(workspace)}
              >
                <Pencil />
                Edit
              </Button>
              <Button
                variant="outline"
                className="max-md:h-11"
                onClick={() =>
                  a.remove(workspace, () =>
                    router.replace("/settings/workspaces"),
                  )
                }
              >
                <Trash2 />
                Delete
              </Button>
            </div>
          )
        }
      />
      <div className="grid gap-8 px-4 py-5 md:px-6 xl:grid-cols-2">
        <section className="min-w-0">
          <h2 className="mb-3 font-medium">Who has access</h2>
          <ResourceAccess
            scope={{ workspace_id: id }}
            kind="workspace"
            workspaceId={id}
          />
        </section>
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-medium">In this workspace</h2>
            {admin && total > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="max-md:h-11"
                onClick={() => a.move(everything)}
              >
                <ArrowRightLeft />
                Move all…
              </Button>
            )}
          </div>
          {total === 0 ? (
            <Empty
              icon={Server}
              title="Nothing here yet"
              body="Servers, storage and services added while this workspace is selected land here."
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border md:rounded-2xl md:border">
              {servers.map((s) => (
                <Row
                  key={s.id}
                  icon={<Server className="size-4" />}
                  name={s.name}
                  detail={s.host}
                  href={`/servers/${s.id}`}
                  onMove={
                    admin
                      ? () =>
                          a.move({
                            from: id,
                            title: `Move ${s.name}`,
                            server_ids: [s.id],
                            storage_ids: [],
                            app_ids: [],
                          })
                      : undefined
                  }
                />
              ))}
              {storages.map((s) => (
                <Row
                  key={s.id}
                  icon={<HardDrive className="size-4" />}
                  name={s.name}
                  detail={s.protocol}
                  href={`/storage/${s.id}`}
                  onMove={
                    admin
                      ? () =>
                          a.move({
                            from: id,
                            title: `Move ${s.name}`,
                            server_ids: [],
                            storage_ids: [s.id],
                            app_ids: [],
                          })
                      : undefined
                  }
                />
              ))}
              {apps.map((s) => (
                <Row
                  key={s.id}
                  icon={<AppWindow className="size-4" />}
                  name={s.name}
                  detail={s.address}
                  href="/services"
                  onMove={
                    admin
                      ? () =>
                          a.move({
                            from: id,
                            title: `Move ${s.name}`,
                            server_ids: [],
                            storage_ids: [],
                            app_ids: [s.id],
                          })
                      : undefined
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function Row({
  icon,
  name,
  detail,
  href,
  onMove,
}: {
  icon: React.ReactNode
  name: string
  detail: string
  href: string
  onMove?: () => void
}) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <Link
        href={href}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center"
      >
        <span className="block truncate text-body-sm font-medium">{name}</span>
        <span className="block truncate text-caption text-muted-foreground">
          {detail}
        </span>
      </Link>
      {onMove && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground max-md:size-11"
          aria-label={`Move ${name} to another workspace`}
          title="Move to another workspace"
          onClick={onMove}
        >
          <ArrowRightLeft />
        </Button>
      )}
    </li>
  )
}
