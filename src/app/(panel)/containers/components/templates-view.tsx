"use client"

import {
  Copy,
  LayoutTemplate,
  Loader2,
  Pencil,
  Plus,
  Rocket,
  Trash2,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { yamlProblems } from "@/app/(panel)/ansible/components/yaml-editor"
import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { DockerFleetServer, DockerTemplate } from "@/lib/services"
import { cn } from "@/lib/utils"
import { appLogos, inkLogos } from "../../applications/components/meta"
import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
} from "../../servers/[id]/components/parts"
import { useDeleteTemplate, useDockerTemplates, useSaveTemplate } from "../api"
import { useDockerEnv } from "../env"
import { ComposeFiles } from "./compose-files"
import { type WsCtx, WsPage } from "./env-page"
import { ChoiceChip, NoMatch, PageBar, Tag } from "./kit"
import { useDockerCan, useDockerWorkspaceCan } from "./permissions"
import { newProjectHref } from "./project-actions"

const sources = ["all", "builtin", "custom"] as const
type Source = (typeof sources)[number]

const filterParsers = {
  source: parseAsStringLiteral(sources).withDefault("all"),
  cat: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
}

// The images a compose file runs, read from its `image:` lines.
function imagesOf(compose: string) {
  const out: string[] = []
  for (const m of compose.matchAll(/^\s*image:\s*["']?([^\s"'#]+)/gm)) {
    if (!out.includes(m[1])) out.push(m[1])
  }
  return out
}

export function TemplateIcon({
  t,
  className,
}: {
  t: DockerTemplate
  className?: string
}) {
  const logo = t.logo && appLogos.includes(t.logo) ? t.logo : undefined
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl",
        logo
          ? "border border-border bg-card"
          : "bg-brand-soft text-brand-strong",
        className,
      )}
    >
      {logo ? (
        <Image
          src={`/apps/${logo}.svg`}
          alt=""
          width={64}
          height={64}
          className={cn("size-[55%]", inkLogos.has(logo) && "dark:invert")}
        />
      ) : (
        <LayoutTemplate className="size-[45%]" />
      )}
    </span>
  )
}

export function TemplatesPage() {
  return (
    <WsPage title="Templates" bleed>
      {(ctx) => <TemplatesView {...ctx} />}
    </WsPage>
  )
}

type Editing = { base?: DockerTemplate; copy: boolean } | null

