"use client"

import { Check, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { ListInput, splitList } from "@/app/(panel)/dns/components/fields"
import { Field } from "@/components/field"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebounced } from "@/hooks/useDebounced"
import { ApiError, fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  CacheGroup,
  ProxyHost,
  ProxyPurgeBody,
  ProxyPurgeResult,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCacheCount, usePurgeHostCache } from "../api"
import { hostName, proxyName } from "./meta"

// What the Clear cache layer starts on: a saved cache rule, or addresses (from a
// request in the logs).
export type PurgePreset = { group?: string; paths?: string[] }

type Mode = "all" | "paths" | "header" | "group"

const typing = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

// "12 kept answers (3.4 MB)"
export function answersText(r: Pick<ProxyPurgeResult, "matched" | "bytes">) {
  const n = r.matched.toLocaleString()
  const what = r.matched === 1 ? "1 kept answer" : `${n} kept answers`
  return r.matched ? `${what} (${formatSize(r.bytes)})` : what
}

// "45 minutes", "2 hours", "7 days"
export function minutesText(m: number) {
  const n = (v: number, one: string) => `${v} ${one}${v === 1 ? "" : "s"}`
  if (m >= 1440 && m % 1440 === 0) return n(m / 1440, "day")
  if (m >= 60 && m % 60 === 0) return n(m / 60, "hour")
  return n(m, "minute")
}

// One line about a cache rule: its time, addresses and header.
export function groupText(g: CacheGroup) {
  const parts: string[] = []
  if (g.never) parts.push("never kept")
  else if (g.minutes) parts.push(minutesText(g.minutes))
  const paths = g.paths ?? []
  if (paths.length)
    parts.push(
      paths.slice(0, 3).join(", ") +
        (paths.length > 3 ? ` +${paths.length - 3}` : ""),
    )
  if (g.header) parts.push(`${g.header}: ${g.value || "any value"}`)
  return parts.join(" · ")
}

