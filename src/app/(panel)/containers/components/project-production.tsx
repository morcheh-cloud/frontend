"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Loader2,
  Pencil,
  Rocket,
  Save,
  ScrollText,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { isMap, parseDocument, stringify } from "yaml"

import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  DockerProjectContainer,
  DockerProjectDetails,
  DockerProjectStats,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { type Note, Notices } from "../../servers/[id]/components/parts"
import { dockerKeys, useSaveProjectFiles } from "../api"
import { healthMeta } from "./meta"
import { Quiet } from "./parts"
import { Ring } from "./project-overview"

// --- Checks -----------------------------------------------------------------
// What a service should have before it carries real traffic. Read from the
// running containers (what Docker really applies), fixed in the compose file.

export type CheckKey =
  | "restart"
  | "memory"
  | "cpu"
  | "health"
  | "logs"
  | "image"
  | "privileged"
  | "user"
  | "readonly"

const checkMeta: Record<
  CheckKey,
  { label: string; fail: string; why: string; weight: number; soft?: boolean }
> = {
  restart: {
    label: "Restarts on its own",
    fail: "doesn't come back after a crash",
    why: "Without a restart policy a crashed container stays down, and nothing starts again after the server reboots.",
    weight: 3,
  },
  memory: {
    label: "Memory limit",
    fail: "no memory limit",
    why: "One leaking service can take all the server's memory and get the others killed.",
    weight: 3,
  },
  health: {
    label: "Health check",
    fail: "no health check",
    why: "Docker only knows the process runs, not that it answers. A health check marks a stuck service unhealthy, and alert rules can watch it.",
    weight: 2,
  },
  logs: {
    label: "Log rotation",
    fail: "logs grow without limit",
    why: "Docker's default json-file log never shrinks and can fill the disk.",
    weight: 2,
  },
  image: {
    label: "Pinned image version",
    fail: "image not pinned to a version",
    why: "With :latest (or no tag) a redeploy can pull a different version than the one you tested.",
    weight: 2,
  },
  privileged: {
    label: "Not privileged",
    fail: "runs privileged",
    why: "A privileged container can do almost anything on the server.",
    weight: 3,
  },
  cpu: {
    label: "CPU limit",
    fail: "no CPU limit",
    why: "A busy service can starve the rest of the server. Optional: many setups only limit memory.",
    weight: 1,
    soft: true,
  },
  user: {
    label: "Not running as root",
    fail: "runs as root",
    why: "If the app is broken into, root inside the container makes escaping easier. The image must support another user.",
    weight: 1,
    soft: true,
  },
  readonly: {
    label: "Read-only filesystem",
    fail: "writable filesystem",
    why: "The app can't change its own files; writes go to volumes. Many images need a tmpfs for /tmp to run this way.",
    weight: 1,
    soft: true,
  },
}

const order: CheckKey[] = [
  "restart",
  "memory",
  "health",
  "logs",
  "image",
  "privileged",
  "cpu",
  "user",
  "readonly",
]

const goodRestart = (v: string) =>
  v === "always" || v === "unless-stopped" || v.startsWith("on-failure")

function imageTag(image: string) {
  if (image.includes("@sha256:")) return "digest"
  const last = image.slice(image.lastIndexOf("/") + 1)
  const i = last.indexOf(":")
  return i < 0 ? "" : last.slice(i + 1)
}

const rotatingDriver = (d: string) => d === "" || d === "json-file"

function liveOk(c: DockerProjectContainer, key: CheckKey, built: boolean) {
  switch (key) {
    case "restart":
      return goodRestart(c.restart_policy)
    case "memory":
      return c.memory_limit > 0
    case "cpu":
      return c.cpu_limit > 0
    case "health":
      return c.healthcheck
    case "logs":
      return !rotatingDriver(c.log_driver) || !!c.log_max_size
    case "image": {
      if (built) return true
      const t = imageTag(c.image)
      return t !== "" && t !== "latest"
    }
    case "privileged":
      return !c.privileged
    case "user":
      return !!c.user && c.user !== "root" && !/^0(:|$)/.test(c.user)
    case "readonly":
      return c.read_only
  }
}

