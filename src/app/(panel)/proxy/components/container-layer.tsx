"use client"

import { BookOpen, Loader2 } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ContainerInfo, Proxy as ReverseProxy } from "@/lib/services"
import { useInspection } from "../api"
import { containerReach, runtimeLabel } from "./meta"

const restartText: Record<string, string> = {
  no: "No: it stays down after a reboot or a crash",
  always: "Always",
  "unless-stopped": "Unless stopped by hand",
  "on-failure": "On failure only: it stays down after a reboot",
}

// What the runtime says about a proxy's container, and what that means for
// its sites.
export function ContainerLayer({
  open,
  onOpenChange,
  proxy: p,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxy: ReverseProxy
}) {
  const isMobile = useIsMobile()
  const inspection = useInspection(p.id, open)
  const c = inspection.data?.container

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 max-md:px-4">
      {c ? (
        <Facts c={c} />
      ) : inspection.isPending ? (
        <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Reading the container…
        </p>
      ) : (
        <p className="text-body-sm text-muted-foreground">
          {inspection.error?.message ||
            p.status_message ||
            "Morche couldn't read the container on the last check."}
        </p>
      )}
      <Differences c={c} />
    </div>
  )

  const title = p.container ?? "Container"
  const description = `${runtimeLabel[p.runtime]} container on ${p.server_name}`
  if (isMobile) {
    return (
      <BottomSheet full open={open} onOpenChange={onOpenChange} title={title}>
        <p className="-mt-1 px-4 text-body-sm text-muted-foreground">
          {description}
        </p>
        {body}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

function Facts({ c }: { c: ContainerInfo }) {
  const ports = [
    ...new Set(
      c.ports.map(
        (p) =>
          `${p.host_ip && p.host_ip !== "0.0.0.0" && p.host_ip !== "::" ? `${p.host_ip}:` : ""}${p.host_port} → ${p.port}/${p.proto}`,
      ),
    ),
  ]
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
      <Fact label="Image" mono>
        {c.image}
      </Fact>
      <Fact label="State">
        {c.state || (c.running ? "running" : "stopped")}
      </Fact>
      <Fact label="Restarts">{restartText[c.restart] ?? c.restart}</Fact>
      {c.compose && (
        <Fact label="Compose">
          {c.compose}
          {c.service && ` · ${c.service}`}
          {c.compose_dir && (
            <span className="block font-mono text-caption text-muted-foreground">
              {c.compose_dir}
            </span>
          )}
        </Fact>
      )}
      <Fact label="Network">
        {containerReach(c)}
        {c.network_mode !== "host" &&
          c.networks.map((n) => (
            <span
              key={n.name}
              className="block font-mono text-caption text-muted-foreground"
            >
              {n.name}
              {n.ip && ` · ${n.ip}`}
              {n.gateway && ` · server ${n.gateway}`}
            </span>
          ))}
      </Fact>
      {ports.length > 0 && (
        <Fact label="Ports" mono>
          {ports.map((p) => (
            <span key={p} className="block">
              {p}
            </span>
          ))}
        </Fact>
      )}
      <Fact label="Folders" mono>
        {c.mounts.length === 0
          ? "None mounted"
          : c.mounts.map((m) => (
              <span key={m.destination} className="block">
                {m.name || m.source} → {m.destination}
                {m.read_only && " (read-only)"}
              </span>
            ))}
      </Fact>
    </dl>
  )
}

function Fact({
  label,
  mono,
  children,
}: {
  label: string
  mono?: boolean
  children: ReactNode
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          mono
            ? "min-w-0 font-mono text-caption break-all"
            : "min-w-0 break-words"
        }
      >
        {children}
      </dd>
    </>
  )
}

// How managing nginx in a container differs, in short.
function Differences({ c }: { c?: ContainerInfo }) {
  const gateway = c?.networks.find((n) => n.gateway)?.gateway
  const host = c?.network_mode === "host"
  const items: ReactNode[] = [
    host
      ? "It shares the server's network: apps on the server answer on 127.0.0.1, and every port it listens on is open."
      : `Apps in containers on the same network answer by name (http://app:3000).${gateway ? ` Apps on the server itself answer on ${gateway}, ` : " Apps on the server itself answer on the network's gateway address, "}not 127.0.0.1 (that's the container itself).`,
    host
      ? null
      : "Port forwards answer only on ports the container publishes. Morche warns on the ones it doesn't.",
    "Certificates are kept on the server and copied in; certbot runs on the server and copies renewals in too.",
    "Static sites can only serve folders mounted into the container.",
    "Modules (Brotli, firewall, image resizing, countries) come with the image: Morche doesn't change images.",
    "If the container is recreated (a new image, compose up), Morche sets it up again and writes its sites back on the next check.",
  ].filter(Boolean)
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-body-sm font-medium">In a container</h3>
      <ul className="flex list-disc flex-col gap-1.5 ps-5 text-body-sm text-muted-foreground">
        {items.map((t, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list
          <li key={i}>{t}</li>
        ))}
      </ul>
      <Link
        href="/help/reverse-proxy#docker"
        className="inline-flex items-center gap-1.5 self-start text-body-sm text-brand hover:underline"
      >
        <BookOpen className="size-4" />
        Guide: nginx in a container
      </Link>
    </section>
  )
}
