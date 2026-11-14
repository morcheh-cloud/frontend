"use client"

import {
  Copy,
  FolderOpen,
  Globe,
  Hash,
  KeyRound,
  Link2,
  type LucideIcon,
  Plus,
  SlidersHorizontal,
} from "lucide-react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { EditorCard } from "@/app/(panel)/proxy/[id]/hosts/components/editor-card"
import { CodeEditor } from "@/app/(panel)/scripts/components/code-editor"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { Recipe, RecipeLink, RecipeParam } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  ChipToggles,
  KindPicker,
  ListInput,
  LookPicker,
  moved,
  RowTools,
} from "./fields"
import {
  type Draft,
  type Problems,
  packageManagers,
  paramTypes,
  varOf,
} from "./model"

export const formSections = [
  { id: "kind", label: "How it installs" },
  { id: "about", label: "About" },
  { id: "params", label: "Install form" },
  { id: "setup", label: "What it installs" },
  { id: "after", label: "After installing" },
  { id: "where", label: "Where it runs" },
] as const

// Which section a field's path lives in (for the problems list and the
// section nav's dots).
export function sectionOf(path: string) {
  const k = path.split(/[.[]/)[0]
  if (k === "kind") return "kind"
  if (["params"].includes(k)) return "params"
  if (["links", "notes"].includes(k)) return "after"
  if (["requires", "os"].includes(k)) return "where"
  if (
    [
      "compose",
      "packages",
      "also",
      "version_command",
      "install",
      "update",
      "uninstall",
    ].includes(k)
  )
    return "setup"
  return "about"
}

export function RecipeForm({
  draft,
  problems,
  onChange,
  onKind,
  onName,
  idLocked,
  phone,
  categories,
  recipeIds,
}: {
  draft: Draft
  problems: Problems
  onChange: (patch: Partial<Draft>) => void
  onKind: (kind: Recipe["kind"]) => void
  onName: (name: string) => void
  // A saved recipe's id can't change.
  idLocked: boolean
  phone: boolean
  categories: string[]
  recipeIds: string[]
}) {
  const kind = draft.kind
  return (
    <div className={cn("flex flex-col", !phone && "gap-4")}>
      <Section id="kind" phone={phone} title="How it installs">
        <KindPicker value={kind} onChange={onKind} phone={phone} />
        <Err path="kind" problems={problems} />
      </Section>

      <About
        draft={draft}
        problems={problems}
        onChange={onChange}
        onName={onName}
        idLocked={idLocked}
        phone={phone}
        categories={categories}
      />

      <Params
        params={draft.params}
        links={draft.links}
        problems={problems}
        onChange={onChange}
        phone={phone}
      />

      {kind && (
        <Section
          id="setup"
          phone={phone}
          title={kind === "package" ? "Packages" : "Scripts"}
          hint={
            kind === "package"
              ? "Installed with the server's package manager; Morche updates and removes them too."
              : "Run as root, in order. Helpers: pkg_refresh, pkg_install <names>, and $PM (the package manager)."
          }
        >
          {kind === "package" && (
            <Packages
              draft={draft}
              problems={problems}
              onChange={onChange}
              phone={phone}
            />
          )}
          {kind === "script" && (
            <Scripts draft={draft} problems={problems} onChange={onChange} />
          )}
        </Section>
      )}

      <After
        draft={draft}
        problems={problems}
        onChange={onChange}
        phone={phone}
      />

      <Section
        id="where"
        phone={phone}
        title="Where it runs"
        hint="Checked before an install starts."
      >
        <Field
          label="Install first"
          hint="Other applications installed first where they're missing, such as docker."
          error={problems.requires}
        >
          {(p) => (
            <ListInput
              {...p}
              mono
              value={draft.requires ?? []}
              onChange={(requires) => onChange({ requires })}
              placeholder="docker"
              suggestions={recipeIds.filter((r) => r !== draft.id)}
            />
          )}
        </Field>
        <div data-field="os" className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">Package managers</span>
          <ChipToggles
            label="Package managers"
            items={packageManagers.map((pm) => ({ value: pm, label: pm }))}
            value={draft.os ?? []}
            onChange={(os) => onChange({ os })}
          />
          <p
            className={cn(
              "text-caption",
              problems.os ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {problems.os ??
              (draft.os?.length
                ? `Only servers with ${listText(draft.os)}.`
                : "None picked = every server Morche supports.")}
          </p>
        </div>
      </Section>
    </div>
  )
}

const listText = (items: string[]) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`

// ---- Pieces ----

function Section({
  id,
  phone,
  title,
  hint,
  count,
  action,
  children,
}: {
  id: string
  phone: boolean
  title: string
  hint?: ReactNode
  count?: number
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div id={`recipe-${id}`} className="scroll-mt-28">
      <EditorCard
        title={title}
        hint={hint}
        count={count}
        phone={phone}
        action={action}
      >
        {children}
      </EditorCard>
    </div>
  )
}

function Err({ path, problems }: { path: string; problems: Problems }) {
  if (!problems[path]) return null
  return (
    <p data-field={path} className="text-caption text-destructive">
      {problems[path]}
    </p>
  )
}

const mono = "font-mono text-body-sm"
const plain = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

function About({
  draft,
  problems,
  onChange,
  onName,
  idLocked,
  phone,
  categories,
}: {
  draft: Draft
  problems: Problems
  onChange: (patch: Partial<Draft>) => void
  onName: (name: string) => void
  idLocked: boolean
  phone: boolean
  categories: string[]
}) {
  const shownCats = categories.filter((c) => c !== draft.category).slice(0, 8)
  return (
    <Section
      id="about"
      phone={phone}
      title="About"
      hint="What the catalog shows."
    >
      <div className={cn("flex gap-4", phone ? "flex-col" : "items-start")}>
        <div data-field="logo" className="shrink-0">
          <LookPicker
            kind={draft.kind ?? "package"}
            icon={draft.icon}
            logo={draft.logo}
            onChange={(look) => onChange(look)}
          />
          <Err path="logo" problems={problems} />
        </div>
        <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-2">
          <Wrap path="name">
            <Field label="Name" error={problems.name}>
              {(p) => (
                <Input
                  {...p}
                  value={draft.name ?? ""}
                  onChange={(e) => onName(e.target.value)}
                  placeholder="My app"
                  maxLength={100}
                />
              )}
            </Field>
          </Wrap>
          <Wrap path="id">
            <Field
              label="Id"
              error={problems.id}
              hint={
                idLocked
                  ? "It can't change once saved."
                  : "Made from the name; lowercase letters, digits and dashes."
              }
            >
              {(p) => (
                <Input
                  {...p}
                  {...plain}
                  value={draft.id ?? ""}
                  readOnly={idLocked}
                  onChange={(e) => onChange({ id: e.target.value })}
                  placeholder="my-app"
                  className={cn(mono, idLocked && "bg-muted text-ash")}
                />
              )}
            </Field>
          </Wrap>
          <Wrap path="summary" className="md:col-span-2">
            <Field label="Summary" hint="One line under the name.">
              {(p) => (
                <Input
                  {...p}
                  value={draft.summary ?? ""}
                  onChange={(e) => onChange({ summary: e.target.value })}
                  placeholder="What it does, in a few words."
                />
              )}
            </Field>
          </Wrap>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Wrap path="category">
          <Field label="Category" hint="Empty = Other.">
            {(p) => (
              <div className="flex flex-col gap-2">
                <Input
                  {...p}
                  value={draft.category ?? ""}
                  onChange={(e) => onChange({ category: e.target.value })}
                  placeholder="Other"
                />
                {shownCats.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {shownCats.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onChange({ category: c })}
                        className="h-8 rounded-full border border-border px-2.5 text-caption text-muted-foreground hover:border-mist hover:text-foreground md:h-7"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Field>
        </Wrap>
        <Wrap path="website">
          <Field label="Website" error={problems.website} hint="Optional.">
            {(p) => (
              <Input
                {...p}
                {...plain}
                type="url"
                inputMode="url"
                value={draft.website ?? ""}
                onChange={(e) => onChange({ website: e.target.value })}
                placeholder="https://example.com"
              />
            )}
          </Field>
        </Wrap>
      </div>
      <Wrap path="description">
        <Field
          label="Description"
          hint="Optional; shown in the application's details."
        >
          {(p) => (
            <Textarea
              {...p}
              rows={3}
              value={draft.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="A few lines on what it's for and what it needs."
            />
          )}
        </Field>
      </Wrap>
    </Section>
  )
}

function Wrap({
  path,
  className,
  children,
}: {
  path: string
  className?: string
  children: ReactNode
}) {
  return (
    <div data-field={path} className={cn("min-w-0", className)}>
      {children}
    </div>
  )
}

// ---- Install form ----

const presets: {
  label: string
  icon: LucideIcon
  param: RecipeParam
}[] = [
  {
    label: "Port",
    icon: Hash,
    param: { name: "PORT", label: "Port", type: "port", default: "8080" },
  },
  {
    label: "Password",
    icon: KeyRound,
    param: {
      name: "ADMIN_PASSWORD",
      label: "Admin password",
      type: "password",
      generate: "password",
    },
  },
  {
    label: "Domain",
    icon: Globe,
    param: { name: "DOMAIN", label: "Domain", type: "domain" },
  },
  {
    label: "Data folder",
    icon: FolderOpen,
    param: {
      name: "DATA_DIR",
      label: "Data folder",
      type: "path",
      default: "/srv/data",
    },
  },
]

// A name not taken yet: PORT, PORT_2…
const freeName = (base: string, taken: string[]) => {
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}_${n}`)) n++
  return `${base}_${n}`
}

