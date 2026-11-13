"use client"

import {
  CircleArrowUp,
  Copy,
  Ellipsis,
  Loader2,
  PackageCheck,
  SearchCheck,
  SearchX,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { DockerFleetServer, DockerImageUpdate } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  useActiveDockerJob,
  useApplyUpdates,
  useCheckUpdates,
  useDockerUpdates,
} from "../api"
import { AutoUpdateStrip } from "./auto-update-strip"
import { EnvPage } from "./env-page"
import { BulkBar, NoMatch, PageBar, Rows } from "./kit"
import { containerHref, Dot, dockerHref, shortId, type Tone } from "./meta"
import { useDockerCan } from "./permissions"

export const updateMeta: Record<
  DockerImageUpdate["state"],
  { label: string; tone: Tone; hint: string }
> = {
  available: {
    label: "Update available",
    tone: "brand",
    hint: "The registry has a newer image under the same tag.",
  },
  current: {
    label: "Up to date",
    tone: "success",
    hint: "The registry has the same image.",
  },
  local: {
    label: "Built here",
    tone: "muted",
    hint: "Not from a registry, so there is nothing to compare.",
  },
  pinned: {
    label: "Pinned",
    tone: "muted",
    hint: "Asked for by digest: it never changes.",
  },
  error: {
    label: "Couldn't check",
    tone: "warning",
    hint: "The registry didn't answer or refused the login.",
  },
  unchecked: {
    label: "Not checked",
    tone: "muted",
    hint: "Not checked yet: press Check now.",
  },
}

const shows = ["available", "all"] as const
type Show = (typeof shows)[number]

const filterParsers = {
  show: parseAsStringLiteral(shows).withDefault("available"),
  q: parseAsString.withDefault(""),
}

export const CHECK_JOBS = ["docker-update-check"]
export const UPDATE_JOBS = ["docker-update"]

