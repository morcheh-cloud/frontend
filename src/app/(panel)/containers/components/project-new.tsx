"use client"

import { LayoutTemplate, Loader2, Rocket } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { yamlProblems } from "@/app/(panel)/ansible/components/yaml-editor"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { fieldErrors } from "@/lib/api"
import type { DockerFleetServer, DockerTemplate } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, ItemMenu } from "../../servers/[id]/components/parts"
import { useCreateProject, useDockerTemplates } from "../api"
import { ComposeFiles } from "./compose-files"
import { EnvPage } from "./env-page"
import { engineName } from "./meta"
import { useDockerCan } from "./permissions"
import { projectHref } from "./project-actions"

const NAME = /^[a-z0-9][a-z0-9_-]*$/

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
  const params = useSearchParams()
  const wanted = params.get("template")
  const all = [
    ...(templates.data?.custom ?? []),
    ...(templates.data?.builtin ?? []),
  ]
  const from = wanted ? all.find((t) => t.id === wanted) : undefined

  if (!can.manage) {
    return (
      <Empty
        icon={Rocket}
        title="You need Engineer access"
        body={`Making a project on ${env.name} needs Engineer access to the server.`}
      />
    )
  }
  if (wanted && templates.isPending) return null
  return (
    <ProjectForm
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
}: {
  env: DockerFleetServer
  phone: boolean
  from?: DockerTemplate
  templates: DockerTemplate[]
}) {
  const router = useRouter()
  const create = useCreateProject()
  const [name, setName] = useState(from ? slugName(from.name) : "")
  const [compose, setCompose] = useState(from?.compose ?? "")
  const [envText, setEnvText] = useState(from?.env ?? "")
  const [start, setStart] = useState(true)
  const [tried, setTried] = useState(false)
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
      { server: env.server_id, name, compose, env: envText, start },
      {
        onSuccess: (res) => {
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

  const pick = (t: DockerTemplate) =>
    router.replace(
      `/containers/projects/new?env=${encodeURIComponent(env.server_id)}&template=${encodeURIComponent(t.id)}`,
    )

  const templateMenu = templates.length > 0 && (
    <ItemMenu
      label="Start from a template"
      trigger={
        <Button variant="ghost" size="sm">
          <LayoutTemplate />
          {from ? from.name : "From a template"}
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

  const side = (
    <div className="flex flex-col gap-5">
      <Field
        label="Name"
        error={nameProblem}
        hint="Also the folder's name and the prefix of its containers."
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
          />
        )}
      </Field>
      <div className="flex items-start gap-3 rounded-xl border border-border p-3">
        <Switch
          id="project-start"
          checked={start}
          onCheckedChange={setStart}
          className="mt-0.5"
        />
        <label htmlFor="project-start" className="flex flex-col">
          <span className="text-body-sm font-medium">Start after creating</span>
          <span className="text-caption text-muted-foreground">
            Pulls the images and runs <code>docker compose up -d</code> as a
            background task.
          </span>
        </label>
      </div>
      <p className="text-caption text-muted-foreground">
        Saved on <span className="text-foreground">{env.name}</span> (
        {engineName(env)}) in the workspace's projects folder, and checked with{" "}
        <code>docker compose config</code> first. Change the folder in{" "}
        <Link
          href="/containers/settings"
          className="text-brand hover:underline"
        >
          Settings
        </Link>
        .
      </p>
      {from && (
        <p className="text-caption text-muted-foreground">
          From the <span className="text-foreground">{from.name}</span>{" "}
          template: read it through and change passwords in .env before
          starting.
        </p>
      )}
    </div>
  )

  const notices = (composeProblem || general) && (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-body-sm whitespace-pre-wrap text-destructive"
    >
      {composeProblem ?? general}
    </p>
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
        {side}
        {notices}
        <ComposeFiles
          compose={compose}
          env={envText}
          onCompose={setCompose}
          onEnv={setEnvText}
          height="50vh"
          aside={templateMenu}
        />
        <div className="sticky bottom-[calc(--spacing(16)+env(safe-area-inset-bottom))] z-20 -mx-4 flex gap-2 border-t border-border bg-background px-4 py-2">
          {submitButton}
        </div>
      </div>
    )
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-3">
        {notices}
        <ComposeFiles
          compose={compose}
          env={envText}
          onCompose={setCompose}
          onEnv={setEnvText}
          height="calc(100dvh - 15rem)"
          aside={templateMenu}
        />
      </div>
      <div className="flex flex-col gap-5 lg:sticky lg:top-[calc(3rem+1px+1.25rem)]">
        {side}
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={<Link href={"/containers/projects"} />}
            nativeButton={false}
          >
            Cancel
          </Button>
          {submitButton}
        </div>
      </div>
    </div>
  )
}
