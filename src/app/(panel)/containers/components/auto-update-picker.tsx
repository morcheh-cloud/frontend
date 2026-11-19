"use client"

import {
  Asterisk,
  Box,
  FolderKanban,
  Layers,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react"
import { type ReactNode, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import type {
  DockerAutoUpdateCandidate,
  DockerAutoUpdateRules,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { SearchBox, Segmented } from "../../servers/[id]/components/parts"
import { useAutoUpdatePreview } from "../api"
import { splitPatterns } from "./auto-update-meta"

// Picks names for a policy's include / exclude lists: a searchable list of
// the projects, containers and images on the chosen servers, plus free
// patterns (web-*, ghcr.io/acme/*). The list stays light with hundreds of
// containers: search, one kind at a time, and rows rendered in pages.

type Kind = "project" | "container" | "image"

type Entry = {
  kind: Kind
  value: string
  // Containers it stands for (a project's or an image's, or the one).
  containers: Candidate[]
  servers: Set<string>
}

type Candidate = DockerAutoUpdateCandidate & { server: string }

const PAGE = 80

const kindMeta: Record<
  Kind | "pattern",
  { label: string; plural: string; icon: typeof Box }
> = {
  project: { label: "Project", plural: "Projects", icon: FolderKanban },
  container: { label: "Container", plural: "Containers", icon: Box },
  image: { label: "Image", plural: "Images", icon: Layers },
  pattern: { label: "Pattern", plural: "Patterns", icon: Asterisk },
}

// ---- Matching (mirrors the backend's autoMatches / globMatch) ----

const hasWild = (p: string) => /[*?[]/.test(p)

function globRe(pattern: string) {
  let re = ""
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === "*") re += "[^/]*"
    else if (ch === "?") re += "[^/]"
    else if (ch === "[") {
      const end = pattern.indexOf("]", i + 1)
      if (end < 0) return null
      let body = pattern.slice(i + 1, end)
      if (body.startsWith("!")) body = `^${body.slice(1)}`
      re += `[${body.replace(/\\/g, "\\\\")}]`
      i = end
    } else re += ch.replace(/[.+^${}()|\\\]]/g, "\\$&")
  }
  try {
    return new RegExp(`^${re}$`)
  } catch {
    return null
  }
}

function glob(pattern: string, name: string) {
  const p = pattern.toLowerCase()
  const n = name.toLowerCase()
  if (!hasWild(p)) return p === n
  return globRe(p)?.test(n) ?? false
}

// The image without its tag, as the backend compares it.
function repoOf(image: string) {
  const at = image.indexOf("@")
  const ref = at >= 0 ? image.slice(0, at) : image
  const colon = ref.lastIndexOf(":")
  return colon > ref.lastIndexOf("/") ? ref.slice(0, colon) : ref
}

const shortRepo = (image: string) =>
  repoOf(image).replace(/^docker\.io\/library\//, "")

function matches(p: string, c: DockerAutoUpdateCandidate) {
  const repo = repoOf(c.image)
  return (
    glob(p, c.name) ||
    (!!c.project &&
      (glob(p, c.project) || glob(p, `${c.project}/${c.service ?? ""}`))) ||
    glob(p, c.image) ||
    glob(p, repo) ||
    glob(p, repo.replace(/^docker\.io\/library\//, ""))
  )
}

const kindOf = (
  value: string,
  catalog: Record<Kind, Map<string, Entry>>,
): Kind | "pattern" => {
  const key = value.toLowerCase()
  for (const k of ["project", "container", "image"] as const) {
    if (catalog[k].has(key)) return k
  }
  return "pattern"
}

function buildCatalog(all: Candidate[]) {
  const catalog: Record<Kind, Map<string, Entry>> = {
    project: new Map(),
    container: new Map(),
    image: new Map(),
  }
  const add = (kind: Kind, value: string, c: Candidate) => {
    const key = value.toLowerCase()
    let e = catalog[kind].get(key)
    if (!e) {
      e = { kind, value, containers: [], servers: new Set() }
      catalog[kind].set(key, e)
    }
    e.containers.push(c)
    e.servers.add(c.server)
  }
  for (const c of all) {
    add("container", c.name, c)
    if (c.project) add("project", c.project, c)
    if (!c.image.includes("@") && !/^sha256:/.test(c.image)) {
      add("image", shortRepo(c.image), c)
    }
  }
  return catalog
}

const sorted = (m: Map<string, Entry>) =>
  [...m.values()].sort((a, b) => a.value.localeCompare(b.value))

export function PatternPicker({
  ws,
  servers,
  value,
  onChange,
  phone,
  placeholder,
  invalid,
  other,
  otherLabel,
  folded,
}: {
  ws: string
  servers: string[]
  // The raw text (one per line or comma), kept as the truth.
  value: string
  onChange: (text: string) => void
  phone: boolean
  placeholder: string
  invalid?: boolean
  // The other list's names: shown as a note on rows it already takes.
  other?: string[]
  otherLabel?: string
  // Start with only the chips and a button that opens the list.
  folded?: boolean
}) {
  const [tab, setTab] = useState<Kind>("project")
  const [q, setQ] = useState("")
  const [shown, setShown] = useState(PAGE)
  const [asText, setAsText] = useState(false)
  const [open, setOpen] = useState(!folded)

  const rules: DockerAutoUpdateRules = {
    servers,
    pick: "all",
    include_stopped: true,
    mode: "update",
  }
  const query = useAutoUpdatePreview(ws, rules)
  const all: Candidate[] = (query.data?.servers ?? []).flatMap((s) =>
    s.containers
      .filter((c) => !c.name.includes("-morche-old-"))
      .map((c) => ({ ...c, server: s.name })),
  )
  const many = (query.data?.servers.length ?? 0) > 1
  const catalog = buildCatalog(all)

  const picked = splitPatterns(value)
  const pickedKeys = new Set(picked.map((p) => p.toLowerCase()))
  const write = (list: string[]) => onChange(list.join("\n"))
  const toggle = (v: string, on: boolean) =>
    write(
      on
        ? [...picked, v]
        : picked.filter((p) => p.toLowerCase() !== v.toLowerCase()),
    )

  // A row another picked name already takes in (a project, a pattern).
  const coveredBy = (e: Entry) => {
    if (pickedKeys.has(e.value.toLowerCase())) return null
    for (const p of picked) {
      if (e.containers.length > 0 && e.containers.every((c) => matches(p, c))) {
        return p
      }
    }
    return null
  }
  const otherBy = (e: Entry) =>
    other?.find(
      (p) =>
        e.containers.length > 0 && e.containers.every((c) => matches(p, c)),
    )

  const needle = q.trim().toLowerCase()
  const filter = (list: Entry[]) =>
    hasWild(needle)
      ? list.filter((e) => e.containers.every((c) => matches(needle, c)))
      : needle
        ? list.filter(
            (e) =>
              e.value.toLowerCase().includes(needle) ||
              (e.kind === "container" &&
                ((e.containers[0]?.project ?? "")
                  .toLowerCase()
                  .includes(needle) ||
                  shortRepo(e.containers[0]?.image ?? "")
                    .toLowerCase()
                    .includes(needle))),
          )
        : list
  const lists = {
    project: filter(sorted(catalog.project)),
    container: filter(sorted(catalog.container)),
    image: filter(sorted(catalog.image)),
  }
  const rows = lists[tab]
  const typed = q.trim()
  const canAdd =
    typed !== "" &&
    !pickedKeys.has(typed.toLowerCase()) &&
    !catalog[tab].has(typed.toLowerCase()) &&
    (hasWild(typed) || rows.length === 0)
  const typedCount = canAdd ? all.filter((c) => matches(typed, c)).length : 0

  const addTyped = () => {
    if (!canAdd) return
    write([...picked, typed])
    setQ("")
  }

  const search = (v: string) => {
    setQ(v)
    setShown(PAGE)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Chosen
        picked={picked}
        all={all}
        kindOf={(v) => kindOf(v, catalog)}
        ready={!!query.data}
        quiet={!open && !asText}
        onRemove={(v) => toggle(v, false)}
        onClear={() => write([])}
      />

      {!open && !asText ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center gap-2 self-start rounded-lg border border-dashed border-mist px-3 text-body-sm text-muted-foreground hover:border-brand hover:text-foreground md:min-h-9"
        >
          <Plus className="size-4" />
          Pick from the list
        </button>
      ) : asText ? (
        <Textarea
          rows={4}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          className="font-mono text-body-sm"
          spellCheck={false}
          autoCapitalize="off"
        />
      ) : (
        <div
          className={cn(
            "flex min-w-0 flex-col overflow-hidden rounded-lg border border-border",
            invalid && "border-destructive",
          )}
        >
          <div className="flex flex-col gap-2 border-b border-border bg-subtle p-2 md:flex-row md:items-center">
            <SearchBox
              value={q}
              onChange={search}
              placeholder="Search or type web-*"
              label="Search projects, containers and images"
              className="min-w-0 md:w-auto md:flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  if (canAdd) addTyped()
                  else if (rows.length === 1) {
                    const r = rows[0]
                    toggle(r.value, !pickedKeys.has(r.value.toLowerCase()))
                  }
                }
              }}
            />
            <div className="-mx-2 no-scrollbar overflow-x-auto px-2 md:mx-0 md:px-0">
              <Segmented
                label="Kind"
                value={tab}
                onChange={(t) => {
                  setTab(t)
                  setShown(PAGE)
                }}
                items={(["project", "container", "image"] as const).map(
                  (k) => ({
                    value: k,
                    label: (
                      <span className="flex items-center gap-1.5">
                        {kindMeta[k].plural}
                        <span className="text-caption text-ash tabular-nums">
                          {lists[k].length}
                        </span>
                      </span>
                    ),
                  }),
                )}
              />
            </div>
          </div>

          {canAdd && (
            <button
              type="button"
              onClick={addTyped}
              className="flex min-h-12 items-center gap-3 border-b border-border px-4 py-2 text-start hover:bg-subtle md:min-h-10"
            >
              <Plus className="size-4 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 truncate text-body-sm">
                Add <span className="font-mono">{typed}</span>
                {hasWild(typed) ? " as a pattern" : ""}
              </span>
              <span className="shrink-0 text-caption text-muted-foreground">
                {query.data
                  ? typedCount === 0
                    ? "Matches nothing now"
                    : `Matches ${typedCount}`
                  : null}
              </span>
              {!phone && (
                <kbd className="rounded border border-border px-1.5 text-caption text-ash">
                  Enter
                </kbd>
              )}
            </button>
          )}

          <ul
            className={cn(
              "divide-y divide-border overflow-y-auto overscroll-contain",
              phone ? "max-h-[50dvh]" : "max-h-80",
            )}
          >
            {servers.length === 0 ? (
              <Note>Pick a server above to list what runs on it.</Note>
            ) : query.isPending ? (
              <Note>
                <Loader2 className="size-4 animate-spin" /> Reading the
                containers…
              </Note>
            ) : query.isError ? (
              <Note tone="error">
                Couldn't read the containers: {query.error.message}. You can
                still type names above.
              </Note>
            ) : rows.length === 0 ? (
              <Note>
                {needle
                  ? `No ${kindMeta[tab].plural.toLowerCase()} match “${q.trim()}”.`
                  : `No ${kindMeta[tab].plural.toLowerCase()} on ${many ? "these servers" : "this server"}.`}
              </Note>
            ) : (
              rows
                .slice(0, shown)
                .map((e) => (
                  <Row
                    key={e.value}
                    entry={e}
                    on={pickedKeys.has(e.value.toLowerCase())}
                    covered={coveredBy(e)}
                    other={otherBy(e)}
                    otherLabel={otherLabel}
                    many={many}
                    onToggle={(on) => toggle(e.value, on)}
                  />
                ))
            )}
            {rows.length > shown && (
              <li>
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE * 2)}
                  className="flex min-h-12 w-full items-center justify-center text-body-sm text-brand hover:bg-subtle md:min-h-10"
                >
                  Show {Math.min(rows.length - shown, PAGE * 2)} more of{" "}
                  {rows.length - shown}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAsText((v) => !v)}
        className="flex min-h-11 items-center gap-1.5 self-start text-caption text-muted-foreground hover:text-foreground md:min-h-0"
      >
        <Pencil className="size-3.5" />
        {asText ? "Pick from the list" : "Edit as text"}
      </button>
    </div>
  )
}

function Note({ children, tone }: { children: ReactNode; tone?: "error" }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 px-4 py-6 text-body-sm text-muted-foreground",
        tone === "error" && "text-destructive",
      )}
    >
      {children}
    </li>
  )
}

