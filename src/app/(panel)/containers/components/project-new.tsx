"use client"

import {
  GitBranch,
  History,
  LayoutTemplate,
  ListChecks,
  Loader2,
  Rocket,
  Terminal,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { yamlProblems } from "@/app/(panel)/ansible/components/yaml-editor"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { DockerFleetServer, DockerTemplate } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, ItemMenu, Segmented } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  type GitForm,
  useCheckProject,
  useCreateFromGit,
  useCreateProject,
  useDockerTemplates,
  useEffectiveDockerSettings,
} from "../api"
import { type AssistTab, CheckPanel, ComposeAssist } from "./compose-assist"
import { type ComposeFile, ComposeFiles } from "./compose-files"
import { looksLikeDockerRun } from "./docker-run"
import { DockerRunDialog } from "./docker-run-dialog"
import { EnvPage } from "./env-page"
import { engineName } from "./meta"
import { useDockerCan } from "./permissions"
import { newProjectHref, projectHref } from "./project-actions"
import { DefaultsCard, hasDefaults, withDefaults } from "./project-defaults"
import { checkGit, emptyGitForm, GitFields } from "./project-git"
import {
  CheckResult,
  draftKey,
  readDraft,
  writeDraft,
} from "./project-new-tools"

const NAME = /^[a-z0-9][a-z0-9_-]*$/

type Source = "compose" | "git"

export function slugName(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 63)
}

function nameError(name: string) {
  if (!name) return "Give the project a name."
  if (!NAME.test(name)) {
    return "Lowercase letters, digits, - and _ only, starting with a letter or digit."
  }
  return undefined
}

export function NewProjectPage() {
  return (
    <EnvPage title="New project" parent="/containers/projects">
      {(ctx) => <NewProject {...ctx} />}
    </EnvPage>
  )
}

function NewProject({
  env,
  phone,
}: {
  env: DockerFleetServer
  phone: boolean
}) {
  const id = env.server_id
  const can = useDockerCan(id, env.workspace_id)
  const templates = useDockerTemplates(env.workspace_id)
  // Where the compose file comes from lives in the URL, so a link (or a
  // page left hidden and reopened) never keeps "From git" by surprise.
  const [query, setQuery] = useQueryStates(
    {
      source: parseAsStringLiteral(["git"] as const),
      template: parseAsString,
    },
    { history: "replace" },
  )
  const wanted = query.template
  const all = [
    ...(templates.data?.custom ?? []),
    ...(templates.data?.builtin ?? []),
  ]
  const from = wanted ? all.find((t) => t.id === wanted) : undefined
  const source: Source = query.source === "git" && !wanted ? "git" : "compose"
  const setSource = (next: Source) =>
    setQuery(
      next === "git" ? { source: "git", template: null } : { source: null },
    )
  const sourceSwitch = (
    <Segmented
      label="Where the compose file comes from"
      value={source}
      onChange={setSource}
      items={[
        { value: "compose", label: "Write compose" },
        { value: "git", label: "From git" },
      ]}
    />
  )

  if (!can.manage) {
    return (
      <Empty
        icon={Rocket}
        title="You need Engineer access"
        body={`Making a project on ${env.name} needs Engineer access to the server.`}
      />
    )
  }
  if (source === "git")
    return (
      <GitProjectForm env={env} phone={phone} sourceSwitch={sourceSwitch} />
    )
  if (wanted && templates.isPending) return null
  return (
    <ProjectForm
      sourceSwitch={sourceSwitch}
      // A template picked after the page opened starts the form again.
      key={from?.id ?? "blank"}
      env={env}
      phone={phone}
      from={from}
      templates={all}
    />
  )
}