// Clears a saved site's proxy cache: all of it, some addresses, answers the
// app tagged with a header, or a saved group. Counts what matches as you
// type (a dry run) so nothing is cleared blind.
export function PurgeLayer({
  open,
  onOpenChange,
  proxy: p,
  host,
  preset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxy: ReverseProxy
  host: ProxyHost
  preset?: PurgePreset
}) {
  const groups = host.config.cache?.groups ?? []
  const [mode, setMode] = useState<Mode>(
    preset?.group && groups.length
      ? "group"
      : preset?.paths?.length
        ? "paths"
        : "all",
  )
  const [paths, setPaths] = useState((preset?.paths ?? []).join("\n"))
  const [header, setHeader] = useState("Cache-Tag")
  const [value, setValue] = useState("")
  const [group, setGroup] = useState(preset?.group ?? groups[0]?.name ?? "")

  const body = useMemo((): Omit<ProxyPurgeBody, "dry_run"> | null => {
    switch (mode) {
      case "all":
        return {}
      case "paths": {
        const l = splitList(paths)
        return l.length ? { paths: l } : null
      }
      case "header":
        return header.trim()
          ? { header: header.trim(), value: value.trim() || undefined }
          : null
      case "group":
        return group ? { group } : null
    }
  }, [mode, paths, header, value, group])
  const settled = useDebounced(body, 400)
  const typing_ = JSON.stringify(settled) !== JSON.stringify(body)

  const total = useCacheCount(p.id, host.id, {}, open)
  const count = useCacheCount(
    p.id,
    host.id,
    settled ?? {},
    open && mode !== "all" && !!settled && !typing_,
  )
  const purge = usePurgeHostCache()

  const matched = mode === "all" ? total.data : count.data
  const errors = count.error instanceof ApiError ? fieldErrors(count.error) : {}
  const pathError = Object.entries(errors)
    .filter(([k]) => k.startsWith("paths"))
    .map(([, v]) => v)[0]
  const countError =
    count.error && !Object.keys(errors).length
      ? count.error instanceof ApiError
        ? count.error.message
        : String(count.error)
      : undefined

  const ready =
    !!body &&
    !typing_ &&
    !!matched?.ok &&
    matched.matched > 0 &&
    !purge.isPending

  const clear = () => {
    if (!body) return
    purge.mutate(
      { id: p.id, host: host.id, body },
      {
        onSuccess: (r) => {
          if (!r.ok) {
            toast.error("Couldn't clear the cache", {
              description: r.output || `Exit code ${r.exit_code}`,
            })
            return
          }
          toast.success(r.output || "Cache cleared", {
            description: hostName(host),
          })
          onOpenChange(false)
        },
        onError: (err) =>
          toast.error("Couldn't clear the cache", { description: err.message }),
      },
    )
  }

  const modes: { value: Mode; label: string; hint: string }[] = [
    {
      value: "all",
      label: "Everything",
      hint: "Every page and file kept for this site.",
    },
    {
      value: "paths",
      label: "Some addresses",
      hint: "Pages or folders you name, like /blog/ or /img/*.png.",
    },
    {
      value: "header",
      label: "By a header the app sends",
      hint: "Answers tagged by the app, like Cache-Tag: product-12.",
    },
    ...(groups.length
      ? [
          {
            value: "group" as const,
            label: "A cache rule",
            hint: "One of the rules set in the Cache tab.",
          },
        ]
      : []),
  ]

  const buttonLabel = purge.isPending
    ? "Clearing…"
    : mode === "all"
      ? "Clear everything"
      : matched?.ok && matched.matched > 0 && !typing_
        ? `Clear ${matched.matched === 1 ? "1 answer" : `${matched.matched.toLocaleString()} answers`}`
        : "Clear"

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Clear the cache"
      description={`${hostName(host)} on ${proxyName(p)}. Visitors' browsers keep their own copies.`}
      className="sm:max-w-lg"
      footer={
        <>
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="h-11 md:h-9" disabled={!ready} onClick={clear}>
            {purge.isPending && <Loader2 className="animate-spin" />}
            {buttonLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">
          {total.isPending ? (
            "Looking at the cache…"
          ) : total.data?.ok ? (
            <>
              In the cache now:{" "}
              <span className="text-foreground">{answersText(total.data)}</span>
            </>
          ) : (
            "Couldn't look at the cache."
          )}
        </p>

        <div
          role="radiogroup"
          aria-label="What to clear"
          className="flex flex-col overflow-hidden rounded-xl border border-border"
        >
          {modes.map((m) => {
            const on = mode === m.value
            return (
              // biome-ignore lint/a11y/useSemanticElements: row options; radio inputs can't be styled as rows
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMode(m.value)}
                className={cn(
                  "flex min-h-14 items-start gap-3 border-b border-border px-3 py-2.5 text-start outline-none last:border-b-0 focus-visible:bg-subtle",
                  on ? "bg-brand-soft/40" : "hover:bg-subtle active:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                    on
                      ? "border-brand bg-brand text-primary-foreground"
                      : "border-mist",
                  )}
                >
                  {on && <Check className="size-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium">
                    {m.label}
                  </span>
                  <span className="block text-caption text-muted-foreground">
                    {m.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {mode === "paths" && (
          <Field
            label="Addresses"
            hint="One per line. /blog covers it, everything under it and any ?query. * = any characters (*.css, /img/*). Put a domain in front for one domain only (shop.example.com/cart)."
            error={pathError}
          >
            {(f) => (
              <ListInput
                {...f}
                value={paths}
                onChange={setPaths}
                placeholder={"/blog/my-post\n/products/*\n*.css"}
              />
            )}
          </Field>
        )}

        {mode === "header" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Header"
              hint="As the app sends it."
              error={errors.header}
            >
              {(f) => (
                <Input
                  {...f}
                  {...typing}
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  placeholder="Cache-Tag"
                  className="font-mono"
                />
              )}
            </Field>
            <Field
              label="Value"
              hint="Or one item of its list. Empty = any value."
              error={errors.value}
            >
              {(f) => (
                <Input
                  {...f}
                  {...typing}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="product-12"
                  className="font-mono"
                />
              )}
            </Field>
          </div>
        )}

        {mode === "group" && (
          <div className="flex flex-col gap-2">
            {groups.map((g) => {
              const on = g.name === group
              return (
                <button
                  key={g.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGroup(g.name)}
                  className={cn(
                    "flex min-h-12 flex-col rounded-lg border px-3 py-2 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    on
                      ? "border-brand bg-brand-soft/40 ring-1 ring-brand"
                      : "border-border hover:bg-subtle",
                  )}
                >
                  <span className="text-body-sm font-medium">{g.name}</span>
                  <span className="truncate font-mono text-caption text-muted-foreground">
                    {groupText(g)}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {mode !== "all" && (
          <p
            className={cn(
              "min-h-5 text-body-sm",
              countError ? "text-destructive" : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {!body
              ? null
              : typing_ || count.isFetching
                ? "Counting…"
                : countError
                  ? countError
                  : count.data?.ok
                    ? count.data.matched
                      ? `${answersText(count.data)} match.`
                      : "Nothing kept matches."
                    : count.data
                      ? "Couldn't look at the cache."
                      : null}
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
