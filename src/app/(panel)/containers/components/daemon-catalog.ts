// Docker's daemon.json: parsing, editing (merge / remove keys), what a change
// needs (reload or restart), clashes with dockerd's own flags, and the
// catalog of useful settings the page offers to add with one click.

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json }
export type Config = { [key: string]: Json }

export type Parsed =
  | { ok: true; value: Config }
  | { ok: false; message: string; line?: number; column?: number }

// Empty text = no file (Docker's defaults), which is a valid config.
export function parseConfig(text: string): Parsed {
  if (text.trim() === "") return { ok: true, value: {} }
  try {
    const v: unknown = JSON.parse(text)
    if (!isObject(v))
      return { ok: false, message: "daemon.json must be one JSON object { … }" }
    return { ok: true, value: v }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const where = /line (\d+) column (\d+)/.exec(message)
    if (where)
      return {
        ok: false,
        message: message.replace(/\s*\(line \d+ column \d+\)/, ""),
        line: Number(where[1]),
        column: Number(where[2]),
      }
    const pos = /position (\d+)/.exec(message)
    if (pos) {
      const before = text.slice(0, Number(pos[1])).split("\n")
      return {
        ok: false,
        message: message.replace(/\s*at position \d+.*$/, ""),
        line: before.length,
        column: (before.at(-1)?.length ?? 0) + 1,
      }
    }
    return { ok: false, message }
  }
}

export function isObject(v: unknown): v is Config {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export function printConfig(cfg: Config): string {
  return Object.keys(cfg).length === 0
    ? ""
    : `${JSON.stringify(cfg, null, 2)}\n`
}

export function sameJson(a: Json | undefined, b: Json | undefined): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => sameJson(x, b[i]))
  if (isObject(a) && isObject(b)) {
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    return ka.length === kb.length && ka.every((k) => sameJson(a[k], b[k]))
  }
  return false
}

// Objects merge key by key (existing keys keep their place, new ones go at
// the end); anything else, lists included, is replaced.
export function merge(base: Config, patch: Config): Config {
  const out: Config = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    const cur = out[k]
    out[k] = isObject(cur) && isObject(v) ? merge(cur, v) : v
  }
  return out
}

// Removes keys by path ("log-opts.max-size"); a parent left empty goes too.
export function without(cfg: Config, paths: string[]): Config {
  let out: Config = cfg
  for (const path of paths) out = drop(out, path.split("."))
  return out
}

function drop(cfg: Config, parts: string[]): Config {
  const [head, ...rest] = parts
  if (!(head in cfg)) return cfg
  const out: Config = { ...cfg }
  if (rest.length === 0) {
    delete out[head]
    return out
  }
  const child = out[head]
  if (!isObject(child)) return cfg
  const next = drop(child, rest)
  if (Object.keys(next).length === 0) delete out[head]
  else out[head] = next
  return out
}

// Settings dockerd takes again on a reload (SIGHUP); every other change
// waits for a restart.
export const reloadable = new Set([
  "debug",
  "labels",
  "live-restore",
  "max-concurrent-downloads",
  "max-concurrent-uploads",
  "max-download-attempts",
  "default-runtime",
  "runtimes",
  "authorization-plugins",
  "insecure-registries",
  "registry-mirrors",
  "shutdown-timeout",
  "features",
])

export function changedKeys(before: Config, after: Config): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...keys].filter((k) => !sameJson(before[k], after[k]))
}

export function needsRestart(keys: string[]) {
  return keys.filter((k) => !reloadable.has(k))
}

// dockerd refuses to start when a setting is given both as a flag (systemd's
// ExecStart, usually `-H fd://`) and in the file.
const flagKeys: Record<string, string> = {
  H: "hosts",
  host: "hosts",
  "insecure-registry": "insecure-registries",
  "registry-mirror": "registry-mirrors",
  "log-opt": "log-opts",
  label: "labels",
  "storage-opt": "storage-opts",
  "exec-opt": "exec-opts",
  "default-ulimit": "default-ulimits",
  "add-runtime": "runtimes",
  "authorization-plugin": "authorization-plugins",
  "dns-opt": "dns-opts",
  "dns-search": "dns-search",
  "default-address-pool": "default-address-pools",
  D: "debug",
  l: "log-level",
  G: "group",
  b: "bridge",
  p: "pidfile",
}

