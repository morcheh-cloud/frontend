// Reads a compose file into a small model (services, their ports, mounts,
// networks…) and makes targeted edits with the yaml Document API, so the rest
// of the file and its comments stay as they were. Pure functions: every edit
// takes the text and gives back the new text (unchanged when it can't apply).

import {
  type Document,
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  Scalar,
  type YAMLMap,
} from "yaml"

export type PortSpec = {
  ip?: string
  // Host port (or range); empty = compose picks a random one.
  host?: string
  target: string
  protocol: string
}

export type MountSpec = {
  kind: "volume" | "bind" | "anonymous" | "other"
  source?: string
  target: string
  readOnly: boolean
}

export type ServiceInfo = {
  name: string
  image?: string
  build: boolean
  ports: PortSpec[]
  mounts: MountSpec[]
  // null = the service lists no networks, so it sits on the project's
  // default network.
  networks: string[] | null
  networkMode?: string
  env: Map<string, string>
  envFile: boolean
  healthcheck: boolean
  restart?: string
  hostname?: string
  command: boolean
  dependsOn: string[]
  // Compose leaves a service with profiles out unless one is turned on.
  profiles: string[]
  containerName?: string
  replicas?: number
}

export type TopNetwork = {
  key: string
  // The real name on the server (`name:`), else the key.
  name: string
  external: boolean
  internal: boolean
  driver?: string
}

export type TopVolume = { key: string; name: string; external: boolean }

export type ComposeModel = {
  // Parsed and shaped like a compose file (an empty file counts).
  ok: boolean
  error?: string
  services: ServiceInfo[]
  networks: TopNetwork[]
  volumes: TopVolume[]
}

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
const str = (v: unknown) =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined

export function parsePort(raw: unknown): PortSpec | null {
  if (raw && typeof raw === "object") {
    const p = obj(raw)
    const target = str(p.target)
    if (!target) return null
    return {
      target,
      host: str(p.published),
      ip: str(p.host_ip),
      protocol: str(p.protocol) ?? "tcp",
    }
  }
  const s = str(raw)
  if (!s) return null
  const slash = s.lastIndexOf("/")
  const protocol = slash > 0 ? s.slice(slash + 1) : "tcp"
  const body = slash > 0 ? s.slice(0, slash) : s
  // "[::1]:8080:80" or "127.0.0.1:8080:80": the address is everything
  // before the last two parts.
  const v6 = /^\[([^\]]+)\]:(.*)$/.exec(body)
  const rest = v6 ? v6[2] : body
  const parts = rest.split(":")
  if (parts.length === 1) return { target: parts[0], protocol, ip: v6?.[1] }
  const target = parts[parts.length - 1]
  const host = parts[parts.length - 2]
  const ip = v6 ? v6[1] : parts.slice(0, -2).join(":") || undefined
  return { target, host: host || undefined, ip, protocol }
}

function isPathSource(s: string) {
  return /^[./~$]/.test(s) || /^[A-Za-z]:[\\/]/.test(s)
}

export function parseMount(raw: unknown): MountSpec | null {
  if (raw && typeof raw === "object") {
    const m = obj(raw)
    const target = str(m.target)
    if (!target) return null
    const type = str(m.type) ?? "volume"
    const source = str(m.source)
    return {
      kind:
        type === "bind"
          ? "bind"
          : type === "volume"
            ? source
              ? "volume"
              : "anonymous"
            : "other",
      source,
      target,
      readOnly: m.read_only === true,
    }
  }
  const s = str(raw)
  if (!s) return null
  const parts = s.split(":")
  if (parts.length === 1)
    return { kind: "anonymous", target: s, readOnly: false }
  const [source, target, mode = ""] = parts
  return {
    kind: isPathSource(source) ? "bind" : "volume",
    source,
    target,
    readOnly: mode.split(",").includes("ro"),
  }
}

function envOf(raw: unknown): Map<string, string> {
  const out = new Map<string, string>()
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const s = str(item)
      if (!s) continue
      const eq = s.indexOf("=")
      if (eq < 0) out.set(s, "")
      else out.set(s.slice(0, eq), s.slice(eq + 1))
    }
  } else {
    for (const [k, v] of Object.entries(obj(raw))) out.set(k, str(v) ?? "")
  }
  return out
}

