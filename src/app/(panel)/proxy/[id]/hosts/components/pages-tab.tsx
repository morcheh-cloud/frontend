"use client"

import { Construction, Info } from "lucide-react"

import {
  AddButton,
  Callout,
  FieldError,
  ToggleRow,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ListInput } from "@/app/(panel)/dns/components/fields"
import { Field } from "@/components/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  type Draft,
  type ErrorPageDraft,
  type Errors,
  errorCodes,
  freshErrorPage,
  typeUses,
} from "./draft"
import { EditorCard as Card } from "./editor-card"
import { RemoveButton } from "./rows"

type Props = {
  proxy: ReverseProxy
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  phone: boolean
}

const codeNames: Record<number, string> = {
  400: "Bad request",
  403: "Forbidden",
  404: "Not found",
  405: "Method not allowed",
  408: "Timed out",
  413: "Too large",
  429: "Too many requests",
  500: "Server error",
  502: "App down",
  503: "Unavailable",
  504: "App too slow",
}

// What visitors see instead of the site, or instead of a plain error.
export function PagesTab(props: Props) {
  const uses = typeUses(props.draft.type)
  return (
    <>
      {uses.maintenance && <MaintenanceCard {...props} />}
      {uses.errorPages && <ErrorPagesCard {...props} />}
    </>
  )
}

function MaintenanceCard({ draft, set, errors, phone }: Props) {
  return (
    <Card
      title="Maintenance"
      hint="Visitors get a friendly “back soon” page (503) while the app is down for work. Search engines are told to come back later."
      phone={phone}
    >
      <ToggleRow
        id="maint-on"
        label={draft.maint ? "On: visitors see the page" : "Off"}
        hint="The site's settings stay as they are; turning it off brings the site back."
        checked={draft.maint}
        onChange={(maint) => set({ maint })}
      />
      {draft.maint && (
        <Callout icon={<Construction />} tone="warning">
          Once saved, only the addresses below can use the site.
        </Callout>
      )}
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <Field
          label="Title"
          hint="Empty = We'll be right back"
          error={errors["maintenance.title"]}
        >
          {(f) => (
            <Input
              {...f}
              value={draft.maintTitle}
              onChange={(e) => set({ maintTitle: e.target.value })}
              placeholder="We'll be right back"
              maxLength={200}
            />
          )}
        </Field>
        <Field
          label="Back in about (minutes)"
          hint="Told to browsers and search engines. Empty = not said."
          error={errors["maintenance.retry_minutes"]}
        >
          {(f) => (
            <Input
              {...f}
              type="number"
              inputMode="numeric"
              min={1}
              max={10080}
              value={draft.maintRetry}
              onChange={(e) => set({ maintRetry: e.target.value })}
              placeholder="30"
              className="tabular-nums"
            />
          )}
        </Field>
      </div>
      <Field
        label="Message"
        hint="Plain text, shown under the title."
        error={errors["maintenance.message"]}
      >
        {(f) => (
          <Textarea
            {...f}
            value={draft.maintMessage}
            onChange={(e) => set({ maintMessage: e.target.value })}
            placeholder="We're upgrading the site. Thanks for your patience."
            maxLength={2000}
            rows={3}
          />
        )}
      </Field>
      <Field
        label="Still let in"
        hint="Addresses or ranges that see the real site, one per line: your office, your VPN."
        error={errors["maintenance.allow"]}
      >
        {(f) => (
          <ListInput
            {...f}
            value={draft.maintAllow}
            onChange={(maintAllow) => set({ maintAllow })}
            placeholder={"203.0.113.7\n10.0.0.0/8"}
          />
        )}
      </Field>
    </Card>
  )
}

