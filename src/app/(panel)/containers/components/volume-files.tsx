"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"

import type { UsageSource } from "@/components/disk-usage/disk-usage"
import type { FileSource } from "@/components/files/source"
import { api } from "@/lib/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""
const seg = encodeURIComponent

export const volumeFilesKey = (server: string, volume: string) =>
  ["docker", server, "volume-files", volume] as const

// A Docker volume's folder on the server, read and written as root over
// SFTP. Paths are inside the volume ("/" = its top): the backend never lets
// one (or a link) lead outside it. No endpoint: transfers to other servers
// and storages go through volume backups instead.
export function volumeSource(
  server: string,
  volume: string,
  write: boolean,
): FileSource {
  const d = api.docker
  const v = seg(volume)
  const base = `${API_URL}/servers/${server}/docker/volumes/${v}/files`
  return {
    key: volumeFilesKey(server, volume),
    noun: "volume",
    posix: true,
    readOnly: !write,
    list: (path) => d.listDockerVolumeFiles(server, v, { path }),
    read: (path) => d.readDockerVolumeFile(server, v, { path }),
    write: (body) => d.writeDockerVolumeFile(server, v, body),
    search: (path, q) => d.searchDockerVolumeFiles(server, v, { path, q }),
    size: (path, signal) =>
      d
        .dockerVolumeFolderSize(server, v, { path }, { signal })
        .then((r) => r.size),
    usage: (path, signal) =>
      d.dockerVolumeDiskUsage(server, v, { path }, { signal }),
    mkdir: (path) => d.makeDockerVolumeFolder(server, v, { path }),
    rename: (body) => d.renameDockerVolumeFile(server, v, body),
    move: (body) => d.moveDockerVolumeFiles(server, v, body),
    copy: (body) => d.copyDockerVolumeFiles(server, v, body),
    remove: (paths) => d.deleteDockerVolumeFiles(server, v, { paths }),
    chmod: (body) => d.chmodDockerVolumeFiles(server, v, body),
    chown: (body) => d.chownDockerVolumeFiles(server, v, body),
    downloadUrl: (paths, opts = {}) => {
      const params = new URLSearchParams()
      for (const p of paths) params.append("path", p)
      if (opts.inline) params.set("inline", "true")
      if (opts.name) params.set("name", opts.name)
      return `${base}/download?${params}`
    },
    uploadUrl: (path, overwrite) => {
      const params = new URLSearchParams({ path })
      if (overwrite) params.set("overwrite", "true")
      return `${base}/upload?${params}`
    },
  }
}

export function useVolumeSource(
  server: string,
  volume: string,
  write: boolean,
) {
  return useMemo(
    () => volumeSource(server, volume, write),
    [server, volume, write],
  )
}

// The disk usage analyser over a volume (the Overview's "What takes the
// space"). Its scans sit under the file manager's key, so writes and
// Refresh there drop them too.
export function useVolumeUsage(
  server: string,
  volume: string,
  opts: { write: boolean; reveal?: (path: string, dir: boolean) => void },
): UsageSource {
  const client = useQueryClient()
  const key = [...volumeFilesKey(server, volume), "usage"] as const
  const v = seg(volume)
  return {
    key,
    load: (path, signal) =>
      api.docker.dockerVolumeDiskUsage(
        server,
        v,
        { path: path || "/" },
        { signal },
      ),
    remove: opts.write
      ? (paths) =>
          api.docker.deleteDockerVolumeFiles(server, v, { paths }).finally(() =>
            client.invalidateQueries({
              queryKey: volumeFilesKey(server, volume),
            }),
          )
      : undefined,
    reveal: opts.reveal,
  }
}
