"use client"

import {
  Copy,
  GitBranch,
  GitCommitHorizontal,
  Loader2,
  Pencil,
  RefreshCcw,
  Rocket,
  TriangleAlert,
  Unplug,
  Webhook,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { API_URL, ApiError, fieldErrors } from "@/lib/api"
import type { DockerGitSource, DockerProjectDetails } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  type GitForm,
  useDeleteGit,
  useDeployGit,
  useProjectGit,
  useResetWebhook,
  useSaveGit,
} from "../api"

export const emptyGitForm: GitForm = {
  repo_url: "",
  branch: "main",
  compose_path: "",
  username: "",
  token: "",
  clear_token: false,
  auto_deploy: true,
  poll_minutes: 0,
}

const formOf = (s: DockerGitSource): GitForm => ({
  repo_url: s.repo_url,
  branch: s.branch,
  compose_path: s.compose_path,
  username: s.username,
  token: "",
  clear_token: false,
  auto_deploy: s.auto_deploy,
  poll_minutes: s.poll_minutes,
})

// Mirrors the backend's checkGitBody, so most mistakes show as you type.
export function checkGit(f: GitForm): Record<string, string> {
  const e: Record<string, string> = {}
  const url = f.repo_url.trim()
  let u: URL | null = null
  try {
    u = new URL(url)
  } catch {}
  if (!u || !/^https?:$/.test(u.protocol) || !u.host)
    e.repo_url =
      "Give the repository's https address, e.g. https://github.com/team/app.git"
  else if (u.username || u.password)
    e.repo_url =
      "Leave the login out of the address: put the token in its own field"
  else if (/[\s'"]/.test(url)) e.repo_url = "The address can't hold spaces"
  const b = f.branch.trim() || "main"
  if (!/^[A-Za-z0-9_][A-Za-z0-9._/-]{0,199}$/.test(b) || b.includes(".."))
    e.branch = "That isn't a branch name"
  const p = f.compose_path.trim().replace(/^\/+|\/+$/g, "")
  if (
    p &&
    (!/^[A-Za-z0-9_][A-Za-z0-9._/ -]{0,199}$/.test(p) || p.includes(".."))
  )
    e.compose_path = "A path inside the repository, e.g. deploy/compose.yaml"
  if (!/^[A-Za-z0-9._@+-]{0,100}$/.test(f.username.trim()))
    e.username = "That user name isn't valid"
  if (f.poll_minutes < 0 || f.poll_minutes > 1440)
    e.poll_minutes = "From 0 to 1440 minutes"
  return e
}

const pollChoices = [0, 5, 15, 60] as const
const pollLabel = (m: number) =>
  m === 0 ? "Webhook only" : m < 60 ? `Every ${m} min` : "Every hour"

// The repository fields, shared by Connect here and New project › From git.
export function GitFields({
  form,
  set,
  errors,
  hasToken,
  phone,
}: {
  form: GitForm
  set: (patch: Partial<GitForm>) => void
  errors: Record<string, string>
  // A token is saved: blank keeps it.
  hasToken?: boolean
  phone: boolean
}) {
  const plain = {
    autoCapitalize: "none",
    autoCorrect: "off",
    spellCheck: false,
  } as const
  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Repository"
        hint="Its https address. The server clones it, so it must reach it."
        error={errors.repo_url}
      >
        {(p) => (
          <Input
            {...p}
            {...plain}
            type="url"
            inputMode="url"
            value={form.repo_url}
            onChange={(e) => set({ repo_url: e.target.value })}
            placeholder="https://github.com/team/app.git"
            className="font-mono"
          />
        )}
      </Field>
      <div className={cn("grid gap-4", !phone && "grid-cols-2")}>
        <Field label="Branch" error={errors.branch}>
          {(p) => (
            <Input
              {...p}
              {...plain}
              value={form.branch}
              onChange={(e) => set({ branch: e.target.value })}
              placeholder="main"
              className="font-mono"
            />
          )}
        </Field>
        <Field
          label="Compose file"
          hint="Empty = compose.yaml at the top."
          error={errors.compose_path}
        >
          {(p) => (
            <Input
              {...p}
              {...plain}
              value={form.compose_path}
              onChange={(e) => set({ compose_path: e.target.value })}
              placeholder="compose.yaml"
              className="font-mono"
            />
          )}
        </Field>
      </div>
      <div className={cn("grid gap-4", !phone && "grid-cols-2")}>
        <Field
          label="User (private repository)"
          hint="GitHub and Gitea take any name with a token."
          error={errors.username}
        >
          {(p) => (
            <Input
              {...p}
              {...plain}
              autoComplete="off"
              value={form.username}
              onChange={(e) => set({ username: e.target.value })}
              placeholder="git"
            />
          )}
        </Field>
        <Field
          label="Access token"
          hint={
            hasToken
              ? form.clear_token
                ? "The saved token is dropped on save."
                : "Saved. Leave blank to keep it."
              : "Read access is enough. Kept encrypted."
          }
          error={errors.token}
        >
          {(p) => (
            <SecretInput
              {...p}
              label="token"
              autoComplete="off"
              value={form.token}
              onChange={(e) =>
                set({ token: e.target.value, clear_token: false })
              }
              placeholder={hasToken && !form.clear_token ? "••••••••" : ""}
            />
          )}
        </Field>
      </div>
      {hasToken && !form.token && (
        <button
          type="button"
          onClick={() => set({ clear_token: !form.clear_token })}
          className="-mt-2 self-end text-caption text-brand hover:underline"
        >
          {form.clear_token ? "Keep the saved token" : "Forget the saved token"}
        </button>
      )}
      <label
        htmlFor="git-auto"
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm font-medium">
            Deploy new commits by themselves
          </span>
          <span className="text-caption text-muted-foreground">
            When the webhook is called or a check finds the branch moved. Off =
            only Deploy now.
          </span>
        </span>
        <Switch
          id="git-auto"
          checked={form.auto_deploy}
          onCheckedChange={(auto_deploy) => set({ auto_deploy })}
        />
      </label>
      {form.auto_deploy && (
        <Field
          label="Look for new commits"
          hint="For a repository that can't call a webhook. The webhook works either way."
          error={errors.poll_minutes}
        >
          {() => (
            <div className="flex flex-wrap gap-1.5">
              {pollChoices.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={form.poll_minutes === m}
                  onClick={() => set({ poll_minutes: m })}
                  className="h-11 rounded-full border border-border px-3.5 text-body-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
                >
                  {pollLabel(m)}
                </button>
              ))}
            </div>
          )}
        </Field>
      )}
    </div>
  )
}

