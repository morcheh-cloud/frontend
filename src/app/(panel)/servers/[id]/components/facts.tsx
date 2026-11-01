"use client"

import { Check, Copy } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import type { Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useFolders } from "../../api"
import { buildTree, folderPath } from "../../components/folder-tree"
import { osLabel, StatusDot, statusMeta, timeAgo } from "../../components/meta"
import { serversHref } from "../../components/use-filters"

export type Fact = { label: string; value: ReactNode; muted?: boolean }

const none = (text: string): Pick<Fact, "value" | "muted"> => ({
  value: text,
  muted: true,
})

export function authText(server: Server) {
  if (server.auth_method === "password") return "Password"
  return server.has_passphrase ? "Private key with passphrase" : "Private key"
}

function When({ iso }: { iso: string | null }) {
  return (
    <time
      dateTime={iso ?? undefined}
      title={iso ? new Date(iso).toLocaleString() : undefined}
    >
      {timeAgo(iso)}
    </time>
  )
}

// What the overview knows about a server, grouped. The desktop renders the
// groups as cards and the phone as lists.
export function useFacts(server: Server, checking: boolean) {
  const folders = useFolders()
  const { nodes } = buildTree(folders.data ?? [])
  const folder = folderPath(nodes, server.folder_id)
  const detected = Boolean(server.os.id)

  const health: Fact[] = [
    {
      label: "Status",
      value: (
        <span className="inline-flex items-center gap-1.5">
          <StatusDot status={server.status} checking={checking} />
          {checking ? "Checking…" : statusMeta[server.status].label}
        </span>
      ),
    },
    {
      label: "Latency",
      ...(server.latency_ms != null
        ? { value: `${server.latency_ms} ms` }
        : none("—")),
    },
    { label: "Last checked", value: <When iso={server.last_checked_at} /> },
    { label: "Last reached", value: <When iso={server.last_seen_at} /> },
  ]

  const notDetected = none("Detected on the first check")
  const system: Fact[] = [
    {
      label: "OS",
      ...(detected ? { value: osLabel(server.os) } : notDetected),
    },
    {
      label: "Kernel",
      ...(server.os.kernel ? { value: server.os.kernel } : none("—")),
    },
    {
      label: "Architecture",
      ...(server.os.arch ? { value: server.os.arch } : none("—")),
    },
    {
      label: "Hostname",
      ...(server.hostname ? { value: server.hostname } : none("—")),
    },
  ]

  const connection: Fact[] = [
    { label: "Host", value: <Mono>{server.host}</Mono> },
    { label: "Port", value: <Mono>{server.port}</Mono> },
    { label: "User", value: <Mono>{server.username}</Mono> },
    { label: "Authentication", value: authText(server) },
    {
      label: "Host key",
      ...(server.host_key_fingerprint
        ? {
            value: (
              <Copyable text={server.host_key_fingerprint} label="Fingerprint">
                <Mono className="break-all">{server.host_key_fingerprint}</Mono>
              </Copyable>
            ),
          }
        : none("Trusted on the first check")),
    },
  ]

  const organization: Fact[] = [
    {
      label: "Folder",
      ...(server.folder_id
        ? {
            value: (
              <Link
                href={serversHref("/servers", { folder: server.folder_id })}
                className="hover:text-brand"
              >
                {folder || "Folder"}
              </Link>
            ),
          }
        : none("Unfiled")),
    },
    {
      label: "Tags",
      ...(server.tags.length
        ? {
            value: (
              <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                {server.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={serversHref("/servers", { tag: [tag] })}
                    className="rounded-full bg-muted px-2 text-caption leading-6 hover:bg-mist"
                  >
                    {tag}
                  </Link>
                ))}
              </span>
            ),
          }
        : none("None")),
    },
    {
      label: "Added",
      value: <When iso={server.created_at} />,
    },
  ]

  return { health, system, connection, organization }
}

export function Mono({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn("font-mono text-caption", className)}>{children}</span>
  )
}

// A value with a copy button after it.
export function Copyable({
  text,
  label,
  children,
}: {
  text: string
  label: string
  children: ReactNode
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't access the clipboard")
    }
  }

  return (
    <span className="inline-flex max-w-full items-start gap-1">
      <span className="min-w-0">{children}</span>
      <button
        type="button"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={copy}
        className="-my-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground max-md:size-9"
      >
        {copied ? (
          <Check className="size-3.5 text-success" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </span>
  )
}
