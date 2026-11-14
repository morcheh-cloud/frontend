"use client"

import {
  ArrowRight,
  ChevronRight,
  Container,
  Download,
  ExternalLink,
  LayoutGrid,
  Pencil,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import {
  Failed,
  Placeholder,
} from "@/app/(panel)/scripts/components/scripts-view"
import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { safeHref } from "@/app/(panel)/services/components/meta"
import { Markdown } from "@/components/markdown"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { SheetTitle } from "@/components/ui/sheet"
import { useOpen } from "@/hooks/useOpen"
import type { Recipe, SoftwareInstall } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCatalog, useInstalls } from "../api"
import {
  InstallStatus,
  kindHints,
  kindLabels,
  matchRecipe,
  RecipeIcon,
  recipeHref,
  useApplicationsFilters,
} from "./meta"
import { Facts, Layer, LayerBody, LayerFooter, Section } from "./parts"
import { useSoftwareCan } from "./permissions"
import { useSoftwareActions } from "./software-actions"

// Container apps (Portainer, Uptime Kuma…) are compose templates in
// Containers now; the catalog points there.
const templatesHref = "/containers/templates"
const movedText =
  "Portainer, Uptime Kuma, Grafana and other Docker apps are compose templates: deploy them as a project."

// The categories in the order the catalog lists them: the busiest first.
export function categoriesOf(items: Recipe[]) {
  const n = new Map<string, number>()
  for (const r of items) n.set(r.category, (n.get(r.category) ?? 0) + 1)
  return [...n.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([c]) => c)
}

export function CategoryChips({
  items,
  phone,
}: {
  items: Recipe[]
  phone: boolean
}) {
  const [{ cat }, setFilters] = useApplicationsFilters()
  const cats = categoriesOf(items)
  if (cats.length < 2) return null
  const chip = (value: string, label: string) => (
    <button
      key={value || "all"}
      type="button"
      aria-pressed={cat === value}
      onClick={() => setFilters({ cat: value || null })}
      className="h-11 shrink-0 rounded-full border border-border px-4 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8 md:px-3"
    >
      {label}
    </button>
  )
  return (
    <div
      className={cn(
        "flex gap-2",
        phone
          ? "-mx-4 [scrollbar-width:none] overflow-x-auto px-4"
          : "flex-wrap",
      )}
    >
      {chip("", "All")}
      {cats.map((c) => chip(c, c))}
    </div>
  )
}

export function CatalogPanel({ phone }: { phone: boolean }) {
  const { workspace } = useWorkspace()
  const catalog = useCatalog(workspace?.id)
  const installs = useInstalls(workspace?.id)
  const [{ q, cat }, setFilters] = useApplicationsFilters()
  const [open, setOpen] = useOpen("software-recipe")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<Recipe | null>(null)

  if (catalog.isPending) return <Placeholder phone={phone} />
  if (catalog.isError && !catalog.data)
    return <Failed error={catalog.error} onRetry={() => catalog.refetch()} />

  // Retired built-ins stay in the data for earlier installs only.
  const all = catalog.data.items.filter((r) => !r.retired)
  const shown = all
    .filter((r) => (!cat || r.category === cat) && matchRecipe(r, q))
    .sort((a, b) => a.name.localeCompare(b.name))
  const byRecipe = new Map<string, SoftwareInstall[]>()
  for (const i of installs.data?.items ?? []) {
    byRecipe.set(i.recipe_id, [...(byRecipe.get(i.recipe_id) ?? []), i])
  }
  const current = all.find((r) => r.id === id) ?? last.current
  if (current) last.current = current
  const show = (r: Recipe) => {
    setId(r.id)
    setOpen(true)
  }

  return (
    <div className={cn("flex flex-col", phone ? "gap-3" : "gap-4")}>
      <div className={phone ? "px-4" : undefined}>
        <CategoryChips items={all} phone={phone} />
      </div>
      {shown.length === 0 ? (
        <Empty
          icon={LayoutGrid}
          title="No application matches"
          body="Try other words, or another category. Container apps are in Containers › Templates."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                className="h-11 md:h-9"
                onClick={() => setFilters({ q: null, cat: null })}
              >
                Clear filters
              </Button>
              <Button
                variant="outline"
                className="h-11 md:h-9"
                nativeButton={false}
                render={<Link href={templatesHref} />}
              >
                <Container />
                Container templates
              </Button>
            </div>
          }
        />
      ) : phone ? (
        <ul className="divide-y divide-border border-y border-border">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => show(r)}
                className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-start outline-none active:bg-muted"
              >
                <RecipeIcon recipe={r} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium">
                    {r.name}
                  </span>
                  <span className="line-clamp-2 text-caption text-muted-foreground">
                    {r.summary}
                  </span>
                </span>
                <InstalledCount items={byRecipe.get(r.id)} />
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </button>
            </li>
          ))}
          <li>
            <Link
              href={templatesHref}
              className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-start outline-none active:bg-muted"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                <Container className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">
                  Container apps
                </span>
                <span className="line-clamp-2 text-caption text-muted-foreground">
                  {movedText}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ash" />
            </Link>
          </li>
        </ul>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
          {shown.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => show(r)}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-start shadow-sm outline-none hover:border-mist hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex items-start gap-3">
                <RecipeIcon recipe={r} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="font-label text-[11px] tracking-label text-ash uppercase">
                    {r.builtin
                      ? kindLabels[r.kind]
                      : `Custom · ${kindLabels[r.kind]}`}
                  </span>
                </span>
              </span>
              <span className="line-clamp-2 min-h-10 text-body-sm text-muted-foreground">
                {r.summary}
              </span>
              <span className="mt-auto flex items-center gap-2 text-caption text-ash">
                {r.category}
                <span className="ms-auto">
                  <InstalledCount items={byRecipe.get(r.id)} />
                </span>
              </span>
            </button>
          ))}
          <Link
            href={templatesHref}
            className="group flex flex-col gap-3 rounded-2xl border border-dashed border-mist p-5 text-start outline-none hover:border-brand hover:bg-brand-soft/30 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                <Container className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  Container apps
                </span>
                <span className="font-label text-[11px] tracking-label text-ash uppercase">
                  Moved to Containers
                </span>
              </span>
            </span>
            <span className="line-clamp-2 min-h-10 text-body-sm text-muted-foreground">
              {movedText}
            </span>
            <span className="mt-auto flex items-center gap-1.5 text-caption font-medium text-brand">
              Open templates
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
            </span>
          </Link>
        </div>
      )}
      <RecipeDetails
        open={open}
        onOpenChange={setOpen}
        recipe={current}
        installs={current ? (byRecipe.get(current.id) ?? []) : []}
      />
    </div>
  )
}

