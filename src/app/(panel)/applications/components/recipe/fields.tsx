"use client"

import {
  ArrowDown,
  ArrowUp,
  Check,
  Container,
  FileCode,
  Package,
  Trash2,
  X,
} from "lucide-react"
import Image from "next/image"
import { type ReactNode, useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { Recipe } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  appLogos,
  inkLogos,
  kindHints,
  kindLabels,
  RecipeIcon,
  recipeIcons,
} from "../meta"

// ---- Kind ----

const kindIcons = { docker: Container, package: Package, script: FileCode }

// The three kinds as cards: the choice that shapes the rest of the form.
export function KindPicker({
  value,
  onChange,
  phone,
}: {
  value?: Recipe["kind"]
  onChange: (kind: Recipe["kind"]) => void
  phone: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="How it installs"
      className={cn("grid gap-2", !phone && "grid-cols-3")}
    >
      {(["docker", "package", "script"] as const).map((k) => {
        const Icon = kindIcons[k]
        return (
          <label
            key={k}
            className="relative flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 outline-none has-checked:border-brand has-checked:bg-brand-soft/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed"
          >
            <input
              type="radio"
              name="recipe-kind"
              value={k}
              checked={value === k}
              onChange={() => onChange(k)}
              className="peer sr-only"
            />
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground peer-checked:bg-brand peer-checked:text-primary-foreground [&_svg]:size-4.5">
              <Icon />
            </span>
            <span className="min-w-0">
              <span className="block text-body-sm font-medium">
                {kindLabels[k]}
              </span>
              <span className="block text-caption text-muted-foreground">
                {kindHints[k]}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

// ---- A list of short values (package names, options…) ----

// Chips plus a free-text input: Enter, comma, space or Tab adds one;
// Backspace in an empty input takes the last back; a pasted list splits.
export function ListInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  suggestions = [],
  mono,
  ...aria
}: {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  invalid?: boolean
  suggestions?: string[]
  mono?: boolean
  "aria-describedby"?: string
}) {
  const [text, setText] = useState("")
  const add = (raw: string) => {
    const items = raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s && !value.includes(s))
    if (items.length) onChange([...value, ...new Set(items)])
    setText("")
  }
  const open = suggestions.filter(
    (s) => !value.includes(s) && (!text || s.includes(text.toLowerCase())),
  )
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:min-h-9 md:py-1",
          invalid &&
            "border-destructive ring-3 ring-destructive/20 focus-within:border-destructive",
        )}
      >
        {value.map((v) => (
          <span
            key={v}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full bg-muted ps-2.5 pe-1 text-body-sm md:h-6",
              mono && "font-mono text-caption",
            )}
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="flex size-5 items-center justify-center rounded-full text-ash hover:bg-mist hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => {
            const v = e.target.value
            if (/[\s,]/.test(v)) add(v)
            else setText(v)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add(text)
            } else if (e.key === "Tab" && text) {
              add(text)
            } else if (e.key === "Backspace" && !text && value.length) {
              e.preventDefault()
              setText(value[value.length - 1])
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(text)}
          placeholder={value.length ? undefined : placeholder}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={invalid || undefined}
          aria-describedby={aria["aria-describedby"]}
          className={cn(
            "h-7 min-w-24 flex-1 bg-transparent px-1 text-body-sm outline-none placeholder:text-muted-foreground",
            mono && "font-mono",
          )}
        />
      </div>
      {open.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {open.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange([...value, s])}
              className="h-8 rounded-full border border-dashed border-mist px-2.5 text-caption text-muted-foreground hover:border-brand hover:text-foreground md:h-7"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Toggle chips (package managers…) ----

export function ChipToggles({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly { value: string; label: ReactNode }[]
  value: string[]
  onChange: (value: string[]) => void
  label: string
}) {
  return (
    <fieldset className="flex flex-wrap gap-1.5">
      <legend className="sr-only">{label}</legend>
      {items.map((it) => {
        const on = value.includes(it.value)
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(
                on ? value.filter((v) => v !== it.value) : [...value, it.value],
              )
            }
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border px-3.5 text-body-sm text-muted-foreground outline-none hover:border-mist hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong md:h-8"
          >
            {on && <Check className="size-3.5" />}
            {it.label}
          </button>
        )
      })}
    </fieldset>
  )
}

// ---- Row tools (move / remove) ----

export function RowTools({
  index,
  count,
  onMove,
  onRemove,
  noun,
}: {
  index: number
  count: number
  onMove: (to: number) => void
  onRemove: () => void
  noun: string
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${noun} up`}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        className="max-md:size-10"
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${noun} down`}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
        className="max-md:size-10"
      >
        <ArrowDown />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${noun}`}
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive max-md:size-10"
      >
        <Trash2 />
      </Button>
    </div>
  )
}

export const moved = <T,>(list: T[], from: number, to: number) => {
  const next = [...list]
  const [it] = next.splice(from, 1)
  next.splice(to, 0, it)
  return next
}

// ---- Logo / icon ----

// The tile shown in the catalog, and a picker for it: a brand logo Morcheh
// ships, or one of the icons.
export function LookPicker({
  kind,
  icon,
  logo,
  onChange,
  disabled,
}: {
  kind: Recipe["kind"]
  icon?: string
  logo?: string
  onChange: (look: { icon?: string; logo?: string }) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useOpen("recipe-look")
  const [tab, setTab] = useState<"logo" | "icon">(logo ? "logo" : "icon")
  const unknownLogo = logo && !appLogos.includes(logo) ? logo : undefined
  const unknownIcon = icon && !recipeIcons[icon] ? icon : undefined
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="group flex min-h-11 items-center gap-3 rounded-2xl border border-border p-3 pe-4 text-start outline-none hover:border-mist focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
      >
        <RecipeIcon recipe={{ kind, icon, logo }} size="lg" />
        <span className="min-w-0">
          <span className="block text-body-sm font-medium">
            {logo && !unknownLogo
              ? `Logo · ${logo}`
              : icon && !unknownIcon
                ? `Icon · ${icon}`
                : "Default icon"}
          </span>
          <span className="block text-caption text-muted-foreground group-hover:text-foreground">
            {disabled ? "Shown in the catalog" : "Change"}
          </span>
          {(unknownLogo || unknownIcon) && (
            <span className="block text-caption text-warning">
              Morcheh doesn't have “{unknownLogo ?? unknownIcon}”.
            </span>
          )}
        </span>
      </button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Logo or icon"
        description="Shown on the catalog tile and on every install."
        className="sm:max-w-lg"
      >
        <div className="flex flex-col gap-4">
          <Segmented
            label="Kind of picture"
            items={[
              { value: "logo", label: "Brand logo" },
              { value: "icon", label: "Icon" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="grid max-h-[50dvh] grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2 overflow-y-auto p-0.5">
            {tab === "logo"
              ? appLogos.map((l) => (
                  <Tile
                    key={l}
                    label={l}
                    on={logo === l}
                    onClick={() => {
                      onChange({ icon, logo: l })
                      setOpen(false)
                    }}
                  >
                    <Image
                      src={`/apps/${l}.svg`}
                      alt=""
                      width={24}
                      height={24}
                      className={cn("size-6", inkLogos.has(l) && "dark:invert")}
                    />
                  </Tile>
                ))
              : Object.entries(recipeIcons).map(([name, Icon]) => (
                  <Tile
                    key={name}
                    label={name}
                    on={!logo && icon === name}
                    onClick={() => {
                      onChange({ icon: name, logo: undefined })
                      setOpen(false)
                    }}
                  >
                    <Icon className="size-5" />
                  </Tile>
                ))}
          </div>
          {(logo || icon) && (
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => {
                onChange(
                  tab === "logo"
                    ? { icon, logo: undefined }
                    : { icon: undefined, logo },
                )
                setOpen(false)
              }}
            >
              {tab === "logo" ? "No logo (use the icon)" : "Default icon"}
            </Button>
          )}
        </div>
      </ResponsiveDialog>
    </>
  )
}

function Tile({
  label,
  on,
  onClick,
  children,
}: {
  label: string
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-pressed={on}
      onClick={onClick}
      className="flex min-h-18 flex-col items-center justify-center gap-1.5 rounded-xl border border-border p-2 text-caption text-muted-foreground outline-none hover:border-mist hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"
    >
      {children}
      <span className="w-full truncate text-center">{label}</span>
    </button>
  )
}