function ProjectForm({
  env,
  phone,
  from,
  templates,
  sourceSwitch,
}: {
  env: DockerFleetServer
  phone: boolean
  from?: DockerTemplate
  templates: DockerTemplate[]
  sourceSwitch: ReactNode
}) {
  const router = useRouter()
  const create = useCreateProject()
  const check = useCheckProject()
  // What the form starts from; an unfinished form is kept in localStorage
  // under the server + template and comes back when the page opens again.
  const initial = {
    name: from ? slugName(from.name) : "",
    compose: from?.compose ?? "",
    env: from?.env ?? "",
    start: true,
  }
  const key = draftKey(env.server_id, from?.id)
  const [restored, setRestored] = useState(() => readDraft(key))
  const [name, setName] = useState(restored?.name ?? initial.name)
  const [compose, setCompose] = useState(restored?.compose ?? initial.compose)
  const [envText, setEnvText] = useState(restored?.env ?? initial.env)
  const [start, setStart] = useState(restored?.start ?? initial.start)
  const [tried, setTried] = useState(false)
  const [file, setFile] = useState<ComposeFile>("compose")
  const [runOpen, setRunOpen] = useOpen("docker-run-convert")
  // A fresh dialog each time; `replace` = the compose text itself was a
  // docker run command.
  const [runFrom, setRunFrom] = useState({ n: 0, text: "", replace: false })
  const [checked, setChecked] = useState<{ sig: string } | null>(null)
  const pristine =
    name === initial.name &&
    compose === initial.compose &&
    envText === initial.env &&
    start === initial.start

  useEffect(() => {
    if (create.isSuccess) return
    writeDraft(
      key,
      pristine
        ? null
        : {
            name,
            compose,
            env: envText,
            start,
            at: new Date().toISOString(),
          },
    )
  }, [key, pristine, name, compose, envText, start, create.isSuccess])

  const startOver = () => {
    writeDraft(key, null)
    setRestored(null)
    setName(initial.name)
    setCompose(initial.compose)
    setEnvText(initial.env)
    setStart(initial.start)
    setTried(false)
    check.reset()
    setChecked(null)
  }
  // The workspace's (or this environment's) new-project defaults.
  const defaults = useEffectiveDockerSettings(env.server_id).data
  const [useDefaults, setUseDefaults] = useState(true)
  const planned = withDefaults(compose, useDefaults ? defaults : undefined)
  const errors = fieldErrors(create.error)
  const nameProblem =
    (tried || name ? nameError(name) : undefined) ?? errors.name
  const composeProblem = tried
    ? yamlProblems(compose, "compose")[0]?.message
    : undefined
  const general =
    create.error && !errors.name && !errors.compose
      ? create.error.message
      : undefined

  const submit = () => {
    setTried(true)
    if (nameError(name) || yamlProblems(compose, "compose").length > 0) return
    create.mutate(
      {
        server: env.server_id,
        name,
        compose: planned.text,
        env: envText,
        start,
      },
      {
        onSuccess: (res) => {
          writeDraft(key, null)
          toast.success(
            start
              ? `${res.project.name} is starting`
              : `${res.project.name} saved`,
          )
          router.replace(projectHref(env.server_id, res.project.name))
        },
      },
    )
  }

  const signature = JSON.stringify([name, planned.text, envText])
  const runCheck = () => {
    if (!compose.trim()) {
      setTried(true)
      return
    }
    check.mutate(
      {
        server: env.server_id,
        name: nameError(name) ? "" : name,
        compose: planned.text,
        env: envText,
      },
      { onSuccess: () => setChecked({ sig: signature }) },
    )
  }
  const convert = (text: string, replace: boolean) => {
    setRunFrom((r) => ({ n: r.n + 1, text, replace }))
    setRunOpen(true)
  }
  const asRun = looksLikeDockerRun(compose)

  const pick = (t: DockerTemplate) =>
    router.replace(newProjectHref(env.server_id, t.id))

  // The helper beside the editor: which tab shows, and where it sits (phones
  // scroll to it when a check ends).
  const [tab, setTab] = useState<AssistTab>("services")
  const assistRef = useRef<HTMLDivElement>(null)
  const toAssist = (next: AssistTab) => {
    setTab(next)
    if (phone)
      assistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  const checkAndShow = () => {
    if (!compose.trim()) {
      setTried(true)
      return
    }
    toAssist("check")
    runCheck()
  }
  const busyPorts = check.data?.ports.some((p) => p.in_use || p.duplicate)
  const checkTone = check.error
    ? ("bad" as const)
    : check.data && checked
      ? !check.data.ok
        ? ("bad" as const)
        : check.data.name_problem || busyPorts
          ? ("warn" as const)
          : ("good" as const)
      : undefined

  const runButton = (
    <Button
      variant="ghost"
      size={phone ? "sm" : "default"}
      onClick={() => convert("", false)}
    >
      <Terminal />
      {phone ? "docker run" : "From docker run"}
    </Button>
  )
  const templateMenu = templates.length > 0 && (
    <ItemMenu
      label="Start from a template"
      trigger={
        <Button variant="ghost" size={phone ? "sm" : "default"}>
          <LayoutTemplate />
          {from ? from.name : phone ? "Template" : "From a template"}
        </Button>
      }
      groups={[
        templates.map((t) => ({
          key: t.id,
          label: t.name,
          icon: <LayoutTemplate />,
          trailing: t.builtin ? undefined : "Yours",
          onSelect: () => pick(t),
        })),
      ]}
    />
  )

  const nameField = (
    <Field
      label="Project name"
      error={nameProblem}
      hint={
        phone
          ? "Also the folder's name and the prefix of its containers."
          : undefined
      }
      className={cn(!phone && "w-72 shrink-0")}
    >
      {(p) => (
        <Input
          {...p}
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          placeholder="my-app"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          className="font-mono"
        />
      )}
    </Field>
  )
  const startSwitch = (
    <div
      className={cn(
        "flex items-start gap-3",
        phone && "rounded-xl border border-border p-3",
      )}
    >
      <Switch
        id="project-start"
        checked={start}
        onCheckedChange={setStart}
        className="mt-0.5"
      />
      <label htmlFor="project-start" className="flex flex-col">
        <span className="text-body-sm font-medium">Start after creating</span>
        <span className="text-caption text-muted-foreground">
          Pulls the images and runs <code>docker compose up -d</code> in the
          background.
        </span>
      </label>
    </div>
  )
  const place = (
    <p className="text-caption text-muted-foreground">
      Saved on <span className="text-foreground">{env.name}</span> (
      {engineName(env)}) in the workspace's projects folder (
      <Link href="/containers/settings" className="text-brand hover:underline">
        change it
      </Link>
      ).
    </p>
  )

  const notices = (
    <>
      {restored && !pristine && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-subtle px-3 py-2 text-body-sm">
          <History className="size-4 shrink-0 text-ash" />
          <span className="min-w-0 flex-1">
            Your unfinished draft from {timeAgo(restored.at).toLowerCase()} is
            back.
          </span>
          <Button size="sm" variant="ghost" onClick={startOver}>
            Start over
          </Button>
        </div>
      )}
      {from && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-subtle px-3 py-2 text-body-sm">
          <LayoutTemplate className="size-4 shrink-0 text-ash" />
          <span className="min-w-0 flex-1">
            From the <span className="font-medium">{from.name}</span> template:
            read it through and set real passwords in .env before starting.
          </span>
        </div>
      )}
      {asRun && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-body-sm">
          <Terminal className="size-4 shrink-0 text-brand-strong" />
          <span className="min-w-0 flex-1">
            This looks like a <code>docker run</code> command, not a compose
            file.
          </span>
          <Button size="sm" onClick={() => convert(compose, true)}>
            Convert it
          </Button>
        </div>
      )}
      {(composeProblem || general) && !asRun && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-body-sm whitespace-pre-wrap text-destructive"
        >
          {composeProblem ?? general}
        </p>
      )}
    </>
  )

  const checkPanel = (
    <CheckPanel pending={check.isPending} onCheck={runCheck}>
      {check.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-body-sm text-destructive"
        >
          Couldn't check: {check.error.message}
        </p>
      ) : check.data && checked ? (
        <CheckResult
          result={check.data}
          stale={checked.sig !== signature}
          onClose={() => {
            check.reset()
            setChecked(null)
          }}
        />
      ) : undefined}
    </CheckPanel>
  )

  const assist = (
    <ComposeAssist
      serverId={env.server_id}
      files={{ compose, env: envText }}
      onFiles={(f) => {
        setCompose(f.compose)
        setEnvText(f.env)
      }}
      tab={tab}
      onTab={setTab}
      phone={phone}
      defaultRestart={useDefaults && !!defaults?.default_restart}
      defaultsCard={
        defaults &&
        hasDefaults(defaults) && (
          <DefaultsCard
            defaults={defaults}
            adds={planned.adds}
            on={useDefaults}
            onChange={setUseDefaults}
          />
        )
      }
      check={checkPanel}
      checkTone={checkTone}
      showEnv={() => setFile("env")}
      onAdded={(service) => {
        if (!name) setName(slugName(service))
      }}
      onDockerRun={() => convert("", false)}
    />
  )

  const checkButton = (
    <Button
      variant="outline"
      onClick={checkAndShow}
      disabled={check.isPending}
      size={phone ? "icon-lg" : "default"}
      aria-label={phone ? "Check on the server" : undefined}
    >
      {check.isPending ? <Loader2 className="animate-spin" /> : <ListChecks />}
      {!phone && "Check"}
    </Button>
  )

  const runDialog = (
    <DockerRunDialog
      key={runFrom.n}
      open={runOpen}
      onOpenChange={setRunOpen}
      initial={runFrom.text}
      replace={runFrom.replace}
      compose={compose}
      env={envText}
      onApply={(nextCompose, nextEnv, added) => {
        setCompose(nextCompose)
        setEnvText(nextEnv)
        setFile("compose")
        setRunOpen(false)
        setTab("services")
        if (!name && added.length === 1) setName(slugName(added[0]))
        toast.success(
          added.length > 1
            ? `Added ${added.length} services`
            : `Added ${added[0]}`,
        )
      }}
    />
  )

  const submitButton = (
    <Button
      onClick={submit}
      disabled={create.isPending}
      className={cn(phone && "h-11 flex-1")}
    >
      {create.isPending ? <Loader2 className="animate-spin" /> : <Rocket />}
      {start ? "Create and start" : "Create"}
    </Button>
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-5">
        {sourceSwitch}
        {nameField}
        {startSwitch}
        {notices}
        <ComposeFiles
          compose={compose}
          env={envText}
          onCompose={setCompose}
          onEnv={setEnvText}
          height="50vh"
          file={file}
          onFile={setFile}
          aside={
            <>
              {runButton}
              {templateMenu}
            </>
          }
        />
        <div ref={assistRef} className="scroll-mt-4">
          {assist}
        </div>
        {place}
        <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-20 -mx-4 flex gap-2 border-t border-border bg-background px-4 py-2">
          {checkButton}
          {submitButton}
        </div>
        {runDialog}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {sourceSwitch}
        {templateMenu}
        {runButton}
        <div className="ms-auto flex gap-2">
          <Button
            variant="ghost"
            render={<Link href="/containers/projects" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          {checkButton}
          {submitButton}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4 rounded-2xl border border-border bg-card px-5 py-4">
        {nameField}
        <div className="pt-6">{startSwitch}</div>
        <div className="ms-auto max-w-xs min-w-48 flex-1 pt-6 text-end">
          {place}
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {notices}
          <ComposeFiles
            compose={compose}
            env={envText}
            onCompose={setCompose}
            onEnv={setEnvText}
            height="max(24rem, calc(100dvh - 21rem))"
            file={file}
            onFile={setFile}
          />
        </div>
        <div className="flex min-h-0 flex-col lg:sticky lg:top-[calc(3rem+1px+1rem)] lg:max-h-[calc(100dvh-3rem-1px-2rem)]">
          {assist}
        </div>
      </div>
      {runDialog}
    </div>
  )
}

