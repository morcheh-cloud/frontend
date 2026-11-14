"use client"

import {
  ChevronRight,
  Copy,
  ExternalLink,
  KeyRound,
  LayoutTemplate,
  Loader2,
  Pencil,
  Plus,
  Rocket,
  Star,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import { type ReactNode, useEffect, useRef, useState } from "react"
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
import { NoMatch, PageBar, Tag } from "./kit"
import { useDockerCan, useDockerWorkspaceCan } from "./permissions"
import { newProjectHref } from "./project-actions"
import {
  byPopular,
  categoryIcon,
  envNeeds,
  imagesOf,
  searchTemplates,
  TemplateIcon,
} from "./template-meta"

export { TemplateIcon } from "./template-meta"

const sources = ["all", "builtin", "custom"] as const
type Source = (typeof sources)[number]

const filterParsers = {
  source: parseAsStringLiteral(sources).withDefault("all"),
  cat: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
  // "popular" = every popular template, not just the first row.
  show: parseAsStringLiteral(["popular"] as const),
  // How many pages of a long list are shown.
  more: parseAsInteger.withDefault(1),
}

// Cards per page of a flat list, and per category on the overview.
const PAGE = 48
const PER_SECTION = 6
const PER_POPULAR = 12

export function TemplatesPage() {
  return (
    <WsPage title="Templates" bleed>
      {(ctx) => <TemplatesView {...ctx} />}
    </WsPage>
  )
}

type Editing = { base?: DockerTemplate; copy: boolean } | null

// /containers/templates: compose files to start a project from. Built-in
// ones come with Morche (hundreds of apps); the workspace adds its own
// (Engineer). With nothing picked it's an overview: popular apps, then each
// category; a category, search or source gives one flat list.
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
  const bySource =
    f.source === "builtin" ? builtin : f.source === "custom" ? custom : all
  const counts = new Map<string, number>()
  for (const t of bySource) {
    const c = t.category || "Other"
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  const categories = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )
  const popular = bySource.filter((t) => t.featured).sort(byPopular)
  const needle = f.q.trim()
  const overview =
    !needle && !f.cat && f.source === "all" && f.show !== "popular"
  const shown = searchTemplates(
    f.show === "popular"
      ? popular
      : bySource.filter((t) => !f.cat || (t.category || "Other") === f.cat),
    needle,
  )
  const limit = PAGE * Math.max(1, f.more)

  const view = (t: DockerTemplate) => {
    setViewing(t)
    setViewOpen(true)
  }
  const edit = (base: DockerTemplate | undefined, copy: boolean) => {
    setEditing({ base, copy })
    setEditOpen(true)
  }
  const pickCategory = (cat: string) =>
    setF({ cat: cat || null, show: null, more: null })
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

  const cards = (list: DockerTemplate[]) =>
    phone ? (
      <ul className="divide-y divide-border border-y border-border">
        {list.map((t) => (
          <li key={t.id}>
            <TemplateRow t={t} onView={() => view(t)} />
          </li>
        ))}
      </ul>
    ) : (
      <div className="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
        {list.map((t) => (
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

  let body: ReactNode
  if (query.isPending) {
    body = (
      <div className="grid gap-3 max-md:px-4 md:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
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
  } else if (overview) {
    body = (
      <div className="flex flex-col gap-8 max-md:gap-6">
        {!phone && (
          <Hero
            total={all.length}
            categories={categories.length}
            popular={popular}
            env={env?.name}
            canDeploy={Boolean(deployEnv)}
            onView={view}
          />
        )}
        {custom.length > 0 && (
          <Section
            phone={phone}
            title="Your workspace's"
            count={custom.length}
            onAll={
              custom.length > PER_SECTION
                ? () => setF({ source: "custom" })
                : undefined
            }
          >
            {cards(custom.slice(0, PER_SECTION))}
          </Section>
        )}
        {popular.length > 0 && (
          <Section
            phone={phone}
            title="Popular"
            icon={Star}
            count={popular.length}
            onAll={() => setF({ show: "popular", more: null })}
          >
            {phone ? (
              <PopularStrip list={popular.slice(0, 16)} onView={view} />
            ) : (
              cards(popular.slice(0, PER_POPULAR))
            )}
          </Section>
        )}
        {phone ? (
          <Section phone title="Categories" count={categories.length}>
            <CategoryRows categories={categories} onPick={pickCategory} />
          </Section>
        ) : (
          categories.map(([cat, n]) => (
            <Section
              key={cat}
              phone={false}
              title={cat}
              icon={categoryIcon(cat)}
              count={n}
              onAll={n > PER_SECTION ? () => pickCategory(cat) : undefined}
            >
              {cards(
                bySource
                  .filter((t) => (t.category || "Other") === cat)
                  .sort(byPopular)
                  .slice(0, PER_SECTION),
              )}
            </Section>
          ))
        )}
      </div>
    )
  } else if (shown.length === 0) {
    body = (
      <NoMatch
        onReset={() =>
          setF({ q: null, cat: null, source: null, show: null, more: null })
        }
      />
    )
  } else {
    const title =
      f.show === "popular"
        ? "Popular"
        : f.cat ||
          (needle
            ? "Search results"
            : f.source === "custom"
              ? "Your workspace's"
              : "Built-in")
    body = (
      <Section
        phone={phone}
        title={title}
        icon={
          f.show === "popular" ? Star : f.cat ? categoryIcon(f.cat) : undefined
        }
        count={shown.length}
      >
        {cards(shown.slice(0, limit))}
        {shown.length > limit && (
          <div className="flex justify-center pt-4 max-md:px-4">
            <Button
              variant="outline"
              className="max-md:w-full"
              onClick={() => setF({ more: f.more + 1 })}
            >
              Show more ({shown.length - limit} left)
            </Button>
          </div>
        )}
      </Section>
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
            onChange={(v: Source) =>
              setF({ source: v === "all" ? null : v, cat: null, more: null })
            }
            items={[
              { value: "all", label: `All ${all.length}` },
              { value: "builtin", label: `Built-in ${builtin.length}` },
              { value: "custom", label: `Yours ${custom.length}` },
            ]}
          />
        }
        search={
          <SearchBox
            value={f.q}
            onChange={(v) => setF({ q: v || null, more: null })}
            placeholder={
              all.length ? `Search ${all.length} templates` : "Search templates"
            }
            label="Search templates"
            className="md:max-w-72"
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
      {categories.length > 1 && (
        <CategoryChips
          phone={phone}
          total={bySource.length}
          categories={categories}
          popular={popular.length}
          value={f.show === "popular" ? "popular" : f.cat}
          onChange={(v) =>
            v === "popular"
              ? setF({ show: "popular", cat: null, more: null })
              : pickCategory(v)
          }
        />
      )}
      <div className={cn(phone ? "pt-4 pb-24" : "mt-5")}>{body}</div>

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
        categories={categories.map(([c]) => c).filter((c) => c !== "Other")}
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

// The overview's opening card: how many apps there are, a wall of the
// popular ones' logos (each opens its details) and where a deploy goes.
function Hero({
  total,
  categories,
  popular,
  env,
  canDeploy,
  onView,
}: {
  total: number
  categories: number
  popular: DockerTemplate[]
  env?: string
  canDeploy: boolean
  onView: (t: DockerTemplate) => void
}) {
  const wall = popular.slice(0, 18)
  return (
    <section className="@container flex items-center gap-8 overflow-hidden rounded-2xl border border-border bg-subtle p-6 lg:p-8">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="font-label text-caption tracking-label text-brand uppercase">
          App templates
        </span>
        <h2 className="text-heading font-light text-balance max-lg:text-subheading max-lg:font-normal">
          {total} apps, ready to run
        </h2>
        <p className="max-w-xl text-body-sm text-muted-foreground">
          Pick one, read its compose file and deploy it
          {env ? (canDeploy ? ` to ${env}` : "") : ""} in two clicks. Passwords
          and keys are made fresh for every project, and you can change anything
          before it starts.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-body-sm">
          <span>
            <span className="font-medium">{categories}</span>{" "}
            <span className="text-muted-foreground">categories</span>
          </span>
          <span>
            <span className="font-medium">{popular.length}</span>{" "}
            <span className="text-muted-foreground">popular picks</span>
          </span>
          <span className="text-muted-foreground">
            Compose files, nothing to install
          </span>
        </div>
      </div>
      {wall.length > 0 && (
        <div className="grid shrink-0 grid-cols-6 gap-2 max-xl:grid-cols-5 max-lg:hidden">
          {wall.slice(0, 18).map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onView(t)}
              title={t.name}
              aria-label={t.name}
              className={cn(
                "rounded-xl transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring",
                i >= 15 && "max-xl:hidden",
              )}
            >
              <TemplateIcon t={t} className="size-12 shadow-sm" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function Section({
  phone,
  title,
  icon: Icon,
  count,
  onAll,
  children,
}: {
  phone: boolean
  title: string
  icon?: typeof Star
  count: number
  onAll?: () => void
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div
        className={cn(
          "flex items-center gap-2",
          phone && "px-4 font-label text-caption tracking-label uppercase",
        )}
      >
        {Icon && !phone && <Icon className="size-4 text-ash" />}
        <h3
          className={cn(
            phone ? "text-muted-foreground" : "text-body font-medium",
          )}
        >
          {title}
        </h3>
        <span className="text-caption text-ash">{count}</span>
        {onAll && (
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto text-brand max-md:h-9"
            onClick={onAll}
          >
            See all
            <ChevronRight />
          </Button>
        )}
      </div>
      {children}
    </section>
  )
}

// Popular, every category with its count: one row of chips under the bar.
function CategoryChips({
  phone,
  total,
  categories,
  popular,
  value,
  onChange,
}: {
  phone: boolean
  total: number
  categories: [string, number][]
  popular: number
  value: string
  onChange: (v: string) => void
}) {
  // A link can land on a late category: bring its chip into the row's view
  // (the row only, never the page).
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = row.current
    const on = el?.querySelector<HTMLElement>(
      `[data-chip="${CSS.escape(value || "all")}"]`,
    )
    if (!el || !on || !phone) return
    const box = el.getBoundingClientRect()
    const r = on.getBoundingClientRect()
    if (r.left < box.left || r.right > box.right) {
      el.scrollLeft += r.left - box.left - (box.width - r.width) / 2
    }
  }, [value, phone])
  const chip = (key: string, label: string, n: number, Icon?: typeof Star) => {
    const on = value === key
    return (
      <button
        key={key || "all"}
        type="button"
        data-chip={key || "all"}
        aria-pressed={on}
        onClick={() => onChange(on ? "" : key)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          phone ? "h-9" : "h-8",
          on
            ? "border-brand bg-brand-soft text-brand-strong"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {Icon && <Icon className="size-3.5" />}
        {label}
        <span className={cn("text-caption", on ? "opacity-80" : "text-ash")}>
          {n}
        </span>
      </button>
    )
  }
  return (
    <div
      ref={row}
      className={cn(
        "flex [scrollbar-width:none] gap-2 overflow-x-auto",
        phone ? "px-4 pt-3" : "-mx-1 mt-3 flex-wrap px-1",
      )}
    >
      {chip("", "All", total)}
      {popular > 0 && chip("popular", "Popular", popular, Star)}
      {categories.map(([c, n]) => chip(c, c, n, categoryIcon(c)))}
    </div>
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
      variant="outline"
      className={cn("relative z-10", className)}
      render={<Link href={newProjectHref(env.server_id, t.id)} />}
      nativeButton={false}
    >
      <Rocket />
      Deploy
    </Button>
  )
}

// A card: the whole card opens the details; Deploy and the menu sit above
// that button.
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
  // Short tags only, so they read whole instead of "bac…".
  const tags = (t.tags ?? [])
    .filter((tag) => tag.length <= 14 && tag !== t.name.toLowerCase())
    .slice(0, 3)
  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onView}
        aria-label={`${t.name} details`}
        className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-start gap-3">
        <TemplateIcon t={t} className="size-11" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-medium">
            {t.name}
            {!t.builtin && <Tag>Yours</Tag>}
          </span>
          <span className="truncate text-caption text-muted-foreground">
            {t.category || "No category"}
            {!t.builtin && t.updated_by && ` · by ${t.updated_by}`}
          </span>
        </div>
        {t.featured && (
          <Star
            className="mt-1 size-3.5 shrink-0 fill-current text-ash"
            aria-label="Popular"
          />
        )}
        {menu.length > 0 && (
          <div className="relative z-10 -me-1 -mt-1">
            <ItemMenu groups={menu} label={`${t.name} actions`} />
          </div>
        )}
      </div>
      <p className="line-clamp-2 min-h-10 text-body-sm text-muted-foreground">
        {t.description || "No description."}
      </p>
      <div className="mt-auto flex min-h-8 items-center gap-2">
        <span className="flex min-w-0 flex-1 gap-1 overflow-hidden">
          {tags.map((tag) => (
            <span
              key={tag}
              className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-caption whitespace-nowrap text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </span>
        <DeployButton t={t} env={env} />
      </div>
    </article>
  )
}

function TemplateRow({ t, onView }: { t: DockerTemplate; onView: () => void }) {
  return (
    <button
      type="button"
      onClick={onView}
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
      <ChevronRight className="size-4 shrink-0 text-ash" />
    </button>
  )
}

// Phones: popular apps as a row of tiles that scrolls sideways.
function PopularStrip({
  list,
  onView,
}: {
  list: DockerTemplate[]
  onView: (t: DockerTemplate) => void
}) {
  return (
    <div className="flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1">
      {list.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onView(t)}
          className="flex w-20 shrink-0 snap-start flex-col items-center gap-1.5 text-center active:opacity-70"
        >
          <TemplateIcon t={t} className="size-16 rounded-2xl" />
          <span className="line-clamp-2 text-caption leading-tight">
            {t.name}
          </span>
        </button>
      ))}
    </div>
  )
}

function CategoryRows({
  categories,
  onPick,
}: {
  categories: [string, number][]
  onPick: (cat: string) => void
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {categories.map(([c, n]) => {
        const Icon = categoryIcon(c)
        return (
          <li key={c}>
            <button
              type="button"
              onClick={() => onPick(c)}
              className="flex min-h-14 w-full items-center gap-3 px-4 text-start active:bg-muted"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
                <Icon className="size-4.5" />
              </span>
              <span className="flex-1 text-body">{c}</span>
              <span className="text-body-sm text-ash">{n}</span>
              <ChevronRight className="size-4 shrink-0 text-ash" />
            </button>
          </li>
        )
      })}
    </ul>
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
  const needs = envNeeds(t.env)
  const site = t.website && /^https?:\/\//.test(t.website) ? t.website : ""
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.name}
      description={t.category || undefined}
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
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <TemplateIcon t={t} className="size-14 rounded-2xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-body-sm">{t.description || "No description."}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
              <span>
                {t.builtin ? "Comes with Morche" : "Your workspace's"}
              </span>
              {t.featured && (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3 fill-current" />
                  Popular
                </span>
              )}
              {site && (
                <a
                  href={site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  {new URL(site).hostname.replace(/^www\./, "")}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            {(t.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {t.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-xl border border-border p-3">
            <span className="text-caption text-ash">Runs</span>
            <span className="font-mono text-body-sm break-all">
              {images.join(", ") || "No image"}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-border p-3">
            <span className="text-caption text-ash">Before you start</span>
            <span className="text-body-sm">
              {needs.fill.length > 0 ? (
                <>
                  Fill in{" "}
                  {needs.fill.map((v, i) => (
                    <span key={v}>
                      {i > 0 && ", "}
                      <code className="text-caption">{v}</code>
                    </span>
                  ))}{" "}
                  in .env.
                </>
              ) : (
                "Nothing to fill in: it runs as it is."
              )}
            </span>
            {needs.made > 0 && (
              <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                <KeyRound className="size-3.5" />
                {needs.made === 1
                  ? "1 password or key is"
                  : `${needs.made} passwords and keys are`}{" "}
                made for you.
              </span>
            )}
          </div>
        </div>
        <ComposeFiles
          compose={t.compose}
          env={t.env}
          readOnly
          height={phone ? "40vh" : "45vh"}
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
            Leave passwords out: write <code>{"{{secret}}"}</code> (or{" "}
            <code>{"{{secret:16}}"}</code>, <code>{"{{hex:32}}"}</code>,{" "}
            <code>{"{{user}}"}</code>, <code>{"{{host}}"}</code>) in .env and
            each new project gets its own value. The template is shared with the
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
