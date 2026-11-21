// Updates without downtime ("start-first", Swarm's word for it). A service
// whose compose file says deploy.update_config.order: start-first is updated
// by Morche's backend by starting the new container beside the old one,
// waiting for it to turn healthy and only then stopping the old one. These
// helpers mirror the backend's checks (docker_rollout.go) so the Production
// tab can say beforehand whether it will work.

import type { ServiceInfo } from "./compose-edit"

type Json = Record<string, unknown>
const obj = (v: unknown): Json =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {}

// The compose file asks for it.
export function rolloutOn(s: Json) {
  const order = obj(obj(s.deploy).update_config).order
  return typeof order === "string" && order.toLowerCase() === "start-first"
}

export type RolloutBlocker = {
  // Short, for a value column.
  short: string
  // Why, in a sentence.
  why: string
  // The Production editor can fix it itself (turn the health check on).
  health?: boolean
}

// Why two copies of the service can't run at once, or null when they can.
// health = it has a health check (its own, the image's, or one being added).
export function rolloutBlocker(
  info: ServiceInfo | undefined,
  health: boolean,
): RolloutBlocker | null {
  if (!info) return null
  if (info.containerName)
    return {
      short: "Fixed name",
      why: `It has a fixed container_name (${info.containerName}), so a second copy can't be made. Remove it to update without downtime.`,
    }
  if (info.networkMode === "host")
    return {
      short: "Host network",
      why: "It uses the host's network, so two copies would want the same ports.",
    }
  const fixed = info.ports.find((p) => p.host && p.host !== "0")
  if (fixed)
    return {
      short: `Host port ${fixed.host}`,
      why: `It publishes host port ${fixed.host}, which only one copy can hold. Put a reverse proxy on its Docker network in front and drop the host port.`,
    }
  if ((info.replicas ?? 1) > 1)
    return {
      short: "Several copies",
      why: "It already runs several copies; Docker Compose replaces them all at once.",
    }
  if (!health)
    return {
      short: "No health check",
      why: "Without a health check there's no way to tell when the new copy is ready to take traffic.",
      health: true,
    }
  return null
}
