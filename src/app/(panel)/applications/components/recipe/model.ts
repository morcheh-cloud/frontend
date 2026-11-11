import { LineCounter, parseDocument, stringify, visit } from "yaml"

import { yamlProblems } from "@/app/(panel)/ansible/components/yaml-editor"
import type { Recipe, RecipeLink, RecipeParam } from "@/lib/services"

// A recipe is edited as YAML text, and that text stays the truth: the visual
// form reads it with readDraft, changes the draft and writes it back with
// writeDraft. The text is written like the built-in recipes: `version:` is
// the command that prints the installed version (`version_command` in the
// API).

export const fieldOrder = [
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
  "also",
  "version",
  "install",
  "update",
  "uninstall",
  "compose",
] as const

export const packageManagers = [
  "apt",
  "dnf",
  "yum",
  "zypper",
  "apk",
  "pacman",
] as const

export const paramTypes: {
  value: RecipeParam["type"]
  label: string
  hint: string
}[] = [
  { value: "text", label: "Text", hint: "One line of text." },
  { value: "port", label: "Port", hint: "1 to 65535; checked for clashes." },
  { value: "password", label: "Password", hint: "Sealed, shown to Owners." },
  { value: "number", label: "Number", hint: "Digits, may be negative." },
  { value: "bool", label: "Yes / no", hint: "A switch: true or false." },
  { value: "select", label: "Choice", hint: "One of the options you give." },
  { value: "path", label: "Path", hint: "A folder or file on the server." },
  { value: "domain", label: "Domain", hint: "Like app.example.com." },
  { value: "email", label: "Email", hint: "An email address." },
]

// What the form edits: the recipe's fields, every one optional while typing,
// plus whatever unknown keys the text has (kept, so the visual form never
// drops them; Save names them).
export type Draft = Omit<
  Partial<Recipe>,
  "params" | "links" | "builtin" | "record_id" | "retired" | "$schema"
> & {
  params: RecipeParam[]
  links: RecipeLink[]
  extra: Record<string, unknown>
}

const str = (v: unknown) => (v == null ? undefined : String(v))
const strs = (v: unknown) =>
  Array.isArray(v)
    ? v.map((x) => String(x))
    : v == null
      ? undefined
      : [String(v)]
const lists = (v: unknown) =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(
        Object.entries(v as Record<string, unknown>).map(([pm, names]) => [
          pm,
          strs(names) ?? [],
        ]),
      )
    : undefined

// Reads YAML numbers where the API wants text (a port's default, a select's
// options) as text, since people write them unquoted.
function toParam(p: unknown): RecipeParam {
  const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>
  return {
    name: String(o.name ?? ""),
    label: String(o.label ?? ""),
    type: String(o.type ?? "text") as RecipeParam["type"],
    help: str(o.help),
    default: str(o.default),
    required: o.required === true ? true : undefined,
    options: strs(o.options),
    generate: str(o.generate) as RecipeParam["generate"],
  }
}

function toLink(l: unknown): RecipeLink {
  const o = (l && typeof l === "object" ? l : {}) as Record<string, unknown>
  return {
    label: String(o.label ?? ""),
    port: String(o.port ?? ""),
    path: str(o.path),
    scheme: str(o.scheme) as RecipeLink["scheme"],
  }
}

export type Read =
  | { draft: Draft; error?: undefined }
  | { draft?: undefined; error: { message: string; line?: number } }

// The text as a draft, or why it can't be read as one.
export function readDraft(text: string): Read {
  const syntax = yamlProblems(text, "recipe")
  if (syntax.length) {
    const lc = new LineCounter()
    parseDocument(text, { lineCounter: lc })
    const first = syntax[0]
    return {
      error: {
        message: first.message,
        line: lc.linePos(first.from ?? 0).line,
      },
    }
  }
  const raw = (parseDocument(text).toJS() ?? {}) as Record<string, unknown>
  const extra: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!(fieldOrder as readonly string[]).includes(k)) extra[k] = v
  }
  return {
    draft: {
      id: str(raw.id),
      name: str(raw.name),
      kind: str(raw.kind) as Recipe["kind"] | undefined,
      summary: str(raw.summary),
      category: str(raw.category),
      icon: str(raw.icon),
      logo: str(raw.logo),
      website: str(raw.website),
      description: str(raw.description),
      requires: strs(raw.requires),
      os: strs(raw.os),
      params: Array.isArray(raw.params) ? raw.params.map(toParam) : [],
      links: Array.isArray(raw.links) ? raw.links.map(toLink) : [],
      notes: str(raw.notes),
      packages: lists(raw.packages),
      also: lists(raw.also),
      version_command: str(raw.version),
      install: str(raw.install),
      update: str(raw.update),
      uninstall: str(raw.uninstall),
      compose: str(raw.compose),
      extra,
    },
  }
}