// /containers/updates: which images in use have a newer version in their
// registry, and bringing containers onto it.
export function UpdatesView({
  env,
  phone,
}: {
  env: DockerFleetServer
  phone: boolean
}) {
  const id = env.server_id
  const can = useDockerCan(id, env.workspace_id)
  const router = useRouter()
  const query = useDockerUpdates(id)
  const check = useCheckUpdates()
  const checking = useActiveDockerJob(id, CHECK_JOBS)
  const updating = useActiveDockerJob(id, UPDATE_JOBS)
  const [filters, setFilters] = useQueryStates(filterParsers, {
    history: "replace",
  })
  const [picked, setPicked] = useState<string[]>([])
  const [confirm, setConfirm] = useState<DockerImageUpdate[]>([])
  const [asking, setAsking] = useOpen("docker-apply-updates")

  const items = query.data?.items ?? []
  const available = items.filter((i) => i.state === "available")
  const q = filters.q.trim().toLowerCase()
  const shown = items.filter(
    (i) =>
      (filters.show === "all" || i.state === "available") &&
      (!q ||
        i.image.toLowerCase().includes(q) ||
        i.containers.some((c) => c.name.toLowerCase().includes(q))),
  )
  const checkedAt = query.data?.checked_at

  const runCheck = () =>
    check.mutate(
      { server: id },
      {
        onError: (e) =>
          toast.error("Couldn't check", { description: e.message }),
      },
    )
  const askUpdate = (list: DockerImageUpdate[]) => {
    setConfirm(list)
    setAsking(true)
  }

  const busyCheck = check.isPending || !!checking
  const tabs = (
    <Segmented
      label="Show"
      value={filters.show}
      onChange={(show: Show) => setFilters({ show })}
      items={[
        { value: "available", label: `Available ${available.length}` },
        { value: "all", label: `All ${items.length}` },
      ]}
    />
  )

  let body: React.ReactNode
  if (query.isPending) {
    body = <Skeleton className="h-72 rounded-2xl max-md:mx-4" />
  } else if (query.isError) {
    body = (
      <Empty
        icon={SearchX}
        title="Couldn't read the images"
        body={query.error.message}
        className="max-md:mt-4"
      />
    )
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={PackageCheck}
        title="No containers to update"
        body="Images show up here once a container runs from them."
        className="max-md:mt-4"
      />
    )
  } else if (!checkedAt) {
    body = (
      <Empty
        icon={SearchCheck}
        title="Not checked yet"
        body="Morche asks each image's registry whether it has a newer image under the same tag (using the workspace's registry logins). Nothing is pulled until you update."
        className="max-md:mt-4"
        action={
          can.operate && (
            <Button onClick={runCheck} disabled={busyCheck}>
              {busyCheck ? (
                <Loader2 className="animate-spin" />
              ) : (
                <SearchCheck />
              )}
              Check now
            </Button>
          )
        }
      />
    )
  } else if (shown.length === 0) {
    body =
      filters.show === "available" && !q ? (
        <Empty
          icon={PackageCheck}
          title="Everything is up to date"
          body={`As of the last check, ${timeAgo(checkedAt).toLowerCase()}.`}
          className="max-md:mt-4"
          action={
            <Button
              variant="outline"
              onClick={() => setFilters({ show: "all" })}
            >
              See every image
            </Button>
          }
        />
      ) : (
        <NoMatch onReset={() => setFilters({ q: null, show: null })} />
      )
  } else if (phone) {
    body = (
      <Rows>
        {shown.map((u) => (
          <PhoneUpdate
            key={u.image}
            u={u}
            serverId={id}
            canUpdate={can.manage && !updating}
            onUpdate={() => askUpdate([u])}
          />
        ))}
      </Rows>
    )
  } else {
    const selectable = shown.filter((u) => u.state === "available")
    const all =
      selectable.length > 0 && selectable.every((u) => picked.includes(u.image))
    body = (
      <div className="@container overflow-hidden rounded-2xl border border-border [contain:inline-size]">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr>
              {can.manage && (
                <th scope="col" className="w-10 ps-4">
                  <Checkbox
                    aria-label="Select every update"
                    checked={all}
                    disabled={selectable.length === 0}
                    onCheckedChange={(v) =>
                      setPicked(v ? selectable.map((u) => u.image) : [])
                    }
                  />
                </th>
              )}
              <th scope="col" className="h-10 px-3 text-start font-medium">
                Image
              </th>
              <th scope="col" className="px-3 text-start font-medium">
                Status
              </th>
              <th scope="col" className="px-3 text-start font-medium">
                Used by
              </th>
              <th
                scope="col"
                className="hidden px-3 text-start font-medium @3xl:table-cell"
              >
                Digest
              </th>
              <th scope="col" className="w-12 pe-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((u) => (
              <tr key={u.image} className="hover:bg-subtle/60">
                {can.manage && (
                  <td className="ps-4">
                    <Checkbox
                      aria-label={`Select ${u.image}`}
                      disabled={u.state !== "available"}
                      checked={picked.includes(u.image)}
                      onCheckedChange={(v) =>
                        setPicked((p) =>
                          v ? [...p, u.image] : p.filter((x) => x !== u.image),
                        )
                      }
                    />
                  </td>
                )}
                <td
                  className={cn("max-w-80 px-3 py-2.5", !can.manage && "ps-4")}
                >
                  <span className="block truncate font-medium" title={u.image}>
                    {u.image}
                  </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <UpdateState u={u} />
                </td>
                <td className="max-w-72 px-3 py-2.5">
                  <Users u={u} serverId={id} />
                </td>
                <td className="hidden px-3 py-2.5 font-mono text-caption text-muted-foreground @3xl:table-cell">
                  <Digests u={u} />
                </td>
                <td className="pe-2 text-end">
                  <ItemMenu
                    label={`${u.image} actions`}
                    groups={updateMenu(u, {
                      serverId: id,
                      go: router.push,
                      canUpdate: can.manage && !updating,
                      onUpdate: () => askUpdate([u]),
                    })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const pickedItems = available.filter((u) => picked.includes(u.image))

  return (
    <>
      <PageBar
        phone={phone}
        tabs={tabs}
        search={
          <SearchBox
            value={filters.q}
            onChange={(v) => setFilters({ q: v || null })}
            placeholder="Search images or containers"
            label="Search images"
            className="md:max-w-72"
          />
        }
        caption={
          checking
            ? "Checking the registries…"
            : checkedAt
              ? `Checked ${timeAgo(checkedAt).toLowerCase()}`
              : "Never checked"
        }
        refresh={{ busy: query.isFetching, run: () => query.refetch() }}
        aside={
          !phone &&
          can.manage &&
          available.length > 0 && (
            <Button
              variant="outline"
              disabled={!!updating}
              onClick={() => askUpdate(available)}
            >
              {updating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CircleArrowUp />
              )}
              {updating ? "Updating…" : `Update all ${available.length}`}
            </Button>
          )
        }
        primary={
          can.operate
            ? {
                label: busyCheck ? "Checking…" : "Check now",
                icon: busyCheck ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <SearchCheck />
                ),
                run: busyCheck ? () => {} : runCheck,
              }
            : undefined
        }
      />
      {phone && can.manage && available.length > 0 && (
        <div className="px-4 pt-3">
          <Button
            className="h-11 w-full"
            disabled={!!updating}
            onClick={() => askUpdate(available)}
          >
            {updating ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CircleArrowUp />
            )}
            {updating ? "Updating…" : `Update all ${available.length}`}
          </Button>
        </div>
      )}
      <AutoUpdateStrip
        server={id}
        workspace={env.workspace_id}
        total={env.total}
        phone={phone}
      />
      <div className={cn(phone ? "pt-3 pb-24" : "mt-4")}>{body}</div>
      {!phone && pickedItems.length > 0 && (
        <BulkBar
          count={pickedItems.length}
          onClear={() => setPicked([])}
          actions={[
            {
              label: "Update",
              icon: <CircleArrowUp />,
              run: () => askUpdate(pickedItems),
            },
          ]}
        />
      )}
      <ApplyDialog
        open={asking}
        onOpenChange={setAsking}
        serverId={id}
        list={confirm}
        onDone={() => setPicked([])}
      />
    </>
  )
}

