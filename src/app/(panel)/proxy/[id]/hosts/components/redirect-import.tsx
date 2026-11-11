"use client"

import { FileUp, Info, TriangleAlert } from "lucide-react"
import { useRef, useState } from "react"

import {
  Callout,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ChoiceSelect } from "@/app/(panel)/dns/components/fields"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  checkRedirects,
  codeMeta,
  freshRedirect,
  MAX_REDIRECTS,
  matchMeta,
  mergeRedirects,
  parseRedirects,
  type RedirectDraft,
  type RuleCode,
  redirectCodes,
} from "./redirects"

type Mode = "add" | "replace"

const codeItems = redirectCodes
  .filter((c) => c !== 410)
  .map((c) => ({ value: String(c), label: codeMeta[c].label }))

const formats: { name: string; example: string }[] = [
  { name: "Spreadsheet (CSV / TSV)", example: "from,to,code\n/old,/new,301" },
  { name: "Two columns", example: "/old-page /new-page\n/shop/* /store/*" },
  { name: "Arrows", example: "/old -> /new 302" },
  {
    name: "Apache / .htaccess",
    example:
      "Redirect 301 /old /new\nRedirectMatch 301 ^/item/(\\d+)$ /items/$1\nRewriteRule ^old$ /new [R=301,L]",
  },
  {
    name: "nginx",
    example:
      "rewrite ^/old$ /new permanent;\nlocation = /old { return 301 /new; }",
  },
  {
    name: "Netlify _redirects",
    example: "/blog/* /news/:splat 301\n/posts/:id /p/:id",
  },
  {
    name: "Vercel / JSON",
    example: '[{"source": "/old", "destination": "/new", "permanent": true}]',
  },
  {
    name: "Just old addresses",
    example: "https://example.com/removed-page\n/old-promo",
  },
]

// Paste or upload a list in any common shape, see what it becomes, then add
// it to the site's rules (or put it in their place).
export function ImportLayer({
  open,
  onOpenChange,
  rows,
  domains,
  strict,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: RedirectDraft[]
  domains: string[]
  strict: boolean
  onImport: (rows: RedirectDraft[]) => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import redirects"
      className="sm:max-w-3xl"
    >
      {open && (
        <ImportForm
          rows={rows}
          domains={domains}
          strict={strict}
          onCancel={() => onOpenChange(false)}
          onImport={(next) => {
            onImport(next)
            onOpenChange(false)
          }}
        />
      )}
    </ResponsiveDialog>
  )
}

