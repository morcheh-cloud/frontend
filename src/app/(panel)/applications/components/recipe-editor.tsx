"use client"

import { BookOpen, ChevronLeft, LayoutGrid, Save, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { LineCounter, parseDocument, stringify } from "yaml"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import {
  YamlEditor,
  yamlProblems,
} from "@/app/(panel)/ansible/components/yaml-editor"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBackOr } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, fieldErrors } from "@/lib/api"
import type { Recipe } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCatalog, useSaveRecipe } from "../api"
import { appLogos, kindLabels, RecipeIcon, recipeHref } from "./meta"
import { useSoftwareCan } from "./permissions"
import { useSoftwareActions } from "./software-actions"

const CATALOG = "/applications"

// ---- YAML <-> Recipe ----
// The text is written like the built-in recipes: `version:` is the command
// that prints the installed version (`version_command` in the API).

const order = [
  "id",
  "name",
  "summary",
  "kind",
  "category",
  "icon",
  "logo",
  "website",
  "description",
  "requires",
  "os",
  "params",
  "links",
  "notes",
  "packages",
  "version",
  "install",
  "update",
  "uninstall",
  "compose",
] as const

export function recipeToYaml(r: Partial<Recipe>) {
  const src: Record<string, unknown> = { ...r, version: r.version_command }
  const out: Record<string, unknown> = {}
  for (const k of order) {
    const v = src[k]
    if (v == null || v === "") continue
    if (Array.isArray(v) && v.length === 0) continue
    if (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)
      continue
    out[k] = v
  }
  return stringify(out, { lineWidth: 0, blockQuote: "literal" })
}

const str = (v: unknown) => (v == null ? undefined : String(v))
const strs = (v: unknown) =>
  Array.isArray(v)
    ? v.map((x) => String(x))
    : v == null
      ? undefined
      : [String(v)]

type Parsed = { recipe?: Recipe; problems: { path: string; message: string }[] }

// Reads the text into the body the backend takes. YAML numbers where the API
// wants text (a port's default, a select's options) become text, as Ansible
// people would write them unquoted.
export function parseRecipe(text: string): Parsed {
  const syntax = yamlProblems(text, "recipe")
  if (syntax.length)
    return { problems: [{ path: "", message: syntax[0].message }] }
  const raw = parseDocument(text).toJS() as Record<string, unknown>
  const problems: Parsed["problems"] = []
  for (const k of Object.keys(raw)) {
    if (!(order as readonly string[]).includes(k))
      problems.push({ path: k, message: `Unknown field “${k}”.` })
  }
  for (const k of ["id", "name", "kind"] as const) {
    if (!raw[k]) problems.push({ path: k, message: `Add “${k}:”.` })
  }
  if (problems.length) return { problems }
  const params = Array.isArray(raw.params)
    ? (raw.params as Record<string, unknown>[]).map((p) => ({
        name: String(p.name ?? ""),
        label: String(p.label ?? ""),
        type: String(p.type ?? "text") as NonNullable<
          Recipe["params"]
        >[number]["type"],
        help: str(p.help),
        default: str(p.default),
        required: p.required === true ? true : undefined,
        options: strs(p.options),
        generate: str(p.generate) as NonNullable<
          Recipe["params"]
        >[number]["generate"],
      }))
    : undefined
  const links = Array.isArray(raw.links)
    ? (raw.links as Record<string, unknown>[]).map((l) => ({
        label: String(l.label ?? ""),
        port: String(l.port ?? ""),
        path: str(l.path),
        scheme: str(l.scheme) as NonNullable<Recipe["links"]>[number]["scheme"],
      }))
    : undefined
  const packages =
    raw.packages && typeof raw.packages === "object"
      ? Object.fromEntries(
          Object.entries(raw.packages as Record<string, unknown>).map(
            ([pm, names]) => [pm, strs(names) ?? []],
          ),
        )
      : undefined
  const recipe: Recipe = {
    builtin: false,
    id: String(raw.id),
    name: String(raw.name),
    kind: String(raw.kind) as Recipe["kind"],
    summary: str(raw.summary) ?? "",
    category: str(raw.category) ?? "",
    icon: str(raw.icon),
    logo: str(raw.logo),
    website: str(raw.website),
    description: str(raw.description),
    requires: strs(raw.requires),
    os: strs(raw.os),
    params,
    links,
    notes: str(raw.notes),
    packages,
    version_command: str(raw.version),
    install: str(raw.install),
    update: str(raw.update),
    uninstall: str(raw.uninstall),
    compose: str(raw.compose),
  }
  return { recipe, problems: [] }
}

