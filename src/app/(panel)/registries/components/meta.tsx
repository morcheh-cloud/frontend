"use client"

import { Warehouse } from "lucide-react"

import type { PackageRegistry, RegistrySettings } from "@/lib/services"
import { cn } from "@/lib/utils"

export type RegistryKindName = PackageRegistry["kind"]

// What each kind is for, in the panel's words.
export const kindMeta: Record<
  RegistryKindName,
  {
    label: string
    holds: string
    noun: string // one thing it holds
    nouns: string
    blurb: string
    points: string[]
    license: string
  }
> = {
  harbor: {
    label: "Harbor",
    holds: "Container images · Helm charts",
    noun: "repository",
    nouns: "repositories",
    blurb:
      "Your own Docker registry: push your images, pull Docker Hub through a cache, give CI a robot login.",
    points: [
      "Docker Hub cache (pull-through)",
      "Robot accounts for CI and servers",
      "Weekly cleanup of deleted images",
      "Optional Trivy vulnerability scanner",
    ],
    license: "Apache 2.0 · CNCF",
  },
  verdaccio: {
    label: "Verdaccio",
    holds: "npm packages",
    noun: "package",
    nouns: "packages",
    blurb:
      "A private npm registry: publish your own packages and keep a copy of everything installed from npmjs.",
    points: [
      "npmjs mirror (fetched once, kept here)",
      "Private scopes like @company",
      "Users with their own passwords",
      "Works with npm, pnpm, yarn and bun",
    ],
    license: "MIT",
  },
}

export const kindNames: RegistryKindName[] = ["harbor", "verdaccio"]

export function RegistryLogo({
  kind,
  className,
}: {
  kind: RegistryKindName | undefined
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card",
        className,
      )}
    >
      {kind ? (
        // biome-ignore lint/performance/noImgElement: a static SVG logo
        <img
          src={`/apps/${kind}.svg`}
          alt=""
          className={cn(
            "size-[55%]",
            // Verdaccio's dark green disappears on a dark card.
            kind === "verdaccio" && "dark:brightness-[2.2]",
          )}
        />
      ) : (
        <Warehouse className="size-5 text-ash" />
      )}
    </span>
  )
}

export type Tone = "success" | "warning" | "destructive" | "muted" | "brand"

// One word for how a registry is: its state first, then its health.
export function statusOf(r: PackageRegistry): { label: string; tone: Tone } {
  switch (r.state) {
    case "deploying":
      return { label: "Deploying", tone: "brand" }
    case "removing":
      return { label: "Removing", tone: "muted" }
    case "failed":
      return { label: "Deploy failed", tone: "destructive" }
  }
  if (r.server_status !== "online" && r.server_status !== "unknown")
    return { label: "Server unreachable", tone: "destructive" }
  switch (r.health) {
    case "online":
      return r.problem
        ? { label: "Needs a look", tone: "warning" }
        : { label: "Running", tone: "success" }
    case "degraded":
      return { label: "Not healthy", tone: "warning" }
    case "down":
      return { label: "Not answering", tone: "destructive" }
  }
  return { label: "Checking", tone: "muted" }
}

export const toneDot: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-mist",
  brand: "bg-brand",
}

export const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
  brand: "text-brand",
}

export function StatusPill({ r }: { r: PackageRegistry }) {
  const s = statusOf(r)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-caption whitespace-nowrap">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          toneDot[s.tone],
          s.tone === "brand" && "animate-pulse",
        )}
      />
      {s.label}
    </span>
  )
}

// A registry broken enough for the menu's red count.
export const registryBroken = (r: PackageRegistry) =>
  r.state === "failed" ||
  (r.state === "ready" && (r.health === "down" || r.health === "degraded"))

export const registryHref = (id: string, tab?: string) =>
  `/registries/${id}${tab && tab !== "overview" ? `?tab=${tab}` : ""}`

export const newRegistryHref = (kind?: RegistryKindName, server?: string) => {
  const q = new URLSearchParams()
  if (kind) q.set("kind", kind)
  if (server) q.set("server", server)
  const s = q.toString()
  return `/registries/new${s ? `?${s}` : ""}`
}

export function defaultSettings(kind: RegistryKindName): RegistrySettings {
  return kind === "harbor"
    ? {
        public: false,
        mirror: true,
        mirror_project: "dockerhub",
        scanner: false,
        cleanup: true,
      }
    : { public: false, mirror: true, scopes: [], upstream: "" }
}

// ── Using it ─────────────────────────────────────────────────────────────

const host = (r: PackageRegistry) => r.address

export function dockerSamples(r: PackageRegistry, user = "USER") {
  const h = host(r)
  const mirror = r.settings.mirror
    ? r.settings.mirror_project || "dockerhub"
    : ""
  const samples = [
    {
      key: "push",
      label: "Push an image",
      code: [
        `docker login ${h} -u ${user}`,
        `docker tag myapp:1.0 ${h}/library/myapp:1.0`,
        `docker push ${h}/library/myapp:1.0`,
      ].join("\n"),
    },
    {
      key: "compose",
      label: "Compose",
      code: ["services:", "  app:", `    image: ${h}/library/myapp:1.0`].join(
        "\n",
      ),
    },
    {
      key: "helm",
      label: "Helm chart",
      code: [
        `helm registry login ${h} -u ${user}`,
        `helm push mychart-0.1.0.tgz oci://${h}/library`,
        `helm install demo oci://${h}/library/mychart --version 0.1.0`,
      ].join("\n"),
    },
  ]
  if (mirror)
    samples.splice(1, 0, {
      key: "cache",
      label: "Docker Hub cache",
      code: [
        "# Pulled from Docker Hub once, then served from here",
        `docker pull ${h}/${mirror}/library/nginx:latest`,
        `docker pull ${h}/${mirror}/grafana/grafana:latest`,
      ].join("\n"),
    })
  if (!r.domain)
    samples.push({
      key: "insecure",
      label: "Plain http",
      code: [
        "# /etc/docker/daemon.json on every client, then restart Docker",
        "{",
        `  "insecure-registries": ["${h}"]`,
        "}",
      ].join("\n"),
    })
  return samples
}

export function npmSamples(r: PackageRegistry, user = "USER") {
  const url = `${r.url}/`
  const bare = url.replace(/^https?:/, "")
  const scope = r.settings.scopes?.[0] ?? "@company"
  return [
    {
      key: "npmrc",
      label: ".npmrc",
      code: [
        `registry=${url}`,
        `${bare}:_auth=\${NPM_AUTH}`,
        "# NPM_AUTH = base64 of user:password",
        `# echo -n '${user}:PASSWORD' | base64`,
      ].join("\n"),
    },
    {
      key: "login",
      label: "npm login",
      code: [
        `npm login --registry ${url}`,
        `npm install --registry ${url}`,
        `npm publish --registry ${url}`,
      ].join("\n"),
    },
    {
      key: "scope",
      label: "Only a scope",
      code: [
        "# .npmrc: only your scope comes from here, the rest from npmjs",
        `${scope}:registry=${url}`,
        `${bare}:_auth=\${NPM_AUTH}`,
      ].join("\n"),
    },
    {
      key: "pnpm",
      label: "pnpm / yarn / bun",
      code: [
        `pnpm config set registry ${url}`,
        `yarn config set npmRegistryServer ${url}`,
        "# bun reads the same .npmrc",
      ].join("\n"),
    },
  ]
}

export const shortDigest = (d: string) =>
  d.startsWith("sha256:") ? d.slice(7, 19) : d.slice(0, 12)
