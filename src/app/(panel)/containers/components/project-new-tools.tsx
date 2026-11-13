"use client"

import {
  CircleCheck,
  CircleX,
  FileCode,
  KeyRound,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react"
import { useState } from "react"
import { stringify } from "yaml"

import { YamlEditor } from "@/app/(panel)/ansible/components/yaml-editor"
import { Button } from "@/components/ui/button"
import type { DockerProjectCheck } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  envReport,
  isSecretName,
  newSecret,
  parseEnv,
  setEnv,
} from "./env-vars"

// ---- .env helper ----

// What the compose file reads that .env lacks, and secrets still holding a
// placeholder, with one-click fixes. Nothing to say = nothing shown.
export function EnvHelper({
  compose,
  env,
  onEnv,
  showEnv,
}: {
  compose: string
  env: string
  onEnv: (env: string) => void
  // Switch the editor to .env so the change is in sight.
  showEnv: () => void
}) {
  const r = envReport(compose, env)
  const values = parseEnv(env)
  const missingSecrets = r.missing.filter((v) => isSecretName(v.name))
  const toGenerate = [
    ...new Set([...r.weak, ...missingSecrets.map((v) => v.name)]),
  ]
  if (r.used.length === 0 && r.weak.length === 0 && r.unused.length === 0)
    return null
  const allSet = r.missing.length === 0 && r.weak.length === 0

  const addMissing = () => {
    onEnv(
      setEnv(
        env,
        r.missing.map((v) => [v.name, isSecretName(v.name) ? newSecret() : ""]),
      ),
    )
    showEnv()
  }
  const generate = () => {
    onEnv(
      setEnv(
        env,
        toGenerate.map((n) => [n, newSecret()]),
      ),
    )
    showEnv()
  }

  return (
    <section
      aria-label="Variables"
      className="flex flex-col gap-3 rounded-xl border border-border p-3"
    >
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 shrink-0 text-ash" />
        <span className="text-body-sm font-medium">Variables</span>
        <span className="ms-auto text-caption text-muted-foreground">
          {allSet
            ? `${r.used.length} read, all set`
            : `${r.used.length} read by the compose file`}
        </span>
      </div>
      {r.missing.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-caption text-muted-foreground">
            Not in .env
          </span>
          <ul className="flex flex-wrap gap-1.5">
            {r.missing.map((v) => (
              <li
                key={v.name}
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-caption",
                  v.required
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-foreground",
                )}
                title={
                  v.required
                    ? "Compose refuses to start without it"
                    : "Read as empty when missing"
                }
              >
                {v.name}
                {v.required && " · required"}
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.weak.length > 0 && (
        <p className="flex gap-1.5 text-caption text-warning">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {r.weak.map((n, i) => (
              <span key={n}>
                {i > 0 && ", "}
                <code>{n}</code>
              </span>
            ))}{" "}
            {r.weak.length > 1 ? "hold" : "holds"}{" "}
            {r.weak.some((n) => values.get(n)?.trim())
              ? "a placeholder"
              : "nothing"}
            : give {r.weak.length > 1 ? "them" : "it"} a real secret.
          </span>
        </p>
      )}
      {(r.missing.length > 0 || toGenerate.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {r.missing.length > 0 && (
            <Button size="sm" variant="outline" onClick={addMissing}>
              <Plus />
              Add {r.missing.length > 1 ? `${r.missing.length} to` : "to"} .env
            </Button>
          )}
          {toGenerate.length > 0 && (
            <Button size="sm" variant="outline" onClick={generate}>
              <KeyRound />
              Generate {toGenerate.length > 1 ? "secrets" : "a secret"}
            </Button>
          )}
        </div>
      )}
      {r.missing.length > 0 && missingSecrets.length > 0 && (
        <p className="text-caption text-muted-foreground">
          Secrets get a random 32-character value; the rest are added empty for
          you to fill in.
        </p>
      )}
      {r.unused.length > 0 && (
        <p className="text-caption text-muted-foreground">
          Not read by the compose file:{" "}
          {r.unused.map((n, i) => (
            <span key={n}>
              {i > 0 && ", "}
              <code className="text-foreground">{n}</code>
            </span>
          ))}
          .
        </p>
      )}
    </section>
  )
}

// ---- Check result ----

function finalYaml(r: DockerProjectCheck) {
  if (!r.config) return ""
  if (r.format !== "json") return r.config
  try {
    return stringify(JSON.parse(r.config), { lineWidth: 0 })
  } catch {
    return r.config
  }
}

export function CheckResult({
  result,
  stale,
  onClose,
}: {
  result: DockerProjectCheck
  stale: boolean
  onClose: () => void
}) {
  const [showFinal, setShowFinal] = useState(false)
  const busy = result.ports.filter((p) => p.in_use || p.duplicate)
  const good = result.ok && !result.name_problem && busy.length === 0
  const Icon = !result.ok ? CircleX : good ? CircleCheck : TriangleAlert
  return (
    <section
      aria-label="Check result"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3 [contain:inline-size]",
        !result.ok
          ? "border-destructive/40 bg-destructive/5"
          : good
            ? "border-border"
            : "border-warning/40 bg-warning/5",
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            !result.ok
              ? "text-destructive"
              : good
                ? "text-success"
                : "text-warning",
          )}
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-body-sm font-medium">
            {!result.ok
              ? "Compose refused the files"
              : good
                ? "Ready to create"
                : "Compose read the files, with something to look at"}
          </span>
          <span className="text-caption text-muted-foreground">
            {result.compose_command
              ? `Checked with ${result.compose_command} config`
              : "No compose command found on the server"}
            {stale && " · changed since the check"}
          </span>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Hide the check"
          onClick={onClose}
          className="ms-auto"
        >
          <X />
        </Button>
      </div>
      {result.problem && (
        <pre className="overflow-x-auto rounded-lg bg-background px-3 py-2 font-mono text-caption whitespace-pre-wrap text-destructive">
          {result.problem}
        </pre>
      )}
      {result.name_problem && (
        <p className="text-body-sm text-destructive">{result.name_problem}</p>
      )}
      {result.ok && result.services.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-caption text-muted-foreground">
            {result.services.length === 1
              ? "1 service"
              : `${result.services.length} services`}
          </span>
          <ul className="flex flex-col gap-0.5 text-body-sm">
            {result.services.map((s) => (
              <li key={s.name} className="flex min-w-0 gap-2">
                <span className="shrink-0 font-medium">{s.name}</span>
                <span className="truncate text-muted-foreground">
                  {s.build ? "built from a Dockerfile" : (s.image ?? "")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.ok && result.ports.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-caption text-muted-foreground">
            Ports on the server
          </span>
          <ul className="flex flex-col gap-1 text-body-sm">
            {result.ports.map((p) => (
              <li
                key={`${p.service}-${p.host_ip}-${p.published}-${p.protocol}`}
                className="flex flex-wrap items-center gap-x-2"
              >
                <span className="font-mono">
                  {p.host_ip ? `${p.host_ip}:` : ""}
                  {p.published}
                  {p.protocol !== "tcp" ? `/${p.protocol}` : ""}
                </span>
                <span className="text-ash">→</span>
                <span className="text-muted-foreground">
                  {p.service}:{p.target}
                </span>
                {p.in_use && (
                  <span className="rounded-md bg-destructive/10 px-1.5 text-caption text-destructive">
                    In use on the server
                  </span>
                )}
                {p.duplicate && (
                  <span className="rounded-md bg-warning/15 px-1.5 text-caption text-warning">
                    Twice in this file
                  </span>
                )}
              </li>
            ))}
          </ul>
          {!result.ports_read && (
            <p className="text-caption text-muted-foreground">
              Couldn't read the server's open ports (no <code>ss</code>), so
              they weren't compared.
            </p>
          )}
          {busy.some((p) => p.in_use) && (
            <p className="text-caption text-muted-foreground">
              A port in use makes the container fail to start: pick another host
              port (the number before the colon).
            </p>
          )}
        </div>
      )}
      {result.ok && result.config && (
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            onClick={() => setShowFinal((v) => !v)}
            aria-expanded={showFinal}
          >
            <FileCode />
            {showFinal ? "Hide the final file" : "Show the final file"}
          </Button>
          {showFinal && (
            <div className="overflow-hidden rounded-lg border border-border">
              <YamlEditor
                kind="compose"
                value={finalYaml(result)}
                readOnly
                height="20rem"
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ---- Draft ----

export type ProjectDraft = {
  name: string
  compose: string
  env: string
  start: boolean
  at: string
}

export function draftKey(server: string, template?: string) {
  return `morcheh.docker.new-project.${server}.${template ?? "blank"}`
}

export function readDraft(key: string): ProjectDraft | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<ProjectDraft>
    if (typeof d.compose !== "string" || typeof d.name !== "string") return null
    return {
      name: d.name,
      compose: d.compose,
      env: typeof d.env === "string" ? d.env : "",
      start: d.start !== false,
      at: typeof d.at === "string" ? d.at : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function writeDraft(key: string, d: ProjectDraft | null) {
  try {
    if (d) localStorage.setItem(key, JSON.stringify(d))
    else localStorage.removeItem(key)
  } catch {
    // Storage blocked or full: the draft just isn't kept.
  }
}