export const webhookUrl = (token: string) => {
  const base =
    API_URL || (typeof window === "undefined" ? "" : window.location.origin)
  return `${base.replace(/\/$/, "")}/hooks/docker/${token}`
}

// Tab Git of a project: where its files come from, the last deployed
// commit, the webhook, Deploy now.
export function ProjectGit({
  p,
  serverId,
  canEdit,
  phone,
}: {
  p: DockerProjectDetails
  serverId: string
  canEdit: boolean
  phone: boolean
}) {
  const query = useProjectGit(serverId, p.name)
  const deploy = useDeployGit()
  const reset = useResetWebhook()
  const remove = useDeleteGit()
  const [form, setForm] = useOpen("docker-git-form")
  const [unplug, setUnplug] = useOpen("docker-git-remove")
  const [newHook, setNewHook] = useOpen("docker-git-webhook")

  if (query.isPending) return <Skeleton className="h-48 rounded-2xl" />
  if (query.isError)
    return (
      <Empty
        icon={GitBranch}
        title="Couldn't load the repository"
        body={query.error.message}
      />
    )
  const s = query.data.source ?? null
  const layer = (
    <GitFormLayer
      open={form}
      onOpenChange={setForm}
      serverId={serverId}
      project={p.name}
      source={s}
      phone={phone}
    />
  )
  if (!s)
    return (
      <>
        <Empty
          icon={GitBranch}
          title="Not connected to a repository"
          body="Keep the compose file in git and Morche deploys it: on a push (webhook), on a check every few minutes, or when you press Deploy now. Files the repository doesn't track, like .env, stay as they are."
          action={
            canEdit && (
              <Button onClick={() => setForm(true)}>
                <GitBranch />
                Connect a repository
              </Button>
            )
          }
        />
        {layer}
      </>
    )

  const run = (force: boolean) =>
    deploy.mutate(
      { server: serverId, project: p.name, force },
      {
        onError: (e) =>
          toast.error("Couldn't start the deploy", { description: e.message }),
      },
    )
  const hook = s.webhook_token ? webhookUrl(s.webhook_token) : ""
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied")
    } catch {
      toast.error("Couldn't copy", { description: text })
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", phone && "-mx-4")}>
      {s.last_error && (
        <div className="flex items-start gap-3 bg-destructive/10 p-4 text-body-sm md:rounded-2xl">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-destructive">
              The last deploy failed
            </p>
            <p className="font-mono text-caption break-words whitespace-pre-wrap text-muted-foreground">
              {s.last_error}
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Repository" phone={phone}>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-body-sm">
            <dt className="text-muted-foreground">Address</dt>
            <dd className="truncate font-mono" title={s.repo_url}>
              {s.repo_url}
            </dd>
            <dt className="text-muted-foreground">Branch</dt>
            <dd className="font-mono">{s.branch}</dd>
            <dt className="text-muted-foreground">Compose file</dt>
            <dd className="truncate font-mono">
              {s.compose_path || "compose.yaml"}
            </dd>
            <dt className="text-muted-foreground">Login</dt>
            <dd>
              {s.has_token
                ? `Token${s.username ? ` as ${s.username}` : ""}`
                : "None (public)"}
            </dd>
            <dt className="text-muted-foreground">On the server</dt>
            <dd className="truncate font-mono text-muted-foreground">
              {s.dir}
            </dd>
            <dt className="text-muted-foreground">Deploys</dt>
            <dd>
              {s.auto_deploy
                ? s.poll_minutes
                  ? `New commits, checked every ${s.poll_minutes} min and by the webhook`
                  : "New commits, when the webhook is called"
                : "Only when someone presses Deploy now"}
            </dd>
          </dl>
          {canEdit && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setForm(true)}>
                <Pencil />
                Edit
              </Button>
              <Button variant="ghost" onClick={() => setUnplug(true)}>
                <Unplug />
                Disconnect
              </Button>
            </div>
          )}
        </Card>
        <Card title="Deployed" phone={phone}>
          {s.last_commit ? (
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <GitCommitHorizontal className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium">
                  {s.last_message || "No message"}
                </p>
                <p className="text-caption text-muted-foreground">
                  <span className="font-mono">{s.last_commit.slice(0, 8)}</span>
                  {s.last_author && ` · ${s.last_author}`}
                  {s.last_deployed_at &&
                    ` · ${timeAgo(s.last_deployed_at).toLowerCase()}`}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              Nothing deployed from the repository yet.
            </p>
          )}
          {s.last_checked_at && (
            <p className="mt-3 text-caption text-ash">
              Checked {timeAgo(s.last_checked_at).toLowerCase()}
            </p>
          )}
          {canEdit && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={deploy.isPending || s.deploying}
                onClick={() => run(false)}
                className={cn(phone && "h-11 flex-1")}
              >
                {deploy.isPending || s.deploying ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Rocket />
                )}
                {s.deploying ? "Deploying…" : "Deploy now"}
              </Button>
              <Button
                variant="outline"
                disabled={deploy.isPending || s.deploying}
                onClick={() => run(true)}
                title="Run compose up even when the branch hasn't moved"
                className={cn(phone && "h-11 flex-1")}
              >
                <RefreshCcw />
                Deploy again
              </Button>
            </div>
          )}
        </Card>
      </div>
      {hook && (
        <Card title="Webhook" phone={phone}>
          <p className="mb-3 text-body-sm text-muted-foreground">
            Add it to the repository as a push webhook (GitHub, GitLab, Gitea,
            Bitbucket…). A push to <span className="font-mono">{s.branch}</span>{" "}
            deploys; other branches are ignored. Anyone with the address can
            start a deploy, so keep it private.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={hook}
              aria-label="Webhook address"
              className="font-mono text-caption"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size={phone ? "icon-lg" : "icon"}
              aria-label="Copy the webhook address"
              onClick={() => copy(hook)}
            >
              <Copy />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Webhook className="size-3.5" />
              Content type: any · Secret: not needed
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => setNewHook(true)}
                className="text-brand hover:underline"
              >
                Make a new address
              </button>
            )}
          </div>
        </Card>
      )}
      {s.by && (
        <p className="text-caption text-ash max-md:px-4">
          Webhook and timed deploys run with {s.by}'s access.
        </p>
      )}
      {layer}
      <ConfirmDialog
        open={unplug}
        onOpenChange={setUnplug}
        title="Disconnect from the repository?"
        description="The files and the clone stay on the server and the containers keep running. Morche stops following the branch and the webhook address stops working."
        confirmLabel="Disconnect"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(
            { server: serverId, project: p.name },
            {
              onSuccess: () => {
                setUnplug(false)
                toast.success("Disconnected")
              },
              onError: (e) =>
                toast.error("Couldn't disconnect", { description: e.message }),
            },
          )
        }
      />
      <ConfirmDialog
        open={newHook}
        onOpenChange={setNewHook}
        title="Make a new webhook address?"
        description="The old address stops working at once: update it in the repository's settings."
        confirmLabel="Make a new one"
        pending={reset.isPending}
        onConfirm={() =>
          reset.mutate(
            { server: serverId, project: p.name },
            {
              onSuccess: () => {
                setNewHook(false)
                toast.success("New webhook address made")
              },
              onError: (e) =>
                toast.error("Couldn't change it", { description: e.message }),
            },
          )
        }
      />
    </div>
  )
}

