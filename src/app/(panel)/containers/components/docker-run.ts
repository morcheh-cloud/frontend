// `docker run …` → compose services. Pure functions: parse the command lines
// someone pasted, then add the services they describe to a compose file
// (through the yaml Document API, so the file's comments stay).

import { type Document, isMap, isSeq, parseDocument, YAMLMap } from "yaml"

export type RunService = {
  name: string
  // Only the keys this command set, in compose's own spelling.
  spec: Record<string, unknown>
  env: [string, string | undefined][]
  volumes: string[]
  networks: string[]
}

export type RunParse = {
  services: RunService[]
  // Flags that have no compose equivalent or that we don't know.
  skipped: string[]
  // Things worth reading before adding (publish all, --rm…).
  notes: string[]
  problems: string[]
}

// ---- Shell words ----

// Splits text into commands (lines not continued with \, or && ; |) and each
// command into words, the way sh would quote them.
export function shellCommands(text: string): string[][] {
  const commands: string[][] = []
  let words: string[] = []
  let word = ""
  let has = false
  let quote: "'" | '"' | null = null
  const end = () => {
    if (has) words.push(word)
    word = ""
    has = false
  }
  const finish = () => {
    end()
    if (words.length > 0) commands.push(words)
    words = []
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quote === "'") {
      if (c === "'") quote = null
      else word += c
      continue
    }
    if (quote === '"') {
      if (c === '"') quote = null
      else if (
        c === "\\" &&
        i + 1 < text.length &&
        '"\\$`\n'.includes(text[i + 1])
      ) {
        if (text[i + 1] !== "\n") word += text[i + 1]
        i++
      } else word += c
      continue
    }
    if (c === "\\") {
      const next = text[i + 1]
      if (next === "\n" || next === "\r") {
        // A line continued: skip "\r\n" too.
        i += next === "\r" && text[i + 2] === "\n" ? 2 : 1
        continue
      }
      if (next !== undefined) {
        word += next
        has = true
        i++
      }
      continue
    }
    if (c === "'" || c === '"') {
      quote = c
      has = true
      continue
    }
    if (c === "#" && !has) {
      // A comment runs to the end of the line.
      while (i < text.length && text[i] !== "\n") i++
      finish()
      continue
    }
    if (c === "\n" || c === ";" || c === "|") {
      finish()
      continue
    }
    if (c === "&") {
      if (text[i + 1] === "&") i++
      finish()
      continue
    }
    if (c === " " || c === "\t" || c === "\r") {
      end()
      continue
    }
    word += c
    has = true
  }
  finish()
  return commands
}

const RUN_START =
  /^\s*(?:sudo\s+)?(?:docker|podman)\s+(?:container\s+)?(?:run|create)\b/m

// The text holds at least one `docker run` command.
export function looksLikeDockerRun(text: string) {
  return RUN_START.test(text)
}

// ---- Flags ----

// Flags without a value. Anything else known takes one.
const BOOLEAN = new Set([
  "d",
  "detach",
  "i",
  "interactive",
  "t",
  "tty",
  "rm",
  "privileged",
  "read-only",
  "init",
  "no-healthcheck",
  "oom-kill-disable",
  "P",
  "publish-all",
  "q",
  "quiet",
  "sig-proxy",
  "disable-content-trust",
])

const SHORT: Record<string, string> = {
  p: "publish",
  v: "volume",
  e: "env",
  l: "label",
  h: "hostname",
  w: "workdir",
  u: "user",
  m: "memory",
  c: "cpu-shares",
  d: "detach",
  i: "interactive",
  t: "tty",
  P: "publish-all",
  q: "quiet",
  a: "attach",
}

// Known flags that take a value but have nothing to say in compose.
const IGNORED_VALUE = new Set([
  "attach",
  "cidfile",
  "detach-keys",
  "label-file",
  "name",
])

type Flag = { name: string; value?: string }

function nameOf(raw: string) {
  return raw.replace(/[^a-z0-9_.-]+/gi, "-").replace(/^[-_.]+|[-_.]+$/g, "")
}