function listOrKeys(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(str).filter((s) => s !== undefined)
  return Object.keys(obj(raw))
}

// deploy.replicas (or the old scale), when it's a plain number.
function replicasOf(s: Record<string, unknown>) {
  const n = obj(s.deploy).replicas ?? s.scale
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : undefined
}

export function readCompose(text: string): ComposeModel {
  const empty = { services: [], networks: [], volumes: [] }
  if (!text.trim()) return { ok: true, ...empty }
  const doc = parseDocument(text)
  if (doc.errors.length > 0) {
    return { ok: false, error: doc.errors[0].message, ...empty }
  }
  const json = doc.toJSON()
  if (json == null) return { ok: true, ...empty }
  if (typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, error: "The file isn't a map of keys.", ...empty }
  }
  const root = obj(json)
  const services = Object.entries(obj(root.services)).map(([name, raw]) => {
    const s = obj(raw)
    const networks =
      s.networks === undefined ? null : listOrKeys(s.networks ?? [])
    return {
      name,
      image: str(s.image),
      build: s.build !== undefined,
      ports: (Array.isArray(s.ports) ? s.ports : [])
        .map(parsePort)
        .filter((p) => p !== null),
      mounts: (Array.isArray(s.volumes) ? s.volumes : [])
        .map(parseMount)
        .filter((m) => m !== null),
      networks,
      networkMode: str(s.network_mode),
      env: envOf(s.environment),
      envFile: s.env_file !== undefined,
      healthcheck: s.healthcheck !== undefined,
      restart: str(s.restart),
      hostname: str(s.hostname),
      command: s.command !== undefined,
      dependsOn: listOrKeys(s.depends_on),
      profiles: listOrKeys(s.profiles),
      containerName: str(s.container_name),
      replicas: replicasOf(s),
    } satisfies ServiceInfo
  })
  const networks = Object.entries(obj(root.networks)).map(([key, raw]) => {
    const n = obj(raw)
    return {
      key,
      name: str(n.name) ?? key,
      external: n.external === true || !!obj(n.external).name,
      internal: n.internal === true,
      driver: str(n.driver),
    }
  })
  const volumes = Object.entries(obj(root.volumes)).map(([key, raw]) => {
    const v = obj(raw)
    return {
      key,
      name: str(v.name) ?? key,
      external: v.external === true || !!obj(v.external).name,
    }
  })
  return { ok: true, services, networks, volumes }
}

// ---- Edits ------------------------------------------------------------------

type Edit = (doc: Document) => void

const OUT = { lineWidth: 0, nullStr: "", flowCollectionPadding: false }

// Runs one or more edits on the text; a file that doesn't parse (or an edit
// that throws on an odd shape) leaves it as it was.
export function edit(text: string, ...edits: Edit[]): string {
  const doc = parseDocument(text)
  if (doc.errors.length > 0) return text
  try {
    for (const e of edits) e(doc)
  } catch {
    return text
  }
  return doc.toString(OUT).replace(/\n+$/, "\n")
}

export function quoted(value: string) {
  const s = new Scalar(value)
  s.type = Scalar.QUOTE_DOUBLE
  return s
}

const svc = (name: string) => ["services", name]

function append(doc: Document, path: unknown[], value: unknown) {
  const node = doc.getIn(path, true)
  if (isSeq(node)) node.add(doc.createNode(value))
  else doc.setIn(path, doc.createNode([value]))
}

function removeWhere(
  doc: Document,
  path: unknown[],
  test: (json: unknown) => boolean,
) {
  const node = doc.getIn(path, true)
  if (!isSeq(node)) return
  for (let i = node.items.length - 1; i >= 0; i--) {
    const item = node.items[i]
    const json = isScalar(item)
      ? item.value
      : (item as { toJSON?: () => unknown })?.toJSON?.()
    if (test(json)) node.delete(i)
  }
  if (node.items.length === 0) doc.deleteIn(path)
}

export const addService =
  (name: string, image: string): Edit =>
  (doc) => {
    doc.setIn([...svc(name), "image"], image)
  }

