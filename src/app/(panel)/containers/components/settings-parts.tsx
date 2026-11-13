"use client"

import {
  BellRing,
  Boxes,
  ChartLine,
  DatabaseBackup,
  FolderTree,
  History,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { SettingKey } from "./settings-model"

// The page's sections, in order; the desktop side list links to them.
export const sections = [
  {
    id: "projects",
    title: "Projects",
    icon: FolderTree,
    keys: ["projects_dir", "remove_orphans", "versions_keep"],
  },
  {
    id: "new-projects",
    title: "New projects",
    icon: Boxes,
    keys: [
      "default_restart",
      "default_memory_mb",
      "default_cpus",
      "default_log_max_mb",
      "default_log_files",
    ],
  },
  {
    id: "updates",
    title: "Image updates",
    icon: RefreshCw,
    keys: ["update_check", "update_check_hours"],
  },
  {
    id: "scans",
    title: "Vulnerability scans",
    icon: ShieldCheck,
    keys: ["scanner_image", "scan_ignore_unfixed"],
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: BellRing,
    keys: ["notify_updates", "notify_vulns", "notify_channels"],
  },
  {
    id: "cleanup",
    title: "Clean-up",
    icon: Trash2,
    keys: [
      "prune_auto",
      "prune_hours",
      "prune_images",
      "prune_containers",
      "prune_networks",
      "prune_build_cache",
      "prune_older_hours",
    ],
  },
  {
    id: "backups",
    title: "Volume backups",
    icon: DatabaseBackup,
    keys: ["backup_storage_id", "backup_folder", "backup_stop", "backup_keep"],
  },
  { id: "events", title: "Event log", icon: History, keys: ["events_hours"] },
  {
    id: "history",
    title: "Usage history",
    icon: ChartLine,
    keys: ["stats_days"],
  },
] as const satisfies readonly {
  id: string
  title: string
  icon: ComponentType<{ className?: string }>
  keys: readonly SettingKey[]
}[]

export type SectionId = (typeof sections)[number]["id"]

export const anchor = (id: string) => `docker-settings-${id}`

// A section's marks in the side list: unsaved changes, and (for an
// environment) settings of its own.
export type SectionMark = { changed: boolean; own: number }

// Desktop: the sections as a list beside the form, the one in view marked.
export function SideNav({ mark }: { mark: (id: SectionId) => SectionMark }) {
  const [current, setCurrent] = useState<SectionId>(sections[0].id)
  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(anchor(s.id)))
      .filter((el): el is HTMLElement => !!el)
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        const first = sections.find((s) => seen.get(anchor(s.id)))
        if (first) setCurrent(first.id)
      },
      { rootMargin: "-64px 0px -55% 0px" },
    )
    for (const el of els) io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <nav aria-label="Settings sections" className="max-lg:hidden">
      <ul className="sticky top-[calc(3rem+1px+1.25rem)] flex flex-col gap-0.5">
        {sections.map((s) => {
          const Icon = s.icon
          const on = current === s.id
          const m = mark(s.id)
          return (
            <li key={s.id}>
              <a
                href={`#${anchor(s.id)}`}
                aria-current={on ? "location" : undefined}
                onClick={() => setCurrent(s.id)}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-lg px-2.5 text-body-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  on && "bg-muted font-medium text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
                {m.own > 0 && (
                  <span
                    className="shrink-0 rounded-full bg-muted px-1.5 text-caption text-muted-foreground tabular-nums"
                    title={`${m.own} set for this environment`}
                  >
                    {m.own}
                  </span>
                )}
                {m.changed && (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-brand"
                    title="Unsaved changes"
                  />
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function Group({
  id,
  description,
  link,
  children,
}: {
  id: SectionId
  description: ReactNode
  link?: { href: string; label: string }
  children: ReactNode
}) {
  const meta = sections.find((s) => s.id === id)
  if (!meta) return null
  const Icon = meta.icon
  return (
    <section
      id={anchor(id)}
      aria-labelledby={`${anchor(id)}-title`}
      className="flex scroll-mt-20 flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2
            id={`${anchor(id)}-title`}
            className="text-body leading-tight font-medium"
          >
            {meta.title}
          </h2>
          <p className="text-caption text-muted-foreground">{description}</p>
        </div>
        {link && (
          <Link
            href={link.href}
            className="shrink-0 pt-0.5 text-caption text-brand hover:underline max-md:flex max-md:min-h-11 max-md:items-start"
          >
            Open {link.label}
          </Link>
        )}
      </div>
      <div className="divide-y divide-border rounded-2xl border border-border bg-card max-md:-mx-4 max-md:rounded-none max-md:border-x-0">
        {children}
      </div>
    </section>
  )
}

// A row's state: unsaved, set for this environment, and how to take the
// value back (the default, or the workspace's for an environment).
export type FieldState = {
  changed: boolean
  own?: string
  reset?: { label: string; run: () => void }
}

// One setting: what it is on the start, the control on the end (desktop);
// stacked on phones, with switches and choices kept beside their label.
// `stack` puts a wide control (a list) under its label everywhere.
export function Row({
  label,
  hint,
  error,
  phone,
  inline = false,
  stack = false,
  muted = false,
  state,
  children,
}: {
  label: string
  hint?: ReactNode
  error?: string
  phone: boolean
  inline?: boolean
  stack?: boolean
  muted?: boolean
  state: FieldState
  children: (props: {
    id: string
    "aria-invalid"?: true
    "aria-describedby"?: string
  }) => ReactNode
}) {
  const id = useId()
  const noteId = `${id}-note`
  const control = children({
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": noteId,
  })
  const side = !stack && (!phone || inline)
  return (
    <div
      className={cn(
        "flex gap-3 p-4 md:gap-8 md:px-5",
        side ? "items-start justify-between" : "flex-col md:gap-3",
        muted && "opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <label htmlFor={id} className="text-body-sm font-medium">
            {label}
          </label>
          {state.own && (
            <span className="rounded-full border border-border px-1.5 py-px text-caption text-muted-foreground">
              {state.own}
            </span>
          )}
          {state.changed && (
            <span className="rounded-full bg-brand-soft px-1.5 py-px text-caption text-brand-strong">
              Changed
            </span>
          )}
        </div>
        {hint && (
          <p id={noteId} className="text-caption text-muted-foreground">
            {hint}
          </p>
        )}
        {state.reset && (
          <button
            type="button"
            onClick={state.reset.run}
            className="flex w-fit items-center gap-1 text-caption text-brand hover:underline max-md:min-h-11"
          >
            <RotateCcw className="size-3" />
            {state.reset.label}
          </button>
        )}
      </div>
      <div
        className={cn(
          "flex shrink-0 flex-col gap-1.5",
          side && !inline && "w-80",
          !side && "w-full",
        )}
      >
        {control}
        {error && (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

// A number typed as text, so "0." and a blank field survive typing; blank
// is 0. A value changed from outside (a reset) replaces the text.
export function NumberField({
  value,
  onChange,
  unit,
  step,
  placeholder,
  ...p
}: {
  value: number
  onChange: (n: number) => void
  unit: string
  step?: string
  placeholder?: string
  id: string
  "aria-invalid"?: true
  "aria-describedby"?: string
}) {
  const show = (n: number) => (n ? String(n) : "")
  const [text, setText] = useState(show(value))
  const [seen, setSeen] = useState(value)
  if (value !== seen && !(Number.isNaN(value) && Number.isNaN(seen))) {
    setSeen(value)
    const typed = text.trim() === "" ? 0 : Number(text)
    if (typed !== value) setText(show(value))
  }
  return (
    <div className="relative">
      <Input
        {...p}
        value={text}
        placeholder={placeholder}
        inputMode={step ? "decimal" : "numeric"}
        autoComplete="off"
        className="pe-14 tabular-nums"
        onChange={(e) => {
          const t = e.target.value
          setText(t)
          const n = t.trim() === "" ? 0 : Number(t)
          setSeen(n)
          onChange(n)
        }}
      />
      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-body-sm text-ash">
        {unit}
      </span>
    </div>
  )
}