function liveValue(c: DockerProjectContainer, key: CheckKey, built: boolean) {
  switch (key) {
    case "restart":
      return c.restart_policy || "no"
    case "memory":
      return c.memory_limit ? formatSize(c.memory_limit) : "None"
    case "cpu":
      return c.cpu_limit
        ? `${c.cpu_limit} ${c.cpu_limit === 1 ? "core" : "cores"}`
        : "None"
    case "health":
      if (!c.healthcheck) return "None"
      return c.health !== "none" ? healthMeta[c.health].label : "Set"
    case "logs":
      if (!rotatingDriver(c.log_driver)) return c.log_driver
      return c.log_max_size
        ? `${c.log_max_size} × ${c.log_max_file || "1"}`
        : "Unlimited"
    case "image":
      return built ? "Built here" : imageTag(c.image) || "No tag"
    case "privileged":
      return c.privileged ? "Privileged" : "No"
    case "user":
      return c.user || "root"
    case "readonly":
      return c.read_only ? "Read-only" : "Writable"
  }
}

export type CheckResult = {
  key: CheckKey
  ok: boolean
  value: string
  // Fixed in the compose file, waiting for Apply.
  pending: boolean
}

export type ServiceReport = {
  service: string
  sample: DockerProjectContainer
  count: number
  checks: CheckResult[]
  // Defined in the (first) compose file, so it can be edited here.
  editable: boolean
}

// The compose file's view of a service, when the file can be read.
type Json = Record<string, unknown>
const obj = (v: unknown): Json =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {}
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v))

function composeServices(compose: string | undefined) {
  if (!compose) return null
  try {
    const doc = parseDocument(compose)
    if (doc.errors.length) return null
    return obj(obj(doc.toJSON()).services)
  } catch {
    return null
  }
}

function composeOk(s: Json, key: CheckKey) {
  const limits = obj(obj(obj(s.deploy).resources).limits)
  const logging = obj(s.logging)
  switch (key) {
    case "restart":
      return goodRestart(str(s.restart))
    case "memory":
      return !!str(s.mem_limit || limits.memory)
    case "cpu":
      return !!str(s.cpus || limits.cpus)
    case "health":
      return !!s.healthcheck && !obj(s.healthcheck).disable
    case "logs":
      return (
        !rotatingDriver(str(logging.driver)) ||
        !!str(obj(logging.options)["max-size"])
      )
    case "image": {
      const t = imageTag(str(s.image))
      return t !== "" && t !== "latest"
    }
    case "privileged":
      return !s.privileged
    case "user": {
      const u = str(s.user)
      return !!u && u !== "root" && !/^0(:|$)/.test(u)
    }
    case "readonly":
      return !!s.read_only
  }
}

export function readiness(
  containers: DockerProjectContainer[],
  compose?: string,
) {
  const services = composeServices(compose)
  const groups = new Map<string, DockerProjectContainer[]>()
  for (const c of containers) {
    const k = c.service || c.name
    groups.set(k, [...(groups.get(k) ?? []), c])
  }
  let got = 0
  let total = 0
  const misses: { text: string; weight: number }[] = []
  let suggestions = 0
  let pending = 0
  const reports: ServiceReport[] = []
  for (const [service, list] of [...groups].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    // Replicas share their settings; a running one says it best.
    const sample = list.find((c) => c.state === "running") ?? list[0]
    const def = services ? services[service] : undefined
    const s = def === undefined ? null : obj(def)
    const built = !!s?.build && !s.image
    const checks = order.map((key) => {
      const ok = liveOk(sample, key, built)
      const waiting = !ok && !!s && composeOk(s, key)
      const meta = checkMeta[key]
      total += meta.weight
      if (ok) got += meta.weight
      else if (waiting) pending++
      else if (meta.soft) suggestions++
      else
        misses.push({ text: `${service}: ${meta.fail}`, weight: meta.weight })
      return {
        key,
        ok,
        value: liveValue(sample, key, built),
        pending: waiting,
      }
    })
    reports.push({
      service,
      sample,
      count: list.length,
      checks,
      editable: !!s,
    })
  }
  misses.sort((a, b) => b.weight - a.weight)
  return {
    score: total ? Math.round((got / total) * 100) : 100,
    failed: misses.length,
    suggestions,
    pending,
    top: misses.map((m) => m.text),
    services: reports,
  }
}

export const scoreTone = (score: number) =>
  score >= 90
    ? "text-success"
    : score >= 60
      ? "text-warning"
      : "text-destructive"

// --- Writing the compose file ----------------------------------------------

type Path = (string | number)[]

// Deletes a key and then any map it leaves empty, up to the service.
function unset(doc: ReturnType<typeof parseDocument>, path: Path) {
  doc.deleteIn(path)
  for (let i = path.length - 1; i >= 3; i--) {
    const parent = doc.getIn(path.slice(0, i), true)
    if (isMap(parent) && parent.items.length === 0)
      doc.deleteIn(path.slice(0, i))
    else break
  }
}

function put(doc: ReturnType<typeof parseDocument>, path: Path, v: unknown) {
  doc.setIn(path, doc.createNode(v))
}

