"use client"

import { useMemo } from "react"

import { FileBrowser } from "@/components/files/file-browser"
import type { FileSource, LoginUser } from "@/components/files/source"
import { api } from "@/lib/api"
import { useServerPage } from "../../components/server-page"
import { terminalHref } from "../../terminal/components/use-tabs"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export function FilesView() {
  const { server, phone } = useServerPage()
  const source = useMemo(() => serverSource(server.id), [server.id])
  return <FileBrowser source={source} phone={phone} />
}

// The server's own disk over SFTP.
function serverSource(id: string): FileSource {
  const f = api.files
  return {
    key: ["files", id],
    noun: "server",
    endpoint: { server_id: id },
    posix: true,
    list: (path) => f.listFiles(id, { path }),
    read: (path) => f.readFile(id, { path }),
    write: (v) => f.writeFile(id, v),
    search: (path, q) => f.searchFiles(id, { path, q }),
    size: (path, signal) =>
      f.folderSize(id, { path }, { signal }).then((r) => r.size),
    usage: (path, signal) => f.diskUsage(id, { path }, { signal }),
    mkdir: (path) => f.makeFolder(id, { path }),
    rename: (v) => f.renameFile(id, v),
    move: (v) => f.moveFiles(id, v),
    copy: (v) => f.copyFiles(id, v),
    remove: (paths) => f.deleteFiles(id, { paths }),
    chmod: (v) => f.chmodFiles(id, v),
    chown: (v) => f.chownFiles(id, v),
    compress: (v) => f.compressFiles(id, v),
    extract: (v) => f.extractArchive(id, v),
    // Downloads are plain links (the browser streams them to disk); several
    // paths or a folder arrive as one zip. `inline` opens media in the
    // browser.
    downloadUrl: (paths, opts = {}) => {
      const params = new URLSearchParams()
      for (const p of paths) params.append("path", p)
      if (opts.inline) params.set("inline", "true")
      if (opts.name) params.set("name", opts.name)
      return `${API_URL}/servers/${id}/files/download?${params}`
    },
    uploadUrl: (path, overwrite) => {
      const params = new URLSearchParams({ path })
      if (overwrite) params.set("overwrite", "true")
      return `${API_URL}/servers/${id}/files/upload?${params}`
    },
    loginUsers: () =>
      f
        .readFile(id, { path: "/etc/passwd" })
        .then((r) => loginUsers(r.content)),
    terminalHref: (cwd) => terminalHref(`/servers/${id}/terminal`, { cwd }),
  }
}

// Accounts that can log in (a real shell), root first.
function loginUsers(passwd: string): LoginUser[] {
  return passwd
    .split("\n")
    .map((line) => line.split(":"))
    .filter((f) => f.length >= 7)
    .map(([name, , uid, , , home, shell]) => ({
      name,
      uid: Number(uid),
      home,
      shell: shell.trim(),
    }))
    .filter(
      (u) =>
        u.uid !== 65534 &&
        u.home.startsWith("/") &&
        u.home !== "/" &&
        u.home !== "/nonexistent" &&
        u.shell !== "" &&
        !/\/(nologin|false|sync|halt|shutdown)$/.test(u.shell),
    )
    .map(({ name, uid, home }) => ({ name, uid, home }))
    .sort(
      (a, b) =>
        Number(b.uid === 0) - Number(a.uid === 0) ||
        a.name.localeCompare(b.name),
    )
}
