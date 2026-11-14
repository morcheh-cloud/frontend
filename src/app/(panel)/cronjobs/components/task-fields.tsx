"use client"

import { useQuery } from "@tanstack/react-query"
import { Info, Plus, TriangleAlert } from "lucide-react"
import Link from "next/link"

import { usePlaybooks, usePreview } from "@/app/(panel)/ansible/api"
import {
  emptyPick,
  HostPreview,
  type Picked,
  pickedCount,
  TargetPicker,
  toSelection,
} from "@/app/(panel)/ansible/components/run-layer"
import { useCatalog, useInstalls } from "@/app/(panel)/applications/api"
import { RecipeIcon } from "@/app/(panel)/applications/components/meta"
import { useDockerFleet } from "@/app/(panel)/containers/api"
import { backupKeys } from "@/app/(panel)/databases/api"
import { useDatabaseCan } from "@/app/(panel)/databases/components/permissions"
import { useScripts } from "@/app/(panel)/scripts/api"
import { CodeEditor } from "@/app/(panel)/scripts/components/code-editor"
import {
  type Interpreter,
  interpreterLabels,
  type RunAs,
  runAsHints,
} from "@/app/(panel)/scripts/components/meta"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { ServerChecklist } from "@/app/(panel)/servers/components/server-checklist"
import { useAccess } from "@/components/auth/auth"
import { atLeast, type Level } from "@/components/auth/level"
import { Field } from "@/components/field"
import { databasesQuery, storagesQuery } from "@/components/panel/problems"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import type {
  AnsibleOptions,
  Schedule,
  ScheduleService,
  ScheduleTask,
  Server,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { Callout, FieldError, Section, ToggleRow } from "./editor-parts"
import {
  type Action,
  ActionIcon,
  actionGroups,
  actionMeta,
  refName,
  serviceVerbs,
} from "./meta"
import { PveSections } from "./pve-sections"

type ServiceAction = ScheduleService["action"]

// Everything the non-copy actions need. Only the job's own action is sent,
// so switching back and forth keeps what was typed.
export type TaskDraft = {
  // Script, service and reboot run on these (id → name).
  servers: Map<string, string>
  scriptKind: "saved" | "command"
  scriptId: string
  // A saved script's parameters.
  values: Record<string, string>
  cmdName: string
  content: string
  interpreter: Interpreter
  runAs: RunAs
  // Minutes; blank = the default 10.
  timeout: string
  // KEY=value lines, for a typed command.
  env: string
  playbookId: string
  picked: Picked
  // Kept as saved, so an edit made here never drops options set elsewhere.
  ansibleOptions: AnsibleOptions
  unit: string
  serviceAction: ServiceAction
  force: boolean
  onlyIfRequired: boolean
  skipIfLoggedIn: boolean
  message: string
  url: string
  fileName: string
  overwrite: boolean
  databaseId: string
  planId: string
  // software-update: every application with an update, or only these ids.
  softAll: boolean
  softRecipes: string[]
  softSystem: boolean
  softSecurity: boolean
  softParallel: string
  softKeepGoing: boolean
  // package-upgrade (servers, skipIfLoggedIn and message are shared).
  pkgMode: PackageMode
  pkgAutoremove: boolean
  pkgClean: boolean
  pkgReboot: PackageReboot
  pkgParallel: string
  pkgKeepGoing: boolean
  // docker-update (servers shared): names or patterns, one per line.
  dockerOnly: string
  dockerCheck: boolean
  dockerRollback: boolean
  dockerWait: string
  dockerKeepGoing: boolean
  // docker-prune (servers shared).
  pruneContainers: boolean
  pruneImages: "none" | "dangling" | "all"
  pruneVolumes: "none" | "anonymous" | "all"
  pruneNetworks: boolean
  pruneBuildCache: boolean
  pruneOlder: string
  pruneKeepGoing: boolean
  // docker-volume-backup: one server, one storage.
  volServer: string
  volStorage: string
  volFolder: string
  volNames: string
  volKeep: string
  volStop: boolean
  volKeepGoing: boolean
  // pve-backup / pve-snapshot: one cluster, every machine (minus pveSkip)
  // or the ones in pveVmids.
  pveCluster: string
  pveAll: boolean
  pveVmids: number[]
  pveSkip: number[]
  pveStorage: string
  pveMode: "snapshot" | "suspend" | "stop"
  pveCompress: "zstd" | "lzo" | "gzip" | "0"
  pveNotes: string
  pveProtected: boolean
  pveKeep: string
  pvePrefix: string
  pveVmstate: boolean
  pveKeepGoing: boolean
}

export type PackageMode = "all" | "security" | "full"
export type PackageReboot = "never" | "if-required"

export const freshTask = (): TaskDraft => ({
  servers: new Map(),
  scriptKind: "saved",
  scriptId: "",
  values: {},
  cmdName: "",
  content: "",
  interpreter: "bash",
  runAs: "user",
  timeout: "",
  env: "",
  playbookId: "",
  picked: emptyPick(),
  ansibleOptions: {},
  unit: "",
  serviceAction: "restart",
  force: false,
  onlyIfRequired: true,
  skipIfLoggedIn: true,
  message: "",
  url: "",
  fileName: "",
  overwrite: true,
  databaseId: "",
  planId: "",
  softAll: true,
  softRecipes: [],
  softSystem: false,
  softSecurity: false,
  softParallel: "1",
  softKeepGoing: true,
  pkgMode: "all",
  pkgAutoremove: true,
  pkgClean: false,
  pkgReboot: "never",
  pkgParallel: "1",
  pkgKeepGoing: true,
  dockerOnly: "",
  dockerCheck: true,
  dockerRollback: true,
  dockerWait: "60",
  dockerKeepGoing: true,
  pruneContainers: true,
  pruneImages: "dangling",
  pruneVolumes: "none",
  pruneNetworks: true,
  pruneBuildCache: true,
  pruneOlder: "24",
  pruneKeepGoing: true,
  volServer: "",
  volStorage: "",
  volFolder: "",
  volNames: "",
  volKeep: "7",
  volStop: false,
  volKeepGoing: true,
  pveCluster: "",
  pveAll: true,
  pveVmids: [],
  pveSkip: [],
  pveStorage: "",
  pveMode: "snapshot",
  pveCompress: "zstd",
  pveNotes: "{{guestname}}",
  pveProtected: false,
  pveKeep: "24",
  pvePrefix: "auto",
  pveVmstate: false,
  pveKeepGoing: true,
})

export function taskFromSaved(s: Schedule): TaskDraft {
  const t = s.task ?? {}
  const d = freshTask()
  const named = (ids: string[] | undefined) =>
    new Map((ids ?? []).map((id) => [id, refName(s.refs, "server", id)]))
  const sc = t.script
  if (sc) {
    d.servers = named(sc.server_ids)
    if (sc.script_id) {
      d.scriptId = sc.script_id
      d.values = { ...(sc.env ?? {}) }
    } else {
      d.scriptKind = "command"
      d.cmdName = sc.name ?? ""
      d.content = sc.content ?? ""
      d.interpreter = sc.interpreter ?? "bash"
      d.runAs = sc.run_as ?? "user"
      d.timeout = sc.timeout_seconds
        ? String(Math.max(1, Math.round(sc.timeout_seconds / 60)))
        : ""
      d.env = Object.entries(sc.env ?? {})
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    }
  }
  const an = t.ansible
  if (an) {
    d.playbookId = an.playbook_id
    d.ansibleOptions = an.options ?? {}
    const sel = an.selection
    d.picked = {
      all: !!sel.all,
      servers: named(sel.server_ids),
      tags: sel.tags ?? [],
      folders: sel.folder_ids ?? [],
    }
  }
  const sv = t.service
  if (sv) {
    d.servers = named(sv.server_ids)
    d.unit = sv.unit
    d.serviceAction = sv.action
    d.force = !!sv.force
  }
  const rb = t.reboot
  if (rb) {
    d.servers = named(rb.server_ids)
    d.onlyIfRequired = !!rb.only_if_required
    d.skipIfLoggedIn = !!rb.skip_if_logged_in
    d.message = rb.message ?? ""
  }
  const sw = t.software
  if (sw) {
    d.servers = named(sw.server_ids)
    d.softAll = !sw.recipes?.length
    d.softRecipes = sw.recipes ?? []
    d.softSystem = !!sw.system
    d.softSecurity = !!sw.security_only
    d.softParallel = String(sw.parallel || 1)
    d.softKeepGoing = !!sw.keep_going
  }
  const pk = t.packages
  if (pk) {
    d.servers = named(pk.server_ids)
    d.pkgMode = pk.mode ?? "all"
    d.pkgAutoremove = !!pk.autoremove
    d.pkgClean = !!pk.clean
    d.pkgReboot = pk.reboot ?? "never"
    d.pkgParallel = String(pk.parallel || 1)
    d.pkgKeepGoing = !!pk.keep_going
    if (d.pkgReboot === "if-required") {
      d.skipIfLoggedIn = !!pk.skip_if_logged_in
      d.message = pk.message ?? ""
    }
  }
  const dk = t.docker
  if (dk) {
    d.servers = named(dk.server_ids)
    d.dockerOnly = (dk.only ?? []).join("\n")
    d.dockerCheck = !!dk.check
    d.dockerRollback = !!dk.rollback
    d.dockerWait = String(dk.wait_seconds || 60)
    d.dockerKeepGoing = !!dk.keep_going
  }
  const pr = t.prune
  if (pr) {
    d.servers = named(pr.server_ids)
    d.pruneContainers = !!pr.containers
    d.pruneImages = pr.images || "none"
    d.pruneVolumes = pr.volumes || "none"
    d.pruneNetworks = !!pr.networks
    d.pruneBuildCache = !!pr.build_cache
    d.pruneOlder = String(pr.older_than_hours ?? 0)
    d.pruneKeepGoing = !!pr.keep_going
  }
  const vb = t.volumes
  if (vb) {
    d.volServer = vb.server_id
    d.volStorage = vb.storage_id
    d.volFolder = vb.folder ?? ""
    d.volNames = (vb.volumes ?? []).join("\n")
    d.volKeep = String(vb.keep ?? 0)
    d.volStop = !!vb.stop
    d.volKeepGoing = !!vb.keep_going
  }
  const pv = t.pve
  if (pv) {
    d.pveCluster = pv.cluster_id
    d.pveAll = !!pv.all
    d.pveVmids = pv.vmids ?? []
    d.pveSkip = pv.skip ?? []
    d.pveStorage = pv.storage ?? ""
    d.pveMode = pv.mode || "snapshot"
    d.pveCompress = pv.compress || "zstd"
    d.pveNotes = pv.notes ?? ""
    d.pveProtected = !!pv.protected
    d.pveKeep = String(pv.keep ?? 0)
    d.pvePrefix = pv.prefix ?? ""
    d.pveVmstate = !!pv.vmstate
    d.pveKeepGoing = !!pv.keep_going
  }
  const f = t.fetch
  if (f) {
    d.url = f.url
    d.fileName = f.name ?? ""
    d.overwrite = !!f.overwrite
  }
  const v = t.verify
  if (v) {
    d.databaseId = v.database_id
    d.planId = v.plan_id ?? ""
  }
  return d
}

const envKey = /^[A-Za-z_][A-Za-z0-9_]*$/

// KEY=value lines → env, or the first bad line.
function parseEnv(text: string): Record<string, string> | string {
  const env: Record<string, string> = {}
  for (const raw of text.split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    const key = eq > 0 ? line.slice(0, eq).trim() : ""
    if (!envKey.test(key)) return line
    env[key] = line.slice(eq + 1)
  }
  return env
}

// One name or pattern per line (commas work too).
export const listOf = (text: string) => [
  ...new Set(
    text
      .split(/[\n,]/)
      .map((l) => l.trim())
      .filter(Boolean),
  ),
]

const firstLine = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#!"))
    ?.slice(0, 100) ?? ""

// What's sent as `task` for the action (nothing for the copy actions).
export function toTask(action: Action, t: TaskDraft): ScheduleTask | undefined {
  const ids = [...t.servers.keys()]
  switch (action) {
    case "script": {
      if (t.scriptKind === "saved") {
        const env = Object.fromEntries(
          Object.entries(t.values).filter(([, v]) => v !== ""),
        )
        return {
          script: { server_ids: ids, script_id: t.scriptId || undefined, env },
        }
      }
      const env = parseEnv(t.env)
      const minutes = Number(t.timeout)
      return {
        script: {
          server_ids: ids,
          name: t.cmdName.trim() || firstLine(t.content) || "Command",
          content: t.content,
          interpreter: t.interpreter,
          run_as: t.runAs,
          timeout_seconds:
            t.timeout.trim() && minutes > 0 ? Math.round(minutes * 60) : 0,
          env: typeof env === "string" ? {} : env,
        },
      }
    }
    case "ansible":
      return {
        ansible: {
          playbook_id: t.playbookId,
          selection: toSelection(t.picked),
          options: t.ansibleOptions,
        },
      }
    case "service":
      return {
        service: {
          server_ids: ids,
          unit: t.unit.trim(),
          action: t.serviceAction,
          force: t.serviceAction === "stop" && t.force,
        },
      }
    case "reboot":
      return {
        reboot: {
          server_ids: ids,
          only_if_required: t.onlyIfRequired,
          skip_if_logged_in: t.skipIfLoggedIn,
          message: t.message.trim(),
        },
      }
    case "software-update":
      return {
        software: {
          server_ids: ids,
          recipes: t.softAll ? [] : t.softRecipes,
          system: t.softSystem,
          security_only: t.softSystem && t.softSecurity,
          parallel: Number(t.softParallel) || 1,
          keep_going: t.softKeepGoing,
        },
      }
    case "package-upgrade": {
      const restart = t.pkgReboot === "if-required"
      return {
        packages: {
          server_ids: ids,
          mode: t.pkgMode,
          autoremove: t.pkgAutoremove,
          clean: t.pkgClean,
          reboot: t.pkgReboot,
          skip_if_logged_in: restart && t.skipIfLoggedIn,
          message: restart ? t.message.trim() : "",
          parallel: Number(t.pkgParallel) || 1,
          keep_going: t.pkgKeepGoing,
        },
      }
    }
    case "docker-update":
      return {
        docker: {
          server_ids: ids,
          only: listOf(t.dockerOnly),
          check: t.dockerCheck,
          rollback: t.dockerRollback,
          wait_seconds: t.dockerRollback ? Number(t.dockerWait) || 60 : 0,
          keep_going: t.dockerKeepGoing,
        },
      }
    case "docker-prune":
      return {
        prune: {
          server_ids: ids,
          containers: t.pruneContainers,
          images: t.pruneImages,
          volumes: t.pruneVolumes,
          networks: t.pruneNetworks,
          build_cache: t.pruneBuildCache,
          older_than_hours: Number(t.pruneOlder) || 0,
          keep_going: t.pruneKeepGoing,
        },
      }
    case "docker-volume-backup":
      return {
        volumes: {
          server_id: t.volServer,
          storage_id: t.volStorage,
          folder: t.volFolder.trim(),
          volumes: listOf(t.volNames),
          keep: Number(t.volKeep) || 0,
          stop: t.volStop,
          keep_going: t.volKeepGoing,
        },
      }
    case "pve-backup":
      return {
        pve: {
          cluster_id: t.pveCluster,
          all: t.pveAll,
          vmids: t.pveAll ? [] : t.pveVmids,
          skip: t.pveAll ? t.pveSkip : [],
          storage: t.pveStorage,
          mode: t.pveMode,
          compress: t.pveCompress,
          notes: t.pveNotes.trim(),
          protected: t.pveProtected,
          keep_going: t.pveKeepGoing,
        },
      }
    case "pve-snapshot":
      return {
        pve: {
          cluster_id: t.pveCluster,
          all: t.pveAll,
          vmids: t.pveAll ? [] : t.pveVmids,
          skip: t.pveAll ? t.pveSkip : [],
          prefix: t.pvePrefix.trim(),
          keep: Number(t.pveKeep) || 0,
          vmstate: t.pveVmstate,
          keep_going: t.pveKeepGoing,
        },
      }
    case "fetch":
      return {
        fetch: {
          url: t.url.trim(),
          name: t.fileName.trim(),
          overwrite: t.overwrite,
        },
      }
    case "verify-backup":
      return {
        verify: {
          database_id: t.databaseId,
          plan_id: t.planId || undefined,
        },
      }
  }
  return undefined
}

export type TaskKey =
  | "servers"
  | "script"
  | "values"
  | "content"
  | "timeout"
  | "env"
  | "playbook"
  | "targets"
  | "unit"
  | "force"
  | "message"
  | "url"
  | "fileName"
  | "database"
  | "plan"
  | "recipes"
  | "parallel"
  | "only"
  | "wait"
  | "storage"
  | "folder"
  | "volumes"
  | "keep"
  | "prune"
  | "older"
  | "cluster"
  | "machines"
  | "prefix"
  | "notes"

export type TaskErrors = Partial<Record<TaskKey, string>>

const unitRe = /^[A-Za-z0-9@._:\\-]+$/

export function checkTask(
  action: Action,
  t: TaskDraft,
  params: { name: string; label?: string; required?: boolean }[] = [],
): TaskErrors {
  const e: TaskErrors = {}
  const needServers = action === "script" || action === "service"
  if (
    (needServers ||
      action === "reboot" ||
      action === "software-update" ||
      action === "package-upgrade" ||
      action === "docker-update" ||
      action === "docker-prune") &&
    t.servers.size === 0
  ) {
    e.servers = "Choose at least one server"
  }
  switch (action) {
    case "script":
      if (t.scriptKind === "saved") {
        if (!t.scriptId) e.script = "Choose a script"
        const missing = params.find(
          (p) => p.required && !t.values[p.name]?.trim(),
        )
        if (missing) e.values = `Fill in ${missing.label || missing.name}`
      } else {
        if (!t.content.trim()) e.content = "Type what to run"
        const m = Number(t.timeout)
        if (t.timeout.trim() && (!Number.isFinite(m) || m <= 0 || m > 1440)) {
          e.timeout = "Minutes, from 1 to 1440"
        }
        const env = parseEnv(t.env)
        if (typeof env === "string") e.env = `Not KEY=value: ${env}`
      }
      break
    case "ansible":
      if (!t.playbookId) e.playbook = "Choose a playbook"
      if (pickedCount(t.picked) === 0) e.targets = "Choose where it runs"
      break
    case "service":
      if (!unitRe.test(t.unit.trim())) e.unit = "Enter a service name"
      break
    case "reboot":
      if (t.servers.size > 50) e.servers = "Up to 50 servers"
      break
    case "software-update": {
      if (t.servers.size > 200) e.servers = "Up to 200 servers"
      if (!t.softAll && t.softRecipes.length === 0 && !t.softSystem) {
        e.recipes = "Choose an application, or the system packages"
      }
      const n = Number(t.softParallel)
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        e.parallel = "From 1 to 20"
      }
      break
    }
    case "package-upgrade": {
      if (t.servers.size > 200) e.servers = "Up to 200 servers"
      const n = Number(t.pkgParallel)
      if (!Number.isInteger(n) || n < 1 || n > 10) {
        e.parallel = "From 1 to 10"
      }
      break
    }
    case "docker-update": {
      if (t.servers.size > 50) e.servers = "Up to 50 servers"
      const only = listOf(t.dockerOnly)
      if (only.length > 50) e.only = "Up to 50 names"
      else if (only.some((n) => n.length > 128))
        e.only = "Keep each name under 128 characters"
      const w = Number(t.dockerWait)
      if (t.dockerRollback && (!Number.isInteger(w) || w < 10 || w > 600))
        e.wait = "Seconds, from 10 to 600"
      break
    }
    case "docker-prune": {
      if (t.servers.size > 50) e.servers = "Up to 50 servers"
      if (
        !t.pruneContainers &&
        t.pruneImages === "none" &&
        t.pruneVolumes === "none" &&
        !t.pruneNetworks &&
        !t.pruneBuildCache
      )
        e.prune = "Pick something to remove"
      const h = Number(t.pruneOlder)
      if (!Number.isInteger(h) || h < 0 || h > 8760)
        e.older = "Hours, from 0 to 8760"
      break
    }
    case "docker-volume-backup": {
      if (!t.volServer) e.servers = "Choose a server"
      if (!t.volStorage) e.storage = "Choose a storage"
      const names = listOf(t.volNames)
      if (names.length > 100) e.volumes = "Up to 100 names"
      else if (names.some((n) => n.length > 255))
        e.volumes = "Keep each name under 255 characters"
      if (/\.\./.test(t.volFolder)) e.folder = "No .. in the folder"
      const k = Number(t.volKeep)
      if (!Number.isInteger(k) || k < 0 || k > 1000)
        e.keep = "A whole number from 0 to 1000"
      break
    }
    case "fetch":
      if (!/^https?:\/\/[^/\s]/i.test(t.url.trim())) {
        e.url = "Enter a full http:// or https:// address"
      }
      if (/[/\0]/.test(t.fileName) || [".", ".."].includes(t.fileName.trim())) {
        e.fileName = "Just a file name, without /"
      }
      break
    case "verify-backup":
      if (!t.databaseId) e.database = "Choose a database"
      break
    case "pve-backup":
    case "pve-snapshot": {
      if (!t.pveCluster) e.cluster = "Choose a cluster"
      if (!t.pveAll && t.pveVmids.length === 0)
        e.machines = "Choose at least one machine"
      else if (t.pveVmids.length > 500 || t.pveSkip.length > 500)
        e.machines = "Up to 500 machines"
      if (action === "pve-backup") {
        if (!t.pveStorage) e.storage = "Choose where the backups go"
        if (t.pveNotes.length > 200) e.notes = "Up to 200 characters"
      } else {
        if (!/^([A-Za-z][A-Za-z0-9_-]*)?$/.test(t.pvePrefix.trim()))
          e.prefix = "Letters, digits, - and _, starting with a letter"
        else if (t.pvePrefix.trim().length > 20)
          e.prefix = "Up to 20 characters"
        const k = Number(t.pveKeep)
        if (!Number.isInteger(k) || k < 0 || k > 100)
          e.keep = "A whole number from 0 to 100"
      }
      break
    }
  }
  return e
}