export type FlagClash = { key: string; flag: string }

export function flagClashes(flags: string[], cfg: Config): FlagClash[] {
  const out: FlagClash[] = []
  const seen = new Set<string>()
  for (let i = 1; i < flags.length; i++) {
    const arg = flags[i]
    if (!arg.startsWith("-") || arg === "-" || arg === "--") continue
    const name = arg.replace(/^--?/, "").split("=")[0]
    const key = flagKeys[name] ?? name
    if (key in cfg && !seen.has(key)) {
      seen.add(key)
      // Show the flag with its value when it came as a separate word.
      const value =
        !arg.includes("=") && flags[i + 1] && !flags[i + 1].startsWith("-")
          ? ` ${flags[i + 1]}`
          : ""
      out.push({ key, flag: arg + value })
    }
  }
  return out
}

export type Warning = { key: string; title: string; body: string }

// Settings that do what they say but surprise people.
export function warningsFor(cfg: Config, saved: Config): Warning[] {
  const out: Warning[] = []
  const changed = (k: string) => k in cfg && !sameJson(cfg[k], saved[k])
  const hosts = Array.isArray(cfg.hosts) ? cfg.hosts : []
  if (hosts.some((h) => typeof h === "string" && h.startsWith("tcp://")))
    if (cfg.tlsverify !== true)
      out.push({
        key: "tcp",
        title: "Docker listens on the network without TLS",
        body: "Anyone who can reach that port controls the server as root. Use tlsverify with certificates, or keep it on 127.0.0.1 / an SSH tunnel.",
      })
  if (cfg.iptables === false)
    out.push({
      key: "iptables",
      title: "iptables is off",
      body: "Docker won't set up NAT or port publishing: published ports and containers' internet access stop working unless you add the rules yourself.",
    })
  if (changed("data-root"))
    out.push({
      key: "data-root",
      title: "A new data-root starts empty",
      body: "Images, containers and volumes stay in the old folder and won't show until you copy them over (stop Docker, rsync -aP the old folder, then restart).",
    })
  if (changed("storage-driver"))
    out.push({
      key: "storage-driver",
      title: "A new storage driver hides what's there",
      body: "Existing images and containers were made with the old driver; Docker won't see them until you switch back.",
    })
  if (changed("userns-remap"))
    out.push({
      key: "userns",
      title: "User namespaces get their own storage",
      body: "With userns-remap Docker uses a separate folder: current images and containers disappear from view, and bind mounts may need new owners.",
    })
  if (
    Array.isArray(cfg["insecure-registries"]) &&
    cfg["insecure-registries"].length
  )
    out.push({
      key: "insecure",
      title: "Some registries are reached without checking TLS",
      body: "Images from them can be swapped in transit. Fine for a lab registry, not across the internet.",
    })
  return out
}

// ---- Suggestions ----

export type FieldValue = string | number | boolean | string[]
export type Values = Record<string, FieldValue>

export type Field =
  | {
      key: string
      label: string
      kind: "text" | "number"
      placeholder?: string
      suffix?: string
      hint?: string
      min?: number
    }
  | {
      key: string
      label: string
      kind: "select"
      options: { value: string; label: string }[]
      hint?: string
    }
  | {
      key: string
      label: string
      kind: "list"
      placeholder?: string
      hint?: string
      // One-click entries (a known mirror…).
      presets?: { value: string; label: string }[]
    }

export type Group =
  | "logs"
  | "reliability"
  | "network"
  | "registries"
  | "security"
  | "performance"
  | "storage"

export const groupLabels: Record<Group, string> = {
  logs: "Logs",
  reliability: "Reliability",
  network: "Network",
  registries: "Registries",
  security: "Security",
  performance: "Performance",
  storage: "Storage",
}

export type Suggestion = {
  id: string
  group: Group
  title: string
  summary: string
  why: string
  recommended?: boolean
  // Shown under the fields: a side effect to know about.
  caution?: string
  // Top-level keys it writes (reload vs restart, "Added").
  keys: string[]
  fields?: Field[]
  // Values for the form: what the file has now, else good defaults.
  read: (cfg: Config) => Values
  build: (v: Values) => Config
  // Paths removed by Remove (default: `keys`).
  remove?: string[]
  // Whether the file already has it (default: every key present).
  isSet?: (cfg: Config) => boolean
  // A problem with the values, or null.
  check?: (v: Values) => string | null
}