function ErrorPagesCard({ draft, set, errors, phone }: Props) {
  const uses = typeUses(draft.type)
  const rows = draft.errorPages
  const patch = (key: string, p: Partial<ErrorPageDraft>) =>
    set({ errorPages: rows.map((r) => (r.key === key ? { ...r, ...p } : r)) })
  // A status can only have one page.
  const taken = (key: string) =>
    new Set(rows.filter((r) => r.key !== key).flatMap((r) => r.codes))
  const unused = errorCodes.filter(
    (c) => !rows.some((r) => r.codes.includes(c)),
  )
  return (
    <Card
      title="Error pages"
      hint="Your own page in place of the plain one, for the statuses you pick. Pages share one look: a title and a short message."
      count={rows.length}
      phone={phone}
    >
      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => {
            const other = taken(r.key)
            const maint = draft.maint && uses.maintenance
            return (
              <li
                key={r.key}
                className="flex flex-col gap-3 rounded-xl border border-border p-3"
              >
                <div className="flex items-start gap-2">
                  <fieldset className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    <legend className="sr-only">
                      Statuses for page {i + 1}
                    </legend>
                    {errorCodes.map((c) => {
                      const on = r.codes.includes(c)
                      const blocked =
                        !on && (other.has(c) || (maint && c === 503))
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={on}
                          disabled={blocked}
                          title={
                            blocked
                              ? c === 503 && maint
                                ? "Maintenance uses 503 while it's on"
                                : "Another page has it"
                              : codeNames[c]
                          }
                          onClick={() =>
                            patch(r.key, {
                              codes: on
                                ? r.codes.filter((x) => x !== c)
                                : [...r.codes, c].sort((a, b) => a - b),
                            })
                          }
                          className={cn(
                            "h-9 rounded-full border border-border px-3 font-mono text-caption text-muted-foreground tabular-nums outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40 disabled:hover:text-muted-foreground md:h-7 md:px-2.5",
                            on &&
                              "border-brand bg-brand-soft text-brand-strong hover:text-brand-strong",
                          )}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </fieldset>
                  <RemoveButton
                    label={`Remove page ${i + 1}`}
                    onClick={() =>
                      set({ errorPages: rows.filter((x) => x.key !== r.key) })
                    }
                  />
                </div>
                {r.codes.length > 0 && (
                  <p className="text-caption text-muted-foreground">
                    {r.codes.map((c) => codeNames[c] ?? c).join(", ")}
                  </p>
                )}
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <Input
                    aria-label={`Page ${i + 1} title`}
                    value={r.title}
                    onChange={(e) => patch(r.key, { title: e.target.value })}
                    placeholder="Title (empty = the status's name)"
                    maxLength={200}
                  />
                  <Input
                    aria-label={`Page ${i + 1} message`}
                    value={r.message}
                    onChange={(e) => patch(r.key, { message: e.target.value })}
                    placeholder="Message (optional)"
                    maxLength={2000}
                  />
                </div>
                <FieldError text={errors[`error_pages.${r.key}`]} />
              </li>
            )
          })}
        </ul>
      )}
      <FieldError text={errors.error_pages} />
      {unused.length > 0 && (
        <AddButton
          onClick={() =>
            set({
              errorPages: [
                ...rows,
                freshErrorPage(
                  rows.length === 0
                    ? unused.filter((c) => c === 502 || c === 504)
                    : [],
                ),
              ],
            })
          }
        >
          Add a page
        </AddButton>
      )}
      {uses.interceptErrors && (
        <ToggleRow
          id="intercept-errors"
          label="Also for the app's own errors"
          hint="When the app answers with one of these statuses, visitors get your page instead of the app's. Off = only the proxy's own errors (app down, too slow…)."
          checked={draft.interceptErrors}
          onChange={(interceptErrors) => set({ interceptErrors })}
        />
      )}
      {uses.interceptErrors && draft.interceptErrors && (
        <Callout icon={<Info />}>
          APIs that explain a 404 or 400 in their answer lose that text. Leave
          it off for apps with an API on this site.
        </Callout>
      )}
    </Card>
  )
}
