"use client"

import { CircleCheck, CircleX, Server as ServerIcon } from "lucide-react"
import { useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import type {
  DockerFleetServer,
  DockerRegistry,
  DockerRegistryLogin,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { SearchBox, Segmented } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { useDockerFleet } from "../api"

export type RegistryMode = "all" | "chosen"

// The workspace's servers, as the Containers fleet knows them.
export function useWorkspaceServers(ws: string) {
  const fleet = useDockerFleet()
  const list = (fleet.data?.servers ?? [])
    .filter((s) => s.workspace_id === ws)
    .sort((a, b) => a.name.localeCompare(b.name))
  return { list, loading: fleet.isPending }
}

// Is a registry login for this server?
export function covers(r: DockerRegistry, server: string) {
  return r.servers !== "chosen" || r.server_ids.includes(server)
}

// One line on where a registry is signed in, for lists.
export function signInSummary(
  r: DockerRegistry,
  servers: DockerFleetServer[],
): { text: string; tone: "muted" | "success" | "warning" } {
  if (!r.sign_in_on_servers) {
    if (r.logins.length > 0)
      return { text: "Signing out pending", tone: "warning" }
    return { text: "Morche's pulls only", tone: "muted" }
  }
  const failed = r.logins.filter((l) => !l.ok).length
  const ok = r.logins.filter((l) => l.ok).length
  const want = servers.filter(
    (s) => covers(r, s.server_id) && s.state !== "not-installed",
  ).length
  if (failed > 0) return { text: `${failed} failed`, tone: "warning" }
  if (ok === 0) return { text: "Not signed in yet", tone: "warning" }
  if (want > ok)
    return { text: `Signed in on ${ok} of ${want}`, tone: "warning" }
  return {
    text: `Signed in on ${ok} server${ok === 1 ? "" : "s"}`,
    tone: "success",
  }
}

export function serversText(r: DockerRegistry) {
  if (r.servers !== "chosen") return "All servers"
  const n = r.server_ids.length
  return `${n} server${n === 1 ? "" : "s"}`
}

// The form's "Which servers" part: all or chosen ones, plus whether the
// servers' own Docker gets signed in too. Each server shows how its last
// sign-in went.
export function RegistryServersField({
  ws,
  mode,
  onMode,
  picked,
  onPicked,
  signIn,
  onSignIn,
  logins,
  error,
}: {
  ws: string
  mode: RegistryMode
  onMode: (mode: RegistryMode) => void
  picked: string[]
  onPicked: (ids: string[]) => void
  signIn: boolean
  onSignIn: (on: boolean) => void
  logins: DockerRegistryLogin[]
  error?: string
}) {
  const { list, loading } = useWorkspaceServers(ws)
  const [q, setQ] = useState("")
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? list.filter((s) =>
        [s.name, s.address].some((v) => v.toLowerCase().includes(needle)),
      )
    : list
  const loginOf = (id: string) => logins.find((l) => l.server_id === id)
  const chosen = mode === "chosen"
  const allOn =
    shown.length > 0 && shown.every((s) => picked.includes(s.server_id))

  const toggle = (id: string, on: boolean) =>
    onPicked(on ? [...picked, id] : picked.filter((p) => p !== id))
  const toggleAll = () => {
    const ids = new Set(picked)
    for (const s of shown) {
      if (allOn) ids.delete(s.server_id)
      else ids.add(s.server_id)
    }
    onPicked([...ids])
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-body-sm font-medium">Servers</h3>
          <p className="text-caption text-muted-foreground">
            Pulls on these servers use this login.
          </p>
        </div>
        <Segmented
          label="Which servers"
          value={mode}
          onChange={onMode}
          items={[
            { value: "all", label: "All servers" },
            { value: "chosen", label: "Chosen ones" },
          ]}
        />
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          error ? "border-destructive" : "border-border",
        )}
      >
        {list.length > 6 && (
          <div className="flex items-center gap-2 border-b border-border p-2">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Search servers"
              label="Search servers"
              className="min-w-0 flex-1 md:w-auto"
            />
            {chosen && shown.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                className="h-11 shrink-0 rounded-lg px-3 text-body-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
              >
                {allOn ? "Untick all" : "Tick all"}
              </button>
            )}
          </div>
        )}
        <ul className="max-h-64 overflow-y-auto">
          {loading && (
            <li className="p-3 text-caption text-muted-foreground">
              Loading servers…
            </li>
          )}
          {!loading && shown.length === 0 && (
            <li className="p-3 text-caption text-muted-foreground">
              {needle ? "No server matches." : "This workspace has no servers."}
            </li>
          )}
          {shown.map((s) => {
            const on = !chosen || picked.includes(s.server_id)
            const row = (
              <>
                {chosen ? (
                  <Checkbox
                    checked={on}
                    onCheckedChange={(v) => toggle(s.server_id, v === true)}
                    aria-label={`Use it on ${s.name}`}
                  />
                ) : (
                  <ServerIcon className="size-4 shrink-0 text-ash" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-sm">{s.name}</span>
                  <span className="truncate text-caption text-ash">
                    {s.address}
                  </span>
                </span>
                <ServerState
                  server={s}
                  login={loginOf(s.server_id)}
                  covered={on}
                  signIn={signIn}
                />
              </>
            )
            return (
              <li
                key={s.server_id}
                className="border-b border-border last:border-b-0"
              >
                {chosen ? (
                  // biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is the control
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/60">
                    {row}
                  </label>
                ) : (
                  <div className="flex min-h-11 items-center gap-3 px-3 py-2">
                    {row}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      {error && (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      )}

      {/* biome-ignore lint/a11y/noLabelWithoutControl: the Switch inside is the control */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/40">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body-sm font-medium">
            Also sign in on the servers
          </span>
          <span className="text-caption text-muted-foreground">
            Runs <code className="font-mono">docker login</code> on each server
            (as root when it can), so docker, compose or Watchtower run on the
            server itself can pull too. Morche's own pulls, updates and
            auto-update use the login without this.
          </span>
        </span>
        <Switch
          checked={signIn}
          onCheckedChange={onSignIn}
          className="mt-1"
          aria-label="Also sign in on the servers"
        />
      </label>
    </section>
  )
}

// How a server stands with this login, at the end of its row.
function ServerState({
  server,
  login,
  covered,
  signIn,
}: {
  server: DockerFleetServer
  login?: DockerRegistryLogin
  covered: boolean
  signIn: boolean
}) {
  const base = "shrink-0 text-end text-caption"
  if (server.state === "not-installed")
    return <span className={cn(base, "text-ash")}>No Docker</span>
  if (login && !login.ok)
    return (
      <span
        className={cn(base, "flex max-w-48 items-center gap-1 text-warning")}
        title={login.message}
      >
        <CircleX className="size-3.5 shrink-0" />
        <span className="truncate">{login.message || "Failed"}</span>
      </span>
    )
  if (login?.ok)
    return (
      <span
        className={cn(
          base,
          "flex items-center gap-1",
          covered && signIn ? "text-success" : "text-muted-foreground",
        )}
        title={`Signed in as ${login.as_user || "the login user"}, ${timeAgo(login.at)}`}
      >
        <CircleCheck className="size-3.5 shrink-0" />
        {covered && signIn ? "Signed in" : "Signs out on save"}
      </span>
    )
  if (server.state === "offline")
    return <span className={cn(base, "text-ash")}>Offline</span>
  if (covered && signIn)
    return <span className={cn(base, "text-ash")}>Signs in on save</span>
  return null
}
