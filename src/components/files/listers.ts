import { api } from "@/lib/api"
import type { StorageEntry } from "@/lib/services"
import type { Endpoint, FileEntry, FileSource } from "./source"

// What it takes to browse folders somewhere: the folder picker needs no more.
// Same keys and shapes as the file managers, so they share the cache.
export type Lister = Pick<FileSource, "key" | "list">

export function serverLister(id: string): Lister {
  return {
    key: ["files", id],
    list: (path) => api.files.listFiles(id, { path }),
  }
}

export function storageLister(id: string): Lister {
  return {
    key: ["storage-files", id],
    list: (path) =>
      api.storageFiles.listStorageFiles(id, { path }).then((l) => ({
        path: l.path,
        parent: l.parent,
        home: "/",
        entries: l.entries.map(toStorageEntry),
        truncated: l.truncated,
      })),
  }
}

export const listerFor = (e: Endpoint) =>
  "server_id" in e ? serverLister(e.server_id) : storageLister(e.storage_id)

// What the file manager shows for an object or file on a storage: no Unix
// owners, modes or links.
export const toStorageEntry = (e: StorageEntry): FileEntry => ({
  name: e.name,
  path: e.path,
  type: e.type,
  size: e.size,
  modified: e.modified ?? "",
  perm: "",
  mode: "",
  owner: "",
  group: "",
  uid: 0,
  gid: 0,
  link_target: "",
  target_type: "none",
  bucket: e.bucket,
  storage_class: e.storage_class,
  content_type: e.content_type,
  etag: e.etag,
})