function UpdateState({ u }: { u: DockerImageUpdate }) {
  const meta = updateMeta[u.state]
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={u.error || meta.hint}
    >
      <Dot tone={meta.tone} />
      <span className={cn(u.state === "available" && "font-medium text-brand")}>
        {meta.label}
      </span>
    </span>
  )
}

function Users({ u, serverId }: { u: DockerImageUpdate; serverId: string }) {
  const first = u.containers.slice(0, 3)
  const more = u.containers.length - first.length
  return (
    <span className="block truncate text-muted-foreground">
      {first.map((c, i) => (
        <span key={c.id}>
          {i > 0 && ", "}
          <Link
            href={containerHref(serverId, c.name)}
            className="hover:text-foreground hover:underline"
          >
            {c.name}
          </Link>
        </span>
      ))}
      {more > 0 && ` +${more}`}
    </span>
  )
}

function Digests({ u }: { u: DockerImageUpdate }) {
  if (!u.local_digest) return <span>—</span>
  const local = shortDigest(u.local_digest)
  if (u.state !== "available" || !u.remote_digest) return <span>{local}</span>
  return (
    <span>
      {local} →{" "}
      <span className="text-foreground">{shortDigest(u.remote_digest)}</span>
    </span>
  )
}

function shortDigest(d: string) {
  return shortId(d.replace(/^sha256:/, ""))
}

