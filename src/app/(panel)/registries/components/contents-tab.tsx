"use client"

import {
  BrushCleaning,
  ChevronRight,
  Copy,
  Package,
  RefreshCw,
  Trash2,
  Warehouse,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { CopyCode } from "@/components/code-block"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounced } from "@/hooks/useDebounced"
import { useOpen } from "@/hooks/useOpen"
import type { ApiError } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  PackageRegistry,
  RegistryItem,
  RegistryVersion,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useDeleteRegistryItem,
  useRegistryItem,
  useRegistryItems,
} from "../api"
import { kindMeta, shortDigest } from "./meta"
import { useRegistryCan } from "./permissions"
import { useRegistryActions } from "./registry-actions"

type Show = "all" | "ours" | "mirror"

export function ContentsTab({
  r,
  phone,
}: {
  r: PackageRegistry
  phone: boolean
}) {
  const can = useRegistryCan()
  const a = useRegistryActions()
  const [q, setQ] = useState("")
  const [show, setShow] = useState<Show>("all")
  const [project, setProject] = useState<string>("")
  const needle = useDebounced(q.trim(), 300)
  const list = useRegistryItems(r, r.kind === "harbor" ? needle : "")
  const meta = kindMeta[r.kind]
  const [openName, setOpenName] = useState<string | null>(null)
  const [layerOpen, setLayerOpen] = useOpen("registry-item")
  const [doomed, setDoomed] = useState<{ name: string; ref?: string } | null>(
    null,
  )
  const [confirmOpen, setConfirmOpen] = useOpen("registry-item-delete")
  const del = useDeleteRegistryItem(r.id)

  if (r.state !== "ready")
    return (
      <Empty
        icon={Warehouse}
        title="Not ready yet"
        body={`Its ${meta.nouns} show here once it's deployed.`}
      />
    )

  const items = (list.data?.items ?? []).filter((it) => {
    if (
      r.kind === "verdaccio" &&
      needle &&
      !it.name.toLowerCase().includes(needle.toLowerCase())
    )
      return false
    if (show === "ours" && it.mirror) return false
    if (show === "mirror" && !it.mirror) return false
    if (project && it.project !== project) return false
    return true
  })
  const ours = (list.data?.items ?? []).filter((i) => !i.mirror).length
  const mirrored = (list.data?.items ?? []).length - ours

  const open = (name: string) => {
    setOpenName(name)
    setLayerOpen(true)
  }
  const askDelete = (name: string, ref?: string) => {
    setDoomed({ name, ref })
    setConfirmOpen(true)
  }

  const bar = (
    <div className={cn("flex flex-wrap items-center gap-3", phone && "px-4")}>
      <SearchBox
        value={q}
        onChange={setQ}
        placeholder={`Search ${meta.nouns}`}
        label={`Search ${meta.nouns}`}
        className={cn(phone && "w-full")}
      />
      <Segmented
        label="Show"
        value={show}
        onChange={setShow}
        items={[
          {
            value: "all",
            label: `All ${list.data ? list.data.items.length : ""}`,
          },
          {
            value: "ours",
            label: `${r.kind === "harbor" ? "Pushed" : "Published"} ${list.data ? ours : ""}`,
          },
          {
            value: "mirror",
            label: `From the mirror ${list.data ? mirrored : ""}`,
          },
        ]}
      />
      <span className="flex-1" />
      {list.data && list.data.total > list.data.items.length && (
        <span className="text-caption text-ash">
          Newest {list.data.items.length} of {list.data.total}: search to find
          others
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Refresh"
        title="Refresh"
        disabled={list.isFetching}
        onClick={() => list.refetch()}
      >
        <RefreshCw className={cn(list.isFetching && "animate-spin")} />
      </Button>
      {r.kind === "harbor" && can(r, "engineer") && (
        <Button variant="outline" onClick={() => a.run(r, "cleanup")}>
          <BrushCleaning />
          Free space now
        </Button>
      )}
    </div>
  )

  const projects = r.kind === "harbor" ? (list.data?.projects ?? []) : []

  return (
    <div className="grid min-w-0 gap-4">
      {bar}
      {projects.length > 1 && (
        <div
          className={cn(
            "no-scrollbar flex gap-2 overflow-x-auto",
            phone && "px-4",
          )}
        >
          <Chip
            on={!project}
            onClick={() => setProject("")}
            label="Every project"
          />
          {projects.map((p) => (
            <Chip
              key={p.name}
              on={project === p.name}
              onClick={() => setProject(project === p.name ? "" : p.name)}
              label={p.name}
              count={p.repos}
              tag={p.mirror ? "Cache" : p.public ? "Public" : undefined}
            />
          ))}
        </div>
      )}
      {list.isPending ? (
        <div className={cn("grid gap-2", phone && "px-4")}>
          {Array.from({ length: 5 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : list.isError ? (
        <Empty
          icon={Warehouse}
          title={`Couldn't read its ${meta.nouns}`}
          body={list.error.message}
          action={
            <Button variant="outline" onClick={() => list.refetch()}>
              Try again
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <Empty
          icon={Package}
          title={
            list.data?.items.length
              ? `No ${meta.noun} matches`
              : `No ${meta.nouns} yet`
          }
          body={
            list.data?.items.length
              ? "Try another name or filter."
              : r.kind === "harbor"
                ? "Push an image (see Use it on the Overview), or pull one through the Docker Hub cache."
                : "Publish a package or install one through the mirror (see Use it on the Overview)."
          }
        />
      ) : phone ? (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((it) => (
            <li key={it.name}>
              <button
                type="button"
                onClick={() => open(it.name)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-body-sm">{it.name}</p>
                  <p className="truncate text-caption text-muted-foreground">
                    <ItemFacts r={r} it={it} />
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border [contain:inline-size]">
          <table className="w-full table-fixed text-body-sm">
            <thead className="bg-subtle text-caption text-ash">
              <tr className="text-start">
                <th className="w-[44%] px-4 py-2.5 text-start font-normal">
                  Name
                </th>
                <th className="px-3 py-2.5 text-start font-normal">
                  {r.kind === "harbor" ? "Artifacts" : "Versions"}
                </th>
                <th className="px-3 py-2.5 text-start font-normal">
                  {r.kind === "harbor" ? "Pulls" : "Size here"}
                </th>
                <th className="px-3 py-2.5 text-start font-normal">Updated</th>
                <th className="w-24 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr
                  key={it.name}
                  className="cursor-pointer hover:bg-subtle"
                  onClick={() => open(it.name)}
                >
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-mono">{it.name}</span>
                      {it.mirror ? (
                        <Tag>{r.kind === "harbor" ? "Cache" : "npmjs"}</Tag>
                      ) : (
                        r.kind === "verdaccio" && <Tag brand>Private</Tag>
                      )}
                    </div>
                    {it.description && (
                      <p className="truncate text-caption text-muted-foreground">
                        {it.description}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    {it.versions}
                    {it.latest && (
                      <span className="ms-1.5 text-caption text-ash">
                        latest {it.latest}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {r.kind === "harbor" ? it.pulls : formatSize(it.size)}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {it.updated && !it.updated.startsWith("0001")
                      ? timeAgo(it.updated)
                      : "—"}
                  </td>
                  <td className="p-3 text-end">
                    {can(r, "engineer") && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${it.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          askDelete(it.name)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openName && (
        <ItemLayer
          r={r}
          name={openName}
          open={layerOpen}
          onOpenChange={setLayerOpen}
          onDelete={(ref) => askDelete(openName, ref)}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          doomed?.ref
            ? `Delete ${shortDigest(doomed.ref)}?`
            : `Delete ${doomed?.name ?? ""}?`
        }
        description={
          r.kind === "harbor"
            ? doomed?.ref
              ? "This artifact and every tag on it go. Servers that run it keep their copy; new pulls fail. The space comes back at the next cleanup."
              : "Every artifact and tag in this repository goes. The space comes back at the next cleanup."
            : "Every version of this package goes from the registry. Projects that depend on it can't install it any more."
        }
        confirmLabel="Delete"
        pending={del.isPending}
        onConfirm={() =>
          doomed &&
          del.mutate(doomed, {
            onSuccess: () => {
              setConfirmOpen(false)
              toast.success(
                `Deleted ${doomed.ref ? shortDigest(doomed.ref) : doomed.name}`,
              )
              if (!doomed.ref) setLayerOpen(false)
            },
            onError: (e) => toast.error((e as ApiError).message),
          })
        }
      />
    </div>
  )
}

function ItemFacts({ r, it }: { r: PackageRegistry; it: RegistryItem }) {
  const parts = [
    `${it.versions} ${r.kind === "harbor" ? (it.versions === 1 ? "artifact" : "artifacts") : it.versions === 1 ? "version" : "versions"}`,
    r.kind === "harbor" ? `${it.pulls} pulls` : formatSize(it.size),
    it.mirror
      ? r.kind === "harbor"
        ? "cache"
        : "from npmjs"
      : r.kind === "verdaccio"
        ? "private"
        : "",
  ].filter(Boolean)
  return <>{parts.join(" · ")}</>
}

function Chip({
  on,
  onClick,
  label,
  count,
  tag,
}: {
  on: boolean
  onClick: () => void
  label: string
  count?: number
  tag?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-body-sm whitespace-nowrap outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
    >
      {label}
      {count !== undefined && (
        <span className="text-caption text-ash">{count}</span>
      )}
      {tag && (
        <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
          {tag}
        </span>
      )}
    </button>
  )
}

function Tag({ children, brand }: { children: string; brand?: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-px text-[11px] whitespace-nowrap",
        brand
          ? "bg-brand-soft text-brand-strong"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

// One repository's artifacts or one package's versions.
function ItemLayer({
  r,
  name,
  open,
  onOpenChange,
  onDelete,
}: {
  r: PackageRegistry
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (ref?: string) => void
}) {
  const q = useRegistryItem(r, open ? name : null)
  const can = useRegistryCan()
  const harbor = r.kind === "harbor"
  const pullOf = (v: RegistryVersion) =>
    harbor
      ? `docker pull ${r.address}/${name}${v.tags[0] ? `:${v.tags[0]}` : `@${v.ref}`}`
      : `npm install ${name}@${v.ref} --registry ${r.url}/`
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      description={
        q.data?.description || (harbor ? `${r.address}/${name}` : undefined)
      }
      className="sm:max-w-3xl"
      footer={
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          {can(r, "engineer") && (
            <Button
              variant="ghost"
              className="text-destructive max-md:h-11"
              onClick={() => onDelete()}
            >
              <Trash2 />
              Delete {harbor ? "repository" : "package"}
            </Button>
          )}
          <Button className="max-md:h-11" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      }
    >
      {q.isPending ? (
        <div className="grid gap-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : q.isError ? (
        <p className="text-body-sm text-destructive">{q.error.message}</p>
      ) : (
        <div className="grid gap-4">
          {!harbor && (q.data.license || webLink(q.data.homepage)) && (
            <p className="text-caption text-muted-foreground">
              {q.data.license && <>License {q.data.license}</>}
              {q.data.license && webLink(q.data.homepage) && " · "}
              {webLink(q.data.homepage) && (
                <a
                  href={webLink(q.data.homepage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  Homepage
                </a>
              )}
            </p>
          )}
          {q.data.versions.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">Nothing in it.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {q.data.versions.map((v) => (
                <li
                  key={v.ref}
                  className="flex min-w-0 items-center gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {harbor ? (
                        <>
                          {v.tags.length ? (
                            v.tags.slice(0, 6).map((t) => (
                              <span
                                key={t}
                                className="rounded-md bg-brand-soft px-1.5 font-mono text-caption text-brand-strong"
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-caption text-ash">
                              untagged
                            </span>
                          )}
                          <span className="font-mono text-caption text-ash">
                            {shortDigest(v.ref)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-body-sm">
                            {v.ref}
                          </span>
                          {v.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-md bg-brand-soft px-1.5 font-mono text-caption text-brand-strong"
                            >
                              {t}
                            </span>
                          ))}
                          {v.deprecated && <Tag>Deprecated</Tag>}
                        </>
                      )}
                    </div>
                    <p className="truncate text-caption text-muted-foreground">
                      {[
                        v.size >= 0 ? formatSize(v.size) : "not kept here",
                        v.platforms.length ? v.platforms.join(", ") : "",
                        v.pushed ? `pushed ${timeAgo(v.pushed)}` : "",
                        v.pulled ? `pulled ${timeAgo(v.pulled)}` : "",
                        v.author ? `by ${v.author}` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <CopyCode
                    text={pullOf(v)}
                    label={harbor ? "pull command" : "install command"}
                  />
                  {harbor && can(r, "engineer") && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${shortDigest(v.ref)}`}
                      onClick={() => onDelete(v.ref)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {harbor && (
            <p className="flex items-center gap-1.5 text-caption text-ash">
              <Copy className="size-3.5" />
              The copy button gives the pull command for that artifact.
            </p>
          )}
        </div>
      )}
    </ResponsiveDialog>
  )
}

// A package's homepage comes from whoever published it: link only http(s).
function webLink(url: string | undefined) {
  try {
    const u = new URL(url ?? "")
    return u.protocol === "https:" || u.protocol === "http:"
      ? u.href
      : undefined
  } catch {
    return undefined
  }
}
