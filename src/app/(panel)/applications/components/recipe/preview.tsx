"use client"

import { ExternalLink } from "lucide-react"
import { useState } from "react"

import { ParamField } from "../install-layer"
import { kindLabels, linkHref, RecipeIcon } from "../meta"
import type { Draft } from "./model"

const HOST = "203.0.113.10"

// What the catalog and the install form will look like, as it's typed.
export function RecipePreview({ draft }: { draft: Draft }) {
  const kind = draft.kind ?? "docker"
  return (
    <div className="flex flex-col gap-6">
      <Block title="In the catalog">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <span className="flex items-start gap-3">
            <RecipeIcon recipe={{ ...draft, kind }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {draft.name?.trim() || (
                  <span className="text-ash">No name yet</span>
                )}
              </span>
              <span className="font-label text-[11px] tracking-label text-ash uppercase">
                Custom · {kindLabels[kind]}
              </span>
            </span>
          </span>
          <span className="line-clamp-2 min-h-10 text-body-sm text-muted-foreground">
            {draft.summary?.trim() || (
              <span className="text-ash">
                The one line under the name: add it in About.
              </span>
            )}
          </span>
          <span className="text-caption text-ash">
            {draft.category?.trim() || "Other"}
          </span>
        </div>
      </Block>
      <FormPreview draft={draft} />
    </div>
  )
}

function Block({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="font-label text-[11px] tracking-label text-ash uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function FormPreview({ draft }: { draft: Draft }) {
  // Values typed into the preview, by variable name; a try-out only.
  const [values, setValues] = useState<Record<string, string>>({})
  const params = draft.params.filter((p) => p.name)
  const valueFor = (name: string, fallback?: string) =>
    values[name] ?? fallback ?? ""
  const filled = Object.fromEntries(
    params.map((p) => [p.name, valueFor(p.name, p.default)]),
  )
  const links = draft.links
    .map((l) => ({ l, href: linkHref(l, HOST, filled) }))
    .filter((x) => x.l.label || x.href)
  return (
    <>
      <Block title="Install form">
        {params.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            Nothing to ask: Install starts straight away.
          </p>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
            {params.map((p) => (
              <ParamField
                key={p.name}
                p={{ ...p, label: p.label || p.name }}
                value={valueFor(p.name, p.default)}
                onChange={(v) => setValues((s) => ({ ...s, [p.name]: v }))}
              />
            ))}
          </div>
        )}
      </Block>
      {links.length > 0 && (
        <Block title="Once installed">
          <div className="flex flex-wrap gap-2">
            {links.map(({ l, href }, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: preview only
                key={i}
                title={href || "Needs a port"}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-body-sm"
              >
                <ExternalLink className="size-3.5 text-muted-foreground" />
                {l.label || "Open"}
              </span>
            ))}
          </div>
          <ul className="flex flex-col gap-1">
            {links.map(({ l, href }, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: preview only
                key={i}
                className="truncate font-mono text-caption text-ash"
              >
                {href || `${l.label || "Open"}: needs a port`}
              </li>
            ))}
          </ul>
        </Block>
      )}
    </>
  )
}