function ImportForm({
  rows,
  domains,
  strict,
  onCancel,
  onImport,
}: {
  rows: RedirectDraft[]
  domains: string[]
  strict: boolean
  onCancel: () => void
  onImport: (rows: RedirectDraft[]) => void
}) {
  const [text, setText] = useState("")
  const [file, setFile] = useState("")
  const [code, setCode] = useState<RuleCode>(301)
  const [fallback, setFallback] = useState("")
  const [mode, setMode] = useState<Mode>("add")
  const [skipBad, setSkipBad] = useState(true)
  const [formatsOpen, setFormatsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const parsed = text.trim()
    ? parseRedirects(text, { domains, code, fallback })
    : { rules: [], skipped: [] }
  const incoming = parsed.rules.map((p) =>
    freshRedirect({
      from: p.from,
      match: p.match,
      to: p.to,
      code: p.code,
      keepQuery: p.keepQuery,
      ...(p.when ? { when: p.when } : {}),
    }),
  )
  // Merging folds repeated addresses into one rule, so only each rule's own
  // problems are left.
  const base = mode === "replace" ? [] : rows
  const problemOf = new Map(
    incoming.flatMap((r) => {
      const p = checkRedirects([r], domains, strict).get(r.key)
      return p ? [[r.key, p.message] as const] : []
    }),
  )
  const badLines = new Set(
    incoming.flatMap((r, i) => (problemOf.has(r.key) ? [i] : [])),
  )
  const kept = skipBad ? incoming.filter((_, i) => !badLines.has(i)) : incoming
  const result = mergeRedirects(base, kept, domains, strict)
  const tooMany = result.rows.length > MAX_REDIRECTS
  const otherHosts = [
    ...new Set(parsed.rules.flatMap((p) => (p.host ? [p.host] : []))),
  ]

  const readFile = async (f: File | undefined) => {
    if (!f) return
    setFile(f.name)
    setText(await f.text())
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="redirect-import-text"
            className="text-body-sm font-medium"
          >
            List
          </label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFormatsOpen(!formatsOpen)}
              aria-expanded={formatsOpen}
            >
              <Info />
              What can I paste?
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp />
              Choose a file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,.conf,.json,.htaccess,text/*,application/json"
              className="hidden"
              onChange={(e) => {
                readFile(e.target.files?.[0])
                e.target.value = ""
              }}
            />
          </div>
        </div>
        {formatsOpen && (
          <div className="grid gap-2 rounded-xl bg-subtle p-3 md:grid-cols-2">
            {formats.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setText(f.example)}
                className="flex flex-col gap-1 rounded-lg p-2 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                title="Use this example"
              >
                <span className="text-caption font-medium">{f.name}</span>
                <pre className="font-mono text-caption break-all whitespace-pre-wrap text-muted-foreground">
                  {f.example}
                </pre>
              </button>
            ))}
            <p className="text-caption text-muted-foreground md:col-span-2">
              One rule per line; # starts a comment. A header row (from, to…) is
              skipped. Full addresses of this site become paths. Codes can also
              be words: permanent, temporary, gone.
            </p>
          </div>
        )}
        <Textarea
          id="redirect-import-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setFile("")
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const f = e.dataTransfer.files?.[0]
            if (!f) return
            e.preventDefault()
            readFile(f)
          }}
          placeholder={
            "Paste a list or drop a file here:\n/old-page /new-page\n/blog/* /news/:splat 301\nhttps://example.com/removed"
          }
          rows={8}
          className="max-h-72 font-mono text-body-sm"
          spellCheck={false}
        />
        {file && <p className="text-caption text-ash">Read from {file}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Answer when a line doesn't say"
          hint="A code on the line wins."
        >
          {(f) => (
            <ChoiceSelect
              id={f.id}
              value={String(code)}
              onChange={(v) => setCode(Number(v) as RuleCode)}
              items={codeItems}
            />
          )}
        </Field>
        <Field
          label="Lines with only an old address"
          hint={
            fallback.trim()
              ? "Sent here."
              : "Empty = answer 410 Gone (removed on purpose)."
          }
        >
          {(f) => (
            <Input
              {...f}
              value={fallback}
              onChange={(e) => setFallback(e.target.value)}
              placeholder="/ or /new-home"
              className="font-mono"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
        </Field>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">
            The rules already here
          </span>
          <Segmented<Mode>
            label="The rules already here"
            value={mode}
            onChange={setMode}
            items={[
              { value: "add", label: `Keep ${rows.length}, add these` },
              { value: "replace", label: "Put these in their place" },
            ]}
          />
          <p className="text-caption text-muted-foreground">
            {mode === "add"
              ? "A line for an address that's already there updates its rule."
              : `The ${rows.length} rules now here are removed.`}
          </p>
        </div>
      )}

      {text.trim() && (
        <Preview
          incoming={incoming}
          lines={parsed.rules.map((p) => p.line)}
          badLines={badLines}
          problems={(r) => problemOf.get(r.key)}
          skipped={parsed.skipped}
          added={result.added}
          updated={result.updated}
          otherHosts={otherHosts}
          skipBad={skipBad}
          setSkipBad={setSkipBad}
        />
      )}

      {tooMany && (
        <Callout icon={<TriangleAlert />} tone="warning">
          That makes {result.rows.length.toLocaleString()} rules; a site holds
          up to {MAX_REDIRECTS.toLocaleString()}. Starts-with and pattern rules
          cover many addresses at once.
        </Callout>
      )}

      <div className="sticky bottom-0 flex flex-col-reverse gap-2 bg-background pt-2 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="h-11 md:h-9"
          disabled={!kept.length || tooMany}
          onClick={() => onImport(result.rows)}
        >
          {kept.length
            ? mode === "replace"
              ? `Use ${kept.length.toLocaleString()} rules`
              : `Import ${kept.length.toLocaleString()} rules`
            : "Import"}
        </Button>
      </div>
    </div>
  )
}

const PREVIEW = 200

function Preview({
  incoming,
  lines,
  badLines,
  problems,
  skipped,
  added,
  updated,
  otherHosts,
  skipBad,
  setSkipBad,
}: {
  incoming: RedirectDraft[]
  lines: number[]
  badLines: Set<number>
  problems: (r: RedirectDraft) => string | undefined
  skipped: { line: number; text: string; reason: string }[]
  added: number
  updated: number
  otherHosts: string[]
  skipBad: boolean
  setSkipBad: (v: boolean) => void
}) {
  const [onlyBad, setOnlyBad] = useState(false)
  const list = incoming
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => !onlyBad || badLines.has(i))
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm">
        <span>
          <span className="font-medium tabular-nums">{incoming.length}</span>{" "}
          rules read
        </span>
        {added > 0 && (
          <span className="text-muted-foreground">
            <span className="tabular-nums">{added}</span> new
          </span>
        )}
        {updated > 0 && (
          <span className="text-muted-foreground">
            <span className="tabular-nums">{updated}</span> update a rule
            already here
          </span>
        )}
        {badLines.size > 0 && (
          <button
            type="button"
            onClick={() => setOnlyBad(!onlyBad)}
            className="text-destructive underline-offset-2 hover:underline"
          >
            {badLines.size} with problems
            {onlyBad ? " (showing)" : ""}
          </button>
        )}
        {skipped.length > 0 && (
          <span className="text-muted-foreground">
            <span className="tabular-nums">{skipped.length}</span> lines skipped
          </span>
        )}
      </div>
      {otherHosts.length > 0 && (
        <Callout icon={<Info />}>
          Some old addresses are on {otherHosts.slice(0, 3).join(", ")}
          {otherHosts.length > 3 ? "…" : ""}, not one of this site's names.
          They're read as paths of this site.
        </Callout>
      )}
      {badLines.size > 0 && (
        <ToggleRow
          id="redirect-import-skip"
          label="Leave out the rules with problems"
          hint="Off: they're added and marked, to fix before saving."
          checked={skipBad}
          onChange={setSkipBad}
        />
      )}
      {list.length > 0 && (
        <div className="max-h-72 overflow-auto rounded-xl border border-border [contain:inline-size]">
          <table className="w-full text-body-sm">
            <thead className="sticky top-0 bg-subtle text-caption text-muted-foreground">
              <tr className="text-start">
                <th className="w-12 px-3 py-1.5 text-start font-normal">
                  Line
                </th>
                <th className="px-3 py-1.5 text-start font-normal">From</th>
                <th className="px-3 py-1.5 text-start font-normal">To</th>
                <th className="w-16 px-3 py-1.5 text-start font-normal">
                  Code
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.slice(0, PREVIEW).map(({ r, i }) => {
                const problem = badLines.has(i) ? problems(r) : undefined
                return (
                  <tr
                    key={r.key}
                    className={cn(problem && skipBad && "opacity-60")}
                  >
                    <td className="px-3 py-1.5 align-top text-ash tabular-nums">
                      {lines[i]}
                    </td>
                    <td className="px-3 py-1.5 align-top font-mono break-all">
                      {r.from}
                      {r.match !== "exact" && (
                        <span className="ms-1.5 rounded-full bg-muted px-1.5 font-sans text-caption text-muted-foreground">
                          {matchMeta[r.match].short}
                        </span>
                      )}
                      {problem && (
                        <span className="block font-sans text-caption text-destructive">
                          {problem}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 align-top font-mono break-all">
                      {r.code === 410 ? (
                        <span className="font-sans text-muted-foreground">
                          Gone
                        </span>
                      ) : (
                        r.to
                      )}
                    </td>
                    <td className="px-3 py-1.5 align-top tabular-nums">
                      {r.code}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {list.length > PREVIEW && (
            <p className="px-3 py-2 text-caption text-ash">
              And {(list.length - PREVIEW).toLocaleString()} more.
            </p>
          )}
        </div>
      )}
      {skipped.length > 0 && (
        <details className="text-body-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Lines that aren't rules ({skipped.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {skipped.slice(0, 50).map((s) => (
              <li key={s.line} className="text-caption">
                <span className="text-ash tabular-nums">Line {s.line}:</span>{" "}
                <span className="font-mono break-all">{s.text}</span>{" "}
                <span className="text-muted-foreground">— {s.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