// "ghcr.io/team/my-app:1.2@sha256:…" → "my-app".
export function serviceFromImage(image: string) {
  const noDigest = image.split("@")[0]
  const last = noDigest.split("/").pop() ?? noDigest
  return nameOf(last.split(":")[0].toLowerCase()) || "app"
}

function bytes(value: string) {
  // docker run takes 512m, 1g, 1.5G…; compose takes the same.
  return value.toLowerCase()
}

function isNamedVolume(source: string) {
  return (
    source !== "" &&
    !source.startsWith("/") &&
    !source.startsWith(".") &&
    !source.startsWith("~") &&
    !source.startsWith("$")
  )
}

// --mount type=bind,source=/a,target=/b,readonly → "/a:/b:ro".
function mountToVolume(value: string): {
  volume?: string
  tmpfs?: string
  note?: string
} {
  const parts = Object.fromEntries(
    value.split(",").map((kv) => {
      const [k, ...v] = kv.split("=")
      return [k.trim().toLowerCase(), v.join("=") || "true"]
    }),
  ) as Record<string, string>
  const type = parts.type ?? "volume"
  const target = parts.target ?? parts.destination ?? parts.dst
  const source = parts.source ?? parts.src ?? ""
  if (!target) return { note: `--mount ${value}: no target` }
  if (type === "tmpfs") return { tmpfs: target }
  const ro =
    parts.readonly === "true" || parts.readonly === "1" || parts.ro === "true"
  if (!source) return { volume: target }
  return { volume: `${source}:${target}${ro ? ":ro" : ""}` }
}

function list(spec: Record<string, unknown>, key: string, value: unknown) {
  const cur = spec[key]
  if (Array.isArray(cur)) cur.push(value)
  else spec[key] = [value]
}

function obj(spec: Record<string, unknown>, key: string) {
  const cur = spec[key]
  if (cur && typeof cur === "object" && !Array.isArray(cur)) {
    return cur as Record<string, unknown>
  }
  const fresh: Record<string, unknown> = {}
  spec[key] = fresh
  return fresh
}

function duration(v: string) {
  // docker takes "30s", "1m30s" or a bare number of seconds for some flags.
  return /^\d+$/.test(v) ? `${v}s` : v
}

