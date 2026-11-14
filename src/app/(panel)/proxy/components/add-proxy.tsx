"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Check,
  Container,
  HardDrive,
  Loader2,
  PackagePlus,
  SquarePen,
} from "lucide-react"
import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"

import { OsTile } from "@/app/(panel)/servers/components/meta"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api, fieldErrors } from "@/lib/api"
import type {
  CreateProxyRequest,
  DetectedContainer,
  ProxyDetection,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCreateProxy, useDetectProxy, useProxyKinds } from "../api"
import { containerReach, needsSetup, runtimeLabel } from "./meta"

type Runtime = "docker" | "podman"

// What the person picked: "host", "other" (a container named by hand) or
// "c:<runtime>:<name>" for a found container.
type Choice = string

const containerKey = (c: Pick<DetectedContainer, "runtime" | "name">) =>
  `c:${c.runtime}:${c.name}`

const fits = (c: DetectedContainer) =>
  c.recommended && !c.proxy_id && !c.managed

// The choice to start from, by what the backend suggests.
function suggested(d: ProxyDetection): Choice | null {
  switch (d.suggestion) {
    case "host":
    case "install":
      return d.native_id ? null : "host"
    case "container": {
      const c = d.containers.find(fits)
      return c ? containerKey(c) : null
    }
    default:
      return null
  }
}

const NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/

