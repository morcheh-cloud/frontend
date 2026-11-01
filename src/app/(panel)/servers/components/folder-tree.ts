import type { Folder } from "@/lib/services"

export type FolderNode = Folder & {
  children: FolderNode[]
  /** Servers in this folder and every folder under it. */
  total: number
  depth: number
}

// The API returns folders flat; nest them by parent_id, sorted by name.
export function buildTree(folders: Folder[]) {
  const nodes = new Map<string, FolderNode>()
  for (const f of folders) {
    nodes.set(f.id, { ...f, children: [], total: f.server_count, depth: 0 })
  }
  const roots: FolderNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const byName = (a: FolderNode, b: FolderNode) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  function finish(list: FolderNode[], depth: number): number {
    list.sort(byName)
    let sum = 0
    for (const node of list) {
      node.depth = depth
      node.total += finish(node.children, depth + 1)
      sum += node.total
    }
    return sum
  }
  finish(roots, 0)
  return { roots, nodes }
}

// Depth-first, for pickers that show the tree as an indented list.
export function flatten(roots: FolderNode[], skip?: Set<string>) {
  const out: FolderNode[] = []
  function walk(list: FolderNode[]) {
    for (const node of list) {
      if (skip?.has(node.id)) continue
      out.push(node)
      walk(node.children)
    }
  }
  walk(roots)
  return out
}

export function subtreeIds(node: FolderNode) {
  const ids = new Set<string>()
  function walk(n: FolderNode) {
    ids.add(n.id)
    for (const c of n.children) walk(c)
  }
  walk(node)
  return ids
}

// "Production / EU" for a folder id.
export function folderPath(nodes: Map<string, FolderNode>, id: string | null) {
  const names: string[] = []
  let current = id ? nodes.get(id) : undefined
  while (current) {
    names.unshift(current.name)
    current = current.parent_id ? nodes.get(current.parent_id) : undefined
  }
  return names.join(" / ")
}
