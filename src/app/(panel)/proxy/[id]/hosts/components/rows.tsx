"use client"

import { ShieldCheck, X } from "lucide-react"

import {
  AddButton,
  FieldError,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ChoiceSelect, ListInput } from "@/app/(panel)/dns/components/fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  type Errors,
  freshHeader,
  freshPath,
  guarded,
  type HeaderDraft,
  type PathAccess,
  type PathDraft,
  type PathMatch,
} from "./draft"
import { Choice } from "./rate-limit"

const MAX_ROWS = 50

export const typing = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

export function RemoveButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onClick}
      className="size-11 shrink-0 text-ash md:size-9"
    >
      <X />
    </Button>
  )
}

const matchItems = [
  { value: "prefix" as const, label: "Starts with" },
  { value: "exact" as const, label: "Is exactly" },
  { value: "regex" as const, label: "Matches pattern" },
]

const actionItems = [
  { value: "proxy" as const, label: "Send to an app" },
  { value: "redirect" as const, label: "Redirect" },
  { value: "static" as const, label: "Serve files" },
  { value: "deny" as const, label: "Block" },
  { value: "return" as const, label: "Answer with" },
]

const redirectItems = [
  { value: 302 as const, label: "302 Temporary" },
  { value: 301 as const, label: "301 Permanent" },
  { value: 307 as const, label: "307 Temporary, same method" },
  { value: 308 as const, label: "308 Permanent, same method" },
]

const denyItems = [
  { value: 403 as const, label: "403 Forbidden" },
  { value: 404 as const, label: "404 Not Found" },
  { value: 410 as const, label: "410 Gone" },
  { value: 444 as const, label: "Close the connection (444)" },
]

// "site" stands for "" (as the site), which a select can't hold.
const accessItems = [
  { value: "site" as const, label: "Same as the site" },
  { value: "only" as const, label: "Only these addresses" },
  { value: "except" as const, label: "Everyone but these" },
  { value: "everyone" as const, label: "Everyone" },
]

const accessHint: Record<PathAccess, string> = {
  "": "",
  only: "Only these addresses open this path; everyone else gets 403. It replaces the site's address lists here.",
  except:
    "These addresses get 403 here; everyone else gets in. It replaces the site's address lists here.",
  everyone:
    "Open to every address, even when Security limits the site (country rules still apply). Handy for webhooks and health checks.",
}

const pathPlaceholder: Record<PathMatch, string> = {
  prefix: "/api/",
  exact: "/health",
  regex: "\\.(png|jpg)$",
}

function Flag({
  label,
  title,
  checked,
  onChange,
}: {
  label: string
  title: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Base UI switch renders the control inside
    <label
      className="flex h-11 shrink-0 items-center gap-2 text-caption text-muted-foreground md:h-9"
      title={title}
    >
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  )
}

