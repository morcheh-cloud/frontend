"use client"

import { Info } from "lucide-react"

import {
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  type Draft,
  type Errors,
  type HardeningStatus,
  hardeningMethods,
  hardeningOn,
  typeUses,
} from "./draft"
import { EditorCard as Card } from "./editor-card"

const switches = [
  {
    key: "hDotfiles",
    label: "Hidden files",
    hint: "/.env, /.git, /.htaccess… (/.well-known stays open for certificates).",
  },
  {
    key: "hBackups",
    label: "Backups and dumps",
    hint: "Files ending in .bak, .old, .sql, .swp, ~ and the like.",
  },
  {
    key: "hScanners",
    label: "Known scanners",
    hint: "sqlmap, nikto, masscan, zgrab… found by what they call themselves.",
  },
  {
    key: "hAiCrawlers",
    label: "AI crawlers",
    hint: "GPTBot, ClaudeBot, CCBot, Bytespider… that collect pages for AI training.",
  },
  {
    key: "hProbes",
    label: "Common probes",
    hint: "/wp-admin, /phpmyadmin, /cgi-bin… Leave off if the site really has them.",
  },
] as const

const statuses = [
  { value: "404", label: "404" },
  { value: "403", label: "403" },
  { value: "444", label: "Close (444)" },
] as const

const statusHints: Record<HardeningStatus, string> = {
  404: "Not Found: the request looks like any missing page.",
  403: "Forbidden: says it was refused.",
  444: "Closes the connection without an answer.",
}

// Ready-made refusals for requests no real visitor sends.
export function HardeningCard({
  draft,
  set,
  errors,
  phone,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}) {
  if (!typeUses(draft.type).hardening) return null
  const limitMethods = draft.hMethods.length > 0
  const toggleMethod = (m: string, on: boolean) =>
    set({
      hMethods: on
        ? hardeningMethods.filter((x) => x === m || draft.hMethods.includes(x))
        : draft.hMethods.filter((x) => x !== m),
    })
  return (
    <Card
      title="Hardening"
      hint="Refuse requests that only scanners and bots send, before they reach the app."
      phone={phone}
    >
      {switches.map((s) => (
        <ToggleRow
          key={s.key}
          id={`harden-${s.key}`}
          label={s.label}
          hint={s.hint}
          checked={draft[s.key]}
          onChange={(on) => set({ [s.key]: on })}
        />
      ))}
      <ToggleRow
        id="harden-methods"
        label="Only these request methods"
        hint="Anything else is refused. Most sites need GET, HEAD and POST; APIs also PUT, PATCH, DELETE."
        checked={limitMethods}
        onChange={(on) =>
          set({
            hMethods: on ? ["GET", "HEAD", "POST", "OPTIONS"] : [],
          })
        }
      />
      {limitMethods && (
        <fieldset className="-mt-1 flex flex-wrap gap-x-4 gap-y-2">
          <legend className="sr-only">Allowed methods</legend>
          {hardeningMethods.map((m) => {
            const on = draft.hMethods.includes(m)
            const fixed = m === "GET"
            return (
              // biome-ignore lint/a11y/noLabelWithoutControl: Base UI checkbox renders the control inside
              <label
                key={m}
                className={cn(
                  "flex min-h-11 items-center gap-2 font-mono text-caption md:min-h-8",
                  fixed && "opacity-60",
                )}
              >
                <Checkbox
                  checked={on || fixed}
                  disabled={fixed}
                  onCheckedChange={(v) => toggleMethod(m, !!v)}
                />
                {m}
              </label>
            )
          })}
        </fieldset>
      )}
      <FieldError text={errors["hardening.methods"]} />
      {hardeningOn(draft) && (
        <Field
          label="Answer"
          hint={statusHints[draft.hStatus]}
          error={errors["hardening.status"]}
        >
          {() => (
            <div>
              <Segmented
                label="Answer"
                items={statuses}
                value={String(draft.hStatus) as "404"}
                onChange={(v) => set({ hStatus: Number(v) as HardeningStatus })}
              />
            </div>
          )}
        </Field>
      )}
      {draft.hProbes && (
        <Callout icon={<Info />}>
          Turn Common probes off for a WordPress or phpMyAdmin site, or its own
          pages are refused.
        </Callout>
      )}
    </Card>
  )
}
