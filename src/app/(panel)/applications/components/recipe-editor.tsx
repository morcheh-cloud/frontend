"use client"

import {
  ChevronLeft,
  Code,
  Eye,
  LayoutGrid,
  ListChecks,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import { YamlEditor } from "@/app/(panel)/ansible/components/yaml-editor"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { guideHref } from "@/components/help/guides"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import { ApiError, fieldErrors } from "@/lib/api"
import type { Recipe } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCatalog, useSaveRecipe } from "../api"
import { appLogos, kindLabels, RecipeIcon, recipeHref } from "./meta"
import { Layer, LayerBody } from "./parts"
import { useSoftwareCan } from "./permissions"
import {
  allKindFields,
  checkDraft,
  type Draft,
  hasComments,
  kindFields,
  lineOf,
  type Problems,
  readDraft,
  recipeToYaml,
  slugOf,
  starters,
  starterText,
  toRecipe,
  writeDraft,
} from "./recipe/model"
import { RecipePreview } from "./recipe/preview"
import { formSections, RecipeForm, sectionOf } from "./recipe/recipe-form"
import { useSoftwareActions } from "./software-actions"

const CATALOG = "/applications"

const modes = ["visual", "yaml"] as const
type Mode = (typeof modes)[number]
const modeItems = [
  { value: "visual", label: "Visual" },
  { value: "yaml", label: "YAML" },
] as const

// ---- Page ----

export function RecipeEditorFromRoute() {
  const params = useParams<{ id?: string }>()
  const phone = useIsPhone()
  if (phone === null) return null
  return <Loader key={params.id ?? "new"} recordId={params.id} phone={phone} />
}

function Loader({ recordId, phone }: { recordId?: string; phone: boolean }) {
  const { workspace } = useWorkspace()
  const catalog = useCatalog(workspace?.id)
  const from = useSearchParams().get("from")
  if (catalog.isPending) {
    return (
      <div className={cn("flex flex-col gap-3", phone ? "p-4" : "px-6 pt-5")}>
        <Skeleton className="h-9 w-72 rounded-lg" />
        <Skeleton className="h-[60dvh] rounded-2xl" />
      </div>
    )
  }
  const items = catalog.data?.items ?? []
  const saved = recordId
    ? items.find((r) => r.record_id === recordId)
    : undefined
  if (recordId && !saved) {
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={LayoutGrid}
          title="This application isn't here"
          body={
            catalog.error?.message ??
            "It was removed from the catalog, or it belongs to another workspace."
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href={CATALOG} />}
              nativeButton={false}
            >
              Back to the catalog
            </Button>
          }
        />
      </div>
    )
  }
  const base = !saved && from ? items.find((r) => r.id === from) : undefined
  const start = saved
    ? recipeToYaml(saved)
    : base
      ? recipeToYaml({
          ...base,
          id: `${base.id}-custom`,
          name: `${base.name} (custom)`,
        })
      : starterText("package")
  const ids = items.filter((r) => r.id !== saved?.id).map((r) => r.id)
  return (
    <Editor
      saved={saved}
      start={start}
      taken={ids}
      categories={[
        ...new Set(items.map((r) => r.category).filter(Boolean)),
      ].sort()}
      phone={phone}
    />
  )
}

// Where a problem's field is in the visual form: the field itself, or the
// nearest wrapper of it ("params[0].name" → "params[0]").
function fieldNode(path: string) {
  const parts = path.split(".")
  for (let n = parts.length; n > 0; n--) {
    const el = document.querySelector<HTMLElement>(
      `[data-field="${CSS.escape(parts.slice(0, n).join("."))}"]`,
    )
    if (el) return el
  }
  return document.getElementById(`recipe-${sectionOf(path)}`)
}

function reveal(path: string) {
  const el = fieldNode(path)
  if (!el) return
  el.scrollIntoView({ block: "center", behavior: "smooth" })
  const input = el.querySelector<HTMLElement>(
    "input:not([type=radio]):not([disabled]), textarea, [contenteditable=true], button[role=combobox]",
  )
  input?.focus({ preventScroll: true })
}