const empty = (v: unknown) =>
  v == null ||
  v === "" ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)

// Drops a row's empty keys, so the YAML holds only what was set.
const tidy = <T extends object>(row: T) =>
  Object.fromEntries(
    Object.entries(row).filter(([k, v]) => k === "name" || !empty(v)),
  )

export function recipeToYaml(r: Partial<Recipe> & { extra?: object }) {
  const src: Record<string, unknown> = {
    ...r,
    version: r.version_command,
    params: r.params?.map(tidy),
    links: r.links?.map(tidy),
  }
  const out: Record<string, unknown> = {}
  for (const k of fieldOrder) {
    if (!empty(src[k])) out[k] = src[k]
  }
  for (const [k, v] of Object.entries(r.extra ?? {})) out[k] = v
  return stringify(out, { lineWidth: 0, blockQuote: "literal" })
}

export const writeDraft = (d: Draft) => recipeToYaml(d)

// True when the text has YAML comments, which a visual change would drop
// (text inside a script or compose block isn't a comment).
export function hasComments(text: string) {
  const doc = parseDocument(text)
  if (doc.commentBefore || doc.comment) return true
  let found = false
  visit(doc, (_, node) => {
    const n = node as { commentBefore?: string | null; comment?: string | null }
    if (n.commentBefore || n.comment) {
      found = true
      return visit.BREAK
    }
  })
  return found
}

// ---- Checks ----
// The backend's rules, all at once (it names only the first), keyed by the
// path its errors use ("params[0].name").

const idRe = /^[a-z0-9][a-z0-9-]{0,62}$/
const paramRe = /^[A-Z][A-Z0-9_]{0,62}$/
const packageRe = /^[A-Za-z0-9][A-Za-z0-9._+:@-]*$/
const serviceRe = /^[a-z0-9][a-z0-9_-]*$/
const portRe = /^[0-9]{1,5}$/
const logoRe = /^[a-z0-9]{1,40}$/
const numberRe = /^-?[0-9]+(\.[0-9]+)?$/
const reserved = new Set([
  "PATH",
  "IFS",
  "ENV",
  "BASH_ENV",
  "SHELLOPTS",
  "BASHOPTS",
  "PS4",
  "HOME",
  "SHELL",
  "USER",
  "LOGNAME",
  "SUDO_ASKPASS",
  "PM",
  "PKGS",
  "COMPOSE_PROJECT_NAME",
  "COMPOSE_FILE",
])
export const reservedParam = (n: string) =>
  reserved.has(n) ||
  ["LD_", "BASH_FUNC", "PYTHON", "MORCHEH_"].some((p) => n.startsWith(p))

export type Problems = Record<string, string>

function checkLists(
  out: Problems,
  key: "packages" | "also",
  v: Record<string, string[]> | undefined,
) {
  for (const [pm, names] of Object.entries(v ?? {})) {
    if (
      pm !== "default" &&
      !(packageManagers as readonly string[]).includes(pm)
    )
      out[key] ??= `Unknown package manager ${pm}.`
    if (key === "packages" && names.length === 0)
      out[key] ??= `No packages for ${pm}.`
    const badName = names.find((n) => !packageRe.test(n))
    if (badName) out[key] ??= `Bad package name ${badName}.`
  }
}

function checkComposeText(text: string) {
  if (!text.trim()) return "Write the compose file."
  const problems = yamlProblems(text, "compose")
  if (problems.length) return `It isn't valid YAML: ${problems[0].message}`
  const services = (parseDocument(text).toJS() as { services?: unknown })
    ?.services
  if (
    !services ||
    typeof services !== "object" ||
    !Object.keys(services).length
  )
    return "It has no services."
  const badName = Object.keys(services).find((n) => !serviceRe.test(n))
  if (badName)
    return `Use lowercase letters, digits, dashes and underscores for service names (${badName}).`
  return undefined
}

function checkValue(p: RecipeParam, v: string) {
  if (v.includes("\n")) return "Keep it to one line."
  if (p.type === "port") {
    const n = Number(v)
    if (!portRe.test(v) || n < 1 || n > 65535)
      return "Use a port from 1 to 65535."
  }
  if (p.type === "number" && !numberRe.test(v)) return "Use a number."
  if (p.type === "bool" && v !== "true" && v !== "false")
    return "Use true or false."
  if (p.type === "select" && !(p.options ?? []).includes(v))
    return "Pick one of the options."
  return undefined
}