function parseOne(words: string[], out: RunParse): RunService | null {
  let i = 0
  if (words[i] === "sudo") i++
  if (words[i] !== "docker" && words[i] !== "podman") return null
  i++
  if (words[i] === "container") i++
  if (words[i] !== "run" && words[i] !== "create") return null
  i++

  const flags: Flag[] = []
  let image = ""
  for (; i < words.length; i++) {
    const w = words[i]
    if (w === "--") {
      i++
      break
    }
    if (w.startsWith("--")) {
      const [name, ...rest] = w.slice(2).split("=")
      if (rest.length > 0) {
        flags.push({ name, value: rest.join("=") })
      } else if (BOOLEAN.has(name)) {
        flags.push({ name })
      } else {
        flags.push({ name, value: words[++i] })
      }
      continue
    }
    if (w.startsWith("-") && w.length > 1) {
      // -it, -dit, -p80:80, -e A=B
      const letters = w.slice(1)
      for (let k = 0; k < letters.length; k++) {
        const name = SHORT[letters[k]] ?? letters[k]
        if (BOOLEAN.has(letters[k]) || BOOLEAN.has(name)) {
          flags.push({ name })
          continue
        }
        const attached = letters.slice(k + 1)
        flags.push({
          name,
          value: attached ? attached.replace(/^=/, "") : words[++i],
        })
        break
      }
      continue
    }
    image = w
    i++
    break
  }
  const command = words.slice(i)
  if (!image) {
    out.problems.push(`${words.slice(0, 4).join(" ")}…: no image found`)
    return null
  }

  const spec: Record<string, unknown> = { image }
  const env: [string, string | undefined][] = []
  const volumes: string[] = []
  const networks: string[] = []
  let name = ""
  const health: Record<string, unknown> = {}
  const gpus = (v: string) => {
    const count = /count=(\w+)/.exec(v)?.[1] ?? v
    const deploy = obj(spec, "deploy")
    const res = obj(deploy, "resources")
    const reservations = obj(res, "reservations")
    reservations.devices = [
      {
        driver: "nvidia",
        count: count === "all" ? "all" : Number(count) || "all",
        capabilities: ["gpu"],
      },
    ]
  }

  for (const f of flags) {
    const v = f.value ?? ""
    if (f.value === undefined && !BOOLEAN.has(f.name)) {
      out.problems.push(`--${f.name} has no value`)
      continue
    }
    switch (f.name) {
      case "name":
        name = nameOf(v)
        break
      case "publish":
        list(spec, "ports", v)
        break
      case "publish-all":
        out.notes.push(
          `${image}: -P publishes every exposed port on a random host port; list the ones you want under ports:.`,
        )
        break
      case "expose":
        list(spec, "expose", v)
        break
      case "volume": {
        list(spec, "volumes", v)
        const source = v.split(":")[0]
        if (v.includes(":") && isNamedVolume(source)) volumes.push(source)
        break
      }
      case "mount": {
        const m = mountToVolume(v)
        if (m.volume) {
          list(spec, "volumes", m.volume)
          const source = m.volume.split(":")[0]
          if (m.volume.includes(":") && isNamedVolume(source))
            volumes.push(source)
        }
        if (m.tmpfs) list(spec, "tmpfs", m.tmpfs)
        if (m.note) out.notes.push(m.note)
        break
      }
      case "tmpfs":
        list(spec, "tmpfs", v)
        break
      case "env": {
        const eq = v.indexOf("=")
        env.push(eq < 0 ? [v, undefined] : [v.slice(0, eq), v.slice(eq + 1)])
        break
      }
      case "env-file":
        list(spec, "env_file", v)
        break
      case "label": {
        const eq = v.indexOf("=")
        obj(spec, "labels")[eq < 0 ? v : v.slice(0, eq)] =
          eq < 0 ? "" : v.slice(eq + 1)
        break
      }
      case "restart":
        spec.restart = v
        break
      case "network":
      case "net":
        if (
          ["host", "none", "bridge"].includes(v) ||
          v.startsWith("container:")
        )
          spec.network_mode = v
        else networks.push(v)
        break
      case "network-alias":
      case "net-alias":
        list(spec, "__aliases", v)
        break
      case "ip":
        spec.__ip = v
        break
      case "hostname":
        spec.hostname = v
        break
      case "domainname":
        spec.domainname = v
        break
      case "workdir":
        spec.working_dir = v
        break
      case "user":
        spec.user = v
        break
      case "entrypoint":
        spec.entrypoint = v
        break
      case "cap-add":
        list(spec, "cap_add", v)
        break
      case "cap-drop":
        list(spec, "cap_drop", v)
        break
      case "privileged":
        spec.privileged = true
        break
      case "read-only":
        spec.read_only = true
        break
      case "init":
        spec.init = true
        break
      case "tty":
        spec.tty = true
        break
      case "interactive":
        spec.stdin_open = true
        break
      case "memory":
        spec.mem_limit = bytes(v)
        break
      case "memory-reservation":
        spec.mem_reservation = bytes(v)
        break
      case "memory-swap":
        spec.memswap_limit = bytes(v)
        break
      case "cpus":
        spec.cpus = Number(v) || v
        break
      case "cpu-shares":
        spec.cpu_shares = Number(v) || v
        break
      case "cpuset-cpus":
        spec.cpuset = v
        break
      case "pids-limit":
        spec.pids_limit = Number(v) || v
        break
      case "shm-size":
        spec.shm_size = bytes(v)
        break
      case "add-host":
        list(spec, "extra_hosts", v)
        break
      case "dns":
        list(spec, "dns", v)
        break
      case "dns-search":
        list(spec, "dns_search", v)
        break
      case "dns-option":
      case "dns-opt":
        list(spec, "dns_opt", v)
        break
      case "device":
        list(spec, "devices", v)
        break
      case "group-add":
        list(spec, "group_add", v)
        break
      case "ulimit": {
        const [k, limits] = v.split("=")
        const [soft, hard] = (limits ?? "").split(":")
        obj(spec, "ulimits")[k] =
          hard !== undefined
            ? { soft: Number(soft) || soft, hard: Number(hard) || hard }
            : Number(soft) || soft
        break
      }
      case "sysctl": {
        const [k, ...rest] = v.split("=")
        obj(spec, "sysctls")[k] = rest.join("=")
        break
      }
      case "security-opt":
        list(spec, "security_opt", v)
        break
      case "log-driver":
        obj(spec, "logging").driver = v
        break
      case "log-opt": {
        const [k, ...rest] = v.split("=")
        obj(obj(spec, "logging"), "options")[k] = rest.join("=")
        break
      }
      case "health-cmd":
        health.test = ["CMD-SHELL", v]
        break
      case "health-interval":
        health.interval = duration(v)
        break
      case "health-timeout":
        health.timeout = duration(v)
        break
      case "health-retries":
        health.retries = Number(v) || v
        break
      case "health-start-period":
        health.start_period = duration(v)
        break
      case "no-healthcheck":
        health.disable = true
        break
      case "stop-signal":
        spec.stop_signal = v
        break
      case "stop-timeout":
        spec.stop_grace_period = duration(v)
        break
      case "platform":
        spec.platform = v
        break
      case "pull":
        spec.pull_policy = v
        break
      case "pid":
        spec.pid = v
        break
      case "ipc":
        spec.ipc = v
        break
      case "userns":
        spec.userns_mode = v
        break
      case "runtime":
        spec.runtime = v
        break
      case "mac-address":
        spec.mac_address = v
        break
      case "oom-kill-disable":
        spec.oom_kill_disable = true
        break
      case "oom-score-adj":
        spec.oom_score_adj = Number(v) || v
        break
      case "cgroup-parent":
        spec.cgroup_parent = v
        break
      case "link":
        list(spec, "links", v)
        break
      case "gpus":
        gpus(v)
        break
      case "rm":
        out.notes.push(
          `${image}: --rm has no place in compose; the container stays until the project is taken down.`,
        )
        break
      case "detach":
      case "quiet":
      case "sig-proxy":
      case "disable-content-trust":
        break
      default:
        if (IGNORED_VALUE.has(f.name)) break
        out.skipped.push(
          f.value === undefined ? `--${f.name}` : `--${f.name} ${v}`,
        )
    }
  }
  if (Object.keys(health).length > 0) spec.healthcheck = health
  if (command.length > 0) spec.command = command
  return {
    name: name || serviceFromImage(image),
    spec,
    env,
    volumes,
    networks,
  }
}