export function AddProxyDialog({
  open,
  onOpenChange,
  serverId,
  onAdded,
  onOpenProxy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId?: string
  onAdded: (p: ReverseProxy, setupNow: boolean) => void
  // Go to a proxy that's already in the panel.
  onOpenProxy: (id: string) => void
}) {
  const { serverLevel } = useAccess()
  const kinds = useProxyKinds()
  const servers = useQuery({
    queryKey: ["servers", "transfer-targets"],
    queryFn: () => api.servers.listServers({ limit: 500 }),
    enabled: open,
  })
  const create = useCreateProxy()

  const [server, setServer] = useState(serverId ?? "")
  const [kind, setKind] = useState("nginx")
  const [picked, setPicked] = useState<Choice | null>(null)
  const [otherRuntime, setOtherRuntime] = useState<Runtime | null>(null)
  const [otherName, setOtherName] = useState("")
  const [setupNow, setSetupNow] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const detect = useDetectProxy(server, kind, open)
  const found = detect.data
  const choice = picked ?? (found ? suggested(found) : null)

  const choices = (servers.data?.items ?? []).map((s) => ({
    value: s.id,
    label: s.name,
    server: s,
    why: atLeast(serverLevel(s.id, s.workspace_id), "engineer")
      ? null
      : "Needs Engineer",
  }))
  const kindItems = (kinds.data?.items ?? []).map((k) => ({
    value: k.kind,
    label: k.label,
  }))
  const kindLabel = kindItems.find((k) => k.value === kind)?.label ?? kind
  const serverName = choices.find((c) => c.value === server)?.label ?? ""

  // Docker / Podman as they're on the server (even one that didn't answer).
  const runtimes = [
    ...new Set([...(found?.runtimes ?? []), ...(found?.down ?? [])]),
  ].filter((r): r is Runtime => r === "docker" || r === "podman")
  const runtime = otherRuntime ?? runtimes[0] ?? "docker"

  function reset(next: () => void) {
    next()
    setPicked(null)
    setErrors({})
  }

  function body(): CreateProxyRequest | string {
    if (!server) return "Pick a server"
    if (!choice) return "Pick where it runs"
    if (choice === "host") return { server_id: server, kind, runtime: "host" }
    if (choice === "other") {
      const name = otherName.trim()
      if (!name) return "container:Type the container's name"
      if (!NAME.test(name))
        return "container:Letters, digits, '.', '_' and '-', starting with a letter or digit"
      return { server_id: server, kind, runtime, container: name }
    }
    const [, rt, name] = choice.split(":")
    return { server_id: server, kind, runtime: rt as Runtime, container: name }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const b = body()
    if (typeof b === "string") {
      const [field, msg] = b.startsWith("container:")
        ? ["container", b.slice(10)]
        : ["form", b]
      setErrors({ [field]: msg })
      return
    }
    setErrors({})
    create.mutate(b, {
      onSuccess: (p) => {
        toast.success(
          p.runtime === "host"
            ? `${p.kind_label} on ${p.server_name} added`
            : `${p.kind_label} in ${p.container} on ${p.server_name} added`,
        )
        onAdded(p, setupNow && !p.manager && needsSetup(p))
      },
      onError: (err) => {
        const f = fieldErrors(err)
        if (f.container && choice === "other")
          setErrors({ container: f.container })
        else setErrors({ form: f.container ?? err.message })
      },
    })
  }

  const isContainer = !!choice && choice !== "host"
  // A container run by a proxy manager (Nginx Proxy Manager…): Morche only
  // reads it, so there's nothing to set up.
  const manager = found?.containers.find(
    (c) => containerKey(c) === choice,
  )?.managed
  const hostInstalled = found?.native.installed ?? false
  const setupHint = isContainer
    ? "Wires Morche's folder into the container and rotates its logs from the server. The image isn't changed; sites already in it keep working."
    : hostInstalled
      ? "Wires in Morche's folder. Sites already on the server keep working."
      : `Installs ${kindLabel} with the server's package manager and wires in Morche's folder.`

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add reverse proxy"
      description={`Pick the server. Morche looks for ${kindLabel} on it, installed or in a Docker / Podman container, and manages it over SSH.`}
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="proxy-add"
            disabled={create.isPending || !found || !choice}
          >
            {create.isPending ? "Adding…" : "Add proxy"}
          </Button>
        </>
      }
    >
      <form id="proxy-add" onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Server"
          hint={
            servers.isPending
              ? "Loading servers…"
              : choices.length === 0
                ? "No servers in this workspace yet. To use the machine Morche runs on, add it as a server first."
                : undefined
          }
        >
          {(props) => (
            <Select
              items={choices}
              value={server || null}
              onValueChange={(v) =>
                v !== null && reset(() => setServer(v as string))
              }
            >
              <SelectTrigger {...props} className="h-11 w-full md:h-10">
                <SelectValue placeholder="Choose a server" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="max-h-72">
                {choices.map((c) => (
                  <SelectItem key={c.value} value={c.value} disabled={!!c.why}>
                    <OsTile os={c.server.os} className="size-5 rounded" />
                    <span className="truncate">{c.label}</span>
                    <span className="ms-auto truncate text-caption text-ash">
                      {c.why ?? c.server.host}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        {kindItems.length > 1 && (
          <Field label="Proxy">
            {(props) => (
              <Select
                items={kindItems}
                value={kind}
                onValueChange={(v) =>
                  v !== null && reset(() => setKind(v as string))
                }
              >
                <SelectTrigger {...props} className="h-11 w-full md:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {kindItems.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
        )}

        {server && (
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium">Where it runs</span>
            {detect.isPending ? (
              <p className="flex min-h-14 items-center gap-2 rounded-xl border border-border px-3 text-body-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Looking for {kindLabel} on {serverName}…
              </p>
            ) : detect.isError ? (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-body-sm">
                <span>
                  Couldn't look at {serverName}: {detect.error.message}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => detect.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : (
              found && (
                <Found
                  found={found}
                  kindLabel={kindLabel}
                  serverName={serverName}
                  choice={choice}
                  onPick={(c) => {
                    setPicked(c)
                    setErrors({})
                  }}
                  showOther={runtimes.length > 0}
                  onOpenProxy={onOpenProxy}
                />
              )
            )}
          </div>
        )}

        {choice === "other" && (
          <div className="flex flex-col gap-4 rounded-xl border border-border p-3 sm:flex-row">
            {runtimes.length > 1 && (
              <Field label="Runtime" className="sm:w-36">
                {(props) => (
                  <Select
                    items={runtimes.map((r) => ({
                      value: r,
                      label: runtimeLabel[r],
                    }))}
                    value={runtime}
                    onValueChange={(v) => v && setOtherRuntime(v as Runtime)}
                  >
                    <SelectTrigger {...props} className="h-11 w-full md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {runtimes.map((r) => (
                        <SelectItem key={r} value={r}>
                          {runtimeLabel[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            )}
            <Field
              label={`${runtimeLabel[runtime]} container`}
              className="flex-1"
              error={errors.container}
              hint="Its name, as `docker ps` shows it. The image must have nginx at its usual paths, like the official images."
            >
              {(props) => (
                <Input
                  {...props}
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  placeholder="web"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11 md:h-10"
                />
              )}
            </Field>
          </div>
        )}

        {manager && (
          <p className="rounded-lg bg-subtle px-3 py-2 text-body-sm text-muted-foreground">
            <span className="font-medium text-foreground">Read only.</span>{" "}
            {manager} writes nginx's config itself, so Morche won't change
            anything in this container: it shows its sites, status, logs and
            traffic. Add and edit sites in {manager}.
          </p>
        )}

        {choice && !manager && (
          // biome-ignore lint/a11y/noLabelWithoutControl: Base UI checkbox renders the control inside
          <label className="flex min-h-11 items-start gap-2 text-body-sm md:min-h-0">
            <Checkbox
              className="mt-0.5"
              checked={setupNow}
              onCheckedChange={(v) => setSetupNow(v)}
            />
            <span>
              Set it up now
              <span className="block text-caption text-muted-foreground">
                {setupHint}
              </span>
            </span>
          </label>
        )}

        {errors.form && (
          <p role="alert" className="text-body-sm text-destructive">
            {errors.form}
          </p>
        )}
      </form>
    </ResponsiveDialog>
  )
}

// What the detection found, as a list to pick from.
function Found({
  found,
  kindLabel,
  serverName,
  choice,
  onPick,
  showOther,
  onOpenProxy,
}: {
  found: ProxyDetection
  kindLabel: string
  serverName: string
  choice: Choice | null
  onPick: (c: Choice) => void
  showOther: boolean
  onOpenProxy: (id: string) => void
}) {
  const n = found.native
  const summary = {
    host: `Found ${kindLabel} installed on ${serverName}.`,
    container: `Found ${kindLabel} in a container on ${serverName}.`,
    choose: `Found ${kindLabel} in more than one place on ${serverName}. Pick the one whose sites Morche should manage.`,
    install: `${kindLabel} isn't on ${serverName}, neither installed nor in a container. Morche can install it.`,
    added: `Everything found on ${serverName} is already in the panel.`,
  }[found.suggestion]

  return (
    <>
      <p className="text-caption text-muted-foreground">{summary}</p>
      <div
        role="radiogroup"
        aria-label="Where it runs"
        className="flex flex-col overflow-hidden rounded-xl border border-border"
      >
        <Row
          on={choice === "host"}
          onPick={() => onPick("host")}
          icon={n.installed ? HardDrive : PackagePlus}
          title={
            n.installed ? "Installed on the server" : "Install on the server"
          }
          hint={
            n.installed
              ? `${kindLabel}${n.version ? ` ${n.version}` : ""} · ${n.running ? "running" : "not running"}`
              : `Installs ${kindLabel} with the server's package manager.`
          }
          added={found.native_id}
          onOpen={onOpenProxy}
        />
        {found.containers.map((c) => (
          <Row
            key={containerKey(c)}
            on={choice === containerKey(c)}
            onPick={() => onPick(containerKey(c))}
            icon={Container}
            title={c.name}
            tags={[
              c.recommended && !c.proxy_id && !c.managed ? "Recommended" : "",
              runtimeLabel[c.runtime],
              c.managed ? "Read only" : "",
              c.compose ? `Compose · ${c.service || c.compose}` : "",
              c.running ? "" : c.state || "stopped",
            ]}
            hint={
              c.managed
                ? `Runs ${c.managed}: Morche only reads it (sites, status, logs).`
                : `${c.image} · ${containerReach(c)}${c.running ? "" : " · start it before setting it up"}`
            }
            added={c.proxy_id}
            onOpen={onOpenProxy}
          />
        ))}
        {showOther && (
          <Row
            on={choice === "other"}
            onPick={() => onPick("other")}
            icon={SquarePen}
            title="Another container"
            hint="Type its name, if it runs an image Morche didn't recognise."
          />
        )}
      </div>
      {(found.down ?? []).map((rt) => (
        <p key={rt} className="text-caption text-muted-foreground">
          {runtimeLabel[rt as Runtime] ?? rt} is installed but didn't list its
          containers. Is its service running?
        </p>
      ))}
    </>
  )
}

function Row({
  on,
  onPick,
  icon: Icon,
  title,
  tags = [],
  hint,
  disabled,
  added,
  onOpen,
}: {
  on: boolean
  onPick: () => void
  icon: typeof Container
  title: string
  tags?: string[]
  hint: ReactNode
  disabled?: boolean
  added?: string
  onOpen?: (id: string) => void
}) {
  const off = disabled || !!added
  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          on ? "border-brand bg-brand text-primary-foreground" : "border-mist",
          off && "opacity-0",
        )}
      >
        {on && <Check className="size-3" />}
      </span>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-body-sm font-medium">{title}</span>
          {tags.filter(Boolean).map((t) => (
            <span
              key={t}
              className={cn(
                "rounded-full px-1.5 text-caption",
                t === "Recommended"
                  ? "bg-brand-soft text-brand-strong"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {t}
            </span>
          ))}
        </span>
        <span className="block text-caption break-words text-muted-foreground">
          {hint}
        </span>
      </span>
    </>
  )
  const row =
    "flex min-h-14 items-start gap-3 border-b border-border px-3 py-2.5 text-start last:border-b-0"
  if (off) {
    return (
      <div className={cn(row, "text-muted-foreground")} aria-disabled>
        {body}
        {added && (
          <Button
            size="sm"
            variant="outline"
            className="self-center"
            onClick={() => onOpen?.(added)}
          >
            Added · Open
          </Button>
        )}
      </div>
    )
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: row options; radio inputs can't be styled as rows
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={cn(
        row,
        "outline-none focus-visible:bg-subtle",
        on ? "bg-brand-soft/40" : "hover:bg-subtle active:bg-muted",
      )}
    >
      {body}
    </button>
  )
}