function InstalledCount({ items }: { items?: SoftwareInstall[] }) {
  if (!items?.length) return null
  const updates = items.filter((i) => i.update_available).length
  return (
    <span
      className={cn(
        "shrink-0 text-caption whitespace-nowrap",
        updates ? "text-brand" : "text-success",
      )}
    >
      {updates
        ? `${updates} to update`
        : `On ${items.length} ${items.length === 1 ? "server" : "servers"}`}
    </span>
  )
}

// What a catalog entry is, where it's installed, and Install.
function RecipeDetails({
  open,
  onOpenChange,
  recipe: r,
  installs,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: Recipe | null
  installs: SoftwareInstall[]
}) {
  const a = useSoftwareActions()
  const can = useSoftwareCan()
  const router = useRouter()
  if (!r) return null
  const close = (then: () => void) => {
    window.addEventListener("popstate", () => then(), { once: true })
    onOpenChange(false)
  }
  const custom = !r.builtin && r.record_id
  // A custom recipe's website is typed by a person: only http(s) is a link.
  const website = r.website ? safeHref(r.website) : undefined

  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={r.name}
      header={
        <div className="flex items-center gap-3">
          <RecipeIcon recipe={r} size="sm" />
          <div className="min-w-0">
            <SheetTitle className="truncate text-body">{r.name}</SheetTitle>
            <p className="truncate text-caption text-ash">{r.summary}</p>
          </div>
        </div>
      }
    >
      <LayerBody>
        {r.description ? (
          <Markdown>{r.description}</Markdown>
        ) : (
          <p className="text-body-sm text-muted-foreground md:hidden">
            {r.summary}
          </p>
        )}
        <Facts
          items={[
            {
              label: "Kind",
              value: `${kindLabels[r.kind]}: ${kindHints[r.kind]}`,
            },
            { label: "Category", value: r.category },
            ...(r.requires?.length
              ? [
                  {
                    label: "Needs",
                    value: `${r.requires.join(", ")} (installed first when missing)`,
                  },
                ]
              : []),
            ...(r.os?.length
              ? [{ label: "Works on", value: r.os.join(", ") }]
              : []),
            ...(r.params?.length
              ? [
                  {
                    label: "Asks for",
                    value: r.params.map((p) => p.label).join(", "),
                  },
                ]
              : []),
            ...(website
              ? [
                  {
                    label: "Website",
                    value: (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:underline"
                      >
                        {website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="size-3.5" />
                      </a>
                    ),
                  },
                ]
              : []),
            {
              label: "Source",
              value: r.builtin ? "Built into Morche" : "This workspace's own",
            },
          ]}
        />
        <Section
          title="Installed on"
          aside={installs.length ? String(installs.length) : undefined}
        >
          {installs.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No server yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {installs.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => close(() => a.manage(i))}
                    className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-start text-body-sm outline-none hover:bg-subtle focus-visible:bg-subtle"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {i.server_name}
                    </span>
                    <span className="text-caption text-ash">
                      {i.version || "—"}
                    </span>
                    <InstallStatus install={i} className="text-caption" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
        {r.notes && (
          <Section title="Notes">
            <Markdown>{r.notes}</Markdown>
          </Section>
        )}
      </LayerBody>
      <LayerFooter>
        {custom && can.recipes && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete from the catalog"
              className="size-11 md:size-9"
              onClick={() => close(() => a.removeRecipe(r))}
            >
              <Trash2 />
            </Button>
            <Button
              variant="outline"
              className="h-11 md:h-9"
              nativeButton={false}
              render={<Link href={recipeHref(r.record_id ?? "")} />}
            >
              <Pencil />
              Edit
            </Button>
          </>
        )}
        {!custom && can.recipes && (
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() =>
              close(() =>
                router.push(
                  `/applications/recipes/new?from=${encodeURIComponent(r.id)}`,
                ),
              )
            }
          >
            Copy as my own
          </Button>
        )}
        {can.install && (
          <Button
            className="ms-auto h-11 flex-1 md:h-9 md:flex-none"
            onClick={() => close(() => a.install(r))}
          >
            <Download />
            Install
          </Button>
        )}
      </LayerFooter>
    </Layer>
  )
}