// /containers/templates: compose files to start a project from. Built-in
// ones come with Morche; the workspace adds its own (Engineer).
function TemplatesView({ ws, phone }: WsCtx) {
  const can = useDockerWorkspaceCan(ws.id)
  const { server: env } = useDockerEnv()
  const deployCan = useDockerCan(env?.server_id ?? "", env?.workspace_id)
  const deployEnv = env?.state === "ready" && deployCan.manage ? env : undefined
  const query = useDockerTemplates(ws.id)
  const [f, setF] = useQueryStates(filterParsers, { history: "replace" })
  const [viewing, setViewing] = useState<DockerTemplate | null>(null)
  const [viewOpen, setViewOpen] = useOpen("docker-template")
  const [editing, setEditing] = useState<Editing>(null)
  const [editOpen, setEditOpen] = useOpen("docker-template-editor")
  const [removing, setRemoving] = useState<DockerTemplate | null>(null)
  const [removeOpen, setRemoveOpen] = useOpen("docker-template-remove")
  const remove = useDeleteTemplate()

  const builtin = query.data?.builtin ?? []
  const custom = [...(query.data?.custom ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const all = [...custom, ...builtin]
  const categories = [
    ...new Set(all.map((t) => t.category).filter(Boolean)),
  ].sort()
  const bySource =
    f.source === "builtin" ? builtin : f.source === "custom" ? custom : all
  const needle = f.q.trim().toLowerCase()
  const shown = bySource.filter(
    (t) =>
      (!f.cat || t.category === f.cat) &&
      (!needle ||
        [t.name, t.description, t.category, ...imagesOf(t.compose)].some((s) =>
          s.toLowerCase().includes(needle),
        )),
  )

  const view = (t: DockerTemplate) => {
    setViewing(t)
    setViewOpen(true)
  }
  const edit = (base: DockerTemplate | undefined, copy: boolean) => {
    setEditing({ base, copy })
    setEditOpen(true)
  }
  const menu = (t: DockerTemplate): Item[][] => {
    if (!can.edit) return []
    const groups: Item[][] = [
      [
        ...(t.builtin
          ? []
          : [
              {
                key: "edit",
                label: "Edit",
                icon: <Pencil />,
                onSelect: () => edit(t, false),
              },
            ]),
        {
          key: "copy",
          label: t.builtin ? "Copy to edit" : "Duplicate",
          icon: <Copy />,
          onSelect: () => edit(t, true),
        },
      ],
    ]
    if (!t.builtin) {
      groups.push([
        {
          key: "remove",
          label: "Delete",
          icon: <Trash2 />,
          destructive: true,
          onSelect: () => {
            setRemoving(t)
            setRemoveOpen(true)
          },
        },
      ])
    }
    return groups
  }

  let body: ReactNode
  if (query.isPending) {
    body = (
      <div className="grid gap-3 max-md:px-4 md:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    )
  } else if (query.isError) {
    body = (
      <Empty
        icon={LayoutTemplate}
        title="Couldn't read the templates"
        body={query.error.message}
        className="max-md:mt-4"
      />
    )
  } else if (f.source === "custom" && custom.length === 0 && !needle) {
    body = (
      <Empty
        icon={LayoutTemplate}
        title="No templates of your own yet"
        body="Save a compose file your team starts often, with its .env, and anyone can deploy it in two clicks. Or copy a built-in one and change it."
        className="max-md:mt-4"
        action={
          can.edit && (
            <Button onClick={() => edit(undefined, false)}>
              <Plus />
              New template
            </Button>
          )
        }
      />
    )
  } else if (shown.length === 0) {
    body = (
      <NoMatch onReset={() => setF({ q: null, cat: null, source: null })} />
    )
  } else if (phone) {
    body = (
      <ul className="divide-y divide-border border-y border-border">
        {shown.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => view(t)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start active:bg-muted"
            >
              <TemplateIcon t={t} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">
                  {t.name}
                  {!t.builtin && <Tag>Yours</Tag>}
                </span>
                <span className="line-clamp-2 text-caption text-muted-foreground">
                  {t.description || t.category}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    )
  } else {
    body = (
      <div className="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
        {shown.map((t) => (
          <TemplateCard
            key={t.id}
            t={t}
            env={deployEnv}
            onView={() => view(t)}
            menu={menu(t)}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <PageBar
        phone={phone}
        tabs={
          <Segmented
            label="Templates"
            value={f.source}
            onChange={(v: Source) => setF({ source: v === "all" ? null : v })}
            items={[
              { value: "all", label: `All ${all.length}` },
              { value: "builtin", label: `Built-in ${builtin.length}` },
              { value: "custom", label: `Yours ${custom.length}` },
            ]}
          />
        }
        filters={
          categories.length > 1 && (
            <ChoiceChip
              phone={phone}
              label="Category"
              value={f.cat}
              options={[
                { value: "", label: "Every category" },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
              onChange={(v) => setF({ cat: v || null })}
            />
          )
        }
        search={
          <SearchBox
            value={f.q}
            onChange={(v) => setF({ q: v || null })}
            placeholder="Search templates, images"
            label="Search templates"
            className="md:max-w-64"
          />
        }
        caption={
          env &&
          (deployEnv ? `Deploys to ${env.name}` : `Can't deploy to ${env.name}`)
        }
        refresh={{ busy: query.isFetching, run: () => query.refetch() }}
        primary={
          can.edit
            ? {
                label: "New template",
                icon: <Plus />,
                run: () => edit(undefined, false),
              }
            : undefined
        }
      />
      <div className={cn(phone ? "pt-3 pb-24" : "mt-4")}>{body}</div>

      <TemplateDetails
        open={viewOpen && viewing !== null}
        onOpenChange={setViewOpen}
        t={viewing}
        env={deployEnv}
        menu={viewing ? menu(viewing) : []}
        phone={phone}
      />
      <TemplateEditor
        key={
          editing ? `${editing.base?.id ?? "new"}-${editing.copy}` : "closed"
        }
        open={editOpen && editing !== null}
        onOpenChange={setEditOpen}
        ws={ws.id}
        editing={editing}
        categories={categories}
        phone={phone}
      />
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Delete ${removing?.name ?? "the template"}?`}
        description="Projects already made from it stay as they are."
        confirmLabel="Delete"
        pending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(
            { ws: ws.id, id: removing.id },
            {
              onSuccess: () => {
                toast.success(`${removing.name} deleted`)
                setRemoveOpen(false)
              },
              onError: (e) => toast.error(e.message),
            },
          )
        }
      />
    </>
  )
}

function DeployButton({
  t,
  env,
  className,
}: {
  t: DockerTemplate
  env?: DockerFleetServer
  className?: string
}) {
  if (!env) return null
  return (
    <Button
      size="sm"
      className={className}
      render={<Link href={newProjectHref(env.server_id, t.id)} />}
      nativeButton={false}
    >
      <Rocket />
      Deploy
    </Button>
  )
}

function TemplateCard({
  t,
  env,
  onView,
  menu,
}: {
  t: DockerTemplate
  env?: DockerFleetServer
  onView: () => void
  menu: Item[][]
}) {
  const images = imagesOf(t.compose)
  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <TemplateIcon t={t} />
        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onView}
            className="truncate text-start text-body font-medium outline-none hover:underline focus-visible:underline"
          >
            {t.name}
          </button>
          <span className="truncate text-caption text-muted-foreground">
            {t.category || "No category"}
            {!t.builtin && t.updated_by && ` · by ${t.updated_by}`}
          </span>
        </div>
        {!t.builtin && <Tag>Yours</Tag>}
        {menu.length > 0 && (
          <ItemMenu groups={menu} label={`${t.name} actions`} />
        )}
      </div>
      <p className="line-clamp-2 min-h-10 text-body-sm text-muted-foreground">
        {t.description || "No description."}
      </p>
      <div className="mt-auto flex items-center gap-2">
        <span
          className="min-w-0 flex-1 truncate font-mono text-caption text-ash"
          title={images.join(", ")}
        >
          {images.join(", ") || "No image"}
        </span>
        <Button variant="ghost" size="sm" onClick={onView}>
          View
        </Button>
        <DeployButton t={t} env={env} />
      </div>
    </article>
  )
}

function TemplateDetails({
  open,
  onOpenChange,
  t,
  env,
  menu,
  phone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  t: DockerTemplate | null
  env?: DockerFleetServer
  menu: Item[][]
  phone: boolean
}) {
  if (!t) return null
  const images = imagesOf(t.compose)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.name}
      description={t.description}
      className="sm:max-w-3xl"
      footer={
        <>
          {menu.length > 0 && (
            <div className="me-auto max-md:hidden">
              <ItemMenu
                groups={menu}
                label={`${t.name} actions`}
                trigger={
                  <Button variant="ghost">
                    {t.builtin ? <Copy /> : <Pencil />}
                    {t.builtin ? "Copy to edit" : "Edit"}…
                  </Button>
                }
              />
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {env ? (
            <Button
              render={<Link href={newProjectHref(env.server_id, t.id)} />}
              nativeButton={false}
            >
              <Rocket />
              Deploy to {env.name}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <TemplateIcon t={t} className="size-8 rounded-lg" />
          <span>{t.category || "No category"}</span>
          <span>{t.builtin ? "Comes with Morche" : "Your workspace's"}</span>
          {images.length > 0 && (
            <span className="font-mono">{images.join(", ")}</span>
          )}
        </div>
        <ComposeFiles
          compose={t.compose}
          env={t.env}
          readOnly
          height={phone ? "45vh" : "50vh"}
        />
        {!env && (
          <p className="text-caption text-muted-foreground">
            Deploying needs a running engine you're an Engineer on: pick one in
            the sidebar.
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}

function TemplateEditor({
  open,
  onOpenChange,
  ws,
  editing,
  categories,
  phone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ws: string
  editing: Editing
  categories: string[]
  phone: boolean
}) {
  const base = editing?.base
  const updating = base && !editing?.copy ? base : undefined
  const save = useSaveTemplate()
  const [name, setName] = useState(
    base ? (editing?.copy ? `${base.name} (copy)` : base.name) : "",
  )
  const [category, setCategory] = useState(base?.category ?? "")
  const [description, setDescription] = useState(base?.description ?? "")
  const [compose, setCompose] = useState(base?.compose ?? "")
  const [envText, setEnvText] = useState(base?.env ?? "")
  const [tried, setTried] = useState(false)
  const errors = fieldErrors(save.error)
  const nameError =
    (tried && !name.trim() ? "Give it a name." : undefined) ?? errors.name
  const composeError =
    (tried ? yamlProblems(compose, "compose")[0]?.message : undefined) ??
    (tried && !/^services\s*:/m.test(compose)
      ? "A compose file needs a services: section."
      : undefined) ??
    errors.compose
  const general =
    save.error && Object.keys(errors).length === 0
      ? save.error.message
      : undefined
  const listId = "docker-template-categories"

  const submit = () => {
    setTried(true)
    if (
      !name.trim() ||
      yamlProblems(compose, "compose").length > 0 ||
      !/^services\s*:/m.test(compose)
    ) {
      return
    }
    save.mutate(
      {
        ws,
        id: updating?.id,
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        compose,
        env: envText,
      },
      {
        onSuccess: () => {
          toast.success(updating ? "Template saved" : `${name.trim()} added`)
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        updating
          ? `Edit ${updating.name}`
          : base
            ? `Copy of ${base.name}`
            : "New template"
      }
      className="sm:max-w-4xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {updating ? "Save" : "Add template"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={nameError}>
            {(p) => (
              <Input
                {...p}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Internal wiki"
                maxLength={100}
              />
            )}
          </Field>
          <Field
            label="Category"
            error={errors.category}
            hint="Groups it in the filter. Optional."
          >
            {(p) => (
              <>
                <Input
                  {...p}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Web"
                  list={listId}
                  maxLength={50}
                />
                <datalist id={listId}>
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </div>
        <Field
          label="Description"
          error={errors.description}
          hint="What it runs and anything to change before starting it."
        >
          {(p) => (
            <Textarea
              {...p}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <ComposeFiles
            compose={compose}
            env={envText}
            onCompose={setCompose}
            onEnv={setEnvText}
            height={phone ? "45vh" : "40vh"}
          />
          {composeError && (
            <p
              role="alert"
              className="text-caption whitespace-pre-wrap text-destructive"
            >
              {composeError}
            </p>
          )}
          <p className="text-caption text-muted-foreground">
            Put passwords as placeholders in .env (like{" "}
            <code>DB_PASSWORD=change-me</code>): the template is shared with the
            whole workspace.
          </p>
        </div>
        {general && (
          <p role="alert" className="text-body-sm text-destructive">
            {general}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
