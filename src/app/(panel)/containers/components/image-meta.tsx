"use client"

import { Layers } from "lucide-react"
import Image from "next/image"
import { createSerializer, parseAsString } from "nuqs"

import type {
  DockerContainer,
  DockerImage,
  DockerImageScan,
  DockerImageUpdate,
  DockerScanCounts,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { appLogos, inkLogos } from "../../applications/components/meta"
import { useDockerContainers, useDockerScans, useDockerUpdates } from "../api"
import { imageName, shortId } from "./meta"

// --- Names -----------------------------------------------------------------

// "ghcr.io/org/app:1.2" → ["ghcr.io/org/app", "1.2"]. A registry's port
// ("host:5000/app") is not a tag: only a colon after the last slash counts.
export function splitRef(ref: string): [string, string] {
  const name = imageName(ref).replace(/@sha256:.*$/, "")
  const slash = name.lastIndexOf("/")
  const colon = name.lastIndexOf(":")
  if (colon > slash) return [name.slice(0, colon), name.slice(colon + 1)]
  return [name, "latest"]
}

// The repository an image is kept under; untagged ones share one bucket.
export function repoOf(i: DockerImage) {
  return i.tags[0] ? splitRef(i.tags[0])[0] : ""
}

export function imageLabel(i: DockerImage) {
  return i.tags[0] ? imageName(i.tags[0]) : `<none> ${shortId(i.id)}`
}

// The registry it came from, when it isn't Docker Hub.
export function registryOf(repo: string) {
  const first = repo.split("/")[0]
  return repo.includes("/") && /[.:]|^localhost$/.test(first) ? first : ""
}

// --- Logos -----------------------------------------------------------------

const logoAliases: Record<string, string> = {
  postgres: "postgresql",
  node: "nodedotjs",
  "uptime-kuma": "uptimekuma",
  "portainer-ce": "portainer",
  "portainer-ee": "portainer",
  agent: "",
  dind: "docker",
  "mysql-server": "mysql",
  "redis-stack": "redis",
  "nginx-unprivileged": "nginx",
  "nginx-proxy-manager": "nginx",
  "minio-server": "minio",
}

export function logoOf(repo: string) {
  for (const seg of repo.toLowerCase().split("/").reverse()) {
    const key = logoAliases[seg] ?? seg
    if (key && appLogos.includes(key)) return key
  }
  return undefined
}

export function ImageLogo({
  repo,
  className,
}: {
  repo: string
  className?: string
}) {
  const logo = logoOf(repo)
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg border border-border",
        logo ? "bg-card" : "bg-muted text-ash",
        className,
      )}
    >
      {logo ? (
        <Image
          src={`/apps/${logo}.svg`}
          alt=""
          width={64}
          height={64}
          className={cn("size-[55%]", inkLogos.has(logo) && "dark:invert")}
        />
      ) : (
        <Layers className="size-4" />
      )}
    </span>
  )
}

// --- Updates, scans and containers per image --------------------------------

export type ImageFacts = {
  update?: DockerImageUpdate
  scan?: DockerImageScan
  users: DockerContainer[]
}

// What the Updates and Security pages know about each image, plus the
// containers made from it. All three lists are cached by their own pages.
export function useImageFacts(server: string, enabled = true) {
  const containers = useDockerContainers(server, enabled)
  const updates = useDockerUpdates(server, enabled)
  const scans = useDockerScans(server, enabled)

  const users = new Map<string, DockerContainer[]>()
  for (const c of containers.data ?? []) {
    const list = users.get(c.image_id) ?? []
    list.push(c)
    users.set(c.image_id, list)
  }
  const byId = new Map<string, DockerImageUpdate>()
  const byRef = new Map<string, DockerImageUpdate>()
  for (const u of updates.data?.items ?? []) {
    byRef.set(imageName(u.image), u)
    for (const user of u.containers) {
      const c = containers.data?.find((x) => x.id === user.id)
      if (c && !byId.has(c.image_id)) byId.set(c.image_id, u)
    }
  }
  const scansById = new Map<string, DockerImageScan>()
  for (const s of scans.data?.items ?? []) scansById.set(s.image_id, s)

  return {
    ready: !!updates.data || !!scans.data,
    checkedAt: updates.data?.checked_at,
    scanned: !!scans.data,
    of(i: DockerImage): ImageFacts {
      return {
        update:
          byId.get(i.id) ??
          i.tags.map((t) => byRef.get(imageName(t))).find(Boolean),
        scan: scansById.get(i.id),
        users: users.get(i.id) ?? [],
      }
    },
  }
}

export function risky(s?: DockerImageScan) {
  return !!s?.counts && s.counts.critical + s.counts.high > 0
}

// The worst findings in a few words: "2 critical · 5 high".
export function VulnSummary({
  counts,
  className,
}: {
  counts: DockerScanCounts
  className?: string
}) {
  const rest = counts.medium + counts.low + counts.unknown
  if (counts.critical + counts.high + rest === 0) {
    return <span className={cn("text-ash", className)}>No known issues</span>
  }
  return (
    <span className={cn("inline-flex flex-wrap gap-x-2", className)}>
      {counts.critical > 0 && (
        <span className="font-medium text-destructive">
          {counts.critical} critical
        </span>
      )}
      {counts.high > 0 && (
        <span className="font-medium text-warning">{counts.high} high</span>
      )}
      {counts.critical + counts.high === 0 && (
        <span className="text-muted-foreground">{rest} lower</span>
      )}
    </span>
  )
}

// --- Links -----------------------------------------------------------------

const pageSerializer = createSerializer({
  env: parseAsString,
  q: parseAsString,
})

export function securityHref(server: string, q?: string) {
  return pageSerializer("/containers/security", { env: server, q: q ?? null })
}

export function updatesHref(server: string, q?: string) {
  return pageSerializer("/containers/updates", { env: server, q: q ?? null })
}