const str = (v: Json | undefined, fallback: string) =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback
const num = (v: Json | undefined, fallback: number) =>
  typeof v === "number"
    ? v
    : typeof v === "string" && /^\d+$/.test(v)
      ? Number(v)
      : fallback
const list = (v: Json | undefined, fallback: string[]) =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : fallback
const obj = (v: Json | undefined): Config => (isObject(v) ? v : {})
const asList = (v: FieldValue | undefined) =>
  Array.isArray(v) ? v.map((s) => s.trim()).filter(Boolean) : []

const sizeRe = /^\d+(\.\d+)?\s*[kmgKMG]?[bB]?$/
const cidrRe = /^[0-9a-fA-F:.]+\/\d{1,3}$/

export const suggestions: Suggestion[] = [
  {
    id: "log-rotation",
    group: "logs",
    title: "Limit container log size",
    summary: "Rotate json-file logs so they can't fill the disk.",
    why: "By default Docker keeps every line a container prints, forever. A chatty container can fill the disk and take the server down. This keeps a few files of a set size per container.",
    recommended: true,
    caution:
      "Applies to containers created after the restart; recreate older ones to pick it up.",
    keys: ["log-driver", "log-opts"],
    fields: [
      {
        key: "size",
        label: "Size of one file",
        kind: "text",
        placeholder: "10m",
        hint: "k, m or g, e.g. 10m",
      },
      { key: "files", label: "Files kept", kind: "number", min: 1 },
    ],
    read: (c) => ({
      size: str(obj(c["log-opts"])["max-size"], "10m"),
      files: num(obj(c["log-opts"])["max-file"], 3),
    }),
    build: (v) => ({
      "log-driver": "json-file",
      "log-opts": { "max-size": String(v.size), "max-file": String(v.files) },
    }),
    remove: ["log-opts.max-size", "log-opts.max-file"],
    isSet: (c) => "max-size" in obj(c["log-opts"]),
    check: (v) =>
      !sizeRe.test(String(v.size))
        ? "Size looks like 10m, 500k or 1g."
        : Number(v.files) < 1
          ? "Keep at least one file."
          : null,
  },
  {
    id: "live-restore",
    group: "reliability",
    title: "Keep containers running while Docker restarts",
    summary:
      "live-restore: upgrades and restarts of Docker don't stop your apps.",
    why: "Without it, restarting or upgrading the Docker service stops every container. With it they keep running and Docker reattaches when it comes back.",
    recommended: true,
    caution: "Not available with Docker Swarm mode.",
    keys: ["live-restore"],
    read: () => ({}),
    build: () => ({ "live-restore": true }),
    isSet: (c) => c["live-restore"] === true,
  },
  {
    id: "shutdown-timeout",
    group: "reliability",
    title: "Give containers time to stop",
    summary:
      "Seconds Docker waits for containers on shutdown before killing them.",
    why: "Databases and queues need a few seconds to flush to disk. Docker's default is 15 seconds.",
    keys: ["shutdown-timeout"],
    fields: [
      {
        key: "seconds",
        label: "Wait",
        kind: "number",
        suffix: "seconds",
        min: 1,
      },
    ],
    read: (c) => ({ seconds: num(c["shutdown-timeout"], 30) }),
    build: (v) => ({ "shutdown-timeout": Number(v.seconds) }),
  },
  {
    id: "address-pools",
    group: "network",
    title: "Choose the addresses Docker networks use",
    summary:
      "default-address-pools: avoid clashes with your office or VPN ranges.",
    why: "Docker takes 172.17–172.31 and 192.168.x ranges for its networks. If your LAN or VPN uses one of them, the server can't reach those machines. One big pool cut into small networks also lets you make hundreds of networks instead of about thirty.",
    keys: ["default-address-pools"],
    fields: [
      {
        key: "base",
        label: "Pool",
        kind: "text",
        placeholder: "10.200.0.0/16",
        hint: "A range nothing else on your network uses",
      },
      {
        key: "size",
        label: "Each network",
        kind: "number",
        suffix: "prefix (/24 = 254 addresses)",
        min: 8,
      },
    ],
    read: (c) => {
      const first = Array.isArray(c["default-address-pools"])
        ? obj(c["default-address-pools"][0])
        : {}
      return {
        base: str(first.base, "10.200.0.0/16"),
        size: num(first.size, 24),
      }
    },
    build: (v) => ({
      "default-address-pools": [{ base: String(v.base), size: Number(v.size) }],
    }),
    check: (v) => {
      if (!cidrRe.test(String(v.base))) return "Pool looks like 10.200.0.0/16."
      const prefix = Number(String(v.base).split("/")[1])
      const size = Number(v.size)
      if (size <= prefix || size > 30)
        return `Each network's prefix must be between /${prefix + 1} and /30.`
      return null
    },
  },
  {
    id: "dns",
    group: "network",
    title: "DNS servers for containers",
    summary: "dns: which resolvers containers ask, instead of the host's.",
    why: "Containers copy the host's resolv.conf, which breaks when the host uses a local resolver like 127.0.0.53 (systemd-resolved). Setting servers here gives every container a working DNS.",
    keys: ["dns"],
    fields: [
      {
        key: "servers",
        label: "Servers",
        kind: "list",
        placeholder: "1.1.1.1",
        presets: [
          { value: "1.1.1.1", label: "Cloudflare" },
          { value: "8.8.8.8", label: "Google" },
          { value: "9.9.9.9", label: "Quad9" },
        ],
      },
    ],
    read: (c) => ({ servers: list(c.dns, ["1.1.1.1", "8.8.8.8"]) }),
    build: (v) => ({ dns: asList(v.servers) }),
    check: (v) => {
      const bad = asList(v.servers).find((s) => !/^[0-9a-fA-F:.]+$/.test(s))
      return asList(v.servers).length === 0
        ? "Add at least one server."
        : bad
          ? `${bad} isn't an IP address.`
          : null
    },
  },
  {
    id: "userland-proxy",
    group: "network",
    title: "Publish ports without docker-proxy",
    summary:
      "userland-proxy: false — iptables forwards ports, no extra process per port.",
    why: "Docker starts a docker-proxy process for every published port. Turning it off lets the kernel forward the traffic: less memory and faster connections, especially with many ports.",
    caution:
      "Needs iptables (the default). Containers reaching their own published port on 127.0.0.1 can behave differently on old kernels.",
    keys: ["userland-proxy"],
    read: () => ({}),
    build: () => ({ "userland-proxy": false }),
    isSet: (c) => c["userland-proxy"] === false,
  },
  {
    id: "ipv6",
    group: "network",
    title: "IPv6 for the default bridge",
    summary:
      "ipv6 + fixed-cidr-v6: containers on the default network get IPv6.",
    why: "Turns on IPv6 for the default bridge network. Other networks still choose it themselves (enable_ipv6 in compose).",
    keys: ["ipv6", "fixed-cidr-v6"],
    fields: [
      {
        key: "cidr",
        label: "Range",
        kind: "text",
        placeholder: "fd00:d0c::/64",
        hint: "A unique local range (fd…) or one your provider routed to the server",
      },
    ],
    read: (c) => ({ cidr: str(c["fixed-cidr-v6"], "fd00:d0c::/64") }),
    build: (v) => ({ ipv6: true, "fixed-cidr-v6": String(v.cidr) }),
    isSet: (c) => c.ipv6 === true,
    check: (v) =>
      cidrRe.test(String(v.cidr)) ? null : "Range looks like fd00:d0c::/64.",
  },
  {
    id: "registry-mirrors",
    group: "registries",
    title: "Pull through a registry mirror",
    summary: "registry-mirrors: faster pulls, fewer Docker Hub rate limits.",
    why: "Docker Hub limits anonymous pulls and can be slow or blocked from some networks. A mirror serves Docker Hub images from closer by; Docker falls back to Docker Hub when the mirror fails.",
    keys: ["registry-mirrors"],
    fields: [
      {
        key: "mirrors",
        label: "Mirrors",
        kind: "list",
        placeholder: "https://mirror.gcr.io",
        hint: "Tried in order; only Docker Hub images go through them",
        presets: [
          { value: "https://mirror.gcr.io", label: "Google" },
          { value: "https://docker.arvancloud.ir", label: "ArvanCloud" },
        ],
      },
    ],
    read: (c) => ({
      mirrors: list(c["registry-mirrors"], ["https://mirror.gcr.io"]),
    }),
    build: (v) => ({ "registry-mirrors": asList(v.mirrors) }),
    check: (v) => {
      const all = asList(v.mirrors)
      const bad = all.find((s) => !/^https?:\/\/\S+$/.test(s))
      return all.length === 0
        ? "Add at least one mirror."
        : bad
          ? `${bad} must start with https://`
          : null
    },
  },
  {
    id: "insecure-registries",
    group: "registries",
    title: "Allow a registry without valid TLS",
    summary:
      "insecure-registries: a lab registry on http or a self-signed certificate.",
    why: "Docker only talks to registries over HTTPS with a trusted certificate. List a private registry here to use it over plain http or with a self-signed certificate.",
    caution:
      "Images from these registries can be changed in transit. Keep it to your own network.",
    keys: ["insecure-registries"],
    fields: [
      {
        key: "hosts",
        label: "Registries",
        kind: "list",
        placeholder: "registry.local:5000",
        hint: "host:port or a range like 10.0.0.0/8",
      },
    ],
    read: (c) => ({ hosts: list(c["insecure-registries"], []) }),
    build: (v) => ({ "insecure-registries": asList(v.hosts) }),
    check: (v) => (asList(v.hosts).length === 0 ? "Add a registry." : null),
  },
  {
    id: "no-new-privileges",
    group: "security",
    title: "Block privilege escalation in containers",
    summary: "no-new-privileges: setuid programs (sudo, su) can't gain root.",
    why: "A process in a container can't gain more privileges than it started with, so a compromised app can't use setuid binaries to become root inside the container.",
    caution:
      "Images that use sudo or su at runtime stop working; set security_opt on those containers instead.",
    keys: ["no-new-privileges"],
    read: () => ({}),
    build: () => ({ "no-new-privileges": true }),
    isSet: (c) => c["no-new-privileges"] === true,
  },
  {
    id: "icc",
    group: "security",
    title: "Isolate containers on the default bridge",
    summary:
      "icc: false — containers on the default network can't talk to each other.",
    why: "Containers started without a network all share the default bridge and can reach each other's ports. This blocks that; compose projects and user-defined networks are not affected.",
    caution:
      "Old setups that rely on --link between containers on the default bridge stop working.",
    keys: ["icc"],
    read: () => ({}),
    build: () => ({ icc: false }),
    isSet: (c) => c.icc === false,
  },
  {
    id: "ulimits",
    group: "performance",
    title: "Raise the open-files limit",
    summary:
      "default-ulimits nofile: databases and proxies need many open files.",
    why: "Busy databases, proxies and Elasticsearch open many files and sockets. A higher default saves setting ulimits on each container.",
    keys: ["default-ulimits"],
    fields: [
      { key: "soft", label: "Soft", kind: "number", min: 1024 },
      { key: "hard", label: "Hard", kind: "number", min: 1024 },
    ],
    read: (c) => {
      const n = obj(obj(c["default-ulimits"]).nofile)
      return { soft: num(n.Soft, 65536), hard: num(n.Hard, 65536) }
    },
    build: (v) => ({
      "default-ulimits": {
        nofile: { Name: "nofile", Soft: Number(v.soft), Hard: Number(v.hard) },
      },
    }),
    remove: ["default-ulimits.nofile"],
    isSet: (c) => "nofile" in obj(c["default-ulimits"]),
    check: (v) =>
      Number(v.soft) > Number(v.hard) ? "Soft can't be above hard." : null,
  },
  {
    id: "concurrency",
    group: "performance",
    title: "Faster pulls and pushes",
    summary: "More layers at once, and more tries on a flaky network.",
    why: "Docker downloads 3 layers and uploads 5 at a time, and gives up on a layer after 5 tries. On a fast link more parallel layers pull big images quicker; on a flaky one more tries avoid failed pulls.",
    keys: [
      "max-concurrent-downloads",
      "max-concurrent-uploads",
      "max-download-attempts",
    ],
    fields: [
      { key: "down", label: "Downloads at once", kind: "number", min: 1 },
      { key: "up", label: "Uploads at once", kind: "number", min: 1 },
      { key: "tries", label: "Tries per layer", kind: "number", min: 1 },
    ],
    read: (c) => ({
      down: num(c["max-concurrent-downloads"], 6),
      up: num(c["max-concurrent-uploads"], 5),
      tries: num(c["max-download-attempts"], 10),
    }),
    build: (v) => ({
      "max-concurrent-downloads": Number(v.down),
      "max-concurrent-uploads": Number(v.up),
      "max-download-attempts": Number(v.tries),
    }),
    isSet: (c) => "max-concurrent-downloads" in c,
  },
  {
    id: "metrics",
    group: "performance",
    title: "Prometheus metrics",
    summary: "metrics-addr: the engine's own numbers for Prometheus to scrape.",
    why: "Docker serves metrics about the engine, builds and containers at http://<addr>/metrics.",
    caution:
      "Keep it on 127.0.0.1 or a private address: the endpoint has no login.",
    keys: ["metrics-addr"],
    fields: [
      {
        key: "addr",
        label: "Listen on",
        kind: "text",
        placeholder: "127.0.0.1:9323",
      },
    ],
    read: (c) => ({ addr: str(c["metrics-addr"], "127.0.0.1:9323") }),
    build: (v) => ({ "metrics-addr": String(v.addr) }),
    check: (v) =>
      /^\S+:\d{1,5}$/.test(String(v.addr))
        ? null
        : "Looks like 127.0.0.1:9323.",
  },
  {
    id: "builder-gc",
    group: "storage",
    title: "Clean the build cache by itself",
    summary: "builder.gc: keep BuildKit's cache under a size.",
    why: "Every docker build leaves cache behind, and on build servers it grows without end. This makes BuildKit drop the oldest cache once it passes the limit.",
    keys: ["builder"],
    fields: [
      {
        key: "keep",
        label: "Keep at most",
        kind: "text",
        placeholder: "20GB",
        hint: "e.g. 10GB, 500MB",
      },
    ],
    read: (c) => ({
      keep: str(obj(obj(c.builder).gc).defaultKeepStorage, "20GB"),
    }),
    build: (v) => ({
      builder: { gc: { enabled: true, defaultKeepStorage: String(v.keep) } },
    }),
    remove: ["builder.gc"],
    isSet: (c) => obj(obj(c.builder).gc).enabled === true,
    check: (v) =>
      sizeRe.test(String(v.keep)) ? null : "Size looks like 20GB.",
  },
  {
    id: "data-root",
    group: "storage",
    title: "Keep Docker's data on another disk",
    summary: "data-root: where images, containers and volumes live.",
    why: "Docker keeps everything in /var/lib/docker. Point it at a bigger or faster disk when the root disk is small.",
    caution:
      "The new folder starts empty: existing images, containers and volumes stay in the old one until you copy them over with Docker stopped.",
    keys: ["data-root"],
    fields: [
      {
        key: "path",
        label: "Folder",
        kind: "text",
        placeholder: "/data/docker",
      },
    ],
    read: (c) => ({ path: str(c["data-root"], "/data/docker") }),
    build: (v) => ({ "data-root": String(v.path) }),
    check: (v) =>
      String(v.path).startsWith("/")
        ? null
        : "Use a full path starting with /.",
  },
  {
    id: "log-level",
    group: "logs",
    title: "How much Docker itself logs",
    summary: "log-level: the daemon's own messages in the journal.",
    why: "Use debug while chasing a problem, then go back: debug is very chatty. warn keeps the journal quiet.",
    keys: ["log-level"],
    fields: [
      {
        key: "level",
        label: "Level",
        kind: "select",
        options: [
          { value: "debug", label: "Debug" },
          { value: "info", label: "Info (default)" },
          { value: "warn", label: "Warnings" },
          { value: "error", label: "Errors" },
        ],
      },
    ],
    read: (c) => ({ level: str(c["log-level"], "warn") }),
    build: (v) => ({ "log-level": String(v.level) }),
  },
]

export function isSet(s: Suggestion, cfg: Config) {
  return s.isSet ? s.isSet(cfg) : s.keys.every((k) => k in cfg)
}

// Whether the file already says exactly what these values would write.
export function matches(s: Suggestion, cfg: Config, v: Values) {
  return sameJson(merge(cfg, s.build(v)), cfg)
}

export function addSuggestion(cfg: Config, s: Suggestion, v: Values): Config {
  return merge(cfg, s.build(v))
}

export function removeSuggestion(cfg: Config, s: Suggestion): Config {
  return without(cfg, s.remove ?? s.keys)
}

export function applyKind(s: Suggestion): "reload" | "restart" {
  return s.keys.every((k) => reloadable.has(k)) ? "reload" : "restart"
}