// The line a backend field error points at ("params[0].name" → its line).
function lineOf(text: string, path: string) {
  if (!path) return undefined
  const keys = path
    .replace(/^version_command$/, "version")
    .split(/[.[\]]+/)
    .filter(Boolean)
    .map((k) => (/^\d+$/.test(k) ? Number(k) : k))
  const lc = new LineCounter()
  const doc = parseDocument(text, { lineCounter: lc })
  for (let n = keys.length; n > 0; n--) {
    const node = doc.getIn(keys.slice(0, n), true) as
      | { range?: [number, number] }
      | undefined
    if (node?.range) return lc.linePos(node.range[0]).line
  }
  return undefined
}

// ---- Starting points ----

const templates = {
  docker: `id: my-app
name: My app
summary: One line about what it does.
kind: docker
category: Other
icon: box
website: https://example.com
requires: [docker]
params:
  - name: PORT
    label: Port
    type: port
    default: "8080"
  - name: ADMIN_PASSWORD
    label: Admin password
    type: password
    generate: password
links:
  - label: Open
    port: PORT
notes: |
  Sign in as **admin** with the password Morcheh made (Details › Show passwords).
compose: |
  services:
    app:
      image: nginx:alpine
      restart: unless-stopped
      ports:
        - "\${PORT}:80"
      environment:
        ADMIN_PASSWORD: \${ADMIN_PASSWORD}
      volumes:
        - data:/data
  volumes:
    data:
`,
  package: `id: my-tool
name: My tool
summary: One line about what it does.
kind: package
category: System
icon: terminal
packages:
  default: [my-tool]
  # apt: [my-tool-deb-name]
  # dnf: [my-tool-rpm-name]
version: my-tool --version | head -n1
`,
  script: `id: my-installer
name: My installer
summary: One line about what it does.
kind: script
category: Other
icon: wrench
os: [apt, dnf]
version: my-tool --version | awk '{print $2}'
install: |
  command -v curl >/dev/null 2>&1 || { pkg_refresh; pkg_install curl; }
  curl -fsSL https://example.com/install.sh | sh
update: |
  curl -fsSL https://example.com/install.sh | sh
uninstall: |
  rm -f /usr/local/bin/my-tool
`,
} satisfies Record<Recipe["kind"], string>

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
      : undefined
  return (
    <Editor
      saved={saved}
      start={start}
      taken={items.map((r) => r.id)}
      phone={phone}
    />
  )
}

