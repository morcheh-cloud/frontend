import { createSerializer, parseAsString, parseAsStringLiteral } from "nuqs"

import { API_URL } from "@/lib/api"
import type {
  DockerAutoUpdate,
  DockerAutoUpdateBody,
  DockerAutoUpdateCandidate,
  DockerAutoUpdateEvent,
} from "@/lib/services"
import type { Tone } from "./meta"

// Container auto-update (Watchtower-like): policies that keep chosen
// containers on the newest image of their tag.

export const AUTO_UPDATE = "/containers/auto-update"

export const pickMeta: Record<
  DockerAutoUpdate["pick"],
  { label: string; hint: string }
> = {
  all: {
    label: "Every container",
    hint: "All containers on the servers, except the ones you leave out.",
  },
  labeled: {
    label: "Labelled ones",
    hint: "Only containers labelled morcheh.auto-update.enable=true (Watchtower's com.centurylinklabs.watchtower.enable=true works too).",
  },
  chosen: {
    label: "Chosen ones",
    hint: "Containers, compose projects or images you name (labelled ones too).",
  },
}

export const modeMeta: Record<
  DockerAutoUpdate["mode"],
  { label: string; hint: string }
> = {
  update: {
    label: "Update them",
    hint: "Pull the new image and recreate the container on it, with the same settings.",
  },
  monitor: {
    label: "Only tell me",
    hint: "Look for new images and report them; nothing is pulled or restarted.",
  },
}

export const notifyMeta: Record<DockerAutoUpdate["notify"], string> = {
  changes: "When something is updated, found or fails",
  failures: "Only when something fails",
  always: "After every run",
  never: "Never",
}

export const resultMeta: Record<
  DockerAutoUpdateEvent["result"],
  { label: string; tone: Tone }
> = {
  updated: { label: "Updated", tone: "success" },
  available: { label: "New image", tone: "brand" },
  rolled_back: { label: "Rolled back", tone: "warning" },
  failed: { label: "Failed", tone: "destructive" },
  skipped: { label: "Skipped", tone: "muted" },
}

export const results = Object.keys(
  resultMeta,
) as DockerAutoUpdateEvent["result"][]

// The policy's last run, as a dot and words.
export function lastStateMeta(p: DockerAutoUpdate): {
  label: string
  tone: Tone
} {
  if (p.running || p.last_state === "running")
    return { label: "Running", tone: "brand" }
  switch (p.last_state) {
    case "ok":
      return { label: "All up to date", tone: "success" }
    case "updated":
      return { label: "Updated", tone: "success" }
    case "available":
      return { label: "New images found", tone: "brand" }
    case "failed":
      return { label: "Failed", tone: "destructive" }
    default:
      return { label: "Never ran", tone: "muted" }
  }
}

export const candidateMeta: Record<
  DockerAutoUpdateCandidate["update"],
  { label: string; tone: Tone }
> = {
  available: { label: "New image", tone: "brand" },
  current: { label: "Up to date", tone: "success" },
  local: { label: "Built here", tone: "muted" },
  pinned: { label: "Pinned", tone: "muted" },
  error: { label: "Couldn't check", tone: "warning" },
  unchecked: { label: "Not checked", tone: "muted" },
}

export const webhookUrl = (token: string) => {
  const base =
    API_URL || (typeof window === "undefined" ? "" : window.location.origin)
  return `${base.replace(/\/$/, "")}/hooks/docker-update/${token}`
}

// --- URLs -------------------------------------------------------------------

export const listTabs = ["policies", "activity"] as const
export const policyTabs = ["overview", "activity", "settings"] as const
export type PolicyTab = (typeof policyTabs)[number]

export const activityParsers = {
  policy: parseAsString.withDefault(""),
  server: parseAsString.withDefault(""),
  result: parseAsStringLiteral(results),
}

export const listParsers = {
  tab: parseAsStringLiteral(listTabs).withDefault("policies"),
  q: parseAsString.withDefault(""),
}

export const policyParsers = {
  tab: parseAsStringLiteral(policyTabs).withDefault("overview"),
}

const listSerializer = createSerializer({ ...listParsers, ...activityParsers })
const policySerializer = createSerializer(policyParsers)

export function autoUpdatesHref(
  q: { tab?: (typeof listTabs)[number]; server?: string; policy?: string } = {},
) {
  return listSerializer(AUTO_UPDATE, q)
}

export function autoUpdateHref(id: string, tab?: PolicyTab) {
  return policySerializer(`${AUTO_UPDATE}/${id}`, { tab: tab ?? null })
}

// A new policy, prefilled from a server (and a container on it).
export const newParsers = {
  server: parseAsString,
  container: parseAsString,
}
const newSerializer = createSerializer(newParsers)

export function newAutoUpdateHref(q: { server?: string; container?: string }) {
  return newSerializer(`${AUTO_UPDATE}/new`, q)
}

// --- Draft --------------------------------------------------------------------

export type Draft = Omit<
  DockerAutoUpdateBody,
  "$schema" | "channels" | "include" | "exclude"
> & {
  include: string[]
  exclude: string[]
  // null = take the workspace's default channels when the list arrives.
  channels: string[] | null
}

export function freshDraft(server?: string, container?: string): Draft {
  return {
    name: container ? `Keep ${container} up to date` : "",
    enabled: true,
    servers: server ? [server] : [],
    pick: container ? "chosen" : "all",
    include: container ? [container] : [],
    exclude: [],
    include_stopped: false,
    revive_stopped: false,
    mode: "update",
    cron: "0 4 * * *",
    timezone: "",
    no_pull: false,
    cleanup: true,
    rollback: true,
    wait_seconds: 60,
    restart_linked: true,
    stop_timeout: 10,
    min_age_hours: 0,
    hooks: true,
    hook_timeout: 60,
    notify: "changes",
    channels: null,
  }
}

export function draftOf(p: DockerAutoUpdate): Draft {
  return {
    name: p.name,
    enabled: p.enabled,
    servers: p.servers.filter((s) => !s.missing).map((s) => s.id),
    pick: p.pick,
    include: p.include,
    exclude: p.exclude,
    include_stopped: p.include_stopped,
    revive_stopped: p.revive_stopped,
    mode: p.mode,
    cron: p.cron,
    timezone: p.timezone,
    no_pull: p.no_pull,
    cleanup: p.cleanup,
    rollback: p.rollback,
    wait_seconds: p.wait_seconds,
    restart_linked: p.restart_linked,
    stop_timeout: p.stop_timeout,
    min_age_hours: p.min_age_hours,
    hooks: p.hooks,
    hook_timeout: p.hook_timeout,
    notify: p.notify,
    channels: p.channels,
  }
}

export function sameDraft(a: Draft, b: Draft) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// "Containers, projects or images" lists: one per line or comma.
export function splitPatterns(text: string) {
  return [
    ...new Set(
      text
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]
}

// What a policy covers, in a few words: "3 servers · every container".
export function coverText(p: DockerAutoUpdate) {
  const servers =
    p.servers.length === 1 ? p.servers[0].name : `${p.servers.length} servers`
  const what =
    p.pick === "all"
      ? p.exclude.length > 0
        ? `every container but ${p.exclude.length}`
        : "every container"
      : p.pick === "labeled"
        ? "labelled containers"
        : p.include.length === 1
          ? p.include[0]
          : `${p.include.length} chosen`
  return `${servers} · ${what}`
}
