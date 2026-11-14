"use client"

import { Check, ChevronRight, Star } from "lucide-react"
import { useState } from "react"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import type { DockerTemplate } from "@/lib/services"
import { cn } from "@/lib/utils"
import { SearchBox } from "../../servers/[id]/components/parts"
import { Tag } from "./kit"
import {
  byPopular,
  categoryIcon,
  searchTemplates,
  TemplateIcon,
} from "./template-meta"

const PAGE = 60

// New project's "From a template": hundreds of apps, so a search with
// category chips instead of a menu. Popular ones come first.
export function TemplatePicker({
  open,
  onOpenChange,
  templates,
  current,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: DockerTemplate[]
  current?: string
  onPick: (t: DockerTemplate) => void
}) {
  const [q, setQ] = useState("")
  const [cat, setCat] = useState("")
  const [limit, setLimit] = useState(PAGE)

  const counts = new Map<string, number>()
  for (const t of templates) {
    const c = t.category || "Other"
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  const categories = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )
  const yours = templates.filter((t) => !t.builtin).length
  const popular = templates.filter((t) => t.featured).length
  const pool = templates.filter((t) =>
    cat === "popular"
      ? t.featured
      : cat === "yours"
        ? !t.builtin
        : !cat || (t.category || "Other") === cat,
  )
  // Yours first when nothing is typed: they're what the team made for itself.
  const shown = q.trim()
    ? searchTemplates(pool, q)
    : [...pool].sort(
        (a, b) =>
          Number(a.builtin ?? false) - Number(b.builtin ?? false) ||
          byPopular(a, b),
      )

  const choose = (next: string) => {
    setCat(next === cat ? "" : next)
    setLimit(PAGE)
  }
  const chip = (key: string, label: string, n: number, Icon?: typeof Star) => {
    const on = cat === key
    return (
      <button
        key={key || "all"}
        type="button"
        aria-pressed={on}
        onClick={() => choose(key)}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-9",
          on
            ? "border-brand bg-brand-soft text-brand-strong"
            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {Icon && <Icon className="size-3.5" />}
        {label}
        <span className={cn("text-caption", on ? "opacity-80" : "text-ash")}>
          {n}
        </span>
      </button>
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Start from a template"
      description={`${templates.length} apps. Passwords and keys are made fresh for this project.`}
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col gap-3">
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v)
            setLimit(PAGE)
          }}
          placeholder="Search apps, images, tags"
          label="Search templates"
          className="md:w-full"
          onKeyDown={(e) => {
            if (e.key === "Enter" && shown[0]) {
              e.preventDefault()
              onPick(shown[0])
            }
          }}
        />
        <div className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1">
          {chip("", "All", templates.length)}
          {yours > 0 && chip("yours", "Yours", yours)}
          {popular > 0 && chip("popular", "Popular", popular, Star)}
          {categories.map(([c, n]) => chip(c, c, n, categoryIcon(c)))}
        </div>
        {shown.length === 0 ? (
          <p className="py-10 text-center text-body-sm text-muted-foreground">
            No template matches. Try another word or category.
          </p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {shown.slice(0, limit).map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onPick(t)}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-lg p-2 text-start outline-none hover:bg-muted focus-visible:bg-muted active:bg-muted",
                    t.id === current && "bg-brand-soft",
                  )}
                >
                  <TemplateIcon t={t} className="size-9 rounded-lg" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5 truncate text-body-sm font-medium">
                      {t.name}
                      {t.featured && (
                        <Star
                          className="size-3 shrink-0 fill-current text-ash"
                          aria-label="Popular"
                        />
                      )}
                      {!t.builtin && <Tag>Yours</Tag>}
                    </span>
                    <span className="truncate text-caption text-muted-foreground">
                      {t.category ? `${t.category} · ` : ""}
                      {t.description || "No description."}
                    </span>
                  </span>
                  {t.id === current ? (
                    <Check className="size-4 shrink-0 text-brand" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-ash" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {shown.length > limit && (
          <Button variant="outline" onClick={() => setLimit(limit + PAGE)}>
            Show more ({shown.length - limit} left)
          </Button>
        )}
      </div>
    </ResponsiveDialog>
  )
}