// Rules for parts of the site: /api → another app, /old → a redirect,
// /admin → blocked, /health → a fixed answer.
export function PathRows({
  rows,
  onChange,
  errors,
  websockets,
  actions,
  login,
  access,
}: {
  rows: PathDraft[]
  onChange: (rows: PathDraft[]) => void
  errors: Errors
  websockets: boolean
  // The proxy can do more than send a path to another app.
  actions: boolean
  // How the site asks for a login: everywhere (a path can skip it), on
  // chosen paths (a path can ask), or not at all.
  login: "" | "site" | "paths"
  // A path can say which addresses open it.
  access: boolean
}) {
  const patch = (key: string, p: Partial<PathDraft>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...p } : r)))
  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => {
            const n = r.path.trim() || `${i + 1}`
            const invalid = errors[`paths.${r.key}`] ? true : undefined
            const flags = [
              r.action === "proxy" && websockets && (
                <Flag
                  key="ws"
                  label="WebSockets"
                  title="Let live connections (WebSockets) through"
                  checked={r.websockets}
                  onChange={(v) => patch(r.key, { websockets: v })}
                />
              ),
              actions && r.action === "proxy" && r.match === "prefix" && (
                <Flag
                  key="strip"
                  label="Drop the path"
                  title={`The app gets /users, not ${r.path.trim() || "/api/"}users`}
                  checked={r.stripPrefix}
                  onChange={(v) => patch(r.key, { stripPrefix: v })}
                />
              ),
              actions && login === "site" && (
                <Flag
                  key="public"
                  label="No login"
                  title="Anyone can open this path without signing in"
                  checked={r.public}
                  onChange={(v) => patch(r.key, { public: v })}
                />
              ),
              actions && login === "paths" && guarded(r) && (
                <Flag
                  key="login"
                  label="Sign in"
                  title="Visitors sign in before they open this path (Login tab)"
                  checked={r.login}
                  onChange={(v) => patch(r.key, { login: v })}
                />
              ),
            ].filter(Boolean)
            const checks = actions && access && guarded(r)
            const listed = r.access === "only" || r.access === "except"
            return (
              <li
                key={r.key}
                className={cn(
                  "flex flex-col gap-2",
                  actions && "rounded-xl border border-border p-3",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                  {actions && (
                    <div className="w-[calc(100%-3.25rem)] md:w-40 md:shrink-0">
                      <ChoiceSelect
                        value={r.match}
                        onChange={(match) => patch(r.key, { match })}
                        items={matchItems}
                      />
                    </div>
                  )}
                  <Input
                    {...typing}
                    aria-label={`Path ${i + 1}`}
                    aria-invalid={invalid}
                    value={r.path}
                    onChange={(e) => patch(r.key, { path: e.target.value })}
                    placeholder={pathPlaceholder[r.match]}
                    className={cn(
                      "w-full font-mono",
                      actions ? "md:min-w-0 md:flex-1" : "md:w-40",
                    )}
                  />
                  {actions ? (
                    <div className="w-full md:w-44 md:shrink-0">
                      <ChoiceSelect
                        value={r.action}
                        onChange={(action) => patch(r.key, { action })}
                        items={actionItems}
                      />
                    </div>
                  ) : (
                    <>
                      <span aria-hidden className="hidden text-ash md:inline">
                        →
                      </span>
                      <ActionFields
                        row={r}
                        i={i}
                        invalid={invalid}
                        patch={(p) => patch(r.key, p)}
                      />
                      {flags}
                    </>
                  )}
                  <RemoveButton
                    label={`Remove path ${n}`}
                    onClick={() =>
                      onChange(rows.filter((x) => x.key !== r.key))
                    }
                  />
                </div>
                {actions && (
                  <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                    <ActionFields
                      row={r}
                      i={i}
                      invalid={invalid}
                      patch={(p) => patch(r.key, p)}
                    />
                  </div>
                )}
                {actions && (checks || flags.length > 0) && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {checks && (
                      <div className="flex w-full items-center gap-2 md:w-auto">
                        <ShieldCheck
                          aria-hidden
                          className={cn(
                            "size-4 shrink-0",
                            r.access ? "text-brand" : "text-ash",
                          )}
                        />
                        <div className="min-w-0 flex-1 md:w-60 md:flex-none">
                          <ChoiceSelect
                            value={r.access || "site"}
                            onChange={(v) =>
                              patch(r.key, {
                                access: v === "site" ? "" : v,
                              })
                            }
                            items={accessItems}
                          />
                        </div>
                      </div>
                    )}
                    {flags}
                  </div>
                )}
                {checks && listed && (
                  <ListInput
                    aria-invalid={invalid}
                    value={r.addresses}
                    onChange={(addresses) => patch(r.key, { addresses })}
                    placeholder={"192.168.1.0/24\n203.0.113.7"}
                  />
                )}
                {checks && r.access && (
                  <p className="text-caption text-muted-foreground">
                    {accessHint[r.access]}
                  </p>
                )}
                {r.advanced && (
                  <p className="text-caption text-ash">
                    Has its own raw directives, kept as they are.
                  </p>
                )}
                <FieldError text={errors[`paths.${r.key}`]} />
              </li>
            )
          })}
        </ul>
      )}
      {rows.length < MAX_ROWS && (
        <AddButton onClick={() => onChange([...rows, freshPath()])}>
          Add a path
        </AddButton>
      )}
    </div>
  )
}