type Restart = "" | "no" | "always" | "unless-stopped" | "on-failure"

type Form = {
  restart: Restart
  memory: string
  cpus: string
  health: boolean
  test: string
  interval: string
  timeout: string
  retries: string
  startPeriod: string
  rotate: boolean
  maxSize: string
  maxFile: string
  user: string
  readOnly: boolean
  privileged: boolean
}

function testText(test: unknown) {
  if (Array.isArray(test)) {
    const [kind, ...rest] = test.map(str)
    if (kind === "NONE") return ""
    if (kind === "CMD-SHELL" || kind === "CMD") return rest.join(" ")
    return [kind, ...rest].join(" ")
  }
  return str(test)
}

function formOf(s: Json): Form {
  const limits = obj(obj(obj(s.deploy).resources).limits)
  const hc = obj(s.healthcheck)
  const logging = obj(s.logging)
  const options = obj(logging.options)
  const restart = str(s.restart)
  return {
    restart: (restart.startsWith("on-failure")
      ? "on-failure"
      : restart) as Restart,
    memory: str(s.mem_limit || limits.memory),
    cpus: str(s.cpus || limits.cpus),
    health: !!s.healthcheck && !hc.disable,
    test: testText(hc.test),
    interval: str(hc.interval) || "30s",
    timeout: str(hc.timeout) || "5s",
    retries: str(hc.retries) || "3",
    startPeriod: str(hc.start_period),
    rotate: !!str(options["max-size"]),
    maxSize: str(options["max-size"]) || "10m",
    maxFile: str(options["max-file"]) || "3",
    user: str(s.user),
    readOnly: !!s.read_only,
    privileged: !!s.privileged,
  }
}

const same = (a: Form, b: Form, keys: (keyof Form)[]) =>
  keys.every((k) => a[k] === b[k])

// Writes only what changed, so untouched settings keep their formatting.
function applyForm(compose: string, service: string, was: Form, f: Form) {
  const doc = parseDocument(compose)
  const base: Path = ["services", service]
  const s = obj(obj(obj(doc.toJSON()).services)[service])
  const limits: Path = [...base, "deploy", "resources", "limits"]

  if (f.restart !== was.restart) {
    // on-failure written as is keeps a ":N" count it had.
    const keep = f.restart === "on-failure" && str(s.restart).startsWith("on-")
    if (!f.restart) unset(doc, [...base, "restart"])
    else if (!keep) put(doc, [...base, "restart"], f.restart)
  }
  if (f.memory !== was.memory) {
    const path =
      "mem_limit" in s ? [...base, "mem_limit"] : [...limits, "memory"]
    if (f.memory.trim()) put(doc, path, f.memory.trim())
    else unset(doc, path)
  }
  if (f.cpus !== was.cpus) {
    const path = "cpus" in s ? [...base, "cpus"] : [...limits, "cpus"]
    if (f.cpus.trim()) put(doc, path, f.cpus.trim())
    else unset(doc, path)
  }
  const healthKeys: (keyof Form)[] = [
    "health",
    "test",
    "interval",
    "timeout",
    "retries",
    "startPeriod",
  ]
  if (!same(f, was, healthKeys)) {
    if (f.health) {
      const node: Json = {
        ...obj(s.healthcheck),
        test: ["CMD-SHELL", f.test.trim()],
        interval: f.interval.trim(),
        timeout: f.timeout.trim(),
        retries: Number(f.retries),
      }
      delete node.disable
      if (f.startPeriod.trim()) node.start_period = f.startPeriod.trim()
      else delete node.start_period
      const n = doc.createNode(node)
      const test = n.get("test", true)
      if (test && typeof test === "object" && "flow" in test) test.flow = true
      doc.setIn([...base, "healthcheck"], n)
    } else unset(doc, [...base, "healthcheck"])
  }
  if (!same(f, was, ["rotate", "maxSize", "maxFile"])) {
    if (f.rotate) {
      const driver = str(obj(s.logging).driver)
      if (!driver) put(doc, [...base, "logging", "driver"], "json-file")
      put(doc, [...base, "logging", "options", "max-size"], f.maxSize.trim())
      put(doc, [...base, "logging", "options", "max-file"], f.maxFile.trim())
    } else {
      unset(doc, [...base, "logging", "options", "max-size"])
      unset(doc, [...base, "logging", "options", "max-file"])
    }
  }
  if (f.user !== was.user) {
    if (f.user.trim()) put(doc, [...base, "user"], f.user.trim())
    else unset(doc, [...base, "user"])
  }
  if (f.readOnly !== was.readOnly) {
    if (f.readOnly) put(doc, [...base, "read_only"], true)
    else unset(doc, [...base, "read_only"])
  }
  if (f.privileged !== was.privileged && !f.privileged)
    unset(doc, [...base, "privileged"])
  return doc.toString()
}

