"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

// A copyable code sample (curl line, signature check…). Long lines scroll
// inside the block, never the page: `[contain:inline-size]` keeps the
// block's own width out of its parents' min-content.
export function CodeBlock({
  code,
  label = "code",
  className,
}: {
  code: string
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative min-w-0 rounded-xl border border-border bg-subtle [contain:inline-size]",
        className,
      )}
    >
      <pre className="max-h-96 overflow-auto py-3 ps-4 pe-12 font-mono text-caption leading-relaxed whitespace-pre max-md:pe-14">
        <code>{code}</code>
      </pre>
      <CopyCode
        text={code}
        label={label}
        className="absolute end-1.5 top-1.5"
      />
    </div>
  )
}

// Several versions of one sample (Node.js / Python / Go), one shown at a time.
export function CodeTabs({
  samples,
  label,
}: {
  samples: readonly { key: string; label: string; code: string }[]
  label: string
}) {
  const [current, setCurrent] = useState(samples[0]?.key)
  const shown = samples.find((s) => s.key === current) ?? samples[0]
  if (!shown) return null
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        role="tablist"
        aria-label={label}
        className="no-scrollbar flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5"
      >
        {samples.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={s.key === shown.key}
            onClick={() => setCurrent(s.key)}
            className="h-10 shrink-0 rounded-md px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:bg-card aria-selected:font-medium aria-selected:text-foreground aria-selected:shadow-sm md:h-8"
          >
            {s.label}
          </button>
        ))}
      </div>
      <CodeBlock code={shown.code} label={`${shown.label} ${label}`} />
    </div>
  )
}

export function CopyCode({
  text,
  label,
  className,
}: {
  text: string
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      title="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error("Couldn't access the clipboard: select the text instead")
        }
      }}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-ash outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-md:size-11 [&_svg]:size-4",
        className,
      )}
    >
      {copied ? <Check className="text-success" /> : <Copy />}
    </button>
  )
}