// A backend field error under task.* → the field that shows it.
export function taskErrorKey(action: Action, field: string): TaskKey | null {
  if (!field.startsWith("task")) return null
  const rest = field.replace(/^task\.[a-z]+\.?/, "")
  const pairs: [string, TaskKey][] = [
    ["server_ids", "servers"],
    ["selection", "targets"],
    ["playbook_id", "playbook"],
    ["script_id", "script"],
    ["content", "content"],
    ["timeout_seconds", "timeout"],
    ["env", action === "script" ? "values" : "env"],
    ["unit", "unit"],
    ["force", "force"],
    ["message", "message"],
    ["url", "url"],
    ["name", action === "fetch" ? "fileName" : "content"],
    ["database_id", "database"],
    ["plan_id", "plan"],
    ["recipes", "recipes"],
    ["parallel", "parallel"],
    ["only", "only"],
    ["wait_seconds", "wait"],
    ["server_id", "servers"],
    ["storage_id", "storage"],
    ["path", "folder"],
    ["folder", "folder"],
    ["volumes", action === "docker-prune" ? "prune" : "volumes"],
    ["keep_going", "servers"],
    ["keep", "keep"],
    ["containers", "prune"],
    ["images", "prune"],
    ["networks", "prune"],
    ["build_cache", "prune"],
    ["older_than_hours", "older"],
    ["cluster_id", "cluster"],
    ["vmids", "machines"],
    ["skip", "machines"],
    ["all", "machines"],
    ["prefix", "prefix"],
    ["notes", "notes"],
    ["mode", "storage"],
    ["compress", "storage"],
    ["vmstate", "machines"],
  ]
  for (const [prefix, key] of pairs) if (rest.startsWith(prefix)) return key
  const whole: Partial<Record<Action, TaskKey>> = {
    script: "script",
    ansible: "targets",
    service: "unit",
    reboot: "servers",
    fetch: "url",
    "verify-backup": "database",
    "software-update": "servers",
    "package-upgrade": "servers",
    "docker-update": "servers",
    "docker-prune": "servers",
    "docker-volume-backup": "storage",
    "pve-backup": "cluster",
    "pve-snapshot": "cluster",
  }
  return whole[action] ?? null
}

