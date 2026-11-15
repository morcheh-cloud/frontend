"use client"

import {
  Boxes,
  Check,
  ChevronLeft,
  CircleCheck,
  CircleX,
  Copy,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import {
  useCheckProject,
  useCreateProject,
  useDockerFleet,
  useDockerNetworks,
  useDockerProjects,
} from "@/app/(panel)/containers/api"
import { projectHref } from "@/app/(panel)/containers/components/project-actions"
import {
  Callout,
  Section,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { SearchBox } from "@/app/(panel)/servers/[id]/components/parts"
import { Field, Segmented } from "@/app/(panel)/servers/components/fields"
import { OsTile } from "@/app/(panel)/servers/components/meta"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { AsideCard, EditorPage, SummaryList } from "@/components/editor-page"
import { useJobList } from "@/components/jobs/api"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { JobBar, progressText } from "@/components/jobs/meta"
import { useWorkspace } from "@/components/panel/workspace"
import { SecretInput } from "@/components/secret-input"
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
import { useBack } from "@/hooks/useBack"
import { ApiError, fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  Database,
  DatabaseBody,
  DockerFleetServer,
  DockerProjectCheck,
  Job,
  ServerOS,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCheckDatabase, useCreateDatabase } from "../../api"
import { DirtyGuard } from "../database-editor"
import { EngineTile, statusMeta } from "../meta"
import {
  composeOf,
  type DeploySpec,
  type Edition,
  identPattern,
  imageOf,
  type Kind,
  kindOfEngine,
  type Memory,
  memories,
  newPassword,
  type Publish,
  passwordProblem,
  projectPattern,
  recipeOf,
  recipes,
  slugOf,
} from "./recipes"

type Form = {
  kind: Kind
  version: string
  edition: Edition
  server: string
  name: string
  // Follows the name until someone types their own.
  project: string
  projectTyped: boolean
  username: string
  password: string
  dbname: string
  publish: Publish
  hostPort: string
  network: string
  memory: Memory
  interval: number
  description: string
}

type Errors = Record<string, string>

const intervals = [
  { value: 15, label: "Every 15 s" },
  { value: 30, label: "Every 30 s" },
  { value: 60, label: "Every minute" },
  { value: 300, label: "Every 5 minutes" },
  { value: 900, label: "Every 15 minutes" },
]

const notReady: Record<string, string> = {
  "not-installed": "No Docker",
  stopped: "Engine stopped",
  "no-access": "Can't reach Docker",
  error: "Engine error",
  offline: "Offline",
}

function startForm(kind: Kind, server: string): Form {
  const r = recipeOf[kind]
  return {
    kind,
    version: r.versions[0].tag,
    edition: "Express",
    server,
    name: "",
    project: "",
    projectTyped: false,
    username: r.user,
    password: newPassword(),
    dbname: "",
    publish: "none",
    hostPort: String(r.port),
    network: "",
    memory: kind === "mssql" ? "2g" : "1g",
    interval: 60,
    description: "",
  }
}

const specOf = (f: Form): DeploySpec => ({
  kind: f.kind,
  version: f.version,
  edition: f.edition,
  project: f.project || "my-database",
  username: recipeOf[f.kind].userFixed ? recipeOf[f.kind].user : f.username,
  dbname: recipeOf[f.kind].firstDatabase ? f.dbname.trim() : "",
  publish: f.publish,
  hostPort: Number(f.hostPort) || recipeOf[f.kind].port,
  network: f.network,
  memory: f.memory,
})

// /databases/new?source=container: writes a compose project for one database
// on a server with Docker, starts it, and adds it to Databases (watched
// through the server, straight into the container).
export function DeployEditor({
  phone,
  lead,
  serverId,
  engine,
}: {
  phone: boolean
  lead: ReactNode
  serverId?: string
  engine?: string
}) {
  const { workspace } = useWorkspace()
  const { serverLevel } = useAccess()
  const fleet = useDockerFleet()
  const all = (fleet.data?.servers ?? []).filter(
    (s) => !workspace || s.workspace_id === workspace.id,
  )
  const allowed = (s: DockerFleetServer) =>
    atLeast(serverLevel(s.server_id, s.workspace_id), "engineer")
  const usable = all.filter((s) => s.state === "ready" && allowed(s))

  const [form, setForm] = useState<Form>(() =>
    startForm(kindOfEngine(engine) ?? "postgres", serverId ?? ""),
  )
  const [errors, setErrors] = useState<Errors>({})
  const [checked, setChecked] = useState<DockerProjectCheck | null>(null)
  const [run, setRun] = useState<Run | null>(null)
  const [touched, setTouched] = useState(false)

  // One usable server: pick it.
  const only = usable.length === 1 ? usable[0].server_id : ""
  useEffect(() => {
    if (only && !form.server) setForm((f) => ({ ...f, server: only }))
  }, [only, form.server])

  const projects = useDockerProjects(form.server || undefined)
  const networks = useDockerNetworks(form.server, !!form.server)
  const check = useCheckProject()
  const createProject = useCreateProject()
  const createDatabase = useCreateDatabase()

  const r = recipeOf[form.kind]
  const spec = specOf(form)
  const compose = composeOf(spec)
  const server = all.find((s) => s.server_id === form.server)
  const back = useBack("/databases")

  function set(patch: Partial<Form>) {
    setForm((f) => ({ ...f, ...patch }))
    setTouched(true)
    setChecked(null)
    setErrors((e) => {
      const next = { ...e }
      for (const k of Object.keys(patch)) delete next[k]
      if ("name" in patch) delete next.project
      return next
    })
  }

  function pickKind(kind: Kind) {
    const next = recipeOf[kind]
    setForm((f) => ({
      ...f,
      kind,
      version: next.versions[0].tag,
      username:
        next.userFixed || f.username === recipeOf[f.kind].user
          ? next.user
          : f.username,
      hostPort:
        f.hostPort === String(recipeOf[f.kind].port)
          ? String(next.port)
          : f.hostPort,
      memory:
        next.minMemory && memMb(f.memory) < next.minMemory ? "2g" : f.memory,
    }))
    setTouched(true)
    setChecked(null)
    setErrors({})
  }

  function validate(): Errors {
    const e: Errors = {}
    if (!form.server) e.server = "Pick the server it runs on."
    if (!form.name.trim()) e.name = "Give it a name."
    if (!form.project) e.project = "Needed for the folder and container."
    else if (!projectPattern.test(form.project))
      e.project =
        "Small letters, digits, - and _ only, starting with a letter or digit."
    else if (projects.data?.some((p) => p.name === form.project))
      e.project = "A project with this name is already on the server."
    else if (
      fleet.data?.containers.some(
        (c) =>
          c.server_id === form.server &&
          c.name.replace(/^\//, "") === form.project,
      )
    )
      e.project = "A container with this name is already on the server."
    if (!r.userFixed && !identPattern.test(form.username))
      e.username = "Letters, digits and _, starting with a letter."
    const pw = passwordProblem(form.password, form.kind)
    if (pw) e.password = pw
    if (
      r.firstDatabase &&
      form.dbname &&
      !identPattern.test(form.dbname.trim())
    )
      e.dbname = "Letters, digits and _, starting with a letter."
    if (form.publish !== "none") {
      const n = Number(form.hostPort)
      if (!Number.isInteger(n) || n < 1 || n > 65535)
        e.hostPort = "A port from 1 to 65535."
    }
    return e
  }

  function showErrors(e: Errors) {
    setErrors(e)
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>("#deploy-form [aria-invalid=true]")
        ?.focus(),
    )
  }

  // What the server says about the files: compose's own check + ports.
  function problemsOf(c: DockerProjectCheck): Errors {
    const e: Errors = {}
    if (c.name_problem) e.project = c.name_problem
    const port = c.ports.find((p) => p.in_use || p.duplicate)
    if (port)
      e.hostPort = `Port ${port.published} is already in use on the server.`
    return e
  }

  async function runCheck(): Promise<DockerProjectCheck | null> {
    const e = validate()
    if (Object.keys(e).length) {
      showErrors(e)
      return null
    }
    try {
      const c = await check.mutateAsync({
        server: form.server,
        name: form.project,
        compose,
        env: `DB_PASSWORD=${form.password}\n`,
      })
      setChecked(c)
      const p = problemsOf(c)
      if (Object.keys(p).length) showErrors(p)
      return c
    } catch (err) {
      toast.error((err as Error).message)
      return null
    }
  }

  async function deploy() {
    const c = await runCheck()
    if (!c?.ok || Object.keys(problemsOf(c)).length) {
      if (c && !c.ok && !c.problem) toast.error("The server refused the files")
      return
    }
    let job: Job | undefined
    try {
      const res = await createProject.mutateAsync({
        server: form.server,
        name: form.project,
        compose,
        env: `DB_PASSWORD=${form.password}\n`,
        start: true,
      })
      job = res.job
    } catch (err) {
      const fields = fieldErrors(err)
      if (fields.name) showErrors({ project: fields.name })
      else toast.error((err as Error).message)
      return
    }
    const started: Run = {
      at: "database",
      server: form.server,
      project: form.project,
      name: form.name.trim(),
      jobId: job?.id,
      tries: 0,
    }
    setRun(started)
    saveDatabase(started)
  }

  function databaseBody(): DatabaseBody {
    return {
      name: form.name.trim(),
      engine: r.engine,
      mode: "server",
      server_id: form.server,
      container: form.project,
      host: "",
      port: 0,
      username: spec.username,
      password: form.password,
      dbname: spec.dbname || r.dbname,
      tls: "disable",
      ca_cert: "",
      interval_seconds: form.interval,
      description:
        form.description.trim() ||
        `Started by Morche: compose project ${form.project} on ${server?.name ?? "the server"}.`,
    }
  }

  function saveDatabase(at: Run) {
    setRun({ ...at, at: "database", failed: undefined })
    createDatabase.mutate(databaseBody(), {
      onSuccess: (d) =>
        setRun(
          (cur) =>
            cur && {
              ...cur,
              database: d,
              at: cur.jobId ? "start" : "answer",
              failed: undefined,
            },
        ),
      onError: (err) =>
        setRun((cur) => cur && { ...cur, failed: (err as Error).message }),
    })
  }

  const submitting = check.isPending || createProject.isPending
  const disabled = submitting || usable.length === 0

  if (run) {
    return (
      <DeployProgress
        run={run}
        setRun={setRun}
        phone={phone}
        kind={form.kind}
        serverName={server?.name ?? ""}
        onRetryDatabase={() => saveDatabase(run)}
        onAnother={() => {
          setRun(null)
          setForm(startForm(form.kind, form.server))
          setTouched(false)
        }}
      />
    )
  }

  const sections = (
    <>
      {lead}
      <Section
        title="Engine"
        hint="Which database to start, and its version."
        phone={phone}
      >
        <div
          role="radiogroup"
          aria-label="Engine"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {recipes.map((x) => {
            const on = x.kind === form.kind
            return (
              // biome-ignore lint/a11y/useSemanticElements: option tiles
              <button
                key={x.kind}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pickKind(x.kind)}
                className={cn(
                  "flex min-h-14 min-w-0 items-center gap-3 rounded-xl border p-3 text-start transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on
                    ? "border-brand/40 bg-brand-soft/60"
                    : "border-border hover:bg-subtle",
                )}
              >
                <EngineTile
                  engine={x.engine}
                  flavor={x.flavor}
                  className="size-9"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-medium">
                    {x.label}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {x.blurb}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Version" hint={`Image ${imageOf(spec)}`}>
            {() => (
              <Segmented
                label="Version"
                value={form.version}
                onChange={(version) => set({ version })}
                options={r.versions.map((v) => ({
                  value: v.tag,
                  label: v.label,
                }))}
              />
            )}
          </Field>
          {form.kind === "mssql" && (
            <Field
              label="Edition"
              hint={
                form.edition === "Express"
                  ? "Free for production, up to 10 GB per database."
                  : "Every feature, free, but not for production use."
              }
            >
              {() => (
                <Segmented
                  label="Edition"
                  value={form.edition}
                  onChange={(edition) => set({ edition })}
                  options={[
                    { value: "Express", label: "Express" },
                    { value: "Developer", label: "Developer" },
                  ]}
                />
              )}
            </Field>
          )}
        </div>
      </Section>

      <Section
        title="Where it runs"
        hint="A server with Docker or Podman. Morche reaches the database through its SSH."
        phone={phone}
      >
        <ServerPicks
          loading={fleet.isPending}
          servers={all}
          allowed={allowed}
          value={form.server}
          onChange={(s) => set({ server: s, network: "" })}
          error={errors.server}
          needMb={Math.max(r.minMemory ?? 0, 256)}
          phone={phone}
        />
      </Section>

      <Section
        title="Name"
        hint="How it shows in Morche, and its project on the server."
        phone={phone}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Name in Morche" error={errors.name}>
            {(p) => (
              <Input
                {...p}
                value={form.name}
                placeholder="Orders database"
                maxLength={100}
                onChange={(e) => {
                  const name = e.target.value
                  set(
                    form.projectTyped
                      ? { name }
                      : { name, project: slugOf(name) },
                  )
                }}
              />
            )}
          </Field>
          <Field
            label="Project and container"
            error={errors.project}
            hint="The compose project's folder and the container's name."
          >
            {(p) => (
              <Input
                {...p}
                value={form.project}
                placeholder="orders-db"
                maxLength={60}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono"
                onChange={(e) =>
                  set({
                    project: e.target.value.toLowerCase(),
                    projectTyped: e.target.value !== "",
                  })
                }
              />
            )}
          </Field>
          {r.firstDatabase && (
            <Field
              label="First database"
              error={errors.dbname}
              hint="Optional. Created empty on the first start, for your app."
            >
              {(p) => (
                <Input
                  {...p}
                  value={form.dbname}
                  placeholder="orders"
                  maxLength={63}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="font-mono"
                  onChange={(e) => set({ dbname: e.target.value })}
                />
              )}
            </Field>
          )}
        </div>
      </Section>

      <Section
        title="Sign-in"
        hint="The admin login. Written to the project's .env and kept encrypted in Morche."
        phone={phone}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {r.user ? (
            <Field
              label="Admin user"
              error={errors.username}
              hint={
                r.userFixed ? "This image always uses this name." : undefined
              }
            >
              {(p) => (
                <Input
                  {...p}
                  value={r.userFixed ? r.user : form.username}
                  readOnly={r.userFixed}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={cn("font-mono", r.userFixed && "text-ash")}
                  onChange={(e) => set({ username: e.target.value })}
                />
              )}
            </Field>
          ) : (
            <Field label="Admin user" hint="Redis has a password only.">
              {(p) => (
                <Input
                  {...p}
                  value="default"
                  readOnly
                  className="font-mono text-ash"
                />
              )}
            </Field>
          )}
          <Field
            label="Password"
            error={errors.password}
            hint="Made up for you. Copy it if your app needs it, or see it later under Credentials."
          >
            {(p) => (
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <SecretInput
                    {...p}
                    value={form.password}
                    autoComplete="new-password"
                    onChange={(e) => set({ password: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 md:size-10"
                  aria-label="Make a new password"
                  title="Make a new password"
                  onClick={() => set({ password: newPassword() })}
                >
                  <RefreshCw />
                </Button>
              </div>
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Network and storage"
        hint="Who can reach it, and where its data lives."
        phone={phone}
      >
        <Field
          label="Port on the server"
          hint={
            form.publish === "none"
              ? "Nothing outside Docker can reach it. Apps join its network instead; Morche goes in through SSH."
              : form.publish === "local"
                ? "Programs on the server reach it at 127.0.0.1. Nothing from outside."
                : undefined
          }
        >
          {() => (
            <Segmented
              label="Port on the server"
              value={form.publish}
              onChange={(publish) => set({ publish })}
              options={[
                { value: "none", label: "Not published" },
                { value: "local", label: "This server only" },
                { value: "all", label: "Every address" },
              ]}
            />
          )}
        </Field>
        {form.publish !== "none" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="Port"
              error={errors.hostPort}
              hint={`Inside the container it's ${r.port}.`}
            >
              {(p) => (
                <Input
                  {...p}
                  value={form.hostPort}
                  inputMode="numeric"
                  className="font-mono"
                  onChange={(e) =>
                    set({ hostPort: e.target.value.replace(/\D/g, "") })
                  }
                />
              )}
            </Field>
          </div>
        )}
        {form.publish === "all" && (
          <Callout icon={<TriangleAlert />} tone="warning">
            Anyone who can reach the server can try to sign in. Docker opens the
            port past ufw and firewalld; limit it in the server's Firewall ›
            Containers tab, or keep it on this server only.
          </Callout>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Also join a network"
            hint="Apps on that network reach it by the container's name."
          >
            {(p) => (
              <Select
                value={form.network || "none"}
                onValueChange={(v) =>
                  set({ network: !v || v === "none" ? "" : String(v) })
                }
                disabled={!form.server}
              >
                <SelectTrigger id={p.id} className="w-full">
                  <SelectValue>
                    {(v: string) => (v === "none" ? "Only its own" : v)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Only its own</SelectItem>
                  {(networks.data ?? [])
                    .filter((n) => !n.builtin)
                    .map((n) => (
                      <SelectItem key={n.id} value={n.name}>
                        <span className="font-mono">{n.name}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field
            label="Data"
            hint="Kept when the container is recreated or updated."
          >
            {(p) => (
              <Input
                {...p}
                readOnly
                value={`Volume ${spec.project}_data`}
                className="font-mono text-ash"
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Limits"
        hint="The most memory it may use. Restarts by itself unless you stop it."
        phone={phone}
      >
        <Segmented
          label="Memory limit"
          value={form.memory}
          onChange={(memory) => set({ memory })}
          options={memories.map((m) => ({ value: m.value, label: m.label }))}
        />
        {r.minMemory && memMb(form.memory) < r.minMemory && (
          <Callout icon={<TriangleAlert />} tone="warning">
            SQL Server won't start with less than 2 GB.
          </Callout>
        )}
      </Section>

      <Section
        title="Monitoring"
        hint="How often Morche checks it, and a note for the team."
        phone={phone}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Checks">
            {(p) => (
              <Select
                value={String(form.interval)}
                onValueChange={(v) => set({ interval: Number(v) })}
              >
                <SelectTrigger id={p.id} className="w-full">
                  <SelectValue>
                    {(v: string) =>
                      intervals.find((i) => String(i.value) === v)?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {intervals.map((i) => (
                    <SelectItem key={i.value} value={String(i.value)}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
        </div>
        <Field label="Notes">
          {(p) => (
            <Textarea
              {...p}
              value={form.description}
              placeholder="What it's for, who to call…"
              maxLength={500}
              className="min-h-20"
              onChange={(e) => set({ description: e.target.value })}
            />
          )}
        </Field>
      </Section>

      <Section
        title="Compose file"
        hint="What Morche writes on the server. The password stays in .env."
        phone={phone}
      >
        <ComposePreview text={compose} />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="max-md:h-11"
            disabled={disabled}
            onClick={runCheck}
          >
            {check.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ShieldCheck />
            )}
            Check on the server
          </Button>
          {checked && <CheckLine check={checked} />}
        </div>
        {checked?.problem && (
          <pre className="max-h-48 overflow-auto rounded-lg bg-subtle p-3 font-mono text-caption whitespace-pre-wrap text-destructive [contain:inline-size]">
            {checked.problem}
          </pre>
        )}
      </Section>
    </>
  )

  const startLabel = createProject.isPending
    ? "Starting…"
    : check.isPending
      ? "Checking…"
      : "Start database"

  if (phone) {
    return (
      <div
        id="deploy-form"
        className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col"
      >
        <DirtyGuard dirty={touched && !submitting} />
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            Add database
          </h1>
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-3 text-brand"
            disabled={disabled}
            onClick={deploy}
          >
            {submitting ? "Starting…" : "Start"}
          </Button>
        </header>
        <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {sections}
        </div>
      </div>
    )
  }

  return (
    <div id="deploy-form">
      <DirtyGuard dirty={touched && !submitting} />
      <EditorPage
        icon={
          <EngineTile engine={r.engine} flavor={r.flavor} className="size-9" />
        }
        title="Add database"
        dirty={touched}
        status={`New ${r.label} in a container`}
        onSave={disabled ? undefined : deploy}
        actions={
          <>
            <Button
              variant="outline"
              className="h-9"
              render={<Link href="/databases" />}
              nativeButton={false}
            >
              Cancel
            </Button>
            <Button className="h-9" disabled={disabled} onClick={deploy}>
              {submitting ? <Loader2 className="animate-spin" /> : <Play />}
              {startLabel}
            </Button>
          </>
        }
        aside={
          <>
            <AsideCard title="Summary">
              <SummaryList
                rows={[
                  [
                    "Engine",
                    `${r.label} ${r.versions.find((v) => v.tag === form.version)?.label ?? ""}`,
                  ],
                  ["Server", server?.name ?? ""],
                  ["Container", form.project, true],
                  [
                    "Apps reach it",
                    form.publish === "none"
                      ? form.network
                        ? `On ${form.network}`
                        : "On its own network"
                      : form.publish === "local"
                        ? `127.0.0.1:${spec.hostPort}`
                        : `Any address, port ${spec.hostPort}`,
                  ],
                  [
                    "Memory",
                    memories.find((m) => m.value === form.memory)?.label,
                  ],
                  [
                    "Checked",
                    intervals
                      .find((i) => i.value === form.interval)
                      ?.label.toLowerCase(),
                  ],
                ]}
              />
            </AsideCard>
            <AsideCard title="What happens">
              <ol className="grid gap-2.5 text-caption text-muted-foreground">
                {[
                  "Morche checks the files and the port on the server.",
                  "It writes docker-compose.yml and .env into a new project.",
                  "The engine pulls the image and starts the container.",
                  "The database is added here and watched through SSH.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <span className="pt-px">{t}</span>
                  </li>
                ))}
              </ol>
            </AsideCard>
          </>
        }
      >
        {sections}
      </EditorPage>
    </div>
  )
}

const memMb = (m: Memory) =>
  (memories.find((x) => x.value === m) as { mb?: number } | undefined)?.mb ??
  Number.POSITIVE_INFINITY

function ServerPicks({
  loading,
  servers,
  allowed,
  value,
  onChange,
  error,
  needMb,
  phone,
}: {
  loading: boolean
  servers: DockerFleetServer[]
  allowed: (s: DockerFleetServer) => boolean
  value: string
  onChange: (id: string) => void
  error?: string
  // What the engine needs to run well (MB).
  needMb?: number
  phone: boolean
}) {
  const [browsing, setBrowsing] = useState(false)
  const [q, setQ] = useState("")
  const list = useRef<HTMLDivElement>(null)
  if (loading) {
    return <Skeleton className="h-16 w-full rounded-xl" />
  }
  const usable = (s: DockerFleetServer) => s.state === "ready" && allowed(s)
  const ready = servers.filter(usable).sort(byName)
  if (!ready.length) {
    return (
      <Callout icon={<Boxes />}>
        {servers.length === 0
          ? "None of your servers runs Docker or Podman yet. "
          : "None of the servers with Docker is one you can deploy to (Engineer access and a running engine are needed). "}
        <Link
          href="/containers/environments"
          className="text-brand underline-offset-4 hover:underline"
        >
          Open Environments
        </Link>
      </Callout>
    )
  }
  const picked = servers.find((s) => s.server_id === value)
  const errorLine = error && (
    <p data-error className="text-caption text-destructive">
      {error}
    </p>
  )

  // A server is picked: show it, and the list only on Change.
  if (picked && !browsing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-brand/40 bg-brand-soft/40 p-3">
          <ServerFacts s={picked} needMb={needMb} big />
          <Button
            type="button"
            variant="outline"
            className="shrink-0 md:h-9"
            onClick={() => {
              setQ("")
              setBrowsing(true)
            }}
          >
            {ready.length > 1 ? "Change" : "Details"}
          </Button>
        </div>
        {errorLine}
      </div>
    )
  }

  const needle = q.trim().toLowerCase()
  const match = (s: DockerFleetServer) =>
    !needle ||
    [s.name, s.address, s.os_id ?? "", s.podman ? "podman" : "docker"].some(
      (t) => t.toLowerCase().includes(needle),
    )
  const shown = ready.filter(match)
  const blocked = servers.filter((s) => !usable(s) && match(s)).sort(byName)
  const choose = (id: string) => {
    onChange(id)
    setBrowsing(false)
    setQ("")
  }
  // Up/down move between the servers, like a native radio group.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    const radios = [
      ...(list.current?.querySelectorAll<HTMLButtonElement>(
        "[role=radio]:not(:disabled)",
      ) ?? []),
    ]
    if (!radios.length) return
    e.preventDefault()
    const at = radios.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      e.key === "ArrowDown"
        ? radios[Math.min(at + 1, radios.length - 1)]
        : radios[Math.max(at - 1, 0)]
    next.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      {ready.length > 5 && (
        <div className="flex items-center gap-3">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Search name, address or OS"
            label="Search servers"
            className="min-w-0 flex-1 md:max-w-80"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                if (shown[0]) choose(shown[0].server_id)
              } else onKeyDown(e)
            }}
          />
          <span className="hidden text-caption whitespace-nowrap text-muted-foreground sm:inline">
            {needle ? `${shown.length} of ${ready.length}` : ready.length} ready
          </span>
        </div>
      )}
      <div
        ref={list}
        role="radiogroup"
        aria-label="Server"
        aria-invalid={error ? true : undefined}
        onKeyDown={onKeyDown}
        className={cn(
          "overflow-y-auto overscroll-contain rounded-xl border border-border",
          phone ? "max-h-[60dvh]" : "max-h-[23rem]",
        )}
      >
        {shown.length === 0 && (
          <p className="px-4 py-6 text-center text-body-sm text-muted-foreground">
            No ready server matches “{q.trim()}”.
          </p>
        )}
        <ul className="divide-y divide-border">
          {shown.map((s) => (
            <li key={s.server_id}>
              <ServerRow
                s={s}
                on={s.server_id === value}
                needMb={needMb}
                onPick={() => choose(s.server_id)}
              />
            </li>
          ))}
        </ul>
        {blocked.length > 0 && (
          <>
            <p className="sticky top-0 border-y border-border bg-subtle px-3 py-1.5 text-caption text-muted-foreground">
              Can't deploy here · {blocked.length}
            </p>
            <ul className="divide-y divide-border">
              {blocked.map((s) => (
                <li key={s.server_id}>
                  <ServerRow
                    s={s}
                    on={false}
                    why={
                      s.state !== "ready"
                        ? (notReady[s.state] ?? s.state)
                        : "Needs Engineer access"
                    }
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {errorLine}
        {picked && (
          <Button
            type="button"
            variant="ghost"
            className="ms-auto md:h-8"
            onClick={() => setBrowsing(false)}
          >
            Keep {picked.name}
          </Button>
        )}
      </div>
    </div>
  )
}

const byName = (a: DockerFleetServer, b: DockerFleetServer) =>
  a.name.localeCompare(b.name)

const osOf = (s: DockerFleetServer): ServerOS => ({
  id: s.os_id ?? "",
  name: "",
  version: "",
  family: "",
  arch: "",
  kernel: "",
})

// Free memory on a server, and whether it's short for this engine.
function memoryOf(s: DockerFleetServer, needMb?: number) {
  const h = s.host
  if (!h?.mem_total) return null
  const free = Math.max(0, h.mem_total - h.mem_used)
  return {
    free,
    used: Math.min(100, (h.mem_used / h.mem_total) * 100),
    short: !!needMb && free < needMb * 1024 * 1024,
  }
}

function ServerFacts({
  s,
  needMb,
  why,
  big,
}: {
  s: DockerFleetServer
  needMb?: number
  why?: string
  big?: boolean
}) {
  const mem = memoryOf(s, needMb)
  const engine = `${s.podman ? "Podman" : "Docker"}${s.version ? ` ${s.version}` : ""}`
  return (
    <>
      <OsTile os={osOf(s)} className={big ? "size-10 rounded-xl" : "size-8"} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium">
          {s.name}
        </span>
        <span className="block truncate text-caption text-muted-foreground">
          <span className="font-mono">{s.address}</span>
          {" · "}
          {why ?? engine}
          {!why && s.running > 0 && ` · ${s.running} running`}
        </span>
      </span>
      {mem && !why && (
        <span
          className={cn(
            "hidden w-28 shrink-0 flex-col gap-1 text-end text-caption sm:flex",
            mem.short ? "text-warning" : "text-muted-foreground",
          )}
          title={
            mem.short
              ? `Less free memory than this engine needs (${needMb} MB)`
              : undefined
          }
        >
          <span className="truncate tabular-nums">
            {mem.short && (
              <TriangleAlert className="me-1 inline size-3 align-[-2px]" />
            )}
            {formatSize(mem.free)} free
          </span>
          <span className="block h-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "block h-full rounded-full",
                mem.short || mem.used >= 90
                  ? "bg-warning"
                  : "bg-muted-foreground/40",
              )}
              style={{ width: `${Math.max(mem.used, 2)}%` }}
            />
          </span>
        </span>
      )}
    </>
  )
}

function ServerRow({
  s,
  on,
  needMb,
  why,
  onPick,
}: {
  s: DockerFleetServer
  on: boolean
  needMb?: number
  // Set = can't be picked, and why.
  why?: string
  onPick?: () => void
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: rich option rows
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={!!why}
      tabIndex={why ? -1 : 0}
      onClick={onPick}
      className={cn(
        "flex min-h-14 w-full min-w-0 items-center gap-3 px-3 py-2 text-start transition-colors outline-none focus-visible:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-55",
        on ? "bg-brand-soft/60" : "enabled:hover:bg-subtle",
      )}
    >
      <ServerFacts s={s} needMb={needMb} why={why} />
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          on
            ? "border-brand bg-brand text-primary-foreground"
            : "border-mist bg-card",
          why && "invisible",
        )}
      >
        {on && <Check className="size-3" strokeWidth={3} />}
      </span>
    </button>
  )
}

function ComposePreview({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-subtle [contain:inline-size]">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-caption text-ash">
          docker-compose.yml
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 max-md:h-10"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            } catch {
              toast.error("Couldn't access the clipboard")
            }
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-80 overflow-auto p-3 font-mono text-caption leading-relaxed">
        {text}
      </pre>
    </div>
  )
}

function CheckLine({ check }: { check: DockerProjectCheck }) {
  const busy = check.ports.find((p) => p.in_use || p.duplicate)
  const bad = !check.ok || !!check.name_problem || !!busy
  return (
    <span
      role="status"
      className={cn(
        "flex items-center gap-1.5 text-caption",
        bad ? "text-destructive" : "text-success",
      )}
    >
      {bad ? (
        <CircleX className="size-4" />
      ) : (
        <CircleCheck className="size-4" />
      )}
      {!check.ok
        ? "Compose refused the files"
        : check.name_problem
          ? check.name_problem
          : busy
            ? `Port ${busy.published} is taken`
            : check.ports.length && check.ports_read
              ? "Files and port look good"
              : "Files look good"}
    </span>
  )
}

// After Start: the project exists; the rest is followed here.
type Step = "database" | "start" | "answer" | "ready"

type Run = {
  at: Step
  failed?: string
  server: string
  project: string
  name: string
  jobId?: string
  database?: Database
  tries: number
  last?: string
}

const TRIES = 30 // × 4 s = two minutes

function DeployProgress({
  run,
  setRun,
  phone,
  kind,
  serverName,
  onRetryDatabase,
  onAnother,
}: {
  run: Run
  setRun: (fn: (r: Run | null) => Run | null) => void
  phone: boolean
  kind: Kind
  serverName: string
  onRetryDatabase: () => void
  onAnother: () => void
}) {
  const r = recipeOf[kind]
  const jobs = useJobList()
  const jobActions = useJobActions()
  const check = useCheckDatabase()
  const back = useBack("/databases")
  const job = run.jobId ? jobs.data?.find((j) => j.id === run.jobId) : undefined
  const projectLink = projectHref(run.server, run.project)
  const databaseLink = run.database ? `/databases/${run.database.id}` : null

  // The job ends → wait for the database to answer.
  const jobState = job?.state
  // biome-ignore lint/correctness/useExhaustiveDependencies: follows the job's state
  useEffect(() => {
    if (run.at !== "start" || !job || !jobState) return
    if (jobState === "succeeded") {
      setRun((cur) => cur && { ...cur, at: "answer", tries: 0 })
    } else if (jobState !== "queued" && jobState !== "running") {
      setRun(
        (cur) =>
          cur && {
            ...cur,
            failed:
              job.error ||
              (jobState === "canceled"
                ? "The start was canceled."
                : "The container didn't start."),
          },
      )
    }
  }, [run.at, jobState])

  // Asks the database every 4 s until it answers, for up to two minutes.
  const waiting = run.at === "answer" && !run.failed && run.database
  const id = run.database?.id
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // biome-ignore lint/correctness/useExhaustiveDependencies: restarts per wait
  useEffect(() => {
    if (!waiting || !id) return
    let stop = false
    let tries = 0
    const tick = async () => {
      tries++
      let last: string | undefined
      try {
        const d = await check.mutateAsync({ id })
        if (stop) return
        if (d.status === "online") {
          setRun((cur) => cur && { ...cur, at: "ready", database: d })
          toast.success(`${d.name} is ready`, {
            description: [
              d.version,
              d.latency_ms != null && `${d.latency_ms} ms`,
            ]
              .filter(Boolean)
              .join(" · "),
          })
          return
        }
        last = d.status_message || statusMeta[d.status].label
      } catch (err) {
        if (stop) return
        last = err instanceof ApiError ? err.message : String(err)
      }
      if (tries >= TRIES) {
        setRun(
          (cur) =>
            cur && {
              ...cur,
              tries,
              last,
              failed:
                "It didn't answer within two minutes. It may still be starting: look at its logs in the project.",
            },
        )
        return
      }
      setRun((cur) => cur && { ...cur, tries, last })
      timer.current = setTimeout(tick, 4000)
    }
    timer.current = setTimeout(tick, kind === "mssql" ? 6000 : 2000)
    return () => {
      stop = true
      clearTimeout(timer.current)
    }
  }, [waiting, id])

  const order: Step[] = ["database", "start", "answer", "ready"]
  const index = order.indexOf(run.at)
  const stateOf = (step: Step) => {
    const i = order.indexOf(step)
    if (run.at === "ready" || i < index) return "done" as const
    if (i > index) return "waiting" as const
    return run.failed ? ("failed" as const) : ("running" as const)
  }

  const steps: {
    step: Step | "project"
    title: string
    body?: ReactNode
    action?: ReactNode
  }[] = [
    {
      step: "project",
      title: "Project created",
      body: (
        <>
          <span className="font-mono">{run.project}</span> on {serverName}
        </>
      ),
    },
    {
      step: "database",
      title: "Add it to Databases",
      body:
        stateOf("database") === "failed" ? (
          <span className="text-destructive">{run.failed}</span>
        ) : (
          "Morche watches it through the server, straight into the container."
        ),
      action: stateOf("database") === "failed" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetryDatabase}
        >
          <RefreshCw /> Try again
        </Button>
      ),
    },
    {
      step: "start",
      title: "Pull the image and start",
      body:
        stateOf("start") === "failed" ? (
          <span className="text-destructive">{run.failed}</span>
        ) : job && stateOf("start") === "running" ? (
          <span className="flex flex-col gap-2">
            <span>
              {progressText(job) ||
                imageOf({ kind, version: "" }).replace(/:$/, "")}
            </span>
            <JobBar job={job} />
          </span>
        ) : (
          "The first start pulls the image; it can take a minute."
        ),
      action: run.jobId &&
        (stateOf("start") === "running" || stateOf("start") === "failed") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => run.jobId && jobActions.show(run.jobId)}
          >
            Details
          </Button>
        ),
    },
    {
      step: "answer",
      title: "Wait for it to answer",
      body:
        stateOf("answer") === "failed" ? (
          <span className="text-destructive">{run.failed}</span>
        ) : stateOf("answer") === "running" ? (
          run.tries > 0 ? (
            `Not yet (${run.last ?? "starting"}). Asked ${run.tries} ${run.tries === 1 ? "time" : "times"}.`
          ) : (
            `${r.label} sets itself up on the first start.`
          )
        ) : undefined,
      action: stateOf("answer") === "failed" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRun((cur) => cur && { ...cur, failed: undefined, tries: 0 })
          }
        >
          <RefreshCw /> Keep waiting
        </Button>
      ),
    },
  ]

  const ready = run.at === "ready"
  const failed = !!run.failed

  const list = (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const st = s.step === "project" ? "done" : stateOf(s.step)
        return (
          <li key={s.step} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute start-[0.9375rem] top-9 bottom-1 w-px",
                  st === "done" ? "bg-success/50" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative flex size-8 shrink-0 items-center justify-center rounded-full border",
                st === "done" && "border-success/40 bg-success/10 text-success",
                st === "running" && "border-brand/40 bg-brand-soft text-brand",
                st === "failed" &&
                  "border-destructive/40 bg-destructive/10 text-destructive",
                st === "waiting" && "border-border bg-card text-ash",
              )}
            >
              {st === "done" ? (
                <Check className="size-4" strokeWidth={2.5} />
              ) : st === "running" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : st === "failed" ? (
                <CircleX className="size-4" />
              ) : (
                <span className="text-caption tabular-nums">{i + 1}</span>
              )}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p
                className={cn(
                  "text-body-sm font-medium",
                  st === "waiting" && "text-muted-foreground",
                )}
              >
                {s.title}
              </p>
              {s.body && (
                <div className="mt-0.5 text-caption break-words text-muted-foreground">
                  {s.body}
                </div>
              )}
              {s.action && <div className="mt-2">{s.action}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )

  const hero = (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-5",
        ready
          ? "border-success/30 bg-success/5"
          : failed
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-subtle",
      )}
    >
      <EngineTile
        engine={r.engine}
        flavor={r.flavor}
        className="size-12 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-subheading">
          {ready
            ? `${run.name} is ready`
            : failed
              ? "Something needs a look"
              : `Setting up ${run.name}`}
        </p>
        <p className="truncate text-body-sm text-muted-foreground">
          {ready
            ? `${run.database?.version || r.label} · answering through ${serverName}`
            : failed
              ? "The steps below say where it stopped."
              : "You can leave this page; it carries on in the background."}
        </p>
      </div>
    </div>
  )

  const buttons = (
    <>
      <Button
        variant="outline"
        className="max-md:h-11 md:h-9"
        render={<Link href={projectLink} />}
        nativeButton={false}
      >
        <Boxes /> Open the project
      </Button>
      {ready && (
        <Button
          variant="outline"
          className="max-md:h-11 md:h-9"
          onClick={onAnother}
        >
          Add another
        </Button>
      )}
      {databaseLink && (
        <Button
          variant={ready ? "default" : "outline"}
          className="max-md:h-11 md:h-9"
          render={<Link href={databaseLink} />}
          nativeButton={false}
        >
          Open database
        </Button>
      )}
    </>
  )

  const body = (
    <div className="flex flex-col gap-6">
      {hero}
      <div className={cn(!phone && "rounded-2xl border border-border p-6")}>
        {list}
      </div>
    </div>
  )

  if (phone) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {run.name}
          </h1>
        </header>
        <div className="flex flex-col gap-6 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {body}
          <div className="flex flex-col gap-2">{buttons}</div>
        </div>
      </div>
    )
  }

  return (
    <EditorPage
      icon={
        <EngineTile engine={r.engine} flavor={r.flavor} className="size-9" />
      }
      title={run.name}
      status={ready ? "Ready" : failed ? "Stopped at a step" : "Setting up…"}
      actions={buttons}
      aside={
        <AsideCard title="Good to know">
          <ul className="grid gap-2.5 text-caption text-muted-foreground">
            <li>
              The password is in the project's{" "}
              <span className="font-mono">.env</span> and under the database's
              Credentials.
            </li>
            <li>
              Updates, logs and files live in the project, under Containers.
            </li>
            <li>Set up backups from the database's Backups tab.</li>
          </ul>
        </AsideCard>
      }
    >
      {body}
    </EditorPage>
  )
}
