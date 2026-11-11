"use client"

import {
  ArrowRight,
  CircleCheck,
  EyeOff,
  FileSearch,
  Plus,
  ScrollText,
  TriangleAlert,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ProxyRedirectStats } from "@/lib/services"
import { cn } from "@/lib/utils"
import type { RedirectRange } from "../../../api"
import { EditorCard as Card } from "./editor-card"
import {
  checkRedirects,
  freshRedirect,
  GOOD_MATCH,
  MAX_REDIRECTS,
  type RedirectDraft,
  type RuleUse,
  suggestRedirects,
} from "./redirects"

const rangeItems: { value: RedirectRange; label: string }[] = [
  { value: "24h", label: "24 h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
]

const SHOWN = 8

// 404s the person chose to leave alone, per site, on this browser only.
export function useIgnored(hostId: string) {
  const key = `morcheh.redirects.ignored.${hostId}`
  const [ignored, setIgnored] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key)
      const list = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(list) ? list.map(String) : [])
    } catch {
      return new Set()
    }
  })
  const save = (next: Set<string>) => {
    setIgnored(next)
    try {
      if (next.size)
        localStorage.setItem(key, JSON.stringify([...next].slice(-2000)))
      else localStorage.removeItem(key)
    } catch {}
  }
  return {
    ignored,
    ignore: (path: string) => save(new Set([...ignored, path])),
    reset: () => save(new Set()),
  }
}

const ago = (iso: string) => {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}

