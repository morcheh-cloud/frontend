"use client"

import {
  ChevronDown,
  Copy,
  Loader2,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, type ReactNode, useId, useState } from "react"
import { toast } from "sonner"

import { Choice } from "@/components/access/choice"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { fieldErrors } from "@/lib/api"
import type { DockerImageDetails, DockerRunBody } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Segmented } from "../../servers/[id]/components/parts"
import {
  useDockerImage,
  useDockerImages,
  useDockerNetworks,
  useDockerVolumes,
  useRunContainer,
} from "../api"
import { Tick } from "./dialogs"
import { containerHref, imageName, shortId } from "./meta"

type Open = { open: boolean; onOpenChange: (open: boolean) => void }

const NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/
const DEFAULT_NET = "-"
const text = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

type Restart = "no" | "unless-stopped" | "always" | "on-failure"
const restarts: { value: Restart; label: string; hint: string }[] = [
  {
    value: "unless-stopped",
    label: "Unless stopped",
    hint: "Comes back after a crash or a reboot, unless you stopped it.",
  },
  {
    value: "always",
    label: "Always",
    hint: "Comes back after a crash or a reboot, even if you stopped it.",
  },
  {
    value: "on-failure",
    label: "On failure",
    hint: "Started again only when it exits with an error.",
  },
  { value: "no", label: "Never", hint: "Stays down once it stops." },
]

type PortRow = {
  key: number
  ip: string
  host: string
  container: string
  proto: "tcp" | "udp"
}
type VolRow = { key: number; source: string; target: string; ro: boolean }
type EnvRow = { key: number; name: string; value: string }

let seq = 0
const next = () => ++seq

// Splits a command line like a shell would (quotes, backslashes), without
// expanding anything.
export function splitArgs(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let quote: '"' | "'" | null = null
  let has = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quote) {
      if (c === quote) quote = null
      else if (c === "\\" && quote === '"' && i + 1 < line.length)
        cur += line[++i]
      else cur += c
    } else if (c === '"' || c === "'") {
      quote = c
      has = true
    } else if (c === "\\" && i + 1 < line.length) {
      cur += line[++i]
      has = true
    } else if (/\s/.test(c)) {
      if (has || cur) out.push(cur)
      cur = ""
      has = false
    } else {
      cur += c
    }
  }
  if (has || cur) out.push(cur)
  return out
}

