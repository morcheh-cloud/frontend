"use client"

import { Settings2 } from "lucide-react"
import Link from "next/link"
import { isMap, parseDocument } from "yaml"

import { Switch } from "@/components/ui/switch"
import type { DockerEffectiveSettings } from "@/lib/services"

type Defaults = Pick<
  DockerEffectiveSettings,
  | "default_restart"
  | "default_memory_mb"
  | "default_cpus"
  | "default_log_max_mb"
  | "default_log_files"
>

export type ServiceAdds = { service: string; added: string[] }

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}

// Whether any default would add something to a service.
export const hasDefaults = (d: Defaults | undefined) =>
  !!d &&
  (!!d.default_restart ||
    d.default_memory_mb > 0 ||
    d.default_cpus > 0 ||
    d.default_log_max_mb > 0)

const memText = (mb: number) => (mb % 1024 === 0 ? `${mb / 1024}G` : `${mb}M`)

// Adds the workspace's new-project defaults to every service that doesn't
// set them itself, writing only those keys so the rest of the file (and its
// comments) stays as it was. A file that doesn't parse comes back unchanged.
export function withDefaults(
  compose: string,
  d: Defaults | undefined,
): { text: string; adds: ServiceAdds[] } {
  if (!d || !hasDefaults(d)) return { text: compose, adds: [] }
  const doc = parseDocument(compose)
  if (doc.errors.length > 0) return { text: compose, adds: [] }
  const services = doc.get("services", true)
  if (!isMap(services)) return { text: compose, adds: [] }
  const json = obj(obj(doc.toJSON()).services)
  const adds: ServiceAdds[] = []
  for (const name of Object.keys(json)) {
    const s = obj(json[name])
    const deploy = obj(s.deploy)
    const limits = obj(obj(deploy.resources).limits)
    const base = ["services", name]
    const added: string[] = []
    if (d.default_restart && !("restart" in s) && !deploy.restart_policy) {
      doc.setIn([...base, "restart"], d.default_restart)
      added.push(`restart: ${d.default_restart}`)
    }
    if (d.default_memory_mb > 0 && !("mem_limit" in s) && !limits.memory) {
      const m = memText(d.default_memory_mb)
      doc.setIn([...base, "deploy", "resources", "limits", "memory"], m)
      added.push(`memory ${m}`)
    }
    if (d.default_cpus > 0 && !("cpus" in s) && !limits.cpus) {
      const c = String(d.default_cpus)
      doc.setIn([...base, "deploy", "resources", "limits", "cpus"], c)
      added.push(`${c} CPU`)
    }
    if (d.default_log_max_mb > 0 && !("logging" in s)) {
      const files = Math.max(1, d.default_log_files || 1)
      doc.setIn(
        [...base, "logging"],
        doc.createNode({
          driver: "json-file",
          options: {
            "max-size": `${d.default_log_max_mb}m`,
            "max-file": String(files),
          },
        }),
      )
      added.push(`logs ${files} × ${d.default_log_max_mb} MB`)
    }
    if (added.length > 0) adds.push({ service: name, added })
  }
  return {
    text: adds.length ? doc.toString({ lineWidth: 0, nullStr: "" }) : compose,
    adds,
  }
}

// The new-project form's card: the switch, and what each service gets.
export function DefaultsCard({
  defaults,
  adds,
  on,
  onChange,
}: {
  defaults: Defaults
  adds: ServiceAdds[]
  on: boolean
  onChange: (on: boolean) => void
}) {
  const wanted = [
    defaults.default_restart && `restart ${defaults.default_restart}`,
    defaults.default_memory_mb > 0 &&
      `memory ${memText(defaults.default_memory_mb)}`,
    defaults.default_cpus > 0 && `${defaults.default_cpus} CPU`,
    defaults.default_log_max_mb > 0 &&
      `logs ${Math.max(1, defaults.default_log_files || 1)} × ${defaults.default_log_max_mb} MB`,
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <Switch
          id="project-defaults"
          checked={on}
          onCheckedChange={onChange}
          className="mt-0.5"
        />
        <label htmlFor="project-defaults" className="flex flex-col">
          <span className="text-body-sm font-medium">
            Add the production defaults
          </span>
          <span className="text-caption text-muted-foreground">
            {wanted.join(" · ")}, to services that don&apos;t set them.
          </span>
        </label>
      </div>
      {on &&
        (adds.length > 0 ? (
          <ul className="flex flex-col gap-1 border-t border-border pt-2.5">
            {adds.map((a) => (
              <li key={a.service} className="flex flex-col text-caption">
                <span className="font-medium text-foreground">{a.service}</span>
                <span className="text-muted-foreground">
                  + {a.added.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-border pt-2.5 text-caption text-ash">
            Nothing to add: every service sets these already (or the file has no
            services yet).
          </p>
        ))}
      <Link
        href="/containers/settings#docker-settings-new-projects"
        className="flex w-fit items-center gap-1 text-caption text-brand hover:underline max-md:min-h-11 max-md:items-center"
      >
        <Settings2 className="size-3" />
        Change the defaults
      </Link>
    </div>
  )
}
