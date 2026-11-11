"use client"

import { ArrowRight, FileUp, Link2, LoaderCircle, Route } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import {
  Callout,
  FieldError,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useFetchRedirectSource } from "../../../api"
import {
  freshRedirect,
  GOOD_MATCH,
  MAX_REDIRECTS,
  mergeRedirects,
  parseUrlList,
  planMigration,
  type RedirectDraft,
} from "./redirects"

const MAX_SITEMAPS = 50
const PAGE = 100

type SourceKind = "paste" | "fetch" | "log"

// One side of the move: a pasted list or file, a sitemap fetched by the
// proxy server (an index is followed), or the pages the log saw.
function SourceInput({
  id,
  proxyId,
  kinds,
  value,
  onChange,
  logCount,
}: {
  id: string
  proxyId: string
  kinds: SourceKind[]
  value: string[]
  onChange: (urls: string[]) => void
  logCount?: number
}) {
  const [kind, setKind] = useState<SourceKind>(kinds[0])
  const [text, setText] = useState("")
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const fetchSource = useFetchRedirectSource()

  const fromText = (t: string) => {
    setText(t)
    const { urls, sitemaps } = parseUrlList(t)
    onChange(urls)
    setError(
      sitemaps.length
        ? "That's a sitemap index: fetch it from its address so each sitemap is read."
        : "",
    )
  }

  const fetchAll = async () => {
    setError("")
    const start = url.trim()
    if (!/^https?:\/\//i.test(start))
      return setError("Use a full address starting with http:// or https://.")
    const urls = new Set<string>()
    const queue = [start]
    let read = 0
    try {
      while (queue.length && read < MAX_SITEMAPS) {
        const next = queue.shift() as string
        read++
        setBusy(read > 1 ? `Reading sitemap ${read}…` : "Fetching…")
        const r = await fetchSource.mutateAsync({ id: proxyId, url: next })
        if (r.status < 200 || r.status >= 300)
          throw new Error(`${next} answered ${r.status}.`)
        const got = parseUrlList(r.text)
        for (const u of got.urls) urls.add(u)
        queue.push(...got.sitemaps)
      }
      onChange([...urls])
      if (!urls.size) setError("No addresses found there.")
      else if (queue.length)
        setError(
          `Read the first ${MAX_SITEMAPS} sitemaps only; ${queue.length} more were left.`,
        )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy("")
    }
  }

  const labels: Record<SourceKind, string> = {
    paste: "Paste or file",
    fetch: "From an address",
    log: "Pages visited now",
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {kinds.length > 1 && (
        <div className="no-scrollbar overflow-x-auto">
          <Segmented<SourceKind>
            label="Where from"
            value={kind}
            onChange={(k) => {
              setKind(k)
              setError("")
              onChange(k === "paste" ? parseUrlList(text).urls : [])
            }}
            items={kinds.map((k) => ({ value: k, label: labels[k] }))}
          />
        </div>
      )}
      {kind === "paste" && (
        <>
          <Textarea
            id={id}
            value={text}
            onChange={(e) => fromText(e.target.value)}
            placeholder={
              "https://old.example.com/about-us.html\n/blog/2019/hello-world\n…or a whole sitemap.xml"
            }
            className="h-28 font-mono text-caption"
            spellCheck={false}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".xml,.txt,.csv,.tsv,text/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ""
              if (f) fromText(await f.text())
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp />
            Open a file
          </Button>
        </>
      )}
      {kind === "fetch" && (
        <div className="flex gap-2">
          <Input
            id={id}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                e.stopPropagation()
                fetchAll()
              }
            }}
            placeholder="https://old.example.com/sitemap.xml"
            className="min-w-0 flex-1 font-mono"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            disabled={!!busy || !url.trim()}
            onClick={fetchAll}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <Link2 />}
            Fetch
          </Button>
        </div>
      )}
      {kind === "log" && (
        <p className="text-caption text-muted-foreground">
          The {logCount ?? 0} pages visitors reached on this site lately (from
          the access log), as the new addresses.
        </p>
      )}
      {busy ? (
        <p className="text-caption text-muted-foreground">{busy}</p>
      ) : (
        <FieldError text={error} />
      )}
      {value.length > 0 && kind !== "log" && (
        <p className="text-caption text-ash">
          {value.length.toLocaleString()} addresses
        </p>
      )}
    </div>
  )
}