export const removeService =
  (name: string): Edit =>
  (doc) => {
    doc.deleteIn(svc(name))
  }

export const setImage =
  (service: string, image: string): Edit =>
  (doc) => {
    doc.setIn([...svc(service), "image"], image)
  }

export function portText(p: {
  ip?: string
  host?: string
  target: string
  protocol?: string
}) {
  const ip = p.ip ? (p.ip.includes(":") ? `[${p.ip}]:` : `${p.ip}:`) : ""
  const proto = p.protocol && p.protocol !== "tcp" ? `/${p.protocol}` : ""
  return `${ip}${p.host ? `${p.host}:` : ""}${p.target}${proto}`
}

export const addPort =
  (service: string, port: PortSpec): Edit =>
  (doc) => {
    append(doc, [...svc(service), "ports"], quoted(portText(port)))
  }

export const removePort =
  (service: string, port: PortSpec): Edit =>
  (doc) => {
    removeWhere(doc, [...svc(service), "ports"], (j) => {
      const p = parsePort(j)
      return (
        !!p &&
        p.target === port.target &&
        (p.host ?? "") === (port.host ?? "") &&
        p.protocol === port.protocol
      )
    })
  }

export function mountText(m: {
  source?: string
  target: string
  readOnly?: boolean
}) {
  return `${m.source ? `${m.source}:` : ""}${m.target}${m.readOnly ? ":ro" : ""}`
}

// Mounts a volume (declared at the top when it's a named one the file
// doesn't list yet) or a folder of the server.
export const addMount =
  (
    service: string,
    m: { source?: string; target: string; readOnly?: boolean },
    declare?: { external?: boolean },
  ): Edit =>
  (doc) => {
    append(doc, [...svc(service), "volumes"], mountText(m))
    if (m.source && !isPathSource(m.source) && declare) {
      declareVolume(m.source, declare.external)(doc)
    }
  }

export const removeMount =
  (service: string, target: string): Edit =>
  (doc) => {
    removeWhere(
      doc,
      [...svc(service), "volumes"],
      (j) => parseMount(j)?.target === target,
    )
  }

export const declareVolume =
  (key: string, external = false): Edit =>
  (doc) => {
    if (doc.hasIn(["volumes", key])) return
    doc.setIn(
      ["volumes", key],
      external ? doc.createNode({ external: true }) : null,
    )
  }

export const removeVolume =
  (key: string): Edit =>
  (doc) => {
    doc.deleteIn(["volumes", key])
    const top = doc.get("volumes", true)
    if (isMap(top) && top.items.length === 0) doc.delete("volumes")
  }

// Sets an environment variable whether the service lists them as a map or
// as KEY=value lines.
export const setEnvVar =
  (service: string, key: string, value: string): Edit =>
  (doc) => {
    const path = [...svc(service), "environment"]
    const node = doc.getIn(path, true)
    if (isSeq(node)) {
      const at = node.items.findIndex((i) => {
        const v = isScalar(i) ? String(i.value) : ""
        return v === key || v.startsWith(`${key}=`)
      })
      const line = doc.createNode(`${key}=${value}`)
      if (at >= 0) node.set(at, line)
      else node.add(line)
      return
    }
    if (isMap(node)) {
      node.set(key, value)
      return
    }
    doc.setIn(path, doc.createNode({ [key]: value }))
  }

export const setKey =
  (service: string, key: string, value: unknown): Edit =>
  (doc) => {
    doc.setIn([...svc(service), key], value)
  }

export const setHealthcheck =
  (service: string, hc: Healthcheck): Edit =>
  (doc) => {
    const test = doc.createNode(hc.test.map(quoted))
    test.flow = true
    const node = doc.createNode({}) as YAMLMap
    node.set("test", test)
    for (const k of [
      "interval",
      "timeout",
      "retries",
      "start_period",
    ] as const) {
      if (hc[k] !== undefined) node.set(k, hc[k])
    }
    doc.setIn([...svc(service), "healthcheck"], node)
  }

export type Healthcheck = {
  test: string[]
  interval?: string
  timeout?: string
  retries?: number
  start_period?: string
}