const sizeRe = /^\d+(\.\d+)?\s*([bkmg]|kb|mb|gb)?$/i
const durationRe = /^(\d+(\.\d+)?(ns|us|ms|s|m|h))+$/

function problems(f: Form, cores: number) {
  const e: Partial<Record<keyof Form, string>> = {}
  const env = (v: string) => v.includes("${")
  if (f.memory && !env(f.memory) && !sizeRe.test(f.memory.trim()))
    e.memory = "A size like 512m or 1g"
  if (f.cpus && !env(f.cpus)) {
    const n = Number(f.cpus)
    if (!(n > 0)) e.cpus = "A number of cores like 0.5 or 2"
    else if (cores && n > cores)
      e.cpus = `The server has ${cores} ${cores === 1 ? "core" : "cores"}`
  }
  if (f.health) {
    if (!f.test.trim()) e.test = "The command to run inside the container"
    for (const k of ["interval", "timeout"] as const)
      if (!durationRe.test(f[k].trim())) e[k] = "Like 30s or 1m"
    if (f.startPeriod && !durationRe.test(f.startPeriod.trim()))
      e.startPeriod = "Like 30s or 1m"
    const r = Number(f.retries)
    if (!Number.isInteger(r) || r < 1 || r > 100) e.retries = "1 to 100"
  }
  if (f.rotate) {
    if (!/^\d+[kmg]?$/i.test(f.maxSize.trim())) e.maxSize = "Like 10m"
    const n = Number(f.maxFile)
    if (!Number.isInteger(n) || n < 1 || n > 100) e.maxFile = "1 to 100"
  }
  return e
}

// Ready-made health checks for well-known images, else an HTTP one on the
// container's first port.
function healthPresets(c: DockerProjectContainer) {
  const image = c.image.toLowerCase()
  const out: { label: string; cmd: string }[] = []
  if (image.includes("postgres"))
    out.push({ label: "PostgreSQL", cmd: "pg_isready -U postgres" })
  if (image.includes("mysql") || image.includes("mariadb"))
    out.push({ label: "MySQL", cmd: "mysqladmin ping -h localhost" })
  if (image.includes("redis") || image.includes("valkey"))
    out.push({ label: "Redis", cmd: "redis-cli ping" })
  if (image.includes("mongo"))
    out.push({
      label: "MongoDB",
      cmd: "mongosh --quiet --eval 'db.runCommand({ ping: 1 })'",
    })
  const port = c.ports.find((p) => p.proto === "tcp")?.private ?? 80
  out.push(
    {
      label: "HTTP (curl)",
      cmd: `curl -fsS http://localhost:${port}/ || exit 1`,
    },
    {
      label: "HTTP (wget)",
      cmd: `wget -qO- http://localhost:${port}/ > /dev/null || exit 1`,
    },
  )
  return out
}

// Saves the compose file; 409 = someone saved meanwhile → reload theirs.
function useWriteCompose(
  p: DockerProjectDetails,
  serverId: string,
  onApply: () => void,
) {
  const save = useSaveProjectFiles()
  const qc = useQueryClient()
  const write = (compose: string, apply: boolean, done: () => void) =>
    save.mutate(
      {
        server: serverId,
        project: p.name,
        compose,
        env: p.env,
        revision: p.revision,
      },
      {
        onSuccess: () => {
          toast.success(
            apply ? "Saved, applying the changes" : "Saved",
            apply
              ? undefined
              : { description: "Apply the project to put it into effect." },
          )
          if (apply) onApply()
          done()
        },
        onError: (e) => {
          if (e instanceof ApiError && e.status === 409) {
            toast.error("The compose file changed meanwhile", {
              description: "Loaded the new version: make the change again.",
            })
            qc.invalidateQueries({
              queryKey: dockerKeys.project(serverId, p.name),
            })
            done()
          } else if (!(e instanceof ApiError && e.status === 422))
            toast.error("Couldn't save", { description: e.message })
        },
      },
    )
  const refused =
    save.error instanceof ApiError && save.error.status === 422
      ? save.error.message
      : undefined
  return { write, save, refused }
}

// --- The tab ----------------------------------------------------------------