const quote = (s: string) =>
  /^[a-zA-Z0-9_./:=@%+,-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")

// A name from the image: library/nginx:1.27 → nginx.
function suggestName(ref: string) {
  const base = imageName(ref)
    .replace(/@.*$/, "")
    .replace(/:[^/]*$/, "")
  return slug(base.split("/").pop() ?? "") || "app"
}

function fromImage(d: DockerImageDetails | undefined, base: string) {
  const ports: PortRow[] = (d?.exposed_ports ?? []).map((p) => {
    const [port, proto] = p.split("/")
    return {
      key: next(),
      ip: "",
      host: port,
      container: port,
      proto: proto === "udp" ? "udp" : "tcp",
    }
  })
  const volumes: VolRow[] = (d?.volumes ?? []).map((target) => ({
    key: next(),
    source: `${base}-${slug(target) || "data"}`,
    target,
    ro: false,
  }))
  return { ports, volumes }
}

function useDraft(d: DockerImageDetails | undefined, ref: string) {
  const base = suggestName(ref)
  const start = fromImage(d, base)
  const [name, setName] = useState(base)
  const [ports, setPorts] = useState<PortRow[]>(start.ports)
  const [volumes, setVolumes] = useState<VolRow[]>(start.volumes)
  const [env, setEnv] = useState<EnvRow[]>([])
  const [restart, setRestart] = useState<Restart>("unless-stopped")
  const [network, setNetwork] = useState(DEFAULT_NET)
  const [memory, setMemory] = useState("")
  const [cpus, setCpus] = useState("")
  const [command, setCommand] = useState("")
  const [entrypoint, setEntrypoint] = useState("")
  const [user, setUser] = useState("")
  const [workdir, setWorkdir] = useState("")
  const [privileged, setPrivileged] = useState(false)
  const [createOnly, setCreateOnly] = useState(false)
  return {
    name,
    setName,
    ports,
    setPorts,
    volumes,
    setVolumes,
    env,
    setEnv,
    restart,
    setRestart,
    network,
    setNetwork,
    memory,
    setMemory,
    cpus,
    setCpus,
    command,
    setCommand,
    entrypoint,
    setEntrypoint,
    user,
    setUser,
    workdir,
    setWorkdir,
    privileged,
    setPrivileged,
    createOnly,
    setCreateOnly,
  }
}
type Draft = ReturnType<typeof useDraft>

// Checks the draft like the backend does; errors keyed as the backend's
// (ports.0.host_port → by row key so they follow their row).
function check(d: Draft): Record<string, string> {
  const e: Record<string, string> = {}
  if (d.name && !NAME.test(d.name))
    e.name =
      "Letters, digits, . _ - only; at least 2, starting with a letter or digit."
  const seen = new Set<string>()
  for (const p of d.ports) {
    const c = Number(p.container)
    if (!p.container || !Number.isInteger(c) || c < 1 || c > 65535)
      e[`port.${p.key}.container`] = "1 to 65535."
    if (p.host) {
      const h = Number(p.host)
      if (!Number.isInteger(h) || h < 1 || h > 65535)
        e[`port.${p.key}.host`] = "1 to 65535, or empty."
      const k = `${p.ip}:${p.host}/${p.proto}`
      if (seen.has(k)) e[`port.${p.key}.host`] = "Two rows use this port."
      seen.add(k)
    }
  }
  for (const v of d.volumes) {
    const s = v.source.trim()
    if (!s || /[:\n]/.test(s))
      e[`vol.${v.key}.source`] = "A volume's name or a folder (/…)."
    if (!v.target.trim().startsWith("/") || /[:\n]/.test(v.target))
      e[`vol.${v.key}.target`] = "A folder inside, starting with /."
  }
  for (const r of d.env) {
    if (!r.name.trim() && !r.value) continue
    if (!r.name.trim() || /[=\s]/.test(r.name.trim()))
      e[`env.${r.key}.name`] = "No spaces or =."
  }
  if (d.memory) {
    const m = Number(d.memory)
    if (!Number.isFinite(m) || m < 6) e.memory_mb = "At least 6 MB, or empty."
  }
  if (d.cpus) {
    const c = Number(d.cpus)
    if (!Number.isFinite(c) || c <= 0) e.cpus = "More than 0, or empty."
  }
  if (d.workdir && !d.workdir.startsWith("/"))
    e.workdir = "A folder inside, starting with /."
  return e
}

function toBody(d: Draft, image: string): DockerRunBody {
  const env = d.env.filter((r) => r.name.trim())
  const command = splitArgs(d.command)
  const entrypoint = splitArgs(d.entrypoint)
  return {
    image,
    ...(d.name ? { name: d.name } : {}),
    ...(d.ports.length
      ? {
          ports: d.ports.map((p) => ({
            container_port: Number(p.container),
            ...(p.host ? { host_port: Number(p.host) } : {}),
            ...(p.ip.trim() ? { host_ip: p.ip.trim() } : {}),
            protocol: p.proto,
          })),
        }
      : {}),
    ...(d.volumes.length
      ? {
          volumes: d.volumes.map((v) => ({
            source: v.source.trim(),
            target: v.target.trim(),
            ...(v.ro ? { read_only: true } : {}),
          })),
        }
      : {}),
    ...(env.length
      ? { env: env.map((r) => ({ name: r.name.trim(), value: r.value })) }
      : {}),
    restart: d.restart,
    ...(d.network !== DEFAULT_NET ? { network: d.network } : {}),
    ...(d.memory ? { memory_mb: Number(d.memory) } : {}),
    ...(d.cpus ? { cpus: Number(d.cpus) } : {}),
    ...(command.length ? { command } : {}),
    ...(entrypoint.length ? { entrypoint } : {}),
    ...(d.user.trim() ? { user: d.user.trim() } : {}),
    ...(d.workdir.trim() ? { workdir: d.workdir.trim() } : {}),
    ...(d.privileged ? { privileged: true } : {}),
    ...(d.createOnly ? { create_only: true } : {}),
  }
}

// The `docker run` line the body matches; values of variables stay hidden.
function preview(b: DockerRunBody): string {
  const a = ["docker", b.create_only ? "create" : "run"]
  if (!b.create_only) a.push("-d")
  if (b.name) a.push("--name", b.name)
  for (const e of b.env ?? []) a.push("-e", `${e.name}=…`)
  for (const p of b.ports ?? []) {
    let s = String(p.container_port)
    if (p.protocol === "udp") s += "/udp"
    s = `${p.host_port ?? ""}:${s}`
    if (p.host_ip) s = `${p.host_ip}:${s}`
    else if (!p.host_port) s = s.slice(1)
    a.push("-p", s)
  }
  for (const v of b.volumes ?? [])
    a.push("-v", quote(`${v.source}:${v.target}${v.read_only ? ":ro" : ""}`))
  if (b.restart && b.restart !== "no") a.push("--restart", b.restart)
  if (b.network) a.push("--network", b.network)
  if (b.memory_mb) a.push("-m", `${b.memory_mb}m`)
  if (b.cpus) a.push("--cpus", String(b.cpus))
  if (b.privileged) a.push("--privileged")
  if (b.user) a.push("-u", quote(b.user))
  if (b.workdir) a.push("-w", quote(b.workdir))
  if (b.entrypoint?.length)
    a.push("--entrypoint", quote(b.entrypoint.join(" ")))
  a.push(b.image)
  for (const c of b.command ?? []) a.push(quote(c))
  return a.join(" ")
}

// Rows pasted as `NAME=value` lines (a .env file) become rows.
function parseEnv(textIn: string): EnvRow[] {
  const rows: EnvRow[] = []
  for (const raw of textIn.split(/\r?\n/)) {
    const line = raw.trim().replace(/^export\s+/, "")
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq < 1) continue
    let value = line.slice(eq + 1)
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1)
    rows.push({ key: next(), name: line.slice(0, eq).trim(), value })
  }
  return rows
}