function Editor({
  saved,
  start,
  taken,
  phone,
}: {
  saved?: Recipe
  start?: string
  taken: string[]
  phone: boolean
}) {
  const { workspace } = useWorkspace()
  const can = useSoftwareCan()
  const a = useSoftwareActions()
  const router = useRouter()
  const back = useBackOr(CATALOG)
  const readOnly = !can.recipes
  const [kind, setKind] = useState<Recipe["kind"]>("docker")
  const [text, setText] = useState(start ?? templates.docker)
  const [touched, setTouched] = useState(false)
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([])
  const save = useSaveRecipe(workspace?.id ?? "")
  const initial = saved ? recipeToYaml(saved) : (start ?? templates[kind])
  const dirty = text !== initial || (!saved && touched)
  const [help, setHelp] = useOpen("recipe-help")

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

  const parsed = parseRecipe(text)
  const preview = parsed.recipe
  const idTaken =
    !saved && preview && taken.includes(preview.id)
      ? "Another application in the catalog has this id."
      : ""

  const submit = () => {
    if (parsed.problems.length || !parsed.recipe) {
      setErrors(parsed.problems)
      return
    }
    if (idTaken) {
      setErrors([{ path: "id", message: idTaken }])
      return
    }
    setErrors([])
    save.mutate(
      saved ? { ...parsed.recipe, record_id: saved.record_id } : parsed.recipe,
      {
        onSuccess: (r) => {
          toast.success(saved ? "Saved" : `${r.name} is in the catalog`)
          setTouched(false)
          if (!saved) router.replace(recipeHref(r.record_id ?? ""))
        },
        onError: (err) => {
          const fields = Object.entries(fieldErrors(err)).map(
            ([path, message]) => ({ path, message }),
          )
          setErrors(
            fields.length
              ? fields
              : [
                  {
                    path: "",
                    message:
                      err instanceof ApiError ? err.message : String(err),
                  },
                ],
          )
        },
      },
    )
  }

  const problems = errors.length > 0 && (
    <Callout warn title="It can't be saved yet">
      <ul className="flex flex-col gap-1">
        {errors.map((e) => {
          const line = lineOf(text, e.path)
          return (
            <li key={`${e.path}:${e.message}`}>
              {e.path && <code className="font-mono">{e.path}</code>}
              {line ? ` (line ${line})` : ""}
              {e.path ? ": " : ""}
              {e.message}
            </li>
          )
        })}
      </ul>
    </Callout>
  )

  const starter = !saved && !start && !readOnly && (
    <Segmented
      label="Start from"
      items={(["docker", "package", "script"] as const).map((k) => ({
        value: k,
        label: kindLabels[k],
      }))}
      value={kind}
      onChange={(k) => {
        if (
          touched &&
          !window.confirm("Start over from this template? Your text goes.")
        )
          return
        setKind(k)
        setText(templates[k])
        setTouched(false)
        setErrors([])
      }}
    />
  )

  const editor = (
    <YamlEditor
      kind="recipe"
      value={text}
      readOnly={readOnly}
      onChange={(v) => {
        setText(v)
        setTouched(true)
      }}
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
            aria-label="What goes in it"
            onClick={() => setHelp(true)}
          >
            <BookOpen className="size-5" />
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
        {(starter || problems) && (
          <div className="flex shrink-0 flex-col gap-3 px-4 py-3">
            {starter && (
              <div className="-mx-4 flex [scrollbar-width:none] overflow-x-auto px-4">
                {starter}
              </div>
            )}
            {problems}
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col">{editor}</div>
        <BottomSheet
          full
          open={help}
          onOpenChange={setHelp}
          title="What goes in it"
        >
          <div className="overflow-y-auto px-4 pb-[max(--spacing(4),env(safe-area-inset-bottom))]">
            <Reference />
          </div>
        </BottomSheet>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-3rem-1px)] flex-col gap-4 px-6 pt-5 pb-6">
      <div className="flex flex-wrap items-center gap-3">
        {preview && (
          <span className="flex min-w-0 items-center gap-3">
            <RecipeIcon recipe={preview} size="sm" />
            <span className="min-w-0">
              <span className="block truncate font-medium">{preview.name}</span>
              <span className="block truncate text-caption text-ash">
                {kindLabels[preview.kind] ?? preview.kind}
                {preview.summary ? ` · ${preview.summary}` : ""}
              </span>
            </span>
          </span>
        )}
        {starter}
        {readOnly && (
          <span className="text-caption text-ash">
            Read only: changing the catalog needs Engineer access.
          </span>
        )}
        <div className="ms-auto flex items-center gap-2">
          {remove && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete from the catalog"
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
      {problems}
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex min-w-0 flex-1 flex-col">{editor}</div>
        <aside className="hidden w-80 shrink-0 overflow-y-auto xl:block">
          <Reference />
        </aside>
      </div>
    </div>
  )
}

const fields: [string, string][] = [
  [
    "id",
    "Short name, lowercase letters, digits and dashes. It can't change later.",
  ],
  ["name / summary", "What the catalog shows: the name and one line."],
  [
    "kind",
    "docker (a compose file), package (the package manager) or script (your own install script).",
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
    "What the install asks for. Each has name (UPPER_CASE), label, type (text, number, port, password, bool, select, path, domain, email), default, required, options, help; generate: password or hex fills it when left blank. They reach the scripts and the compose file as ${NAME}.",
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
    "version",
    "A command that prints the installed version; package and script kinds.",
  ],
  [
    "install / update / uninstall",
    "Shell scripts (script kind; install and update also run for package kind when given). Helpers: pkg_refresh, pkg_install, $PM.",
  ],
  [
    "compose",
    "docker kind: the compose file. Morcheh keeps it in /opt/morcheh/apps/<id> on the server.",
  ],
]

function Reference() {
  return (
    <div className="flex flex-col gap-3 text-body-sm">
      <p className="text-muted-foreground">
        Written like Morcheh's own applications. Save checks it; a field it
        refuses is named with its line.
      </p>
      <dl className="flex flex-col gap-3">
        {fields.map(([k, v]) => (
          <div key={k}>
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