export function parseDockerRun(text: string): RunParse {
  const out: RunParse = { services: [], skipped: [], notes: [], problems: [] }
  for (const words of shellCommands(text)) {
    const s = parseOne(words, out)
    if (s) out.services.push(s)
  }
  // Two commands for the same name: the second gets -2, -3…
  const used = new Set<string>()
  for (const s of out.services) {
    let n = s.name
    for (let k = 2; used.has(n); k++) n = `${s.name}-${k}`
    s.name = n
    used.add(n)
  }
  return out
}

// ---- Into a compose file ----

export type AddOptions = {
  // Put env values in .env and refer to them as ${NAME} in the compose file.
  envToFile: boolean
  // Named volumes already on the server: mark them external.
  externalVolumes: boolean
}

export type AddResult = {
  compose: string
  // NAME=value lines to append to .env.
  env: [string, string][]
  added: string[]
}

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

// Adds the parsed services to `compose` (blank or an existing file). Names
// already used in the file get -2, -3…; `envValues` are the .env's current
// values, so a name already there with another value stays inline.
export function addServices(
  compose: string,
  parsed: RunParse,
  options: AddOptions,
  envValues: Map<string, string>,
): AddResult {
  const doc: Document = parseDocument(compose.trim() ? compose : "")
  if (!isMap(doc.contents)) doc.contents = new YAMLMap()
  const root = doc.contents as YAMLMap
  const mapAt = (key: string) => {
    const got: unknown = root.get(key, true)
    if (isMap(got)) {
      // `services: {}` would keep the added services on one line.
      if (got.items.length === 0) got.flow = false
      return got as YAMLMap
    }
    const fresh = new YAMLMap()
    root.set(key, fresh)
    return fresh
  }
  const servicesMap = mapAt("services")
  const taken = new Set(
    servicesMap.items.map((p) =>
      String((p.key as { value?: unknown })?.value ?? p.key),
    ),
  )
  const envOut: [string, string][] = []
  const envSeen = new Map(envValues)
  const added: string[] = []
  const networks = new Set<string>()
  const volumes = new Set<string>()

  // A paste whose services refer to each other by --name: `container:db`
  // becomes `service:db`.
  const names = new Map(parsed.services.map((s) => [s.name, s.name]))

  for (const s of parsed.services) {
    let name = s.name
    for (let k = 2; taken.has(name); k++) name = `${s.name}-${k}`
    taken.add(name)
    names.set(s.name, name)
    const spec: Record<string, unknown> = {}
    const { __aliases, __ip, ...rest } = s.spec as Record<string, unknown> & {
      __aliases?: string[]
      __ip?: string
    }
    Object.assign(spec, rest)
    if (typeof spec.network_mode === "string") {
      const other = /^container:(.+)$/.exec(spec.network_mode)?.[1]
      if (other && names.has(other)) {
        spec.network_mode = `service:${names.get(other)}`
      }
    }
    if (s.env.length > 0) {
      const environment: Record<string, string | null> = {}
      for (const [k, v] of s.env) {
        if (v === undefined) {
          // `-e NAME` passes the host's value: here, the .env's.
          environment[k] = `\${${k}}`
          if (!envSeen.has(k)) {
            envSeen.set(k, "")
            envOut.push([k, ""])
          }
          continue
        }
        const toFile =
          options.envToFile &&
          ENV_NAME.test(k) &&
          (!envSeen.has(k) || envSeen.get(k) === v)
        if (toFile) {
          environment[k] = `\${${k}}`
          if (!envSeen.has(k)) {
            envSeen.set(k, v)
            envOut.push([k, v])
          }
        } else {
          // `$` in a value would be read as a variable by compose.
          environment[k] = v.split("$").join("$$")
        }
      }
      spec.environment = environment
    }
    if (s.networks.length > 0) {
      const aliases = __aliases
      const ip = __ip
      if (aliases || ip) {
        const nets: Record<string, unknown> = {}
        for (const n of s.networks) {
          nets[n] = {
            ...(aliases ? { aliases } : {}),
            ...(ip ? { ipv4_address: ip } : {}),
          }
        }
        spec.networks = nets
      } else spec.networks = s.networks
      for (const n of s.networks) networks.add(n)
    }
    for (const v of s.volumes) volumes.add(v)
    servicesMap.set(name, doc.createNode(spec))
    added.push(name)
  }

  const top = (key: string, items: Set<string>, external: boolean) => {
    if (items.size === 0) return
    const map = mapAt(key)
    for (const item of items) {
      if (map.has(item)) continue
      map.set(item, doc.createNode(external ? { external: true } : {}))
    }
  }
  top("volumes", volumes, options.externalVolumes)
  top("networks", networks, false)

  let text = doc.toString({ lineWidth: 0 })
  // `{}` for an empty volume/network reads better as a bare key.
  text = text.replace(/^( {2}[^\s:][^:\n]*):\s*\{\}\s*$/gm, "$1:")
  return { compose: text, env: envOut, added }
}

// Whether any service in the text is a list (`services: []`) or not a map.
export function composeShapeProblem(compose: string) {
  if (!compose.trim()) return undefined
  const doc = parseDocument(compose)
  if (doc.errors.length > 0) return "Fix the compose file's YAML first."
  const services = isMap(doc.contents)
    ? (doc.contents as YAMLMap).get("services", true)
    : undefined
  if (services !== undefined && services !== null && isSeq(services))
    return "services: has to be a map of names."
  return undefined
}