export function RunContainerDialog({
  server,
  image,
  open,
  onOpenChange,
}: Open & { server: string; image: string }) {
  const [picked, setPicked] = useState("")
  const chosen = image || picked
  const details = useDockerImage(server, chosen || null)
  const ref = details.data?.tags[0] ?? chosen
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        ref
          ? `Run ${ref.startsWith("sha256:") ? shortId(ref) : imageName(ref)}`
          : "Run a container"
      }
      description="A new container from an image, like docker run. Ports and volumes the image declares are filled in for you."
      className="sm:max-w-2xl"
    >
      {!image && (
        <ImagePick server={server} value={picked} onChange={setPicked} />
      )}
      {!chosen ? null : details.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <RunForm
          key={chosen}
          server={server}
          image={details.data?.tags[0] ?? details.data?.id ?? chosen}
          details={details.data}
          onDone={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDialog>
  )
}

// ImagePick lists the server's images when the wizard opens without one.
function ImagePick({
  server,
  value,
  onChange,
}: {
  server: string
  value: string
  onChange: (value: string) => void
}) {
  const images = useDockerImages(server)
  const items = (images.data ?? [])
    .flatMap((i) =>
      i.tags.length
        ? i.tags.map((t) => ({ value: t, label: t }))
        : [{ value: i.id, label: `${shortId(i.id)} (no tag)` }],
    )
    .sort((a, b) => a.label.localeCompare(b.label))
  return (
    <Field
      label="Image"
      hint={
        images.data && !items.length
          ? "This server has no images yet. Pull one on the Images page first."
          : "An image already on the server."
      }
      className="mb-4"
    >
      {(p) =>
        images.isPending ? (
          <Skeleton className="h-9" />
        ) : (
          <Choice
            id={p.id}
            label="Image"
            value={value}
            items={items}
            placeholder="Pick an image"
            onChange={onChange}
          />
        )
      }
    </Field>
  )
}