// What the access log says about the rules: which are used, and addresses
// visitors still can't find, each with the closest page as a ready rule.
export function UsageCard({
  phone,
  readOnly,
  range,
  onRange,
  stats,
  loading,
  error,
  use,
  rows,
  domains,
  strict,
  hostId,
  onShowUnused,
  onAdd,
}: {
  phone: boolean
  readOnly: boolean
  range: RedirectRange
  onRange: (r: RedirectRange) => void
  stats: ProxyRedirectStats | undefined
  loading: boolean
  error: string | undefined
  use: Map<string, RuleUse>
  rows: RedirectDraft[]
  domains: string[]
  strict: boolean
  hostId: string
  onShowUnused: () => void
  onAdd: (rules: RedirectDraft[]) => void
}) {
  const { ignored, ignore, reset } = useIgnored(hostId)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [more, setMore] = useState(false)

  const on = rows.filter((r) => !r.off)
  const used = on.filter((r) => use.has(r.key)).length
  const answers = [...use.values()].reduce((n, u) => n + u.count, 0)
  const { list, probes } = stats
    ? suggestRedirects(
        stats.not_found,
        stats.pages.map((p) => p.path),
        rows,
        domains,
        strict,
        ignored,
      )
    : { list: [], probes: 0 }
  const targetOf = (path: string, fallback: string) => edits[path] ?? fallback
  const ready = list.filter((s) => targetOf(s.path, s.to).trim())
  const shown = more ? list : list.slice(0, SHOWN)

  const add = (items: { path: string; to: string }[]) => {
    const fresh = items.map((s) =>
      freshRedirect({ from: s.path.split("?")[0], to: s.to.trim(), code: 301 }),
    )
    if (rows.length + fresh.length > MAX_REDIRECTS) {
      toast.error(`A site holds up to ${MAX_REDIRECTS.toLocaleString()} rules.`)
      return
    }
    const problems = checkRedirects([...rows, ...fresh], domains, strict)
    const good = fresh.filter((r) => !problems.has(r.key))
    if (good.length < fresh.length) {
      const p = fresh.find((r) => problems.has(r.key))
      toast.error(
        good.length
          ? `${fresh.length - good.length} left out: ${p && problems.get(p.key)?.message}`
          : (p && problems.get(p.key)?.message) || "That rule has a problem.",
      )
    }
    if (good.length) {
      onAdd(good)
      toast.success(
        good.length === 1
          ? "Redirect added. Save to put it on the server."
          : `${good.length} redirects added. Save to put them on the server.`,
      )
    }
  }

  return (
    <Card
      title="From the access log"
      hint="Which rules visitors meet, and addresses they still can't find. Read from this site's own log on the proxy."
      phone={phone}
      action={
        <Segmented<RedirectRange>
          label="Period"
          value={range}
          onChange={onRange}
          items={rangeItems}
        />
      }
    >
      {loading ? (
        <p className="py-4 text-body-sm text-muted-foreground">
          Reading the access log…
        </p>
      ) : error ? (
        <Callout icon={<TriangleAlert />} tone="warning">
          Couldn't read the log: {error}
        </Callout>
      ) : !stats || stats.missing ? (
        <Callout icon={<ScrollText />}>
          This site has no access log yet. Counts show up once visitors arrive
          after the site is saved.
        </Callout>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm">
            <span>
              <span className="font-medium">{used.toLocaleString()}</span>{" "}
              <span className="text-muted-foreground">
                of {on.length.toLocaleString()} rules used ·{" "}
                {answers.toLocaleString()} redirects answered
              </span>
            </span>
            {on.length > used && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={onShowUnused}
              >
                Show the {(on.length - used).toLocaleString()} unused
              </Button>
            )}
          </div>
          {stats.partial && (
            <p className="-mt-2 text-caption text-ash">
              The log is big: counts come from its newest part.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-body-sm font-medium">
                Not found{list.length ? ` (${list.length})` : ""}
              </h4>
              <span className="text-caption text-ash">
                Addresses that answered 404, most asked first.
                {probes > 0 && ` ${probes} scanner probes hidden.`}
              </span>
              {!readOnly && ready.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ms-auto h-11 md:h-8"
                  onClick={() =>
                    add(
                      ready.map((s) => ({
                        path: s.path,
                        to: targetOf(s.path, s.to),
                      })),
                    )
                  }
                >
                  <Plus />
                  Add all with a target ({ready.length})
                </Button>
              )}
            </div>
            {list.length === 0 ? (
              <Callout icon={<CircleCheck />}>
                Nothing left to fix: every 404 is a scanner's, already has a
                rule or was set aside.
                {ignored.size > 0 && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="text-brand underline-offset-2 hover:underline"
                      onClick={reset}
                    >
                      Bring back {ignored.size} set aside
                    </button>
                  </>
                )}
              </Callout>
            ) : (
              <ul
                className={cn(
                  "flex flex-col divide-y divide-border",
                  phone
                    ? "-mx-4 border-y border-border"
                    : "rounded-xl border border-border",
                )}
              >
                {shown.map((s) => {
                  const to = targetOf(s.path, s.to)
                  return (
                    <li
                      key={s.path}
                      className={cn(
                        "flex flex-col gap-2 py-2",
                        phone ? "px-4" : "px-3 md:flex-row md:items-center",
                      )}
                    >
                      <div className="min-w-0 md:w-[38%]">
                        <p
                          className="truncate font-mono text-body-sm"
                          title={s.path}
                        >
                          {s.path}
                        </p>
                        <p
                          className="truncate text-caption text-ash"
                          title={s.referer}
                        >
                          {s.count.toLocaleString()} ×, {ago(s.last)}
                          {s.referer && ` · from ${s.referer}`}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <ArrowRight className="hidden size-4 shrink-0 text-ash md:block" />
                        <Input
                          value={to}
                          disabled={readOnly}
                          onChange={(e) =>
                            setEdits({ ...edits, [s.path]: e.target.value })
                          }
                          placeholder="No close page: type where to send it"
                          aria-label={`New address for ${s.path}`}
                          className="min-w-0 flex-1 font-mono"
                          inputMode="url"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                        {s.to && to === s.to && (
                          <span
                            className={cn(
                              "hidden shrink-0 rounded-full px-2 text-caption lg:inline",
                              s.score >= GOOD_MATCH
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground",
                            )}
                            title="How alike the two addresses are"
                          >
                            {s.score >= GOOD_MATCH ? "Close match" : "Guess"}
                          </span>
                        )}
                        {!readOnly && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 md:h-8"
                              disabled={!to.trim()}
                              onClick={() => add([{ path: s.path, to }])}
                            >
                              Add
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size={phone ? "icon-lg" : "icon-sm"}
                              aria-label={`Set ${s.path} aside`}
                              title="Set aside: no redirect needed"
                              onClick={() => ignore(s.path)}
                            >
                              <EyeOff />
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            {list.length > SHOWN && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setMore(!more)}
              >
                <FileSearch />
                {more ? "Show fewer" : `Show all ${list.length}`}
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  )
}