// depends_on: a plain list unless a condition is wanted (or the file already
// uses the long form).
export const addDependsOn =
  (service: string, dep: string, healthy: boolean): Edit =>
  (doc) => {
    const path = [...svc(service), "depends_on"]
    const node = doc.getIn(path, true)
    if (isSeq(node) && !healthy) {
      node.add(doc.createNode(dep))
      return
    }
    if (isSeq(node)) {
      const names = node.items.map((i) => (isScalar(i) ? String(i.value) : ""))
      const map = doc.createNode({}) as YAMLMap
      for (const n of names)
        map.set(n, doc.createNode({ condition: "service_started" }))
      doc.setIn(path, map)
    }
    if (isMap(doc.getIn(path, true)) || healthy) {
      doc.setIn(
        [...path, dep],
        doc.createNode({
          condition: healthy ? "service_healthy" : "service_started",
        }),
      )
      return
    }
    doc.setIn(path, doc.createNode([dep]))
  }

// ---- Networks -----------------------------------------------------------

export const declareNetwork =
  (key: string, opts: { external?: boolean; internal?: boolean } = {}): Edit =>
  (doc) => {
    if (doc.hasIn(["networks", key])) return
    const body: Record<string, unknown> = {}
    if (opts.external) body.external = true
    if (opts.internal) body.internal = true
    doc.setIn(
      ["networks", key],
      Object.keys(body).length ? doc.createNode(body) : null,
    )
  }

// Joins a network. A service that listed none was on `default`; it keeps it,
// or it would lose sight of the project's other services.
export const attachNetwork =
  (service: string, key: string): Edit =>
  (doc) => {
    const path = [...svc(service), "networks"]
    const node = doc.getIn(path, true)
    if (isSeq(node)) {
      if (!node.items.some((i) => isScalar(i) && i.value === key))
        node.add(doc.createNode(key))
      return
    }
    if (isMap(node)) {
      if (!node.has(key)) node.set(key, null)
      return
    }
    doc.setIn(
      path,
      doc.createNode(key === "default" ? [key] : ["default", key]),
    )
  }

export const detachNetwork =
  (service: string, key: string): Edit =>
  (doc) => {
    const path = [...svc(service), "networks"]
    const node = doc.getIn(path, true)
    if (isSeq(node)) {
      const at = node.items.findIndex((i) => isScalar(i) && i.value === key)
      if (at >= 0) node.delete(at)
    } else if (isMap(node)) {
      node.delete(key)
    }
    // Back on nothing but default = the same as listing none.
    const after = doc.getIn(path, true)
    const left = isSeq(after)
      ? after.items.map((i) => (isScalar(i) ? String(i.value) : "?"))
      : isMap(after)
        ? after.items.map((p) => (isScalar(p.key) ? String(p.key.value) : "?"))
        : []
    if (left.length === 0 || (left.length === 1 && left[0] === "default"))
      doc.deleteIn(path)
  }

export const removeNetwork =
  (key: string): Edit =>
  (doc) => {
    doc.deleteIn(["networks", key])
    const top = doc.get("networks", true)
    if (isMap(top) && top.items.length === 0) doc.delete("networks")
  }

// After a network is left: drop an external network's declaration that no
// service lists any more (the file declared it only to join it).
export function tidyNetworks(text: string) {
  const m = readCompose(text)
  const used = new Set(m.services.flatMap((s) => s.networks ?? []))
  const drop = m.networks.filter((n) => n.external && !used.has(n.key))
  return drop.length
    ? edit(text, ...drop.map((n) => removeNetwork(n.key)))
    : text
}

// ---- Names ----------------------------------------------------------------

export function uniqueName(base: string, taken: Iterable<string>) {
  const set = new Set(taken)
  const clean =
    base
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, "-")
      .replace(/^[-_.]+|[-_.]+$/g, "") || "app"
  if (!set.has(clean)) return clean
  for (let i = 2; ; i++) if (!set.has(`${clean}-${i}`)) return `${clean}-${i}`
}

// Host ports the file already publishes.
export function hostPorts(m: ComposeModel) {
  const out = new Set<string>()
  for (const s of m.services)
    for (const p of s.ports) if (p.host) out.add(`${p.host}/${p.protocol}`)
  return out
}