function Row({
  entry: e,
  on,
  covered,
  other,
  otherLabel,
  many,
  onToggle,
}: {
  entry: Entry
  on: boolean
  covered: string | null
  other?: string
  otherLabel?: string
  many: boolean
  onToggle: (on: boolean) => void
}) {
  const Icon = kindMeta[e.kind].icon
  const n = e.containers.length
  const running = e.containers.filter((c) => c.state === "running").length
  const first = e.containers[0]
  const where = many
    ? [...e.servers].slice(0, 2).join(", ") +
      (e.servers.size > 2 ? ` +${e.servers.size - 2}` : "")
    : ""
  const meta =
    e.kind === "container"
      ? [
          first?.project &&
            `${first.project}${first.service ? ` / ${first.service}` : ""}`,
          first && shortRepo(first.image),
          n > 1 ? `on ${e.servers.size} servers` : where,
        ]
      : [
          `${n} container${n === 1 ? "" : "s"}`,
          running < n ? `${running} running` : null,
          where,
        ]
  const stopped = e.kind === "container" && first?.state !== "running"

  return (
    <li>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
      <label
        className={cn(
          "flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-subtle md:min-h-10",
          covered && "cursor-default",
        )}
      >
        <Checkbox
          checked={on || !!covered}
          disabled={!!covered}
          onCheckedChange={(v) => onToggle(!!v)}
        />
        <Icon className="size-4 shrink-0 text-ash" />
        <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-baseline md:gap-2">
          <span className="max-w-full truncate font-mono text-body-sm md:max-w-[60%] md:shrink-0">
            {e.value}
          </span>
          <span className="min-w-0 truncate text-caption text-muted-foreground">
            {meta.filter(Boolean).join(" · ")}
          </span>
        </span>
        {covered ? (
          <Tag>
            Via <span className="font-mono">{covered}</span>
          </Tag>
        ) : other ? (
          <Tag tone="warning">{otherLabel ?? "In the other list"}</Tag>
        ) : stopped ? (
          <Tag>Stopped</Tag>
        ) : null}
      </label>
    </li>
  )
}