function Card({
  title,
  phone,
  children,
}: {
  title: string
  phone: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        phone
          ? "border-y border-border p-4"
          : "rounded-2xl border border-border p-5",
      )}
    >
      <h3 className="mb-3 font-label text-caption tracking-label text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function GitFormLayer({
  open,
  onOpenChange,
  serverId,
  project,
  source,
  phone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  serverId: string
  project: string
  source: DockerGitSource | null
  phone: boolean
}) {
  const save = useSaveGit()
  const [draft, setDraft] = useState<GitForm | null>(null)
  const [tried, setTried] = useState(false)
  const [deployNow, setDeployNow] = useState(!source)
  const form = draft ?? (source ? formOf(source) : emptyGitForm)
  const local = checkGit(form)
  const errors = {
    ...(tried ? local : {}),
    ...fieldErrors(save.error),
  }
  const refused =
    save.error instanceof ApiError &&
    !Object.keys(fieldErrors(save.error)).length
      ? save.error.message
      : null

  const close = (o: boolean) => {
    if (!o) {
      setDraft(null)
      setTried(false)
      save.reset()
    }
    onOpenChange(o)
  }
  const submit = () => {
    setTried(true)
    if (Object.keys(local).length) return
    save.mutate(
      { server: serverId, project, form, deploy: deployNow },
      {
        onSuccess: (res) => {
          close(false)
          toast.success(
            source ? "Repository saved" : "Connected to the repository",
            {
              description: res.job ? "Deploying the branch now." : undefined,
            },
          )
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      title={source ? "Repository" : "Connect a repository"}
      description="The server checks it can read the branch before it's saved."
      className="sm:max-w-xl"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => close(false)}
            className="max-md:h-11"
          >
            Cancel
          </Button>
          <Button
            disabled={save.isPending}
            onClick={submit}
            className="max-md:h-11"
          >
            {save.isPending && <Loader2 className="animate-spin" />}
            {save.isPending ? "Checking the repository…" : "Save"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <GitFields
          form={form}
          set={(patch) => setDraft({ ...form, ...patch })}
          errors={errors}
          hasToken={source?.has_token}
          phone={phone}
        />
        <label
          htmlFor="git-deploy-now"
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body-sm font-medium">Deploy it now</span>
            <span className="text-caption text-muted-foreground">
              Clone the branch into the project's folder and run compose up.
              Files it tracks replace the ones there; the history keeps them.
            </span>
          </span>
          <Switch
            id="git-deploy-now"
            checked={deployNow}
            onCheckedChange={setDeployNow}
          />
        </label>
        {refused && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
            {refused}
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </ResponsiveDialog>
  )
}
