"use client"

import { useJobList, useJobLog } from "@/components/jobs/api"
import type {
  DockerProjectContainer,
  DockerProjectDetails,
  Job,
} from "@/lib/services"
import type { ProjectAction } from "../api"
import { readCompose } from "./compose-edit"
import type { Tone } from "./meta"

// What the project page knows about the last compose job on a project: the
// job itself, and what its log says about each image and container. The
// backend marks its steps with "==> " lines, so the page can say how far a
// deploy got after the job's progress has been cleared.

export type DeployAction = ProjectAction | "git"
export type Step = "read" | "pull" | "compose" | "done"

export type DeployLog = {
  // The last step marker seen; null = a log without markers (older jobs,
  // git deploys).
  step: Step | null
  images: Map<string, "ready" | "pulling" | "pulled">
  // Compose's own lines: container name → its last word ("Started").
  containers: Map<string, string>
  // Service → compose's pull/build word ("Building").
  services: Map<string, string>
  lines: string[]
}

export type Deploy = {
  job: Job
  action: DeployAction
  active: boolean
  // Failed or cut short by a restart of Morche.
  failed: boolean
  log: DeployLog | null
  // Makes containers (up, redeploy, git): its rows say what each service is
  // waiting for.
  creates: boolean
}

const verbs: [string, DeployAction][] = [
  ["Pull images of ", "pull"],
  ["Take down ", "down"],
  ["Redeploy ", "redeploy"],
  ["Destroy ", "destroy"],
  ["Restart ", "restart"],
  ["Start ", "start"],
  ["Stop ", "stop"],
  ["Deploy ", "up"],
]

function actionOf(job: Job): DeployAction {
  if (job.kind === "docker-git-deploy") return "git"
  return verbs.find(([v]) => job.title.startsWith(v))?.[1] ?? "up"
}

export function useProjectDeploy(
  serverId: string,
  p: DockerProjectDetails | undefined,
): Deploy | null {
  const list = useJobList().data
  // The list is newest first.
  const job = p
    ? list?.find(
        (j) =>
          (j.kind === "docker-compose" || j.kind === "docker-git-deploy") &&
          j.target?.server_id === serverId &&
          j.target.path === p.dir &&
          j.title.includes(` ${p.name} `),
      )
    : undefined
  const logQuery = useJobLog(job?.id ?? "", job?.state)
  if (!job || !p) return null
  const action = actionOf(job)
  const text = logQuery.data?.id === job.id ? logQuery.data.log : undefined
  return {
    job,
    action,
    active: job.state === "queued" || job.state === "running",
    failed: job.state === "failed" || job.state === "interrupted",
    log:
      text === undefined
        ? null
        : parseDeployLog(text, new Set(declaredServices(p).map((s) => s.name))),
    creates: action === "up" || action === "redeploy" || action === "git",
  }
}

const containerLine = /^\s*Container\s+(\S+)\s+(\S.*?)\s*$/
const serviceLine =
  /^\s*(\S+)\s+(Pulling|Pulled|Building|Built|Skipped|Error|Interrupted|Waiting)\b/

