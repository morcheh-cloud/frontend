"use client"

import { Checkbox } from "@/components/ui/checkbox"
import type { EventType } from "@/lib/services"
import { cn } from "@/lib/utils"
import { type CatalogUse, groupsOf, severityTone } from "./catalog"

// Every event type, grouped, with a tick per type and per group.
export function EventPicker({
  catalog,
  value,
  onChange,
  invalid,
  use = "webhooks",
}: {
  catalog: EventType[]
  value: string[]
  onChange: (events: string[]) => void
  invalid?: boolean
  use?: CatalogUse
}) {
  const groups = groupsOf(catalog, use)
  const on = new Set(value)
  const toggle = (names: string[], add: boolean) => {
    const next = new Set(on)
    for (const n of names) {
      if (add) next.add(n)
      else next.delete(n)
    }
    onChange(catalog.map((t) => t.name).filter((n) => next.has(n)))
  }
  return (
    <div className="@container">
      <div
        className={cn(
          "grid gap-3 @2xl:grid-cols-2",
          invalid && "rounded-xl ring-2 ring-destructive/30",
        )}
      >
        {groups.map((g) => {
          const names = g.types.map((t) => t.name)
          const picked = names.filter((n) => on.has(n)).length
          const all = picked === names.length
          return (
            <fieldset
              key={g.name}
              className="min-w-0 rounded-xl border border-border max-md:-mx-1"
            >
              <legend className="sr-only">{g.name}</legend>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox is a Base UI button inside */}
              <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border bg-subtle px-3 py-2 md:rounded-t-xl">
                <Checkbox
                  checked={all}
                  indeterminate={picked > 0 && !all}
                  onCheckedChange={(c) => toggle(names, !!c)}
                />
                <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                  {g.name}
                </span>
                <span className="text-caption text-ash tabular-nums">
                  {picked}/{names.length}
                </span>
              </label>
              <ul className="divide-y divide-border">
                {g.types.map((t) => (
                  <li key={t.name}>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox is a Base UI button inside */}
                    <label className="flex min-h-12 cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-subtle">
                      <Checkbox
                        className="mt-0.5"
                        checked={on.has(t.name)}
                        onCheckedChange={(c) => toggle([t.name], !!c)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-body-sm font-medium">
                            {t.label}
                          </span>
                          <code className="font-mono text-caption text-ash">
                            {t.name}
                          </code>
                          {t.severity && t.severity !== "info" && (
                            <span
                              className={cn(
                                "inline-flex h-5 items-center rounded-full px-2 text-caption",
                                severityTone[t.severity] ?? severityTone.info,
                              )}
                            >
                              {t.severity}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-caption text-muted-foreground">
                          {t.description}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )
        })}
      </div>
    </div>
  )
}