function RunForm({
  server,
  image,
  details,
  onDone,
}: {
  server: string
  image: string
  details: DockerImageDetails | undefined
  onDone: () => void
}) {
  const id = useId()
  const router = useRouter()
  const d = useDraft(details, image)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [more, setMore] = useState(false)
  const run = useRunContainer()
  const networks = useDockerNetworks(server)
  const volumes = useDockerVolumes(server, false)
  const body = toBody(d, image)
  const line = preview(body)

  function clear(key: string) {
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest)
  }

  // Backend errors come keyed by index; turn them into row keys.
  function fromServer(fields: Record<string, string>) {
    const out: Record<string, string> = {}
    for (const [k, msg] of Object.entries(fields)) {
      const m = /^(ports|volumes|env)\[(\d+)\]\.(\w+)$/.exec(k)
      if (!m) {
        out[k] = msg
        continue
      }
      const i = Number(m[2])
      if (m[1] === "ports" && d.ports[i])
        out[
          `port.${d.ports[i].key}.${m[3] === "container_port" ? "container" : "host"}`
        ] = msg
      else if (m[1] === "volumes" && d.volumes[i])
        out[`vol.${d.volumes[i].key}.${m[3]}`] = msg
      else if (m[1] === "env") {
        const named = d.env.filter((r) => r.name.trim())
        if (named[i]) out[`env.${named[i].key}.name`] = msg
      }
    }
    return out
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = check(d)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0]
      if (first.startsWith("env") || first === "workdir" || first === "cpus")
        setMore(true)
      return
    }
    run.mutate(
      { server, body },
      {
        onSuccess: (r) => {
          onDone()
          const open = {
            label: "Open",
            onClick: () => router.push(containerHref(server, r.name || r.id)),
          }
          if (r.error)
            toast.warning(`Created ${r.name}, but it didn't start`, {
              description: r.error,
              action: open,
              duration: 15000,
            })
          else
            toast.success(
              r.started ? `Started ${r.name}` : `Created ${r.name}`,
              { action: open },
            )
          for (const w of r.warnings) toast.info(w)
        },
        onError: (err) => {
          const fields = fromServer(fieldErrors(err))
          if (Object.keys(fields).length > 0) setErrors(fields)
          else toast.error(err.message)
        },
      },
    )
  }

  const netItems = [
    { value: DEFAULT_NET, label: "Default (bridge)" },
    ...(networks.data ?? [])
      .filter((n) => n.name !== "bridge")
      .map((n) => ({ value: n.name, label: `${n.name} · ${n.driver}` })),
  ]
  const listId = `${id}-volumes`
  const hiddenEnv = (details?.env ?? []).map((e) => e.name)

  return (
    <form id={id} onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Field
        label="Name"
        hint="Empty = Docker makes one up."
        error={errors.name}
      >
        {(p) => (
          <Input
            {...p}
            {...text}
            value={d.name}
            onChange={(e) => {
              d.setName(e.target.value.trim())
              clear("name")
            }}
            className="font-mono"
          />
        )}
      </Field>

      <Rows
        title="Ports"
        hint="Host port empty = Docker picks a free one. Leave the address empty to listen on every address."
        add="Add port"
        onAdd={() =>
          d.setPorts([
            ...d.ports,
            { key: next(), ip: "", host: "", container: "", proto: "tcp" },
          ])
        }
        empty="Nothing published: only other containers can reach it."
      >
        {d.ports.map((p, i) => (
          <Row
            key={p.key}
            label={`Port ${i + 1}`}
            onRemove={() => d.setPorts(d.ports.filter((x) => x.key !== p.key))}
            className="md:grid-cols-[1fr_6rem_6rem_auto]"
          >
            <Cell label="Address" error={undefined}>
              <Input
                {...text}
                aria-label="Host address"
                placeholder="All addresses"
                value={p.ip}
                inputMode="decimal"
                onChange={(e) =>
                  d.setPorts(
                    d.ports.map((x) =>
                      x.key === p.key ? { ...x, ip: e.target.value } : x,
                    ),
                  )
                }
                className="font-mono"
              />
            </Cell>
            <Cell label="Host port" error={errors[`port.${p.key}.host`]}>
              <Input
                aria-label="Host port"
                placeholder="Any"
                inputMode="numeric"
                value={p.host}
                onChange={(e) => {
                  d.setPorts(
                    d.ports.map((x) =>
                      x.key === p.key
                        ? { ...x, host: e.target.value.replace(/\D/g, "") }
                        : x,
                    ),
                  )
                  clear(`port.${p.key}.host`)
                }}
                className="font-mono"
              />
            </Cell>
            <Cell label="Container" error={errors[`port.${p.key}.container`]}>
              <Input
                aria-label="Container port"
                inputMode="numeric"
                value={p.container}
                onChange={(e) => {
                  d.setPorts(
                    d.ports.map((x) =>
                      x.key === p.key
                        ? {
                            ...x,
                            container: e.target.value.replace(/\D/g, ""),
                          }
                        : x,
                    ),
                  )
                  clear(`port.${p.key}.container`)
                }}
                className="font-mono"
              />
            </Cell>
            <Cell label="Protocol">
              <Segmented
                label="Protocol"
                value={p.proto}
                items={[
                  { value: "tcp", label: "TCP" },
                  { value: "udp", label: "UDP" },
                ]}
                onChange={(proto) =>
                  d.setPorts(
                    d.ports.map((x) => (x.key === p.key ? { ...x, proto } : x)),
                  )
                }
              />
            </Cell>
          </Row>
        ))}
      </Rows>

      <Rows
        title="Volumes"
        hint="A name = a Docker volume (made if missing). A path starting with / = that folder on the server."
        add="Add volume"
        onAdd={() =>
          d.setVolumes([
            ...d.volumes,
            { key: next(), source: "", target: "", ro: false },
          ])
        }
        empty="Nothing kept outside the container: its files go when it's removed."
      >
        <datalist id={listId}>
          {(volumes.data ?? []).map((v) => (
            <option key={v.name} value={v.name} />
          ))}
        </datalist>
        {d.volumes.map((v, i) => (
          <Row
            key={v.key}
            label={`Volume ${i + 1}`}
            onRemove={() =>
              d.setVolumes(d.volumes.filter((x) => x.key !== v.key))
            }
            className="md:grid-cols-[1fr_1fr_auto]"
          >
            <Cell
              label="Volume or folder"
              error={errors[`vol.${v.key}.source`]}
            >
              <Input
                {...text}
                aria-label="Volume or folder on the server"
                list={listId}
                value={v.source}
                placeholder="data or /srv/app"
                onChange={(e) => {
                  d.setVolumes(
                    d.volumes.map((x) =>
                      x.key === v.key ? { ...x, source: e.target.value } : x,
                    ),
                  )
                  clear(`vol.${v.key}.source`)
                }}
                className="font-mono"
              />
            </Cell>
            <Cell label="Inside" error={errors[`vol.${v.key}.target`]}>
              <Input
                {...text}
                aria-label="Folder inside the container"
                value={v.target}
                placeholder="/data"
                onChange={(e) => {
                  d.setVolumes(
                    d.volumes.map((x) =>
                      x.key === v.key ? { ...x, target: e.target.value } : x,
                    ),
                  )
                  clear(`vol.${v.key}.target`)
                }}
                className="font-mono"
              />
            </Cell>
            <Cell label="Mode">
              <Segmented
                label="Mode"
                value={v.ro ? "ro" : "rw"}
                items={[
                  { value: "rw", label: "Write" },
                  { value: "ro", label: "Read" },
                ]}
                onChange={(m) =>
                  d.setVolumes(
                    d.volumes.map((x) =>
                      x.key === v.key ? { ...x, ro: m === "ro" } : x,
                    ),
                  )
                }
              />
            </Cell>
          </Row>
        ))}
      </Rows>

      <Rows
        title="Environment"
        hint={
          hiddenEnv.length > 0
            ? `The image already sets ${hiddenEnv.slice(0, 6).join(", ")}${hiddenEnv.length > 6 ? "…" : ""}; a row with the same name replaces it. Paste a .env file into a name to add every line.`
            : "Paste a .env file into a name to add every line."
        }
        add="Add variable"
        onAdd={() => d.setEnv([...d.env, { key: next(), name: "", value: "" }])}
      >
        {d.env.map((r, i) => (
          <Row
            key={r.key}
            label={`Variable ${i + 1}`}
            onRemove={() => d.setEnv(d.env.filter((x) => x.key !== r.key))}
            className="md:grid-cols-[1fr_1.5fr]"
          >
            <Cell label="Name" error={errors[`env.${r.key}.name`]}>
              <Input
                {...text}
                aria-label="Name"
                value={r.name}
                placeholder="NAME"
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text")
                  if (!pasted.includes("\n") && !pasted.includes("=")) return
                  const rows = parseEnv(pasted)
                  if (rows.length === 0) return
                  e.preventDefault()
                  d.setEnv([
                    ...d.env.filter(
                      (x) => x.key !== r.key || x.name || x.value,
                    ),
                    ...rows,
                  ])
                }}
                onChange={(e) => {
                  d.setEnv(
                    d.env.map((x) =>
                      x.key === r.key ? { ...x, name: e.target.value } : x,
                    ),
                  )
                  clear(`env.${r.key}.name`)
                }}
                className="font-mono"
              />
            </Cell>
            <Cell label="Value">
              <Input
                {...text}
                aria-label="Value"
                value={r.value}
                onChange={(e) =>
                  d.setEnv(
                    d.env.map((x) =>
                      x.key === r.key ? { ...x, value: e.target.value } : x,
                    ),
                  )
                }
                className="font-mono"
              />
            </Cell>
          </Row>
        ))}
      </Rows>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Restart"
          hint={restarts.find((r) => r.value === d.restart)?.hint}
        >
          {(p) => (
            <Choice
              id={p.id}
              label="Restart"
              value={d.restart}
              items={restarts.map((r) => ({ value: r.value, label: r.label }))}
              onChange={(v) => d.setRestart(v as Restart)}
            />
          )}
        </Field>
        <Field
          label="Network"
          hint="On a network you made, containers reach each other by name."
        >
          {(p) => (
            <Choice
              id={p.id}
              label="Network"
              value={d.network}
              items={netItems}
              onChange={d.setNetwork}
            />
          )}
        </Field>
        <Field
          label="Memory limit (MB)"
          hint="Empty = no limit."
          error={errors.memory_mb}
        >
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={d.memory}
              placeholder="No limit"
              onChange={(e) => {
                d.setMemory(e.target.value.replace(/\D/g, ""))
                clear("memory_mb")
              }}
            />
          )}
        </Field>
        <Field
          label="CPU limit (cores)"
          hint="0.5 = half a core. Empty = no limit."
          error={errors.cpus}
        >
          {(p) => (
            <Input
              {...p}
              inputMode="decimal"
              value={d.cpus}
              placeholder="No limit"
              onChange={(e) => {
                d.setCpus(e.target.value.replace(/[^\d.]/g, ""))
                clear("cpus")
              }}
            />
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore(!more)}
          className="flex min-h-11 items-center gap-2 self-start rounded-lg text-body-sm font-medium text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-0"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", more && "rotate-180")}
          />
          More options
          {!more && moreSet(d) && (
            <span className="font-normal text-muted-foreground">
              · {moreSet(d)}
            </span>
          )}
        </button>
        {more && (
          <div className="flex flex-col gap-4">
            <Field
              label="Command"
              hint={
                details?.command.length
                  ? `Replaces the image's: ${details.command.join(" ")}`
                  : "Replaces the image's command. Quotes work like in a shell."
              }
            >
              {(p) => (
                <Input
                  {...p}
                  {...text}
                  value={d.command}
                  placeholder={details?.command.join(" ") || ""}
                  onChange={(e) => d.setCommand(e.target.value)}
                  className="font-mono"
                />
              )}
            </Field>
            <Field
              label="Entrypoint"
              hint={
                details?.entrypoint.length
                  ? `Replaces the image's: ${details.entrypoint.join(" ")}`
                  : "Rarely needed."
              }
            >
              {(p) => (
                <Input
                  {...p}
                  {...text}
                  value={d.entrypoint}
                  placeholder={details?.entrypoint.join(" ") || ""}
                  onChange={(e) => d.setEntrypoint(e.target.value)}
                  className="font-mono"
                />
              )}
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Run as user"
                hint={`Empty = the image's (${details?.user || "root"}). user, uid or uid:gid.`}
              >
                {(p) => (
                  <Input
                    {...p}
                    {...text}
                    value={d.user}
                    placeholder={details?.user || "root"}
                    onChange={(e) => d.setUser(e.target.value)}
                    className="font-mono"
                  />
                )}
              </Field>
              <Field
                label="Working folder"
                hint="Empty = the image's."
                error={errors.workdir}
              >
                {(p) => (
                  <Input
                    {...p}
                    {...text}
                    value={d.workdir}
                    placeholder={details?.working_dir || "/"}
                    onChange={(e) => {
                      d.setWorkdir(e.target.value)
                      clear("workdir")
                    }}
                    className="font-mono"
                  />
                )}
              </Field>
            </div>
            <Tick
              checked={d.createOnly}
              onChange={d.setCreateOnly}
              label="Create it without starting it"
              hint="Start it later from its page."
            />
            <Tick
              checked={d.privileged}
              onChange={d.setPrivileged}
              label="Privileged"
              hint="Full access to the server's devices and kernel. Only for tools that really need it."
            />
            {d.privileged && (
              <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-body-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                A privileged container can take over the whole server. Run only
                images you trust this way.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-body-sm font-medium">Same as</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="max-md:h-11"
            onClick={() =>
              navigator.clipboard
                ?.writeText(line)
                .then(() => toast.success("Copied"))
                .catch(() => toast.error("Couldn't copy"))
            }
          >
            <Copy />
            Copy
          </Button>
        </div>
        <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 font-mono text-caption break-all whitespace-pre-wrap">
          {line}
        </pre>
        {d.env.some((r) => r.name.trim()) && (
          <p className="text-caption text-muted-foreground">
            Values of variables are hidden here and in the audit log.
          </p>
        )}
      </div>

      <div className="sticky bottom-0 -mx-1 flex flex-col-reverse gap-2 bg-background px-1 pt-2 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="max-md:h-11"
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={run.isPending} className="max-md:h-11">
          {run.isPending && <Loader2 className="animate-spin" />}
          {d.createOnly ? "Create" : "Run"}
        </Button>
      </div>
    </form>
  )
}

function moreSet(d: Draft) {
  const set = [
    d.command && "command",
    d.entrypoint && "entrypoint",
    d.user && "user",
    d.workdir && "working folder",
    d.createOnly && "create only",
    d.privileged && "privileged",
  ].filter(Boolean)
  return set.join(", ")
}

function Rows({
  title,
  hint,
  add,
  onAdd,
  empty,
  children,
}: {
  title: string
  hint: ReactNode
  add: string
  onAdd: () => void
  empty?: string
  children: ReactNode
}) {
  const list = Array.isArray(children)
    ? children.flat().filter((c) => c && typeof c === "object" && "key" in c)
    : []
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-body-sm font-medium">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="max-md:h-11"
          onClick={onAdd}
        >
          <Plus />
          {add}
        </Button>
      </div>
      <p className="-mt-1 text-caption text-muted-foreground">{hint}</p>
      {children}
      {empty && list.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-3 text-body-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  )
}

function Row({
  label,
  onRemove,
  className,
  children,
}: {
  label: string
  onRemove: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <fieldset className="relative rounded-lg border border-border p-3 pe-12 md:border-0 md:p-0 md:pe-10">
      <legend className="sr-only">{label}</legend>
      <div className={cn("grid items-start gap-2", className)}>{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${label.toLowerCase()}`}
        onClick={onRemove}
        className="absolute end-1 top-1 max-md:size-11 md:end-0 md:top-0"
      >
        <X />
      </Button>
    </fieldset>
  )
}

function Cell({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-caption text-muted-foreground md:sr-only">
        {label}
      </span>
      {children}
      {error && (
        <span className="text-caption text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
