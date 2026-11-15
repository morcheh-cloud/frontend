"use client"

import { Boxes, Check, PlugZap } from "lucide-react"

import { Section } from "@/app/(panel)/cronjobs/components/editor-parts"
import { cn } from "@/lib/utils"
import type { AddSource } from "./meta"

const choices: {
  value: AddSource
  icon: typeof Boxes
  title: string
  text: string
}[] = [
  {
    value: "connect",
    icon: PlugZap,
    title: "Connect to one that runs",
    text: "On a server, in a container, or at a managed provider. Morche only watches it.",
  },
  {
    value: "container",
    icon: Boxes,
    title: "Start a new one in a container",
    text: "Morche writes a compose project on one of your servers, starts it and watches it.",
  },
]

// The first section of /databases/new: which of the two flows the page runs.
export function SourcePicker({
  value,
  onChange,
  phone,
}: {
  value: AddSource
  onChange: (source: AddSource) => void
  phone: boolean
}) {
  return (
    <Section
      title="Start from"
      hint="A database you already have, or a fresh one Morche sets up."
      phone={phone}
    >
      <div
        role="radiogroup"
        aria-label="Start from"
        className="grid gap-3 sm:grid-cols-2"
      >
        {choices.map((c) => {
          const on = c.value === value
          return (
            // biome-ignore lint/a11y/useSemanticElements: option cards; radio inputs can't be styled as cards
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(c.value)}
              className={cn(
                "relative flex min-w-0 items-start gap-3 rounded-2xl border p-4 text-start transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                on
                  ? "border-brand/40 bg-brand-soft/60"
                  : "border-border hover:bg-subtle",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl [&>svg]:size-5",
                  on
                    ? "bg-brand text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <c.icon />
              </span>
              <span className="min-w-0 flex-1 pe-6">
                <span className="block text-body-sm font-medium">
                  {c.title}
                </span>
                <span className="mt-0.5 block text-caption text-muted-foreground">
                  {c.text}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute end-3 top-3 flex size-5 items-center justify-center rounded-full border",
                  on
                    ? "border-brand bg-brand text-primary-foreground"
                    : "border-mist bg-card",
                )}
              >
                {on && <Check className="size-3" strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}
