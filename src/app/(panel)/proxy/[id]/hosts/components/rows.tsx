"use client"

import { X } from "lucide-react"

import {
  AddButton,
  FieldError,
} from "@/app/(panel)/cronjobs/components/editor-parts"
import { ChoiceSelect } from "@/app/(panel)/dns/components/fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  type Errors,
  freshHeader,
  freshPath,
  type HeaderDraft,
  type PathDraft,
} from "./draft"

const MAX_ROWS = 50

const typing = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

function RemoveButton({
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

// Paths that go to another app: /api → http://127.0.0.1:8080.
export function PathRows({
  rows,
  onChange,
  errors,
  websockets,
}: {
  rows: PathDraft[]
  onChange: (rows: PathDraft[]) => void
  errors: Errors
  websockets: boolean
}) {
  const patch = (key: string, p: Partial<PathDraft>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...p } : r)))
  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <li key={r.key} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                <Input
                  {...typing}
                  aria-label={`Path ${i + 1}`}
                  aria-invalid={errors[`paths.${r.key}`] ? true : undefined}
                  value={r.path}
                  onChange={(e) => patch(r.key, { path: e.target.value })}
                  placeholder="/api"
                  className="w-full font-mono md:w-40"
                />
                <span aria-hidden className="hidden text-ash md:inline">
                  →
                </span>
                <Input
                  {...typing}
                  inputMode="url"
                  aria-label={`Path ${i + 1} goes to`}
                  aria-invalid={errors[`paths.${r.key}`] ? true : undefined}
                  value={r.upstream}
                  onChange={(e) => patch(r.key, { upstream: e.target.value })}
                  placeholder="http://127.0.0.1:8080"
                  className="min-w-0 flex-1 font-mono"
                />
                {websockets && (
                  // biome-ignore lint/a11y/noLabelWithoutControl: Base UI switch renders the control inside
                  <label
                    className="flex h-11 shrink-0 items-center gap-2 text-caption text-muted-foreground md:h-9"
                    title="Let live connections (WebSockets) through"
                  >
                    <Switch
                      checked={r.websockets}
                      onCheckedChange={(v) => patch(r.key, { websockets: v })}
                    />
                    WebSockets
                  </label>
                )}
                <RemoveButton
                  label={`Remove path ${r.path || i + 1}`}
                  onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
                />
              </div>
              {r.advanced && (
                <p className="text-caption text-ash">
                  Has its own raw directives, kept as they are.
                </p>
              )}
              <FieldError text={errors[`paths.${r.key}`]} />
            </li>
          ))}
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

const headerTargets = [
  { value: "response" as const, label: "To visitors" },
  { value: "request" as const, label: "To the app" },
]

// Headers set on the way in (to the app) or out (to the visitor).
export function HeaderRows({
  rows,
  onChange,
  errors,
  hidden,
}: {
  rows: HeaderDraft[]
  onChange: (rows: HeaderDraft[]) => void
  errors: Errors
  // Values were left out of what this person can read.
  hidden?: boolean
}) {
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
                    items={headerTargets}
                  />
                </div>
                <Input
                  {...typing}
                  aria-label={`Header ${i + 1} name`}
                  aria-invalid={errors[`headers.${r.key}`] ? true : undefined}
                  value={r.name}
                  onChange={(e) => patch(r.key, { name: e.target.value })}
                  placeholder="X-Frame-Options"
                  className="min-w-0 flex-1 font-mono md:max-w-56"
                />
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