function Params({
  params,
  links,
  problems,
  onChange,
  phone,
}: {
  params: RecipeParam[]
  links: RecipeLink[]
  problems: Problems
  onChange: (patch: Partial<Draft>) => void
  phone: boolean
}) {
  const add = (p: RecipeParam) => {
    const name = freeName(
      p.name,
      params.map((x) => x.name),
    )
    onChange({
      params: [
        ...params,
        {
          ...p,
          name,
          label:
            name === p.name ? p.label : `${p.label} ${name.split("_").pop()}`,
        },
      ],
    })
  }
  const set = (i: number, p: RecipeParam) => {
    const old = params[i].name
    const next = params.map((x, j) => (j === i ? p : x))
    // A renamed port keeps the links that pointed at it.
    const linked =
      old && old !== p.name && links.some((l) => l.port === old)
        ? links.map((l) => (l.port === old ? { ...l, port: p.name } : l))
        : undefined
    onChange(linked ? { params: next, links: linked } : { params: next })
  }
  return (
    <Section
      id="params"
      phone={phone}
      title="Install form"
      count={params.length}
      hint={
        <>
          What Morche asks when someone installs it. Each value reaches the
          compose file and the scripts as{" "}
          <code className="font-mono">{"${NAME}"}</code>.
        </>
      }
    >
      {params.length === 0 && (
        <p className="rounded-2xl border border-dashed border-mist px-4 py-6 text-center text-body-sm text-muted-foreground">
          Nothing to ask: it installs the same way everywhere.
        </p>
      )}
      {params.map((p, i) => (
        <ParamRow
          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id; the text is the truth
          key={i}
          p={p}
          index={i}
          count={params.length}
          problems={problems}
          onChange={(next) => set(i, next)}
          onMove={(to) => onChange({ params: moved(params, i, to) })}
          onRemove={() =>
            onChange({ params: params.filter((_, j) => j !== i) })
          }
        />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-8"
          onClick={() => add({ name: "VALUE", label: "Value", type: "text" })}
        >
          <Plus />
          Add a question
        </Button>
        <span className="text-caption text-ash">or</span>
        {presets.map((pr) => (
          <Button
            key={pr.label}
            type="button"
            variant="ghost"
            className="h-11 text-muted-foreground md:h-8"
            onClick={() => add(pr.param)}
          >
            <pr.icon />
            {pr.label}
          </Button>
        ))}
      </div>
    </Section>
  )
}

const generateItems = [
  { value: "", label: "Ask" },
  { value: "password", label: "Make a password" },
  { value: "hex", label: "Make a hex key" },
] as const

function ParamRow({
  p,
  index,
  count,
  problems,
  onChange,
  onMove,
  onRemove,
}: {
  p: RecipeParam
  index: number
  count: number
  problems: Problems
  onChange: (p: RecipeParam) => void
  onMove: (to: number) => void
  onRemove: () => void
}) {
  const f = `params[${index}]`
  const err = (k: string) => problems[`${f}.${k}`]
  const canGenerate = p.type === "text" || p.type === "password"
  const ref = p.name ? `\${${p.name}}` : ""
  return (
    <div
      data-field={f}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-subtle/60 p-4",
        Object.keys(problems).some((k) => k.startsWith(`${f}.`)) &&
          "border-destructive/50",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-card text-caption text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {p.label || p.name || "New question"}
        </span>
        {ref && (
          <button
            type="button"
            title="Copy"
            onClick={() => {
              navigator.clipboard?.writeText(ref)
              toast.success(`Copied ${ref}`)
            }}
            className="hidden h-7 items-center gap-1.5 rounded-full bg-card px-2.5 font-mono text-caption text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            {ref}
            <Copy className="size-3" />
          </button>
        )}
        <RowTools
          index={index}
          count={count}
          noun="question"
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Wrap path={`${f}.label`}>
          <Field label="Question" hint="The label on the install form.">
            {(a) => (
              <Input
                {...a}
                value={p.label}
                onChange={(e) => {
                  const label = e.target.value
                  const auto = !p.name || p.name === varOf(p.label)
                  onChange({ ...p, label, name: auto ? varOf(label) : p.name })
                }}
                placeholder="Port"
              />
            )}
          </Field>
        </Wrap>
        <Wrap path={`${f}.name`}>
          <Field
            label="Variable"
            error={err("name")}
            hint="Upper case, digits and _; made from the question."
          >
            {(a) => (
              <Input
                {...a}
                {...plain}
                autoCapitalize="characters"
                value={p.name}
                onChange={(e) =>
                  onChange({ ...p, name: e.target.value.toUpperCase() })
                }
                placeholder="PORT"
                className={mono}
              />
            )}
          </Field>
        </Wrap>
        <Wrap path={`${f}.type`}>
          <Field label="Type" error={err("type")}>
            {(a) => (
              <Select
                items={paramTypes.map((t) => ({
                  value: t.value,
                  label: t.label,
                }))}
                value={p.type}
                onValueChange={(type) => {
                  if (!type) return
                  const keep = type === "text" || type === "password"
                  onChange({
                    ...p,
                    type,
                    default: undefined,
                    generate: keep ? p.generate : undefined,
                    options: type === "select" ? p.options : undefined,
                  })
                }}
              >
                <SelectTrigger id={a.id} className="h-11 w-full md:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {paramTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex flex-col">
                        <span>{t.label}</span>
                        <span className="text-caption text-muted-foreground">
                          {t.hint}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
        </Wrap>
        <Wrap path={`${f}.default`}>
          <DefaultField p={p} error={err("default")} onChange={onChange} />
        </Wrap>
        {p.type === "select" && (
          <Wrap path={`${f}.options`} className="md:col-span-2">
            <Field
              label="Options"
              error={err("options")}
              hint="Type each choice and press Enter."
            >
              {(a) => (
                <ListInput
                  {...a}
                  invalid={!!err("options")}
                  value={p.options ?? []}
                  onChange={(options) => onChange({ ...p, options })}
                  placeholder="small, medium, large"
                />
              )}
            </Field>
          </Wrap>
        )}
        <Wrap path={`${f}.help`} className="md:col-span-2">
          <Field label="Help" hint="Optional; shown under the field.">
            {(a) => (
              <Input
                {...a}
                value={p.help ?? ""}
                onChange={(e) =>
                  onChange({ ...p, help: e.target.value || undefined })
                }
                placeholder="Where the web page answers."
              />
            )}
          </Field>
        </Wrap>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {p.type !== "bool" && (
          // biome-ignore lint/a11y/noLabelWithoutControl: the Switch inside is the control
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-body-sm md:min-h-0">
            <Switch
              checked={!!p.required}
              onCheckedChange={(v) =>
                onChange({ ...p, required: v || undefined })
              }
            />
            Must be filled
          </label>
        )}
        {canGenerate && (
          <div className="flex items-center gap-2.5 text-body-sm">
            <span className="text-muted-foreground">When left blank</span>
            <Segmented
              label="When left blank"
              items={generateItems}
              value={p.generate ?? ""}
              onChange={(g) => onChange({ ...p, generate: g || undefined })}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function DefaultField({
  p,
  error,
  onChange,
}: {
  p: RecipeParam
  error?: string
  onChange: (p: RecipeParam) => void
}) {
  const set = (v: string) => onChange({ ...p, default: v || undefined })
  if (p.type === "bool" || p.type === "select") {
    const items = [
      { value: "", label: "None" },
      ...(p.type === "bool"
        ? [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]
        : (p.options ?? []).map((o) => ({ value: o, label: o }))),
    ]
    return (
      <Field label="Default" error={error}>
        {(a) => (
          <Select
            items={items}
            value={p.default ?? ""}
            onValueChange={(v) => v !== null && set(v)}
          >
            <SelectTrigger id={a.id} className="h-11 w-full md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {items.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
    )
  }
  if (p.type === "password") {
    return (
      <Field
        label="Default"
        hint="Leave empty: a fixed password shared by every install is a risk."
      >
        {(a) => (
          <Input {...a} disabled placeholder="None" className="bg-muted" />
        )}
      </Field>
    )
  }
  const numeric = p.type === "port" || p.type === "number"
  return (
    <Field label="Default" error={error} hint="Optional; filled in for them.">
      {(a) => (
        <Input
          {...a}
          {...plain}
          inputMode={numeric ? "numeric" : undefined}
          value={p.default ?? ""}
          onChange={(e) => set(e.target.value)}
          placeholder={
            p.type === "port"
              ? "8080"
              : p.type === "path"
                ? "/srv/data"
                : p.type === "domain"
                  ? "app.example.com"
                  : undefined
          }
        />
      )}
    </Field>
  )
}

// ---- What it installs ----

function CodeBox({
  path,
  label,
  hint,
  problems,
  optional,
  children,
}: {
  path: string
  label: string
  hint?: ReactNode
  problems: Problems
  optional?: boolean
  children: ReactNode
}) {
  const error = problems[path]
  return (
    <div data-field={path} className="flex flex-col gap-1.5">
      <span className="text-body-sm font-medium">
        {label}
        {optional && <span className="font-normal text-ash"> · optional</span>}
      </span>
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-input [&_.cm-editor]:min-h-32 [&_.cm-editor]:text-body-sm",
          error && "border-destructive ring-3 ring-destructive/20",
        )}
      >
        {children}
      </div>
      {(error || hint) && (
        <p
          className={cn(
            "text-caption",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

function VarChips({ names }: { names: string[] }) {
  if (!names.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-caption text-ash">From the install form:</span>
      {names.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(`\${${n}}`)
            toast.success(`Copied \${${n}}`)
          }}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-muted px-2.5 font-mono text-caption text-muted-foreground hover:text-foreground md:h-6"
        >
          {`\${${n}}`}
          <Copy className="size-3" />
        </button>
      ))}
    </div>
  )
}

const pmLabel = (pm: string) => (pm === "default" ? "Every manager" : pm)

function Packages({
  draft,
  problems,
  onChange,
  phone,
}: {
  draft: Draft
  problems: Problems
  onChange: (patch: Partial<Draft>) => void
  phone: boolean
}) {
  const packages = draft.packages ?? {}
  const also = draft.also ?? {}
  const more =
    !!draft.version_command ||
    !!draft.install ||
    !!draft.update ||
    Object.keys(also).length > 0
  return (
    <>
      <PmLists
        path="packages"
        value={packages}
        problems={problems}
        onChange={(packages) => onChange({ packages })}
        phone={phone}
        hint="Names for every package manager, and other names where a distro calls it something else."
      />
      <Collapsible defaultOpen={more}>
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="h-11 self-start text-muted-foreground md:h-8"
            />
          }
        >
          <SlidersHorizontal />
          More options
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 flex flex-col gap-5">
          <PmLists
            path="also"
            title="Also installed as"
            value={also}
            problems={problems}
            onChange={(also) => onChange({ also })}
            phone={phone}
            optional
            hint="Other names it may be on a server as (like docker.io for Docker). Never installed; updated and removed when they're the ones there."
          />
          <VersionField
            draft={draft}
            problems={problems}
            onChange={onChange}
            optional
          />
          <CodeBox
            path="install"
            label="Run after installing"
            optional
            problems={problems}
          >
            <CodeEditor
              interpreter="bash"
              height="auto"
              value={draft.install ?? ""}
              onChange={(install) => onChange({ install })}
            />
          </CodeBox>
          <CodeBox
            path="update"
            label="Run after updating"
            optional
            problems={problems}
          >
            <CodeEditor
              interpreter="bash"
              height="auto"
              value={draft.update ?? ""}
              onChange={(update) => onChange({ update })}
            />
          </CodeBox>
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}

function PmLists({
  path,
  title,
  value,
  problems,
  onChange,
  phone,
  hint,
  optional,
}: {
  path: "packages" | "also"
  title?: string
  value: Record<string, string[]>
  problems: Problems
  onChange: (v: Record<string, string[]>) => void
  phone: boolean
  hint: string
  optional?: boolean
}) {
  const rows = Object.entries(value)
  const free = ["default", ...packageManagers].filter((pm) => !(pm in value))
  const error = problems[path]
  return (
    <div data-field={path} className="flex flex-col gap-2">
      {title && (
        <span className="text-body-sm font-medium">
          {title}
          {optional && (
            <span className="font-normal text-ash"> · optional</span>
          )}
        </span>
      )}
      {rows.map(([pm, names]) => (
        <div
          key={pm}
          className={cn("flex gap-2", phone ? "flex-col" : "items-start")}
        >
          <span
            className={cn(
              "flex shrink-0 items-center font-mono text-body-sm text-muted-foreground",
              phone ? "justify-between" : "h-9 w-32",
            )}
          >
            {pmLabel(pm)}
            {phone && (
              <RemovePm pm={pm} onClick={() => onChange(without(value, pm))} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <ListInput
              mono
              invalid={!!error && names.length === 0}
              value={names}
              onChange={(n) => onChange({ ...value, [pm]: n })}
              placeholder={pm === "default" ? "nginx" : `name for ${pm}`}
            />
          </div>
          {!phone && (
            <RemovePm pm={pm} onClick={() => onChange(without(value, pm))} />
          )}
        </div>
      ))}
      {free.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-ash">
            {rows.length ? "Add names for" : "Names for"}
          </span>
          {free.map((pm) => (
            <button
              key={pm}
              type="button"
              onClick={() => onChange({ ...value, [pm]: [] })}
              className="h-8 rounded-full border border-dashed border-mist px-2.5 font-mono text-caption text-muted-foreground hover:border-brand hover:text-foreground md:h-7"
            >
              + {pmLabel(pm)}
            </button>
          ))}
        </div>
      )}
      <p
        className={cn(
          "text-caption",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {error ?? hint}
      </p>
    </div>
  )
}

const without = (v: Record<string, string[]>, key: string) =>
  Object.fromEntries(Object.entries(v).filter(([k]) => k !== key))

function RemovePm({ pm, onClick }: { pm: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Remove the names for ${pmLabel(pm)}`}
      onClick={onClick}
      className="text-muted-foreground max-md:size-10"
    >
      <Plus className="rotate-45" />
    </Button>
  )
}

function VersionField({
  draft,
  problems,
  onChange,
  optional,
}: {
  draft: Draft
  problems: Problems
  onChange: (patch: Partial<Draft>) => void
  optional?: boolean
}) {
  return (
    <Wrap path="version_command">
      <Field
        label={optional ? "Version command · optional" : "Version command"}
        error={problems.version_command}
        hint="Prints the installed version; Morche also reads from it whether it's there."
      >
        {(a) => (
          <Input
            {...a}
            {...plain}
            value={draft.version_command ?? ""}
            onChange={(e) => onChange({ version_command: e.target.value })}
            placeholder="my-tool --version | head -n1"
            className={mono}
          />
        )}
      </Field>
    </Wrap>
  )
}

function Scripts({
  draft,
  problems,
  onChange,
}: {
  draft: Draft
  problems: Problems
  onChange: (patch: Partial<Draft>) => void
}) {
  return (
    <>
      <VarChips names={draft.params.map((p) => p.name).filter(Boolean)} />
      <VersionField draft={draft} problems={problems} onChange={onChange} />
      {(
        [
          ["install", "Install", false],
          ["update", "Update", true],
          ["uninstall", "Uninstall", true],
        ] as const
      ).map(([key, label, optional]) => (
        <CodeBox
          key={key}
          path={key}
          label={label}
          optional={optional}
          problems={problems}
          hint={
            key === "update" && !draft.update
              ? "Empty: Update runs the install script again."
              : undefined
          }
        >
          <CodeEditor
            interpreter="bash"
            height="auto"
            value={draft[key] ?? ""}
            onChange={(v) => onChange({ [key]: v })}
          />
        </CodeBox>
      ))}
    </>
  )
}

// ---- After installing ----

function After({
  draft,
  problems,
  onChange,
  phone,
}: {
  draft: Draft
  problems: Problems
  onChange: (patch: Partial<Draft>) => void
  phone: boolean
}) {
  const links = draft.links
  const ports = draft.params.filter((p) => p.type === "port" && p.name)
  const setLink = (i: number, l: RecipeLink) =>
    onChange({ links: links.map((x, j) => (j === i ? l : x)) })
  return (
    <Section
      id="after"
      phone={phone}
      title="After installing"
      hint="Buttons that open it, and first steps."
    >
      <div className="flex flex-col gap-3">
        <span className="text-body-sm font-medium">Open buttons</span>
        {links.map((l, i) => (
          <LinkRow
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id; the text is the truth
            key={i}
            l={l}
            index={i}
            count={links.length}
            ports={ports}
            problems={problems}
            phone={phone}
            onChange={(next) => setLink(i, next)}
            onMove={(to) => onChange({ links: moved(links, i, to) })}
            onRemove={() =>
              onChange({ links: links.filter((_, j) => j !== i) })
            }
          />
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-11 self-start md:h-8"
          onClick={() =>
            onChange({
              links: [
                ...links,
                {
                  label: links.length ? "" : "Open",
                  port: ports[0]?.name ?? "",
                },
              ],
            })
          }
        >
          <Link2 />
          Add a button
        </Button>
      </div>
      <Wrap path="notes">
        <Field
          label="Notes"
          hint="Markdown, shown on each install: how to sign in, where the password is."
        >
          {(a) => (
            <Textarea
              {...a}
              rows={4}
              value={draft.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Sign in as **admin** with the password Morche made (Details › Show passwords)."
            />
          )}
        </Field>
      </Wrap>
    </Section>
  )
}

const FIXED = "__fixed"

function LinkRow({
  l,
  index,
  count,
  ports,
  problems,
  phone,
  onChange,
  onMove,
  onRemove,
}: {
  l: RecipeLink
  index: number
  count: number
  ports: RecipeParam[]
  problems: Problems
  phone: boolean
  onChange: (l: RecipeLink) => void
  onMove: (to: number) => void
  onRemove: () => void
}) {
  const f = `links[${index}]`
  const err = (k: string) => problems[`${f}.${k}`]
  const fromParam = ports.some((p) => p.name === l.port)
  const portItems = [
    ...ports.map((p) => ({
      value: p.name,
      label: `${p.label || p.name} (${p.name})`,
    })),
    { value: FIXED, label: "A fixed number" },
  ]
  const scheme = l.scheme || "http"
  const example = `${scheme}://server:${
    fromParam
      ? (ports.find((p) => p.name === l.port)?.default ?? l.port)
      : l.port || "…"
  }${l.path ?? ""}`
  return (
    <div
      data-field={f}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-subtle/60 p-4"
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-caption text-muted-foreground">
          {example}
        </span>
        <RowTools
          index={index}
          count={count}
          noun="button"
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>
      <div
        className={cn(
          "grid gap-3",
          !phone &&
            "grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_7rem]",
        )}
      >
        <Field label="Label">
          {(a) => (
            <Input
              {...a}
              value={l.label}
              onChange={(e) => onChange({ ...l, label: e.target.value })}
              placeholder="Open"
            />
          )}
        </Field>
        <Field label="Port" error={err("port")}>
          {(a) => (
            <div className="flex gap-2">
              {ports.length > 0 && (
                <Select
                  items={portItems}
                  value={fromParam ? l.port : FIXED}
                  onValueChange={(v) =>
                    v && onChange({ ...l, port: v === FIXED ? "" : v })
                  }
                >
                  <SelectTrigger
                    id={fromParam ? a.id : undefined}
                    className="h-11 min-w-0 flex-1 md:h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {portItems.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!fromParam && (
                <Input
                  {...a}
                  inputMode="numeric"
                  value={l.port}
                  onChange={(e) => onChange({ ...l, port: e.target.value })}
                  placeholder="8080"
                  className={cn(ports.length > 0 && "w-24 shrink-0")}
                />
              )}
            </div>
          )}
        </Field>
        <Field label="Path" error={err("path")}>
          {(a) => (
            <Input
              {...a}
              {...plain}
              value={l.path ?? ""}
              onChange={(e) =>
                onChange({ ...l, path: e.target.value || undefined })
              }
              placeholder="/"
              className={mono}
            />
          )}
        </Field>
        <Field label="Scheme" error={err("scheme")}>
          {(a) => (
            <Select
              items={[
                { value: "http", label: "http" },
                { value: "https", label: "https" },
              ]}
              value={scheme}
              onValueChange={(v) =>
                v &&
                onChange({
                  ...l,
                  scheme: v === "https" ? "https" : undefined,
                })
              }
            >
              <SelectTrigger id={a.id} className="h-11 w-full md:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="http">http</SelectItem>
                <SelectItem value="https">https</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>
    </div>
  )
}