// Moving to a new site or structure: old addresses paired with the closest
// new ones, reviewed, then added as rules.
export function MigrateLayer({
  open,
  onOpenChange,
  proxyId,
  rows,
  domains,
  strict,
  pages,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxyId: string
  rows: RedirectDraft[]
  domains: string[]
  strict: boolean
  // Pages visitors reach now (the access log), offered as the new side.
  pages: string[]
  onImport: (rows: RedirectDraft[]) => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Moving to a new site"
      description="Pair the old site's addresses with the new ones; each gets its own redirect."
      className="sm:max-w-4xl"
    >
      {open && (
        <MigrateBody
          proxyId={proxyId}
          rows={rows}
          domains={domains}
          strict={strict}
          pages={pages}
          onCancel={() => onOpenChange(false)}
          onImport={(r) => {
            onImport(r)
            onOpenChange(false)
          }}
        />
      )}
    </ResponsiveDialog>
  )
}

type Unmatched = "gone" | "send"

function MigrateBody({
  proxyId,
  rows,
  domains,
  strict,
  pages,
  onCancel,
  onImport,
}: {
  proxyId: string
  rows: RedirectDraft[]
  domains: string[]
  strict: boolean
  pages: string[]
  onCancel: () => void
  onImport: (rows: RedirectDraft[]) => void
}) {
  const [oldUrls, setOldUrls] = useState<string[]>([])
  const [newUrls, setNewUrls] = useState<string[]>(pages)
  const [unmatched, setUnmatched] = useState<Unmatched>("send")
  const [fallback, setFallback] = useState("/")
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [left, setLeft] = useState<Set<string>>(new Set())
  const [only, setOnly] = useState<"all" | "none" | "rough">("all")
  const [limit, setLimit] = useState(PAGE)

  const plan =
    oldUrls.length && newUrls.length
      ? planMigration(oldUrls, newUrls, domains)
      : undefined
  const list = plan?.rows ?? []
  const toOf = (r: { key: string; to: string }) => edits[r.key] ?? r.to
  const noMatch = list.filter((r) => !toOf(r).trim()).length
  const rough = list.filter(
    (r) => r.to && toOf(r) === r.to && r.score < GOOD_MATCH,
  ).length
  const shown = list.filter(
    (r) =>
      only === "all" ||
      (only === "none" && !toOf(r).trim()) ||
      (only === "rough" && r.to && toOf(r) === r.to && r.score < GOOD_MATCH),
  )
  const picked = list.filter((r) => !left.has(r.key))
  const kinds: SourceKind[] = pages.length
    ? ["log", "paste", "fetch"]
    : ["paste", "fetch"]

  const add = () => {
    const incoming = picked.map((r) => {
      const to = toOf(r).trim()
      if (to) return freshRedirect({ from: r.from, to, code: 301 })
      return unmatched === "gone" || !fallback.trim()
        ? freshRedirect({ from: r.from, to: "", code: 410 })
        : freshRedirect({ from: r.from, to: fallback.trim(), code: 301 })
    })
    const merged = mergeRedirects(rows, incoming, domains, strict)
    if (merged.rows.length > MAX_REDIRECTS) {
      toast.error(
        `That makes ${merged.rows.length.toLocaleString()} rules; a site holds up to ${MAX_REDIRECTS.toLocaleString()}.`,
      )
      return
    }
    onImport(merged.rows)
    toast.success(
      `${merged.added.toLocaleString()} added${merged.updated ? `, ${merged.updated} updated` : ""}. Save to put them on the server.`,
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="migrate-old" className="text-body-sm font-medium">
            Old addresses
          </label>
          <p className="text-caption text-muted-foreground">
            The old site's sitemap, or a list of its addresses (an export from
            Search Console or analytics works).
          </p>
          <SourceInput
            id="migrate-old"
            proxyId={proxyId}
            kinds={["paste", "fetch"]}
            value={oldUrls}
            onChange={(u) => {
              setOldUrls(u)
              setLimit(PAGE)
            }}
          />
        </section>
        <section className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="migrate-new" className="text-body-sm font-medium">
            New addresses
          </label>
          <p className="text-caption text-muted-foreground">
            Where the pages live now: the new sitemap, or the pages this site
            serves today.
          </p>
          <SourceInput
            id="migrate-new"
            proxyId={proxyId}
            kinds={kinds}
            value={newUrls}
            onChange={(u) => {
              setNewUrls(u)
              setLimit(PAGE)
            }}
            logCount={pages.length}
          />
        </section>
      </div>

      {!plan ? (
        <Callout icon={<Route />}>
          Give both sides. Each old address is paired with the new one whose
          words match best (the last part counts most); you check the pairs
          before anything is added.
        </Callout>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <p className="text-body-sm">
              <span className="font-medium">
                {list.length.toLocaleString()} to redirect
              </span>
              <span className="text-muted-foreground">
                {plan.same > 0 &&
                  ` · ${plan.same.toLocaleString()} kept their address`}
                {noMatch > 0 &&
                  ` · ${noMatch.toLocaleString()} without a match`}
              </span>
            </p>
            {list.length > 0 && (
              <div className="no-scrollbar overflow-x-auto md:ms-auto">
                <Segmented
                  label="Show"
                  value={only}
                  onChange={(v) => {
                    setOnly(v)
                    setLimit(PAGE)
                  }}
                  items={[
                    { value: "all", label: `All ${list.length}` },
                    { value: "rough", label: `Guesses ${rough}` },
                    { value: "none", label: `No match ${noMatch}` },
                  ]}
                />
              </div>
            )}
          </div>
          {list.length > 0 && (
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {shown.slice(0, limit).map((r) => {
                const to = toOf(r)
                const id = `migrate-${r.key}`
                return (
                  <li
                    key={r.key}
                    className={cn(
                      "flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center",
                      left.has(r.key) && "opacity-50",
                    )}
                  >
                    <label
                      htmlFor={id}
                      className="flex min-h-11 min-w-0 items-center gap-3 md:min-h-8 md:w-[42%]"
                    >
                      <Checkbox
                        id={id}
                        checked={!left.has(r.key)}
                        onCheckedChange={(v) => {
                          const next = new Set(left)
                          if (v) next.delete(r.key)
                          else next.add(r.key)
                          setLeft(next)
                        }}
                      />
                      <span
                        className="truncate font-mono text-body-sm"
                        title={r.from}
                      >
                        {r.from}
                      </span>
                    </label>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <ArrowRight className="size-4 shrink-0 text-ash" />
                      <Input
                        value={to}
                        onChange={(e) =>
                          setEdits({ ...edits, [r.key]: e.target.value })
                        }
                        placeholder={
                          unmatched === "gone" || !fallback.trim()
                            ? "Gone (410)"
                            : fallback
                        }
                        aria-label={`New address for ${r.from}`}
                        className="min-w-0 flex-1 font-mono"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      {r.to && to === r.to && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 text-caption",
                            r.score >= GOOD_MATCH
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning",
                          )}
                          title={`${Math.round(r.score * 100)}% alike`}
                        >
                          {r.score >= GOOD_MATCH ? "Close" : "Guess"}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {shown.length > limit && (
            <Button
              type="button"
              variant="outline"
              className="self-center"
              onClick={() => setLimit(limit + PAGE * 4)}
            >
              Show more ({(shown.length - limit).toLocaleString()} left)
            </Button>
          )}
          {noMatch > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-subtle p-3">
              <span className="text-body-sm font-medium">
                Old addresses without a match
              </span>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Segmented<Unmatched>
                  label="Without a match"
                  value={unmatched}
                  onChange={setUnmatched}
                  items={[
                    { value: "send", label: "Send to" },
                    { value: "gone", label: "Gone (410)" },
                  ]}
                />
                {unmatched === "send" && (
                  <Input
                    value={fallback}
                    onChange={(e) => setFallback(e.target.value)}
                    placeholder="/"
                    aria-label="Send them to"
                    className="font-mono md:max-w-xs"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                )}
              </div>
              <p className="text-caption text-ash">
                {unmatched === "gone"
                  ? "Search engines drop a page that answers 410 faster than one that's missing."
                  : "Sending many old pages to the home page can look like a soft 404 to search engines; a closer section page is better."}
              </p>
            </div>
          )}
        </section>
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
          disabled={!picked.length}
          onClick={add}
        >
          Add {picked.length.toLocaleString()} redirects
        </Button>
      </div>
    </div>
  )
}
