"use client"

import { Link2, Tag, Trash2, Unlink } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type {
  DockerImage,
  DockerNetwork,
  DockerRef,
  DockerVolume,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { timeAgo } from "../../servers/components/meta"
import { useDockerImage, useDockerNetworks, useDockerVolumes } from "../api"
import { containerHref, Dot, imageName, shortId, stateOf } from "./meta"
import { Block, CopyButton, Layer, Pairs, Quiet } from "./parts"

type Base = {
  server: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function KeyValues({ map }: { map: Record<string, string> }) {
  const keys = Object.keys(map).sort()
  if (keys.length === 0) return <Quiet>None.</Quiet>
  return (
    <dl className="divide-y divide-border rounded-xl border border-border font-mono text-caption">
      {keys.map((k) => (
        <div key={k} className="flex flex-col gap-0.5 px-3 py-2">
          <dt className="break-all text-muted-foreground">{k}</dt>
          <dd className="break-all">{map[k] || "—"}</dd>
        </div>
      ))}
    </dl>
  )
}

function UsedBy({ server, refs }: { server: string; refs: DockerRef[] }) {
  if (refs.length === 0) return <Quiet>No container uses it.</Quiet>
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {refs.map((r) => (
        <li key={r.id}>
          <Link
            href={containerHref(server, r.name || r.id)}
            className="flex min-h-11 items-center gap-2 px-3 py-2 text-body-sm hover:bg-muted md:min-h-0"
          >
            <Dot tone={stateOf(r).tone} />
            <span className="min-w-0 flex-1 truncate font-medium">
              {r.name}
            </span>
            <span className="text-caption text-muted-foreground">
              {stateOf(r).label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Act({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <Button
      variant={destructive ? "destructive" : "outline"}
      size="sm"
      className="max-md:h-11 max-md:flex-1"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  )
}

// --- Image -----------------------------------------------------------------

export function ImageDetails({
  server,
  image,
  open,
  onOpenChange,
  manage,
  onTag,
  onRemove,
}: Base & {
  image: DockerImage
  manage: boolean
  onTag: () => void
  onRemove: () => void
}) {
  const q = useDockerImage(server, open ? image.id : null)
  const d = q.data
  const title = image.tags[0] ? imageName(image.tags[0]) : shortId(image.id)
  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      subtitle={
        <span className="font-mono">
          {shortId(image.id)} · {formatSize(image.size)}
        </span>
      }
      actions={
        manage ? (
          <>
            <Act icon={<Tag />} label="Add tag" onClick={onTag} />
            <Act
              icon={<Trash2 />}
              label="Remove"
              destructive
              onClick={onRemove}
            />
          </>
        ) : null
      }
    >
      {q.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : q.isError ? (
        <Quiet>{q.error.message}</Quiet>
      ) : d ? (
        <>
          <Block title="About">
            <Pairs
              rows={[
                {
                  label: "Tags",
                  value: d.tags.length
                    ? d.tags.map(imageName).join(", ")
                    : "Untagged",
                  mono: true,
                },
                { label: "Created", value: timeAgo(d.created) },
                {
                  label: "Platform",
                  value: [d.os, d.architecture, d.variant]
                    .filter(Boolean)
                    .join("/"),
                  mono: true,
                },
                { label: "Size", value: formatSize(d.size) },
                { label: "Layers", value: String(d.layers) },
                { label: "Author", value: d.author },
                {
                  label: "Digest",
                  value: d.digests[0] && (
                    <span className="flex items-start gap-1">
                      <span className="min-w-0 flex-1">{d.digests[0]}</span>
                      <CopyButton value={d.digests[0]} label="Copy digest" />
                    </span>
                  ),
                  mono: true,
                },
              ]}
            />
          </Block>
          <Block title="Runs by default">
            <Pairs
              rows={[
                {
                  label: "Entrypoint",
                  value: d.entrypoint.join(" "),
                  mono: true,
                },
                { label: "Command", value: d.command.join(" "), mono: true },
                { label: "Working dir", value: d.working_dir, mono: true },
                { label: "User", value: d.user, mono: true },
                {
                  label: "Ports",
                  value: d.exposed_ports.join(", "),
                  mono: true,
                },
                { label: "Volumes", value: d.volumes.join(", "), mono: true },
              ]}
            />
          </Block>
          <Block title={`Used by · ${d.used_by.length}`}>
            <UsedBy server={server} refs={d.used_by} />
          </Block>
          <Block title="Environment">
            {d.env_hidden ? (
              <Quiet>Values need Engineer access.</Quiet>
            ) : d.env.length === 0 ? (
              <Quiet>None.</Quiet>
            ) : (
              <KeyValues
                map={Object.fromEntries(d.env.map((e) => [e.name, e.value]))}
              />
            )}
          </Block>
          {Object.keys(d.labels).length > 0 && (
            <Block title="Labels">
              <KeyValues map={d.labels} />
            </Block>
          )}
          <Block title={`History · ${d.history.length} steps`}>
            <ol className="divide-y divide-border rounded-xl border border-border">
              {d.history.map((h, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: build steps have no id of their own
                  key={i}
                  className="flex gap-3 px-3 py-2 text-caption"
                >
                  <span className="w-16 shrink-0 text-end text-muted-foreground tabular-nums">
                    {h.size ? formatSize(h.size) : "0 B"}
                  </span>
                  <code className="min-w-0 flex-1 font-mono break-all whitespace-pre-wrap">
                    {h.created_by
                      .replace(/^\/bin\/sh -c #\(nop\)\s*/, "")
                      .replace(/^\/bin\/sh -c /, "RUN ")}
                  </code>
                </li>
              ))}
            </ol>
          </Block>
        </>
      ) : null}
    </Layer>
  )
}

// --- Volume ----------------------------------------------------------------

export function VolumeDetails({
  server,
  name,
  open,
  onOpenChange,
  manage,
  onRemove,
}: Base & {
  name: string
  manage: boolean
  onRemove: (v: DockerVolume) => void
}) {
  const list = useDockerVolumes(server, false, open)
  const v = list.data?.find((x) => x.name === name)
  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={v?.anonymous ? shortId(name) : name}
      subtitle={v ? `${v.driver} volume` : undefined}
      actions={
        manage && v ? (
          <Act
            icon={<Trash2 />}
            label="Remove"
            destructive
            onClick={() => onRemove(v)}
          />
        ) : null
      }
    >
      {!v ? (
        list.isPending ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <Quiet>This volume is gone.</Quiet>
        )
      ) : (
        <>
          <Block title="About">
            <Pairs
              rows={[
                { label: "Name", value: v.name, mono: true },
                { label: "Driver", value: v.driver },
                { label: "Scope", value: v.scope },
                { label: "Compose project", value: v.project },
                { label: "Created", value: v.created && timeAgo(v.created) },
                {
                  label: "Size",
                  value: v.size >= 0 ? formatSize(v.size) : undefined,
                },
                {
                  label: "On the server",
                  value: (
                    <span className="flex items-start gap-1">
                      <span className="min-w-0 flex-1">{v.mountpoint}</span>
                      <CopyButton value={v.mountpoint} label="Copy path" />
                    </span>
                  ),
                  mono: true,
                },
              ]}
            />
          </Block>
          <Block title={`Used by · ${v.used_by.length}`}>
            <UsedBy server={server} refs={v.used_by} />
          </Block>
          {Object.keys(v.options).length > 0 && (
            <Block title="Driver options">
              <KeyValues map={v.options} />
            </Block>
          )}
          {Object.keys(v.labels).length > 0 && (
            <Block title="Labels">
              <KeyValues map={v.labels} />
            </Block>
          )}
        </>
      )}
    </Layer>
  )
}

// --- Network ---------------------------------------------------------------

export function NetworkDetails({
  server,
  id,
  open,
  onOpenChange,
  manage,
  onConnect,
  onDisconnect,
  onRemove,
}: Base & {
  id: string
  manage: boolean
  onConnect: (n: DockerNetwork) => void
  onDisconnect: (n: DockerNetwork, container: string, name: string) => void
  onRemove: (n: DockerNetwork) => void
}) {
  const list = useDockerNetworks(server, open)
  const n = list.data?.find((x) => x.id === id)
  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={n?.name ?? "Network"}
      subtitle={
        n
          ? `${n.driver} · ${n.scope}${n.internal ? " · internal" : ""}`
          : undefined
      }
      actions={
        manage && n && !n.builtin ? (
          <>
            {n.driver !== "host" && n.driver !== "null" && (
              <Act
                icon={<Link2 />}
                label="Connect a container"
                onClick={() => onConnect(n)}
              />
            )}
            <Act
              icon={<Trash2 />}
              label="Remove"
              destructive
              onClick={() => onRemove(n)}
            />
          </>
        ) : null
      }
    >
      {!n ? (
        list.isPending ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <Quiet>This network is gone.</Quiet>
        )
      ) : (
        <>
          {n.builtin && (
            <Quiet>
              Docker's own network: it can't be removed, and containers join it
              when they start.
            </Quiet>
          )}
          <Block title="About">
            <Pairs
              rows={[
                { label: "ID", value: shortId(n.id), mono: true },
                { label: "Driver", value: n.driver },
                { label: "Scope", value: n.scope },
                { label: "Compose project", value: n.project },
                {
                  label: "Options",
                  value: [
                    n.internal && "Internal",
                    n.attachable && "Attachable",
                    n.ipv6 && "IPv6",
                  ]
                    .filter(Boolean)
                    .join(", "),
                },
                { label: "Created", value: n.created && timeAgo(n.created) },
              ]}
            />
          </Block>
          {n.subnets.length > 0 && (
            <Block title="Addresses">
              <Pairs
                rows={n.subnets.flatMap((s, i) => [
                  {
                    label: `Subnet${i ? ` ${i + 1}` : ""}`,
                    value: s.subnet,
                    mono: true,
                  },
                  ...(s.gateway
                    ? [{ label: "Gateway", value: s.gateway, mono: true }]
                    : []),
                  ...(s.ip_range
                    ? [{ label: "Hands out", value: s.ip_range, mono: true }]
                    : []),
                ])}
              />
            </Block>
          )}
          <Block title={`Containers · ${n.containers.length}`}>
            {n.containers.length === 0 ? (
              <Quiet>No container is on it.</Quiet>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {n.containers.map((m) => (
                  <li
                    key={m.id}
                    className="flex min-h-11 items-center gap-2 px-3 py-1.5 text-body-sm md:min-h-0"
                  >
                    <Dot tone={stateOf(m).tone} />
                    <Link
                      href={containerHref(server, m.name || m.id)}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      {m.name}
                    </Link>
                    <span
                      className={cn(
                        "font-mono text-caption text-muted-foreground",
                      )}
                    >
                      {m.ipv4?.replace(/\/\d+$/, "") || m.ipv6 || ""}
                    </span>
                    {manage && !n.builtin && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Disconnect ${m.name}`}
                        title="Disconnect"
                        className="max-md:size-11"
                        onClick={() => onDisconnect(n, m.id, m.name)}
                      >
                        <Unlink />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Block>
          {Object.keys(n.options).length > 0 && (
            <Block title="Driver options">
              <KeyValues map={n.options} />
            </Block>
          )}
          {Object.keys(n.labels).length > 0 && (
            <Block title="Labels">
              <KeyValues map={n.labels} />
            </Block>
          )}
        </>
      )}
    </Layer>
  )
}