// The repository's last path part, as a project name: team/my-app.git → my-app.
function nameFromRepo(url: string) {
  const last = url.trim().replace(/\/+$/, "").split("/").pop()
  return slugName((last ?? "").replace(/\.git$/, ""))
}

function GitProjectForm({
  env,
  phone,
  sourceSwitch,
}: {
  env: DockerFleetServer
  phone: boolean
  sourceSwitch: ReactNode
}) {
  const router = useRouter()
  const create = useCreateFromGit()
  const [form, setForm] = useState<GitForm>(emptyGitForm)
  const [name, setName] = useState("")
  // The name follows the repository until it's typed by hand.
  const [named, setNamed] = useState(false)
  const [deploy, setDeploy] = useState(true)
  const [tried, setTried] = useState(false)
  const server = fieldErrors(create.error)
  const local = checkGit(form)
  const errors = {
    ...server,
    ...(tried ? local : form.repo_url ? { repo_url: local.repo_url } : {}),
  }
  for (const k of Object.keys(errors))
    if (!errors[k]) delete errors[k as keyof typeof errors]
  const shownName = named ? name : nameFromRepo(form.repo_url)
  const nameProblem =
    (tried || shownName ? nameError(shownName) : undefined) ?? server.name
  const known = new Set([
    "name",
    "repo_url",
    "branch",
    "compose_path",
    "username",
    "token",
    "poll_minutes",
  ])
  const general =
    create.error && !Object.keys(server).some((k) => known.has(k))
      ? create.error.message
      : undefined

  const set = (patch: Partial<GitForm>) => setForm((f) => ({ ...f, ...patch }))
  const submit = () => {
    setTried(true)
    if (nameError(shownName) || Object.keys(local).length > 0) return
    create.mutate(
      { server: env.server_id, name: shownName, form, deploy },
      {
        onSuccess: () => {
          toast.success(
            deploy
              ? `${shownName} is being cloned and started`
              : `${shownName} is connected to its repository`,
          )
          router.replace(projectHref(env.server_id, shownName, "git"))
        },
      },
    )
  }

  const fields = (
    <div
      className={cn(
        "flex flex-col gap-4",
        !phone && "rounded-2xl border border-border bg-card p-6",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <GitBranch className="size-4" />
        </span>
        <div className="flex flex-col">
          <p className="text-body-sm font-medium">Deploy from a repository</p>
          <p className="text-caption text-muted-foreground">
            {env.name} clones the branch and runs its compose file. A push
            (webhook) or a regular check brings new commits; your changes stay
            in git.
          </p>
        </div>
      </div>
      <GitFields form={form} set={set} errors={errors} phone={phone} />
    </div>
  )

  const nameField = (
    <Field
      label="Project name"
      error={nameProblem}
      hint={
        phone
          ? "Taken from the repository; also the folder's name and the prefix of its containers."
          : undefined
      }
      className={cn(!phone && "w-72 shrink-0")}
    >
      {(p) => (
        <Input
          {...p}
          value={shownName}
          onChange={(e) => {
            setNamed(true)
            setName(e.target.value.toLowerCase())
          }}
          placeholder="my-app"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          className="font-mono"
        />
      )}
    </Field>
  )
  const deploySwitch = (
    <div
      className={cn(
        "flex items-start gap-3",
        phone && "rounded-xl border border-border p-3",
      )}
    >
      <Switch
        id="git-deploy"
        checked={deploy}
        onCheckedChange={setDeploy}
        className="mt-0.5"
      />
      <label htmlFor="git-deploy" className="flex flex-col">
        <span className="text-body-sm font-medium">Deploy now</span>
        <span className="text-caption text-muted-foreground">
          Clones and runs <code>docker compose up -d</code> in the background.
          Off = connect only.
        </span>
      </label>
    </div>
  )
  const after = (
    <p className="text-caption text-muted-foreground">
      After creating, the project's Git tab has the webhook address to paste
      into your git host.
    </p>
  )

  const notices = general && (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-body-sm whitespace-pre-wrap text-destructive"
    >
      {general}
    </p>
  )

  const submitButton = (
    <Button
      onClick={submit}
      disabled={create.isPending}
      className={cn(phone && "h-11 flex-1")}
    >
      {create.isPending ? <Loader2 className="animate-spin" /> : <GitBranch />}
      {deploy ? "Create and deploy" : "Create"}
    </Button>
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-5">
        {sourceSwitch}
        {nameField}
        {deploySwitch}
        {notices}
        {fields}
        {after}
        <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-20 -mx-4 flex gap-2 border-t border-border bg-background px-4 py-2">
          {submitButton}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {sourceSwitch}
        <div className="ms-auto flex gap-2">
          <Button
            variant="ghost"
            render={<Link href="/containers/projects" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          {submitButton}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4 rounded-2xl border border-border bg-card px-5 py-4">
        {nameField}
        <div className="pt-6">{deploySwitch}</div>
        <div className="ms-auto max-w-xs min-w-48 flex-1 pt-6 text-end">
          {after}
        </div>
      </div>
      {notices}
      <div className="max-w-3xl">{fields}</div>
    </div>
  )
}