export function parseDeployLog(log: string, services: Set<string>) {
  const lines = log.split("\n")
  if (lines.at(-1) === "") lines.pop()
  const out: DeployLog = {
    step: null,
    images: new Map(),
    containers: new Map(),
    services: new Map(),
    lines,
  }
  for (const line of lines) {
    if (line.startsWith("==> ")) {
      const rest = line.slice(4)
      if (rest.startsWith("Reading")) out.step = "read"
      else if (rest.startsWith("Pulling images")) out.step = "pull"
      else if (rest.startsWith("docker compose")) out.step = "compose"
      else if (rest === "Done") out.step = "done"
      continue
    }
    let m = /^Using (\S+) \(already/.exec(line)
    if (m) {
      out.images.set(imageKey(m[1]), "ready")
      continue
    }
    m = /^Pulling (\S+)$/.exec(line)
    if (m) {
      out.images.set(imageKey(m[1]), "pulling")
      continue
    }
    m = /^Pulled (\S+)/.exec(line)
    if (m) {
      out.images.set(imageKey(m[1]), "pulled")
      continue
    }
    m = containerLine.exec(line)
    if (m) {
      out.containers.set(m[1], m[2])
      continue
    }
    m = serviceLine.exec(line)
    if (m && services.has(m[1])) out.services.set(m[1], m[2])
  }
  return out
}

// "nginx" and "nginx:latest" are one image.
export function imageKey(ref: string) {
  if (ref.includes("@")) return ref
  const slash = ref.lastIndexOf("/")
  return ref.slice(slash + 1).includes(":") ? ref : `${ref}:latest`
}

export function isErrorLine(line: string) {
  return (
    !line.startsWith("==> ") &&
    /\b(error|errors|failed|denied|cannot|can't|unable|invalid|no such|not found|refused)\b/i.test(
      line,
    )
  )
}

// Which step the job is on, from the log or, when the log lags, the phase.
export function stepOf(d: Deploy): Step | null {
  const fromPhase: Record<string, Step> = {
    "Reading the compose file": "read",
    "Pulling images": "pull",
    Deploying: "compose",
    Redeploying: "compose",
    Done: "done",
  }
  const a = d.log?.step ?? null
  const b = d.active ? (fromPhase[d.job.progress.phase ?? ""] ?? null) : null
  const order: Step[] = ["read", "pull", "compose", "done"]
  if (!a) return b
  if (!b) return a
  return order.indexOf(a) >= order.indexOf(b) ? a : b
}

// --- Services and their containers -------------------------------------

export type Declared = {
  name: string
  image?: string
  build: boolean
  profiles: string[]
  replicas?: number
  containerName?: string
}

// The services the compose file declares, read from the file when Morche
// can, plus the ones the backend found (other files, labels).
export function declaredServices(p: DockerProjectDetails): Declared[] {
  const model =
    p.readable && !p.missing && p.compose ? readCompose(p.compose) : null
  const out: Declared[] = (model?.ok ? model.services : []).map((s) => ({
    name: s.name,
    image: s.image,
    build: s.build,
    profiles: s.profiles,
    replicas: s.replicas,
    containerName: s.containerName,
  }))
  for (const name of p.services)
    if (!out.some((s) => s.name === name))
      out.push({ name, build: false, profiles: [] })
  return out
}

export type RowState = {
  label: string
  tone: Tone
  detail?: string
  // detail is a line from the tool's output (shown monospace)
  error?: boolean
  busy?: boolean
}

export type ServiceRow =
  | {
      kind: "container"
      key: string
      service: string
      c: DockerProjectContainer
      // What the running job is doing to it ("Recreating").
      activity?: RowState
    }
  | {
      kind: "pending"
      key: string
      service: string
      image?: string
      state: RowState
    }

// Every container of the project, and a row for each service that has none
// yet, saying why: its image is downloading, the deploy failed, it's left
// out by a profile…
export function serviceRows(
  p: DockerProjectDetails,
  containers: DockerProjectContainer[],
  d: Deploy | null,
): ServiceRow[] {
  const declared = declaredServices(p)
  const rows: ServiceRow[] = containers.map((c) => ({
    kind: "container",
    key: c.id,
    service: c.service,
    c,
    activity:
      d?.active && d.log ? activityOf(d.log.containers.get(c.name)) : undefined,
  }))
  for (const s of declared) {
    if (containers.some((c) => c.service === s.name)) continue
    rows.push({
      kind: "pending",
      key: `service:${s.name}`,
      service: s.name,
      image: s.image,
      state: pendingState(s, d, p),
    })
  }
  return rows.sort(
    (a, b) =>
      a.service.localeCompare(b.service) ||
      (a.kind === "container" && b.kind === "container"
        ? a.c.name.localeCompare(b.c.name)
        : 0),
  )
}

const words: Record<string, RowState> = {
  Creating: { label: "Creating", tone: "brand", busy: true },
  Created: { label: "Created", tone: "muted", busy: true },
  Recreate: { label: "Recreating", tone: "brand", busy: true },
  Recreated: { label: "Recreated", tone: "muted", busy: true },
  Starting: { label: "Starting", tone: "brand", busy: true },
  Started: { label: "Started", tone: "success" },
  Running: { label: "Running", tone: "success" },
  Waiting: {
    label: "Waiting for what it depends on",
    tone: "muted",
    busy: true,
  },
  Healthy: { label: "Healthy", tone: "success" },
  Stopping: { label: "Stopping", tone: "brand", busy: true },
  Stopped: { label: "Stopped", tone: "muted" },
  Removing: { label: "Removing", tone: "brand", busy: true },
  Removed: { label: "Removed", tone: "muted" },
  Pulling: { label: "Pulling its image", tone: "brand", busy: true },
  Pulled: { label: "Image ready", tone: "muted", busy: true },
  Building: { label: "Building its image", tone: "brand", busy: true },
  Built: { label: "Image built", tone: "muted", busy: true },
  Skipped: { label: "Skipped", tone: "muted" },
  Error: { label: "Error", tone: "destructive" },
  Interrupted: { label: "Interrupted", tone: "destructive" },
}

function wordState(word: string | undefined) {
  if (!word) return undefined
  return words[word.split(/\s/)[0]]
}

// Only what's in motion shows next to a container's own state.
function activityOf(word: string | undefined) {
  const st = wordState(word)
  return st?.busy || st?.tone === "destructive" ? st : undefined
}

function namesOf(s: Declared, project: string) {
  return [
    s.containerName,
    `${project}-${s.name}-`,
    `${project}_${s.name}_`,
  ].filter((n): n is string => !!n)
}

function wordFor(s: Declared, log: DeployLog | null, project: string) {
  if (!log) return undefined
  const names = namesOf(s, project)
  let word: string | undefined
  for (const [name, w] of log.containers)
    if (names.some((n) => name === n || name.startsWith(n))) word = w
  return word ?? log.services.get(s.name)
}

// The last error line that names this service's container or image.
export function errorFor(
  s: Pick<Declared, "name" | "image" | "containerName">,
  log: DeployLog | null,
  project: string,
) {
  if (!log) return undefined
  const names = namesOf({ ...s, build: false, profiles: [] }, project)
  if (s.image) names.push(s.image)
  for (let i = log.lines.length - 1; i >= 0; i--) {
    const line = log.lines[i]
    if (isErrorLine(line) && names.some((n) => line.includes(n)))
      return line.trim()
  }
  return undefined
}

function pendingState(
  s: Declared,
  d: Deploy | null,
  p: DockerProjectDetails,
): RowState {
  if (s.profiles.length > 0)
    return {
      label: "Off",
      tone: "muted",
      detail: `Only made when the ${s.profiles.join(" or ")} profile is on`,
    }
  if (s.replicas === 0) return { label: "Scaled to 0", tone: "muted" }
  if (d?.active && d.creates) {
    if (d.job.state === "queued")
      return {
        label: "Waiting",
        tone: "muted",
        detail: "The deploy waits for a free slot",
        busy: true,
      }
    const st = wordState(wordFor(s, d.log, p.name))
    if (st) return st
    const step = stepOf(d)
    if (step === "pull" && s.image) {
      const [now, ...rest] = (d.job.progress.current ?? "").split(" · ")
      if (now && imageKey(now) === imageKey(s.image))
        return {
          label: "Downloading its image",
          tone: "brand",
          detail: rest.length ? `${s.image} · ${rest.join(" · ")}` : s.image,
          busy: true,
        }
      const img = d.log?.images.get(imageKey(s.image))
      if (img === "ready" || img === "pulled")
        return {
          label: "Image ready",
          tone: "muted",
          detail: "Made once every image is here",
          busy: true,
        }
      return {
        label: "Waiting for its image",
        tone: "muted",
        detail: s.image,
        busy: true,
      }
    }
    if (step === "pull" && s.build)
      return {
        label: "Waiting",
        tone: "muted",
        detail: "Its image is built when the containers are made",
        busy: true,
      }
    if (step === "compose" || step === "done")
      return { label: "Waiting to be made", tone: "muted", busy: true }
    return { label: "Waiting", tone: "muted", busy: true }
  }
  if (d?.failed && d.creates) {
    const line = errorFor(s, d.log, p.name)
    return {
      label: "Not created",
      tone: "destructive",
      detail: line ?? "The deploy stopped before making it: see why above",
      error: !!line,
    }
  }
  if (p.state === "not-deployed")
    return {
      label: "Not deployed yet",
      tone: "muted",
      detail: "Deploy makes its container",
    }
  return {
    label: "No container",
    tone: "warning",
    detail: "Redeploy makes it again",
  }
}
