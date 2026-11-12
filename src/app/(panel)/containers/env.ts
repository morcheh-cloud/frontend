"use client"

import { useSyncExternalStore } from "react"

import type { DockerFleetServer } from "@/lib/services"
import { useDockerFleet } from "./api"

// The "environment" every Containers page works on: one server with an
// engine, picked in the sidebar (or by a link with `?env=`), remembered per
// browser like Arcane's environment switcher.
const KEY = "morcheh.docker.env"
const EVENT = "morcheh:docker-env"

function read() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function subscribe(fn: () => void) {
  window.addEventListener(EVENT, fn)
  window.addEventListener("storage", fn)
  return () => {
    window.removeEventListener(EVENT, fn)
    window.removeEventListener("storage", fn)
  }
}

export function setDockerEnv(id: string) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Private mode: the choice lasts until the page reloads.
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useStoredDockerEnv() {
  return useSyncExternalStore(subscribe, read, () => null)
}

// Which engine to fall back on: a ready one before one that can't be reached.
const usable = (s: DockerFleetServer) => s.state === "ready"

export function pickEnv(servers: DockerFleetServer[], stored: string | null) {
  return (
    servers.find((s) => s.server_id === stored) ??
    servers.find(usable) ??
    servers[0]
  )
}

// The current environment with the fleet it was picked from. `server` is
// undefined while the fleet loads, or when no server has an engine.
export function useDockerEnv() {
  const fleet = useDockerFleet()
  const stored = useStoredDockerEnv()
  // Servers without an engine aren't environments (the Environments page
  // still lists them, with how to install one).
  const servers = (fleet.data?.servers ?? []).filter(
    (s) => s.state !== "not-installed",
  )
  const server = pickEnv(servers, stored)
  return {
    fleet,
    servers,
    server,
    id: server?.server_id,
    set: setDockerEnv,
  }
}