export function checkDraft(d: Draft, taken: string[] = []): Problems {
  const out: Problems = {}
  const id = d.id?.trim() ?? ""
  if (!idRe.test(id)) out.id = "Use lowercase letters, digits and dashes."
  else if (id === "system" || taken.includes(id))
    out.id = "Another application in the catalog has this id."
  const name = d.name?.trim() ?? ""
  if (!name || name.length > 100)
    out.name = "Give it a name (up to 100 characters)."
  checkLists(out, "also", d.also)
  switch (d.kind) {
    case "package":
      if (!Object.keys(d.packages ?? {}).length)
        out.packages = "Name at least one package."
      checkLists(out, "packages", d.packages)
      break
    case "docker": {
      if (Object.keys(d.also ?? {}).length)
        out.also = "Only a package recipe has other package names."
      const compose = checkComposeText(d.compose ?? "")
      if (compose) out.compose = compose
      break
    }
    case "script":
      if (!d.install?.trim()) out.install = "Write the install script."
      if (!d.version_command?.trim())
        out.version_command =
          "Write a command that prints the version, so Morche can tell it's installed."
      break
    default:
      out.kind = "Pick package, docker or script."
  }
  const badOs = d.os?.find(
    (o) => !(packageManagers as readonly string[]).includes(o),
  )
  if (badOs) out.os = `Unknown package manager ${badOs}.`
  const seen = new Set<string>()
  d.params.forEach((p, i) => {
    const f = `params[${i}]`
    const n = p.name.trim()
    if (!n) out[`${f}.name`] = "Give it a variable name, like PORT."
    else if (!paramRe.test(n))
      out[`${f}.name`] = "Use upper case letters, digits and _."
    else if (reservedParam(n))
      out[`${f}.name`] = "The shell uses this name: pick another."
    else if (seen.has(n)) out[`${f}.name`] = "Another parameter has this name."
    seen.add(n)
    if (p.type === "select" && !p.options?.length)
      out[`${f}.options`] = "Give the choices."
    if (p.default) {
      const bad = checkValue(p, p.default)
      if (bad) out[`${f}.default`] = bad
    }
  })
  const logo = d.logo?.trim().toLowerCase()
  if (logo && !logoRe.test(logo))
    out.logo = "Use a logo name: lowercase letters and digits."
  if (d.website) {
    try {
      const u = new URL(d.website)
      if (!["http:", "https:"].includes(u.protocol) || u.username)
        throw new Error()
    } catch {
      out.website = "Use an http(s) address like https://example.com."
    }
  }
  d.links.forEach((l, i) => {
    const f = `links[${i}]`
    if (l.path && (!l.path.startsWith("/") || l.path.startsWith("//")))
      out[`${f}.path`] = "Start the path with a single /."
    if (!l.port) out[`${f}.port`] = "Say which port."
    else if (!seen.has(l.port) && !portRe.test(l.port))
      out[`${f}.port`] = "Use a port number or a parameter's name."
  })
  for (const k of Object.keys(d.extra)) out[k] = `Unknown field “${k}”.`
  return out
}

// The body the backend takes, when the draft has what it needs.
export function toRecipe(d: Draft): Recipe {
  const { extra: _, ...rest } = d
  return {
    ...rest,
    builtin: false,
    id: d.id?.trim() ?? "",
    name: d.name?.trim() ?? "",
    kind: d.kind ?? "docker",
    summary: d.summary?.trim() ?? "",
    category: d.category?.trim() ?? "",
    params: d.params.length ? d.params : undefined,
    links: d.links.length ? d.links : undefined,
  }
}

// The line a field's path points at ("params[0].name" → its line).
export function lineOf(text: string, path: string) {
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

// ---- Naming ----

export const slugOf = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)

export const varOf = (label: string) => {
  const v = label
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 63)
  return /^[0-9]/.test(v) ? `P_${v}` : v
}

// ---- Kinds ----

// The fields only one kind uses. Switching kind sets them aside, and
// switching back brings them again.
export const kindFields = {
  docker: ["compose"],
  package: ["packages", "also", "version_command", "install", "update"],
  script: ["install", "update", "uninstall", "version_command"],
} as const satisfies Record<Recipe["kind"], readonly (keyof Draft)[]>

export const allKindFields = [
  ...new Set(Object.values(kindFields).flat()),
] as (keyof Draft)[]

// What a new recipe starts with, per kind.
export const starters: Record<Recipe["kind"], Draft> = {
  docker: {
    kind: "docker",
    category: "Other",
    requires: ["docker"],
    params: [{ name: "PORT", label: "Port", type: "port", default: "8080" }],
    links: [{ label: "Open", port: "PORT" }],
    compose: `services:
  app:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "\${PORT}:80"
    volumes:
      - data:/data
volumes:
  data:
`,
    extra: {},
  },
  package: {
    kind: "package",
    category: "System",
    params: [],
    links: [],
    packages: { default: [] },
    extra: {},
  },
  script: {
    kind: "script",
    category: "Other",
    params: [],
    links: [],
    install: `command -v curl >/dev/null 2>&1 || { pkg_refresh; pkg_install curl; }
curl -fsSL https://example.com/install.sh | sh
`,
    extra: {},
  },
}

export const starterText = (kind: Recipe["kind"]) => writeDraft(starters[kind])