function updateMenu(
  u: DockerImageUpdate,
  o: {
    serverId: string
    canUpdate: boolean
    onUpdate: () => void
    go: (href: string) => void
  },
): Item[][] {
  return [
    u.state === "available" && o.canUpdate
      ? [
          {
            key: "update",
            label: `Update ${u.containers.length === 1 ? "the container" : `${u.containers.length} containers`}`,
            icon: <CircleArrowUp />,
            onSelect: o.onUpdate,
          },
        ]
      : [],
    [
      {
        key: "copy",
        label: "Copy image name",
        icon: <Copy />,
        onSelect: () => {
          navigator.clipboard
            .writeText(u.image)
            .then(() => toast.success("Copied"))
            .catch(() => toast.error("Couldn't copy"))
        },
      },
      {
        key: "containers",
        label: "Show its containers",
        icon: <SearchCheck />,
        onSelect: () => {
          o.go(dockerHref(o.serverId, { q: imageQuery(u.image) }))
        },
      },
    ],
  ]
}

function imageQuery(image: string) {
  return image.replace(/^docker\.io\/(library\/)?/, "")
}

function PhoneUpdate({
  u,
  serverId,
  canUpdate,
  onUpdate,
}: {
  u: DockerImageUpdate
  serverId: string
  canUpdate: boolean
  onUpdate: () => void
}) {
  const [open, setOpen] = useOpen(`docker-update-${u.image}`)
  const meta = updateMeta[u.state]
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start active:bg-muted"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-medium">{u.image}</span>
          <span className="flex items-center gap-1.5 truncate text-caption text-muted-foreground">
            <Dot tone={meta.tone} />
            {meta.label} · {u.containers.length}{" "}
            {u.containers.length === 1 ? "container" : "containers"}
          </span>
        </span>
        <Ellipsis className="size-5 shrink-0 text-ash" />
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={u.image}
        footer={
          u.state === "available" &&
          canUpdate && (
            <Button
              className="h-11 w-full"
              onClick={() => {
                window.addEventListener("popstate", onUpdate, { once: true })
                setOpen(false)
              }}
            >
              <CircleArrowUp />
              Update
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-4 px-4 pb-4">
          <p className="text-body-sm text-muted-foreground">
            {u.error || meta.hint}
          </p>
          {u.local_digest && (
            <p className="font-mono text-caption text-muted-foreground">
              <Digests u={u} />
            </p>
          )}
          <div>
            <p className="mb-1 font-label text-caption tracking-label text-ash uppercase">
              Used by
            </p>
            <ul className="divide-y divide-border">
              {u.containers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={containerHref(serverId, c.name)}
                    className="flex min-h-11 items-center justify-between gap-2 text-body"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-caption text-muted-foreground">
                      {c.project ? `${c.project} · ${c.service}` : c.state}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </BottomSheet>
    </li>
  )
}

function ApplyDialog({
  open,
  onOpenChange,
  serverId,
  list,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  list: DockerImageUpdate[]
  onDone: () => void
}) {
  const apply = useApplyUpdates()
  const containers = list.flatMap((u) => u.containers)
  const compose = containers.filter((c) => c.project).length
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      destructive={false}
      title={
        list.length === 1
          ? `Update ${list[0].image}?`
          : `Update ${list.length} images?`
      }
      description={
        <>
          Pulls the new image, then recreates{" "}
          {containers.length === 1
            ? "its container"
            : `its ${containers.length} containers`}{" "}
          with the same settings
          {compose > 0 &&
            " (compose services through docker compose, one service at a time)"}
          . Each one restarts once; the old container is kept until the new one
          runs.
        </>
      }
      confirmLabel="Update"
      pending={apply.isPending}
      onConfirm={() =>
        apply.mutate(
          { server: serverId, containers: containers.map((c) => c.id) },
          {
            onSuccess: () => {
              onOpenChange(false)
              onDone()
            },
            onError: (e) =>
              toast.error("Couldn't start the update", {
                description: e.message,
              }),
          },
        )
      }
    />
  )
}

export function UpdatesPage() {
  return (
    <EnvPage title="Updates" bleed>
      {(ctx) => <UpdatesView {...ctx} />}
    </EnvPage>
  )
}
