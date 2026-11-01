import { Cloud, FolderUp, Globe, KeyRound, type LucideIcon } from "lucide-react"

import type { Storage } from "@/lib/services"
import { cn } from "@/lib/utils"

export type Protocol = Storage["protocol"]

export const protocols: {
  value: Protocol
  label: string
  icon: LucideIcon
  text: string
}[] = [
  {
    value: "s3",
    label: "S3",
    icon: Cloud,
    text: "Amazon S3 and compatible object storage (MinIO, R2, Wasabi…)",
  },
  {
    value: "ftp",
    label: "FTP",
    icon: FolderUp,
    text: "FTP, or FTPS with TLS",
  },
  {
    value: "sftp",
    label: "SFTP",
    icon: KeyRound,
    text: "Files over SSH, on any machine with an SSH server",
  },
  {
    value: "webdav",
    label: "WebDAV",
    icon: Globe,
    text: "Nextcloud, ownCloud, NAS boxes and other WebDAV servers",
  },
]

export const protocolMeta = Object.fromEntries(
  protocols.map((p) => [p.value, p]),
) as Record<Protocol, (typeof protocols)[number]>

// Where the settings came from. Picking one fills the endpoint, region and
// URL style; everything stays editable.
export type Preset = {
  id: string
  label: string
  protocol: Protocol
  host?: string
  placeholder: string
  hint?: string
  region?: string
  pathStyle?: boolean
}

export const presets: Preset[] = [
  {
    id: "aws",
    label: "Amazon S3",
    protocol: "s3",
    host: "s3.amazonaws.com",
    placeholder: "s3.amazonaws.com",
    region: "us-east-1",
    pathStyle: false,
    hint: "Set the region your buckets live in.",
  },
  {
    id: "minio",
    label: "MinIO",
    protocol: "s3",
    placeholder: "http://203.0.113.10:9000",
    region: "us-east-1",
    pathStyle: true,
    hint: "The API port (9000 by default), not the console's.",
  },
  {
    id: "r2",
    label: "Cloudflare R2",
    protocol: "s3",
    placeholder: "https://<account-id>.r2.cloudflarestorage.com",
    region: "auto",
    pathStyle: true,
    hint: "R2 → Overview → S3 API shows the URL with your account id.",
  },
  {
    id: "wasabi",
    label: "Wasabi",
    protocol: "s3",
    host: "https://s3.wasabisys.com",
    placeholder: "https://s3.wasabisys.com",
    region: "us-east-1",
    pathStyle: false,
  },
  {
    id: "spaces",
    label: "DigitalOcean Spaces",
    protocol: "s3",
    host: "https://nyc3.digitaloceanspaces.com",
    placeholder: "https://<region>.digitaloceanspaces.com",
    region: "nyc3",
    pathStyle: false,
    hint: "Change nyc3 to your region in both fields.",
  },
  {
    id: "b2",
    label: "Backblaze B2",
    protocol: "s3",
    placeholder: "https://s3.<region>.backblazeb2.com",
    region: "us-west-004",
    pathStyle: false,
    hint: "The bucket page shows the endpoint; use an application key.",
  },
  {
    id: "arvan",
    label: "ArvanCloud",
    protocol: "s3",
    host: "https://s3.ir-thr-at1.arvanstorage.ir",
    placeholder: "https://s3.ir-thr-at1.arvanstorage.ir",
    region: "ir-thr-at1",
    pathStyle: true,
    hint: "Use the endpoint of your bucket's data center.",
  },
  {
    id: "s3",
    label: "Other S3",
    protocol: "s3",
    placeholder: "https://s3.example.com",
    region: "us-east-1",
    hint: "Self-hosted servers usually need path-style URLs.",
  },
  {
    id: "ftp",
    label: "FTP",
    protocol: "ftp",
    placeholder: "ftp.example.com or 203.0.113.10",
  },
  {
    id: "sftp",
    label: "SFTP",
    protocol: "sftp",
    placeholder: "files.example.com or 203.0.113.10",
  },
  {
    id: "nextcloud",
    label: "Nextcloud",
    protocol: "webdav",
    placeholder: "https://cloud.example.com/remote.php/dav/files/<user>/",
    hint: "Settings → WebDAV at the bottom of the Files app shows it. Use an app password.",
  },
  {
    id: "webdav",
    label: "Other WebDAV",
    protocol: "webdav",
    placeholder: "https://dav.example.com/files/",
  },
]

export const presetFor = (protocol: Protocol, id: string) =>
  presets.find((p) => p.protocol === protocol && p.id === id) ??
  presets.find((p) => p.protocol === protocol) ??
  presets[0]

export const providerLabel = (s: Pick<Storage, "protocol" | "provider">) =>
  presets.find((p) => p.protocol === s.protocol && p.id === s.provider)
    ?.label ?? protocolMeta[s.protocol].label

export const defaultPort = (s: Pick<Storage, "protocol" | "tls">) =>
  s.protocol === "sftp" ? 22 : s.tls === "implicit" ? 990 : 21

// One line that says where the storage is: the bucket on an endpoint, or
// user@host for FTP and SFTP.
export function endpointLabel(
  s: Pick<
    Storage,
    "protocol" | "host" | "port" | "username" | "bucket" | "tls"
  >,
) {
  if (s.protocol === "s3") {
    const host = s.host.replace(/^https?:\/\//, "").replace(/\/+$/, "")
    return s.bucket ? `${host}/${s.bucket}` : host
  }
  if (s.protocol === "webdav") return s.host
  const port = s.port && s.port !== defaultPort(s) ? `:${s.port}` : ""
  const user = s.username ? `${s.username}@` : ""
  return `${user}${s.host}${port}`
}

// The address other tools take (rclone, FileZilla, the AWS CLI's
// --endpoint-url).
export function endpointUrl(s: Storage) {
  if (s.protocol === "s3" || s.protocol === "webdav") return s.host
  const scheme = s.protocol === "ftp" && s.tls !== "none" ? "ftps" : s.protocol
  return `${scheme}://${endpointLabel(s)}${s.root_path || ""}`
}

export function ProtocolTile({
  protocol,
  className,
}: {
  protocol: Protocol
  className?: string
}) {
  const Icon = protocolMeta[protocol].icon
  return (
    <span
      title={protocolMeta[protocol].label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  )
}