// What a path rule's action needs.
function ActionFields({
  row: r,
  i,
  invalid,
  patch,
}: {
  row: PathDraft
  i: number
  invalid?: true
  patch: (p: Partial<PathDraft>) => void
}) {
  switch (r.action) {
    case "proxy":
      return (
        <Input
          {...typing}
          inputMode="url"
          aria-label={`Path ${i + 1} goes to`}
          aria-invalid={invalid}
          value={r.upstream}
          onChange={(e) => patch({ upstream: e.target.value })}
          placeholder="http://127.0.0.1:8080"
          className="min-w-0 flex-1 font-mono"
        />
      )
    case "redirect":
      return (
        <>
          <Input
            {...typing}
            inputMode="url"
            aria-label={`Path ${i + 1} redirects to`}
            aria-invalid={invalid}
            value={r.redirectTo}
            onChange={(e) => patch({ redirectTo: e.target.value })}
            placeholder="/new or https://example.com/page"
            className="min-w-0 flex-1 font-mono"
          />
          <div className="w-full md:w-60 md:shrink-0">
            <Choice
              label={`Path ${i + 1} redirect kind`}
              value={r.redirectCode}
              onChange={(redirectCode) => patch({ redirectCode })}
              items={redirectItems}
            />
          </div>
        </>
      )
    case "static":
      return (
        <Input
          {...typing}
          aria-label={`Path ${i + 1} folder`}
          aria-invalid={invalid}
          value={r.root}
          onChange={(e) => patch({ root: e.target.value })}
          placeholder="/var/www/files"
          className="min-w-0 flex-1 font-mono"
        />
      )
    case "deny":
      return (
        <div className="w-full md:w-64">
          <Choice
            label={`Path ${i + 1} answer`}
            value={r.denyStatus}
            onChange={(denyStatus) => patch({ denyStatus })}
            items={denyItems}
          />
        </div>
      )
    case "return":
      return (
        <>
          <Input
            aria-label={`Path ${i + 1} status`}
            aria-invalid={invalid}
            inputMode="numeric"
            value={r.status}
            onChange={(e) => patch({ status: e.target.value })}
            placeholder="200"
            className="w-24 shrink-0 tabular-nums"
          />
          <Input
            {...typing}
            aria-label={`Path ${i + 1} answer`}
            aria-invalid={invalid}
            value={r.body}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="ok"
            className="min-w-0 flex-1 font-mono"
          />
        </>
      )
  }
}

const headerTargets = [
  { value: "response" as const, label: "To visitors" },
  { value: "request" as const, label: "To the app" },
]
const hideTarget = {
  value: "hide" as const,
  label: "Remove from the app's answer",
}

// Headers set on the way in (to the app) or out (to the visitor).
export function HeaderRows({
  rows,
  onChange,
  errors,
  hidden,
  canHide,
}: {
  rows: HeaderDraft[]
  onChange: (rows: HeaderDraft[]) => void
  errors: Errors
  // Values were left out of what this person can read.
  hidden?: boolean
  // Headers from the app can be taken out (proxy sites).
  canHide?: boolean
}) {
  const targets =
    canHide || rows.some((r) => r.to === "hide")
      ? [...headerTargets, hideTarget]
      : headerTargets
  const patch = (key: string, p: Partial<HeaderDraft>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...p } : r)))
  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <li key={r.key} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                <div className="w-full md:w-40 md:shrink-0">
                  <ChoiceSelect
                    value={r.to}
                    onChange={(to) => patch(r.key, { to })}
                    items={targets}
                  />
                </div>
                <Input
                  {...typing}
                  aria-label={`Header ${i + 1} name`}
                  aria-invalid={errors[`headers.${r.key}`] ? true : undefined}
                  value={r.name}
                  onChange={(e) => patch(r.key, { name: e.target.value })}
                  placeholder={
                    r.to === "hide" ? "X-Powered-By" : "X-Frame-Options"
                  }
                  className={cn(
                    "min-w-0 flex-1 font-mono",
                    r.to !== "hide" && "md:max-w-56",
                  )}
                />
                {r.to !== "hide" && (
                  <Input
                    {...typing}
                    aria-label={`Header ${i + 1} value`}
                    aria-invalid={errors[`headers.${r.key}`] ? true : undefined}
                    value={r.value}
                    onChange={(e) => patch(r.key, { value: e.target.value })}
                    placeholder={hidden ? "Hidden" : "SAMEORIGIN"}
                    className={cn(
                      "min-w-0 flex-1 font-mono",
                      hidden && "placeholder:font-sans placeholder:text-ash",
                    )}
                  />
                )}
                <RemoveButton
                  label={`Remove header ${r.name || i + 1}`}
                  onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
                />
              </div>
              <FieldError text={errors[`headers.${r.key}`]} />
            </li>
          ))}
        </ul>
      )}
      {rows.length < MAX_ROWS && (
        <AddButton onClick={() => onChange([...rows, freshHeader()])}>
          Add a header
        </AddButton>
      )}
    </div>
  )
}