export function ProjectProduction({
  p,
  stats,
  pending,
  serverId,
  canEdit,
  phone,
  onApply,
  onFiles,
}: {
  p: DockerProjectDetails
  stats: DockerProjectStats | undefined
  pending: boolean
  serverId: string
  // Engineer, and the compose file was read.
  canEdit: boolean
  phone: boolean
  onApply: () => void
  onFiles?: () => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [open, setOpen] = useOpen("docker-production-edit")
  const [fix, setFix] = useState<Quick | null>(null)
  const [fixOpen, setFixOpen] = useOpen("docker-production-fix")

  if (!stats)
    return pending ? (
      <Skeleton className="h-96 rounded-2xl" />
    ) : (
      <Quiet>Couldn't read the containers' settings just now.</Quiet>
    )
  if (stats.containers.length === 0)
    return (
      <Quiet>
        Nothing to check yet: deploy the project, and its containers' settings
        show up here.
      </Quiet>
    )

  const readable = canEdit && p.readable && !p.missing
  const r = readiness(stats.containers, readable ? p.compose : undefined)
  const composeBroken =
    readable && !!p.compose && composeServices(p.compose) === null
  const report = r.services.find((s) => s.service === editing)

  const quick: Quick[] = readable
    ? [
        {
          key: "restart" as const,
          label: "Restart them on a crash",
          body: "Sets restart: unless-stopped, so they come back after a crash or a reboot (unless you stopped them).",
          services: r.services
            .filter((s) => s.editable && failing(s, "restart"))
            .map((s) => s.service),
        },
        {
          key: "logs" as const,
          label: "Rotate their logs",
          body: "Keeps at most 3 files of 10 MB per container (json-file), so logs can't fill the disk.",
          services: r.services
            .filter(
              (s) =>
                s.editable &&
                failing(s, "logs") &&
                rotatingDriver(s.sample.log_driver),
            )
            .map((s) => s.service),
        },
      ].filter((q) => q.services.length > 0)
    : []

  const notes: Note[] = []
  if (r.pending > 0)
    notes.push({
      key: "pending",
      title: "Saved changes wait to be applied",
      body: "The compose file has them, the running containers don't yet. Apply recreates the changed services.",
      action: canEdit && (
        <Button size="sm" onClick={onApply}>
          <Rocket />
          Apply now
        </Button>
      ),
    })
  if (composeBroken)
    notes.push({
      key: "broken",
      title: "The compose file has a YAML problem",
      body: "Fix it in Files first; until then these settings can only be read.",
      warn: true,
      action: onFiles && (
        <Button size="sm" variant="outline" onClick={onFiles}>
          Open Files
        </Button>
      ),
    })
  else if (canEdit && p.files.length > 1)
    notes.push({
      key: "files",
      title: "Several compose files",
      body: `Only services written in ${p.files[0]?.split("/").pop()} can be changed here; edit the others by hand.`,
    })

  const summary = (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center",
        phone && "-mx-4 rounded-none border-x-0 shadow-none",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Ring value={r.score} size={64} className={scoreTone(r.score)} />
        <div className="min-w-0">
          <p className="text-body font-medium">
            {r.failed === 0
              ? "Ready for production"
              : `${r.failed} ${r.failed === 1 ? "thing" : "things"} to fix`}
          </p>
          <p className="text-body-sm text-muted-foreground">
            {[
              `${r.services.length} ${r.services.length === 1 ? "service" : "services"} checked`,
              r.suggestions > 0 &&
                `${r.suggestions} ${r.suggestions === 1 ? "suggestion" : "suggestions"}`,
              r.pending > 0 && `${r.pending} waiting for Apply`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      {quick.length > 0 && (
        <div className="flex flex-col gap-2 md:flex-row">
          {quick.map((q) => (
            <Button
              key={q.key}
              variant="outline"
              className="max-md:h-11"
              onClick={() => {
                setFix(q)
                setFixOpen(true)
              }}
            >
              {q.key === "logs" ? <ScrollText /> : <Wrench />}
              {q.label}
              <span className="text-muted-foreground tabular-nums">
                {q.services.length}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {summary}
      <Notices notes={notes} className="max-md:-mx-4" />
      <div
        className={cn(
          phone
            ? "-mx-4 flex flex-col gap-5"
            : "grid grid-cols-[repeat(auto-fill,minmax(min(100%,24rem),1fr))] gap-4",
        )}
      >
        {r.services.map((s) => (
          <ServiceCard
            key={s.service}
            s={s}
            phone={phone}
            canEdit={readable && !composeBroken && s.editable}
            onEdit={() => {
              setEditing(s.service)
              setOpen(true)
            }}
          />
        ))}
      </div>
      {report && (
        <ServiceEditor
          key={`${report.service}:${p.revision}`}
          p={p}
          report={report}
          cores={stats.cpus}
          serverId={serverId}
          open={open}
          onOpenChange={setOpen}
          onApply={onApply}
        />
      )}
      {fix && (
        <QuickFix
          key={`${fix.key}:${p.revision}`}
          p={p}
          fix={fix}
          serverId={serverId}
          open={fixOpen}
          onOpenChange={setFixOpen}
          onApply={onApply}
        />
      )}
    </div>
  )
}

type Quick = {
  key: "restart" | "logs"
  label: string
  body: string
  services: string[]
}

const failing = (s: ServiceReport, key: CheckKey) =>
  s.checks.some((c) => c.key === key && !c.ok && !c.pending)

function ServiceCard({
  s,
  phone,
  canEdit,
  onEdit,
}: {
  s: ServiceReport
  phone: boolean
  canEdit: boolean
  onEdit: () => void
}) {
  const hard = s.checks.filter((c) => !checkMeta[c.key].soft)
  const passed = hard.filter((c) => c.ok).length
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col bg-card",
        phone
          ? "border-y border-border"
          : "rounded-2xl border border-border shadow-sm",
      )}
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium">{s.service}</p>
          <p className="truncate text-caption text-muted-foreground">
            {passed}/{hard.length} checks pass
            {s.count > 1 && ` · ${s.count} containers`}
            {!s.editable && canEdit === false && " · read only"}
          </p>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size={phone ? "default" : "sm"}
            className={cn(phone && "h-11")}
            onClick={onEdit}
          >
            <Pencil />
            Edit
          </Button>
        )}
      </header>
      <ul className="flex flex-col divide-y divide-border">
        {s.checks.map((c) => (
          <CheckRow key={c.key} c={c} />
        ))}
      </ul>
    </section>
  )
}

function CheckRow({ c }: { c: CheckResult }) {
  const meta = checkMeta[c.key]
  const Icon = c.ok
    ? CircleCheck
    : c.pending
      ? Clock
      : meta.soft
        ? CircleAlert
        : CircleX
  const tone = c.ok
    ? "text-success"
    : c.pending
      ? "text-brand"
      : meta.soft
        ? "text-ash"
        : "text-destructive"
  return (
    <li className="flex min-h-11 items-start gap-3 px-4 py-2.5">
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 text-body-sm">
          <span className="min-w-0 flex-1 truncate">{meta.label}</span>
          <span className="max-w-[45%] shrink-0 truncate font-mono text-caption text-muted-foreground">
            {c.value}
          </span>
        </p>
        {!c.ok && (
          <p className="mt-0.5 text-caption text-muted-foreground">
            {c.pending
              ? "Fixed in the compose file; Apply to put it into effect."
              : meta.why}
          </p>
        )}
      </div>
    </li>
  )
}

// --- Editing one service ----------------------------------------------------

const restarts: { value: Restart; label: string; hint: string }[] = [
  {
    value: "unless-stopped",
    label: "Unless stopped",
    hint: "Comes back after a crash or reboot, stays down if you stopped it",
  },
  { value: "always", label: "Always", hint: "Even after you stopped it" },
  {
    value: "on-failure",
    label: "On failure",
    hint: "Only when it exits with an error",
  },
  { value: "no", label: "Never", hint: "Stays down" },
]

function Chips({
  values,
  onPick,
  current,
}: {
  values: { label: string; value: string }[]
  onPick: (v: string) => void
  current: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <button
          key={v.label}
          type="button"
          aria-pressed={current === v.value}
          onClick={() => onPick(v.value)}
          className="h-8 rounded-full border border-border px-3 text-caption text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:h-9"
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}

function Group({
  title,
  hint,
  aside,
  children,
}: {
  title: string
  hint?: string
  aside?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-body-sm font-medium">{title}</h3>
          {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function ServiceEditor({
  p,
  report,
  cores,
  serverId,
  open,
  onOpenChange,
  onApply,
}: {
  p: DockerProjectDetails
  report: ServiceReport
  cores: number
  serverId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: () => void
}) {
  const s = obj(composeServices(p.compose)?.[report.service])
  const [was] = useState(() => formOf(s))
  const [f, setF] = useState<Form>(was)
  const [shown, setShown] = useState(false)
  const set = (patch: Partial<Form>) => setF((old) => ({ ...old, ...patch }))
  const { write, save, refused } = useWriteCompose(p, serverId, onApply)
  const c = report.sample
  const errors = problems(f, cores)
  const bad = Object.keys(errors).length > 0
  const dirty = JSON.stringify(f) !== JSON.stringify(was)
  const driver = str(obj(s.logging).driver)
  const imageHealth = c.healthcheck && !s.healthcheck
  const next = dirty && !bad ? applyForm(p.compose, report.service, was, f) : ""
  const after = next
    ? stringify({
        [report.service]: obj(composeServices(next)?.[report.service]),
      })
    : ""

  const submit = (apply: boolean) =>
    write(next, apply, () => onOpenChange(false))

  const footer = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="max-md:h-11"
      >
        Cancel
      </Button>
      <Button
        variant="outline"
        disabled={!dirty || bad || save.isPending}
        onClick={() => submit(false)}
        className="max-md:h-11"
      >
        {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
        Save
      </Button>
      <Button
        disabled={!dirty || bad || save.isPending}
        onClick={() => submit(true)}
        className="max-md:h-11"
      >
        <Rocket />
        Save and apply
      </Button>
    </>
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Production settings: ${report.service}`}
      description="Written into the compose file. Apply recreates the service with them."
      className="sm:max-w-xl"
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        {refused && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 font-mono text-caption whitespace-pre-wrap text-destructive">
            {refused}
          </p>
        )}
        <Group
          title="When it stops"
          hint={`Running with: ${c.restart_policy || "no"}`}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {restarts.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={f.restart === o.value}
                onClick={() => set({ restart: o.value })}
                className="flex min-h-11 flex-col items-start rounded-xl border border-border px-3 py-2 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft"
              >
                <span className="text-body-sm font-medium">{o.label}</span>
                <span className="text-caption text-muted-foreground">
                  {o.hint}
                </span>
              </button>
            ))}
          </div>
        </Group>

        <Group
          title="Limits"
          hint="Empty = no limit. Docker stops a container that goes over its memory limit."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Field
                label="Memory"
                error={errors.memory}
                hint={
                  c.measured
                    ? `Using ${formatSize(c.memory_used)} now`
                    : undefined
                }
              >
                {(props) => (
                  <Input
                    {...props}
                    value={f.memory}
                    onChange={(e) => set({ memory: e.target.value })}
                    placeholder="512m"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                  />
                )}
              </Field>
              <Chips
                current={f.memory}
                onPick={(v) => set({ memory: v })}
                values={["256m", "512m", "1g", "2g"].map((v) => ({
                  label: v.toUpperCase(),
                  value: v,
                }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Field
                label="CPU cores"
                error={errors.cpus}
                hint={cores ? `The server has ${cores}` : undefined}
              >
                {(props) => (
                  <Input
                    {...props}
                    value={f.cpus}
                    onChange={(e) => set({ cpus: e.target.value })}
                    placeholder="1"
                    inputMode="decimal"
                    autoComplete="off"
                    className="font-mono"
                  />
                )}
              </Field>
              <Chips
                current={f.cpus}
                onPick={(v) => set({ cpus: v })}
                values={["0.5", "1", "2"]
                  .filter((v) => !cores || Number(v) <= cores)
                  .map((v) => ({ label: v, value: v }))}
              />
            </div>
          </div>
        </Group>

        <Group
          title="Health check"
          hint={
            imageHealth
              ? "The image has its own check; turning this on replaces it."
              : "A command run inside the container; exit 0 = healthy."
          }
          aside={
            <Switch
              checked={f.health}
              onCheckedChange={(v) => set({ health: v })}
              aria-label="Health check"
            />
          }
        >
          {f.health && (
            <>
              <div className="flex flex-col gap-2">
                <Field label="Command" error={errors.test}>
                  {(props) => (
                    <Input
                      {...props}
                      value={f.test}
                      onChange={(e) => set({ test: e.target.value })}
                      placeholder="curl -fsS http://localhost:8080/health || exit 1"
                      autoComplete="off"
                      spellCheck={false}
                      className="font-mono"
                    />
                  )}
                </Field>
                <Chips
                  current={f.test}
                  onPick={(v) => set({ test: v })}
                  values={healthPresets(c).map((h) => ({
                    label: h.label,
                    value: h.cmd,
                  }))}
                />
                <p className="text-caption text-ash">
                  The tool it calls (curl, wget…) must be in the image.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Every" error={errors.interval}>
                  {(props) => (
                    <Input
                      {...props}
                      value={f.interval}
                      onChange={(e) => set({ interval: e.target.value })}
                      className="font-mono"
                    />
                  )}
                </Field>
                <Field label="Timeout" error={errors.timeout}>
                  {(props) => (
                    <Input
                      {...props}
                      value={f.timeout}
                      onChange={(e) => set({ timeout: e.target.value })}
                      className="font-mono"
                    />
                  )}
                </Field>
                <Field label="Tries" error={errors.retries}>
                  {(props) => (
                    <Input
                      {...props}
                      value={f.retries}
                      inputMode="numeric"
                      onChange={(e) => set({ retries: e.target.value })}
                      className="font-mono"
                    />
                  )}
                </Field>
                <Field label="Grace" error={errors.startPeriod}>
                  {(props) => (
                    <Input
                      {...props}
                      value={f.startPeriod}
                      placeholder="0s"
                      onChange={(e) => set({ startPeriod: e.target.value })}
                      className="font-mono"
                    />
                  )}
                </Field>
              </div>
            </>
          )}
        </Group>

        <Group
          title="Log rotation"
          hint={
            rotatingDriver(driver)
              ? f.rotate
                ? `Keeps at most ${f.maxFile || "?"} × ${f.maxSize || "?"} per container.`
                : "Off: the log grows until the disk is full."
              : `Logs go to ${driver}, which handles its own size.`
          }
          aside={
            rotatingDriver(driver) && (
              <Switch
                checked={f.rotate}
                onCheckedChange={(v) => set({ rotate: v })}
                aria-label="Log rotation"
              />
            )
          }
        >
          {f.rotate && rotatingDriver(driver) && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="File size" error={errors.maxSize}>
                {(props) => (
                  <Input
                    {...props}
                    value={f.maxSize}
                    onChange={(e) => set({ maxSize: e.target.value })}
                    className="font-mono"
                  />
                )}
              </Field>
              <Field label="Files kept" error={errors.maxFile}>
                {(props) => (
                  <Input
                    {...props}
                    value={f.maxFile}
                    inputMode="numeric"
                    onChange={(e) => set({ maxFile: e.target.value })}
                    className="font-mono"
                  />
                )}
              </Field>
            </div>
          )}
        </Group>

        <Group title="Security">
          <Field
            label="Run as user"
            hint="A name or uid[:gid], like 1000:1000. Empty = the image's default."
          >
            {(props) => (
              <Input
                {...props}
                value={f.user}
                onChange={(e) => set({ user: e.target.value })}
                placeholder={c.user || "root"}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            )}
          </Field>
          <Toggle
            label="Read-only filesystem"
            hint="Writes only go to volumes and tmpfs mounts. Test it: many images need a tmpfs for /tmp."
            checked={f.readOnly}
            onChange={(v) => set({ readOnly: v })}
          />
          {was.privileged && (
            <Toggle
              label="Privileged"
              hint="Full access to the server. Turn off unless the service really needs it (e.g. Docker-in-Docker)."
              checked={f.privileged}
              onChange={(v) => set({ privileged: v })}
            />
          )}
        </Group>

        {after && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <button
              type="button"
              aria-expanded={shown}
              onClick={() => setShown(!shown)}
              className="self-start text-body-sm text-brand outline-none hover:underline focus-visible:underline"
            >
              {shown ? "Hide the change" : "Show the service after the change"}
            </button>
            {shown && (
              <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-subtle p-3 font-mono text-caption">
                {after}
              </pre>
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Switch inside is the control
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm">{label}</span>
        <span className="block text-caption text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-1" />
    </label>
  )
}

// --- One fix for several services -------------------------------------------

function QuickFix({
  p,
  fix,
  serverId,
  open,
  onOpenChange,
  onApply,
}: {
  p: DockerProjectDetails
  fix: Quick
  serverId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: () => void
}) {
  const { write, save, refused } = useWriteCompose(p, serverId, onApply)
  const services = composeServices(p.compose) ?? {}
  const next = () => {
    let text = p.compose
    for (const name of fix.services) {
      const was = formOf(obj(services[name]))
      const f: Form =
        fix.key === "restart"
          ? { ...was, restart: "unless-stopped" }
          : { ...was, rotate: true, maxSize: "10m", maxFile: "3" }
      text = applyForm(text, name, was, f)
    }
    return text
  }
  const submit = (apply: boolean) =>
    write(next(), apply, () => onOpenChange(false))

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={fix.label}
      description={fix.body}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="max-md:h-11"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            disabled={save.isPending}
            onClick={() => submit(false)}
            className="max-md:h-11"
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => submit(true)}
            className="max-md:h-11"
          >
            <Rocket />
            Save and apply
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {refused && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 font-mono text-caption whitespace-pre-wrap text-destructive">
            {refused}
          </p>
        )}
        <p className="text-body-sm">
          {fix.services.length === 1
            ? "One service changes:"
            : `${fix.services.length} services change:`}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {fix.services.map((s) => (
            <li
              key={s}
              className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-caption"
            >
              {s}
            </li>
          ))}
        </ul>
      </div>
    </ResponsiveDialog>
  )
}