function Editor({
  saved,
  start,
  taken,
  categories,
  phone,
}: {
  saved?: Recipe
  start: string
  taken: string[]
  categories: string[]
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  const can = useSoftwareCan()
  const a = useSoftwareActions()
  const router = useRouter()
  const back = useBackOr(CATALOG)
  const readOnly = !can.recipes
  const [stored, setMode] = useStoredChoice<Mode>(
    "morcheh.applications.recipe-mode",
    modes,
  )
  // Read-only people read the text; the form is for building.
  const mode: Mode = readOnly ? "yaml" : stored
  const [text, setText] = useState(start)
  const [touched, setTouched] = useState(false)
  // Save was pressed: from then on problems show as they're typed.
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<Problems>({})
  // What one kind had, set aside while another is picked.
  const [stash, setStash] = useState<Partial<Draft>>({})
  const [side, setSide] = useStoredChoice("morcheh.applications.recipe-side", [
    "preview",
    "fields",
  ] as const)
  const [sheet, setSheet] = useOpen("recipe-preview")
  const save = useSaveRecipe(workspace?.id ?? "")
  const dirty = saved ? text !== start : touched

  usePageCrumbs([
    {
      href: saved
        ? recipeHref(saved.record_id ?? "")
        : "/applications/recipes/new",
      label: saved?.name ?? "New application",
    },
  ])

  // Don't lose typing to a closed tab.
  useEffect(() => {
    if (!dirty || readOnly) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, readOnly])

  const read = readDraft(text)
  const draft = read.draft
  const local = draft ? checkDraft(draft, taken) : {}
  const all: Problems = { ...local, ...server }
  const shown: Problems = tried ? all : server
  const count = Object.keys(all).length

  const edit = (next: string) => {
    setText(next)
    setTouched(true)
    setServer({})
  }
  const change = (patch: Partial<Draft>) => {
    if (draft) edit(writeDraft({ ...draft, ...patch }))
  }

  // The id follows the name on a new recipe until someone types an id.
  const onName = (name: string) => {
    if (!draft) return
    const auto = !saved && (draft.id ?? "") === slugOf(draft.name ?? "")
    change(auto ? { name, id: slugOf(name) } : { name })
  }

  const onKind = (kind: Recipe["kind"]) => {
    if (!draft || kind === draft.kind) return
    const old = draft.kind
    // A new recipe nobody touched yet: just the other starter.
    if (!saved && old && text === starterText(old)) {
      setText(starterText(kind))
      return
    }
    const own = (old ? kindFields[old] : []) as readonly (keyof Draft)[]
    const keep: Partial<Draft> = {}
    const next: Draft = { ...draft, kind }
    for (const f of allKindFields) {
      if (draft[f] !== undefined) Object.assign(keep, { [f]: draft[f] })
      delete next[f]
    }
    for (const f of kindFields[kind] as readonly (keyof Draft)[]) {
      const v = own.includes(f) ? draft[f] : (stash[f] ?? starters[kind][f])
      if (v !== undefined) Object.assign(next, { [f]: v })
    }
    setStash({ ...stash, ...keep })
    edit(writeDraft(next))
  }

  const submit = () => {
    setTried(true)
    if (!draft) {
      setMode("yaml")
      return
    }
    if (Object.keys(local).length) {
      const first = Object.keys(local)[0]
      if (mode === "visual") requestAnimationFrame(() => reveal(first))
      return
    }
    const body = toRecipe(draft)
    save.mutate(saved ? { ...body, record_id: saved.record_id } : body, {
      onSuccess: (r) => {
        toast.success(saved ? "Saved" : `${r.name} is in the catalog`)
        setTouched(false)
        setTried(false)
        if (!saved) router.replace(recipeHref(r.record_id ?? ""))
      },
      onError: (err) => {
        const fields = fieldErrors(err)
        setServer(
          Object.keys(fields).length
            ? fields
            : { "": err instanceof ApiError ? err.message : String(err) },
        )
      },
    })
  }

  const problemList = Object.keys(shown).length > 0 && (
    <Callout
      warn
      title={
        Object.keys(shown).length === 1
          ? "One thing to fix before saving"
          : `${Object.keys(shown).length} things to fix before saving`
      }
    >
      <ul className="flex flex-col gap-1">
        {Object.entries(shown).map(([path, message]) => {
          const line = mode === "yaml" && path ? lineOf(text, path) : undefined
          const where = formSections.find((s) => s.id === sectionOf(path))
          return (
            <li key={path} className="flex flex-wrap items-baseline gap-x-2">
              {mode === "visual" && path && draft ? (
                <button
                  type="button"
                  onClick={() => reveal(path)}
                  className="text-start font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {where?.label}
                </button>
              ) : (
                path && (
                  <code className="font-mono text-foreground">
                    {path}
                    {line ? ` · line ${line}` : ""}
                  </code>
                )
              )}
              <span>{message}</span>
            </li>
          )
        })}
      </ul>
    </Callout>
  )

  const notices = mode === "visual" && (
    <>
      {read.error && (
        <Callout
          warn
          title="The YAML can't be read as a form right now"
          action={
            <Button
              variant="outline"
              className="h-11 md:h-8"
              onClick={() => setMode("yaml")}
            >
              <Code />
              Fix it in YAML
            </Button>
          }
        >
          {read.error.line ? `Line ${read.error.line}: ` : ""}
          {read.error.message}
        </Callout>
      )}
      {draft && hasComments(text) && (
        <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-caption text-muted-foreground">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          The YAML has comments. A change here writes the text again without
          them; edit in YAML to keep them.
        </p>
      )}
    </>
  )

  const form = draft && (
    <RecipeForm
      draft={draft}
      problems={shown}
      onChange={change}
      onKind={onKind}
      onName={onName}
      idLocked={!!saved}
      phone={phone}
      categories={categories}
      recipeIds={taken}
    />
  )

  const yaml = (
    <YamlEditor
      kind="recipe"
      value={text}
      readOnly={readOnly}
      onChange={edit}
      className={cn("flex-1 border-border", !phone && "rounded-2xl border")}
    />
  )

  const saveButton = !readOnly && (
    <Button
      className={phone ? "h-9" : undefined}
      disabled={save.isPending || (!!saved && !dirty)}
      onClick={submit}
    >
      <Save />
      {save.isPending ? "Saving…" : saved ? "Save" : "Add to catalog"}
    </Button>
  )

  const remove =
    saved && !readOnly
      ? () => a.removeRecipe(saved, () => router.replace(CATALOG))
      : undefined

  const sidePanel = (
    <div className="flex flex-col gap-5">
      <Segmented
        label="Side panel"
        items={[
          { value: "preview", label: "Preview" },
          { value: "fields", label: "Fields" },
        ]}
        value={side}
        onChange={setSide}
      />
      {side === "preview" ? (
        draft ? (
          <RecipePreview draft={draft} />
        ) : (
          <p className="text-body-sm text-muted-foreground">
            The preview comes back once the YAML can be read.
          </p>
        )
      ) : (
        <Reference />
      )}
    </div>
  )

  const previewLayer = (
    <Layer open={sheet} onOpenChange={setSheet} title="Preview and fields">
      <LayerBody>{sidePanel}</LayerBody>
    </Layer>
  )

  if (phone) {
    return (
      <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-1 pe-3 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {saved?.name ?? "New application"}
          </h1>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Preview and fields"
            onClick={() => setSheet(true)}
          >
            <Eye className="size-5" />
          </Button>
          {remove && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Delete from the catalog"
              onClick={remove}
            >
              <Trash2 className="size-5" />
            </Button>
          )}
          {saveButton}
        </header>
        {!readOnly && (
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2 [&_fieldset]:flex-1 [&_fieldset_button]:flex-1">
            <Segmented
              label="Edit as"
              items={modeItems}
              value={mode}
              onChange={setMode}
            />
          </div>
        )}
        {mode === "visual" ? (
          <div className="min-h-0 flex-1 overflow-y-auto pb-6">
            {(problemList || notices) && (
              <div className="flex flex-col gap-3 px-4 pt-4">
                {problemList}
                {notices}
              </div>
            )}
            {form}
          </div>
        ) : (
          <>
            {problemList && (
              <div className="max-h-40 shrink-0 overflow-y-auto px-4 py-3">
                {problemList}
              </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col">{yaml}</div>
          </>
        )}
        {previewLayer}
      </div>
    )
  }

  const shownSections = draft
    ? formSections.filter((s) => s.id !== "setup" || draft.kind)
    : []
  const bad = new Set(Object.keys(shown).map(sectionOf))

  return (
    <div className="flex flex-col">
      <div className="sticky top-[calc(3rem+1px)] z-20 flex min-h-14 flex-wrap items-center gap-3 border-b border-border bg-background px-6 py-2">
        <span className="flex min-w-0 items-center gap-3">
          <RecipeIcon
            recipe={{ ...draft, kind: draft?.kind ?? "package" }}
            size="sm"
          />
          <span className="min-w-0">
            <span className="block max-w-72 truncate font-medium">
              {draft?.name?.trim() || saved?.name || "New application"}
            </span>
            <span className="block truncate text-caption text-ash">
              {draft?.kind ? kindLabels[draft.kind] : "Recipe"}
              {dirty && !readOnly ? " · Not saved" : ""}
            </span>
          </span>
        </span>
        {!readOnly && (
          <Segmented
            label="Edit as"
            items={modeItems}
            value={mode}
            onChange={setMode}
          />
        )}
        {readOnly && (
          <span className="text-caption text-ash">
            Read only: changing the catalog needs Engineer access.
          </span>
        )}
        <div className="ms-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Preview and fields"
            title="Preview and fields"
            onClick={() => setSheet(true)}
            className="xl:hidden"
          >
            <Eye />
          </Button>
          {remove && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete from the catalog"
              title="Delete from the catalog"
              onClick={remove}
            >
              <Trash2 />
            </Button>
          )}
          <Button variant="outline" onClick={back}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {saveButton}
        </div>
      </div>
      <div className="flex gap-6 px-6 pt-5 pb-10">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {problemList}
          {notices}
          {mode === "visual" ? (
            form
          ) : (
            <div className="flex h-[calc(100dvh-3rem-1px-3.5rem-3.75rem)] min-h-96 flex-col">
              {yaml}
            </div>
          )}
        </div>
        <aside className="sticky top-[calc(3rem+1px+3.5rem+1.25rem)] hidden max-h-[calc(100dvh-3rem-1px-3.5rem-2.5rem)] w-80 shrink-0 flex-col gap-6 self-start overflow-y-auto xl:flex">
          {mode === "visual" && draft && (
            <SectionNav
              sections={shownSections}
              bad={bad}
              count={tried ? count : 0}
            />
          )}
          {sidePanel}
        </aside>
      </div>
      {previewLayer}
    </div>
  )
}

function SectionNav({
  sections,
  bad,
  count,
}: {
  sections: readonly { id: string; label: string }[]
  bad: Set<string>
  count: number
}) {
  return (
    <nav aria-label="Sections" className="flex flex-col gap-0.5">
      <span className="mb-1 flex items-center gap-2 font-label text-[11px] tracking-label text-ash uppercase">
        <ListChecks className="size-3.5" />
        Sections
        {count > 0 && (
          <span className="ms-auto font-sans text-caption tracking-normal text-destructive normal-case">
            {count} to fix
          </span>
        )}
      </span>
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#recipe-${s.id}`}
          onClick={(e) => {
            e.preventDefault()
            document
              .getElementById(`recipe-${s.id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
          className="flex h-8 items-center gap-2 rounded-lg px-2 text-body-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {s.label}
          {bad.has(s.id) && (
            <span
              role="img"
              aria-label="Something to fix"
              className="ms-auto size-2 rounded-full bg-destructive"
            />
          )}
        </a>
      ))}
    </nav>
  )
}

const fields: [string, ReactNode][] = [
  [
    "id",
    "Short name, lowercase letters, digits and dashes. It can't change later.",
  ],
  ["name / summary", "What the catalog shows: the name and one line."],
  [
    "kind",
    "package (the package manager) or script (your own install script). Container apps are Containers templates now.",
  ],
  [
    "category / icon",
    "Where it's grouped, and a lucide icon name (box, database, globe…).",
  ],
  ["logo", `A brand logo shown in place of the icon: ${appLogos.join(", ")}.`],
  [
    "requires",
    "Other applications installed first when missing, such as [docker].",
  ],
  [
    "os",
    "Package managers it works with: apt, dnf, yum, zypper, pacman, apk. Empty = all.",
  ],
  [
    "params",
    "What the install asks for. Each has name (UPPER_CASE), label, type (text, number, port, password, bool, select, path, domain, email), default, required, options, help; generate: password or hex fills it when left blank. They reach the scripts as ${NAME}.",
  ],
  [
    "links",
    "Buttons on an install: label, port (a number or a port param's name), path, scheme.",
  ],
  [
    "notes",
    "Markdown shown after it's installed: first steps, where the password is.",
  ],
  ["packages", "package kind: names per package manager, or default for all."],
  [
    "also",
    "package kind: other names it may be installed as (the distro's build, like docker.io), per package manager. Never installed; updated and removed when they're the ones there.",
  ],
  [
    "version",
    "A command that prints the installed version; package and script kinds.",
  ],
  [
    "install / update / uninstall",
    "Shell scripts (script kind; install and update also run for package kind when given). Helpers: pkg_refresh, pkg_install, $PM.",
  ],
]

function Reference() {
  return (
    <div className="flex flex-col gap-3 text-body-sm">
      <p className="text-muted-foreground">
        The YAML fields, written like Morche's own applications. The Visual form
        writes the same text.
      </p>
      <dl className="flex flex-col gap-3">
        {fields.map(([k, v]) => (
          <div key={k as string}>
            <dt className="font-mono text-caption text-foreground">{k}</dt>
            <dd className="text-caption text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <Link
        href={guideHref("applications", "custom")}
        className="text-caption text-brand hover:underline"
      >
        Read the guide
      </Link>
    </div>
  )
}