function Tag({ children, tone }: { children: ReactNode; tone?: "warning" }) {
  return (
    <span
      className={cn(
        "max-w-32 shrink-0 truncate rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground",
        tone === "warning" && "bg-warning/10 text-warning",
      )}
    >
      {children}
    </span>
  )
}

function Chosen({
  picked,
  all,
  kindOf,
  ready,
  onRemove,
  onClear,
  quiet,
}: {
  quiet?: boolean
  picked: string[]
  all: Candidate[]
  kindOf: (v: string) => Kind | "pattern"
  ready: boolean
  onRemove: (v: string) => void
  onClear: () => void
}) {
  if (picked.length === 0) {
    if (quiet) return null
    return (
      <p className="text-body-sm text-muted-foreground">
        Nothing picked yet. Tick projects, containers or images below.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {picked.map((p) => {
        const kind = kindOf(p)
        const Icon = kindMeta[kind].icon
        const n = ready ? all.filter((c) => matches(p, c)).length : null
        return (
          <span
            key={p}
            title={`${kindMeta[kind].label}${n === null ? "" : ` · takes ${n} container${n === 1 ? "" : "s"}`}`}
            className={cn(
              "flex h-10 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-card ps-3 pe-1 text-body-sm md:h-8 md:ps-2.5",
              n === 0 && "border-warning/40",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0 text-ash",
                kind === "project" && "text-brand",
              )}
            />
            <span className="truncate font-mono">{p}</span>
            {n !== null && (
              <span
                className={cn(
                  "shrink-0 text-caption text-ash tabular-nums",
                  n === 0 && "text-warning",
                )}
              >
                {n === 0 ? "none now" : n}
              </span>
            )}
            <button
              type="button"
              aria-label={`Remove ${p}`}
              onClick={() => onRemove(p)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-ash hover:bg-muted hover:text-foreground md:size-6"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )
      })}
      {picked.length > 2 && (
        <button
          type="button"
          onClick={onClear}
          className="h-8 px-2 text-caption text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