// Who the job runs as, in the access it needs for this action.
export const accessText: Record<Action, string> = {
  sync: "Operator on the source, Engineer on every destination",
  archive: "Engineer on the folder's server and on every destination",
  fetch: "Engineer on every server it saves to",
  script: "Engineer on every server",
  ansible: "Owner on every server it runs on",
  service: "Operator on every server (Engineer to stop a protected one)",
  reboot: "Operator on every server",
  "verify-backup": "Operator on the database",
  "software-update": "Engineer on every server",
  "package-upgrade": "Engineer on every server",
  "docker-update": "Engineer on every server",
  "docker-prune": "Engineer on every server",
  "docker-volume-backup": "Engineer on the server and on the storage",
  "pve-backup": "Engineer on the cluster's workspace",
  "pve-snapshot": "Engineer on the cluster's workspace",
}

// ---- What it does ----

export function ActionPicker({
  value,
  onChange,
  phone,
}: {
  value: Action
  onChange: (a: Action) => void
  phone: boolean
}) {
  return (
    <fieldset className={cn("flex flex-col", phone ? "gap-4" : "gap-5")}>
      <legend className="sr-only">What it does</legend>
      {actionGroups.map((g) => (
        <div key={g.label} className="flex flex-col gap-2">
          <p className="font-label text-caption tracking-label text-ash uppercase">
            {g.label}
          </p>
          <div
            className={cn(
              phone
                ? "flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border"
                : "grid grid-cols-1 gap-2 sm:grid-cols-2",
            )}
          >
            {g.actions.map((a) => (
              <ActionOption
                key={a}
                action={a}
                checked={value === a}
                onChange={onChange}
                phone={phone}
              />
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  )
}

function ActionOption({
  action,
  checked,
  onChange,
  phone,
}: {
  action: Action
  checked: boolean
  onChange: (a: Action) => void
  phone: boolean
}) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center gap-3 px-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        phone
          ? "min-h-16 py-3 has-checked:bg-brand-soft"
          : "min-h-15 rounded-lg border border-border py-2.5 hover:bg-subtle has-checked:border-brand has-checked:bg-brand-soft",
      )}
    >
      <input
        type="radio"
        name="cronjob-action"
        value={action}
        checked={checked}
        onChange={() => onChange(action)}
        className="sr-only"
      />
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-has-checked:bg-background group-has-checked:text-brand-strong">
        <ActionIcon action={action} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium">
          {actionMeta[action].label}
        </span>
        <span className="block truncate text-caption text-muted-foreground">
          {actionMeta[action].short}
        </span>
      </span>
      <span
        aria-hidden
        className="size-4 shrink-0 rounded-full border border-input bg-background transition-[border-width,border-color] group-has-checked:border-[5px] group-has-checked:border-brand"
      />
    </label>
  )
}

export type TaskSectionProps = Props

type Props = {
  action: Action
  t: TaskDraft
  set: (patch: Partial<TaskDraft>) => void
  errors: TaskErrors
  phone: boolean
  ws: string
}

// The action's own sections of the editor (copy and archive have theirs in
// the editor itself).
export function TaskSections(props: Props) {
  switch (props.action) {
    case "script":
      return <ScriptSections {...props} />
    case "ansible":
      return <AnsibleSections {...props} />
    case "service":
      return <ServiceSections {...props} />
    case "reboot":
      return <RebootSections {...props} />
    case "fetch":
      return <FetchSection {...props} />
    case "verify-backup":
      return <VerifySection {...props} />
    case "software-update":
      return <SoftwareSections {...props} />
    case "package-upgrade":
      return <PackageSections {...props} />
    case "docker-update":
      return <DockerUpdateSections {...props} />
    case "docker-prune":
      return <DockerPruneSections {...props} />
    case "docker-volume-backup":
      return <VolumeBackupSections {...props} />
    case "pve-backup":
    case "pve-snapshot":
      return <PveSections {...props} />
  }
  return null
}

function useCanPick(min: Level) {
  const { serverLevel } = useAccess()
  return (s: Pick<Server, "id" | "workspace_id">) =>
    atLeast(serverLevel(s.id, s.workspace_id), min)
}

function ServersSection({
  t,
  set,
  errors,
  phone,
  min,
  hint,
}: Props & { min: Level; hint: string }) {
  const canPick = useCanPick(min)
  return (
    <Section title="Servers" hint={hint} phone={phone}>
      <ServerChecklist
        value={t.servers}
        onChange={(servers) => set({ servers })}
        phone={phone}
        canPick={canPick}
      />
      <FieldError text={errors.servers} />
    </Section>
  )
}

export function Choice({
  id,
  value,
  onChange,
  placeholder,
  items,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  items: { value: string; label: string; detail?: string }[]
}) {
  return (
    <Select
      items={[{ value: "", label: placeholder }, ...items]}
      value={value}
      onValueChange={(v) => v !== null && onChange(v)}
    >
      <SelectTrigger id={id} className="h-11 w-full md:h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="truncate">{o.label}</span>
            {o.detail && (
              <span className="ms-auto truncate text-caption text-ash">
                {o.detail}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function NoneYet({
  text,
  href,
  label,
}: {
  text: string
  href: string
  label: string
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg bg-subtle p-3 text-body-sm text-muted-foreground">
      {text}
      <Button
        variant="outline"
        size="sm"
        className="max-md:h-11"
        render={<Link href={href} />}
        nativeButton={false}
      >
        <Plus />
        {label}
      </Button>
    </div>
  )
}

// ---- Script ----

function ScriptSections(props: Props) {
  const { t, set, errors, phone, ws } = props
  const scripts = useScripts(ws)
  const chosen = scripts.data?.find((s) => s.id === t.scriptId)
  const params = chosen?.params ?? []

  return (
    <>
      <Section
        title="Script"
        hint="A saved script is read again at each run, so edits to it count. Or type a command just for this job."
        phone={phone}
      >
        <div className="[scrollbar-width:none] overflow-x-auto">
          <Segmented
            label="Script"
            value={t.scriptKind}
            onChange={(scriptKind) => set({ scriptKind })}
            items={[
              { value: "saved", label: "Saved script" },
              { value: "command", label: "Type a command" },
            ]}
          />
        </div>
        {t.scriptKind === "saved" ? (
          scripts.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : scripts.data?.length === 0 ? (
            <NoneYet
              text="This workspace has no saved scripts yet."
              href="/scripts/new"
              label="New script"
            />
          ) : (
            <>
              <Field label="Script" error={errors.script}>
                {(p) => (
                  <Choice
                    id={p.id}
                    value={t.scriptId}
                    onChange={(scriptId) => {
                      const s = scripts.data?.find((x) => x.id === scriptId)
                      const values: Record<string, string> = {}
                      for (const prm of s?.params ?? []) {
                        values[prm.name] =
                          t.values[prm.name] ?? prm.default ?? ""
                      }
                      set({ scriptId, values })
                    }}
                    placeholder="Choose a script"
                    items={(scripts.data ?? []).map((s) => ({
                      value: s.id,
                      label: s.name,
                      detail: `${interpreterLabels[s.interpreter]} · ${s.run_as === "root" ? "root" : "login user"}`,
                    }))}
                  />
                )}
              </Field>
              {params.map((prm) => (
                <Field
                  key={prm.name}
                  label={`${prm.label || prm.name}${prm.required ? "" : " (optional)"}`}
                  hint={
                    <span className="font-mono">
                      ${prm.name}
                      {prm.default ? ` · default ${prm.default}` : ""}
                    </span>
                  }
                >
                  {(p) => (
                    <Input
                      {...p}
                      value={t.values[prm.name] ?? ""}
                      onChange={(e) =>
                        set({
                          values: { ...t.values, [prm.name]: e.target.value },
                        })
                      }
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  )}
                </Field>
              ))}
              <FieldError text={errors.values} />
            </>
          )
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Interpreter"
                value={t.interpreter}
                onChange={(interpreter) => set({ interpreter })}
                items={(["bash", "sh", "python3"] as const).map((v) => ({
                  value: v,
                  label: interpreterLabels[v],
                }))}
              />
              <Segmented
                label="Run as"
                value={t.runAs}
                onChange={(runAs) => set({ runAs })}
                items={[
                  { value: "user", label: "Login user" },
                  { value: "root", label: "root" },
                ]}
              />
            </div>
            <div
              className={cn(
                "h-48 overflow-hidden rounded-lg border border-input",
                errors.content && "border-destructive",
              )}
            >
              <CodeEditor
                value={t.content}
                onChange={(content) => set({ content })}
                interpreter={t.interpreter}
              />
            </div>
            <p
              className={cn(
                "text-caption",
                errors.content ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {errors.content ?? runAsHints[t.runAs]}
            </p>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
              <Field label="Name (optional)" hint="How its runs are listed.">
                {(p) => (
                  <Input
                    {...p}
                    value={t.cmdName}
                    onChange={(e) => set({ cmdName: e.target.value })}
                    maxLength={100}
                    placeholder={firstLine(t.content) || "Command"}
                    className="placeholder:text-ash"
                  />
                )}
              </Field>
              <Field
                label="Time limit"
                hint="Minutes. Blank = 10."
                error={errors.timeout}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1440}
                    value={t.timeout}
                    onChange={(e) => set({ timeout: e.target.value })}
                    placeholder="10"
                    className="tabular-nums placeholder:text-ash"
                  />
                )}
              </Field>
            </div>
            <Field
              label="Variables (optional)"
              hint="One KEY=value per line, set in the command's environment."
              error={errors.env}
            >
              {(p) => (
                <Textarea
                  {...p}
                  value={t.env}
                  onChange={(e) => set({ env: e.target.value })}
                  rows={2}
                  placeholder="SITE=example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="font-mono placeholder:text-ash"
                />
              )}
            </Field>
          </>
        )}
      </Section>
      <ServersSection
        {...props}
        min="engineer"
        hint="It runs on these, 5 at a time, up to 200. Each needs your Engineer access."
      />
    </>
  )
}

// ---- Ansible ----

function AnsibleSections({ t, set, errors, phone, ws }: Props) {
  const playbooks = usePlaybooks(ws)
  const selection = toSelection(t.picked)
  const any = pickedCount(t.picked) > 0
  const preview = usePreview(ws, selection, any)
  const hosts = preview.data ?? []

  return (
    <>
      <Section
        title="Playbook"
        hint="Read again at each run, so edits to it count."
        phone={phone}
      >
        {playbooks.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : playbooks.data?.length === 0 ? (
          <NoneYet
            text="This workspace has no playbooks yet."
            href="/ansible/playbooks/new"
            label="New playbook"
          />
        ) : (
          <Field label="Playbook" error={errors.playbook}>
            {(p) => (
              <Choice
                id={p.id}
                value={t.playbookId}
                onChange={(playbookId) => set({ playbookId })}
                placeholder="Choose a playbook"
                items={(playbooks.data ?? []).map((pb) => ({
                  value: pb.id,
                  label: pb.name,
                }))}
              />
            )}
          </Field>
        )}
        <ToggleRow
          id="cronjob-ansible-check"
          label="Check mode"
          hint="Reports what it would change and changes nothing. Good for spotting drift."
          checked={!!t.ansibleOptions.check}
          onChange={(check) =>
            set({ ansibleOptions: { ...t.ansibleOptions, check } })
          }
        />
      </Section>
      <Section
        title="Servers"
        hint="Tags and folders are read at each run: a server tagged later is included. Every server needs your Owner access."
        phone={phone}
      >
        <TargetPicker
          picked={t.picked}
          onChange={(picked) => set({ picked })}
          phone={phone}
        />
        <FieldError text={errors.targets} />
        <HostPreview
          any={any}
          hosts={hosts}
          loading={preview.isPending && any}
          error={preview.error?.message}
          onLeaveOut={() =>
            set({
              picked: {
                ...emptyPick(),
                servers: new Map(
                  hosts
                    .filter((h) => !h.problem)
                    .map((h) => [h.server_id, h.name]),
                ),
              },
            })
          }
        />
      </Section>
    </>
  )
}

// ---- Service ----

const serviceHints: Record<ServiceAction, string> = {
  start: "Starts it where it's stopped; already running is fine.",
  stop: "Stops it until something starts it again.",
  restart: "Stops and starts it: a short gap in service.",
  reload:
    "Asks it to re-read its settings, without stopping. Not every service can.",
}

function ServiceSections(props: Props) {
  const { t, set, errors, phone } = props
  return (
    <>
      <Section
        title="Service"
        hint="A systemd unit, as on the server's Services tab."
        phone={phone}
      >
        <Field
          label="Service"
          hint="nginx, php8.3-fpm, docker… (.service is added when left out)."
          error={errors.unit}
        >
          {(p) => (
            <Input
              {...p}
              value={t.unit}
              onChange={(e) => set({ unit: e.target.value })}
              placeholder="nginx"
              maxLength={256}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono placeholder:text-ash"
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <div className="[scrollbar-width:none] overflow-x-auto">
            <Segmented
              label="Action"
              value={t.serviceAction}
              onChange={(serviceAction) => set({ serviceAction })}
              items={(["restart", "reload", "start", "stop"] as const).map(
                (v) => ({ value: v, label: serviceVerbs[v] }),
              )}
            />
          </div>
          <p className="text-caption text-muted-foreground">
            {serviceHints[t.serviceAction]}
          </p>
        </div>
        {t.serviceAction === "stop" && (
          <>
            <ToggleRow
              id="cronjob-service-force"
              label="Even if it's protected"
              hint="sshd, dbus, journald… keep the server reachable. Needs Engineer."
              checked={t.force}
              onChange={(force) => set({ force })}
            />
            <FieldError text={errors.force} />
          </>
        )}
      </Section>
      <ServersSection
        {...props}
        min={t.serviceAction === "stop" && t.force ? "engineer" : "operator"}
        hint="A server without this service is marked failed, the others go on."
      />
    </>
  )
}

// ---- Reboot ----

function RebootSections(props: Props) {
  const { t, set, errors, phone } = props
  return (
    <>
      <ServersSection
        {...props}
        min="operator"
        hint="Rebooted one at a time: the next waits until the last is back. Up to 50."
      />
      <Section title="Only when it's safe" phone={phone}>
        <ToggleRow
          id="cronjob-reboot-required"
          label="Only when a reboot is needed"
          hint="After a kernel or library update. The others are skipped."
          checked={t.onlyIfRequired}
          onChange={(onlyIfRequired) => set({ onlyIfRequired })}
        />
        <ToggleRow
          id="cronjob-reboot-logged-in"
          label="Not while someone is logged in"
          hint="A server with an open SSH session is skipped, and tried again next time."
          checked={t.skipIfLoggedIn}
          onChange={(skipIfLoggedIn) => set({ skipIfLoggedIn })}
        />
        <Field
          label="Message (optional)"
          hint="Shown to anyone logged in, just before."
          error={errors.message}
        >
          {(p) => (
            <Input
              {...p}
              value={t.message}
              onChange={(e) => set({ message: e.target.value })}
              maxLength={200}
              placeholder="Scheduled reboot by Morche"
              className="placeholder:text-ash"
            />
          )}
        </Field>
        <Callout icon={<TriangleAlert />} tone="warning">
          A server that doesn't come back within 15 minutes fails the run, and
          the servers after it aren't rebooted.
        </Callout>
      </Section>
    </>
  )
}

// ---- Software update ----

function SoftwareSections(props: Props) {
  const { t, set, errors, phone, ws } = props
  const catalog = useCatalog(ws)
  const installs = useInstalls(ws)
  // Only what's installed somewhere can be updated; a chosen one that isn't
  // any more stays listed so it can be taken out.
  const installed = new Set(
    (installs.data?.items ?? []).map((i) => i.recipe_id),
  )
  const recipes = (catalog.data?.items ?? []).filter(
    (r) => installed.has(r.id) || t.softRecipes.includes(r.id),
  )
  const toggle = (id: string) =>
    set({
      softRecipes: t.softRecipes.includes(id)
        ? t.softRecipes.filter((x) => x !== id)
        : [...t.softRecipes, id],
    })
  return (
    <>
      <ServersSection
        {...props}
        min="engineer"
        hint="Only what's installed on each server is updated. Up to 200."
      />
      <Section
        title="Applications"
        hint="As the Updates tab of Applications, read again at each run."
        phone={phone}
      >
        <div className="[scrollbar-width:none] overflow-x-auto">
          <Segmented
            label="Which applications"
            value={t.softAll ? "all" : "some"}
            onChange={(v) => set({ softAll: v === "all" })}
            items={[
              { value: "all", label: "Every one with an update" },
              { value: "some", label: "Only these" },
            ]}
          />
        </div>
        {!t.softAll &&
          (installs.isPending || catalog.isPending ? (
            <Skeleton className="h-11 rounded-lg" />
          ) : recipes.length === 0 ? (
            <NoneYet
              text="Nothing from the catalog is installed in this workspace yet."
              href="/applications"
              label="Open Applications"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {recipes.map((r) => {
                const on = t.softRecipes.includes(r.id)
                return (
                  <Button
                    key={r.id}
                    type="button"
                    variant={on ? "secondary" : "outline"}
                    aria-pressed={on}
                    className={cn(
                      "h-11 rounded-full md:h-8",
                      on && "border border-brand/40 text-brand-strong",
                    )}
                    onClick={() => toggle(r.id)}
                  >
                    <RecipeIcon recipe={r} size="xs" />
                    {r.name}
                  </Button>
                )
              })}
            </div>
          ))}
        <FieldError text={errors.recipes} />
        <ToggleRow
          id="cronjob-software-system"
          label="Also upgrade the system packages"
          hint="Everything the package manager has an update for."
          checked={t.softSystem}
          onChange={(softSystem) => set({ softSystem })}
        />
        {t.softSystem && (
          <ToggleRow
            id="cronjob-software-security"
            label="Only security updates"
            hint="apt servers; the others get every update."
            checked={t.softSecurity}
            onChange={(softSecurity) => set({ softSecurity })}
          />
        )}
      </Section>
      <Section title="How it goes" phone={phone}>
        <Field
          label="Servers at a time"
          hint="1 = one after the other, the safest."
          error={errors.parallel}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={t.softParallel}
              onChange={(e) => set({ softParallel: e.target.value })}
              className="w-28"
            />
          )}
        </Field>
        <ToggleRow
          id="cronjob-software-keep-going"
          label="Carry on after a server fails"
          hint="Off = the run stops at the first failure."
          checked={t.softKeepGoing}
          onChange={(softKeepGoing) => set({ softKeepGoing })}
        />
      </Section>
    </>
  )
}

// ---- Package upgrade ----

const modeHints: Record<PackageMode, string> = {
  all: "Every update the package manager has, like Upgrade all on the Packages page.",
  security:
    "Only updates marked as security fixes. Servers whose package manager doesn't mark them are skipped.",
  full: "apt's full-upgrade: may also install new packages or remove old ones to finish an upgrade. Other managers get every update.",
}

function PackageSections(props: Props) {
  const { t, set, errors, phone } = props
  const restart = t.pkgReboot === "if-required"
  return (
    <>
      <ServersSection
        {...props}
        min="engineer"
        hint="Each server's own package manager: apt, dnf, yum, zypper, apk or pacman. Up to 200."
      />
      <Section
        title="Updates"
        hint="Read again on each server at every run."
        phone={phone}
      >
        <div className="[scrollbar-width:none] overflow-x-auto">
          <Segmented
            label="Which updates"
            value={t.pkgMode}
            onChange={(pkgMode) => set({ pkgMode })}
            items={[
              { value: "all", label: "Every update" },
              { value: "security", label: "Security only" },
              { value: "full", label: "Full upgrade" },
            ]}
          />
        </div>
        <p className="text-caption text-muted-foreground">
          {modeHints[t.pkgMode]}
        </p>
        <ToggleRow
          id="cronjob-packages-autoremove"
          label="Remove packages nobody needs any more"
          hint="Old kernels and dependencies left behind by the upgrade."
          checked={t.pkgAutoremove}
          onChange={(pkgAutoremove) => set({ pkgAutoremove })}
        />
        <ToggleRow
          id="cronjob-packages-clean"
          label="Empty the package cache afterwards"
          hint="Frees the disk space taken by downloaded packages."
          checked={t.pkgClean}
          onChange={(pkgClean) => set({ pkgClean })}
        />
      </Section>
      <Section
        title="Restart"
        hint="After a kernel or library update a server needs a restart to use it."
        phone={phone}
      >
        <div className="[scrollbar-width:none] overflow-x-auto">
          <Segmented
            label="Restart"
            value={t.pkgReboot}
            onChange={(pkgReboot) => set({ pkgReboot })}
            items={[
              { value: "never", label: "Never" },
              { value: "if-required", label: "When one is needed" },
            ]}
          />
        </div>
        {restart ? (
          <>
            <ToggleRow
              id="cronjob-packages-logged-in"
              label="Not while someone is logged in"
              hint="That server is upgraded but not restarted, and the run says so."
              checked={t.skipIfLoggedIn}
              onChange={(skipIfLoggedIn) => set({ skipIfLoggedIn })}
            />
            <Field
              label="Message (optional)"
              hint="Shown to anyone logged in, just before."
              error={errors.message}
            >
              {(p) => (
                <Input
                  {...p}
                  value={t.message}
                  onChange={(e) => set({ message: e.target.value })}
                  maxLength={200}
                  placeholder="Restarting after updates"
                  className="placeholder:text-ash"
                />
              )}
            </Field>
            <Callout icon={<TriangleAlert />} tone="warning">
              Restarts go one server at a time, each waiting for the last to
              come back. A server that isn't back within 15 minutes fails the
              run, and no other server is restarted.
            </Callout>
          </>
        ) : (
          <p className="text-caption text-muted-foreground">
            The run says which servers need one; restart them from their page
            when it suits you.
          </p>
        )}
      </Section>
      <Section title="How it goes" phone={phone}>
        <Field
          label="Servers at a time"
          hint="1 = one after the other, the safest."
          error={errors.parallel}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              value={t.pkgParallel}
              onChange={(e) => set({ pkgParallel: e.target.value })}
              className="w-28"
            />
          )}
        </Field>
        <ToggleRow
          id="cronjob-packages-keep-going"
          label="Carry on after a server fails"
          hint="Off = the servers not started yet are left alone."
          checked={t.pkgKeepGoing}
          onChange={(pkgKeepGoing) => set({ pkgKeepGoing })}
        />
        <Callout icon={<Info />}>
          While the package manager works the run can't be stopped: stopping it
          half way can leave a server's packages broken.
        </Callout>
      </Section>
    </>
  )
}

// ---- Containers ----

function DockerUpdateSections(props: Props) {
  const { t, set, errors, phone } = props
  return (
    <>
      <ServersSection
        {...props}
        min="engineer"
        hint="Servers with Docker or Podman. Each one pulls its newer images and recreates the containers using them. Up to 50."
      />
      <Section
        title="What to update"
        hint="Only containers whose image has a newer version are touched; the rest keep running."
        phone={phone}
      >
        <Field
          label="Only these (optional)"
          hint="Projects or containers, one per line; * and ? work. Empty = every running container with an update."
          error={errors.only}
        >
          {(p) => (
            <Textarea
              {...p}
              value={t.dockerOnly}
              onChange={(e) => set({ dockerOnly: e.target.value })}
              rows={3}
              placeholder={"shop\nworker-*"}
              className="font-mono placeholder:text-ash"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>
        <ToggleRow
          id="cronjob-docker-check"
          label="Ask the registries first"
          hint="Off = use what the last daily update check found."
          checked={t.dockerCheck}
          onChange={(dockerCheck) => set({ dockerCheck })}
        />
      </Section>
      <Section
        title="Safety"
        hint="An update that breaks a container can be undone on its own."
        phone={phone}
      >
        <ToggleRow
          id="cronjob-docker-rollback"
          label="Put the old image back if it fails"
          hint="Each updated container is watched for a while; if it stops or turns unhealthy, it's recreated from its old image."
          checked={t.dockerRollback}
          onChange={(dockerRollback) => set({ dockerRollback })}
        />
        {t.dockerRollback && (
          <Field
            label="Watch for (seconds)"
            hint="Long enough for the app to start and its healthcheck to run."
            error={errors.wait}
          >
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={10}
                max={600}
                value={t.dockerWait}
                onChange={(e) => set({ dockerWait: e.target.value })}
                className="w-28"
              />
            )}
          </Field>
        )}
        <ToggleRow
          id="cronjob-docker-keep-going"
          label="Carry on after a server fails"
          hint="Off = the servers not started yet are left alone."
          checked={t.dockerKeepGoing}
          onChange={(dockerKeepGoing) => set({ dockerKeepGoing })}
        />
      </Section>
    </>
  )
}

function DockerPruneSections(props: Props) {
  const { t, set, errors, phone } = props
  return (
    <>
      <ServersSection
        {...props}
        min="engineer"
        hint="Servers with Docker or Podman. Each one removes what nothing uses any more. Up to 50."
      />
      <Section
        title="What to remove"
        hint="Only what no container uses; running and stopped projects keep their images."
        phone={phone}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">Images</span>
          <div className="[scrollbar-width:none] overflow-x-auto">
            <Segmented
              label="Images"
              value={t.pruneImages}
              onChange={(pruneImages) => set({ pruneImages })}
              items={[
                { value: "none", label: "Keep" },
                { value: "dangling", label: "Untagged" },
                { value: "all", label: "Every unused one" },
              ]}
            />
          </div>
          <p className="text-caption text-muted-foreground">
            {t.pruneImages === "all"
              ? "Every image no container uses, tagged or not. The next deploy pulls what it needs again."
              : t.pruneImages === "dangling"
                ? "Only images with no tag left: old layers replaced by a newer pull or build."
                : "Images stay as they are."}
          </p>
        </div>
        <ToggleRow
          id="cronjob-prune-build-cache"
          label="Build cache"
          hint="What docker build kept to go faster next time."
          checked={t.pruneBuildCache}
          onChange={(pruneBuildCache) => set({ pruneBuildCache })}
        />
        <ToggleRow
          id="cronjob-prune-containers"
          label="Stopped containers"
          hint="Ones that exited and were never removed. Their logs go with them."
          checked={t.pruneContainers}
          onChange={(pruneContainers) => set({ pruneContainers })}
        />
        <ToggleRow
          id="cronjob-prune-networks"
          label="Unused networks"
          hint="Networks no container is attached to. Docker's own (bridge, host, none) stay."
          checked={t.pruneNetworks}
          onChange={(pruneNetworks) => set({ pruneNetworks })}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">Volumes</span>
          <div className="[scrollbar-width:none] overflow-x-auto">
            <Segmented
              label="Volumes"
              value={t.pruneVolumes}
              onChange={(pruneVolumes) => set({ pruneVolumes })}
              items={[
                { value: "none", label: "Keep" },
                { value: "anonymous", label: "Unnamed only" },
                { value: "all", label: "Every unused one" },
              ]}
            />
          </div>
          {t.pruneVolumes !== "none" && (
            <Callout icon={<TriangleAlert />} tone="warning">
              Volumes hold data. A project that's down when this runs loses{" "}
              {t.pruneVolumes === "all" ? "its volumes" : "its unnamed volumes"}
              , and there's no undo. Back them up first.
            </Callout>
          )}
        </div>
        <FieldError text={errors.prune} />
      </Section>
      <Section
        title="Safety"
        hint="Keep what's new, in case it's about to be used."
        phone={phone}
      >
        <Field
          label="Only what's older than (hours)"
          hint="0 = all of it. Doesn't apply to volumes: Docker keeps no age for them."
          error={errors.older}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={0}
              max={8760}
              value={t.pruneOlder}
              onChange={(e) => set({ pruneOlder: e.target.value })}
              className="w-28"
            />
          )}
        </Field>
        <ToggleRow
          id="cronjob-prune-keep-going"
          label="Carry on after a server fails"
          hint="Off = the servers not started yet are left alone."
          checked={t.pruneKeepGoing}
          onChange={(pruneKeepGoing) => set({ pruneKeepGoing })}
        />
      </Section>
    </>
  )
}

function VolumeBackupSections({ t, set, errors, phone, ws }: Props) {
  const fleet = useDockerFleet()
  const storages = useQuery(storagesQuery)
  const canPick = useCanPick("engineer")
  const servers = (fleet.data?.servers ?? []).filter(
    (s) =>
      s.workspace_id === ws && canPick({ id: s.server_id, workspace_id: ws }),
  )
  const places = (storages.data?.items ?? []).filter(
    (s) => s.workspace_id === ws && !s.read_only,
  )
  return (
    <>
      <Section
        title="Volumes"
        hint="Each volume is packed into a .tar.gz on the server and sent to the storage."
        phone={phone}
      >
        <Field label="Server" error={errors.servers}>
          {(p) =>
            fleet.isPending ? (
              <Skeleton className="h-10 rounded-lg" />
            ) : (
              <Choice
                id={p.id}
                value={t.volServer}
                onChange={(volServer) => set({ volServer })}
                placeholder="Choose a server with Docker"
                items={servers.map((s) => ({
                  value: s.server_id,
                  label: s.name,
                  detail: s.podman ? "Podman" : "Docker",
                }))}
              />
            )
          }
        </Field>
        <Field
          label="Only these (optional)"
          hint="Volume names, one per line; * and ? work. Empty = every volume."
          error={errors.volumes}
        >
          {(p) => (
            <Textarea
              {...p}
              value={t.volNames}
              onChange={(e) => set({ volNames: e.target.value })}
              rows={3}
              placeholder={"shop_db\n*_data"}
              className="font-mono placeholder:text-ash"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>
        <ToggleRow
          id="cronjob-volumes-stop"
          label="Stop the containers using it while it's copied"
          hint="A database's files are only safe to copy while it's stopped. They start again right after."
          checked={t.volStop}
          onChange={(volStop) => set({ volStop })}
        />
      </Section>
      <Section
        title="Send to"
        hint="A storage of this workspace that can be written to."
        phone={phone}
      >
        <Field label="Storage" error={errors.storage}>
          {(p) =>
            storages.isPending ? (
              <Skeleton className="h-10 rounded-lg" />
            ) : places.length === 0 ? (
              <NoneYet
                text="No storage to write to in this workspace yet."
                href="/storage?tab=storages"
                label="Add a storage"
              />
            ) : (
              <Choice
                id={p.id}
                value={t.volStorage}
                onChange={(volStorage) => set({ volStorage })}
                placeholder="Choose a storage"
                items={places.map((s) => ({
                  value: s.id,
                  label: s.name,
                  detail: s.protocol.toUpperCase(),
                }))}
              />
            )
          }
        </Field>
        <Field
          label="Folder"
          hint="One file per volume and run: <volume>-<date>.tar.gz."
          error={errors.folder}
        >
          {(p) => (
            <Input
              {...p}
              value={t.volFolder}
              onChange={(e) => set({ volFolder: e.target.value })}
              placeholder="/backups/docker-volumes"
              className="font-mono placeholder:text-ash"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>
        <Field
          label="Copies to keep of each volume"
          hint="Older copies made by this job are removed. 0 = keep them all."
          error={errors.keep}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              value={t.volKeep}
              onChange={(e) => set({ volKeep: e.target.value })}
              className="w-28"
            />
          )}
        </Field>
        <ToggleRow
          id="cronjob-volumes-keep-going"
          label="Carry on after a volume fails"
          hint="Off = the volumes not copied yet are left for the next run."
          checked={t.volKeepGoing}
          onChange={(volKeepGoing) => set({ volKeepGoing })}
        />
      </Section>
    </>
  )
}

// ---- Fetch ----

function FetchSection({ t, set, errors, phone }: Props) {
  let fallback = "file name from the address"
  try {
    const last = new URL(t.url.trim()).pathname.split("/").pop()
    if (last) fallback = decodeURIComponent(last)
  } catch {}
  return (
    <Section
      title="Download"
      hint="Each server downloads it itself, so it must reach the address."
      phone={phone}
    >
      <Field label="Address" error={errors.url}>
        {(p) => (
          <Input
            {...p}
            type="url"
            inputMode="url"
            value={t.url}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://example.com/files/list.txt"
            maxLength={4096}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono placeholder:font-sans placeholder:text-ash"
          />
        )}
      </Field>
      <Field
        label="Save as (optional)"
        hint="Blank = the address's file name."
        error={errors.fileName}
      >
        {(p) => (
          <Input
            {...p}
            value={t.fileName}
            onChange={(e) => set({ fileName: e.target.value })}
            placeholder={fallback}
            maxLength={255}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono placeholder:font-sans placeholder:text-ash"
          />
        )}
      </Field>
      <ToggleRow
        id="cronjob-fetch-overwrite"
        label="Replace the file each time"
        hint="Off: a run fails where the file is already there."
        checked={t.overwrite}
        onChange={(overwrite) => set({ overwrite })}
      />
    </Section>
  )
}

// ---- Verify backups ----

function VerifySection({ t, set, errors, phone, ws }: Props) {
  const databases = useQuery(databasesQuery)
  const can = useDatabaseCan()
  const items = (databases.data?.items ?? []).filter(
    (d) => d.workspace_id === ws && can(d, "operator"),
  )
  const plans = useQuery({
    queryKey: backupKeys.plans(t.databaseId),
    queryFn: () => api.databaseBackups.listDatabaseBackupPlans(t.databaseId),
    select: (l) => l.items,
    enabled: !!t.databaseId,
  })
  return (
    <Section
      title="Backups"
      hint="Each copy of the latest backup is read back and its checksum compared, on every storage it's kept on. Nothing is restored."
      phone={phone}
    >
      {databases.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Field label="Database" error={errors.database}>
          {(p) => (
            <Choice
              id={p.id}
              value={t.databaseId}
              onChange={(databaseId) => set({ databaseId, planId: "" })}
              placeholder="Choose a database"
              items={items.map((d) => ({ value: d.id, label: d.name }))}
            />
          )}
        </Field>
      )}
      {t.databaseId && (
        <Field
          label="Plan"
          hint="Each plan's latest backup, or just one plan's."
          error={errors.plan}
        >
          {(p) => (
            <Choice
              id={p.id}
              value={t.planId}
              onChange={(planId) => set({ planId })}
              placeholder="Every plan"
              items={(plans.data ?? []).map((pl) => ({
                value: pl.id,
                label: pl.name,
              }))}
            />
          )}
        </Field>
      )}
      <Callout icon={<Info />}>
        A copy that doesn't read back intact fails the run, and the backup is
        marked on the database's Backups tab.
      </Callout>
    </Section>
  )
}
