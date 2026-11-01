import { Lightbulb, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { Fragment, type ReactNode } from "react"

import { guideFor, guideHref } from "@/components/help/guides"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"
import { CopyButton } from "./copy-button"

// The building blocks guides are written with, so every guide reads the same.

export type GuideSection = { id: string; title: string; body: ReactNode }

export function P({ children }: { children: ReactNode }) {
  return <p className="text-body text-foreground">{children}</p>
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 text-body font-medium">{children}</h3>
}

// A button, field or menu item as the UI labels it.
export function UI({ children }: { children: ReactNode }) {
  return <span className="font-medium">{children}</span>
}

export function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-muted px-1 py-0.5 font-mono text-[0.875em]">
      {children}
    </code>
  )
}

// A key combination: <Keys>Ctrl+Shift+F</Keys>.
export function Keys({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {children.split("+").map((key, i) => (
        <Fragment key={key}>
          {i > 0 && <span className="text-caption text-ash">+</span>}
          <Kbd>{key}</Kbd>
        </Fragment>
      ))}
    </span>
  )
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-2 ps-5 text-body marker:text-ash">
      {children}
    </ul>
  )
}

// Numbered steps to follow in order.
export function Steps({ children }: { children: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {children.map((step, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
        <li key={i} className="flex gap-3 text-body">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-caption font-medium text-brand-strong tabular-nums">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">{step}</div>
        </li>
      ))}
    </ol>
  )
}

export function Tip({ children }: { children: ReactNode }) {
  return (
    <aside className="flex gap-3 rounded-2xl border border-border bg-subtle px-5 py-4 text-body-sm">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">{children}</div>
    </aside>
  )
}

export function Warn({ children }: { children: ReactNode }) {
  return (
    <aside className="flex gap-3 rounded-2xl border border-warning/25 bg-warning/5 px-5 py-4 text-body-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">{children}</div>
    </aside>
  )
}

// A worked, real-world example.
export function Example({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5 md:p-6">
      <div>
        <p className="font-label text-caption tracking-label text-ash uppercase">
          Example
        </p>
        <h3 className="text-body font-medium">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export function Code({ children }: { children: string }) {
  const text = children.trim()
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-2xl border border-border bg-subtle py-3 ps-4 pe-12 font-mono text-body-sm">
        <code>{text}</code>
      </pre>
      <CopyButton text={text} />
    </div>
  )
}

// Recommended values: what to set, to what, and why.
export function Recommended({
  rows,
}: {
  rows: { setting: ReactNode; value: ReactNode; why: ReactNode }[]
}) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border text-body-sm">
      <div className="hidden grid-cols-[12rem_11rem_minmax(0,1fr)] gap-4 px-5 py-2.5 font-label text-caption tracking-label text-ash uppercase md:grid">
        <span>Setting</span>
        <span>Recommended</span>
        <span>Why</span>
      </div>
      {rows.map((row, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
          key={i}
          className="grid gap-1 px-5 py-3 md:grid-cols-[12rem_11rem_minmax(0,1fr)] md:gap-4"
        >
          <span className="font-medium">{row.setting}</span>
          <span>{row.value}</span>
          <span className="text-muted-foreground">{row.why}</span>
        </div>
      ))}
    </div>
  )
}

// Two-column reference, e.g. shortcuts or statuses.
export function Table({
  head,
  rows,
}: {
  head: [string, string]
  rows: [ReactNode, ReactNode][]
}) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border text-body-sm">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-5 py-2.5 font-label text-caption tracking-label text-ash uppercase">
        <span>{head[0]}</span>
        <span>{head[1]}</span>
      </div>
      {rows.map(([a, b], i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
          key={i}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-5 py-3"
        >
          <span>{a}</span>
          <span className="text-muted-foreground">{b}</span>
        </div>
      ))}
    </div>
  )
}

const linkClass = "font-medium text-brand underline-offset-4 hover:underline"

// A link to a panel page.
export function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  )
}

// A link to another guide, optionally to one of its sections.
export function See({
  guide,
  section,
  children,
  className,
}: {
  guide: string
  section?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <Link href={guideHref(guide, section)} className={cn(linkClass, className)}>
      {children ?? guideFor(guide)?.title}
    </Link>
  )
}
